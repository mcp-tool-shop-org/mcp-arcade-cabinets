import { describe, expect, it } from 'vitest';

import { DEFAULT_CORPUS, integrationSnippets, withIntegration } from '../src/corpus';
import { LinePicker } from '../src/lines';
import { DEFAULT_PATTERNS, lineFault } from '../src/patterns';
import { levelDefAt, planLevel, type PlanOpts } from '../src/level';
import { seededRandom } from '../src/seed';
import type { LevelPlan, Stack, Tier } from '../src/types';

/**
 * The corpus every test here plans from: the default one with the integration
 * stack seasoned in, as the shell and the play-through season it. Two of the
 * sixteen listed levels are integration levels, so a test that walks every
 * level needs the stack to be there. Four tool names give four snippets a
 * band, which is exactly the four requests such a level plans.
 */
const SEASONED = withIntegration(
  DEFAULT_CORPUS,
  integrationSnippets([
    { server: 'mcp-arcade-fixture', policy: 'naive', tools: ['echo', 'leak', 'view', 'tapes'] },
  ]),
);

function opts(over: Partial<PlanOpts> = {}): PlanOpts {
  const seed = over.seed ?? 11;
  const tier = (over.tier ?? 0) as Tier;
  const picker = over.picker ?? new LinePicker(DEFAULT_PATTERNS, { seed, tier });
  return {
    set: DEFAULT_PATTERNS,
    corpus: SEASONED,
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
      // An endless level, because a listed one pins its four snippets after the
      // slice-3 authoring run and a pinned request draws nothing to lean.
      const at = { seed, levelIndex: 4, endless: true, stack: 'javascript' as Stack };
      plainHits += carries(plan(at));
      weakHits += carries(plan({ ...at, weakBigrams: { [pair]: 40 } }));
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

  it('pins every named snippet to one that exists in the level stack', () => {
    // The loader never reads the corpus, so this is where a typo in
    // levels.json halts the build rather than the first play-through.
    for (const [i, def] of DEFAULT_PATTERNS.levels.levels.entries()) {
      if (!def.snippets) continue;
      expect(def.snippets, `levels.${i}.snippets`).toHaveLength(def.requests);
      expect(new Set(def.snippets).size, `levels.${i}.snippets`).toBe(def.snippets.length);
      for (const [j, id] of def.snippets.entries()) {
        const found = (DEFAULT_CORPUS.byStack[def.stack] ?? []).find((sn) => sn.id === id);
        expect(found, `levels.${i}.snippets.${j}`).toBeDefined();
      }
    }
  });

  it('pins no piece into two levels', () => {
    // A player who plays both levels would type the same piece twice. The
    // authoring run that wrote the sixteen stories planned each level with its
    // own used set and no set across them, and left four ids pinned twice; the
    // stories slot shares one set now, and this is the bar that keeps it shared.
    const where = new Map<string, string>();
    for (const def of DEFAULT_PATTERNS.levels.levels) {
      for (const id of def.snippets ?? []) {
        expect(
          where.get(id),
          `${id} is pinned into ${where.get(id)} and ${def.id}`,
        ).toBeUndefined();
        where.set(id, def.id);
      }
    }
  });

  it('plays a pinned level in its authored order at every seed', () => {
    for (const [i, def] of DEFAULT_PATTERNS.levels.levels.entries()) {
      if (!def.snippets) continue;
      for (const seed of [1, 2, 3, 17]) {
        const made = plan({ levelIndex: i, seed });
        expect(
          made.requests.map((r) => r.snippet.id),
          `${def.id} seed ${seed}`,
        ).toEqual(def.snippets);
      }
    }
  });

  it('halts on a pinned id the stack does not carry', () => {
    const levels = DEFAULT_PATTERNS.levels.levels.map((def, i) =>
      i === 0 ? { ...def, snippets: ['nothing-like-this', 'b', 'c', 'd'] } : def,
    );
    const set = { ...DEFAULT_PATTERNS, levels: { ...DEFAULT_PATTERNS.levels, levels } };
    expect(() => planLevel(opts({ set, levelIndex: 0 }))).toThrow(
      'patterns/levels.json: levels.0.snippets.0',
    );
  });

  it('drops the pins when the run is moved to another language', () => {
    const def = DEFAULT_PATTERNS.levels.levels.find((l) => l.snippets)!;
    const i = DEFAULT_PATTERNS.levels.levels.indexOf(def);
    const other = def.stack === 'python' ? 'sql' : 'python';
    const made = plan({ levelIndex: i, stack: other as Stack });
    expect(made.stack).toBe(other);
    for (const request of made.requests) expect(request.snippet.stack).toBe(other);
  });

  // A run pinned to one language used to keep the level's id, product and
  // premise while drawing its four requests from another: `--stack sql
  // --level 1` announced "a rideshare for ducks", asked for a sandwich
  // ledger, and closed with the review written for the ducks. Moved off its
  // stack, the level is moved off its story too.
  it('moves a level off its story when it moves it off its stack', () => {
    const def = DEFAULT_PATTERNS.levels.levels[1]!;
    const moved = plan({ levelIndex: 1, stack: 'sql' as Stack });
    expect(moved.id).not.toBe(def.id);
    expect(moved.id.startsWith(def.id)).toBe(true);
    expect(moved.product).not.toBe(def.product);
    expect(moved.product).not.toContain('{noun}');
    expect(moved.story).toBe('');
    // The generic reviews play: a real draw for the moved id lands in the generic pool.
    const picker = new LinePicker(DEFAULT_PATTERNS, { seed: 1, tier: 0 });
    picker.startLevel(0);
    expect(DEFAULT_PATTERNS.user.reviews).toContain(picker.review(moved.id));
    // Left on its own stack, nothing moves.
    const home = plan({ levelIndex: 1, stack: def.stack });
    expect(home.id).toBe(def.id);
    expect(home.product).toBe(def.product);
    expect(home.story).toBe(def.story);
  });

  // A snippet whose ask was written against one story's premise is a request
  // only inside that story. Anywhere else the template pool plays.
  it('plays a bound ask only inside the level it was written for', () => {
    const bound = DEFAULT_CORPUS.snippets.find((s) => s.for !== undefined && s.ask)!;
    expect(bound.for).toBeDefined();
    const picker = new LinePicker(DEFAULT_PATTERNS, { seed: 2, tier: 0 });
    const own = picker.ask('python', 'a rideshare for ducks', bound, bound.for);
    expect(own).toBe(bound.ask);
    const elsewhere = picker.ask('python', 'an app for lost socks', bound, 'endless-3');
    expect(elsewhere).not.toBe(bound.ask);
    // And a caller that names no level gets the safe pool, not the story.
    expect(picker.ask('python', 'an app for lost socks', bound)).not.toBe(bound.ask);
  });

  it('carries the level story onto the plan, and nothing onto an endless one', () => {
    for (const [i, def] of DEFAULT_PATTERNS.levels.levels.entries()) {
      expect(lineFault(def.story), `levels.${i}.story`).toBeNull();
      expect(plan({ levelIndex: i }).story).toBe(def.story);
    }
    expect(plan({ levelIndex: 3, endless: true }).story).toBe('');
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

  // The seat's buffer used to be an untagged queue: a seat that
  // over-delivered for one level left the surplus behind, and the next
  // endless level draws a fresh random stack, so those leftovers were typed
  // under another language's bed, palette and device frame carrying an ask
  // written for the previous product.
  it('uses a fed request only in the level it was written for', () => {
    const python = DEFAULT_CORPUS.byStack.python!.filter((s) => s.band <= 2).slice(0, 2);
    const at = { levelIndex: 3, endless: true, stack: 'python' as Stack, seed: 5 };

    const mine = python.map((snippet) => ({ snippet, levelIndex: 3, stack: 'python' as Stack }));
    const taken = plan({ ...at, supplied: mine });
    expect(taken.requests.slice(0, 2).map((r) => r.snippet.id)).toEqual(python.map((s) => s.id));
    expect(mine).toHaveLength(0);

    // Written for the level before this one: spliced off and dropped, and
    // the level draws from the corpus instead — the no-seat path.
    const stale = python.map((snippet) => ({ snippet, levelIndex: 2, stack: 'python' as Stack }));
    const dropped = plan({ ...at, supplied: stale });
    expect(dropped.requests.map((r) => r.snippet.id)).toEqual(
      plan({ ...at }).requests.map((r) => r.snippet.id),
    );

    // Written for this level but against another language: also dropped.
    const wrongStack = python.map((snippet) => ({
      snippet,
      levelIndex: 3,
      stack: 'sql' as Stack,
    }));
    const other = plan({ ...at, supplied: wrongStack });
    expect(other.requests.map((r) => r.snippet.id)).toEqual(
      plan({ ...at }).requests.map((r) => r.snippet.id),
    );
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

// ——— the stack running out ————————————————————————————————————————————————
//
// The widening ladder's last rung used to hand back the whole stack
// unfiltered, so once a stack's free pool was spent the planner drew
// already-played snippets with no signal anywhere — no event, no flag, nothing
// in the transcript — against this module's own claim that the seed never
// biases toward a repeat (Q1.9). A run pinned to one stack has roughly forty
// snippets in band and spends four a level, so an endless session passes that
// point inside ten levels, and `used` was never pruned, so the run could not
// start a fresh cycle deliberately either.

describe('when a stack runs out', () => {
  const stackOf = (id: Stack) => (SEASONED.byStack[id] ?? []).map((snippet) => snippet.id);

  it('starts a new cycle, says so on the plan, and repeats nothing inside a level', () => {
    const used = new Set(stackOf('bash'));
    const spent = used.size;
    const made = plan({ endless: true, levelIndex: 3, stack: 'bash', used });
    expect(made.recycled).toBe(true);
    // A fresh cycle: the ids this level did not take are free again, so the
    // next level is not drawing from a pool of one.
    expect(used.size).toBeLessThan(spent);
    expect(used.size).toBe(made.requests.length);
    // And nothing inside the level is the same snippet twice: the ids this
    // level has already drawn are the ones the cycle keeps.
    const drawn = made.requests.map((request) => request.snippet.id);
    expect(new Set(drawn).size).toBe(drawn.length);
  });

  it('says nothing on a level that had snippets to draw', () => {
    const made = plan({ endless: true, levelIndex: 3, stack: 'bash' });
    expect(made.recycled).toBeUndefined();
  });
});
