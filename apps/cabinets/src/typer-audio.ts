// The sound of the cabinet: a keyboard under the player's hands, a synth for
// everything the game does, and a small procedural bed that keeps the tempo.
//
// The keystroke engine follows the one in the LoKey-Typer prototype package
// (`src/lib/audio.ts` there) in shape and imports nothing from it: samples
// decoded once, round-robin across a set's variants, a seeded detune, a
// polyphony cap with oldest-steal, and a procedural click when a sample is
// missing, so the game is never silent. That reference named a path on one
// machine until slice 4C took it out; no file in this tree carries one.
// The five sample sets are dev-op-typer's, copied into public/keys.
//
// G29: one layered sound per event class, each with a transient and a tail
// (Q3.3), none longer than TAIL_CAP except the end chord; the keystroke
// climbs a semitone a clean line to an octave (Q3.4); the bed's tempo
// follows the vibes and holds through a level's last request (Q3.7); the bed
// ducks under the deploy.
//
// The bed has three shapes, and the player picks one on the menu: see
// MUSIC_MODES and BED_MODES below. The tempo still follows the vibes in the
// two that play; what changes is how loud, how fast, and whether a kick is
// laid down at all.

import type { Cue } from './typer-cues';
import { rateFor } from './typer-cues';

/** The five keyboards, as the folders under public/keys are named. */
export const THEMES = ['alpscream', 'mechanical', 'membrane', 'softtouch', 'topre'] as const;
export type Theme = (typeof THEMES)[number];

/** What the menu calls them. Words, never a model of keyboard nobody has heard of. */
export const THEME_WORDS: Record<Theme, string> = {
  alpscream: 'alps cream',
  mechanical: 'mechanical',
  membrane: 'membrane',
  softtouch: 'soft touch',
  topre: 'topre',
};

/** Eight variants a set, as the prototype names them. */
export const KEY_FILES = [
  'key_01.wav',
  'key_02.wav',
  'key_03.wav',
  'key_04.wav',
  'key_05.wav',
  'key_06.wav',
  'key_07.wav',
  'key_08.wav',
] as const;

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

// The feel budget in numbers. High, not extreme (Q3.1). // Director
/** The bed's own tempo, in beats a minute, at one times vibes. The `on` mode. */
export const BED_BPM = 96;
/** What each step of vibes above one does to the tempo. The `on` mode. */
export const BED_HYPE = 0.06;
/** How far a keystroke wanders from the sample's own pitch, either way. */
export const DETUNE = 0.03;
/** Sounds at once before the oldest is taken. */
export const POLYPHONY = 6;
/** A mistyped character: the same keyboard, quieter and lower. */
export const ERROR_GAIN = 0.6;
export const ERROR_RATE = 0.7;
/** The bed under the deploy: six decibels down, and back. */
export const DUCK = 0.5;
export const DUCK_S = 0.7;
/** Everything the master hears. */
export const MASTER = 0.9;
/** The bed sits under the game, not beside it. The `on` mode. */
export const BED_LEVEL = 0.16;
/** No sound runs longer than this, the end chord excepted. */
export const TAIL_CAP = 0.7;
/** The end chord, the one sound allowed past the cap. */
export const END_TAIL = 1.6;
/** How near a beat a message has to land to bring the kick with it. */
export const BEAT_WINDOW = 0.08;

/**
 * The music setting, in three words. The bed must never read as a countdown:
 * a four-beat kick under a draining context bar is a clock, and Vibe Typer's
 * tension is a reward, not a punishment (G25). So the default is `soft` — no
 * kick at all, a quiet tick, a slower base and half the climb — and the pulse
 * that shipped is kept for the players who ask for it by name.
 * `off` leaves the bed out entirely; every cue still plays, and muting the
 * sound still silences everything, because `music` only shapes the bed.
 */
export const MUSIC_MODES = ['on', 'soft', 'off'] as const;
export type MusicMode = (typeof MUSIC_MODES)[number];

export function isMusicMode(value: unknown): value is MusicMode {
  return typeof value === 'string' && (MUSIC_MODES as readonly string[]).includes(value);
}

/** The bed a player who has set nothing hears. // Director */
export const DEFAULT_MUSIC: MusicMode = 'soft';

/**
 * The recorded beds, one a corpus stack, as the files under
 * `public/vibe/tracks` are named. This is Ghost's `TRACK_KEYS` discipline in
 * the typing cabinet: the list is the contract, the pack gate requires a file
 * for every key in it, and a key whose file is missing at run time falls back
 * to the procedural bed rather than leaving the cabinet silent.
 *
 * It is exactly `STACKS` in `@mcp-arcade-cabinets/vibe-typer` — the six corpus
 * stacks and integration — and a test holds the two lists together. The names
 * are not duplicated here for a second meaning; they are the same names, and
 * the audio may not import the package.
 */
