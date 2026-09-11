import { describe, expect, it, vi } from 'vitest';

import { attach, bar, barSeconds, DEFAULT_MUSIC, TRACKS, sfx, type Note } from '../src/audio';

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
    expect(TRACKS.parallelism!.bpm).toBeGreaterThan(TRACKS.inspect!.bpm);
    expect(bar(TRACKS.parallelism!, 'parallelism', 0).length).toBeGreaterThan(0);
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

  it('holds a bed for at least a minute, then gives way to the wave that is playing', () => {
    const inspect = bed();
    const whisperer = bed();
    const menu = bed();
    const beds: Record<string, ReturnType<typeof bed>> = { inspect, whisperer, menu };
    const out = attach(silentCtx(), undefined, (k) => beds[k]); // the real minute
    out.tick(0, 'inspect');
    for (let t = 1; t < 59; t += 1) out.tick(t, t < 18 ? 'inspect' : 'whisperer');
    expect(whisperer.playing).toBe(false); // wanted since 18 s, held
    expect(inspect.playing).toBe(true);
    out.tick(61, 'menu'); // the hold is up: the bed that is wanted now comes in
    expect(menu.playing).toBe(true);
    expect(whisperer.playing).toBe(false);
    for (let t = 61.05; t < 62.5; t += 0.05) out.tick(t, 'menu');
    expect(inspect.playing).toBe(false);
    expect(menu.volume).toBe(1);
  });

  it('crossfades between beds and resumes a bed where it left off, never from zero', () => {
    const inspect = bed();
    const whisperer = bed();
    const beds: Record<string, ReturnType<typeof bed>> = { inspect, whisperer };
    const out = attach(silentCtx(), undefined, (k) => beds[k], { minBedSeconds: 0 });
    out.tick(0, 'inspect');
    expect(inspect.playing).toBe(true);
    expect(inspect.volume).toBe(1);
    inspect.currentTime = 7.5; // seven seconds in
    out.tick(8, 'whisperer');
    // Both play through the crossfade; the leaving bed is not paused yet.
    expect(whisperer.playing).toBe(true);
    expect(inspect.playing).toBe(true);
    expect(whisperer.volume).toBeLessThan(1);
    for (let t = 8.05; t < 9.2; t += 0.05) out.tick(t, 'whisperer');
    expect(inspect.playing).toBe(false);
    expect(inspect.volume).toBe(0);
    expect(whisperer.volume).toBe(1);
    // Back to inspect: it resumes from where it was, not from zero.
    out.tick(20, 'inspect');
    expect(inspect.playing).toBe(true);
    expect(inspect.currentTime).toBe(7.5);
    expect(inspect.plays).toBe(2);
  });

  it('keeps the bed through a burst and overlays the burst bed, ducked and undone', () => {
    const menu = bed();
    const parallelism = bed();
    const beds: Record<string, ReturnType<typeof bed>> = { menu, parallelism };
    const out = attach(silentCtx(), undefined, (k) => beds[k], { minBedSeconds: 0 });
    out.tick(0, 'menu');
    out.tick(1, 'menu', true);
    expect(menu.playing).toBe(true); // never swapped out
    expect(parallelism.playing).toBe(true);
    for (let t = 1.05; t < 1.6; t += 0.05) out.tick(t, 'menu', true);
    expect(menu.volume).toBeCloseTo(0.45, 2);
    expect(parallelism.volume).toBeCloseTo(0.85, 2);
    out.tick(3, 'menu', false);
    for (let t = 3.05; t < 3.6; t += 0.05) out.tick(t, 'menu', false);
    expect(parallelism.playing).toBe(false);
    expect(menu.volume).toBe(1);
    expect(menu.plays).toBe(1);
  });

  it('a wave change during a burst brings the new bed in ducked', () => {
    const menu = bed();
    const doorman = bed();
    const parallelism = bed();
    const beds: Record<string, ReturnType<typeof bed>> = { menu, doorman, parallelism };
    const out = attach(silentCtx(), undefined, (k) => beds[k], { minBedSeconds: 0 });
    out.tick(0, 'menu');
    out.tick(1, 'menu', true);
    out.tick(2, 'doorman', true);
    for (let t = 2.05; t < 3.2; t += 0.05) out.tick(t, 'doorman', true);
    expect(doorman.volume).toBeCloseTo(0.45, 2);
    expect(parallelism.playing).toBe(true);
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
      expect(inspect.volume).toBeLessThan(1);
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
