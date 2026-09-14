// Ghost on the Menu in the browser. One canvas, requestAnimationFrame, three
// keys. Sprites by class until hit; one reveal look on hit. No HUD: no score,
// no remaining, no combo, no timer digits (G7, G8). When the round is over
// the field freezes and the tape's name, server and policy are drawn as
// furniture (G10); caught lies sit at the parking line as trophies, escaped
// lies sit as whatever class they wore. Click restarts the same tape.
//
// Sound: the AudioContext is built on the first gesture (browsers require
// it). Each frame the state is snapshotted and diffed; the cues module says
// which effect fires. The soundtrack ticks on the round clock so it follows
// hitstop and stops at the end. Mute, three intensity presets and a shake-off
// toggle are the player's controls (W4 and the accessibility line).
//
// The seats (v0.4.0, moved behind the cabinet's tool contract here): with
// the checkbox on, a model sits in the boss through the cabinet server's
// own tools, in-process. The fire seat asks one verb per beat through
// `fire`, prefetched during the previous beat and revoked if the view
// changed; a late answer is the script (G13). The say seat is asked on the
// node side (`/cabinet/say`, tiered: a Claude agent by key, a Cloud tag,
// local) and its line lands through the cabinet's `say` gate (G14). The
// seat's view is words only; nothing on the field names the model (G17).

import {
  askFire,
  createCabinet,
  createSeat,
  createVoicer,
  DEFAULT_PERSONAS,
  hostForRound,
  seatView,
  speakLine,
  tapeCards,
  voiceHealth,
  warmUp,
  type Live,
  type Seat,
  type SeatView,
} from '@mcp-arcade-cabinets/cabinet-server/src/browser';
import {
  attach,
  attachedPatterns,
  bossKindFor,
  createRoundState,
  cues,
  DEFAULT_SECONDS,
  defaultPilotModel,
  FIELD,
  isCloudModel,
  kindOfAtom,
  listPilotModels,
  prepassRound,
  renderRound,
  snapshot,
  SPRITE_KEYS,
  stepRound,
  TRACK_KEYS,
  waveKindAt,
  type AudioOut,
  type CueSnapshot,
  type DrawContext,
  type Intensity,
  type Round,
  type RoundInput,
  type RoundState,
} from '@mcp-arcade-cabinets/ghost-on-the-menu';
import type { Tape } from '@mcp-arcade-cabinets/tape-core';

import { TAPES } from './tapes';

const INTENSITIES: Intensity[] = ['calm', 'medium', 'loud'];

/** The tier the round plays at: as the tape's header derives it, or forced. */
export type Difficulty = 'recorded' | 'seat' | 'live' | 'hardcore';
export const DIFFICULTIES: {
  value: Difficulty;
  label: string;
  tier: 0 | 1 | 2 | 3 | undefined;
}[] = [
  { value: 'recorded', label: 'difficulty: as recorded', tier: undefined },
  { value: 'seat', label: 'difficulty: seat', tier: 1 },
  { value: 'live', label: 'difficulty: live', tier: 2 },
  { value: 'hardcore', label: 'difficulty: hardcore', tier: 3 },
];

/** What a shift (slice 7) sets on a mount; a tape played alone sets none of it. */
export interface MountExtra {
  /** The shift's climb for this call, 0..1; the parallelism levers read it. */
  climb?: number;
  /** The difficulty the shift was drawn at. */
  difficulty?: Difficulty;
  /** True in a shift: the code names the difficulty, so the select is fixed. */
  lockDifficulty?: boolean;
  /** Extra end-scene furniture lines: the shift code, the call's place. Words only. */
  furniture?: string[];
  nextLabel?: string;
  hint?: string;
  /** True on a shift call that is not the last: the music carries through the card. */
  holdMusic?: boolean;
}

/** Sibling of `ghost.shifts`. Words only: no score, no count, no digit. */
const PREFS_KEY = 'ghost.prefs';

export type Prefs = {
  difficulty?: Difficulty;
  ollama?: 'on' | 'off';
  voice?: 'on' | 'off';
  shiftCode?: string;
  feel?: Intensity;
  shake?: 'on' | 'off';
};

const DIFF_VALUES = new Set<string>(DIFFICULTIES.map((d) => d.value));
const FEEL_VALUES = new Set<string>(INTENSITIES);

