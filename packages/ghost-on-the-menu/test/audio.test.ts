import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  attach,
  bar,
  barSeconds,
  BED_LEVEL,
  BED_POOL,
  BURST_RATE,
  DEFAULT_MUSIC,
  END_FADE_S,
  TRACK_KEYS,
  TRACKS,
  sfx,
  type Note,
} from '../src/audio';

describe('the score is pure data (no assets, no sim)', () => {
  it('every effect is a short list of notes with sane gains', () => {
    for (const name of [
      'fire',
      'pop',
      'catch',
      'drop',
      'fog',
      'lamp',
      'phase',
      'end',
      'burst',
    ] as const) {
      const notes = sfx(name);
      expect(notes.length).toBeGreaterThan(0);
      for (const n of notes) {
        expect(n.gain).toBeGreaterThan(0);
        expect(n.gain).toBeLessThanOrEqual(0.25);
        expect(n.freq).toBeGreaterThan(20);
        expect(n.dur).toBeGreaterThan(0);
      }
    }
  });
  it('the catch is a different family from the pop: longer, rising, more notes', () => {
    const pop = sfx('pop');
    const c = sfx('catch');
    expect(c.length).toBeGreaterThan(pop.length);
    expect(Math.max(...c.map((n) => n.at + n.dur))).toBeGreaterThan(
      Math.max(...pop.map((n) => n.at + n.dur)) * 3,
    );
    const freqs = c.map((n) => n.freq);
    expect(freqs).toEqual([...freqs].sort((a, b) => a - b));
    expect(c.every((n) => n.wave !== 'square')).toBe(true);
    expect(pop.every((n) => n.wave === 'square')).toBe(true);
  });
  it('bars are deterministic and follow the wave kind', () => {
    const a = bar(DEFAULT_MUSIC, 'poison', 0);
    const b = bar(DEFAULT_MUSIC, 'poison', 0);
    expect(a).toEqual(b);
    const c = bar(DEFAULT_MUSIC, 'rug', 0);
    expect(c).not.toEqual(a);
    for (const n of a) expect(n.at).toBeLessThan(barSeconds(DEFAULT_MUSIC));
    expect(bar(DEFAULT_MUSIC, 'nonsense', 3).length).toBeGreaterThan(0); // falls back to the breather
    expect(TRACKS.poison).not.toEqual(TRACKS.inspect);
    expect(TRACKS.whisperer!.rootHz).not.toBe(TRACKS.doorman!.rootHz);
    // No burst track (the Director's word): a burst is the wave's own music, faster.
    expect(TRACKS.parallelism).toBeUndefined();
    expect(TRACK_KEYS).not.toContain('parallelism');
    for (const k of BED_POOL) expect(TRACK_KEYS).toContain(k);
  });
  it('the player schedules bars by the round clock, so hitstop and the end hold the music', () => {
    const started: number[] = [];
    let now = 0;
    const fake = {
      get currentTime() {
        return now;
      },
      destination: {} as AudioNode,
      createOscillator: () =>
        ({
          type: 'sine',
          frequency: { value: 0 },
          connect() {},
          start(t: number) {
            started.push(t);
          },
          stop() {},
        }) as unknown as OscillatorNode,
      createGain: () =>
        ({
          gain: {
            setValueAtTime() {},
            linearRampToValueAtTime() {},
            exponentialRampToValueAtTime() {},
          },
          connect() {},
        }) as unknown as GainNode,
    };
    const out = attach(fake);
    out.tick(0, 'poison');
    const afterFirst = started.length;
    expect(afterFirst).toBeGreaterThan(0);
    out.tick(0.5, 'poison'); // same bar, nothing new
    expect(started.length).toBe(afterFirst);
    now = 10;
    out.tick(barSeconds(DEFAULT_MUSIC), 'poison'); // next bar
    expect(started.length).toBeGreaterThan(afterFirst);
    out.setMuted(true);
    const muted = started.length;
    out.play('catch');
    expect(started.length).toBe(muted);
    const notes: Note[] = sfx('catch');
    expect(notes.length).toBe(4);
  });
});

describe('recorded track files', () => {
  it('every TRACK_KEYS has a file under apps/cabinets/public/tracks', () => {
    const dir = path.resolve(__dirname, '../../../apps/cabinets/public/tracks');
    const files = new Set(
      readdirSync(dir)
        .filter((f) => f.endsWith('.mp3'))
        .map((f) => f.replace(/\.mp3$/, '')),
    );
    for (const key of TRACK_KEYS) {
      const file = path.join(dir, `${key}.mp3`);
      expect(files.has(key), key).toBe(true);
      expect(existsSync(file), key).toBe(true);
      expect(statSync(file).size, key).toBeGreaterThan(0);
      expect(TRACKS[key], key).toBeDefined();
    }
  });
});

