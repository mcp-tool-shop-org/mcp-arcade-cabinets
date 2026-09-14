// Sound for Ghost on the Menu: effects and a procedural chiptune soundtrack,
// all synthesized, no assets. This module never imports the sim; the shell
// feeds it events and a clock. Grounding: hit stop plus a coherent hit sound
// carry impact (W5); audio raises satisfaction cheaply on rectangles (A4);
// the catch is a categorically different sound family, not a louder pop
// (W7). Everything here is pure data until `attach` is given an AudioContext,
// so the score can be tested in node.

export type SfxName =
  | 'fire'
  | 'pop'
  | 'catch'
  | 'drop'
  | 'fog'
  | 'lamp'
  | 'phase'
  | 'end'
  | 'wave'
  | 'bosshit'
  | 'bossdown'
  | 'dive'
  | 'burst';

/** One synthesized note: a simple oscillator with an envelope. */
export interface Note {
  /** Seconds from the cue. */
  at: number;
  freq: number;
  /** Seconds. */
  dur: number;
  wave: OscillatorType;
  /** 0..1 */
  gain: number;
}

/** The soundtrack pattern: a scale, a tempo, a bass loop, a lead motif per wave kind. */
export interface MusicPattern {
  /** Semitone offsets from the root. */
  scale: number[];
  rootHz: number;
  bpm: number;
  /** Scale degrees per beat for the bass, looped. -1 is a rest. */
  bass: number[];
  /** Scale degrees per half beat for the lead, per wave kind, looped. -1 is a rest. */
  lead: Record<string, number[]>;
}

export const DEFAULT_MUSIC: MusicPattern = {
  scale: [0, 2, 3, 5, 7, 8, 10], // natural minor
  rootHz: 110,
  bpm: 112,
  bass: [0, 0, 4, 4, 5, 5, 3, 3],
  lead: {
    inspect: [0, -1, 4, -1, 7, -1, 4, -1, 2, -1, 4, -1, 0, -1, -1, -1],
    poison: [7, -1, 6, 7, -1, 4, -1, 2, 3, -1, 2, 0, -1, -1, 4, -1],
    rug: [0, 2, 3, 2, 0, -1, 3, 5, 4, 3, 2, -1, 0, -1, -1, -1],
    unlisted: [4, -1, 4, -1, 7, 6, 4, -1, 2, -1, 2, -1, 3, 2, 0, -1],
    breather: [0, -1, -1, -1, 4, -1, -1, -1, 3, -1, -1, -1, 2, -1, -1, -1],
  },
};

/** A whole track per wave or boss, so the field changes key with the experiment. */
export const TRACKS: Record<string, MusicPattern> = {
  inspect: DEFAULT_MUSIC,
  poison: {
    scale: [0, 1, 3, 5, 7, 8, 10],
    rootHz: 98,
    bpm: 126,
    bass: [0, 0, 3, 3, 1, 1, 5, 5],
    lead: {
      poison: [7, 6, 7, -1, 3, -1, 0, 1, 3, -1, 5, 3, 0, -1, -1, -1],
    },
  },
  rug: {
    scale: [0, 2, 4, 5, 7, 9, 11],
    rootHz: 123,
    bpm: 100,
    bass: [0, 4, 0, 5, 0, 4, 3, 2],
    lead: {
      rug: [4, 2, 0, 2, 5, 4, 2, -1, 0, -1, 7, 5, 4, -1, -1, -1],
    },
  },
  unlisted: {
    scale: [0, 3, 5, 6, 7, 10],
    rootHz: 87,
    bpm: 138,
    bass: [0, -1, 0, 3, 0, -1, 5, 3],
    lead: {
      unlisted: [6, -1, 5, 3, 0, -1, 7, 6, 5, -1, 3, 0, -1, -1, 6, -1],
    },
  },
  breather: {
    scale: [0, 2, 3, 5, 7],
    rootHz: 110,
    bpm: 88,
    bass: [0, -1, -1, -1, 3, -1, -1, -1],
    lead: {
      breather: [0, -1, -1, -1, 4, -1, -1, -1, 3, -1, -1, -1, 2, -1, -1, -1],
    },
  },
  whisperer: {
    scale: [0, 1, 3, 5, 7, 8, 10],
    rootHz: 82,
    bpm: 118,
    bass: [0, 0, 1, 0, 5, 5, 3, 1],
    lead: {
      whisperer: [7, -1, 8, 7, -1, 3, 1, 0, -1, 5, 3, -1, 0, -1, -1, -1],
    },
  },
  menu: {
    scale: [0, 2, 3, 7, 8],
    rootHz: 146,
    bpm: 96,
    bass: [0, 3, 7, 3, 0, 2, 3, 2],
    lead: {
      menu: [0, 2, 3, 2, 7, 3, 2, 0, -1, 8, 7, 3, 0, -1, -1, -1],
    },
  },
  doorman: {
    scale: [0, 2, 5, 7, 10],
    rootHz: 65,
    bpm: 132,
    bass: [0, 0, 5, 5, 2, 2, 7, 7],
    lead: {
      doorman: [5, -1, 5, 7, 10, 7, 5, -1, 2, 0, 2, -1, 5, -1, -1, -1],
    },
  },
  archivist: {
    scale: [0, 2, 3, 5, 7, 8, 10],
    rootHz: 73,
    bpm: 108,
    bass: [0, 3, 0, 5, 0, 3, 7, 5],
    lead: {
      archivist: [0, -1, 3, 5, 7, -1, 5, 3, 0, 2, 3, -1, 5, -1, -1, -1],
    },
  },
};

