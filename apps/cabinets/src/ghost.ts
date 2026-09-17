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
  askNextIntents,
  attach,
  attachedPatterns,
  cadenceAt,
  createRoundState,
  cues,
  DEFAULT_SECONDS,
  defaultPilotModel,
  FIELD,
  isCloudModel,
  listPilotModels,
  prepassRound,
  renderRound,
  snapshot,
  SPRITE_KEYS,
  stepRound,
  TRACK_KEYS,
  bagFor,
  nextBagLine,
  readLineBags,
  waveKindAt,
  type AudioOut,
  type CueSnapshot,
  type DrawContext,
  type Intensity,
  type LineBag,
  type LineBags,
  type MediaBed,
  type Round,
  type RoundInput,
  type RoundState,
} from '@mcp-arcade-cabinets/ghost-on-the-menu';
import type { Tape } from '@mcp-arcade-cabinets/tape-core';

import { TAPES } from './tapes';

/**
 * Pages cannot reach a daemon, so the production Pages build omits the
 * Ollama / Voice chrome. The launcher is a production build that *can*
 * reach one: `VITE_LOCAL_SEATS=true` at pack time. Dev (`pnpm … dev`)
 * is never PROD, so the seats stay on there either way.
 */
const LOCAL_SEATS = import.meta.env.VITE_LOCAL_SEATS === 'true' || !import.meta.env.PROD;
/**
 * Director: seconds the end scene holds before the next tape starts by
 * itself. A round used to stop at its scene until the Next button was
 * clicked, every tape; the Director's word (2026-09-17) is that play flows
 * from one tape into the next. The hold is long enough to read the end line
 * and the trophies; a click on the field inside it replays this tape, and
 * the Next button skips the wait. A mount with nothing to flow into (none
 * offered) holds as before.
 */
export const NEXT_TAPE_S = 7;

const INTENSITIES: Intensity[] = ['calm', 'medium', 'loud'];

/** The tier the round plays at: as the tape's header derives it, or forced. */
export type Difficulty = 'recorded' | 'seat' | 'live' | 'hardcore';
export const DIFFICULTIES: {
  value: Difficulty;
  label: string;
  tier: 0 | 1 | 2 | 3 | undefined;
}[] = [
  // The tier the tape's own header derives, which for every fixture tape is
  // the study rung: the formations neither fire nor dive, and a round is a
  // shooting gallery. It stays selectable — it is how a tape is read as it
  // was recorded — and the label says what it is, because a player who lands
  // on it without being told reads the game as broken.
  { value: 'recorded', label: 'difficulty: as recorded (nothing fires)', tier: undefined },
  { value: 'seat', label: 'difficulty: seat', tier: 1 },
  { value: 'live', label: 'difficulty: live', tier: 2 },
  { value: 'hardcore', label: 'difficulty: hardcore', tier: 3 },
];

