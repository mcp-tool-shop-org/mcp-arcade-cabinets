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
  | 'dive';

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
};

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
  /** Call every frame with the round clock and the current wave kind. */
  tick(t: number, waveKind: string): void;
  setMuted(muted: boolean): void;
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
 */
export function attach(ctx: CtxLike, pattern: MusicPattern = DEFAULT_MUSIC): AudioOut {
  let muted = false;
  let nextBar = 0;
  let lastKind = '';
  const schedule = (notes: Note[], base: number) => {
    if (muted) return;
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
      g.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + n.dur + 0.02);
    }
  };
  return {
    play(name) {
      schedule(sfx(name), ctx.currentTime);
    },
    tick(t, waveKind) {
      // Bars are scheduled by the round clock so the music follows hitstop and the end.
      const pat = TRACKS[waveKind] ?? pattern;
      if (waveKind !== lastKind) {
        lastKind = waveKind;
        nextBar = Math.floor(t / barSeconds(pat));
      }
      const kindBs = barSeconds(pat);
      const barIndex = Math.floor(t / kindBs);
      if (barIndex < nextBar - 1) nextBar = barIndex;
      if (barIndex >= nextBar) {
        const lead = ctx.currentTime + 0.05;
        schedule(bar(pat, waveKind, barIndex), lead);
        nextBar = barIndex + 1;
      }
    },
    setMuted(m) {
      muted = m;
    },
    close() {
      void ctx.close?.();
    },
  };
}
