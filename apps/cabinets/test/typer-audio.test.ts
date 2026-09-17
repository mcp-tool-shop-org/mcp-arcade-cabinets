// The bed, in its three shapes. Node has no Web Audio, so the context is a
// stub that records what the engine schedules: every source it starts, and
// every ramp it puts on a gain. The point of this file is the music setting —
// that `off` lays down nothing, that `soft` is slower and quieter than `on`,
// and that setting the same mode twice does nothing the second time.

import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { STACKS } from '@mcp-arcade-cabinets/vibe-typer';
import { describe, expect, it } from 'vitest';

import {
  BED_CROSS_S,
  BED_MODES,
  BED_TRACK_BPM,
  BED_TRACK_LEVEL,
  BED_TRACK_MODE,
  createTyperAudio,
  DEFAULT_MUSIC,
  DUCK,
  DUCK_S,
  isMusicMode,
  isVibeTrackKey,
  MUSIC_MODES,
  type BedMaker,
  type MusicMode,
  type TrackBed,
  type TyperAudio,
  VIBE_TRACK_KEYS,
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

function build(makeBed?: BedMaker): { ctx: RecordingContext; audio: TyperAudio } {
  const ctx = new RecordingContext();
  // The samples never arrive in a test: `fetch` is not defined here and the
  // engine's own catch leaves the procedural click standing in. No bed maker
  // is handed over by default either, which is the shape a run with no media
  // element has — and the one every case written before the beds assumes.
  const audio = createTyperAudio(ctx as unknown as AudioContext, '/', 1, makeBed ?? (() => null));
  return { ctx, audio };
}

/** A recorded bed, in the shape the engine asks a maker for. */
class FakeBed implements TrackBed {
  loop = false;
  volume = 1;
  playbackRate = 1;
  preservesPitch = false;
  src = '';
  currentTime = 0;
  plays = 0;
  pauses = 0;
  /** True for an element the browser refuses to start (autoplay policy). */
  refusePlay = false;
  private readonly fired = new Map<string, (() => void)[]>();

  play(): Promise<void> {
    this.plays += 1;
    // A real element answers with a promise, and autoplay policy rejects it
    // rather than throwing. Both shapes are covered: this one, and the
    // `throws` element in the case below.
    return this.refusePlay ? Promise.reject(new Error('not allowed')) : Promise.resolve();
  }

  pause() {
    this.pauses += 1;
  }

  addEventListener(type: string, fn: () => void) {
    const list = this.fired.get(type) ?? [];
    list.push(fn);
    this.fired.set(type, list);
  }

  /** The browser saying the file is here, or that it is not. */
  fire(type: 'canplaythrough' | 'error') {
    for (const fn of this.fired.get(type) ?? []) fn();
  }
}

/** A maker that hands out a FakeBed per key and keeps them for the case. */
function bedShop(): { made: Map<string, FakeBed>; urls: string[]; make: BedMaker } {
  const made = new Map<string, FakeBed>();
  const urls: string[] = [];
  return {
    made,
    urls,
    make: (key, url) => {
      urls.push(url);
      const el = new FakeBed();
      made.set(key, el);
      return el;
    },
  };
}

/** One frame, long enough that a crossfade finishes inside it. */
const WHOLE_CROSS = BED_CROSS_S + 0.1;

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

  it('holds the bed down while a take plays and lets it back up after', () => {
    const { ctx, audio } = build();
    audio.setMusic('on');
    const own = ctx.gains[BED_GAIN]!.ramps.at(-1)!;
    expect(own).toBeCloseTo(BED_MODES.on.level, 6);

    audio.setBedDuck(true);
    const ducked = ctx.gains[BED_GAIN]!.ramps.at(-1)!;
    expect(ducked).toBeLessThan(own);
    expect(ducked).toBeCloseTo(BED_MODES.on.level * DUCK, 6);

    // The cue duck's timer runs out under the take and does not lift it.
    ctx.currentTime += DUCK_S + 1;
    audio.tick(1 / 60, 1, false);
    expect(ctx.gains[BED_GAIN]!.ramps.at(-1)!).toBeCloseTo(BED_MODES.on.level * DUCK, 6);

    audio.setBedDuck(false);
    expect(ctx.gains[BED_GAIN]!.ramps.at(-1)!).toBeCloseTo(own, 6);

    // Asking twice for what it is already doing writes nothing.
    const wrote = ctx.gains[BED_GAIN]!.ramps.length;
    audio.setBedDuck(false);
    expect(ctx.gains[BED_GAIN]!.ramps.length).toBe(wrote);
  });

  it('has no bed to hold down when the music is off, and plays the keys anyway', () => {
    const { ctx, audio } = build();
    audio.setMusic('off');
    const wrote = ctx.gains[BED_GAIN]!.ramps.length;
    audio.setBedDuck(true);
    expect(ctx.gains[BED_GAIN]!.ramps.length).toBe(wrote);
    // The keystroke is the score's voice (G29): the take never touches it.
    const key: Cue = {
      name: 'key',
      pitch: 3,
      size: 0,
      shake: 0,
      flash: 0,
      confetti: 0,
      toast: '',
    };
    audio.play(key);
    expect(ctx.started.length).toBeGreaterThan(0);
    audio.setBedDuck(false);
  });

  it('keeps the take duck through a change of bed', () => {
    const { ctx, audio } = build();
    audio.setMusic('on');
    audio.setBedDuck(true);
    audio.setMusic('soft');
    expect(ctx.gains[BED_GAIN]!.ramps.at(-1)!).toBeCloseTo(BED_MODES.soft.level * DUCK, 6);
    audio.setBedDuck(false);
    expect(ctx.gains[BED_GAIN]!.ramps.at(-1)!).toBeCloseTo(BED_MODES.soft.level, 6);
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

describe('the recorded bed, one a stack', () => {
  it('names the same seven stacks the corpus does', () => {
    expect([...VIBE_TRACK_KEYS].sort()).toEqual([...STACKS].sort());
    expect(VIBE_TRACK_KEYS.every((key) => isVibeTrackKey(key))).toBe(true);
    expect(isVibeTrackKey('rust')).toBe(false);
    // And the pack script spells the same seven names, because it is plain
    // node and may not import this module. That is all this proves: that the
    // two lists have not drifted apart. Whether the gate actually halts on a
    // missing bed is exercised against a real dist in
    // packages/launcher/test/pack-gate.test.ts.
    const here = path.dirname(fileURLToPath(import.meta.url));
    const pack = readFileSync(
      path.join(here, '..', '..', '..', 'packages', 'launcher', 'scripts', 'build.mjs'),
      'utf8',
    );
    for (const key of VIBE_TRACK_KEYS) expect(pack).toContain(`'${key}'`);
  });

  it('plays the level stack bed under the mode that asks for one', () => {
    expect(BED_TRACK_MODE).toBe('on');
    const shop = bedShop();
    const { audio } = build(shop.make);
    audio.setMusic('on');
    audio.setStack('python');
    expect(shop.urls).toEqual(['/vibe/tracks/python.mp3']);
    const el = shop.made.get('python')!;
    expect(el.src).toBe('/vibe/tracks/python.mp3');
    expect(el.loop).toBe(true);
    expect(el.preservesPitch).toBe(true);
    // Until the file says it is here, the bar still has the level.
    expect(audio.track()).toBeNull();
    expect(el.plays).toBe(0);

    el.fire('canplaythrough');
    expect(audio.track()).toBe('python');
    expect(el.plays).toBe(1);
    audio.tick(WHOLE_CROSS, 1, false);
    expect(el.volume).toBeCloseTo(BED_TRACK_LEVEL, 6);
  });

  it('lays down no bar of its own while a recording has the level', () => {
    const shop = bedShop();
    const { ctx, audio } = build(shop.make);
    audio.setMusic('on');
    audio.setStack('sql');
    shop.made.get('sql')!.fire('canplaythrough');
    for (let i = 0; i < 30; i++) audio.tick(1 / 60, 5, false);
    // No kick, no hat: the two sources are one bed and never play together.
    expect(ctx.started).toEqual([]);
    expect(ctx.gains[BED_GAIN]!.ramps.at(-1)!).toBeLessThanOrEqual(0.0001);
  });

  it('never reaches for a file in soft or off', () => {
    for (const mode of ['soft', 'off'] as const) {
      const shop = bedShop();
      const { audio } = build(shop.make);
      audio.setMusic(mode);
      audio.setStack('java');
      shop.made.get('java')?.fire('canplaythrough');
      for (let i = 0; i < 10; i++) audio.tick(1 / 60, 3, false);
      expect(audio.track()).toBeNull();
      expect(shop.made.get('java')!.plays).toBe(0);
    }
    // And soft still lays its own hat down, which is the point of the mode.
    const shop = bedShop();
    const { ctx, audio } = build(shop.make);
    audio.setMusic('soft');
    audio.setStack('java');
    shop.made.get('java')!.fire('canplaythrough');
    audio.tick(1 / 60, 1, false);
    expect(ctx.started.some((s) => s.kind === 'buffer')).toBe(true);
  });

  it('falls back to the bar when a stack has no file', () => {
    const shop = bedShop();
    const { ctx, audio } = build(shop.make);
    audio.setMusic('on');
    audio.setStack('bash');
    shop.made.get('bash')!.fire('error');
    for (let i = 0; i < 10; i++) audio.tick(1 / 60, 1, false);
    expect(audio.track()).toBeNull();
    expect(ctx.started.some((s) => s.kind === 'oscillator')).toBe(true);
    // And a run with no media element at all is the same story.
    const bare = build();
    bare.audio.setMusic('on');
    bare.audio.setStack('bash');
    bare.audio.tick(1 / 60, 1, false);
    expect(bare.audio.track()).toBeNull();
    expect(bare.ctx.started.length).toBeGreaterThan(0);
  });

  it('moves the recording with the vibes, inside the bar tempo bounds', () => {
    const shop = bedShop();
    const { audio } = build(shop.make);
    audio.setMusic('on');
    audio.setStack('javascript');
    const el = shop.made.get('javascript')!;
    el.fire('canplaythrough');

    audio.tick(1 / 60, 1, false);
    expect(el.playbackRate).toBeCloseTo(1, 6);
    audio.tick(1 / 60, 5, false);
    // The rate is the number the bar's own tempo is scaled by: 96 bpm and
    // 0.06 a step put five times vibes at 119.04 bpm, a rate of 1.24.
    const top = 1 + BED_MODES.on.hype * 4;
    expect(top).toBeCloseTo(1.24, 6);
    expect(el.playbackRate).toBeCloseTo(top, 6);
    expect(BED_TRACK_BPM * el.playbackRate).toBeCloseTo(119.04, 6);
    // And it holds through a level's last request, as the bar's tempo does.
    audio.tick(1 / 60, 1, true);
    expect(el.playbackRate).toBeCloseTo(top, 6);
    audio.tick(1 / 60, 1, false);
    expect(el.playbackRate).toBeCloseTo(1, 6);
  });

  it('crosses one bed into the next when the stack changes', () => {
    const shop = bedShop();
    const { audio } = build(shop.make);
    audio.setMusic('on');
    audio.setStack('bash');
    const first = shop.made.get('bash')!;
    first.fire('canplaythrough');
    audio.tick(WHOLE_CROSS, 1, false);
    expect(first.volume).toBeCloseTo(BED_TRACK_LEVEL, 6);

    audio.setStack('csharp');
    const second = shop.made.get('csharp')!;
    second.fire('canplaythrough');
    expect(audio.track()).toBe('csharp');
    // Half a cross in, one is on its way down and the other on its way up,
    // and neither has been cut off.
    audio.tick(BED_CROSS_S / 2, 1, false);
    expect(first.volume).toBeGreaterThan(0);
    expect(first.volume).toBeLessThan(BED_TRACK_LEVEL);
    expect(second.volume).toBeGreaterThan(0);
    expect(first.pauses).toBe(0);

    audio.tick(WHOLE_CROSS, 1, false);
    expect(first.volume).toBe(0);
    expect(first.pauses).toBe(1);
    expect(second.volume).toBeCloseTo(BED_TRACK_LEVEL, 6);
  });

  it('holds the recording down for a take and for a cue, on the same depth', () => {
    const shop = bedShop();
    const { audio } = build(shop.make);
    audio.setMusic('on');
    audio.setStack('integration');
    const el = shop.made.get('integration')!;
    el.fire('canplaythrough');
    audio.tick(WHOLE_CROSS, 1, false);

    audio.setBedDuck(true);
    audio.tick(WHOLE_CROSS, 1, false);
    expect(el.volume).toBeCloseTo(BED_TRACK_LEVEL * DUCK, 6);
    audio.setBedDuck(false);
    audio.tick(WHOLE_CROSS, 1, false);
    expect(el.volume).toBeCloseTo(BED_TRACK_LEVEL, 6);

    const deploy: Cue = {
      name: 'deploy',
      pitch: 0,
      size: 0,
      shake: 0,
      flash: 0,
      confetti: 0,
      toast: '',
    };
    audio.play(deploy);
    audio.tick(WHOLE_CROSS, 1, false);
    expect(el.volume).toBeCloseTo(BED_TRACK_LEVEL * DUCK, 6);
  });

  it('stops the recording on a mute at once, and on the end for good', () => {
    const shop = bedShop();
    const { audio } = build(shop.make);
    audio.setMusic('on');
    audio.setStack('python');
    const el = shop.made.get('python')!;
    el.fire('canplaythrough');
    audio.tick(WHOLE_CROSS, 1, false);

    // The graph's mute cannot reach a media element, so this is by hand and
    // it does not wait for a crossfade.
    audio.setMuted(true);
    expect(el.volume).toBe(0);
    expect(el.pauses).toBe(1);
    audio.setMuted(false);
    expect(el.plays).toBe(2);

    audio.end();
    expect(audio.track()).toBeNull();
    expect(el.volume).toBe(0);
    expect(el.pauses).toBe(2);
  });

  it('hands the level back when the browser refuses to start a bed', async () => {
    const shop = bedShop();
    const { ctx, audio } = build(shop.make);
    audio.setMusic('on');
    audio.setStack('python');
    const el = shop.made.get('python')!;
    el.refusePlay = true;
    el.fire('canplaythrough');
    // The bed takes the level for as long as it takes the promise to reject,
    // which is the window in which the procedural bed is already fading out.
    expect(audio.track()).toBe('python');
    await Promise.resolve();
    await Promise.resolve();
    expect(audio.track()).toBeNull();
    expect(el.volume).toBe(0);
    expect(el.pauses).toBe(1);
    // And the bar comes back rather than the cabinet going quiet.
    for (let i = 0; i < 10; i++) audio.tick(1 / 60, 1, false);
    expect(ctx.started.some((s) => s.kind === 'oscillator')).toBe(true);
    // The refusal is remembered: the next level in that stack does not fade
    // the bar out again for an element that will not play.
    const bars = ctx.started.length;
    audio.setStack('java');
    audio.setStack('python');
    expect(audio.track()).toBeNull();
    expect(el.plays).toBe(1);
    // The clock has to move for the next bar to be due; the stub holds it.
    ctx.currentTime += 3;
    audio.tick(1 / 60, 1, false);
    expect(ctx.started.length).toBeGreaterThan(bars);
  });

  it('hands the level back when play throws outright', () => {
    const shop = bedShop();
    const { audio } = build(shop.make);
    audio.setMusic('on');
    audio.setStack('sql');
    const el = shop.made.get('sql')!;
    el.play = () => {
      throw new Error('no media on this device');
    };
    el.fire('canplaythrough');
    // A synchronous throw is caught inside the same call, so the level never
    // leaves the bar at all.
    expect(audio.track()).toBeNull();
  });

  it('has a file for every key, inside the size the package can carry', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const dir = path.join(here, '..', 'public', 'vibe', 'tracks');
    for (const key of VIBE_TRACK_KEYS) {
      const file = path.join(dir, `${key}.mp3`);
      const size = statSync(file).size;
      expect(size, key).toBeGreaterThan(0);
      // Seven beds ride in the Vibe package. The ceiling was 700 KB while a
      // bed was a 38 second loop; the music pass made each one a two-minute
      // piece at the Director's word, and the weight moved with it. The
      // window a bed must play for, and this same ceiling, are asserted for
      // both cabinets in `bed-length.test.ts`; this line stays so a change to
      // the Vibe beds alone still trips something here.
      expect(size, key).toBeLessThan(2.1 * 1024 * 1024);
    }
  });

  it('asks for one stack once, and only for the stacks a run visits', () => {
    const shop = bedShop();
    const { audio } = build(shop.make);
    audio.setMusic('on');
    audio.setStack('sql');
    audio.setStack('sql');
    audio.setStack('nothing-like-a-stack');
    expect(shop.urls).toEqual(['/vibe/tracks/sql.mp3']);
    audio.setStack('java');
    audio.setStack('sql');
    expect(shop.urls).toEqual(['/vibe/tracks/sql.mp3', '/vibe/tracks/java.mp3']);
  });
});
