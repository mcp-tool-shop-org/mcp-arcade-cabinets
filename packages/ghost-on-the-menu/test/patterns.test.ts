import { describe, expect, it } from 'vitest';

import {
  burstActive,
  copiesAt,
  DEFAULT_PATTERNS,
  intensityAt,
  loadPatterns,
  emptyLineBag,
  nextBagLine,
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

  it('gives every spawn class a unique formations.json box', () => {
    const sprites = DEFAULT_PATTERNS.formations.sprites as Record<string, { w: number; h: number }>;
    const shipped = ['init', 'ready', 'menu', 'grid', 'answer', 'obstacle', 'stall', 'error'];
    const neu = ['probe', 'shelf', 'ledger'];
    for (const cls of neu) expect(sprites[cls], cls).toBeDefined();
    const extra = Object.keys(sprites).filter((k) => !shipped.includes(k));
    expect(extra.sort()).toEqual(expect.arrayContaining([...neu].sort()));
    expect(extra.length, extra.join(', ')).toBeLessThanOrEqual(4);
    const byBox = new Map<string, string[]>();
    for (const [cls, box] of Object.entries(sprites)) {
      const sig = `${box.w}x${box.h}`;
      byBox.set(sig, [...(byBox.get(sig) ?? []), cls]);
    }
    for (const cls of neu) {
      const box = sprites[cls]!;
      const sig = `${box.w}x${box.h}`;
      expect(byBox.get(sig), `${cls} shares ${sig}`).toEqual([cls]);
    }
    const gridSig = `${sprites.grid!.w}x${sprites.grid!.h}`;
    expect(
      neu.some((c) => `${sprites[c]!.w}x${sprites[c]!.h}` === gridSig),
      'new class shares the grid box',
    ).toBe(false);
  });

  it('covers probe, shelf, and ledger in every rung pool', () => {
    for (const cls of ['probe', 'shelf', 'ledger'] as const) {
      for (const rung of DEFAULT_PATTERNS.ladder.rungs) {
        const hit = DEFAULT_PATTERNS.paths.paths.some(
          (p) =>
            rung.pools.includes(p.id) &&
            (p.classes as string[]).includes(cls) &&
            p.tiers.includes(rung.tier),
        );
        expect(hit, `${cls} tier ${rung.tier}`).toBe(true);
      }
    }
  });

  it('has every boss kind with two phases, a vulnerable phase, unique fire+cue, and a body twice fodder', () => {
    const bosses = DEFAULT_PATTERNS.bosses as Record<
      string,
      (typeof DEFAULT_PATTERNS.bosses)['whisperer']
    >;
    const kinds = Object.keys(bosses);
    expect(kinds).toContain('archivist');
    const fodder = DEFAULT_PATTERNS.formations.sprites.grid;
    const windups: string[] = [];
    const fireCue: string[] = [];
    for (const kind of kinds) {
      const boss = bosses[kind]!;
      expect(boss.phases.length, kind).toBeGreaterThanOrEqual(2);
      expect(boss.rage).toBeGreaterThan(0);
      expect(boss.rage).toBeLessThanOrEqual(1);
      expect(
        boss.phases.some((p) => p.motion !== 'slit' && p.motion !== 'hold'),
        `${kind} vulnerable`,
      ).toBe(true);
      expect(boss.w * boss.h, kind).toBeGreaterThanOrEqual(2 * fodder.w * fodder.h);
      for (const phase of boss.phases) {
        expect(phase).not.toHaveProperty('lie');
        expect(phase).not.toHaveProperty('fact');
        expect(phase).not.toHaveProperty('revealed');
        expect(phase).not.toHaveProperty('followed');
      }
      const first = boss.phases[0]!;
      windups.push(`${first.motion}:${first.fire}:${first.cue}`);
      fireCue.push(
        boss.phases
          .map((p) => `${p.fire}+${p.cue}`)
          .sort()
          .join(';'),
      );
    }
    expect(new Set(windups).size, windups.join(' | ')).toBe(kinds.length);
    expect(new Set(fireCue).size, fireCue.join(' | ')).toBe(kinds.length);
    const archivist = bosses.archivist!;
    expect(archivist.w).toBeGreaterThanOrEqual(2 * fodder.w);
    expect(archivist.h).toBeGreaterThanOrEqual(2 * fodder.h);
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
    for (const key of Object.keys(voice.boss) as (keyof typeof voice.boss)[]) {
      expect(voice.boss[key].length, String(key)).toBeGreaterThanOrEqual(4);
    }
    expect(Object.keys(voice.boss)).toContain('archivist');
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
    for (const key of ['inspect', 'poison', 'rug', 'unlisted'] as const) {
      expect(voice.aside[key].length, key).toBeGreaterThanOrEqual(16);
      expect(new Set(voice.aside[key]).size).toBe(voice.aside[key].length);
    }
    const bag = emptyLineBag();
    const sample = voice.aside.inspect;
    const walked = new Set<string>();
    for (let i = 0; i < sample.length; i++) walked.add(nextBagLine(sample, bag, 11, 3));
    expect(walked.size).toBe(sample.length);
    const a = emptyLineBag();
    const b = emptyLineBag();
    const seqA = Array.from({ length: sample.length }, () => nextBagLine(sample, a, 11, 3));
    const seqB = Array.from({ length: sample.length }, () => nextBagLine(sample, b, 11, 3));
    expect(seqA).toEqual(seqB);
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

  it('loads four flavors with unique roles and refuses a missing, repeated, or trough-as-peak role', () => {
    const flavors = (
      DEFAULT_PATTERNS.shift as typeof DEFAULT_PATTERNS.shift & {
        flavors: { role: string }[];
      }
    ).flavors;
    expect(flavors).toHaveLength(DEFAULT_PATTERNS.shift.length);
    const roles = flavors.map((f) => f.role);
    expect(new Set(roles).size).toBe(roles.length);
    expect(roles[2]).toBe('trough');
    expect(roles[3]).toBe('peak');
    const missing = clone();
    delete (missing.shift as Record<string, unknown>).flavors;
    expect(() => loadPatterns(missing)).toThrow('patterns/shift.json: flavors');
    const noRole = clone();
    const noRoleFlavors = (noRole.shift as { flavors: Record<string, unknown>[] }).flavors;
    delete noRoleFlavors[0]!.role;
    expect(() => loadPatterns(noRole)).toThrow('patterns/shift.json: role');
    const repeated = clone();
    const repeatedFlavors = (repeated.shift as { flavors: { role: string }[] }).flavors;
    repeatedFlavors[1]!.role = repeatedFlavors[0]!.role;
    expect(() => loadPatterns(repeated)).toThrow('patterns/shift.json: role');
    const troughPeak = clone();
    const troughFlavors = (troughPeak.shift as { flavors: { role: string }[] }).flavors;
    troughFlavors[2]!.role = 'peak';
    expect(() => loadPatterns(troughPeak)).toThrow('patterns/shift.json: role');
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
    expect(DEFAULT_PATTERNS.fire.tiers['0'].boss.pilot).toMatchObject({
      fan: 1,
      spread: 0,
      lean: 0,
    });
    expect(DEFAULT_PATTERNS.fire.tiers['0'].boss.pilot.cadence).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_PATTERNS.fire.tiers['0'].boss.pilot.lookAhead).toBeGreaterThanOrEqual(1);
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

// SPAWN_CLASSES was annotated `readonly SpriteClass[]`, so the indexed-access
// type widened to the whole union and the sprite box map claimed a `fog`
// entry loadFormations never writes. `sprites.fog` was undefined at runtime
// while typed non-optional, and only the hand-written fog guard in spriteBox
// kept a property-of-undefined crash away. The `@ts-expect-error` below is
// the gate: with the map widened again it has nothing to suppress and the
// typecheck goes red.
describe('the sprite box map', () => {
  it('is typed at exactly the classes that spawn, fog excluded', () => {
    const sprites = DEFAULT_PATTERNS.formations.sprites;
    // @ts-expect-error fog becomes a FogBank, never a box; the map has no entry.
    expect(sprites.fog).toBeUndefined();
    expect(Object.keys(sprites)).not.toContain('fog');
    expect(Object.keys(sprites)).toHaveLength(11);
  });
});

// The formation's answer (2026-09-17, the Director: "only the boss attacks").
// Measured with the levers as they shipped: a player holding fire killed
// eighteen of twenty-seven sprites on their entry paths, six ever hovered,
// and the formation fired zero to six shots in a seat round. These are the
// levers that change it, each optional so a rhythm without them reads as it
// always did.
describe('the formation fire levers', () => {
  type FireRaw = { tiers: Record<string, { formation: Record<string, unknown> }> };
  type LadderRaw = { rungs: Record<string, unknown>[] };

  it('reads onEntry, shooters and firstShot, with the shipped defaults when absent', () => {
    const raw = clone();
    const tiers = (raw.fire as FireRaw).tiers;
    delete tiers['1']!.formation.onEntry;
    delete tiers['1']!.formation.shooters;
    delete tiers['1']!.formation.firstShot;
    const set = loadPatterns(raw);
    const f = set.fire.tiers['1'].formation!;
    expect(f.onEntry).toBe(false);
    expect(f.shooters).toEqual(['grid', 'menu']);
    expect(f.firstShot).toBe(1);
    tiers['2']!.formation.onEntry = true;
    tiers['2']!.formation.shooters = ['ready', 'answer'];
    tiers['2']!.formation.firstShot = 0.25;
    const g = loadPatterns(raw).fire.tiers['2'].formation!;
    expect(g.onEntry).toBe(true);
    expect(g.shooters).toEqual(['ready', 'answer']);
    expect(g.firstShot).toBe(0.25);
  });

  it('refuses a first shot outside (0, 1], a shooter that is not a spawn class, and an empty list', () => {
    for (const firstShot of [0, 1.5, -1]) {
      const raw = clone();
      (raw.fire as FireRaw).tiers['1']!.formation.firstShot = firstShot;
      expect(() => loadPatterns(raw), String(firstShot)).toThrow('patterns/fire.json: firstShot');
    }
    for (const shooters of [['fog'], ['grid', 'boss'], []]) {
      const raw = clone();
      (raw.fire as FireRaw).tiers['1']!.formation.shooters = shooters;
      expect(() => loadPatterns(raw), shooters.join()).toThrow('patterns/fire.json: shooters');
    }
  });

  it("reads a rung cap on the ship's shots in flight, null or absent for none", () => {
    const raw = clone();
    const rungs = (raw.ladder as LadderRaw).rungs;
    // As shipped: seat holds three shots in the air, live two (Galaga's rule);
    // the recorded rung and hardcore say nothing.
    const set = loadPatterns(raw);
    for (const r of set.ladder.rungs) {
      if (r.tier === 1 || r.tier === 2) expect(r.shotsInFlight).toBe(3);
      else if (r.tier === 3) expect(r.shotsInFlight).toBe(2);
      else expect(r.shotsInFlight).toBeNull();
    }
    rungs[1]!.shotsInFlight = 2;
    expect(loadPatterns(raw).ladder.rungs[1]!.shotsInFlight).toBe(2);
    delete rungs[1]!.shotsInFlight;
    expect(loadPatterns(raw).ladder.rungs[1]!.shotsInFlight).toBeNull();
    for (const bad of [0, 1.5, -2, 'two']) {
      rungs[1]!.shotsInFlight = bad;
      expect(() => loadPatterns(raw), String(bad)).toThrow('patterns/ladder.json: shotsInFlight');
    }
  });
});