/** Recorded beds the cabinet may overlay. Missing files keep the chiptune. */
export const TRACK_KEYS = [
  'inspect',
  'poison',
  'rug',
  'unlisted',
  'breather',
  'whisperer',
  'menu',
  'doorman',
] as const;
export type TrackKey = (typeof TRACK_KEYS)[number];
/**
 * The wave beds a round opens on and rotates through (the seed picks the
 * opening); a boss wave brings its own bed instead.
 */
export const BED_POOL: readonly string[] = ['inspect', 'breather', 'poison', 'rug', 'unlisted'];

/** Enough of an HTMLAudioElement for the recorded overlay. */
export interface MediaBed {
  loop: boolean;
  muted: boolean;
  volume: number;
  currentTime: number;
  /** 1 is as recorded; a burst pushes it up and lets it back down. */
  playbackRate: number;
  /** Set true where the browser has it, so a faster bed keeps its key. */
  preservesPitch?: boolean;
  play(): Promise<void> | void;
  pause(): void;
}

/** Seconds a bed takes to come in or go out. */
export const BED_FADE_S = 0.8;
/**
 * A burst speeds the playing bed up by this much, pitch kept, and ramps
 * there and back over BURST_RAMP_S (the Director's word, 2026-09-11: no
 * burst track, it was too frantic; the normal music, faster).
 */
export const BURST_RATE = 1.15;
export const BURST_RAMP_S = 0.6;
/** Seconds the music takes to leave at the scene. */
export const END_FADE_S = 1.5;
/**
 * Seconds a bed plays before it may give way. ACE-Step loops are about
 * 31–44s; hold one loop, then the wanted wave or boss bed comes in.
 * A wanted change during the hold is remembered and made when it is up.
 */
export const BED_MIN_S = 36;
/** Recorded beds sit here, not at 1, so shots and the catch still read. */
export const BED_LEVEL = 0.32;

export type BedLookup = (key: string) => MediaBed | undefined;

function degreeHz(pattern: MusicPattern, degree: number, octave: number): number {
  const scale = pattern.scale;
  const idx = ((degree % scale.length) + scale.length) % scale.length;
  const oct = Math.floor(degree / scale.length) + octave;
  const semis = scale[idx]! + 12 * oct;
  return pattern.rootHz * Math.pow(2, semis / 12);
}

