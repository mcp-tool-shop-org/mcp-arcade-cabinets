import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  attach,
  bar,
  barSeconds,
  BED_LEVEL,
  BED_ENTRY_S,
  BED_MAX_S,
  BED_MIN_S,
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
  it('holds a bed for one loop, thirty to forty-five seconds', () => {
    expect(BED_MIN_S).toBeGreaterThanOrEqual(30);
    expect(BED_MIN_S).toBeLessThanOrEqual(45);
  });
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

  it('a boss bed comes at once, hold or no hold, and the wave bed after it waits out the hold', () => {
    const inspect = bed();
    const whisperer = bed();
    const menu = bed();
    const beds: Record<string, ReturnType<typeof bed>> = { inspect, whisperer, menu };
    const out = attach(silentCtx(), undefined, (k) => beds[k], { minBedSeconds: 60, seed: 0 });
    out.tick(0, 'inspect');
    for (let t = 1; t < 18; t += 1) out.tick(t, 'inspect');
    expect(inspect.playing).toBe(true);
    // A boss is a scene change: its bed does not wait for the verse to end.
    out.tick(18, 'whisperer');
    expect(whisperer.playing).toBe(true);
    for (let t = 18.05; t < 19.5; t += 0.05) out.tick(t, 'whisperer');
    expect(inspect.playing).toBe(false);
    expect(whisperer.volume).toBe(BED_LEVEL);
    // Another boss: at once as well.
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

  it('opens on the pool bed the seed draws, whatever the wave kind, so two seeds open on two pieces', () => {
    const beds: Record<string, ReturnType<typeof bed>> = {};
    for (const k of [...BED_POOL, 'whisperer']) beds[k] = bed();
    // Every tape's first wave is inspect; the opening must not be inspect.mp3 every time.
    const a = attach(silentCtx(), undefined, (k) => beds[k], { minBedSeconds: 60, seed: 2 });
    a.tick(0, 'inspect');
    expect(beds.poison!.playing).toBe(true);
    expect(beds.inspect!.playing).toBe(false);
    const more: Record<string, ReturnType<typeof bed>> = {};
    for (const k of [...BED_POOL, 'whisperer']) more[k] = bed();
    const b = attach(silentCtx(), undefined, (k) => more[k], { minBedSeconds: 60, seed: 3 });
    b.tick(0, 'inspect');
    expect(more.rug!.playing).toBe(true);
    expect(more.inspect!.playing).toBe(false);
  });

  it('plays a named TRACK_KEYS bed as itself at a wave change after the hold, and a boss bed at the opening', () => {
    const beds: Record<string, ReturnType<typeof bed>> = {};
    for (const k of [...BED_POOL, 'whisperer']) beds[k] = bed();
    const out = attach(silentCtx(), undefined, (k) => beds[k], { minBedSeconds: 0, seed: 0 });
    out.tick(0, 'inspect');
    expect(beds.inspect!.playing).toBe(true);
    out.tick(1, 'poison');
    expect(beds.poison!.playing).toBe(true);
    const boss: Record<string, ReturnType<typeof bed>> = {};
    for (const k of [...BED_POOL, 'whisperer']) boss[k] = bed();
    const open = attach(silentCtx(), undefined, (k) => boss[k], { minBedSeconds: 60, seed: 2 });
    open.tick(0, 'whisperer');
    expect(boss.whisperer!.playing).toBe(true);
    expect(boss.poison!.playing).toBe(false);
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

  it('keeps a named wave bed through the hold; a boss key comes at once and the wave after it waits', () => {
    const beds: Record<string, ReturnType<typeof bed>> = {};
    for (const k of [...BED_POOL, 'whisperer']) beds[k] = bed();
    const out = attach(silentCtx(), undefined, (k) => beds[k], { minBedSeconds: 10, seed: 0 });
    out.tick(0, 'inspect');
    expect(beds.inspect!.playing).toBe(true);
    for (let t = 1; t < 5; t += 1) out.tick(t, 'poison');
    // A wave change inside the hold: the opening bed keeps the level.
    expect(beds.poison!.playing).toBe(false);
    expect(beds.inspect!.playing).toBe(true);
    out.tick(5, 'whisperer');
    expect(beds.whisperer!.playing).toBe(true);
    for (let t = 5.05; t < 6.2; t += 0.05) out.tick(t, 'whisperer');
    expect(beds.whisperer!.volume).toBe(BED_LEVEL);
    // The wave after the boss waits out the boss bed's own hold.
    out.tick(7, 'poison');
    expect(beds.whisperer!.playing).toBe(true);
    expect(beds.poison!.playing).toBe(false);
    out.tick(15.5, 'poison');
    expect(beds.poison!.playing).toBe(true);
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

  // The Director heard beds that do not start at all. Autoplay policy does not
  // throw: `play()` REJECTS, and a rejection nobody caught left an element
  // that is not playing sitting in `currentBed` — so the round kept silencing
  // the chiptune for it, for the whole hold, and the only other sign was an
  // unhandled rejection in the console.
  it('hands the round back to the chiptune when the browser refuses to play a bed', async () => {
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
    const refused = {
      ...bed(),
      play(): Promise<void> {
        this.plays += 1;
        return Promise.reject(new Error('NotAllowedError'));
      },
    };
    const told: unknown[] = [];
    const out = attach(ctx as unknown as Parameters<typeof attach>[0], undefined, () => refused, {
      minBedSeconds: 60,
      onBedFail: (b) => told.push(b),
    });
    out.tick(0, 'inspect');
    expect(started.length, 'the chiptune was silenced for the bed').toBe(0);
    await Promise.resolve();
    await Promise.resolve();
    expect(told, 'the shell was never told, so its status word stays wrong').toEqual([refused]);
    expect(refused.playing).toBe(false);
    expect(refused.volume).toBe(0);
    // And the very next frame, well inside the hold, plays the bar.
    out.tick(0.05, 'inspect');
    expect(
      started.length,
      'the cabinet stayed silent behind a bed that is not playing',
    ).toBeGreaterThan(0);
  });
});

// The Director's read, 2026-09-16: the beds cut off too soon. Measured
// lengths were inspect 36.0, whisperer/menu/doorman 40.0, poison/rug/unlisted
// 36.0, breather 32.0 s, and the hold was a flat 36, so the three 40 s beds
// were faded four seconds before their loop ended and a 36 s bed was faded as
// it restarted. A bed now holds for its OWN length; 36 stays as the floor for
// a bed that cannot say how long it is. The music pass is lengthening these
// files, so the hold must follow the file, never a constant.
describe('a bed plays through whole before a wave change may move it', () => {
  const ctx = () =>
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

  function bed(duration?: number) {
    return {
      loop: false,
      muted: false,
      volume: 1,
      currentTime: 0,
      playbackRate: 1,
      playing: false,
      plays: 0,
      ...(duration === undefined ? {} : { duration }),
      play() {
        this.playing = true;
        this.plays += 1;
      },
      pause() {
        this.playing = false;
      },
    };
  }

  it('does not give way at 36 when the file is 40 seconds long: a short piece plays out whole', () => {
    const inspect = bed(40);
    const poison = bed(40);
    const beds: Record<string, ReturnType<typeof bed>> = { inspect, poison };
    const out = attach(ctx(), undefined, (k) => beds[k]);
    out.tick(0, 'inspect');
    out.tick(BED_MIN_S, 'poison');
    expect(poison.playing, 'the 40 s loop was cut at 36').toBe(false);
    expect(inspect.playing).toBe(true);
    out.tick(40.1, 'poison');
    expect(poison.playing, 'the 40 s loop never gave way at 40').toBe(true);
  });

  it('gives way at 32 when the file is 32 seconds long', () => {
    const inspect = bed(32);
    const poison = bed(32);
    const beds: Record<string, ReturnType<typeof bed>> = { inspect, poison };
    const out = attach(ctx(), undefined, (k) => beds[k]);
    out.tick(0, 'inspect');
    out.tick(31, 'poison');
    expect(poison.playing).toBe(false);
    out.tick(32.1, 'poison');
    expect(poison.playing, 'a 32 s loop was held to 36').toBe(true);
  });

  // A two-minute piece plays through before a wave change may move it. For
  // one evening a long piece held only a verse (BED_MIN_S) so a wave bed
  // could be heard inside a short round; the Director heard that as every
  // bed ending after thirty or forty seconds (2026-09-17), and the boss bed
  // at once is the only mid-piece change he kept.
  it('holds a two-minute piece for its whole length at a wave change', () => {
    const inspect = bed(120);
    const poison = bed(120);
    const beds: Record<string, ReturnType<typeof bed>> = { inspect, poison };
    const out = attach(ctx(), undefined, (k) => beds[k]);
    out.tick(0, 'inspect');
    out.tick(BED_MIN_S + 0.1, 'poison');
    expect(poison.playing, 'the two-minute bed gave way after a verse').toBe(false);
    out.tick(119, 'poison');
    expect(poison.playing).toBe(false);
    out.tick(120.1, 'poison');
    expect(poison.playing, 'the two-minute bed never gave way').toBe(true);
  });

  it('holds BED_MAX_S, not the header, when a file reports an impossible length', () => {
    const inspect = bed(36000);
    const poison = bed(36000);
    const beds: Record<string, ReturnType<typeof bed>> = { inspect, poison };
    const out = attach(ctx(), undefined, (k) => beds[k]);
    out.tick(0, 'inspect');
    out.tick(BED_MAX_S - 1, 'poison');
    expect(poison.playing).toBe(false);
    out.tick(BED_MAX_S + 0.1, 'poison');
    expect(poison.playing, 'a ten-hour header held the round').toBe(true);
    // And the cap is long enough for the beds the cabinet actually ships.
    expect(BED_MAX_S).toBeGreaterThan(130);
  });

  it('falls back to BED_MIN_S when a bed has no duration', () => {
    const inspect = bed();
    const poison = bed();
    const beds: Record<string, ReturnType<typeof bed>> = { inspect, poison };
    const out = attach(ctx(), undefined, (k) => beds[k]);
    out.tick(0, 'inspect');
    out.tick(BED_MIN_S - 1, 'poison');
    expect(poison.playing).toBe(false);
    out.tick(BED_MIN_S + 0.1, 'poison');
    expect(poison.playing).toBe(true);
  });

  // A boss bed comes at once and lasts a boss; opened on its silent intro it
  // read as no music at all (the Director, 2026-09-17). A bed that names an
  // entry starts there; one that does not starts at the top.
  it('starts a bed from its entry when it names one', () => {
    const inspect = bed(120);
    const whisperer = { ...bed(112), entry: 8 };
    const beds: Record<string, ReturnType<typeof bed>> = { inspect, whisperer };
    const out = attach(ctx(), undefined, (k) => beds[k]);
    out.tick(0, 'inspect');
    expect(inspect.currentTime).toBe(0);
    out.tick(5, 'whisperer');
    expect(whisperer.playing).toBe(true);
    expect(whisperer.currentTime).toBe(8);
    expect(BED_ENTRY_S.whisperer).toBeGreaterThan(0);
    expect(BED_ENTRY_S.inspect).toBeUndefined();
  });

  it('carries the hold across a round restart, measured against the file length', () => {
    const inspect = bed(40);
    const poison = bed(40);
    const beds: Record<string, ReturnType<typeof bed>> = { inspect, poison };
    const out = attach(ctx(), undefined, (k) => beds[k]);
    out.tick(0, 'inspect');
    for (let t = 1; t <= 20; t += 1) out.tick(t, 'inspect');
    // The next call of a shift: the round clock goes back to zero.
    out.tick(0, 'inspect');
    expect(inspect.plays, 'the bed restarted instead of carrying').toBe(1);
    out.tick(10, 'poison');
    expect(poison.playing, 'the carried hold was dropped').toBe(false);
    out.tick(20.5, 'poison');
    expect(poison.playing, 'the carried hold never ran out').toBe(true);
  });
});

// schedule() pushed every oscillator it created onto the caller's array, and
// sfxOscs is emptied only by silenceSfx (mute or close). Every player shot
// fires the 'fire' cue, so an unmuted two-to-three-minute round retained on
// the order of a thousand stopped oscillators and their gain nodes, then
// walked all of them at mute.
describe('finished oscillators do not pile up', () => {
  it('keeps only what is still sounding', () => {
    let disconnects = 0;
    let created = 0;
    const ctx = {
      currentTime: 0,
      destination: {} as AudioNode,
      createOscillator: () => {
        created += 1;
        return {
          type: 'sine',
          frequency: { value: 0 },
          connect() {},
          start() {},
          stop() {},
          disconnect() {
            disconnects += 1;
          },
        } as unknown as OscillatorNode;
      },
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
    const out = attach(ctx as unknown as Parameters<typeof attach>[0]);
    const shots = 200;
    for (let i = 0; i < shots; i++) {
      // A second between shots: every earlier voice has stopped by now.
      ctx.currentTime = i;
      out.play('fire');
    }
    const perShot = sfx('fire').length;
    expect(created).toBe(shots * perShot);
    out.setMuted(true);
    expect(disconnects, 'the whole round was retained').toBeLessThanOrEqual(perShot);
  });
});