export function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const o = parsed as Record<string, unknown>;
    const out: Prefs = {};
    if (typeof o.difficulty === 'string' && DIFF_VALUES.has(o.difficulty)) {
      out.difficulty = o.difficulty as Difficulty;
    }
    if (o.ollama === 'on' || o.ollama === 'off') out.ollama = o.ollama;
    if (o.voice === 'on' || o.voice === 'off') out.voice = o.voice;
    if (typeof o.shiftCode === 'string' && o.shiftCode.trim() !== '' && !/\d/.test(o.shiftCode)) {
      out.shiftCode = o.shiftCode;
    }
    if (typeof o.feel === 'string' && FEEL_VALUES.has(o.feel)) out.feel = o.feel as Intensity;
    if (o.shake === 'on' || o.shake === 'off') out.shake = o.shake;
    return out;
  } catch {
    return {};
  }
}

export function writePrefs(patch: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...readPrefs(), ...patch }));
  } catch {
    /* a private window or blocked storage: play still plays */
  }
}

function liveStatus(el: HTMLElement, name: string): void {
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('role', 'status');
  el.setAttribute('aria-label', name);
}

function reduceMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function chromeTarget(t: EventTarget | null): boolean {
  return t instanceof Element && Boolean(t.closest('input, select, button, label, textarea'));
}

