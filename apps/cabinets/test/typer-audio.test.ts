// The bed, in its three shapes. Node has no Web Audio, so the context is a
// stub that records what the engine schedules: every source it starts, and
// every ramp it puts on a gain. The point of this file is the music setting —
// that `off` lays down nothing, that `soft` is slower and quieter than `on`,
// and that setting the same mode twice does nothing the second time.

import { describe, expect, it } from 'vitest';

import {
  BED_MODES,
  createTyperAudio,
  DEFAULT_MUSIC,
  isMusicMode,
  MUSIC_MODES,
  type MusicMode,
  type TyperAudio,
} from '../src/typer-audio';
import type { Cue } from '../src/typer-cues';

/** A source the engine started, and when. */
interface Started {
  kind: 'oscillator' | 'buffer';
  at: number;
}

/** A gain node, with the ramps the engine wrote on it. */
interface FakeGain {
  value: number;
  ramps: number[];
}

/**
 * Enough of an AudioContext to build the engine over, hear nothing, and count
 * what it asked for. `currentTime` stays at zero so a scheduled time is the
 * offset from the tick that scheduled it.
 */
class RecordingContext {
  currentTime = 0;
  sampleRate = 44100;
  state = 'running';
  destination = {};
  /** Every source started, in the order the engine started them. */
  started: Started[] = [];
  /** Every gain node, in the order the engine made them: master, sfx, bed. */
  gains: FakeGain[] = [];

  private param() {
    return {
      value: 0,
      setValueAtTime: () => undefined,
      exponentialRampToValueAtTime: () => undefined,
      linearRampToValueAtTime: () => undefined,
      cancelScheduledValues: () => undefined,
    };
  }

  createGain() {
    const held: FakeGain = { value: 0, ramps: [] };
    this.gains.push(held);
    const gain = {
      get value() {
        return held.value;
      },
      set value(next: number) {
        held.value = next;
      },
      setValueAtTime: (next: number) => {
        held.value = next;
      },
      exponentialRampToValueAtTime: () => undefined,
      linearRampToValueAtTime: (next: number) => {
        held.ramps.push(next);
      },
      cancelScheduledValues: () => undefined,
    };
    return { gain, connect: () => undefined, disconnect: () => undefined };
  }

  createOscillator() {
    return {
      type: 'sine',
      frequency: this.param(),
      connect: () => undefined,
      start: (at: number) => this.started.push({ kind: 'oscillator', at }),
      stop: () => undefined,
    };
  }

  createBufferSource() {
    return {
      buffer: null,
      playbackRate: this.param(),
      connect: () => undefined,
      start: (at: number) => this.started.push({ kind: 'buffer', at }),
      stop: () => undefined,
    };
  }

  createBiquadFilter() {
    return {
      type: 'bandpass',
      frequency: this.param(),
      Q: this.param(),
      connect: () => undefined,
    };
  }

  createBuffer(_channels: number, frames: number) {
    const data = new Float32Array(frames);
    return { duration: frames / this.sampleRate, getChannelData: () => data };
  }

  decodeAudioData() {
    return Promise.reject(new Error('no decoder here'));
  }

  resume() {
    return Promise.resolve();
  }

  close() {
    return Promise.resolve();
  }
}

function build(): { ctx: RecordingContext; audio: TyperAudio } {
  const ctx = new RecordingContext();
  // The samples never arrive in a test: `fetch` is not defined here and the
  // engine's own catch leaves the procedural click standing in.
  const audio = createTyperAudio(ctx as unknown as AudioContext, '/', 1);
  return { ctx, audio };
}

/** The bed bus is the third gain the engine makes: master, then sfx, then it. */
const BED_GAIN = 2;

