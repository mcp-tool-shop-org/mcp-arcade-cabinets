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
  | 'drop-spread'
  | 'drop-rapid'
  | 'drop-pierce'
  | 'fog'
  | 'veil'
  | 'lamp'
  | 'lampback'
  | 'lampfull'
  | 'phase'
  | 'end'
  | 'wave'
  | 'bosshit'
  | 'hullhit'
  | 'bossdown'
  | 'dive'
  | 'burst'
  | 'capped';

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
  'doorman',
] as const;
export type TrackKey = (typeof TRACK_KEYS)[number];
/**
 * Every recorded bed is a song. The shell draws the next one from a bag
 * (no song heard again until every song has been heard, the same walk the
 * agent's lines take); a runner or a test with no bag rotates through this
 * list from the seed's opening. The Director, 2026-09-17: one song at a
 * time, played whole, and nothing on the field changes it.
 */
export const BED_POOL: readonly string[] = [...TRACK_KEYS];

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
  /** The file's own length in seconds, once the element knows it. NaN until metadata loads; absent in tests. */
  readonly duration?: number;
  /**
   * True once the file has played to its end. A song is not looped: when it
   * ends the next song is drawn. Absent in tests, where a song never ends
   * unless the test says so.
   */
  readonly ended?: boolean;
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
/** A scheduled oscillator and the context time it stops at. */
interface Voice {
  osc: OscillatorNode;
  until: number;
}

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
      // A small pickup ding, not the lie-catch chord (W7). Kept as the plain
      // cue for a kind with no variation of its own.
      return [
        { at: 0, freq: 784, dur: 0.08, wave: 'square', gain: 0.1 },
        { at: 0.07, freq: 1046, dur: 0.12, wave: 'triangle', gain: 0.1 },
      ];
    // Three small variations on the ding, one per timed power, so the sound
    // agrees with the color the player just saw. The field already gives
    // each kind its own fill and its own bezel socket; the ear had one cue
    // for all three.
    case 'drop-spread':
      // The widest of the three: two notes a fifth apart, opening outward.
      return [
        { at: 0, freq: 784, dur: 0.09, wave: 'square', gain: 0.1 },
        { at: 0.07, freq: 1175, dur: 0.14, wave: 'triangle', gain: 0.1 },
      ];
    case 'drop-rapid':
      // The quickest: three short taps rather than a rise.
      return [
        { at: 0, freq: 988, dur: 0.04, wave: 'square', gain: 0.09 },
        { at: 0.05, freq: 988, dur: 0.04, wave: 'square', gain: 0.09 },
        { at: 0.1, freq: 1318, dur: 0.08, wave: 'triangle', gain: 0.1 },
      ];
    case 'drop-pierce':
      // The narrowest: one thin note held, a shot going through.
      return [{ at: 0, freq: 1568, dur: 0.18, wave: 'sine', gain: 0.1 }];
    case 'lampfull':
      // A lamp caught with the pool already full: the lamp's own pitch, flat,
      // because nothing came back. Not the rise of 'lampback', which would
      // say a socket filled when none did.
      return [
        { at: 0, freq: 196, dur: 0.07, wave: 'square', gain: 0.09 },
        { at: 0.08, freq: 196, dur: 0.1, wave: 'triangle', gain: 0.08 },
      ];
    case 'fog':
      return [{ at: 0, freq: 55, dur: 1.2, wave: 'sawtooth', gain: 0.05 }];
    case 'veil':
      // The bank's own note, lower and shorter: the same weather
      // arriving rather than a new thing. The blind used to be silent.
      return [
        { at: 0, freq: 41, dur: 0.5, wave: 'sawtooth', gain: 0.06 },
        { at: 0.06, freq: 33, dur: 0.6, wave: 'sine', gain: 0.05 },
      ];
    case 'lamp':
      return [
        { at: 0, freq: 196, dur: 0.12, wave: 'square', gain: 0.14 },
        { at: 0.14, freq: 147, dur: 0.25, wave: 'square', gain: 0.12 },
      ];
    case 'lampback':
      // The lamp cue, read upward: a socket filling is not a socket going out.
      return [
        { at: 0, freq: 147, dur: 0.12, wave: 'square', gain: 0.12 },
        { at: 0.14, freq: 196, dur: 0.12, wave: 'square', gain: 0.13 },
        { at: 0.26, freq: 294, dur: 0.3, wave: 'triangle', gain: 0.14 },
      ];
    case 'phase':
      return [
        { at: 0, freq: 262, dur: 0.1, wave: 'square', gain: 0.1 },
        { at: 0.12, freq: 392, dur: 0.14, wave: 'square', gain: 0.1 },
      ];
    case 'bosshit':
      // A dull thud: the boss is a wall, not a bell.
      return [{ at: 0, freq: 98, dur: 0.07, wave: 'square', gain: 0.1 }];
    case 'hullhit':
      // A hull that held: the boss's thud, thinner and quieter, and well
      // under the pop. What died and what held must not sound alike.
      return [{ at: 0, freq: 165, dur: 0.05, wave: 'square', gain: 0.06 }];
    case 'capped':
      // The column is full: one short dry tick, quieter than the shot it is
      // standing in for. It says the button was read and the field was not
      // ready, which is the whole of what the cap means.
      return [{ at: 0, freq: 330, dur: 0.03, wave: 'square', gain: 0.05 }];
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
  /**
   * The round ended. With `keepSong` the chiptune stops and the song plays
   * on into the next tape (the scene between two tapes); without it the
   * music leaves over END_FADE_S on the wall clock (back to the cabinets).
   */
  end(keepSong?: boolean): void;
  /**
   * Between rounds (the scene, a shift's card): the round clock is stopped
   * and nothing ticks, so a piece that ends there would leave silence until
   * the next round's first tick. This draws the next piece the moment the
   * playing one has ended, and does nothing else.
   */
  keep(): void;
  /** Seed the opening song for a round about to start; ignored while a song plays. */
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
 * Beds: one song at a time, played whole. The next song is whatever
 * `nextBed` hands back (the shell's bag draw), or, without one, the next
 * key in the pool from the seed's opening. Nothing on the field changes a
 * song: not a wave, not a boss, not the scene between two tapes. It ends
 * when the file ends, and the next is drawn on that tick. A burst speeds
 * the playing song up (`burstRate`) instead of laying a track over it. The
 * Director's rule, 2026-09-17, after a day of holds and switches that each
 * replaced a piece before it could settle: a playlist, one piece to its end.
 */
export function attach(
  ctx: CtxLike,
  pattern: MusicPattern = DEFAULT_MUSIC,
  bed?: BedLookup,
  opts: {
    seed?: number;
    pool?: readonly string[];
    /**
     * The next song, when the playing one has ended or there is none. The
     * shell draws from a bag it keeps in the browser; a runner leaves this
     * out and the pool rotates from the seed. Undefined means no song: the
     * chiptune plays until one is handed back. A draw may name the song it
     * hands back, and then a refusal can name it too.
     */
    nextBed?: () => MediaBed | { bed: MediaBed; key: string } | undefined;
    burstRate?: number;
    /**
     * A bed the browser would not play, and the key it was drawn under when
     * the draw named one. Under the playlist a refusal is not silence: the
     * next song plays, so the true status word is `one song will not play`,
     * and only an exhausted pool is `music: chiptune`. The shell drops that
     * key from its bag; before the key was carried it had to reverse-map the
     * element's identity to know which song to drop.
     */
    onBedFail?: (bed: MediaBed, key: string | null) => void;
  } = {},
): AudioOut {
  const pool = opts.pool ?? BED_POOL;
  const nextBed = opts.nextBed;
  const burstRate = opts.burstRate ?? BURST_RATE;
  const onBedFail = opts.onBedFail;
  let muted = false;
  let nextBar = 0;
  let lastKind = '';
  // The song. It plays to its end; a song that has ended is faded out under
  // the next one, which starts from its top.
  let currentBed: MediaBed | undefined;
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
  /**
   * A bed that would not start. It leaves `live` and the fades, and if it was
   * the one holding the round it stops being: `currentBed` goes back to
   * nothing, so the very next tick finds no bed and plays the chiptune bar.
   * The shell is told, so it can say so and stop offering this element again.
   */
  /**
   * Beds the browser has refused. They are treated as absent from here on:
   * the lookup still holds the element, and re-adopting it every tick would
   * silence the chiptune once a frame for a bed that will not play.
   */
  const refusedBeds = new WeakSet<MediaBed>();
  /** The key a bed was drawn under, so a refusal can name the song. */
  const bedKeys = new WeakMap<MediaBed, string>();
  const bedRefused = (bed: MediaBed) => {
    refusedBeds.add(bed);
    fades = fades.filter((f) => f.bed !== bed);
    bed.volume = 0;
    try {
      bed.pause();
    } catch {
      /* an element that never started has nothing to pause */
    }
    bed.playbackRate = 1;
    live.delete(bed);
    // A rejection can land after the round has already moved on, in which
    // case this bed is not the one holding the level and nothing else changes.
    if (bed === currentBed) currentBed = undefined;
    onBedFail?.(bed, bedKeys.get(bed) ?? null);
  };
  const bringIn = (bed: MediaBed, level: number, dur: number, rate: number) => {
    // Restart during END_FADE_S reuses this element; stale end() steps must not.
    cancelEndFade();
    // A song plays once; when it ends the next is drawn.
    bed.loop = false;
    bed.muted = muted;
    if ('preservesPitch' in bed) bed.preservesPitch = true;
    bed.playbackRate = rate;
    // A song that ended is brought back from its top when its turn comes
    // round again; one that was faded mid-way (a leave) resumes where it was.
    if (bed.ended === true) {
      try {
        bed.currentTime = 0;
      } catch {
        /* an element with no metadata is at its top already */
      }
    }
    // A bed comes in from silence when there is a fade to come in on.
    bed.volume = dur > 0 ? 0 : level;
    live.add(bed);
    // Autoplay policy does not throw: it REJECTS the promise `play()` returns.
    // Unhandled, that left a bed which is not playing sitting in `currentBed`
    // for the whole hold with the chiptune silenced behind it — a cabinet that
    // simply goes quiet. A refusal hands the round back to the chiptune now.
    try {
      const started = bed.play() as Promise<void> | void;
      if (started && typeof (started as Promise<void>).catch === 'function') {
        // The handler is guarded too: a shell callback that throws inside
        // `bedRefused` would otherwise surface as an unhandled rejection
        // from a promise nobody holds (Kimi's music review, point three).
        void (started as Promise<void>).catch(() => {
          try {
            bedRefused(bed);
          } catch {
            /* the round plays on; the refusal was already recorded */
          }
        });
      }
    } catch {
      bedRefused(bed);
    }
    fadeTo(bed, level, dur);
  };
  let musicGain: GainNode | undefined;
  let sfxGain: GainNode | undefined;
  /** A scheduled oscillator and the moment it stops; `until` is what lets a
   * finished voice be dropped without waiting for an onended the tests never
   * fire. */
  let barOscs: Voice[] = [];
  let sfxOscs: Voice[] = [];
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
  const silenceOscs = (gain: GainNode | undefined, voices: Voice[]): Voice[] => {
    const now = ctx.currentTime;
    if (gain) {
      try {
        gain.gain.setValueAtTime(0.0001, now);
      } catch {
        /* tests stub AudioParam */
      }
      gain.gain.value = 0;
    }
    for (const { osc } of voices) {
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
  const schedule = (notes: Note[], base: number, bus: GainNode, voices: Voice[]) => {
    if (muted) return;
    // Drop the voices that have already stopped. sfxOscs is emptied only by
    // silenceSfx (mute or close), and every player shot fires the 'fire'
    // cue, so a two-to-three-minute round used to retain on the order of a
    // thousand dead oscillators and their gain nodes, then walk all of them
    // at mute. The retained set now stays proportional to what is sounding.
    const nowT = ctx.currentTime;
    let kept = 0;
    for (let i = 0; i < voices.length; i++) {
      const v = voices[i]!;
      if (v.until > nowT) voices[kept++] = v;
    }
    voices.length = kept;
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
      const until = t0 + n.dur + 0.02;
      osc.start(t0);
      osc.stop(until);
      voices.push({ osc, until });
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
  /** The lookup, minus anything that has already refused to play. */
  const bedFor = (key: string): MediaBed | undefined => {
    const b = bed?.(key);
    return b && refusedBeds.has(b) ? undefined : b;
  };
  const poolBed = (): MediaBed | undefined => {
    for (let i = 0; i < pool.length; i++) {
      const key = pool[(poolAt + i) % pool.length]!;
      const b = bedFor(key);
      if (b) {
        poolAt = (poolAt + i) % pool.length;
        bedKeys.set(b, key);
        return b;
      }
    }
    return undefined;
  };
  const adopt = (next: MediaBed | undefined): boolean => {
    if (next === currentBed) return Boolean(next);
    const leaving = currentBed;
    const rate = leaving?.playbackRate ?? 1;
    currentBed = next;
    if (leaving) fadeTo(leaving, 0, next ? BED_FADE_S : 0, true);
    if (next) bringIn(next, bedGain(), leaving ? BED_FADE_S : 0, rate);
    if (leaving) leaving.playbackRate = 1;
    // Not `Boolean(next)`: a bed that refused to start inside `bringIn` has
    // already given `currentBed` back, and this tick must fall to the bar
    // rather than silence the chiptune for a bed that is not playing.
    return Boolean(currentBed);
  };
  /**
   * The next song: the shell's bag draw, or the pool's rotation — and the bag
   * draw goes through the same refusal filter the pool draw does. It did not,
   * and a bag re-serves every element once it empties and refills: a refused
   * song was adopted again, the tick said it had a bed and silenced the bar,
   * the rejection landed a microtask later and handed the round back. One
   * music dropout per redraw, and with a short bag a stutter. The bag is
   * walked a bounded number of times so a bag that is entirely refused falls
   * to the pool rather than spinning.
   */
  const BAG_TRIES = 8;
  const nextSong = (): MediaBed | undefined => {
    if (nextBed) {
      for (let i = 0; i < BAG_TRIES; i++) {
        const drawn = nextBed();
        // The bag has nothing to hand back: that is silence and the chiptune
        // plays, exactly as it did. The pool is not a fallback for an empty
        // bag — only for a bag whose every draw has already been refused.
        if (!drawn) return undefined;
        const b = 'bed' in drawn ? drawn.bed : drawn;
        if ('bed' in drawn) bedKeys.set(b, drawn.key);
        if (!refusedBeds.has(b)) return b;
      }
      return poolBed();
    }
    if (pool.length === 0) return undefined;
    if (currentBed) poolAt = (poolAt + 1) % pool.length;
    return poolBed();
  };
  /**
   * The song plays on unless it has ended. Then the next is drawn, and if
   * there is none the field falls back to the chiptune bar. The wave kind
   * is not read here at all: a song is not the wave's and not the boss's.
   */
  const keepSong = () => {
    // Muted, the playlist holds where it is: the element is paused, so it
    // does not end, so no song is drawn and none is spent out of the shell's
    // bag while nobody can hear it. A player who mutes for ten minutes used
    // to come back mid-song with several pieces gone that they never heard,
    // which under the Director's one-piece-to-its-end rule is the one thing
    // they can be sure of losing.
    if (muted) return Boolean(currentBed);
    if (currentBed && currentBed.ended !== true) return true;
    const next = nextSong();
    if (!next) {
      if (currentBed) {
        fadeTo(currentBed, 0, BED_FADE_S, true);
        currentBed = undefined;
      }
      return false;
    }
    return adopt(next);
  };
  return {
    play(name) {
      schedule(sfx(name), ctx.currentTime, sfxBus(), sfxOscs);
    },
    tick(t, waveKind, burst = false) {
      burstOn = burst;
      // A new round on the same player (a restart, the next tape, the next
      // call of a shift): the round clock went back to zero; the song plays
      // on. Any tick after end() cancels leftover wall-clock fade steps first.
      if (t < lastT || endTimers.length > 0) cancelEndFade();
      runFades(Math.max(0, Math.min(0.1, t - lastT)));
      lastT = t;
      // A recorded song, when one is playing, replaces the chiptune.
      const hasBed = keepSong();
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
      // Only an opening is seeded; a song that is playing keeps its rotation.
      if (currentBed || pool.length === 0) return;
      poolAt = Math.abs(seed) % pool.length;
    },
    keep() {
      if (currentBed && currentBed.ended === true) keepSong();
    },
    end(keepSong = false) {
      // The round clock has stopped; step the fade on the wall clock.
      cancelEndFade();
      burstOn = false;
      silenceBar();
      // The scene between two tapes: the song plays on into the next one,
      // at its own rate again (the Director, 2026-09-17: whole songs).
      if (keepSong) {
        if (currentBed) currentBed.playbackRate = 1;
        return;
      }
      const beds = collectLive();
      currentBed = undefined;
      fades = [];
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
      const was = muted;
      muted = m;
      for (const b of live) b.muted = m;
      if (currentBed) currentBed.muted = m;
      if (m) {
        silenceBar();
        silenceSfx();
        // Pause rather than run on: the element keeps its position, so unmute
        // lands where mute left it.
        if (currentBed && was !== m) {
          try {
            currentBed.pause();
          } catch {
            /* an element that never started has nothing to pause */
          }
        }
      } else {
        restoreBuses();
        if (currentBed && was !== m) {
          try {
            const started = currentBed.play() as Promise<void> | void;
            if (started && typeof (started as Promise<void>).catch === 'function') {
              const resumed = currentBed;
              void (started as Promise<void>).catch(() => {
                try {
                  bedRefused(resumed);
                } catch {
                  /* the round plays on; the refusal was already recorded */
                }
              });
            }
          } catch {
            /* a resume the browser will not take falls to the next tick */
          }
        }
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