/** What a shift (slice 7) sets on a mount; a tape played alone sets none of it. */
export interface MountExtra {
  /** The shift's climb for this call, 0..1; the parallelism levers read it. */
  climb?: number;
  /** Call index 0..3; the sim reads flavor from it when shift.ts has flavors. */
  flavorIndex?: number;
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

/** Sibling of `ghost.prefs`: where each voice pool's bag is in its walk. Words only, no fact. */
const BAGS_KEY = 'ghost.lines';
/**
 * The songs' bag, this browser's: the recorded beds are drawn like the
 * agent's lines, no song heard again until every song has been heard, and
 * the walk carries across tapes and visits (the Director, 2026-09-17). Its
 * own key, beside the lines, because the music outlives a mount: the same
 * player carries the song from one tape into the next.
 */
const SONGS_KEY = 'ghost.songs';
const SONG_KEYS: readonly string[] = [...TRACK_KEYS];
let songBags: LineBags | null = null;
const songBag = (): LineBag => {
  if (!songBags) {
    try {
      const raw = localStorage.getItem(SONGS_KEY);
      songBags = readLineBags(raw ? (JSON.parse(raw) as unknown) : null);
    } catch {
      songBags = {};
    }
  }
  return bagFor(songBags, 'songs');
};
/** The seed the bag reshuffles on when it empties: the visit's, not a round's. */
const songSeed = (Date.now() >>> 0) ^ 0x5f3759df;
/** The next song's key, and the walk written down so a reload keeps its place. */
export const nextSongKey = (): string => {
  const key = nextBagLine(SONG_KEYS, songBag(), songSeed, 17);
  try {
    localStorage.setItem(SONGS_KEY, JSON.stringify(songBags));
  } catch {
    /* a private window or blocked storage: the walk starts over next time */
  }
  return key;
};
/** The next song that has a file; undefined when none has arrived yet. */
const nextSongBed = (): MediaBed | undefined => {
  for (let i = 0; i < SONG_KEYS.length; i++) {
    const bed = BEDS.get(nextSongKey());
    if (bed) return bed;
  }
  return undefined;
};

export function readStoredBags(): LineBags {
  try {
    const raw = localStorage.getItem(BAGS_KEY);
    return readLineBags(raw ? (JSON.parse(raw) as unknown) : null);
  } catch {
    return {};
  }
}

export function writeStoredBags(bags: LineBags): void {
  try {
    localStorage.setItem(BAGS_KEY, JSON.stringify(bags));
  } catch {
    /* a private window or blocked storage: the walk starts over next time */
  }
}

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

/**
 * What is actually under the key, unvalidated. `readPrefs` is a strict
 * allowlist, so merging a patch over IT drops every field this build does not
 * know about — and a write from any of the six controls is enough to do it. A
 * pref this build has never heard of belongs to the build that wrote it (an
 * older bundle in another tab, a newer one after a rollback, the next slice's
 * own key), so the merge below is over the raw object and the validating stays
 * where it belongs, on the read.
 */
function rawPrefs(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return { ...(parsed as Record<string, unknown>) };
  } catch {
    return {};
  }
}

export function writePrefs(patch: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...rawPrefs(), ...patch }));
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

/**
 * The boss-intent prefetch's per-round bookkeeping: when the last ask went
 * out, on the round's own clock, and whether one is in flight.
 */
export interface QueueClock {
  lastAsk: number;
  busy: boolean;
}

/** A clock for a round that has asked for nothing yet. */
export function newQueueClock(): QueueClock {
  return { lastAsk: Number.NEGATIVE_INFINITY, busy: false };
}

/** Whether a prefetch is owed: verbs are short, none is in flight, the wait has passed. */
export function queueDue(clock: QueueClock, t: number, wait: number, need: number): boolean {
  return need > 0 && !clock.busy && t - clock.lastAsk >= wait;
}

/**
 * Whether verbs asked for one view may still be pushed onto the round on the
 * field. A prefetch resolves long after the ask; a restart replaces `state`
 * wholesale and bumps the fire generation, so an answer drawn for the round
 * before is dropped rather than queued. The fire seat admits on exactly this
 * test; the queue path guarded only on having left the mount.
 */
export function admitIntents(a: {
  left: boolean;
  gen: number;
  fireGen: number;
  asked: unknown;
  live: unknown;
}): boolean {
  return !a.left && a.gen === a.fireGen && a.asked === a.live;
}

/**
 * A request the mount can revoke that still keeps the caller's own deadline.
 * Spreading `init` and then writing `signal` REPLACES what the caller passed,
 * and the fire seat's caller is the one that carries the ask's budget
 * (`AbortSignal.timeout(budget.timeoutMs)`): dropped, a daemon that accepts
 * the connection and then hangs leaves the ask pending for the life of the
 * mount, no abort ever reaches the transport map, and the status row keeps
 * whatever word it had — 'seat warming' forever, and never a timeout. Every
 * other seat fetch in this shell composes; this is the composition they use.
 */
