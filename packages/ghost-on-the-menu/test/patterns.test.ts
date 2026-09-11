import { describe, expect, it } from 'vitest';

import {
  burstActive,
  copiesAt,
  DEFAULT_PATTERNS,
  intensityAt,
  loadPatterns,
  pickLine,
  voiceWaveKey,
} from '../src/patterns';

function clone(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(DEFAULT_PATTERNS)) as Record<string, unknown>;
}

describe('loadPatterns', () => {
  it('accepts the shipped files', () => {
    const set = loadPatterns(clone());
    expect(set.paths.paths.length).toBeGreaterThan(0);
    expect(set.ladder.rungs.map((r) => r.tier).sort()).toEqual([0, 1, 2, 3]);
    expect(set).toEqual(DEFAULT_PATTERNS);
  });

  it('rejects a missing key and a wrong-typed key per file', () => {
    const cases: {
      file: string;
      drop: () => Record<string, unknown>;
      key: string;
      mistype: () => Record<string, unknown>;
    }[] = [
      {
        file: 'paths.json',
        key: 'paths',
        drop: () => {
          const raw = clone();
          delete (raw.paths as Record<string, unknown>).paths;
          return raw;
        },
        mistype: () => {
          const raw = clone();
          (raw.paths as Record<string, unknown>).paths = 0;
          return raw;
        },
      },
      {
        file: 'formations.json',
        key: 'layouts',
        drop: () => {
          const raw = clone();
          delete (raw.formations as Record<string, unknown>).layouts;
          return raw;
        },
        mistype: () => {
          const raw = clone();
          (raw.formations as Record<string, unknown>).layouts = 'grid';
          return raw;
        },
      },
      {
        file: 'formations.json',
        key: 'sprites',
        drop: () => {
          const raw = clone();
          delete (raw.formations as Record<string, unknown>).sprites;
          return raw;
        },
        mistype: () => {
          const raw = clone();
          (raw.formations as Record<string, unknown>).sprites = 0;
          return raw;
        },
      },
      {
        file: 'fire.json',
        key: 'tiers',
        drop: () => {
          const raw = clone();
          delete (raw.fire as Record<string, unknown>).tiers;
          return raw;
        },
        mistype: () => {
          const raw = clone();
          (raw.fire as Record<string, unknown>).tiers = [];
          return raw;
        },
      },
      {
        file: 'bosses.json',
        key: 'whisperer',
        drop: () => {
          const raw = clone();
          delete (raw.bosses as Record<string, unknown>).whisperer;
          return raw;
        },
        mistype: () => {
          const raw = clone();
          (raw.bosses as Record<string, unknown>).whisperer = 0;
          return raw;
        },
      },
      {
        file: 'ladder.json',
        key: 'rungs',
        drop: () => {
          const raw = clone();
          delete (raw.ladder as Record<string, unknown>).rungs;
          return raw;
        },
        mistype: () => {
          const raw = clone();
          (raw.ladder as Record<string, unknown>).rungs = {};
          return raw;
        },
      },
      {
        file: 'waves.json',
        key: 'tiers',
        drop: () => {
          const raw = clone();
          delete (raw.waves as Record<string, unknown>).tiers;
          return raw;
        },
        mistype: () => {
          const raw = clone();
          (raw.waves as Record<string, unknown>).tiers = null;
          return raw;
        },
      },
      {
        file: 'player.json',
        key: 'speed',
        drop: () => {
          const raw = clone();
          delete (raw.player as Record<string, unknown>).speed;
          return raw;
        },
        mistype: () => {
          const raw = clone();
          (raw.player as Record<string, unknown>).speed = 'fast';
          return raw;
        },
      },
      {
        file: 'parallelism.json',
        key: 'tiers',
        drop: () => {
          const raw = clone();
          delete (raw.parallelism as Record<string, unknown>).tiers;
          return raw;
        },
        mistype: () => {
          const raw = clone();
          (raw.parallelism as Record<string, unknown>).tiers = 0;
          return raw;
        },
      },
      {
        file: 'shift.json',
        key: 'climb',
        drop: () => {
          const raw = clone();
          delete (raw.shift as Record<string, unknown>).climb;
          return raw;
        },
        mistype: () => {
          const raw = clone();
          (raw.shift as Record<string, unknown>).climb = [0, 0.5];
          return raw;
        },
      },
    ];
    for (const c of cases) {
      expect(() => loadPatterns(c.drop()), c.file + ' missing').toThrow(
        `patterns/${c.file}: ${c.key}`,
      );
      expect(() => loadPatterns(c.mistype()), c.file + ' typed').toThrow(
        `patterns/${c.file}: ${c.key}`,
      );
    }
  });

  it('tags every path by class and tier with at least three unit points', () => {
    for (const p of DEFAULT_PATTERNS.paths.paths) {
      expect(p.classes.length).toBeGreaterThan(0);
      expect(p.tiers.length).toBeGreaterThan(0);
      expect(p.points.length).toBeGreaterThanOrEqual(3);
      for (const pt of p.points) {
        expect(pt.x).toBeGreaterThanOrEqual(0);
        expect(pt.x).toBeLessThanOrEqual(1);
        expect(pt.y).toBeGreaterThanOrEqual(0);
        expect(pt.y).toBeLessThanOrEqual(1);
      }
    }
  });

  it('keeps formation fire off at tier 0', () => {
    expect(DEFAULT_PATTERNS.fire.tiers['0'].formation).toBeNull();
  });

  it('aims boss fire only on tiers 1 and 2', () => {
    expect(DEFAULT_PATTERNS.fire.tiers['0'].boss.aim).toBe(false);
    expect(DEFAULT_PATTERNS.fire.tiers['1'].boss.aim).toBe(true);
    expect(DEFAULT_PATTERNS.fire.tiers['2'].boss.aim).toBe(true);
    const raw = clone();
    (raw.fire as { tiers: Record<string, { boss: { aim: boolean } }> }).tiers['0']!.boss.aim = true;
    expect(() => loadPatterns(raw)).toThrow('patterns/fire.json: aim');
  });

  it('keeps dives off at tier 0 and on at 1 and 2', () => {
    expect(DEFAULT_PATTERNS.fire.tiers['0'].dive).toBeNull();
    expect(DEFAULT_PATTERNS.fire.tiers['1'].dive).not.toBeNull();
    expect(DEFAULT_PATTERNS.fire.tiers['2'].dive).not.toBeNull();
    const raw = clone();
    (raw.fire as { tiers: Record<string, { dive: unknown }> }).tiers['0']!.dive = {
      period: 1,
      speed: 1,
      depth: 0.5,
    };
    expect(() => loadPatterns(raw)).toThrow('patterns/fire.json: dive');
  });

  it('has ladder rungs 0, 1, 2, 3', () => {
    expect(DEFAULT_PATTERNS.ladder.rungs.map((r) => r.tier).sort()).toEqual([0, 1, 2, 3]);
  });

  it('rejects a pool id that is not a path', () => {
    const raw = clone();
    const rungs = (raw.ladder as { rungs: { pools: string[] }[] }).rungs;
    rungs[0]!.pools.push('no-such-path');
    expect(() => loadPatterns(raw)).toThrow('patterns/ladder.json: pools');
  });

  it('rejects a rung whose pools cover no path for a spawn class', () => {
    const raw = clone();
    const paths = (raw.paths as { paths: { id: string; classes: string[] }[] }).paths;
    const gridIds = new Set(paths.filter((p) => p.classes.includes('grid')).map((p) => p.id));
    const rungs = (raw.ladder as { rungs: { pools: string[] }[] }).rungs;
    rungs[0]!.pools = rungs[0]!.pools.filter((id) => !gridIds.has(id));
    expect(() => loadPatterns(raw)).toThrow('patterns/ladder.json: pools');
  });

  it('covers the answer class in every rung pool', () => {
    for (const rung of DEFAULT_PATTERNS.ladder.rungs) {
      const hit = DEFAULT_PATTERNS.paths.paths.some(
        (p) =>
          rung.pools.includes(p.id) && p.classes.includes('answer') && p.tiers.includes(rung.tier),
      );
      expect(hit, `tier ${rung.tier}`).toBe(true);
    }
    const raw = clone();
    const paths = (raw.paths as { paths: { id: string; classes: string[] }[] }).paths;
    const answerIds = new Set(paths.filter((p) => p.classes.includes('answer')).map((p) => p.id));
    const rungs = (raw.ladder as { rungs: { pools: string[] }[] }).rungs;
    rungs[0]!.pools = rungs[0]!.pools.filter((id) => !answerIds.has(id));
    expect(() => loadPatterns(raw)).toThrow('patterns/ladder.json: pools');
  });

  it('has three bosses with at least two phases and no fact keys', () => {
    for (const kind of ['whisperer', 'menu', 'doorman'] as const) {
      const boss = DEFAULT_PATTERNS.bosses[kind];
      expect(boss.phases.length).toBeGreaterThanOrEqual(2);
      expect(boss.rage).toBeGreaterThan(0);
      expect(boss.rage).toBeLessThanOrEqual(1);
      expect(boss.phases.some((p) => p.motion !== 'slit' && p.motion !== 'hold')).toBe(true);
      for (const phase of boss.phases) {
        expect(phase).not.toHaveProperty('lie');
        expect(phase).not.toHaveProperty('fact');
        expect(phase).not.toHaveProperty('revealed');
        expect(phase).not.toHaveProperty('followed');
      }
    }
    const rawRage = clone();
    (rawRage.bosses as { whisperer: { rage: number } }).whisperer.rage = 0;
    expect(() => loadPatterns(rawRage)).toThrow('patterns/bosses.json: rage');
    const raw = clone();
    const whisperer = (raw.bosses as Record<string, { phases: Record<string, unknown>[] }>)
      .whisperer;
    if (!whisperer) throw new Error('patterns/bosses.json: whisperer');
    whisperer.phases[0]!.lie = true;
    expect(() => loadPatterns(raw)).toThrow('patterns/bosses.json: lie');
  });

  it('loads drops that fall toward the ship and never key on a lie', () => {
    expect(DEFAULT_PATTERNS.drops.lamp.from).toBe('boss');
    expect(DEFAULT_PATTERNS.drops.spread.from).toBe('formation');
    expect(DEFAULT_PATTERNS.drops.spread.duration).toBeGreaterThan(0);
    expect(DEFAULT_PATTERNS.drops.lamp).not.toHaveProperty('lie');
    const raw = clone();
    delete (raw as { drops?: unknown }).drops;
    expect(() => loadPatterns(raw)).toThrow('patterns/drops.json: drops');
    const mistype = clone();
    (mistype.drops as { lamp: unknown }).lamp = 0;
    expect(() => loadPatterns(mistype)).toThrow('patterns/drops.json: lamp');
    const lieKey = clone();
    (lieKey.drops as { lamp: Record<string, unknown> }).lamp.lie = true;
    expect(() => loadPatterns(lieKey)).toThrow('patterns/drops.json: lie');
    const badFrom = clone();
    (badFrom.drops as { lamp: { from: string } }).lamp.from = 'formation';
    expect(() => loadPatterns(badFrom)).toThrow('patterns/drops.json: from');
  });

  it('loads four voice lines per key with no digit or fact word', () => {
    const voice = DEFAULT_PATTERNS.voice;
    for (const key of ['inspect', 'poison', 'rug', 'unlisted'] as const) {
      expect(voice.wave[key].length).toBeGreaterThanOrEqual(4);
    }
    for (const key of ['whisperer', 'menu', 'doorman'] as const) {
      expect(voice.boss[key].length).toBeGreaterThanOrEqual(4);
    }
    expect(voice.end.length).toBeGreaterThanOrEqual(4);
    const forbidden =
      /\d|\b(lie|fact|revealed|followed|held|score|pass|fail|nrp|integrity|utility|cleared|ghost)\b/i;
    for (const line of [
      ...Object.values(voice.wave).flat(),
      ...Object.values(voice.boss).flat(),
      ...voice.end,
    ]) {
      expect(line).not.toMatch(forbidden);
    }
    expect(pickLine(voice.end, 1, 0)).toBe(pickLine(voice.end, 1, 0));
    expect(voiceWaveKey('breather')).toBe('inspect');
    expect(voiceWaveKey('poison')).toBe('poison');
    const raw = clone();
    (raw.voice as { wave: { poison: string[] } }).wave.poison = ['ok', 'ok', 'ok'];
    expect(() => loadPatterns(raw)).toThrow('patterns/voice.json: poison');
    const digit = clone();
    (digit.voice as { end: string[] }).end = ['a', 'b', 'c', 'wave 4'];
    expect(() => loadPatterns(digit)).toThrow('patterns/voice.json: end');
    const fact = clone();
    (fact.voice as { wave: { inspect: string[] } }).wave.inspect = [
      'hello',
      'there',
      'friend',
      'a lie on the wire',
    ];
    expect(() => loadPatterns(fact)).toThrow('patterns/voice.json: inspect');
  });

  it('refuses a shift reach below the wave reach, and a word list that is short, odd or repeated', () => {
    const tier = (raw: Record<string, unknown>) =>
      (
        (raw.parallelism as Record<string, unknown>).tiers as Record<
          string,
          Record<string, unknown>
        >
      )['2']!;
    let raw = clone();
    tier(raw).copiesShift = 2;
    expect(() => loadPatterns(raw)).toThrow('patterns/parallelism.json: copiesShift');
    raw = clone();
    tier(raw).intensityShift = 1;
    expect(() => loadPatterns(raw)).toThrow('patterns/parallelism.json: intensityShift');
    const words = (raw: Record<string, unknown>) =>
      (raw.shift as Record<string, unknown>).words as Record<string, string[]>;
    raw = clone();
    words(raw).even = words(raw).even!.slice(0, 63);
    expect(() => loadPatterns(raw)).toThrow('patterns/shift.json: even');
    raw = clone();
    words(raw).odd![3] = 'sev7n';
    expect(() => loadPatterns(raw)).toThrow('patterns/shift.json: odd');
    raw = clone();
    words(raw).odd![0] = words(raw).even![0]!;
    expect(() => loadPatterns(raw)).toThrow('patterns/shift.json: odd');
  });

  it('loads parallelism rails: off on recorded, longer later, placed by seed', () => {
    expect(DEFAULT_PATTERNS.parallelism.tiers['0'].enabled).toBe(false);
    expect(DEFAULT_PATTERNS.parallelism.tiers['1'].enabled).toBe(true);
    expect(DEFAULT_PATTERNS.parallelism.tiers['2'].copies).toBeGreaterThan(1);
    expect(DEFAULT_PATTERNS.parallelism.tiers['3'].laterBurst).toBeGreaterThan(
      DEFAULT_PATTERNS.parallelism.tiers['3'].firstBurst,
    );
    const spec = DEFAULT_PATTERNS.parallelism.tiers['2'];
    const bounds = [
      { t0: 0, t1: 20 },
      { t0: 22, t1: 42 },
      { t0: 44, t1: 64 },
    ];
    expect(burstActive(1, 0, bounds, 1, DEFAULT_PATTERNS.parallelism.tiers['0'])).toBe(false);
    const hold = (wave: number, seed: number) => {
      let n = 0;
      const b = bounds[wave]!;
      for (let t = b.t0; t < b.t1; t += 0.05) {
        if (burstActive(t, wave, bounds, seed, spec)) n += 1;
      }
      return n;
    };
    expect(hold(0, 7)).toBeGreaterThan(0);
    expect(hold(2, 7)).toBeGreaterThan(hold(0, 7));
    const starts = [1, 99, 404].map((seed) => {
      const b = bounds[0]!;
      for (let t = b.t0; t < b.t1; t += 0.05) {
        if (burstActive(t, 0, bounds, seed, spec)) return t;
      }
      return -1;
    });
    expect(new Set(starts).size).toBeGreaterThan(1);
    const raw = clone();
    (raw.parallelism as { tiers: Record<string, { intensity: number }> }).tiers['1']!.intensity =
      0.5;
    expect(() => loadPatterns(raw)).toThrow('patterns/parallelism.json: intensity');
    const later = clone();
    (later.parallelism as { tiers: Record<string, { copiesLater: number }> }).tiers[
      '1'
    ]!.copiesLater = 1;
    expect(() => loadPatterns(later)).toThrow('patterns/parallelism.json: copiesLater');
    const hot = clone();
    (hot.parallelism as { tiers: Record<string, { intensityLater: number }> }).tiers[
      '2'
    ]!.intensityLater = 0.5;
    expect(() => loadPatterns(hot)).toThrow('patterns/parallelism.json: intensityLater');
    // The multipliers climb by wave: none on the first, all on the last.
    const t1 = DEFAULT_PATTERNS.parallelism.tiers['1'];
    expect(copiesAt(t1, 0, 4)).toBe(t1.copies);
    expect(copiesAt(t1, 3, 4)).toBe(t1.copiesLater);
    expect(intensityAt(t1, 0, 4)).toBe(t1.intensity);
    expect(intensityAt(t1, 3, 4)).toBeCloseTo(t1.intensityLater, 6);
    expect(intensityAt(t1, 1, 4)).toBeGreaterThan(t1.intensity);
    expect(intensityAt(t1, 1, 4)).toBeLessThan(t1.intensityLater);
  });
});