/** Effects, each a short list of notes. The catch is its own family: a rising chord, not a pop. */
export function sfx(name: SfxName): Note[] {
  switch (name) {
    case 'fire':
      return [{ at: 0, freq: 880, dur: 0.05, wave: 'square', gain: 0.08 }];
    case 'pop':
      return [
        { at: 0, freq: 220, dur: 0.06, wave: 'square', gain: 0.12 },
        { at: 0.03, freq: 140, dur: 0.05, wave: 'square', gain: 0.08 },
      ];
    case 'catch':
      return [
        { at: 0, freq: 330, dur: 0.5, wave: 'triangle', gain: 0.22 },
        { at: 0.08, freq: 415, dur: 0.5, wave: 'triangle', gain: 0.2 },
        { at: 0.16, freq: 494, dur: 0.6, wave: 'triangle', gain: 0.2 },
        { at: 0.24, freq: 659, dur: 0.9, wave: 'sine', gain: 0.18 },
      ];
    case 'drop':
      // A small pickup ding, not the lie-catch chord (W7).
      return [
        { at: 0, freq: 784, dur: 0.08, wave: 'square', gain: 0.1 },
        { at: 0.07, freq: 1046, dur: 0.12, wave: 'triangle', gain: 0.1 },
      ];
    case 'fog':
      return [{ at: 0, freq: 55, dur: 1.2, wave: 'sawtooth', gain: 0.05 }];
    case 'lamp':
      return [
        { at: 0, freq: 196, dur: 0.12, wave: 'square', gain: 0.14 },
        { at: 0.14, freq: 147, dur: 0.25, wave: 'square', gain: 0.12 },
      ];
    case 'phase':
      return [
        { at: 0, freq: 262, dur: 0.1, wave: 'square', gain: 0.1 },
        { at: 0.12, freq: 392, dur: 0.14, wave: 'square', gain: 0.1 },
      ];
    case 'bosshit':
      // A dull thud: the boss is a wall, not a bell.
      return [{ at: 0, freq: 98, dur: 0.07, wave: 'square', gain: 0.1 }];
    case 'bossdown':
      // Falling thirds, longer than a pop, shorter than the catch; a boss is the atom, not a lie.
      return [
        { at: 0, freq: 392, dur: 0.12, wave: 'square', gain: 0.12 },
        { at: 0.12, freq: 311, dur: 0.12, wave: 'square', gain: 0.12 },
        { at: 0.24, freq: 233, dur: 0.3, wave: 'triangle', gain: 0.12 },
      ];
    case 'dive':
      // A falling whistle as a formation breaks and comes down.
      return [
        { at: 0, freq: 1200, dur: 0.08, wave: 'triangle', gain: 0.06 },
        { at: 0.08, freq: 800, dur: 0.1, wave: 'triangle', gain: 0.06 },
        { at: 0.18, freq: 500, dur: 0.12, wave: 'triangle', gain: 0.05 },
      ];
    case 'burst':
      // Parallelism in: stacked rising fifths, not the catch chord (W7).
      return [
        { at: 0, freq: 196, dur: 0.08, wave: 'square', gain: 0.1 },
        { at: 0.05, freq: 294, dur: 0.1, wave: 'square', gain: 0.1 },
        { at: 0.1, freq: 392, dur: 0.16, wave: 'triangle', gain: 0.1 },
      ];
    case 'wave':
      // The wave card: two clean notes, a curtain rising, quieter than the catch.
      return [
        { at: 0, freq: 523, dur: 0.14, wave: 'square', gain: 0.09 },
        { at: 0.16, freq: 784, dur: 0.3, wave: 'triangle', gain: 0.1 },
      ];
    case 'end':
      return [
        { at: 0, freq: 220, dur: 0.6, wave: 'triangle', gain: 0.14 },
        { at: 0.5, freq: 165, dur: 0.8, wave: 'triangle', gain: 0.12 },
        { at: 1.0, freq: 110, dur: 1.4, wave: 'sine', gain: 0.12 },
      ];
  }
}

/**
 * Render one bar of the soundtrack for a wave kind as notes relative to the
 * bar start. Pure: same inputs, same notes.
 */
export function bar(pattern: MusicPattern, waveKind: string, barIndex: number): Note[] {
  const beat = 60 / pattern.bpm;
  const notes: Note[] = [];
  const bassLoop = pattern.bass;
  for (let b = 0; b < 4; b++) {
    const d = bassLoop[(barIndex * 4 + b) % bassLoop.length] ?? -1;
    if (d >= 0) {
      notes.push({
        at: b * beat,
        freq: degreeHz(pattern, d, 0),
        dur: beat * 0.9,
        wave: 'square',
        gain: 0.07,
      });
    }
  }
  const lead = pattern.lead[waveKind] ?? pattern.lead['breather'] ?? [];
  for (let h = 0; h < 8; h++) {
    const d = lead[(barIndex * 8 + h) % Math.max(1, lead.length)] ?? -1;
    if (d >= 0) {
      notes.push({
        at: h * beat * 0.5,
        freq: degreeHz(pattern, d, 2),
        dur: beat * 0.45,
        wave: 'square',
        gain: 0.05,
      });
    }
  }
  return notes;
}

/** Seconds per bar. */
export function barSeconds(pattern: MusicPattern): number {
  return (60 / pattern.bpm) * 4;
}