export const VIBE_TRACK_KEYS = [
  'bash',
  'csharp',
  'java',
  'javascript',
  'python',
  'sql',
  'integration',
] as const;
export type VibeTrackKey = (typeof VIBE_TRACK_KEYS)[number];

export function isVibeTrackKey(value: unknown): value is VibeTrackKey {
  return typeof value === 'string' && (VIBE_TRACK_KEYS as readonly string[]).includes(value);
}

/**
 * The one mode that plays a recorded bed. `soft` keeps the procedural hat it
 * has had since slice 3 and never reaches for a file: the modes are a choice
 * between a pulse and a tick, and handing `soft` a full arrangement would make
 * it the loud mode under a quiet name. // Director
 */
export const BED_TRACK_MODE: MusicMode = 'on';

/**
 * A recorded bed's own gain. The recordings are media elements and do not go
 * through the graph at all, so they cannot sit on the bed bus at `BED_LEVEL`'s
 * 0.16; this is an element volume and the two numbers are not comparable.
 * Half volume on a bed mastered to about -13.5 LUFS is roughly where 0.16 puts
 * the procedural bar under the keystroke, which is the whole intent: the bed
 * sits under the game, not beside it. // Director
 */
export const BED_TRACK_LEVEL = 0.5;

/**
 * The tempo the beds were asked for, so a rate of one is the bed as recorded
 * and the tempo rule scales from a known base. Not a number of its own: it is
 * `on`'s own tempo, because the recorded bed replaces that mode's bar and has
 * to climb on the same scale. Moving `BED_BPM` without re-generating the beds
 * would put a rate of one somewhere other than as recorded.
 */
export const BED_TRACK_BPM = BED_BPM;

/**
 * Seconds a bed takes to cross — into the procedural bed when a stack's file
 * arrives, out of one recorded bed into another when the stack changes, and
 * back to the procedural bed when there is no file for the new stack. Not a
 * number of its own either: it is Ghost's `BED_FADE_S`, because these are
 * Ghost's beds from the same model at the same length, and two cabinets whose
 * music gives way at different speeds would read as two arcades.
 */
export const BED_CROSS_S = 0.8;

/**
 * Enough of an `HTMLAudioElement` for a recorded bed. The engine is handed a
 * maker rather than calling `new Audio()` itself, so a test can watch what it
 * asked for and a run with no media element at all (jsdom, a headless play
 * through) simply gets none and keeps the procedural bed.
 */
export interface TrackBed {
  loop: boolean;
  volume: number;
  /** 1 is as recorded; the vibes push it up inside the tempo rule's bounds. */
  playbackRate: number;
  /** Set where the browser has it, so a faster bed keeps its key. */
  preservesPitch?: boolean;
  src: string;
  currentTime: number;
  play(): Promise<void> | void;
  pause(): void;
  addEventListener(type: string, fn: () => void, options?: { once?: boolean }): void;
}

/**
 * How the engine gets one bed. `null` means this run has no media element and
 * keeps the procedural bed. The maker never sets `src` — the engine does that
 * after its listeners are on, so a file that is already in the cache cannot
 * announce itself before anything is listening.
 */
export type BedMaker = (key: VibeTrackKey, url: string) => TrackBed | null;

/**
 * How long one keyboard's eight samples may take before the engine stops
 * waiting on them. Ghost puts a deadline on every fetch it makes and this was
 * the one path with none: a hung request and a missing folder both ended as
 * the procedural click, and neither said anything, so a player whose keyboard
 * had gone quiet could not tell a slow machine from an absent one.
 */
export const KEYS_TIMEOUT_MS = 8000;

/**
 * What the engine says about its own files, for the chrome to put a word to.
 * `ok` is the set playing as recorded; `missing` is a folder that is not
 * there; `timeout` is one that never answered inside KEYS_TIMEOUT_MS.
 */
export type SampleState = 'ok' | 'missing' | 'timeout';

/** The default maker: a real element where the browser has one, else nothing. */
export function domBedMaker(): TrackBed | null {
  if (typeof Audio === 'undefined') return null;
  const el = new Audio();
  el.preload = 'auto';
  return el as unknown as TrackBed;
}

/** One mode's bed: how loud, how fast, how far the vibes move it, and its voices. */
export interface BedMode {
  /** The bed bus's own gain. */
  level: number;
  /** Beats a minute at one times vibes. */
  bpm: number;
  /** What each step of vibes above one does to the tempo. */
  hype: number;
  /** Whether the bar lays down its kick and bass at all. */
  kick: boolean;
  /** Share of the hat's own gain this mode plays it at. */
  hat: number;
  /** Where the hat is filtered: high is a hiss, lower is a tick. */
  hatHz: number;
}