export function withSignal(init: RequestInit | undefined, own: AbortSignal): RequestInit {
  const caller = init?.signal;
  return { ...init, signal: caller ? AbortSignal.any([caller, own]) : own };
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

/** Closed library line after fire succeeds. Beside the picker, never on the field (G17). */
const FIRE_LINE: Record<string, string> = {
  spread: 'a wide fan',
  column: 'a lean over the ship',
  hold: 'a held breath',
  fog: 'a fog bank',
  plate: 'a plate',
  script: 'the script',
};

// The music lives as long as the page (the Director's word, 2026-09-11): a
// shift hears a run of beds through its cards rather than four openings,
// and a bed never restarts from zero. Beds load once; the context is built
// on the first gesture, as browsers require.
const BEDS = new Map<string, HTMLAudioElement>();
/** Beds whose file answered with an `error`. Only these make the status word. */
const bedMissing = new Set<string>();
let bedsRequested = false;
let bedsSettled = false;
const bedWatchers = new Set<() => void>();
/**
 * How long the chrome waits on the beds before it draws what it knows.
 *
 * This is sized for METADATA, not for a whole file. The beds are 110-128 s
 * pieces of about 1.8 MB each; the deadline that shipped was a bare 4000 ms
 * waited on `canplaythrough`, which is the whole file buffered, so on any
 * ordinary connection every bed was still downloading when it expired and all
 * eight were written down as missing. A bed settles on `loadedmetadata` or
 * `canplay` now — the moment the element knows its own length and can start —
 * and this deadline only decides when the chrome stops holding its breath.
 */
const BED_SETTLE_MS = 8000;
const loadBeds = () => {
  if (bedsRequested) return;
  bedsRequested = true;
  const pending = new Set<string>(TRACK_KEYS);
  const notify = () => {
    for (const fn of bedWatchers) fn();
  };
  const one = (key: string, ok: boolean) => {
    pending.delete(key);
    if (ok || BEDS.has(key)) bedMissing.delete(key);
    else bedMissing.add(key);
    if (pending.size === 0) bedsSettled = true;
    notify();
  };
  // The deadline settles the CHROME, not the beds. A bed that has not
  // answered by now is still on its way: it keeps its listeners and clears
  // its mark the moment it arrives. `music: chiptune` therefore means a bed
  // that failed to load, never one that is merely slow.
  window.setTimeout(() => {
    if (pending.size === 0) return;
    bedsSettled = true;
    notify();
  }, BED_SETTLE_MS);
  // The order stands as TRACK_KEYS has it: the five pool beds a round can
  // open on come first and the three boss beds after, which is already the
  // order a round wants them in.
  for (const key of TRACK_KEYS) {
    const el = new Audio();
    el.preload = 'auto';
    // A song plays once through; the next is drawn when it ends.
    el.loop = false;
    const arrived = () => {
      BEDS.set(key, el);
      one(key, true);
    };
    // Either event is enough: the element knows its length (which is what the
    // hold follows) and can begin. Both are registered because a browser that
    // stalls after the headers still fires the first of them.
    el.addEventListener('loadedmetadata', arrived, { once: true });
    el.addEventListener('canplay', arrived, { once: true });
    el.addEventListener('error', () => one(key, false), { once: true });
    el.src = `${import.meta.env.BASE_URL}tracks/${key}.mp3`;
  }
};
/** A bed the browser refused to play: the shell says chiptune and stops asking. */
const bedFailed = (el: MediaBed) => {
  for (const [key, have] of BEDS) {
    if (have !== (el as unknown as HTMLAudioElement)) continue;
    BEDS.delete(key);
    bedMissing.add(key);
    break;
  }
  for (const fn of bedWatchers) fn();
};
const music: { audio: AudioOut | null; muted: boolean; ctx: AudioContext | null } = {
  audio: null,
  muted: false,
  // The context the first gesture built, kept beside the score it carries: a
  // mount that reuses the score needs the same context to wake it when the
  // browser has put it to sleep since.
  ctx: null,
};

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
  // What the seats are doing, outside the field: a closed library line after
  // fire, 'seat thinking' only while the ask is in flight. Never a fact,
  // never a digit, never a model name (G17).
  const seat = document.createElement('span');
  seat.className = 'muted seat';
  liveStatus(seat, 'seat');
  seat.textContent = LOCAL_SEATS ? 'seat: looking for a daemon' : '';
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
  /**
   * Both mount-level probes re-armed at a flat five seconds for the life of
   * the mount. That cadence is right for the case the comments describe — a
   * player who starts `pnpm voice` or the daemon after the page opened — and
   * wrong for the far commoner one, a local build where nothing is listening
   * and nothing will be: two requests every five seconds is about sixty failed
   * fetches in a round, each re-running a mark-down and rewriting a live
   * region whose text has not changed. So a probe that keeps failing doubles
   * its wait up to a ceiling, and the first answer puts it back to five.
   */
  const PROBE_MS = 5000;
  const PROBE_CAP_MS = 60_000;
  /** Five seconds for the first retry, doubling with each failure after it. */
  const probeWait = (fails: number) =>
    Math.min(PROBE_CAP_MS, PROBE_MS * 2 ** Math.max(0, fails - 1));
  let voiceFails = 0;
  let tagsFails = 0;
  /** A word for a live region, written only when it is not the word already there. */
  const writeWord = (node: HTMLElement, text: string) => {
    if (left || node.textContent === text) return;
    node.textContent = text;
  };
  const takeEl = new Audio();
  takeEl.volume = 0.9;
  const duckBeds = (on: boolean) => {
    music.audio?.setBedDuck(on);
  };
  const stopTake = () => {
    takeEl.pause();
    takeEl.src = '';
    duckBeds(false);
  };
  takeEl.addEventListener('play', () => {
    if (!left && !music.muted) duckBeds(true);
  });
  takeEl.addEventListener('playing', () => {
    if (!left && !music.muted) duckBeds(true);
  });
  takeEl.addEventListener('pause', () => {
    if (!left) duckBeds(false);
  });
  takeEl.addEventListener('ended', () => {
    if (!left) duckBeds(false);
  });
  const markVoiceDown = () => {
    const wasOn = voice.checked;
    if (workerUp) voiceSawDown = true;
    workerUp = false;
    voice.disabled = true;
    voice.checked = false;
    if (wasOn) stopTake();
    voiceFails += 1;
    writeWord(voiceStat, 'voice: no worker (pnpm voice)');
  };
  const probeVoice = () => {
    void voiceHealth({ url: '/voice', timeoutMs: 2000 })
      .then((h) => {
        if (left) return;
        if (h) {
          voiceFails = 0;
          const firstUp = !workerUp && !voiceSawDown;
          workerUp = true;
          voice.disabled = false;
          if (firstUp && prefs.voice === 'on') {
            voice.checked = true;
            writeWord(voiceStat, 'voice on');
          } else if (!voice.checked) {
            writeWord(voiceStat, 'voice ready');
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
        voiceProbe = window.setTimeout(probeVoice, probeWait(voiceFails));
      });
  };
  if (LOCAL_SEATS) probeVoice();
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
  controls.append(full, difficulty, mute, intensity, shakeLabel);
  if (LOCAL_SEATS) {
    // Unique string the launcher pack greps for: a Pages build DCE's this.
    controls.setAttribute('data-local-seats', 'on');
    controls.append(ollamaLabel, voiceLabel, pilotModel);
  }
  controls.append(nextBtn);
  const statusRow = document.createElement('div');
  statusRow.className = 'row';
  statusRow.append(seat, sayStat, voiceStat, chrome);

  const hint = document.createElement('p');
  hint.className = 'muted';
  hint.textContent =
    extra.hint ??
    'Left, right, space. F toggles full screen. Click the field to restart the same tape.';
  canvas.setAttribute('aria-label', hint.textContent);
  const back = document.createElement('button');
  back.textContent = 'Back to the cabinets';
  wrap.append(canvas, controls, statusRow, hint, back);
  root.append(wrap);
  root.classList.add('playing');

  let artMissing = false;
  const missingArt = new Set<string>();
  let musicMissing = false;
  let fullWord = '';
  /** What the sound is doing when it is not simply playing. Words only. */
  let soundWord = '';
  const writeChrome = () => {
    if (left) return;
    const parts: string[] = [];
    if (artMissing) parts.push('art: using blocks');
    if (musicMissing) parts.push('music: chiptune');
    if (soundWord) parts.push(soundWord);
    if (fullWord) parts.push(fullWord);
    writeWord(chrome, parts.join(' · '));
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
  const fullEl = (): Element | null =>
    document.fullscreenElement ?? fullDoc.webkitFullscreenElement ?? null;
  const syncFullLabel = () => {
    const on = fullEl() === canvas;
    full.textContent = on ? 'Exit full screen' : 'Full screen';
    full.classList.toggle('picked', on);
  };
  const onFullChange = (fn: () => void, on: boolean) => {
    const target: EventTarget = document;
    if (on) {
      target.addEventListener('fullscreenchange', fn);
      target.addEventListener('webkitfullscreenchange', fn);
    } else {
      target.removeEventListener('fullscreenchange', fn);
      target.removeEventListener('webkitfullscreenchange', fn);
    }
  };
  onFullChange(syncFullLabel, true);
  const layoutField = () => {
    if (fullEl() === canvas) {
      canvas.style.removeProperty('width');
      canvas.style.removeProperty('height');
      return;
    }
    const maxW = wrap.clientWidth || FIELD.width;
    const chromeH = (window.innerWidth <= 640 ? 14 : 8) * 16;
    const maxH = Math.max(FIELD.height, window.innerHeight - chromeH);
    const s = Math.min(Math.floor(maxW / FIELD.width), Math.floor(maxH / FIELD.height));
    if (s >= 2) {
      canvas.style.width = `${FIELD.width * s}px`;
      canvas.style.height = `${FIELD.height * s}px`;
    } else {
      canvas.style.removeProperty('width');
      canvas.style.removeProperty('height');
    }
  };
  onFullChange(layoutField, true);
  window.addEventListener('resize', layoutField);
  layoutField();
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Sprites are files under /sprites/<key>.png, one per SPRITE_KEY. A key
  // whose file is missing or not yet loaded draws as its rectangle, so the
  // game is playable before, without, or during the art.
  const atlas = new Map<string, HTMLImageElement>();
  const pendingArt = new Set<string>(SPRITE_KEYS);
  const artOne = (key: string, ok: boolean) => {
    pendingArt.delete(key);
    if (ok || atlas.has(key)) missingArt.delete(key);
    else missingArt.add(key);
    artMissing = missingArt.size > 0;
    writeChrome();
  };
  window.setTimeout(() => {
    if (left) return;
    for (const key of [...pendingArt]) artOne(key, false);
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
    fillText: (t, x, y) => ctx.fillText(t, x, y, FIELD.width - 32),
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
    musicMissing = bedMissing.size > 0;
    writeChrome();
  };
  bedWatchers.add(watchBeds);
  if (bedsSettled) watchBeds();
  let audio: AudioOut | null = music.audio;
  let muted = music.muted;
  mute.textContent = muted ? 'Sound off' : 'Sound on';
  const takeIsPlaying = () => !takeEl.paused && !takeEl.ended && Boolean(takeEl.src);
  /** A construction that threw is tried once, not once a gesture. */
  let audioFailed = false;
  const SOUND_ASLEEP = 'sound: asleep, click the field';
  const SOUND_GONE = 'sound: not on this browser';
  const sayAudioWord = (word: string) => {
    soundWord = word;
    writeChrome();
  };
  /**
   * A context the browser has put to sleep after the first gesture — an
   * interruption on a phone, a tab restored, WebKit's own `interrupted`, which
   * is not 'suspended' and so never matched a test for it — stays asleep for
   * the rest of the round unless something asks it to come back. Every state
   * but 'running' is asked; a refusal is said on the chrome row rather than
   * leaving the player with a silent game and no word for it.
   */
  const wakeAudio = () => {
    const ctxNow = music.ctx;
    if (left || !ctxNow || ctxNow.state === 'running') return;
    const settled = (ok: boolean) => {
      if (left) return;
      sayAudioWord(ok && ctxNow.state === 'running' ? '' : SOUND_ASLEEP);
    };
    try {
      void Promise.resolve(ctxNow.resume()).then(
        () => settled(true),
        () => settled(false),
      );
    } catch {
      settled(false);
    }
  };
  const onCtxState = () => wakeAudio();
  const ensureAudio = () => {
    if (audio) {
      // A gesture is also the moment to wake a context that went to sleep.
      wakeAudio();
      return;
    }
    if (audioFailed || typeof AudioContext === 'undefined') return;
    let built: AudioContext | null = null;
    try {
      built = new AudioContext();
      const out = attach(built, undefined, (k) => BEDS.get(k), {
        seed: round.seed,
        nextBed: nextSongBed,
        onBedFail: bedFailed,
      });
      out.setMuted(muted);
      audio = out;
      music.audio = out;
      music.ctx = built;
      built.addEventListener?.('statechange', onCtxState);
      if (takeIsPlaying() && !muted) out.setBedDuck(true);
    } catch {
      // The context was built before the wiring failed, so it is a live
      // context nothing can reach: a page may hold only a few, and one leaked
      // a gesture ends with construction itself throwing for good. It is
      // closed here, the failure is remembered so the next gesture does not
      // build another, and the round plays silent rather than not at all.
      audio = null;
      audioFailed = true;
      if (built) {
        try {
          void Promise.resolve(built.close()).catch(() => undefined);
        } catch {
          /* a context that will not close is already past helping */
        }
      }
      sayAudioWord(SOUND_GONE);
      return;
    }
    wakeAudio();
  };
  // A context an earlier mount built is this mount's to wake as well.
  music.ctx?.addEventListener?.('statechange', onCtxState);
  // A tab coming back is the other moment a suspended context has to be asked:
  // a phone suspends the context while the tab is away and says nothing when
  // it returns, and the round would play out silent.
  const onVisibility = () => {
    if (!left && document.visibilityState !== 'hidden') wakeAudio();
  };
  document.addEventListener('visibilitychange', onVisibility);
  mute.addEventListener('click', () => {
    muted = !muted;
    music.muted = muted;
    mute.textContent = muted ? 'Sound off' : 'Sound on';
    ensureAudio();
    audio?.setMuted(muted);
    takeEl.muted = muted;
    if (muted || !takeIsPlaying()) duckBeds(false);
    else duckBeds(true);
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
  const newRound = () => {
    const opts: {
      seconds: number;
      tier: 0 | 1 | 2 | 3 | undefined;
      climb: number;
      flavorIndex?: number;
    } = {
      seconds: DEFAULT_SECONDS,
      tier: tierFor(),
      climb: extra.climb ?? 0,
    };
    if (extra.flavorIndex !== undefined) opts.flavorIndex = extra.flavorIndex;
    return prepassRound(tape, opts);
  };
  let round: Round = newRound();
  // The voice pools' bags, this browser's: a line is not heard again until
  // its whole pool has been heard, across tapes and restarts alike. The
  // store is written at the scene and on leaving the field, and on pagehide
  // as well, so a reload or a closed tab mid-round keeps the round's draws
  // rather than hearing them again (Kimi's review of the lines commit).
  const bags = readStoredBags();
  const onPageHide = () => writeStoredBags(bags);
  window.addEventListener('pagehide', onPageHide);
  let state: RoundState = createRoundState(round, { bags });
  // The opening bed follows the round's seed; a bed already playing keeps its run.
  audio?.seed(round.seed);
  // Seeded from the fresh state, not null, so the first wave card's cue fires.
  let prev: CueSnapshot | null = snapshot(state);
  let last = performance.now();
  let raf = 0;
  let musicEnded = false;
  /** The frame clock at which the end scene first showed; null while a round is on. */
  let sceneAt: number | null = null;
  let spokenSpawn = '';
  const seatSay = (text: string) => {
    writeWord(seat, text);
  };
  const sayStatSay = (text: string) => {
    writeWord(sayStat, text);
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
        duckBeds(false);
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
  const fireFetch: typeof fetch = (input, init) => fetch(input, withSignal(init, fireCtl.signal));
  const beatSeconds = (rd: Round) =>
    attachedPatterns(rd).fire.tiers[String(rd.tier) as '0' | '1' | '2' | '3'].boss.period;
  const newSeat = (): Seat => {
    const gen = fireGen;
    const liveState = state;
    let closedFire = false;
    return createSeat({
      ask: (v) => askFire(v, { ...fireOpts(), fetchImpl: fireFetch }),
      admit: (verb) => {
        if (left || gen !== fireGen || liveState !== state) return;
        const r = cabinet.call('fire', { verb });
        if (r.isError) return;
        const last = cabinet.log[cabinet.log.length - 1];
        if (!last?.ok) return;
        const line = FIRE_LINE[verb];
        if (line) {
          seatSay(line);
          closedFire = true;
        }
      },
      beatSeconds: beatSeconds(round),
      onStatus: (s) => {
        if (left) return;
        if (s === 'seat: view changed, asking again') closedFire = false;
        // Prefetch asks while the last verb is still held; keep the library
        // line until that verb is spent. Thinking is only before a close.
        if (s === 'seat thinking' && !closedFire) seatSay(s);
      },
    });
  };
  let fireSeat = newSeat();
  /**
   * The boss-intent prefetch's bookkeeping, which belongs to the round and
   * not to the mount: a restart draws a new round whose clock starts at zero.
   * Carried over, `lastAsk` holds a time in the new round's future and the
   * gate below (`state.t - lastAsk >= wait`) stays shut until the new clock
   * passes it — a restart late in a round left most of the next one with no
   * queued intents at all, silently on the scripted path. `busy` travels with
   * it so an ask still in flight over a restart does not hold the new round's
   * gate shut either.
   */
  let queue = newQueueClock();
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
    state = createRoundState(round, { bags });
    audio?.seed(round.seed);
    prev = snapshot(state);
    live.round = round;
    live.state = state;
    fireSeat = newSeat();
    // A new round, a new prefetch clock: the one before holds an ask time on
    // the old round's clock, which the new one starts below.
    queue = newQueueClock();
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
    tagsFails += 1;
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
        tagsFails = 0;
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
        tagsProbe = window.setTimeout(probeTags, probeWait(tagsFails));
      });
  };
  if (LOCAL_SEATS) probeTags();

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    state = stepRound(state, input, dt);
    const next = snapshot(state);
    // Named boss bed while a boss is up; otherwise the wave kind,
    // including 'breather' in the t1→next-t0 gap. Same key ticks audio
    // and paints WAVE_FIELD.
    const bedKind = state.boss && state.boss.alive ? state.boss.kind : waveKindAt(round, state.t);
    if (audio) {
      for (const c of cues(prev, next)) audio.play(c);
      if (!state.scene) {
        audio.tick(state.t, bedKind, state.parallelism);
        musicEnded = false;
      } else if (!musicEnded) {
        musicEnded = true;
        // The song plays on through the scene into the next tape, and in a
        // shift through the card to the next call; only the chiptune stops.
        audio.end(true);
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
        if (v.kind !== null && !queue.busy) {
          const tier = String(round.tier) as '0' | '1' | '2' | '3';
          const lever = attachedPatterns(round).fire.tiers[tier].boss.pilot;
          const look = lever.lookAhead;
          const period = beatSeconds(round);
          const wait = cadenceAt(lever, state.parallelism ? 1.5 : 1) * period;
          const need = look - state.bossQueue.length;
          if (queueDue(queue, state.t, wait, need)) {
            // The clock, the generation and the round this ask was drawn for,
            // held for the answer: the prefetch resolves long after the ask,
            // and a restart replaces both the clock and `state` wholesale.
            const clock = queue;
            const gen = fireGen;
            const asked = state;
            clock.busy = true;
            clock.lastAsk = state.t;
            void askNextIntents(
              { url: '/ollama/api/generate', model: fireOpts().model },
              v,
              need,
            ).then((verbs) => {
              clock.busy = false;
              // Verbs drawn for a view that is no longer on the field are
              // dropped, not queued — the same admit the fire seat makes.
              if (!admitIntents({ left, gen, fireGen, asked, live: state })) return;
              state.bossQueue.push(...verbs);
            });
          }
        }
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
          const personas = DEFAULT_PERSONAS.boss as Record<
            string,
            (typeof DEFAULT_PERSONAS.boss)[keyof typeof DEFAULT_PERSONAS.boss] | undefined
          >;
          const persona = personas[state.boss.kind];
          if (persona) {
            voicer.job({
              text: state.caption.line,
              kind: state.boss.kind as 'whisperer' | 'menu' | 'doorman',
              voice: persona.voice,
              maxGap: DEFAULT_PERSONAS.voice.maxGap,
              at: state.t,
            });
          }
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
      bedKind,
    });
    if (state.scene) {
      // A frame, so the end reads as a scene and not a pause.
      ctx.fillStyle = '#8a6a3a';
      ctx.fillRect(0, 0, FIELD.width, 4);
      nextBtn.disabled = false;
      // The scene holds NEXT_TAPE_S, then the play flows into the next tape
      // on its own, the same path the Next button takes.
      if (sceneAt === null) {
        sceneAt = now;
        // The round's lines are spent: the bags go to storage here, so the
        // next tape and the next visit carry on the walk.
        writeStoredBags(bags);
      } else if (onNext && now - sceneAt >= NEXT_TAPE_S * 1000) {
        leave();
        onNext();
        return;
      }
    } else {
      sceneAt = null;
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
    writeStoredBags(bags);
    cancelAnimationFrame(raf);
    window.clearTimeout(voiceProbe);
    window.clearTimeout(tagsProbe);
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
    window.removeEventListener('resize', layoutField);
    window.removeEventListener('pagehide', onPageHide);
    onFullChange(syncFullLabel, false);
    onFullChange(layoutField, false);
    tagsCtl.abort();
    bumpFire();
    sayCtl?.abort();
    sayCtl = null;
    sayBusy = false;
    stopTake();
    bedWatchers.delete(watchBeds);
    music.ctx?.removeEventListener?.('statechange', onCtxState);
    document.removeEventListener('visibilitychange', onVisibility);
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

  // A handle, for the tests. The page ignores it: `playAt` and the shift both
  // mount and walk away, and nothing on the field reads any of this.
  return {
    unmount: leave,
    debug: () => ({
      wave: state.wave,
      t: state.t,
      /** The round's prefetch bookkeeping, live — a test writes to it. */
      queue,
      queued: state.bossQueue.length,
    }),
  };
}