/** One mode's bar, in seconds a beat, read off the hats it laid down. */
function beatSeconds(mode: MusicMode, hype: number): number {
  const { ctx, audio } = build();
  audio.setMusic(mode);
  audio.tick(1 / 60, hype, false);
  const hats = ctx.started.filter((s) => s.kind === 'buffer').map((s) => s.at);
  expect(hats.length).toBeGreaterThan(1);
  return hats[1]! - hats[0]!;
}

/** Where the bed bus's gain was sent for this mode. */
function bedLevel(mode: MusicMode): number {
  const { ctx, audio } = build();
  // Through `off` first, so the mode under test is always a real change and
  // always writes a ramp, whatever the engine opened on.
  audio.setMusic('off');
  audio.setMusic(mode);
  const ramps = ctx.gains[BED_GAIN]!.ramps;
  return ramps[ramps.length - 1]!;
}

describe('the music setting', () => {
  it('opens on the calm bed', () => {
    const { audio } = build();
    expect(DEFAULT_MUSIC).toBe('soft');
    expect(audio.music()).toBe(DEFAULT_MUSIC);
    expect(MUSIC_MODES.every((mode) => isMusicMode(mode))).toBe(true);
    expect(isMusicMode('loud')).toBe(false);
  });

  it('lays down nothing at all when the music is off', () => {
    const { ctx, audio } = build();
    audio.setMusic('off');
    for (let i = 0; i < 30; i++) audio.tick(1 / 60, 5, false);
    expect(ctx.started).toEqual([]);
  });

  it('still plays every cue when the music is off', () => {
    const { ctx, audio } = build();
    audio.setMusic('off');
    for (let i = 0; i < 30; i++) audio.tick(1 / 60, 5, false);
    const cue: Cue = {
      name: 'deploy',
      pitch: 0,
      size: 0,
      shake: 0,
      flash: 0,
      confetti: 0,
      toast: '',
    };
    audio.play(cue);
    // The deploy is a transient and four notes, and its duck is a no-op here.
    expect(ctx.started.length).toBeGreaterThan(0);
  });

  it('keeps the kick for the mode that asks for it, and only that one', () => {
    expect(BED_MODES.on.kick).toBe(true);
    expect(BED_MODES.soft.kick).toBe(false);
    expect(BED_MODES.off.kick).toBe(false);

    const loud = build();
    loud.audio.setMusic('on');
    loud.audio.tick(1 / 60, 1, false);
    expect(loud.ctx.started.some((s) => s.kind === 'oscillator')).toBe(true);

    const calm = build();
    calm.audio.setMusic('soft');
    calm.audio.tick(1 / 60, 1, false);
    expect(calm.ctx.started.some((s) => s.kind === 'oscillator')).toBe(false);
    expect(calm.ctx.started.some((s) => s.kind === 'buffer')).toBe(true);
  });

  it('runs slower and quieter than the pulse at the same vibes', () => {
    // A longer beat is a slower tempo: soft's bar is wider than on's.
    expect(beatSeconds('soft', 5)).toBeGreaterThan(beatSeconds('on', 5));
    expect(bedLevel('soft')).toBeLessThan(bedLevel('on'));
    // A gain is never ramped to a true zero — an exponential curve cannot end
    // there — so `off` lands on the engine's floor, which is silence.
    expect(bedLevel('off')).toBeLessThanOrEqual(0.0001);
    expect(BED_MODES.off.level).toBe(0);
    // And the vibes still move it, which is what keeps it the score's voice.
    expect(beatSeconds('soft', 5)).toBeLessThan(beatSeconds('soft', 1));
  });

  it('does nothing the second time the same mode is set', () => {
    const { ctx, audio } = build();
    audio.setMusic('on');
    const ramps = ctx.gains[BED_GAIN]!.ramps.length;
    audio.tick(1 / 60, 3, false);
    const started = ctx.started.length;

    audio.setMusic('on');
    audio.setMusic('on');
    expect(audio.music()).toBe('on');
    expect(ctx.gains[BED_GAIN]!.ramps.length).toBe(ramps);
    expect(ctx.started.length).toBe(started);
  });
});
