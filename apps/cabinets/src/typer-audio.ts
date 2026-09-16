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
export function createTyperAudio(ctx: AudioContext, base: string, seed: number): TyperAudio {
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

  const load = (next: Theme) => {
    if (loading === next) return;
    loading = next;
    buffers = [];
    const urls = KEY_FILES.map((file) => `${base}keys/${next}/${file}`);
    void Promise.all(
      urls.map(async (url) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error('no sample');
        return ctx.decodeAudioData(await res.arrayBuffer());
      }),
    )
      .then((decoded) => {
        if (loading !== next) return;
        buffers = decoded;
      })
      .catch(() => {
        // A missing set is not a silent game: the procedural click stands in.
        if (loading === next) buffers = [];
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
    setBed(BED_MODES[music].level * DUCK);
  };

  /** The level the bed should sit at right now: held down, or its own. */
  const bedLevel = () => BED_MODES[music].level * (voiceDuck || duckUntil > 0 ? DUCK : 1);

  const setBed = (level: number) => {
    const t = now();
    try {
      bed.gain.cancelScheduledValues(t);
      bed.gain.setValueAtTime(Math.max(0.0001, bed.gain.value), t);
      bed.gain.linearRampToValueAtTime(Math.max(0.0001, level), t + 0.12);
    } catch {
      bed.gain.value = level;
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
      muted = next;
      master.gain.value = muted ? 0 : MASTER;
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
      setBed(bedLevel());
    },
    music() {
      return music;
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
    tick(_dt: number, hype: number, hold: boolean) {
      if (muted || ended) return;
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
      const spb = 60 / tempo;
      if (barAt === 0) barAt = now() + 0.08;
      let guard = 0;
      while (barAt < now() + 0.2 && guard < 4) {
        bar(barAt, spb);
        barAt += spb * 4;
        guard += 1;
      }
    },
    setBedDuck(on: boolean) {
      if (voiceDuck === on) return;
      voiceDuck = on;
      if (music === 'off' || ended) return;
      setBed(bedLevel());
    },
    end() {
      ended = true;
      setBed(0);
    },
    close() {
      ended = true;
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