function stripFieldNoise(s: string): string {
  return s
    .replace(/[0-9]/g, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\/\S*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function errorKind(
  err: unknown,
): 'retired' | 'timeout' | 'down' | 'missing' | 'bad payload' | 'script' {
  const msg = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : '';
  if (/retired/i.test(msg)) return 'retired';
  if (name === 'TimeoutError' || name === 'AbortError' || /timeout/i.test(msg)) return 'timeout';
  if (/bad payload/i.test(msg)) return 'bad payload';
  if (/not found|missing/i.test(msg)) return 'missing';
  const code = /\b(\d{3})\b/.exec(msg)?.[1];
  if (code === '404' || code === '410') return 'missing';
  if (code === '408' || code === '504') return 'timeout';
  if (code === '400' || code === '413' || code === '415' || code === '422') return 'bad payload';
  if (code === '500' || code === '502' || code === '503') return 'down';
  if (/down|ECONNREFUSED|ENOTFOUND/i.test(msg) || err instanceof TypeError) return 'down';
  return 'script';
}

function seatFailLine(err: unknown): string {
  const k = errorKind(err);
  if (k === 'retired') return 'seat: model retired';
  if (k === 'script') return 'seat: no answer, script';
  return `seat: no answer, ${k}`;
}

function sayFailLine(err: unknown): string {
  const name = err instanceof Error ? err.name : '';
  if (name === 'TimeoutError' || name === 'AbortError') return 'say seat: no answer, timeout';
  const cleaned = stripFieldNoise(err instanceof Error ? err.message : String(err));
  if (/slow down/i.test(cleaned)) return 'say seat: slow down';
  if (/no cabinet server built/i.test(cleaned)) return 'say seat: no cabinet server built';
  const k = errorKind(err);
  if (k === 'timeout') return 'say seat: no answer, timeout';
  if (k === 'down') return 'say seat: no answer, down';
  if (k === 'missing') return 'say seat: no answer, missing';
  if (k === 'bad payload') return 'say seat: no answer, bad payload';
  if (cleaned && cleaned !== 'say') return `say seat: ${cleaned}`;
  return 'say seat: no answer';
}

// The music lives as long as the page (the Director's word, 2026-09-11): a
// shift hears a run of beds through its cards rather than four openings,
// and a bed never restarts from zero. Beds load once; the context is built
// on the first gesture, as browsers require.
const BEDS = new Map<string, HTMLAudioElement>();
const bedMissing = new Set<string>();
let bedsRequested = false;
let bedsSettled = false;
const onBedsSettled: Array<() => void> = [];
const loadBeds = () => {
  if (bedsRequested) return;
  bedsRequested = true;
  const pending = new Set<string>(TRACK_KEYS);
  const one = (key: string, ok: boolean) => {
    if (!pending.delete(key)) return;
    if (!ok) bedMissing.add(key);
    if (pending.size === 0) {
      bedsSettled = true;
      for (const fn of onBedsSettled.splice(0)) fn();
    }
  };
  window.setTimeout(() => {
    for (const key of [...pending]) one(key, false);
  }, 4000);
  for (const key of TRACK_KEYS) {
    const el = new Audio();
    el.preload = 'auto';
    el.loop = true;
    el.addEventListener(
      'canplaythrough',
      () => {
        BEDS.set(key, el);
        one(key, true);
      },
      { once: true },
    );
    el.addEventListener('error', () => one(key, false), { once: true });
    el.src = `${import.meta.env.BASE_URL}tracks/${key}.mp3`;
  }
};
const music: { audio: AudioOut | null; muted: boolean } = { audio: null, muted: false };

export function mountGhost(
  root: HTMLElement,
  name: string,
  tape: Tape,
  onExit: () => void,
  onNext?: () => void,
  /** True when the mount follows a click (Next tape), so the sound can start at once. */
  startAudio = false,
  extra: MountExtra = {},
) {
  root.replaceChildren();
  const prefs = readPrefs();
  const wrap = document.createElement('section');
  wrap.className = 'column';
  const canvas = document.createElement('canvas');
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;
  canvas.className = 'field';
  canvas.tabIndex = 0;

  const controls = document.createElement('div');
  controls.className = 'row';
  const mute = document.createElement('button');
  mute.textContent = 'Sound on';
  const intensity = document.createElement('select');
  intensity.setAttribute('aria-label', 'feel');
  for (const i of INTENSITIES) {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = `feel: ${i}`;
    intensity.append(o);
  }
  intensity.value =
    prefs.feel === 'medium' || prefs.feel === 'loud' || prefs.feel === 'calm' ? prefs.feel : 'calm';
  const shakeLabel = document.createElement('label');
  const shake = document.createElement('input');
  shake.type = 'checkbox';
  shake.checked = prefs.shake !== undefined ? prefs.shake === 'on' : !reduceMotion();
  shakeLabel.append(shake, document.createTextNode(' shake'));
  const ollamaLabel = document.createElement('label');
  const ollama = document.createElement('input');
  ollama.type = 'checkbox';
  ollama.checked = false;
  ollama.disabled = true;
  ollamaLabel.append(ollama, document.createTextNode(' Ollama bosses'));
  ollamaLabel.title =
    'Local daemon or Ollama Cloud. The boss calls its own shots through the cabinet tools and writes its own lines behind a gate; it never sees which sprites are lies. Needs the local game, not Pages.';
  // What the seats are doing, outside the field: the tool each called, in
  // words; never a fact, never a digit.
  const seat = document.createElement('span');
  seat.className = 'muted seat';
  liveStatus(seat, 'seat');
  seat.textContent = 'seat: looking for a daemon';
  const sayStat = document.createElement('span');
  sayStat.className = 'muted seat';
  liveStatus(sayStat, 'say seat');
  sayStat.textContent = '';
  // The voice (G15): the boss speaks its gated lines through the host-side
  // worker; every take is receipted before it plays. Off, and disabled,
  // until the worker answers; Pages never has one.
  const voiceLabel = document.createElement('label');
  const voice = document.createElement('input');
  voice.type = 'checkbox';
  voice.checked = false;
  voice.disabled = true;
  voiceLabel.append(voice, document.createTextNode(' Voice'));
  voiceLabel.title =
    'The boss speaks its lines in its own voice through the local voice worker (pnpm voice). Every take is heard back and receipted before it plays; a failed receipt is never played.';
  const voiceStat = document.createElement('span');
  voiceStat.className = 'muted seat';
  liveStatus(voiceStat, 'voice');
  voiceStat.textContent = '';
  const chrome = document.createElement('span');
  chrome.className = 'muted seat';
  liveStatus(chrome, 'cabinet');
  chrome.textContent = '';
  // Probe for the worker until it answers, so starting `pnpm voice` after
  // the page opened still enables the box, and say plainly when it is missing.
  let voiceProbe = 0;
  let tagsProbe = 0;
  let workerUp = false;
  let voiceSawDown = false;
  let left = false;
  const tagsCtl = new AbortController();
  const takeEl = new Audio();
  takeEl.volume = 0.9;
  const stopTake = () => {
    takeEl.pause();
    takeEl.src = '';
  };
  const markVoiceDown = () => {
    const wasOn = voice.checked;
    if (workerUp) voiceSawDown = true;
    workerUp = false;
    voice.disabled = true;
    voice.checked = false;
    if (wasOn) stopTake();
    voiceStat.textContent = 'voice: no worker (pnpm voice)';
  };
  const probeVoice = () => {
    void voiceHealth({ url: '/voice', timeoutMs: 2000 })
      .then((h) => {
        if (left) return;
        if (h) {
          const firstUp = !workerUp && !voiceSawDown;
          workerUp = true;
          voice.disabled = false;
          if (firstUp && prefs.voice === 'on') {
            voice.checked = true;
            voiceStat.textContent = 'voice on';
          } else if (!voice.checked) {
            voiceStat.textContent = 'voice ready';
          }
          return;
        }
        markVoiceDown();
      })
      .catch(() => {
        if (left) return;
        markVoiceDown();
      })
      .finally(() => {
        if (left) return;
        voiceProbe = window.setTimeout(probeVoice, 5000);
      });
  };
  probeVoice();
  let daemon: 'unknown' | 'up' | 'down' = 'unknown';
  let daemonWasUp = false;
  let listedModels: string[] = [];
  const pilotModel = document.createElement('select');
  const localDefault = 'qwen2.5:7b-instruct';
  const seedOpt = document.createElement('option');
  seedOpt.value = localDefault;
  seedOpt.textContent = localDefault;
  pilotModel.append(seedOpt);
  pilotModel.value = localDefault;
  pilotModel.title = 'Cloud tags first when the local daemon has signed in.';
  pilotModel.setAttribute('aria-label', 'model');
  const full = document.createElement('button');
  full.textContent = 'Full screen';
  const difficulty = document.createElement('select');
  difficulty.setAttribute('aria-label', 'difficulty');
  for (const d of DIFFICULTIES) {
    const o = document.createElement('option');
    o.value = d.value;
    o.textContent = d.label;
    difficulty.append(o);
  }
  // Fixture tapes derive to tier 0, where formations neither fire nor dive; seat is the fun default.
  difficulty.value = extra.difficulty ?? prefs.difficulty ?? 'seat';
  if (extra.lockDifficulty) {
    difficulty.disabled = true;
    difficulty.title = 'A shift plays at the difficulty its code names.';
  }
  const nextBtn = document.createElement('button');
  nextBtn.textContent = extra.nextLabel ?? 'Next tape';
  nextBtn.disabled = true;
  nextBtn.hidden = !onNext;
  controls.append(
    full,
    difficulty,
    mute,
    intensity,
    shakeLabel,
    ollamaLabel,
    pilotModel,
    seat,
    sayStat,
    voiceLabel,
    voiceStat,
    chrome,
    nextBtn,
  );

  const hint = document.createElement('p');
  hint.className = 'muted';
  hint.textContent =
    extra.hint ??
    'Left, right, space. F or the button for full screen. Click the field to restart the same tape.';
  canvas.setAttribute('aria-label', hint.textContent);
  const back = document.createElement('button');
  back.textContent = 'Back to the cabinets';
  wrap.append(canvas, controls, hint, back);
  root.append(wrap);
  root.classList.add('playing');

  let artMissing = false;
  let musicMissing = false;
  let fullWord = '';
  const writeChrome = () => {
    if (left) return;
    const parts: string[] = [];
    if (artMissing) parts.push('art: using blocks');
    if (musicMissing) parts.push('music: chiptune');
    if (fullWord) parts.push(fullWord);
    chrome.textContent = parts.join(' · ');
  };

  type FullEl = HTMLCanvasElement & { webkitRequestFullscreen?: () => Promise<void> };
  type FullDoc = Document & {
    webkitFullscreenElement?: Element;
    webkitExitFullscreen?: () => Promise<void>;
  };
  const fullNode = canvas as FullEl;
  const fullDoc = document as FullDoc;
  const requestFull =
    canvas.requestFullscreen?.bind(canvas) ?? fullNode.webkitRequestFullscreen?.bind(canvas);
  if (!requestFull) {
    full.hidden = true;
    full.disabled = true;
  }
  // Full screen is the canvas alone, letterboxed by the browser; keys keep working.
  const goFull = () => {
    const current = document.fullscreenElement ?? fullDoc.webkitFullscreenElement;
    if (current) {
      const exit =
        document.exitFullscreen?.bind(document) ?? fullDoc.webkitExitFullscreen?.bind(document);
      if (exit) void Promise.resolve(exit()).catch(() => {});
      return;
    }
    if (!requestFull) {
      fullWord = 'full screen: not on this browser';
      writeChrome();
      return;
    }
    try {
      void Promise.resolve(requestFull()).catch(() => {
        fullWord = 'full screen: not on this browser';
        writeChrome();
      });
    } catch {
      fullWord = 'full screen: not on this browser';
      writeChrome();
    }
  };
  full.addEventListener('click', goFull);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Sprites are files under /sprites/<key>.png, one per SPRITE_KEY. A key
  // whose file is missing or not yet loaded draws as its rectangle, so the
  // game is playable before, without, or during the art.
  const atlas = new Map<string, HTMLImageElement>();
  const pendingArt = new Set<string>(SPRITE_KEYS);
  const artOne = (key: string, ok: boolean) => {
    if (!pendingArt.delete(key)) return;
    if (!ok) artMissing = true;
    if (pendingArt.size === 0 && artMissing) writeChrome();
  };
  window.setTimeout(() => {
    if (left) return;
    if (pendingArt.size > 0) {
      artMissing = true;
      pendingArt.clear();
      writeChrome();
    }
  }, 4000);
  for (const key of SPRITE_KEYS) {
    const img = new Image();
    img.decoding = 'async';
    img.addEventListener('load', () => {
      atlas.set(key, img);
      artOne(key, true);
    });
    img.addEventListener('error', () => artOne(key, false));
    img.src = `${import.meta.env.BASE_URL}sprites/${key}.png`;
  }
  // The renderer draws through a narrow DrawContext; the canvas fill type is
  // wider (gradients, patterns), so adapt rather than widen the contract.
  const draw: DrawContext = {
    drawSprite(key, x, y, w, h) {
      const img = atlas.get(key);
      if (!img) return false;
      ctx.drawImage(img, x, y, w, h);
      return true;
    },
    get fillStyle() {
      return String(ctx.fillStyle);
    },
    set fillStyle(v: string) {
      ctx.fillStyle = v;
    },
    get font() {
      return ctx.font;
    },
    set font(v: string) {
      ctx.font = v;
    },
    fillRect: (x, y, w, h) => ctx.fillRect(x, y, w, h),
    fillText: (t, x, y) => ctx.fillText(t, x, y),
  };

  const furniture = [
    name,
    `server ${tape.server_name ?? tape.target_kind}`,
    `policy ${tape.agent_policy}`,
    ...(extra.furniture ?? []),
  ];

  loadBeds();
  const watchBeds = () => {
    if (left) return;
    if (bedMissing.size > 0) {
      musicMissing = true;
      writeChrome();
    }
  };
  if (bedsSettled) watchBeds();
  else onBedsSettled.push(watchBeds);
  let audio: AudioOut | null = music.audio;
  let muted = music.muted;
  mute.textContent = muted ? 'Sound off' : 'Sound on';
  const ensureAudio = () => {
    if (audio || typeof AudioContext === 'undefined') return;
    audio = attach(new AudioContext(), undefined, (k) => BEDS.get(k), { seed: round.seed });
    audio.setMuted(muted);
    music.audio = audio;
  };
  mute.addEventListener('click', () => {
    muted = !muted;
    music.muted = muted;
    mute.textContent = muted ? 'Sound off' : 'Sound on';
    ensureAudio();
    audio?.setMuted(muted);
    takeEl.muted = muted;
  });
  intensity.addEventListener('change', () => {
    writePrefs({ feel: intensity.value as Intensity });
  });
  let shakeTouched = prefs.shake !== undefined;
  shake.addEventListener('change', () => {
    shakeTouched = true;
    writePrefs({ shake: shake.checked ? 'on' : 'off' });
  });
  const motionMq =
    typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const onMotion = () => {
    if (left || shakeTouched) return;
    shake.checked = !motionMq!.matches;
  };
  motionMq?.addEventListener('change', onMotion);

  const input: RoundInput = { left: false, right: false, fire: false };
  const keys: Record<string, keyof RoundInput> = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    a: 'left',
    d: 'right',
    ' ': 'fire',
  };
  const onKey = (down: boolean) => (e: KeyboardEvent) => {
    if (chromeTarget(e.target)) return;
    const onField = e.target === canvas;
    if (down && (e.key === 'f' || e.key === 'F')) {
      if (!onField) return;
      goFull();
      e.preventDefault();
      return;
    }
    const k = keys[e.key];
    if (!k) return;
    if (down) ensureAudio();
    input[k] = down;
    if (e.key === ' ') {
      if (onField) e.preventDefault();
      return;
    }
    if (onField) e.preventDefault();
  };
  const keyDown = onKey(true);
  const keyUp = onKey(false);
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);

  const tierFor = (): 0 | 1 | 2 | 3 | undefined =>
    DIFFICULTIES.find((d) => d.value === difficulty.value)?.tier;
  const newRound = () =>
    prepassRound(tape, { seconds: DEFAULT_SECONDS, tier: tierFor(), climb: extra.climb ?? 0 });
  let round: Round = newRound();
  let state: RoundState = createRoundState(round);
  // The opening bed follows the round's seed; a bed already playing keeps its run.
  audio?.seed(round.seed);
  // Seeded from the fresh state, not null, so the first wave card's cue fires.
  let prev: CueSnapshot | null = snapshot(state);
  let last = performance.now();
  let raf = 0;
  let musicEnded = false;
  let spokenSpawn = '';
  const seatSay = (text: string) => {
    if (left) return;
    seat.textContent = text;
  };
  const sayStatSay = (text: string) => {
    if (left) return;
    sayStat.textContent = text;
  };
  const seatFailed = (err: unknown) => {
    seatSay(seatFailLine(err));
  };

  // The voicer: a take plays the moment its receipt is back if the line is
  // still up, waits for the breather if it missed its beat, and is dropped
  // at the scene. Mute silences the take, not the receipt.
  const voicer = createVoicer({
    speak: (job) => speakLine(job, { url: '/voice' }),
    play: (url) => {
      if (left) return;
      if (!voice.checked) return;
      takeEl.pause();
      takeEl.muted = muted;
      if (muted) return;
      // The worker's url is relative to the worker; the dev proxy mounts it at /voice.
      takeEl.src = `/voice${url}`;
      void takeEl.play().catch(() => {
        /* the take is not the game */
      });
    },
    captionSeconds: 2.4,
    onStatus: (s) => {
      if (left) return;
      voiceStat.textContent = s;
    },
  });
  // The cabinet over this round: the host is the boundary (G12), the tools
  // are the levers, and the seat machine drives `fire` one beat ahead.
  const live: Live = { round, state, input };
  const host = hostForRound(() => live, {
    tapes: () => tapeCards(TAPES),
    voiceReady: () => voice.checked && workerUp,
    voice: (job) => {
      if (!left && voice.checked) voicer.job(job);
    },
  });
  const cabinet = createCabinet(host);
  // The schema path (`format`) stays off here: measured with `pnpm sit`, it
  // changed nothing for the Cloud tags and made both local models call no
  // tool at all (finding 18). `pnpm sit --constrain on` keeps measuring it.
  const fireOpts = () => ({
    url: '/ollama/api/chat',
    model: pilotModel.value || localDefault,
    constrain: false,
  });
  let fireGen = 0;
  let fireCtl = new AbortController();
  const bumpFire = () => {
    fireGen += 1;
    fireCtl.abort();
    fireCtl = new AbortController();
  };
  const fireFetch: typeof fetch = (input, init) =>
    fetch(input, { ...init, signal: fireCtl.signal });
  const beatSeconds = (rd: Round) =>
    attachedPatterns(rd).fire.tiers[String(rd.tier) as '0' | '1' | '2' | '3'].boss.period;
  const newSeat = (): Seat => {
    const gen = fireGen;
    const liveState = state;
    return createSeat({
      ask: (v) => askFire(v, { ...fireOpts(), fetchImpl: fireFetch }),
      admit: (verb) => {
        if (left || gen !== fireGen || liveState !== state) return;
        cabinet.call('fire', { verb });
      },
      beatSeconds: beatSeconds(round),
      onStatus: (s) => {
        if (left || daemon !== 'up') return;
        seatSay(s);
      },
    });
  };
  let fireSeat = newSeat();
  // Keep the seat warm (G13): one real ask per model before it is needed.
  const warmed = new Set<string>();
  const warm = () => {
    const model = fireOpts().model;
    if (!ollama.checked || daemon !== 'up' || warmed.has(model)) return;
    warmed.add(model);
    const gen = fireGen;
    seatSay('seat warming');
    void warmUp({ ...fireOpts(), fetchImpl: fireFetch })
      .then(() => {
        if (left || gen !== fireGen || daemon !== 'up') return;
        seatSay('seat warm');
      })
      .catch((err: unknown) => {
        warmed.delete(model);
        if (left || gen !== fireGen || daemon !== 'up') return;
        seatFailed(err);
      });
  };
  // The say seat: asked at each boss spawn and every `cadence` seconds
  // while the boss is up, on the node side; the answer lands through the
  // cabinet's gate. One in flight at a time; a late answer for a boss
  // that is gone is dropped.
  let sayBusy = false;
  let sayKey = '';
  let sayAt = Number.NEGATIVE_INFINITY;
  let says = 0;
  let sayCtl: AbortController | null = null;
  const askSay = (v: SeatView) => {
    if (left) return;
    sayBusy = true;
    const asked = state;
    sayStatSay('say seat thinking');
    sayCtl?.abort();
    sayCtl = new AbortController();
    const ctl = sayCtl;
    void fetch('/cabinet/say', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        view: v,
        recent: host.recent(),
        says,
        models: [fireOpts().model, ...listedModels],
      }),
      signal: AbortSignal.any([ctl.signal, AbortSignal.timeout(12_000)]),
    })
      .then(async (r) => {
        let a: {
          call?: { text: string; lead: string } | null;
          tier?: string;
          suppressed?: boolean;
          error?: string;
        } = {};
        try {
          a = (await r.json()) as typeof a;
        } catch {
          throw new Error(r.ok ? 'bad payload' : 'no answer');
        }
        if (!r.ok) {
          throw new Error(
            typeof a.error === 'string' && a.error.trim() ? a.error.trim() : 'no answer',
          );
        }
        return a;
      })
      .then((a) => {
        if (left || ctl.signal.aborted || asked !== state || !state.boss || !state.boss.alive)
          return;
        if (a.error) {
          sayStatSay(sayFailLine(new Error(a.error)));
          return;
        }
        if (!a.call) {
          sayStatSay(a.suppressed ? 'say seat answered, called nothing' : 'say seat: no line');
          return;
        }
        const r = cabinet.call('say', a.call);
        const refused = /refused/.test(r.content[0]?.text ?? '');
        sayStatSay(
          refused
            ? `seat called say (${a.tier ?? 'seat'}); gate refused it, own line`
            : `seat called say (${a.tier ?? 'seat'})`,
        );
        // Seat speak owns the spawn beat when we dropped the authored take.
        if (voice.checked && !left) cabinet.call('speak', {});
      })
      .catch((err: unknown) => {
        if (left || ctl.signal.aborted) return;
        sayStatSay(sayFailLine(err));
      })
      .finally(() => {
        if (sayCtl === ctl) {
          sayBusy = false;
          sayCtl = null;
        }
      });
  };
  const restart = () => {
    sayCtl?.abort();
    sayCtl = null;
    sayBusy = false;
    bumpFire();
    stopTake();
    round = newRound();
    state = createRoundState(round);
    audio?.seed(round.seed);
    prev = snapshot(state);
    live.round = round;
    live.state = state;
    fireSeat = newSeat();
    sayKey = '';
    sayAt = Number.NEGATIVE_INFINITY;
    spokenSpawn = '';
    nextBtn.disabled = true;
    warm();
  };
  ollama.addEventListener('change', () => {
    writePrefs({ ollama: ollama.checked ? 'on' : 'off' });
    seatSay(ollama.checked ? (daemon === 'down' ? 'seat: no daemon' : 'seat waiting') : 'seat off');
    sayStatSay('');
    warm();
  });
  voice.addEventListener('change', () => {
    writePrefs({ voice: voice.checked ? 'on' : 'off' });
    voiceStat.textContent = voice.checked ? 'voice on' : 'voice off';
    if (!voice.checked) stopTake();
  });
  pilotModel.addEventListener('change', () => {
    warm();
  });
  difficulty.addEventListener('change', () => {
    if (!extra.lockDifficulty) writePrefs({ difficulty: difficulty.value as Difficulty });
    restart();
    canvas.focus();
  });

  const fillPilot = (listed: string[]) => {
    listedModels = listed;
    const prev = pilotModel.value;
    const pick = listed.includes(prev) ? prev : defaultPilotModel(listed);
    pilotModel.replaceChildren();
    for (const name of listed) {
      const o = document.createElement('option');
      o.value = name;
      o.textContent = isCloudModel(name) ? `${name} (cloud)` : name;
      pilotModel.append(o);
    }
    pilotModel.value = pick;
  };
  const markDaemonDown = () => {
    const was = daemon;
    daemon = 'down';
    ollama.disabled = true;
    ollama.checked = false;
    seatSay('seat: no daemon');
    if (was === 'down') return;
    bumpFire();
    fireSeat = newSeat();
    warmed.clear();
    sayCtl?.abort();
    sayCtl = null;
    sayBusy = false;
  };
  const probeTags = () => {
    const signal = AbortSignal.any([tagsCtl.signal, AbortSignal.timeout(2000)]);
    void fetch('/ollama/api/tags', { signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((body: { models?: { name?: string }[] }) => {
        if (left) return;
        const names = (body.models ?? []).map((m) => String(m.name ?? '')).filter(Boolean);
        const listed = listPilotModels(names);
        if (listed.length === 0) {
          markDaemonDown();
          return;
        }
        const was = daemon;
        const returning = daemonWasUp && was === 'down';
        daemon = 'up';
        daemonWasUp = true;
        fillPilot(listed);
        ollama.disabled = false;
        if (was !== 'up') {
          if (!returning && prefs.ollama === 'on') {
            ollama.checked = true;
            seatSay('seat waiting');
            warm();
          } else {
            seatSay(ollama.checked ? 'seat waiting' : 'seat ready');
            if (ollama.checked) warm();
          }
        }
      })
      .catch(() => {
        if (left || tagsCtl.signal.aborted) return;
        markDaemonDown();
      })
      .finally(() => {
        if (left) return;
        tagsProbe = window.setTimeout(probeTags, 5000);
      });
  };
  probeTags();

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    state = stepRound(state, input, dt);
    const next = snapshot(state);
    if (audio) {
      for (const c of cues(prev, next)) audio.play(c);
      if (!state.scene) {
        // The wave's bed: a boss wave names its boss's bed; any other wave
        // asks for the pool, which the player rotates through at each hold.
        // A burst speeds the playing bed up, never a swap. Measured before
        // the hold: twenty bed switches in a ninety-second round, most
        // stretches under four seconds, every one a restart from zero.
        const bound = round.waveBounds[state.wave];
        const waveKind = bound ? kindOfAtom(bound.atom) : 'inspect';
        const bedKind = bound ? (bossKindFor(bound.atom) ?? waveKind) : 'inspect';
        audio.tick(state.t, bedKind, state.parallelism);
        musicEnded = false;
      } else if (!musicEnded) {
        musicEnded = true;
        // In a shift the bed plays on through the card to the next call.
        if (!extra.holdMusic) audio.end();
      }
    }
    if (ollama.checked && !state.scene) {
      // One verb per beat through the cabinet's `fire`: the machine asks
      // once the last verb is spent, prefetches the next during a held
      // beat, and revokes on a changed view. The sim spends what it admits.
      // A down daemon never ticks fire (or POSTs /api/chat); the say seat
      // may still use a node-side key if the box is on.
      const v = seatView(live);
      if (daemon === 'up') {
        fireSeat.tick(v, state.t, state.bossIntent !== null);
        const k = host.takeSfx();
        if (k && audio) audio.play(k);
      }
      if (v.kind !== null && !sayBusy) {
        const key = `${state.wave}:${v.kind}`;
        if (key !== sayKey || state.t - sayAt >= DEFAULT_PERSONAS.cadence) {
          sayKey = key;
          sayAt = state.t;
          says += 1;
          askSay(v);
        }
      }
    }
    // With Voice on, every boss speaks its authored spawn line (synthesised
    // once and cached, G15), so the voice is heard with or without a seat.
    if (voice.checked && !state.scene && state.boss && state.boss.alive) {
      const spawnKey = `${state.wave}:${state.boss.kind}`;
      if (spawnKey !== spokenSpawn && state.caption?.kind === 'wave' && state.caption.line) {
        spokenSpawn = spawnKey;
        // Drop spawn when a seat speak is already asked for this boss.
        const seatOwns = ollama.checked && sayBusy && sayKey === spawnKey;
        if (!seatOwns) {
          voicer.job({
            text: state.caption.line,
            kind: state.boss.kind,
            voice: DEFAULT_PERSONAS.boss[state.boss.kind].voice,
            maxGap: DEFAULT_PERSONAS.voice.maxGap,
            at: state.t,
          });
        }
      }
    }
    voicer.tick(
      state.t,
      state.caption
        ? {
            kind: state.caption.kind ?? 'wave',
            text: state.caption.text,
            ...(state.caption.line ? { line: state.caption.line } : {}),
          }
        : null,
      !state.boss && waveKindAt(round, state.t) === 'breather',
      state.scene !== null,
    );
    prev = next;
    renderRound(draw, state, {
      intensity: intensity.value as Intensity,
      shake: shake.checked,
      furniture,
      clock: now / 1000,
    });
    if (state.scene) {
      // A frame, so the end reads as a scene and not a pause.
      ctx.fillStyle = '#8a6a3a';
      ctx.fillRect(0, 0, FIELD.width, 4);
      nextBtn.disabled = false;
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  canvas.addEventListener('click', () => {
    canvas.focus();
    ensureAudio();
    if (state.scene) restart();
  });
  const leave = () => {
    left = true;
    cancelAnimationFrame(raf);
    window.clearTimeout(voiceProbe);
    window.clearTimeout(tagsProbe);
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
    tagsCtl.abort();
    bumpFire();
    sayCtl?.abort();
    sayCtl = null;
    sayBusy = false;
    stopTake();
    motionMq?.removeEventListener('change', onMotion);
    root.classList.remove('playing');
  };
  back.addEventListener('click', () => {
    leave();
    // Back to the cabinets: the music leaves; the player stays for the next round.
    if (audio && (!state.scene || extra.holdMusic)) audio.end();
    onExit();
  });
  nextBtn.addEventListener('click', () => {
    if (!onNext) return;
    leave();
    onNext();
  });
  if (startAudio) ensureAudio();
  canvas.focus();
}