describe('the pilot lever in fire.json', () => {
  type Tiers = Record<
    string,
    { boss: { pilot?: { fan: unknown; spread?: unknown; lean: unknown } } }
  >;

  it('ships a fan, a spread and a lean per tier, thin on the recorded rung', () => {
    expect(DEFAULT_PATTERNS.fire.tiers['0'].boss.pilot).toEqual({ fan: 1, spread: 0, lean: 0 });
    for (const tier of ['1', '2', '3'] as const) {
      const p = DEFAULT_PATTERNS.fire.tiers[tier].boss.pilot;
      expect(p.fan).toBeGreaterThan(1);
      // Wider than the scripted burst, so a pilot fan reads as a wall to weave.
      expect(p.spread).toBeGreaterThan(DEFAULT_PATTERNS.fire.tiers[tier].boss.spread);
      expect(p.lean).toBeGreaterThan(0);
    }
  });

  it('refuses a missing lever, a fan under one, or a negative lean', () => {
    const raw = clone();
    delete (raw.fire as { tiers: Tiers }).tiers['1']!.boss.pilot;
    expect(() => loadPatterns(raw)).toThrow('patterns/fire.json: pilot');
    const fan = clone();
    (fan.fire as { tiers: Tiers }).tiers['1']!.boss.pilot = { fan: 0, spread: 0.3, lean: 10 };
    expect(() => loadPatterns(fan)).toThrow('patterns/fire.json: fan');
    const half = clone();
    (half.fire as { tiers: Tiers }).tiers['1']!.boss.pilot = { fan: 1.5, spread: 0.3, lean: 10 };
    expect(() => loadPatterns(half)).toThrow('patterns/fire.json: fan');
    const wide = clone();
    (wide.fire as { tiers: Tiers }).tiers['1']!.boss.pilot = { fan: 3, spread: 1.5, lean: 10 };
    expect(() => loadPatterns(wide)).toThrow('patterns/fire.json: spread');
    const lean = clone();
    (lean.fire as { tiers: Tiers }).tiers['1']!.boss.pilot = { fan: 3, spread: 0.3, lean: -1 };
    expect(() => loadPatterns(lean)).toThrow('patterns/fire.json: lean');
  });
});
