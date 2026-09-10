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

import {
  askOllama,
  askOllamaLine,
  attach,
  attachedPatterns,
  bossKindFor,
  columnWord,
  createRoundState,
  cues,
  DEFAULT_SECONDS,
  defaultPilotModel,
  FIELD,
  hpWord,
  isCloudModel,
  listPilotModels,
  prepassRound,
  renderRound,
  snapshot,
  SPRITE_KEYS,
  stepRound,
  stickWord,
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

const INTENSITIES: Intensity[] = ['calm', 'medium', 'loud'];

/** The tier the round plays at: as the tape's header derives it, or forced. */
export type Difficulty = 'recorded' | 'seat' | 'live' | 'hardcore';
const DIFFICULTIES: { value: Difficulty; label: string; tier: 0 | 1 | 2 | 3 | undefined }[] = [
  { value: 'recorded', label: 'difficulty: as recorded', tier: undefined },
  { value: 'seat', label: 'difficulty: seat', tier: 1 },
  { value: 'live', label: 'difficulty: live', tier: 2 },
  { value: 'hardcore', label: 'difficulty: hardcore', tier: 3 },
];

export function mountGhost(
  root: HTMLElement,
  name: string,
  tape: Tape,
  onExit: () => void,
  onNext?: () => void,
  /** True when the mount follows a click (Next tape), so the sound can start at once. */
  startAudio = false,
) {
  root.replaceChildren();
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
  for (const i of INTENSITIES) {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = `feel: ${i}`;
    intensity.append(o);
  }
  intensity.value = 'calm';
  const shakeLabel = document.createElement('label');
  const shake = document.createElement('input');
  shake.type = 'checkbox';
  shake.checked = true;
  shakeLabel.append(shake, document.createTextNode(' shake'));
  const ollamaLabel = document.createElement('label');
  const ollama = document.createElement('input');
  ollama.type = 'checkbox';
  ollama.checked = false;
  ollamaLabel.append(ollama, document.createTextNode(' Ollama bosses'));
  ollamaLabel.title =
    'Local daemon or Ollama Cloud. The boss calls its own shots and picks its own line; it never sees which sprites are lies. Needs the local game, not Pages.';
  // What the seat is doing, outside the field: never a fact, never a digit.
  const seat = document.createElement('span');
  seat.className = 'muted seat';
  seat.textContent = 'seat off';
  let daemon: 'unknown' | 'up' | 'down' = 'unknown';
  const pilotModel = document.createElement('select');
  const localDefault = 'qwen2.5:7b-instruct';
  const seedOpt = document.createElement('option');
  seedOpt.value = localDefault;
  seedOpt.textContent = localDefault;
  pilotModel.append(seedOpt);
  pilotModel.value = localDefault;
  pilotModel.title = 'Cloud tags first when the local daemon has signed in.';
  void fetch('/ollama/api/tags')
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((body: { models?: { name?: string }[] }) => {
      const names = (body.models ?? []).map((m) => String(m.name ?? '')).filter(Boolean);
      const listed = listPilotModels(names);
      if (listed.length === 0) return;
      const pick = defaultPilotModel(listed);
      pilotModel.replaceChildren();
      for (const name of listed) {
        const o = document.createElement('option');
        o.value = name;
        o.textContent = isCloudModel(name) ? `${name} (cloud)` : name;
        pilotModel.append(o);
      }
      pilotModel.value = pick;
      daemon = 'up';
    })
    .catch(() => {
      /* local daemon down: keep the 7B default */
      daemon = 'down';
    });
  const full = document.createElement('button');
  full.textContent = 'Full screen';
  const difficulty = document.createElement('select');
  for (const d of DIFFICULTIES) {
    const o = document.createElement('option');
    o.value = d.value;
    o.textContent = d.label;
    difficulty.append(o);
  }
  // Fixture tapes derive to tier 0, where formations neither fire nor dive; seat is the fun default.
  difficulty.value = 'seat';
  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next tape';
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
    nextBtn,
  );

  const hint = document.createElement('p');
  hint.className = 'muted';
  hint.textContent =
    'Left, right, space. F or the button for full screen. Click the field to restart the same tape.';
  const back = document.createElement('button');
  back.textContent = 'Back to the cabinets';
  wrap.append(canvas, controls, hint, back);
  root.append(wrap);
  root.classList.add('playing');

  // Full screen is the canvas alone, letterboxed by the browser; keys keep working.
  const goFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void canvas.requestFullscreen();
    canvas.focus();
  };
  full.addEventListener('click', goFull);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Sprites are files under /sprites/<key>.png, one per SPRITE_KEY. A key
  // whose file is missing or not yet loaded draws as its rectangle, so the
  // game is playable before, without, or during the art.
  const atlas = new Map<string, HTMLImageElement>();
  for (const key of SPRITE_KEYS) {
    const img = new Image();
    img.decoding = 'async';
    img.addEventListener('load', () => atlas.set(key, img));
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
  ];

  let audio: AudioOut | null = null;
  let muted = false;
  const beds = new Map<string, HTMLAudioElement>();
  for (const key of TRACK_KEYS) {
    const el = new Audio();
    el.preload = 'auto';
    el.loop = true;
    el.addEventListener('canplaythrough', () => beds.set(key, el), { once: true });
    el.src = `${import.meta.env.BASE_URL}tracks/${key}.mp3`;
  }
  const ensureAudio = () => {
    if (audio || typeof AudioContext === 'undefined') return;
    audio = attach(new AudioContext(), undefined, (k) => beds.get(k));
    audio.setMuted(muted);
  };
  mute.addEventListener('click', () => {
    muted = !muted;
    mute.textContent = muted ? 'Sound off' : 'Sound on';
    ensureAudio();
    audio?.setMuted(muted);
    canvas.focus();
  });
  intensity.addEventListener('change', () => canvas.focus());
  shake.addEventListener('change', () => canvas.focus());

  const input: RoundInput = { left: false, right: false, fire: false };
  const keys: Record<string, keyof RoundInput> = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    a: 'left',
    d: 'right',
    ' ': 'fire',
  };
  const onKey = (down: boolean) => (e: KeyboardEvent) => {
    if (down && (e.key === 'f' || e.key === 'F')) {
      goFull();
      e.preventDefault();
      return;
    }
    const k = keys[e.key];
    if (!k) return;
    if (down) ensureAudio();
    input[k] = down;
    e.preventDefault();
  };
  const keyDown = onKey(true);
  const keyUp = onKey(false);
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);

  const tierFor = (): 0 | 1 | 2 | 3 | undefined =>
    DIFFICULTIES.find((d) => d.value === difficulty.value)?.tier;
  const newRound = () => prepassRound(tape, { seconds: DEFAULT_SECONDS, tier: tierFor() });
  let round: Round = newRound();
  let state: RoundState = createRoundState(round);
  // Seeded from the fresh state, not null, so the first wave card's cue fires.
  let prev: CueSnapshot | null = snapshot(state);
  let last = performance.now();
  let lastPilot = 0;
  let pilotBusy = false;
  // Waves whose boss line has been asked for this round, so each is asked once.
  let linesAsked = new Set<number>();
  let raf = 0;
  const restart = () => {
    round = newRound();
    state = createRoundState(round);
    prev = snapshot(state);
    linesAsked = new Set();
    nextBtn.disabled = true;
  };
  const seatSay = (text: string) => {
    seat.textContent = text;
  };
  const seatFailed = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    seatSay(/retired/i.test(msg) ? 'seat: model retired' : 'seat: no answer, script');
  };
  const pilotOpts = () => ({
    url: '/ollama/api/generate',
    model: pilotModel.value || localDefault,
  });
  ollama.addEventListener('change', () => {
    seatSay(ollama.checked ? (daemon === 'down' ? 'seat: no daemon' : 'seat waiting') : 'seat off');
    canvas.focus();
  });
  pilotModel.addEventListener('change', () => canvas.focus());

  // The voice seat asks ahead: this wave's boss right away, the next wave's
  // boss as soon as a wave opens, so the answer lands before the spawn. The
  // prompt is the kind and its own lines from voice.json; the reply is a
  // letter. A late or missing answer leaves the seed's line.
  const askLines = (st: RoundState, rd: Round) => {
    for (const wave of [st.wave, st.wave + 1]) {
      if (linesAsked.has(wave)) continue;
      const bound = rd.waveBounds[wave];
      if (!bound) continue;
      const kind = bossKindFor(bound.atom);
      if (!kind) continue;
      linesAsked.add(wave);
      const lines = attachedPatterns(rd).voice.boss[kind];
      void askOllamaLine(kind, lines, pilotOpts())
        .then((index) => {
          if (index === null || st !== state) return;
          state.bossLine = { wave, kind, index };
        })
        .catch(() => {
          /* the seed's line stays */
        });
    }
  };
  difficulty.addEventListener('change', () => {
    restart();
    canvas.focus();
  });

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    state = stepRound(state, input, dt);
    const next = snapshot(state);
    if (audio) {
      for (const c of cues(prev, next)) audio.play(c);
      if (!state.scene) {
        const kind = state.parallelism
          ? 'parallelism'
          : state.boss && state.boss.alive
            ? state.boss.kind
            : waveKindAt(round, state.t);
        audio.tick(state.t, kind);
      }
    }
    if (ollama.checked && !state.scene) askLines(state, round);
    // One verb per beat: ask again once the sim has spent the last answer,
    // not on a clock, so a fast Cloud tag sits every beat and a slow one is
    // never asked twice for the same beat.
    if (
      ollama.checked &&
      state.boss &&
      state.boss.alive &&
      !pilotBusy &&
      state.bossIntent === null &&
      now - lastPilot > 900
    ) {
      lastPilot = now;
      const boss = state.boss;
      const view = {
        kind: boss.kind,
        hp: hpWord(boss.hp, boss.maxHp),
        column: columnWord(state.player.x, FIELD.width),
        stick: stickWord(input),
        motion: boss.motion,
      };
      pilotBusy = true;
      seatSay('seat thinking');
      const asked = state;
      void askOllama(view, pilotOpts())
        .then((intent) => {
          if (asked !== state || !state.boss || !state.boss.alive) return;
          state.bossIntent = intent;
          seatSay(intent === 'script' ? 'seat: script' : `seat said ${intent}`);
        })
        .catch((err: unknown) => {
          /* scripted fire stays */
          seatFailed(err);
        })
        .finally(() => {
          pilotBusy = false;
        });
    }
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
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
    audio?.close();
    root.classList.remove('playing');
  };
  back.addEventListener('click', () => {
    leave();
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