/**
 * The three beds. `on` is exactly what shipped in v0.9.0, which is what
 * `BED_LEVEL`, `BED_BPM` and `BED_HYPE` now describe. // Director
 */
export const BED_MODES: Record<MusicMode, BedMode> = {
  on: { level: BED_LEVEL, bpm: BED_BPM, hype: BED_HYPE, kick: true, hat: 1, hatHz: 6000 },
  soft: { level: 0.05, bpm: 80, hype: 0.03, kick: false, hat: 0.75, hatHz: 4200 },
  off: { level: 0, bpm: BED_BPM, hype: 0, kick: false, hat: 0, hatHz: 6000 },
};

export interface TyperAudio {
  /** The first gesture: browsers will not start a context without one. */
  resume(): void;
  setMuted(muted: boolean): void;
  setTheme(theme: Theme): void;
  /** The bed's shape. Takes effect on the next bar; the gain moves at once. */
  setMusic(mode: MusicMode): void;
  /** Which bed is playing. For the tests; nothing on the field reads it. */
  music(): MusicMode;
  /**
   * The stack this level is written in. Idempotent: a level that follows
   * another in the same stack changes nothing, and the bed plays on. Asking
   * for a stack is what fetches its bed, on the same lazy rule the piece tiles
   * follow, so a cabinet that plays one story level never fetches the other
   * six stacks' music.
   */
  setStack(stack: string): void;
  /** Which recorded bed has the level, or null when the procedural bed does. */
  track(): VibeTrackKey | null;
  /** One cue, now. */
  play(cue: Cue): void;
  /** The bed. `hold` keeps the tempo where it climbed to (a level's last request). */
  tick(dt: number, hype: number, hold: boolean): void;
  /**
   * Hold the bed down while a spoken take plays, and let it back up when the
   * take ends (slice 4C). The keystroke samples are untouched: the player is
   * typing under the voice and the keystroke is the score's voice (G29). It
   * is the same depth the cue duck uses, and `music: off` has no bed to hold
   * down, so it does nothing there.
   */
  setBedDuck(on: boolean): void;
  /**
   * The tab went away, or came back. A backgrounded tab stops
   * `requestAnimationFrame`, so `tick` stops and with it the crossfade — but
   * the recorded beds are media elements outside the graph and play on, so a
   * stack change caught mid-cross froze with two beds audible at partial
   * volume until the tab returned: music with no game. Hidden, the cross is
   * settled where it was headed and every bed is paused; back, the bed that
   * holds the level starts again from where it stopped.
   */
  setHidden(hidden: boolean): void;
  /** The run is over: the bed leaves. */
  end(): void;
  close(): void;
}

/** mulberry32, the same shape the package seeds its draws with. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Voice {
  stopAt: number;
  stop: () => void;
}

/** Notes of a small stinger: offset in semitones from the root, and when. */
interface Note {
  at: number;
  semis: number;
  dur: number;
  gain: number;
  type: OscillatorType;
  /** Where the note slides to, in semitones, if it slides. */
  to?: number;
}

const ROOT = 220;

function hz(semis: number): number {
  return ROOT * Math.pow(2, semis / 12);
}