describe('wave motifs', () => {
  it('has a lead for every wave kind the cues can name', () => {
    for (const kind of ['inspect', 'poison', 'rug', 'unlisted', 'breather']) {
      expect(DEFAULT_MUSIC.lead[kind], kind).toBeDefined();
      expect(bar(DEFAULT_MUSIC, kind, 0).length).toBeGreaterThan(0);
    }
  });
});

describe('restart', () => {
  it('follows the round clock backwards so a restarted round has music', () => {
    const started: number[] = [];
    const fake = {
      currentTime: 0,
      destination: {} as AudioNode,
      createOscillator: () =>
        ({
          type: 'sine',
          frequency: { value: 0 },
          connect() {},
          start(t: number) {
            started.push(t);
          },
          stop() {},
        }) as unknown as OscillatorNode,
      createGain: () =>
        ({
          gain: {
            setValueAtTime() {},
            linearRampToValueAtTime() {},
            exponentialRampToValueAtTime() {},
          },
          connect() {},
        }) as unknown as GainNode,
    };
    const out = attach(fake);
    const bs = barSeconds(DEFAULT_MUSIC);
    out.tick(bs * 10, 'poison');
    const late = started.length;
    expect(late).toBeGreaterThan(0);
    out.tick(0, 'inspect');
    expect(started.length).toBeGreaterThan(late);
  });
});

