import { describe, expect, it } from 'vitest';

import { DEFAULT_PATTERNS, loadPatterns } from '../src/patterns';

function clone(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(DEFAULT_PATTERNS)) as Record<string, unknown>;
}

describe('loadPatterns', () => {
  it('accepts the shipped files', () => {
    const set = loadPatterns(clone());
    expect(set.paths.paths.length).toBeGreaterThan(0);
    expect(set.ladder.rungs.map((r) => r.tier).sort()).toEqual([0, 1, 2]);
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

  it('has ladder rungs 0, 1, 2', () => {
    expect(DEFAULT_PATTERNS.ladder.rungs.map((r) => r.tier).sort()).toEqual([0, 1, 2]);
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

  it('has three bosses with at least two phases and no fact keys', () => {
    for (const kind of ['whisperer', 'menu', 'doorman'] as const) {
      const boss = DEFAULT_PATTERNS.bosses[kind];
      expect(boss.phases.length).toBeGreaterThanOrEqual(2);
      for (const phase of boss.phases) {
        expect(phase).not.toHaveProperty('lie');
        expect(phase).not.toHaveProperty('fact');
        expect(phase).not.toHaveProperty('revealed');
        expect(phase).not.toHaveProperty('followed');
      }
    }
    const raw = clone();
    const whisperer = (raw.bosses as Record<string, { phases: Record<string, unknown>[] }>)
      .whisperer;
    if (!whisperer) throw new Error('patterns/bosses.json: whisperer');
    whisperer.phases[0]!.lie = true;
    expect(() => loadPatterns(raw)).toThrow('patterns/bosses.json: lie');
  });
});