function nameSeed(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Build the engine over a context. `base` is where the sample folders live
 * (`import.meta.env.BASE_URL` in the app, a plain path in a test).
 */
export function createTyperAudio(
  ctx: AudioContext,
  base: string,
  seed: number,
  makeBed: BedMaker = domBedMaker,
  /** Told how the keyboard's own samples ended, so the chrome can say so. */
  onSamples?: (state: SampleState) => void,
): TyperAudio {
  const rng = seeded(seed);
  const master = ctx.createGain();
  master.gain.value = MASTER;
  master.connect(ctx.destination);
  const sfx = ctx.createGain();
  sfx.gain.value = 1;
  sfx.connect(master);
  const bed = ctx.createGain();
  bed.gain.value = BED_MODES[DEFAULT_MUSIC].level;
  bed.connect(master);

  let muted = false;
  let music: MusicMode = DEFAULT_MUSIC;
  let theme: Theme = 'mechanical';
  let buffers: AudioBuffer[] = [];
  let loading = '';
  let variant = 0;
  let voices: Voice[] = [];
  let noiseBuffer: AudioBuffer | null = null;
  let duckUntil = 0;
  /** True while a spoken take is playing. Outlives the cue duck's timer. */
  let voiceDuck = false;
  // The bed's clock: where the next bar starts, and the beats already put down.
  let barAt = 0;
  let tempo = BED_MODES[DEFAULT_MUSIC].bpm;
  let beats: number[] = [];
  let ended = false;
  /** True while the tab is away: no frames are coming, so nothing may drift. */
  let hidden = false;
  // The recorded beds: the ones that loaded, the ones that asked, the stack
  // the level is in, and which bed currently has it. `playing` is null until a
  // stack's file is both asked for and ready, which is why a Pages build with
  // no `vibe/tracks/` never notices — the procedural bed simply keeps the bar.
  const tracks = new Map<VibeTrackKey, TrackBed>();
  const asked = new Set<VibeTrackKey>();
  let stack: VibeTrackKey | null = null;
  let playing: VibeTrackKey | null = null;

  const now = () => ctx.currentTime;

  const keep = (voice: Voice) => {
    const t = now();
    voices = voices.filter((v) => v.stopAt > t);
    while (voices.length >= POLYPHONY) {
      const oldest = voices.shift();
      oldest?.stop();
    }
    voices.push(voice);
  };

  const noise = (): AudioBuffer => {
    if (noiseBuffer) return noiseBuffer;
    const frames = Math.floor(ctx.sampleRate * 0.4);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = rng() * 2 - 1;
    noiseBuffer = buffer;
    return buffer;
  };

  /** The transient every sound opens with: a short filtered burst. */
  const transient = (at: number, gain: number, cutoff: number, dur = 0.05) => {
    const src = ctx.createBufferSource();
    src.buffer = noise();
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = cutoff;
    band.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(band);
    band.connect(g);
    g.connect(sfx);
    src.start(at);
    src.stop(at + dur);
    keep({ stopAt: at + dur, stop: () => stopQuietly(src) });
  };

  const stopQuietly = (node: AudioScheduledSourceNode) => {
    try {
      node.stop();
    } catch {
      /* already stopped: nothing to do */
    }
  };

  /** The tail: a note with an attack and a decay, sliding where it must. */
  const note = (at: number, n: Note) => {
    const osc = ctx.createOscillator();
    osc.type = n.type;
    const start = at + n.at;
    const stop = start + n.dur;
    osc.frequency.setValueAtTime(hz(n.semis), start);
    if (n.to !== undefined) osc.frequency.exponentialRampToValueAtTime(hz(n.to), stop);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, n.gain), start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, stop);
    osc.connect(g);
    g.connect(sfx);
    osc.start(start);
    osc.stop(stop);
    keep({ stopAt: stop, stop: () => stopQuietly(osc) });
  };

  const stinger = (notes: Note[], cutoff: number, punch = 0.25) => {
    const at = now();
    transient(at, punch, cutoff);
    for (const n of notes) note(at, n);
  };

  /** The set in flight, so a theme change and `close()` both drop it. */
  let keysCtl: AbortController | null = null;
  const load = (next: Theme) => {
    if (loading === next) return;
    loading = next;
    buffers = [];
    keysCtl?.abort();
    const ctl = new AbortController();
    keysCtl = ctl;
    const signal = AbortSignal.any([ctl.signal, AbortSignal.timeout(KEYS_TIMEOUT_MS)]);
    const urls = KEY_FILES.map((file) => `${base}keys/${next}/${file}`);
    void Promise.all(
      urls.map(async (url) => {
        const res = await fetch(url, { signal });
        if (!res.ok) throw new Error('no sample');
        return ctx.decodeAudioData(await res.arrayBuffer());
      }),
    )
      .then((decoded) => {
        if (loading !== next) return;
        buffers = decoded;
        onSamples?.('ok');
      })
      .catch((err: unknown) => {
        // A missing set is not a silent game: the procedural click stands in.
        // It is no longer a silent one either — the cabinet's product is the
        // keyboard under the player's hands, so the chrome gets a word for it,
        // and a hang is reported as a hang rather than as an absence.
        if (loading !== next) return;
        buffers = [];
        // A theme change or a closed cabinet dropped this set on purpose.
        if (ctl.signal.aborted) return;
        const name = err instanceof Error ? err.name : '';
        onSamples?.(name === 'TimeoutError' ? 'timeout' : 'missing');
      });
  };

  /** A keystroke: the set's next variant, detuned, at the streak's pitch. */
  const keystroke = (rate: number, gain: number) => {
    const at = now();
    const wobble = 1 + (rng() * 2 - 1) * DETUNE;
    const buffer = buffers.length > 0 ? buffers[variant % buffers.length] : undefined;
    variant += 1;
    const g = ctx.createGain();
    g.gain.value = gain;
    g.connect(sfx);
    if (buffer) {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = rate * wobble;
      src.connect(g);
      src.start(at);
      keep({ stopAt: at + buffer.duration / Math.max(0.1, rate), stop: () => stopQuietly(src) });
      return;
    }
    // The fallback: a click and a short decaying sine, so a key always speaks.
    transient(at, gain * 0.5, 2200 * rate, 0.03);
    note(at, { at: 0, semis: 24, dur: 0.07, gain: gain * 0.3, type: 'triangle' });
  };

  const duck = () => {
    // With no bed there is nothing to duck, and nothing to bring back.
    if (music === 'off') return;
    duckUntil = now() + DUCK_S;
    // `bedLevel` already reads the duck off `duckUntil`, and it is what knows
    // that a recording holding the level leaves this bus at zero.
    setBed(bedLevel());
  };

  /** True while anything is holding the bed down: a cue, or a spoken take. */
  const held = () => voiceDuck || duckUntil > 0;

  /**
   * The level the procedural bed should sit at right now: held down, or its
   * own — and silent while a recorded bed has the level, because the two are
   * one bed with two sources and never play together.
   */
  const bedLevel = () => (playing !== null ? 0 : BED_MODES[music].level * (held() ? DUCK : 1));

  const setBed = (level: number, secs = 0.12) => {
    const t = now();
    try {
      bed.gain.cancelScheduledValues(t);
      bed.gain.setValueAtTime(Math.max(0.0001, bed.gain.value), t);
      bed.gain.linearRampToValueAtTime(Math.max(0.0001, level), t + secs);
    } catch {
      bed.gain.value = level;
    }
  };

  // ——— the recorded beds ——————————————————————————————————————————————————

  /** A recorded bed's level: its own, or held down by the same DUCK. */
  const trackLevel = () => (muted ? 0 : BED_TRACK_LEVEL * (held() ? DUCK : 1));

  /**
   * Ask for one stack's bed, once. A file that never arrives is never asked
   * for again and never waited on: the procedural bed is already playing.
   *
   * The ready event is `canplay` — the element can begin — and not
   * `canplaythrough`, which is the whole file buffered. The beds are 115-125 s
   * pieces of about 1.9 MB since the music pass, so `canplaythrough` meant a
   * stack could be typed through before its bed was ever offered. Nothing
   * times a bed out: one that is still arriving is still arriving, and it
   * takes the level whenever it gets here.
   */
  const askTrack = (key: VibeTrackKey) => {
    if (asked.has(key)) return;
    asked.add(key);
    const el = makeBed(key, `${base}vibe/tracks/${key}.mp3`);
    if (!el) return;
    el.loop = true;
    el.volume = 0;
    el.preservesPitch = true;
    el.addEventListener(
      'canplay',
      () => {
        tracks.set(key, el);
        pickTrack();
      },
      { once: true },
    );
    // A broken or absent file drops out of the run silently. Nothing yells.
    el.addEventListener('error', () => tracks.delete(key), { once: true });
    el.src = `${base}vibe/tracks/${key}.mp3`;
  };

  /**
   * A bed that will not start hands the level straight back. It is dropped
   * from `tracks` rather than kept and retried: an element the browser will
   * not play is worth exactly what a file that never loaded is worth, and
   * leaving it in would have `pickTrack` choose it again on the next level in
   * the same stack, fading the procedural bed out each time for nothing.
   */
  const dropTrack = (key: VibeTrackKey) => {
    const el = tracks.get(key);
    if (el) {
      el.volume = 0;
      try {
        el.pause();
      } catch {
        /* an element that never started has nothing to pause */
      }
    }
    tracks.delete(key);
    // A rejection can land after the stack has already moved on, in which
    // case this bed is not the one holding the level and nothing changes.
    if (playing !== key) return;
    playing = null;
    barAt = 0;
    setBed(bedLevel(), BED_CROSS_S);
  };

  const startTrack = (key: VibeTrackKey) => {
    if (muted) return;
    const el = tracks.get(key);
    if (!el) return;
    try {
      // Autoplay policy does not throw: it REJECTS the promise `play()`
      // returns, which would otherwise be an unhandled rejection at the one
      // moment the procedural bed has already started fading out — a cabinet
      // that goes quiet and a console error to explain it. So the promise is
      // caught, the same way the voice's take element is, and the bed is
      // handed back to the bar. A stub with no promise at all is fine too.
      const started = el.play() as Promise<void> | void;
      if (started && typeof (started as Promise<void>).catch === 'function') {
        void (started as Promise<void>).catch(() => dropTrack(key));
      }
    } catch {
      dropTrack(key);
    }
  };

  /**
   * Every recorded bed down and stopped, now rather than over the crossfade.
   * A mute is the one thing that may not take eight tenths of a second, and
   * the graph's own mute cannot reach a media element: the bed bus runs
   * through `master`, the recordings do not.
   */
  const stopTracks = () => {
    for (const el of tracks.values()) {
      el.volume = 0;
      try {
        el.pause();
      } catch {
        /* an element with nothing in it has nothing to pause */
      }
    }
  };

  /**
   * Decide which source has the level. The recorded bed takes it when the
   * mode asks for one, the run is live and this stack's file is ready; the
   * procedural bed takes it back in every other case. Either way the two
   * cross over BED_CROSS_S, so a stack change is a color change and not a
   * hole.
   */
  const pickTrack = () => {
    const want =
      music === BED_TRACK_MODE && !ended && stack !== null && tracks.has(stack) ? stack : null;
    if (want === playing) return;
    playing = want;
    if (want !== null) {
      tracks.get(want)!.playbackRate = tempo / BED_TRACK_BPM;
      // The bar's clock is dropped while a recording has the level, so that
      // handing it back lays the next bar down from now rather than catching
      // up on every bar the recording played over. It is set before the start
      // rather than after, because a start that fails hands the level back
      // inside this call.
      barAt = 0;
      startTrack(want);
    }
    // The bed the stack change left behind is not stopped here: it fades out
    // over the same crossfade and is paused when it gets there, so the two
    // beds cross rather than one cutting the other off.
    setBed(bedLevel(), BED_CROSS_S);
  };

  /**
   * The crossfade, finished now rather than over the next frames: the bed that
   * holds the level is at its own volume and every other is at zero. What
   * `stepTracks` would have reached if the frames had kept coming.
   */
  const settleTracks = () => {
    const want = trackLevel();
    for (const [key, el] of tracks) el.volume = key === playing ? want : 0;
  };

  /** One frame of the crossfade: every bed moves toward where it belongs. */
  const stepTracks = (dt: number) => {
    if (tracks.size === 0) return;
    // A whole cross is BED_TRACK_LEVEL of volume in BED_CROSS_S seconds, so
    // the step is scaled by the level rather than being a raw fraction of one:
    // the beds sit at half volume, and a raw fraction would cross them in half
    // the time the procedural bed's own ramp takes.
    const step = (BED_TRACK_LEVEL * Math.max(0, dt)) / BED_CROSS_S;
    const want = trackLevel();
    for (const [key, el] of tracks) {
      const to = key === playing ? want : 0;
      const at = el.volume;
      if (at === to) continue;
      const next = at < to ? Math.min(to, at + step) : Math.max(to, at - step);
      el.volume = next;
      // A bed that has just finished leaving stops, and keeps its place: the
      // next level in that stack picks the loop up where it left off rather
      // than opening on the same bar every time.
      if (next === 0 && key !== playing) {
        try {
          el.pause();
        } catch {
          /* nothing to pause */
        }
      }
    }
  };

  /**
   * One bar of four beats: a soft kick, a two-note bass, a hat off the beat.
   * The mode decides whether the kick is laid down at all — it is the voice
   * that reads as a countdown — and how loud and how filtered the hat is.
   */
  const bar = (at: number, spb: number) => {
    const mode = BED_MODES[music];
    for (let i = 0; i < 4; i++) {
      const beatAt = at + i * spb;
      beats.push(beatAt);
      if (mode.kick) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        const g = ctx.createGain();
        osc.frequency.setValueAtTime(hz(i === 0 ? -12 : i === 2 ? -5 : -10), beatAt);
        g.gain.setValueAtTime(0.0001, beatAt);
        g.gain.exponentialRampToValueAtTime(i % 2 === 0 ? 0.5 : 0.25, beatAt + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, beatAt + spb * 0.8);
        osc.connect(g);
        g.connect(bed);
        osc.start(beatAt);
        osc.stop(beatAt + spb * 0.85);
      }
      const hat = ctx.createBufferSource();
      hat.buffer = noise();
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = mode.hatHz;
      const hg = ctx.createGain();
      const hatAt = beatAt + spb * 0.5;
      hg.gain.setValueAtTime(0.16 * mode.hat, hatAt);
      hg.gain.exponentialRampToValueAtTime(0.0001, hatAt + 0.05);
      hat.connect(hp);
      hp.connect(hg);
      hg.connect(bed);
      hat.start(hatAt);
      hat.stop(hatAt + 0.06);
    }
    if (beats.length > 16) beats = beats.slice(-16);
  };

  const onBeat = (): boolean => {
    const t = now();
    return beats.some((b) => Math.abs(b - t) < BEAT_WINDOW);
  };

  const kick = () => {
    const at = now();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(hz(-12), at);
    osc.frequency.exponentialRampToValueAtTime(hz(-24), at + 0.16);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
    osc.connect(g);
    g.connect(bed);
    osc.start(at);
    osc.stop(at + 0.2);
  };

  load(theme);

  return {
    resume() {
      if (ctx.state === 'suspended') void ctx.resume();
    },
    setMuted(next: boolean) {
      if (next === muted) return;
      muted = next;
      master.gain.value = muted ? 0 : MASTER;
      // `master` cannot reach a media element, so the recordings are muted by
      // hand — and at once, because a mute that took a crossfade would not be
      // a mute. Coming back, the bed that has the level starts again.
      if (muted) stopTracks();
      else if (playing !== null) startTrack(playing);
    },
    setTheme(next: Theme) {
      if (next === theme && loading === next) return;
      theme = next;
      load(next);
    },
    setMusic(next: MusicMode) {
      if (next === music) return;
      music = next;
      // The bar already scheduled plays out; the next one is the new mode's.
      // The tempo scale changed with it, so the climb starts again from base.
      tempo = BED_MODES[next].bpm;
      // Only one mode plays a recording, so a change either hands the level to
      // the stack's bed or takes it back. `pickTrack` writes the bus itself
      // when it does; when nothing changes hands, this does.
      const before = playing;
      pickTrack();
      if (playing === before) setBed(bedLevel());
    },
    music() {
      return music;
    },
    setStack(next: string) {
      if (!isVibeTrackKey(next) || next === stack) return;
      stack = next;
      askTrack(next);
      pickTrack();
    },
    track() {
      return playing;
    },
    play(cue: Cue) {
      if (muted) return;
      switch (cue.name) {
        case 'key':
          keystroke(rateFor(cue.pitch), 0.9);
          return;
        case 'keybad':
          keystroke(ERROR_RATE, ERROR_GAIN);
          note(now(), { at: 0, semis: -17, dur: 0.16, gain: 0.18, type: 'triangle' });
          return;
        case 'sent':
          // A line goes out: a rising whoosh, gone inside a quarter second.
          stinger([{ at: 0, semis: 4, to: 19, dur: 0.22, gain: 0.16, type: 'sine' }], 3200, 0.14);
          return;
        case 'hmm':
          // The agent's own two notes. Soft, and down, because nothing yells.
          stinger(
            [
              { at: 0, semis: 3, dur: 0.16, gain: 0.16, type: 'sine' },
              { at: 0.17, semis: -1, dur: 0.28, gain: 0.14, type: 'sine' },
            ],
            700,
            0.1,
          );
          return;
        case 'ping':
          stinger([{ at: 0, semis: 19, dur: 0.18, gain: 0.14, type: 'sine' }], 2600, 0.12);
          if (onBeat()) kick();
          return;
        case 'nag':
          // The user again, checking in: the ping, and a fourth below it a
          // beat later. Down, not up, so it reads as a question, not an ask.
          stinger(
            [
              { at: 0, semis: 19, dur: 0.16, gain: 0.13, type: 'sine' },
              { at: 0.18, semis: 14, dur: 0.24, gain: 0.11, type: 'sine' },
            ],
            2400,
            0.1,
          );
          return;
        case 'blip':
          stinger([{ at: 0, semis: 7, dur: 0.16, gain: 0.12, type: 'triangle' }], 1200, 0.08);
          return;
        case 'pop': {
          // The piece lands: the bigger the piece, the lower and longer it sits.
          const weight = Math.min(1, cue.size / 60);
          stinger(
            [
              {
                at: 0,
                semis: 24 - 10 * weight,
                to: 12 - 6 * weight,
                dur: Math.min(TAIL_CAP, 0.18 + 0.2 * weight),
                gain: 0.18 + 0.08 * weight,
                type: 'triangle',
              },
            ],
            1800,
            0.18,
          );
          return;
        }
        case 'deploy':
          duck();
          stinger(
            [
              { at: 0, semis: 0, dur: 0.6, gain: 0.2, type: 'triangle' },
              { at: 0.04, semis: 7, dur: 0.56, gain: 0.16, type: 'triangle' },
              { at: 0.08, semis: 12, dur: 0.52, gain: 0.14, type: 'sine' },
              { at: 0.12, semis: 19, dur: 0.48, gain: 0.1, type: 'sine' },
            ],
            2400,
            0.3,
          );
          return;
        case 'grazed':
          // The same deploy, from further down the hall: the bar was nearly out.
          duck();
          stinger(
            [
              { at: 0, semis: -12, dur: 0.6, gain: 0.18, type: 'triangle' },
              { at: 0.05, semis: -5, dur: 0.55, gain: 0.13, type: 'triangle' },
              { at: 0.1, semis: 3, dur: 0.5, gain: 0.1, type: 'sine' },
            ],
            900,
            0.22,
          );
          return;
        case 'compaction':
          stinger([{ at: 0, semis: 14, to: -8, dur: 0.5, gain: 0.18, type: 'sawtooth' }], 800, 0.2);
          return;
        case 'milestone': {
          const r = seeded(nameSeed(cue.toast));
          const lift = Math.floor(r() * 5);
          stinger(
            [
              { at: 0, semis: 0 + lift, dur: 0.18, gain: 0.16, type: 'square' },
              { at: 0.1, semis: 7 + lift, dur: 0.18, gain: 0.14, type: 'square' },
              { at: 0.2, semis: 12 + lift, dur: 0.34, gain: 0.14, type: 'triangle' },
            ],
            2000,
            0.18,
          );
          return;
        }
        case 'shimmerIn':
          stinger([{ at: 0, semis: 12, to: 26, dur: 0.3, gain: 0.1, type: 'sine' }], 5200, 0.08);
          return;
        case 'shimmerOut':
          stinger([{ at: 0, semis: 26, to: 12, dur: 0.24, gain: 0.08, type: 'sine' }], 4200, 0.06);
          return;
        case 'creep':
          // The user's "oh also": the ping, and a second note climbing after it.
          stinger(
            [
              { at: 0, semis: 19, dur: 0.14, gain: 0.13, type: 'sine' },
              { at: 0.14, semis: 23, dur: 0.22, gain: 0.12, type: 'sine' },
            ],
            2600,
            0.12,
          );
          return;
        case 'syncIn':
          stinger(
            [
              { at: 0, semis: 12, dur: 0.14, gain: 0.11, type: 'sine' },
              { at: 0.16, semis: 12, dur: 0.18, gain: 0.11, type: 'sine' },
            ],
            1500,
            0.1,
          );
          return;
        case 'syncOut':
          stinger([{ at: 0, semis: 10, dur: 0.2, gain: 0.1, type: 'sine' }], 1400, 0.08);
          return;
        case 'endShipped':
          // The one sound past the cap: the level's own chord.
          stinger(
            [
              { at: 0, semis: 0, dur: END_TAIL, gain: 0.18, type: 'triangle' },
              { at: 0.06, semis: 7, dur: END_TAIL - 0.1, gain: 0.14, type: 'triangle' },
              { at: 0.12, semis: 16, dur: END_TAIL - 0.2, gain: 0.12, type: 'sine' },
              { at: 0.18, semis: 24, dur: END_TAIL - 0.3, gain: 0.08, type: 'sine' },
            ],
            2200,
            0.28,
          );
          return;
        case 'endContext':
          stinger(
            [{ at: 0, semis: 7, to: -5, dur: TAIL_CAP, gain: 0.14, type: 'sine' }],
            600,
            0.14,
          );
          return;
        default: {
          const never: never = cue.name;
          throw new Error(`no sound for ${String(never)}`);
        }
      }
    },
    tick(dt: number, hype: number, hold: boolean) {
      // A frame that arrives while the tab is away (a test's own clock, a
      // stray timer) may not move a bed that is paused where it stands.
      if (muted || ended || hidden) return;
      // `off` schedules nothing at all. The cues are untouched by this.
      if (music === 'off') return;
      const mode = BED_MODES[music];
      const want = mode.bpm * (1 + mode.hype * (Math.max(1, hype) - 1));
      // Through a level's last request the tempo holds where it climbed to.
      tempo = hold ? Math.max(tempo, want) : want;
      if (duckUntil > 0 && now() >= duckUntil) {
        duckUntil = 0;
        setBed(bedLevel());
      }
      stepTracks(dt);
      if (playing !== null) {
        // The tempo rule, on the recording: the same number the bar's own
        // tempo is scaled by, so the two sources climb together. At `on`'s
        // 96 bpm and its 0.06 a step, five times vibes is 119.04 bpm — a rate
        // of 1.24 — and the pitch is kept where the browser will keep it.
        tracks.get(playing)!.playbackRate = tempo / BED_TRACK_BPM;
        // The recording has the level: no bar is laid down under it, and the
        // beats a message could land on go with it, exactly as in `off`.
        return;
      }
      const spb = 60 / tempo;
      if (barAt === 0) barAt = now() + 0.08;
      let guard = 0;
      while (barAt < now() + 0.2 && guard < 4) {
        bar(barAt, spb);
        barAt += spb * 4;
        guard += 1;
      }
    },
    setHidden(next: boolean) {
      if (next === hidden) return;
      hidden = next;
      if (next) {
        // The cross is finished where it was headed before everything stops,
        // so the tab comes back to one bed at its own level and not to two
        // frozen half way. Then every recording is paused: the graph's own
        // bar stops with the frames, but a media element does not.
        settleTracks();
        stopTracks();
        return;
      }
      if (muted || ended || playing === null) return;
      settleTracks();
      startTrack(playing);
    },
    setBedDuck(on: boolean) {
      if (voiceDuck === on) return;
      voiceDuck = on;
      if (music === 'off' || ended) return;
      setBed(bedLevel());
    },
    end() {
      ended = true;
      playing = null;
      stopTracks();
      setBed(0);
    },
    close() {
      ended = true;
      playing = null;
      // Nothing the cabinet asked for outlives it: a sample set still in the
      // air is dropped here rather than decoding into a closed context.
      keysCtl?.abort();
      stopTracks();
      for (const v of voices) v.stop();
      voices = [];
      try {
        void ctx.close();
      } catch {
        /* a context the test stubbed: nothing to close */
      }
    },
  };
}