/** What the shell needs: a thin WebAudio player over the pure score. */
export interface AudioOut {
  play(name: SfxName): void;
  /**
   * Call every frame with the round clock, the bed the wave plays (one per
   * wave; the shell keeps it through breathers), and whether a burst is on.
   */
  tick(t: number, waveKind: string, burst?: boolean): void;
  /** The round ended with a scene: the music leaves over END_FADE_S, wall clock. */
  end(): void;
  /** Seed the opening bed for a round about to start; ignored while a bed plays. */
  seed(seed: number): void;
  setMuted(muted: boolean): void;
  /**
   * Duck live recorded beds while a take plays. Leaves SFX and chiptune
   * oscillator gains alone.
   */
  setBedDuck(on: boolean): void;
  close(): void;
}

interface CtxLike {
  currentTime: number;
  destination: AudioNode;
  createOscillator(): OscillatorNode;
  createGain(): GainNode;
  close?(): Promise<void>;
}

/**
 * Attach the score to an AudioContext. The shell constructs the context on
 * the first user gesture (browsers require it); tests never call this.
 *
 * Beds: if a recorded file exists for the asked wave or boss key, that
 * named bed plays. A change of key waits out BED_MIN_S (one loop), then
 * crossfades. Pool rotation only when the asked key has no file, and only
 * after the same hold. The seed still picks the opening pool bed when the
 * asked key has no file. A burst speeds the playing bed up (`burstRate`)
 * instead of laying a track over it.
 */
