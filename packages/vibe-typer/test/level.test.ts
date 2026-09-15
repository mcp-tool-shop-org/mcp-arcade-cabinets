import { describe, expect, it } from 'vitest';

import { DEFAULT_CORPUS, integrationSnippets, withIntegration } from '../src/corpus';
import { LinePicker } from '../src/lines';
import { DEFAULT_PATTERNS } from '../src/patterns';
import { levelDefAt, planLevel, type PlanOpts } from '../src/level';
import { seededRandom } from '../src/seed';
import type { LevelPlan, Stack, Tier } from '../src/types';

function opts(over: Partial<PlanOpts> = {}): PlanOpts {
  const seed = over.seed ?? 11;
  const tier = (over.tier ?? 0) as Tier;
  const picker = over.picker ?? new LinePicker(DEFAULT_PATTERNS, { seed, tier });
  return {
    set: DEFAULT_PATTERNS,
    corpus: DEFAULT_CORPUS,
    picker,
    levelIndex: 0,
    seed,
    tier,
    endless: false,
    weakBigrams: {},
    used: new Set<string>(),
    ...over,
  } as PlanOpts;
}

function plan(over: Partial<PlanOpts> = {}): LevelPlan {
  const made = planLevel(opts(over));
  expect(made).not.toBeNull();
  return made!;
}

describe('planning a level', () => {
  it('fixes the order, the code and the value at level start', () => {
    const a = plan();
    const b = plan();
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.requests).toHaveLength(DEFAULT_PATTERNS.levels.levels[0]!.requests);
    for (const request of a.requests) {
      expect(request.value).toBeGreaterThan(0);
      expect(request.ask).not.toContain('{product}');
      expect(request.ask).not.toContain('{title}');
      expect(request.reply.length).toBeGreaterThan(0);
    }
  });

  it('never repeats a snippet inside a run', () => {
    const used = new Set<string>();
    const picker = new LinePicker(DEFAULT_PATTERNS, { seed: 5, tier: 0 });
    const ids: string[] = [];
    for (let i = 0; i < 6; i++) {
      picker.startLevel(i);
      const made = planLevel(opts({ levelIndex: i, seed: 5, used, picker, endless: true }))!;
      for (const request of made.requests) ids.push(request.snippet.id);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps every request inside the level band', () => {
    for (const [i, def] of DEFAULT_PATTERNS.levels.levels.entries()) {
      for (const seed of [1, 2, 3]) {
        const made = plan({ levelIndex: i, seed });
        expect(made.stack).toBe(def.stack);
        for (const request of made.requests) {
          expect(request.snippet.band).toBeGreaterThanOrEqual(def.bandMin);
          expect(request.snippet.band).toBeLessThanOrEqual(def.bandMax);
        }
      }
    }
  });

  it('leans toward the snippets carrying the weak pairs', () => {
    // A pair that only some snippets carry: weight it and it should show up more.
    const pair = '))';
    const carries = (made: LevelPlan) =>
      made.requests.filter((r) => r.snippet.code.includes(pair)).length;
    let plainHits = 0;
    let weakHits = 0;
    for (let seed = 1; seed <= 24; seed++) {
      plainHits += carries(plan({ seed, levelIndex: 4 }));
      weakHits += carries(plan({ seed, levelIndex: 4, weakBigrams: { [pair]: 40 } }));
    }
    expect(weakHits).toBeGreaterThan(plainHits);
  });

  it('attaches creep to about the share the levers name, and never silently', () => {
    let creeps = 0;
    let requests = 0;
    for (let seed = 1; seed <= 40; seed++) {
      for (let level = 0; level < DEFAULT_PATTERNS.levels.levels.length; level++) {
        const made = plan({ seed, levelIndex: level });
        for (const request of made.requests) {
          requests += 1;
          if (!request.creep) continue;
          creeps += 1;
          expect(request.creep.line.split('\n')).toHaveLength(1);
          expect(request.creep.line.trim()).not.toBe('');
          expect(request.creep.ask.length).toBeGreaterThan(0);
        }
      }
    }
    const share = creeps / requests;
    expect(share).toBeGreaterThan(DEFAULT_PATTERNS.levels.creepShare - 0.12);
    expect(share).toBeLessThan(DEFAULT_PATTERNS.levels.creepShare + 0.12);
  });

  it('runs out of listed levels but never out of endless ones', () => {
    const past = DEFAULT_PATTERNS.levels.levels.length;
    expect(planLevel(opts({ levelIndex: past }))).toBeNull();
    expect(levelDefAt(opts({ levelIndex: past }), seededRandom(1))).toBeNull();
    const far = plan({ levelIndex: 20, endless: true });
    expect(far.requests.length).toBeGreaterThan(0);
    expect(far.product).not.toContain('{noun}');
  });

  it('climbs the band and the drain in endless', () => {
    const early = plan({ levelIndex: 0, endless: true, stack: 'python' });
    const late = plan({ levelIndex: 8, endless: true, stack: 'python' });
    expect(late.drainPerSec).toBeGreaterThan(early.drainPerSec);
    const earlyBand = Math.max(...early.requests.map((r) => r.snippet.band));
    const lateBand = Math.min(...late.requests.map((r) => r.snippet.band));
    expect(lateBand).toBeGreaterThan(earlyBand);
  });

  it('plans the integration stack from tape-seasoned snippets', () => {
    const snippets = integrationSnippets([
      { server: 'mcp-arcade-fixture', policy: 'naive', tools: ['echo', 'leak', 'view', 'tapes'] },
    ]);
    const corpus = withIntegration(DEFAULT_CORPUS, snippets);
    const made = plan({ corpus, stack: 'integration' as Stack, levelIndex: 2 });
    expect(made.stack).toBe('integration');
    for (const request of made.requests) {
      expect(request.snippet.stack).toBe('integration');
      expect(request.snippet.code.split('\n')).toHaveLength(1);
    }
  });
});
