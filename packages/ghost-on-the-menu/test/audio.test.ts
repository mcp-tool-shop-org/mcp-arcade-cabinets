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
  it('every recorded bed is a song in the pool', () => {
    expect([...BED_POOL].sort()).toEqual([...TRACK_KEYS].sort());
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

// The recorded beds. The Director's plays: 2026-09-11, the music switched
// and restarted too often; 2026-09-16, the beds were cut before their loop
// ended; 2026-09-17, a piece was replaced at every wave and then at every
// boss before it could settle. His rule that evening: a playlist. A piece
// runs to its end, the next is drawn without repeats until the set is
// spent, and no event on the field replaces one.
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

  function bed(duration?: number) {
    const b = {
      loop: true,
      muted: false,
      volume: 1,
      currentTime: 0,
      playbackRate: 1,
      ended: false,
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
    return b;
  }

  it('one song plays through every wave and every boss; nothing on the field changes it', () => {
    const beds: Record<string, ReturnType<typeof bed>> = {};
    for (const k of TRACK_KEYS) beds[k] = bed(120);
    const out = attach(silentCtx(), undefined, (k) => beds[k], { seed: 0 });
    out.tick(0, 'inspect');
    const opening = TRACK_KEYS.find((k) => beds[k]!.playing)!;
    expect(opening).toBeDefined();
    expect(beds[opening]!.loop, 'a song is played once, not looped').toBe(false);
    for (let t = 1; t < 200; t += 1) {
      out.tick(t, t < 40 ? 'poison' : t < 80 ? 'whisperer' : t < 120 ? 'menu' : 'doorman');
    }
    for (const k of TRACK_KEYS) {
      expect(beds[k]!.playing, k).toBe(k === opening);
      expect(beds[k]!.plays, k).toBe(k === opening ? 1 : 0);
    }
  });

  it('draws the next song when the playing one ends, from the shell bag when there is one', () => {
    const beds: Record<string, ReturnType<typeof bed>> = {};
    for (const k of TRACK_KEYS) beds[k] = bed(120);
    const drawn: string[] = [];
    const order = ['rug', 'breather', 'doorman'];
    const out = attach(silentCtx(), undefined, (k) => beds[k], {
      nextBed: () => {
        const key = order[drawn.length % order.length]!;
        drawn.push(key);
        return beds[key];
      },
    });
    out.tick(0, 'inspect');
    expect(drawn).toEqual(['rug']);
    expect(beds.rug!.playing).toBe(true);
    for (let t = 1; t < 30; t += 1) out.tick(t, 'whisperer');
    expect(drawn, 'a boss drew nothing').toEqual(['rug']);
    beds.rug!.ended = true;
    out.tick(30, 'whisperer');
    expect(drawn).toEqual(['rug', 'breather']);
    expect(beds.breather!.playing).toBe(true);
    for (let t = 30.05; t < 31.2; t += 0.05) out.tick(t, 'whisperer');
    expect(beds.rug!.playing, 'the ended song is faded out under the next').toBe(false);
    expect(beds.breather!.volume).toBe(BED_LEVEL);
  });

  it('with no bag the pool rotates from the seed, and a song that comes round again starts from its top', () => {
    const beds: Record<string, ReturnType<typeof bed>> = {};
    for (const k of TRACK_KEYS) beds[k] = bed(120);
    const out = attach(silentCtx(), undefined, (k) => beds[k], { seed: 2 });
    out.tick(0, 'inspect');
    const first = BED_POOL[2 % BED_POOL.length]!;
    expect(beds[first]!.playing).toBe(true);
    beds[first]!.ended = true;
    beds[first]!.currentTime = 120;
    out.tick(1, 'inspect');
    const second = BED_POOL[3 % BED_POOL.length]!;
    expect(beds[second]!.playing).toBe(true);
    // Round the whole pool and back to the first: from the top, not from its end.
    for (let n = 4; n < 4 + BED_POOL.length - 1; n += 1) {
      const key = BED_POOL[(n - 1) % BED_POOL.length]!;
      beds[key]!.ended = true;
      out.tick(n, 'inspect');
    }
    expect(beds[first]!.plays).toBe(2);
    expect(beds[first]!.currentTime).toBe(0);
  });

  it('the opening is the seed draw, whatever the wave kind, so two seeds open on two songs', () => {
    const beds: Record<string, ReturnType<typeof bed>> = {};
    for (const k of TRACK_KEYS) beds[k] = bed();
    const a = attach(silentCtx(), undefined, (k) => beds[k], { seed: 2 });
    a.tick(0, 'inspect');
    const more: Record<string, ReturnType<typeof bed>> = {};
    for (const k of TRACK_KEYS) more[k] = bed();
    const b = attach(silentCtx(), undefined, (k) => more[k], { seed: 3 });
    b.tick(0, 'inspect');
    const openedA = TRACK_KEYS.filter((k) => beds[k]!.playing);
    const openedB = TRACK_KEYS.filter((k) => more[k]!.playing);
    expect(openedA).toHaveLength(1);
    expect(openedB).toHaveLength(1);
    expect(openedA).not.toEqual(openedB);
  });

  it('skips a song with no file and opens on the next the pool has', () => {
    const beds: Record<string, ReturnType<typeof bed>> = {};
    for (const k of ['poison', 'rug', 'unlisted']) beds[k] = bed();
    // seed 0 is 'inspect', which has no file here: the next song with one opens.
    const out = attach(silentCtx(), undefined, (k) => beds[k], { seed: 0 });
    out.tick(0, 'inspect');
    expect(beds.poison!.playing).toBe(true);
  });

  it('with a bag that hands back nothing the chiptune plays, and a song takes over when one comes', () => {
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
    const song = bed(120);
    let have = false;
    const out = attach(ctx as unknown as Parameters<typeof attach>[0], undefined, () => song, {
      nextBed: () => (have ? song : undefined),
    });
    out.tick(0, 'inspect');
    expect(started.length).toBeGreaterThan(0);
    expect(song.playing).toBe(false);
    have = true;
    const before = started.length;
    out.tick(1, 'inspect');
    expect(song.playing).toBe(true);
    for (let t = 1.05; t < 3; t += 0.05) out.tick(t, 'inspect');
    expect(started.length).toBe(before);
  });

  it('setMuted mutes every live recorded bed, including the leaving one', () => {
    const inspect = bed();
    const whisperer = bed();
    const beds: Record<string, ReturnType<typeof bed>> = { inspect, whisperer };
    const order = [inspect, whisperer];
    const out = attach(silentCtx(), undefined, (k) => beds[k], {
      nextBed: () => order.shift(),
    });
    out.tick(0, 'inspect');
    expect(inspect.playing).toBe(true);
    inspect.ended = true;
    out.tick(8, 'inspect');
    expect(whisperer.playing).toBe(true);
    expect(inspect.playing).toBe(true);
    out.setMuted(true);
    expect(inspect.muted).toBe(true);
    expect(whisperer.muted).toBe(true);
    for (let t = 8.05; t < 9.2; t += 0.05) out.tick(t, 'inspect');
    expect(inspect.muted).toBe(true);
    expect(whisperer.muted).toBe(true);
  });

  it('a burst speeds the playing song up over a ramp and lets it back down; nothing else plays', () => {
    const menu = bed();
    const parallelism = bed();
    const beds: Record<string, ReturnType<typeof bed>> = { menu, parallelism };
    const out = attach(silentCtx(), undefined, (k) => beds[k], { pool: ['menu'] });
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

  it('a song that ends during a burst hands the burst rate to the next', () => {
    const menu = bed();
    const doorman = bed();
    const beds: Record<string, ReturnType<typeof bed>> = { menu, doorman };
    const out = attach(silentCtx(), undefined, (k) => beds[k], { pool: ['menu', 'doorman'] });
    out.tick(0, 'menu');
    for (let t = 0.05; t < 1.5; t += 0.05) out.tick(t, 'menu', true);
    menu.ended = true;
    out.tick(2, 'doorman', true);
    expect(doorman.playbackRate).toBeCloseTo(BURST_RATE, 5);
    for (let t = 2.05; t < 3.2; t += 0.05) out.tick(t, 'doorman', true);
    expect(menu.playing).toBe(false);
    expect(menu.playbackRate).toBe(1);
  });

  it('carries the song across a restart or the next tape, and a seed only sets an opening', () => {
    const beds: Record<string, ReturnType<typeof bed>> = {};
    for (const k of BED_POOL) beds[k] = bed(120);
    const out = attach(silentCtx(), undefined, (k) => beds[k], { seed: 0 });
    out.tick(0, 'inspect');
    const opening = BED_POOL.find((k) => beds[k]!.playing)!;
    for (let t = 1; t < 7; t += 1) out.tick(t, 'inspect');
    out.seed(3); // a song is playing: ignored
    // The next tape: the round clock goes back to zero; the song plays on.
    out.end(true);
    out.tick(0, 'inspect');
    expect(beds[opening]!.playing).toBe(true);
    expect(beds[opening]!.plays).toBe(1);
    for (let t = 1; t < 4; t += 1) out.tick(t, 'poison');
    expect(BED_POOL.filter((k) => beds[k]!.playing)).toEqual([opening]);
  });

  it('the scene between two tapes keeps the song and drops the burst; back to the cabinets fades it', () => {
    vi.useFakeTimers();
    try {
      const inspect = bed();
      const beds: Record<string, ReturnType<typeof bed>> = { inspect };
      const out = attach(silentCtx(), undefined, (k) => beds[k], { pool: ['inspect'] });
      out.tick(0, 'inspect');
      for (let t = 0.05; t < 2; t += 0.05) out.tick(t, 'inspect', true);
      expect(inspect.playbackRate).toBeCloseTo(BURST_RATE, 5);
      out.end(true);
      vi.advanceTimersByTime(END_FADE_S * 1000 + 100);
      expect(inspect.playing, 'the song left at the scene').toBe(true);
      expect(inspect.volume).toBe(BED_LEVEL);
      expect(inspect.playbackRate).toBe(1);
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

  it('a piece that ends during the scene is followed at once, not at the next tick', () => {
    const beds: Record<string, ReturnType<typeof bed>> = {};
    for (const k of BED_POOL) beds[k] = bed(120);
    const out = attach(silentCtx(), undefined, (k) => beds[k], { seed: 0 });
    out.tick(0, 'inspect');
    const first = BED_POOL.find((k) => beds[k]!.playing)!;
    out.end(true);
    beds[first]!.ended = true;
    out.keep();
    const now = BED_POOL.filter((k) => beds[k]!.playing && !beds[k]!.ended);
    expect(now).toHaveLength(1);
    expect(now[0]).not.toBe(first);
    // Nothing to do while the piece still plays, and nothing after leaving.
    out.keep();
    expect(BED_POOL.filter((k) => beds[k]!.playing && !beds[k]!.ended)).toEqual(now);
    out.end();
    beds[now[0]!]!.ended = true;
    out.keep();
    expect(BED_POOL.filter((k) => beds[k]!.playing && !beds[k]!.ended)).toEqual([]);
  });

  it('a restart during END_FADE_S keeps the new song playing when leftover end timers fire', () => {
    vi.useFakeTimers();
    try {
      const inspect = bed();
      const beds: Record<string, ReturnType<typeof bed>> = { inspect };
      const out = attach(silentCtx(), undefined, (k) => beds[k], { pool: ['inspect'] });
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
  // the chiptune for it, and the only other sign was an unhandled rejection
  // in the console.
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
      pool: ['inspect'],
      onBedFail: (b) => told.push(b),
    });
    out.tick(0, 'inspect');
    expect(started.length, 'the chiptune was silenced for the bed').toBe(0);
    await Promise.resolve();
    await Promise.resolve();
    expect(told, 'the shell was never told, so its status word stays wrong').toEqual([refused]);
    expect(refused.playing).toBe(false);
    expect(refused.volume).toBe(0);
    // And the very next frame plays the bar.
    out.tick(0.05, 'inspect');
    expect(
      started.length,
      'the cabinet stayed silent behind a bed that is not playing',
    ).toBeGreaterThan(0);
  });

  // Stage C. Under the playlist, two things the score did behind the player's
  // back: it re-adopted a song the browser had already refused whenever the
  // shell's bag came round to it again, and it kept spending songs out of that
  // bag while the cabinet was muted.
  describe('the playlist under a refusal and under a mute', () => {
    it('does not re-adopt a song the browser has refused, even from the bag', () => {
      // A bag re-serves every element once it empties and refills. A refused
      // one was adopted again, the tick said it had a bed and silenced the
      // chiptune, and the rejection landed a microtask later and handed the
      // round back: one dropout per redraw, and with a short bag a stutter.
      const bad = bed();
      bad.play = () => Promise.reject(new Error('autoplay'));
      const good = bed(120);
      const order = [bad, bad, good];
      let at = 0;
      const failed: { key: string | null }[] = [];
      const out = attach(silentCtx(), undefined, () => undefined, {
        pool: [],
        nextBed: () => {
          const b = order[Math.min(at++, order.length - 1)]!;
          return { bed: b, key: b === bad ? 'refused-one' : 'good-one' };
        },
        onBedFail: (_b, key) => failed.push({ key }),
      });
      out.tick(0, 'inspect');
      return Promise.resolve().then(() => {
        // The refusal is reported WITH the key, so the shell can drop that song
        // from its own bag instead of reverse-mapping the element's identity.
        expect(failed.map((f) => f.key)).toContain('refused-one');
        out.tick(1, 'inspect');
        expect(bad.playing).toBe(false);
        expect(good.playing).toBe(true);
      });
    });

    it('pauses the song on mute and resumes it where it left off', () => {
      const song = bed(120);
      let draws = 0;
      const out = attach(silentCtx(), undefined, () => undefined, {
        pool: [],
        nextBed: () => {
          draws += 1;
          return song;
        },
      });
      out.tick(0, 'inspect');
      expect(song.playing).toBe(true);
      const drawnBefore = draws;
      out.setMuted(true);
      expect(song.playing).toBe(false);
      // Muted, the element is paused, so it never ends, so nothing is drawn and
      // no song is spent out of the bag while nobody can hear it.
      song.ended = true;
      for (let t = 1; t < 20; t += 0.5) out.tick(t, 'inspect');
      expect(draws).toBe(drawnBefore);
      song.ended = false;
      out.setMuted(false);
      expect(song.playing).toBe(true);
      expect(draws).toBe(drawnBefore);
    });
  });
});

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