// The recorded beds (the Director's play, 2026-09-11: "sporadic, doesn't stay
// one song long enough, cut off for no reason"). Measured before the rule:
// twenty switches in a ninety-second round, every one a restart from zero.
describe('recorded beds', () => {
  const silentCtx = () =>
    ({
      currentTime: 0,
      destination: {} as AudioNode,
      createOscillator: () =>
        ({
          type: 'sine',
          frequency: { value: 0 },
          connect() {},
          start() {},
          stop() {},
        }) as unknown as OscillatorNode,
      createGain: () =>
        ({
          gain: {
            setValueAtTime() {},
            linearRampToValueAtTime() {},
            exponentialRampToValueAtTime() {},
          },
          connect() {},
        }) as unknown as GainNode,
    }) as unknown as Parameters<typeof attach>[0];

  function bed() {
    const b = {
      loop: false,
      muted: false,
      volume: 1,
      currentTime: 0,
      playbackRate: 1,
      playing: false,
      plays: 0,
      play() {
        this.playing = true;
        this.plays += 1;
      },
      pause() {
        this.playing = false;
      },
    };
    return b;
  }

  it('holds a same-kind bed; a boss key skips the hold and comes in at BED_LEVEL', () => {
    const inspect = bed();
    const whisperer = bed();
    const menu = bed();
    const beds: Record<string, ReturnType<typeof bed>> = { inspect, whisperer, menu };
    const out = attach(silentCtx(), undefined, (k) => beds[k], { minBedSeconds: 60 });
    out.tick(0, 'inspect');
    for (let t = 1; t < 18; t += 1) out.tick(t, 'inspect');
    expect(inspect.playing).toBe(true);
    expect(inspect.volume).toBe(BED_LEVEL);
    out.tick(18, 'whisperer'); // boss keys skip the 120s hold
    expect(whisperer.playing).toBe(true);
    expect(whisperer.volume).toBeGreaterThanOrEqual(0);
    expect(whisperer.volume).toBeLessThanOrEqual(BED_LEVEL);
    for (let t = 18.05; t < 19.2; t += 0.05) out.tick(t, 'whisperer');
    expect(inspect.playing).toBe(false);
    expect(whisperer.volume).toBe(BED_LEVEL);
    out.tick(20, 'menu');
    expect(menu.playing).toBe(true);
    for (let t = 20.05; t < 21.2; t += 0.05) out.tick(t, 'menu');
    expect(whisperer.playing).toBe(false);
    expect(menu.volume).toBe(BED_LEVEL);
  });

  it('crossfades between beds and resumes a bed where it left off, never from zero', () => {
    const inspect = bed();
    const whisperer = bed();
    const beds: Record<string, ReturnType<typeof bed>> = { inspect, whisperer };
    const out = attach(silentCtx(), undefined, (k) => beds[k], { minBedSeconds: 0 });
    out.tick(0, 'inspect');
    expect(inspect.playing).toBe(true);
    expect(inspect.volume).toBe(BED_LEVEL);
    inspect.currentTime = 7.5; // seven seconds in
    out.tick(8, 'whisperer');
    // Both play through the crossfade; the leaving bed is not paused yet.
    expect(whisperer.playing).toBe(true);
    expect(inspect.playing).toBe(true);
    expect(whisperer.volume).toBeGreaterThanOrEqual(0);
    expect(whisperer.volume).toBeLessThanOrEqual(BED_LEVEL);
    for (let t = 8.05; t < 9.2; t += 0.05) out.tick(t, 'whisperer');
    expect(inspect.playing).toBe(false);
    expect(inspect.volume).toBe(0);
    expect(whisperer.volume).toBe(BED_LEVEL);
    // Back to inspect: it resumes from where it was, not from zero.
    out.tick(20, 'inspect');
    expect(inspect.playing).toBe(true);
    expect(inspect.currentTime).toBe(7.5);
    expect(inspect.plays).toBe(2);
  });

  it('setMuted mutes every live recorded bed, including the leaving one', () => {
    const inspect = bed();
    const whisperer = bed();
    const beds: Record<string, ReturnType<typeof bed>> = { inspect, whisperer };
    const out = attach(silentCtx(), undefined, (k) => beds[k], { minBedSeconds: 0 });
    out.tick(0, 'inspect');
    expect(inspect.playing).toBe(true);
    inspect.currentTime = 7.5;
    out.tick(8, 'whisperer');
    expect(whisperer.playing).toBe(true);
    expect(inspect.playing).toBe(true);
    out.setMuted(true);
    expect(inspect.muted).toBe(true);
    expect(whisperer.muted).toBe(true);
    for (let t = 8.05; t < 9.2; t += 0.05) out.tick(t, 'whisperer');
    expect(inspect.muted).toBe(true);
    expect(whisperer.muted).toBe(true);
  });

  it('a burst speeds the playing bed up over a ramp and lets it back down; nothing else plays', () => {
    const menu = bed();
    const parallelism = bed();
    const beds: Record<string, ReturnType<typeof bed>> = { menu, parallelism };
    const out = attach(silentCtx(), undefined, (k) => beds[k], { minBedSeconds: 0 });
    out.tick(0, 'menu');
    out.tick(1, 'menu', true);
    expect(menu.playing).toBe(true); // never swapped out
    expect(parallelism.playing).toBe(false); // the old overlay is never asked for
    for (let t = 1.05; t < 1.4; t += 0.05) out.tick(t, 'menu', true);
    expect(menu.playbackRate).toBeGreaterThan(1);
    expect(menu.playbackRate).toBeLessThan(BURST_RATE);
    for (let t = 1.4; t < 2.2; t += 0.05) out.tick(t, 'menu', true);
    expect(menu.playbackRate).toBeCloseTo(BURST_RATE, 5);
    expect(menu.volume).toBe(BED_LEVEL);
    out.tick(3, 'menu', false);
    for (let t = 3.05; t < 4.2; t += 0.05) out.tick(t, 'menu', false);
    expect(menu.playbackRate).toBe(1);
    expect(menu.plays).toBe(1);
  });

  it('a wave change during a burst brings the new bed in at the burst rate', () => {
    const menu = bed();
    const doorman = bed();
    const beds: Record<string, ReturnType<typeof bed>> = { menu, doorman };
    const out = attach(silentCtx(), undefined, (k) => beds[k], { minBedSeconds: 0 });
    out.tick(0, 'menu');
    for (let t = 0.05; t < 1.5; t += 0.05) out.tick(t, 'menu', true);
    out.tick(2, 'doorman', true);
    expect(doorman.playbackRate).toBeCloseTo(BURST_RATE, 5);
    for (let t = 2.05; t < 3.2; t += 0.05) out.tick(t, 'doorman', true);
    expect(menu.playing).toBe(false);
    expect(menu.playbackRate).toBe(1);
  });

  it('plays a named TRACK_KEYS bed as itself, not a rotated pool bed', () => {
    const beds: Record<string, ReturnType<typeof bed>> = {};
    for (const k of [...BED_POOL, 'whisperer']) beds[k] = bed();
    const out = attach(silentCtx(), undefined, (k) => beds[k], { minBedSeconds: 60, seed: 0 });
    out.tick(0, 'poison');
    expect(beds.poison!.playing).toBe(true);
    expect(beds.inspect!.playing).toBe(false);
  });

  it('skips a bed with no file and opens on the next pool bed the seed picks', () => {
    const beds: Record<string, ReturnType<typeof bed>> = {};
    for (const k of ['poison', 'rug', 'unlisted']) beds[k] = bed();
    // seed 1 is 'breather', which has no file here: the next pool bed opens.
    const out = attach(silentCtx(), undefined, (k) => beds[k], { seed: 1 });
    out.tick(0, 'inspect');
    expect(beds.poison!.playing).toBe(true);
    const other = attach(silentCtx(), undefined, (k) => beds[k], { seed: 4 });
    other.tick(0, 'inspect');
    expect(beds.unlisted!.plays).toBe(1);
  });

  it('keeps a named same-kind bed through the hold; a boss key skips the hold', () => {
    const beds: Record<string, ReturnType<typeof bed>> = {};
    for (const k of [...BED_POOL, 'whisperer']) beds[k] = bed();
    const out = attach(silentCtx(), undefined, (k) => beds[k], { minBedSeconds: 10, seed: 0 });
    out.tick(0, 'inspect');
    expect(beds.inspect!.playing).toBe(true);
    for (let t = 1; t < 10; t += 1) out.tick(t, 'inspect');
    expect(beds.breather!.playing).toBe(false);
    out.tick(10.5, 'inspect'); // named inspect stays inspect; no pool rotate
    expect(beds.inspect!.playing).toBe(true);
    expect(beds.breather!.playing).toBe(false);
    out.tick(11, 'whisperer'); // a boss during the hold starts now
    expect(beds.whisperer!.playing).toBe(true);
    for (let t = 11.05; t < 12.2; t += 0.05) out.tick(t, 'whisperer');
    expect(beds.whisperer!.volume).toBe(BED_LEVEL);
    out.tick(13, 'inspect'); // named inspect plays itself, not a pool rotate
    expect(beds.inspect!.playing).toBe(true);
  });

  it('carries the named bed across a restart or the next call, and a seed only sets an opening', () => {
    const beds: Record<string, ReturnType<typeof bed>> = {};
    for (const k of BED_POOL) beds[k] = bed();
    const out = attach(silentCtx(), undefined, (k) => beds[k], { minBedSeconds: 10, seed: 0 });
    out.tick(0, 'inspect');
    for (let t = 1; t < 7; t += 1) out.tick(t, 'inspect');
    out.seed(3); // a bed is playing: ignored
    // The next call: the round clock goes back to zero; named inspect stays.
    out.tick(0, 'inspect');
    expect(beds.inspect!.playing).toBe(true);
    expect(beds.inspect!.plays).toBe(1);
    for (let t = 1; t < 4; t += 1) out.tick(t, 'inspect');
    expect(beds.breather!.playing).toBe(false);
    out.tick(4.5, 'inspect');
    expect(beds.inspect!.playing).toBe(true);
    expect(beds.breather!.playing).toBe(false);
  });

  it('fades the music out at the scene on the wall clock, and a restart brings it back', () => {
    vi.useFakeTimers();
    try {
      const inspect = bed();
      const beds: Record<string, ReturnType<typeof bed>> = { inspect };
      const out = attach(silentCtx(), undefined, (k) => beds[k]);
      out.tick(0, 'inspect');
      out.end();
      expect(inspect.playing).toBe(true);
      vi.advanceTimersByTime(800);
      expect(inspect.volume).toBeLessThanOrEqual(BED_LEVEL);
      expect(inspect.volume).toBeGreaterThan(0);
      vi.advanceTimersByTime(1000);
      expect(inspect.playing).toBe(false);
      expect(inspect.volume).toBe(0);
      out.tick(0, 'inspect');
      expect(inspect.playing).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a restart during END_FADE_S keeps the new bed playing when leftover end timers fire', () => {
    vi.useFakeTimers();
    try {
      const inspect = bed();
      const beds: Record<string, ReturnType<typeof bed>> = { inspect };
      const out = attach(silentCtx(), undefined, (k) => beds[k]);
      out.tick(0, 'inspect');
      out.end();
      expect(inspect.playing).toBe(true);
      // During the fade, not after END_FADE_S has finished.
      vi.advanceTimersByTime((END_FADE_S * 1000) / 2);
      expect(inspect.playing).toBe(true);
      out.tick(0, 'inspect');
      expect(inspect.playing).toBe(true);
      vi.advanceTimersByTime(END_FADE_S * 1000);
      expect(inspect.playing).toBe(true);
      expect(inspect.volume).toBe(BED_LEVEL);
    } finally {
      vi.useRealTimers();
    }
  });

  it('with no beds the chiptune plays the burst pattern during a burst', () => {
    const started: number[] = [];
    const ctx = silentCtx() as unknown as { createOscillator: () => OscillatorNode };
    ctx.createOscillator = () =>
      ({
        type: 'sine',
        frequency: { value: 0 },
        connect() {},
        start(t: number) {
          started.push(t);
        },
        stop() {},
      }) as unknown as OscillatorNode;
    const out = attach(ctx as unknown as Parameters<typeof attach>[0]);
    out.tick(0, 'menu', true);
    expect(started.length).toBeGreaterThan(0);
  });
});