export function attach(
  ctx: CtxLike,
  pattern: MusicPattern = DEFAULT_MUSIC,
  bed?: BedLookup,
  opts: {
    minBedSeconds?: number;
    seed?: number;
    pool?: readonly string[];
    burstRate?: number;
  } = {},
): AudioOut {
  const minBed = opts.minBedSeconds ?? BED_MIN_S;
  const pool = opts.pool ?? BED_POOL;
  const burstRate = opts.burstRate ?? BURST_RATE;
  let muted = false;
  let nextBar = 0;
  let lastKind = '';
  // The wave's bed. A bed that leaves is faded and paused where it is, so
  // it resumes from there when its turn comes back; nothing restarts from
  // zero mid-round.
  let currentBed: MediaBed | undefined;
  /** Round time the current bed came in; the hold runs from here. */
  let bedSince = 0;
  /** Where the pool rotation stands; the seed sets the opening. */
  let poolAt = pool.length ? Math.abs(opts.seed ?? 0) % pool.length : 0;
  let burstOn = false;
  let lastT = 0;
  let ducked = false;
  const bedGain = () => (ducked ? BED_LEVEL * 0.45 : BED_LEVEL);
  /** Current bed plus any still fading: mute/end/close must reach all of them. */
  const live = new Set<MediaBed>();
  interface Fade {
    bed: MediaBed;
    from: number;
    to: number;
    left: number;
    dur: number;
    pauseAtEnd: boolean;
  }
  let fades: Fade[] = [];
  let endGen = 0;
  const endTimers: ReturnType<typeof setTimeout>[] = [];
  const cancelEndFade = () => {
    endGen += 1;
    for (const id of endTimers) clearTimeout(id);
    endTimers.length = 0;
  };
  const pauseBed = (b: MediaBed) => {
    b.pause();
    b.playbackRate = 1;
    live.delete(b);
  };
  const fadeTo = (bed: MediaBed, to: number, dur: number, pauseAtEnd = false) => {
    fades = fades.filter((f) => f.bed !== bed);
    live.add(bed);
    if (dur <= 0) {
      bed.volume = to;
      if (pauseAtEnd) pauseBed(bed);
      return;
    }
    fades.push({ bed, from: bed.volume, to, left: dur, dur, pauseAtEnd });
  };
  const runFades = (dt: number) => {
    if (dt <= 0) return;
    // The burst ramps the playing bed's rate up and back over BURST_RAMP_S.
    if (currentBed) {
      const target = burstOn ? burstRate : 1;
      const step = ((burstRate - 1) * dt) / BURST_RAMP_S;
      const rate = currentBed.playbackRate;
      currentBed.playbackRate =
        rate < target ? Math.min(target, rate + step) : Math.max(target, rate - step);
    }
    if (fades.length === 0) return;
    const keep: Fade[] = [];
    for (const f of fades) {
      f.left = Math.max(0, f.left - dt);
      const u = 1 - f.left / f.dur;
      f.bed.volume = f.from + (f.to - f.from) * u;
      if (f.left > 0) keep.push(f);
      else if (f.pauseAtEnd) pauseBed(f.bed);
    }
    fades = keep;
  };
  const bringIn = (bed: MediaBed, level: number, dur: number, rate: number) => {
    // Restart during END_FADE_S reuses this element; stale end() steps must not.
    cancelEndFade();
    bed.loop = true;
    bed.muted = muted;
    if ('preservesPitch' in bed) bed.preservesPitch = true;
    bed.playbackRate = rate;
    // A bed comes in from silence when there is a fade to come in on.
    bed.volume = dur > 0 ? 0 : level;
    live.add(bed);
    void bed.play();
    fadeTo(bed, level, dur);
  };
  let musicGain: GainNode | undefined;
  let sfxGain: GainNode | undefined;
  let barOscs: OscillatorNode[] = [];
  let sfxOscs: OscillatorNode[] = [];
  const musicBus = (): GainNode => {
    if (!musicGain) {
      musicGain = ctx.createGain();
      musicGain.connect(ctx.destination);
    }
    return musicGain;
  };
  const sfxBus = (): GainNode => {
    if (!sfxGain) {
      sfxGain = ctx.createGain();
      sfxGain.connect(ctx.destination);
    }
    return sfxGain;
  };
  const silenceOscs = (gain: GainNode | undefined, oscs: OscillatorNode[]): OscillatorNode[] => {
    const now = ctx.currentTime;
    if (gain) {
      try {
        gain.gain.setValueAtTime(0.0001, now);
      } catch {
        /* tests stub AudioParam */
      }
      gain.gain.value = 0;
    }
    for (const osc of oscs) {
      try {
        osc.stop(now);
      } catch {
        /* already stopped */
      }
      try {
        osc.disconnect();
      } catch {
        /* tests stub OscillatorNode */
      }
    }
    return [];
  };
  const silenceBar = () => {
    barOscs = silenceOscs(musicGain, barOscs);
  };
  const silenceSfx = () => {
    sfxOscs = silenceOscs(sfxGain, sfxOscs);
  };
  const restoreBuses = () => {
    const now = ctx.currentTime;
    for (const gain of [musicGain, sfxGain]) {
      if (!gain) continue;
      try {
        gain.gain.setValueAtTime(1, now);
      } catch {
        /* tests stub AudioParam */
      }
      gain.gain.value = 1;
    }
  };
  const schedule = (notes: Note[], base: number, bus: GainNode, oscs: OscillatorNode[]) => {
    if (muted) return;
    try {
      bus.gain.setValueAtTime(1, ctx.currentTime);
    } catch {
      /* tests stub AudioParam */
    }
    bus.gain.value = 1;
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = n.wave;
      osc.frequency.value = n.freq;
      const t0 = base + n.at;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(n.gain, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dur);
      osc.connect(g);
      g.connect(bus);
      osc.start(t0);
      osc.stop(t0 + n.dur + 0.02);
      oscs.push(osc);
    }
  };
  const collectLive = (): MediaBed[] => {
    const out: MediaBed[] = [];
    const seen = new Set<MediaBed>();
    const add = (b: MediaBed | undefined) => {
      if (!b || seen.has(b)) return;
      seen.add(b);
      out.push(b);
    };
    add(currentBed);
    for (const f of fades) add(f.bed);
    for (const b of live) add(b);
    return out;
  };
  const sweepOrphans = () => {
    const fading = new Set(fades.map((f) => f.bed));
    for (const b of [...live]) {
      if (b === currentBed || fading.has(b)) continue;
      pauseBed(b);
    }
  };
  /** The pool bed at the rotation, skipping keys with no file; undefined when the pool has none. */
  const poolBed = (): MediaBed | undefined => {
    for (let i = 0; i < pool.length; i++) {
      const b = bed?.(pool[(poolAt + i) % pool.length]!);
      if (b) {
        poolAt = (poolAt + i) % pool.length;
        return b;
      }
    }
    return undefined;
  };
  const adopt = (next: MediaBed | undefined, t: number): boolean => {
    if (next === currentBed) return Boolean(next);
    const leaving = currentBed;
    const rate = leaving?.playbackRate ?? 1;
    currentBed = next;
    bedSince = t;
    if (leaving) fadeTo(leaving, 0, next ? BED_FADE_S : 0, true);
    if (next) bringIn(next, bedGain(), leaving ? BED_FADE_S : 0, rate);
    if (leaving) leaving.playbackRate = 1;
    return Boolean(next);
  };
  const switchBed = (waveKind: string, t: number) => {
    const named = bed?.(waveKind);
    const isBoss =
      waveKind === 'whisperer' ||
      waveKind === 'menu' ||
      waveKind === 'doorman' ||
      waveKind === 'archivist';
    // One loop (BED_MIN_S) before a playing bed gives way, named or not.
    if (currentBed && t - bedSince < minBed) return true;
    if (named) return adopt(named, t);
    if (isBoss) {
      // Wanted boss bed is missing: drop the overlay so chiptune can follow.
      if (currentBed) {
        fadeTo(currentBed, 0, BED_FADE_S, true);
        currentBed = undefined;
      }
      return false;
    }
    // No named file: rotate the pool, still after the hold.
    if (currentBed) poolAt = (poolAt + 1) % Math.max(1, pool.length);
    return adopt(poolBed(), t);
  };
  return {
    play(name) {
      schedule(sfx(name), ctx.currentTime, sfxBus(), sfxOscs);
    },
    tick(t, waveKind, burst = false) {
      burstOn = burst;
      // A new round on the same player (a restart, the next call of a
      // shift): the round clock went back to zero; the hold carries.
      // Any tick after end() cancels leftover wall-clock fade steps first.
      if (t < lastT || endTimers.length > 0) cancelEndFade();
      if (t < lastT) bedSince = t - Math.max(0, lastT - bedSince);
      runFades(Math.max(0, Math.min(0.1, t - lastT)));
      lastT = t;
      // A recorded bed, when present, replaces the chiptune for that kind.
      const hasBed = switchBed(waveKind, t);
      sweepOrphans();
      if (hasBed) {
        silenceBar();
        lastKind = '';
        return;
      }
      // Bars are scheduled by the round clock so the music follows hitstop
      // and the end; a burst plays the same pattern faster.
      const base = TRACKS[waveKind] ?? pattern;
      const pat = burst ? { ...base, bpm: base.bpm * burstRate } : base;
      const key = `${waveKind}:${burst ? 'burst' : ''}`;
      if (key !== lastKind) {
        silenceBar();
        lastKind = key;
        nextBar = Math.floor(t / barSeconds(pat));
      }
      const kindBs = barSeconds(pat);
      const barIndex = Math.floor(t / kindBs);
      if (barIndex < nextBar - 1) nextBar = barIndex;
      if (barIndex >= nextBar) {
        const lead = ctx.currentTime + 0.05;
        schedule(bar(pat, waveKind, barIndex), lead, musicBus(), barOscs);
        nextBar = barIndex + 1;
      }
    },
    seed(seed) {
      // Only an opening is seeded; a bed that is playing keeps its rotation.
      if (currentBed || pool.length === 0) return;
      poolAt = Math.abs(seed) % pool.length;
    },
    end() {
      // The round clock has stopped; step the fade on the wall clock.
      cancelEndFade();
      const beds = collectLive();
      currentBed = undefined;
      burstOn = false;
      fades = [];
      silenceBar();
      if (beds.length === 0) return;
      const gen = endGen;
      const steps = 20;
      const start = beds.map((b) => b.volume);
      let i = 0;
      const step = () => {
        if (gen !== endGen) return;
        i += 1;
        beds.forEach((b, k) => {
          if (gen !== endGen || b === currentBed) return;
          b.volume = Math.max(0, (start[k] ?? 1) * (1 - i / steps));
        });
        if (i >= steps) {
          for (const b of beds) {
            if (gen !== endGen || b === currentBed) continue;
            pauseBed(b);
          }
          return;
        }
        endTimers.push(setTimeout(step, (END_FADE_S * 1000) / steps));
      };
      endTimers.push(setTimeout(step, (END_FADE_S * 1000) / steps));
    },
    setMuted(m) {
      muted = m;
      for (const b of live) b.muted = m;
      if (currentBed) currentBed.muted = m;
      if (m) {
        silenceBar();
        silenceSfx();
      } else {
        restoreBuses();
      }
    },
    setBedDuck(on) {
      ducked = on;
      if (!currentBed) return;
      const target = bedGain();
      const leaving = new Set(fades.filter((f) => f.pauseAtEnd).map((f) => f.bed));
      for (const b of collectLive()) {
        if (leaving.has(b)) continue;
        fadeTo(b, target, 0.25);
      }
    },
    close() {
      cancelEndFade();
      silenceBar();
      silenceSfx();
      for (const b of collectLive()) pauseBed(b);
      currentBed = undefined;
      fades = [];
      live.clear();
      void ctx.close?.();
    },
  };
}
