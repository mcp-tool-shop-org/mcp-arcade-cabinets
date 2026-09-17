// The endless band (slice E1, lock G31–G35). Three things are measured here
// and nowhere else: that the climb reaches its stated ceiling and never
// crosses it, that a run can be survived and can end, and that the draw
// covers the roster and the flavors with no hole. Every bar below was set
// from a measurement recorded in docs/ghost-endless.e1.md, with margin, and
// every gate has a mutation beside it that turns it red — a bar no mutation
// can break is a bar that measures nothing.
//
// Endless is offered at seat, live and hardcore and refused at the gentlest
// rung, which can take no last lamp on any tape at any reach the ceiling
// permits — a run there would never end. The bars below are measured on
// those three rungs only. The numbers are in docs/ghost-endless.e1.md.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadTape } from '@mcp-arcade-cabinets/tape-core';

import {
  approachAt,
  beyondWord,
  BREATHER_REACH,
  chainWord,
  ENDLESS_NO_TIER_ZERO,
  decodeEndless,
  encodeEndless,
  endlessPlan,
  endlessScoreLines,
  endlessWords,
  isBreather,
  placeWord,
  rankWord,
  reachAt,
  runEndless,
  SEED_SPACE,
  widenStep,
  type EndlessRun,
  type EndlessTape,
} from '../src/endless';
import {
  CLIMB_MAX,
  copiesAt,
  DEFAULT_PATTERNS,
  intensityAt,
  loadPatterns,
  rungWord,
  type LineBags,
  type PatternSet,
  type Tier,
} from '../src/patterns';
import { botFor, type BotName } from '../src/play';
import { decodeShift, drawShift, encodeShift } from '../src/shift';
import { SCREEN_FORBIDDEN } from '../src/types';

const DIR = path.resolve(__dirname, '../../../fixtures/tapes');

const ROSTER: EndlessTape[] = readdirSync(DIR)
  .filter((f) => f.endsWith('.tape.json'))
  .sort()
  .map((f) => ({
    name: f.replace(/\.tape\.json$/, ''),
    tape: loadTape(JSON.parse(readFileSync(path.join(DIR, f), 'utf8'))),
  }));

const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);

function run(seed: number, tier: Tier, bot: BotName, calls: number, patterns?: PatternSet) {
  return runEndless(ROSTER, {
    seed,
    tier,
    calls,
    bot: (round) => botFor(bot, round),
    ...(patterns ? { patterns } : {}),
  });
}

function clone(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(DEFAULT_PATTERNS)) as Record<string, unknown>;
}

const endlessOf = (raw: Record<string, unknown>) => raw.endless as Record<string, unknown>;
const tierOf = (raw: Record<string, unknown>, key: string) =>
  ((raw.parallelism as Record<string, unknown>).tiers as Record<string, Record<string, unknown>>)[
    key
  ]!;

/** The shipped set with a deeper pool, so a run lives long enough to be measured past the ceiling. */
function deepPool(tier: 1 | 2 | 3, lamps: number, from: PatternSet = DEFAULT_PATTERNS): PatternSet {
  return {
    ...from,
    endless: {
      ...from.endless,
      lamps: { ...from.endless.lamps, pool: { ...from.endless.lamps.pool, [tier]: lamps } },
    },
  };
}

/** The shipped set with one tier's levers replaced. Never written to disk. */
function patched(
  tier: Tier,
  lever: Partial<PatternSet['parallelism']['tiers']['0']>,
  from: PatternSet = DEFAULT_PATTERNS,
): PatternSet {
  const key = String(tier) as '0' | '1' | '2' | '3';
  return {
    ...from,
    parallelism: {
      tiers: { ...from.parallelism.tiers, [key]: { ...from.parallelism.tiers[key], ...lever } },
    },
  };
}

describe('endless.json', () => {
  it('ships a climb, a menu, a score, a rank word and a chain word', () => {
    const e = DEFAULT_PATTERNS.endless;
    expect(e.climb.openingCalls).toBeGreaterThanOrEqual(1);
    expect(e.menu.candidates).toBe(3);
    expect(e.chainWords.length).toBe(e.score.chainCap);
    expect(Object.keys(e.rank)).toEqual(['1', '2', '3']);
    expect(Object.keys(e.lamps.pool)).toEqual(['1', '2', '3']);
    expect(e.climb.approach).toBeGreaterThan(0);
    expect(e.climb.approach).toBeLessThanOrEqual(1);
    for (const key of ['1', '2', '3'] as const) {
      expect(e.rank[key][0]!.at, `${key}: the first word must cover every run`).toBe(0);
      expect(e.lamps.pool[key]).toBeGreaterThanOrEqual(1);
    }
    expect(Object.keys(e.notes).length).toBeGreaterThan(0);
  });

  it('halts on a missing key and on a wrong-typed one', () => {
    const missing = clone();
    delete endlessOf(missing).climb;
    expect(() => loadPatterns(missing)).toThrow('patterns/endless.json: climb');
    const typed = clone();
    endlessOf(typed).climb = 3;
    expect(() => loadPatterns(typed)).toThrow('patterns/endless.json: climb');
  });

  it('halts on a rank word that could reach a screen', () => {
    const digit = clone();
    (endlessOf(digit).rank as Record<string, { at: number; word: string }[]>)['2']![0]!.word =
      'took 2 calls';
    expect(() => loadPatterns(digit)).toThrow('patterns/endless.json: word');
    const verdict = clone();
    (endlessOf(verdict).rank as Record<string, { at: number; word: string }[]>)['2']![1]!.word =
      'a pass';
    expect(() => loadPatterns(verdict)).toThrow('patterns/endless.json: word');
    const chain = clone();
    (endlessOf(chain).chainWords as string[])[0] = 'cleared';
    expect(() => loadPatterns(chain)).toThrow('patterns/endless.json: chainWords');
  });

  it('halts on a rank table that is not a ladder', () => {
    const unsorted = clone();
    (endlessOf(unsorted).rank as Record<string, { at: number }[]>)['1']![2]!.at = 1;
    expect(() => loadPatterns(unsorted)).toThrow('patterns/endless.json: at');
    const floorless = clone();
    (endlessOf(floorless).rank as Record<string, { at: number }[]>)['1']![0]!.at = 10;
    expect(() => loadPatterns(floorless)).toThrow('patterns/endless.json: at');
  });

  it('halts on an approach that is not a fraction of the tape-alone reach', () => {
    for (const bad of [0, -0.5, 1.5]) {
      const raw = clone();
      (endlessOf(raw).climb as Record<string, number>).approach = bad;
      expect(() => loadPatterns(raw), String(bad)).toThrow('patterns/endless.json: approach');
    }
  });

  it('halts on a lamp pool the gentlest rung has an entry in, or that is empty', () => {
    const zero = clone();
    (endlessOf(zero).lamps as Record<string, Record<string, number>>).pool!['0'] = 3;
    expect(() => loadPatterns(zero)).toThrow('patterns/endless.json: pool');
    const none = clone();
    delete (endlessOf(none).lamps as Record<string, Record<string, number>>).pool!['2'];
    expect(() => loadPatterns(none)).toThrow('patterns/endless.json: pool');
    const rank = clone();
    (endlessOf(rank).rank as Record<string, unknown>)['0'] = [{ at: 0, word: 'clocked in' }];
    expect(() => loadPatterns(rank)).toThrow('patterns/endless.json: rank');
  });

  it('halts on a chain word list that does not match the cap', () => {
    const raw = clone();
    (endlessOf(raw).chainWords as string[]).pop();
    expect(() => loadPatterns(raw)).toThrow('patterns/endless.json: chainWords');
  });

  it('halts when the points stop encoding the risk', () => {
    const raw = clone();
    (endlessOf(raw).score as Record<string, number>).drop = 999;
    expect(() => loadPatterns(raw)).toThrow('patterns/endless.json: score');
  });

  it('halts on a fallback that is not the seeded pick, and on bands out of order', () => {
    const seat = clone();
    (endlessOf(seat).seat as Record<string, unknown>).fallback = 'the seat';
    expect(() => loadPatterns(seat)).toThrow('patterns/endless.json: fallback');
    const bands = clone();
    (endlessOf(bands).menu as Record<string, number[]>).bands = [40, 30];
    expect(() => loadPatterns(bands)).toThrow('patterns/endless.json: bands');
  });

  it('halts when the endless reach falls below the shift it sits above', () => {
    const copies = clone();
    tierOf(copies, '2').copiesEndless = 1;
    expect(() => loadPatterns(copies)).toThrow('patterns/parallelism.json: copiesEndless');
    const intensity = clone();
    tierOf(intensity, '2').intensityEndless = 1;
    expect(() => loadPatterns(intensity)).toThrow('patterns/parallelism.json: intensityEndless');
  });

  it('halts when the reach would cross the stated ceiling', () => {
    const raw = clone();
    tierOf(raw, '2').copiesEndless = 99;
    expect(() => loadPatterns(raw)).toThrow('patterns/endless.json: ceiling');
    const hot = clone();
    tierOf(hot, '2').intensityEndless = 99;
    expect(() => loadPatterns(hot)).toThrow('patterns/endless.json: ceiling');
  });

  it('halts when a hazard ceiling and its rung disagree', () => {
    const raw = clone();
    (
      (endlessOf(raw).climb as Record<string, unknown>).ceiling as Record<
        string,
        Record<string, number>
      >
    )['2']!.hazards = 3;
    expect(() => loadPatterns(raw)).toThrow('patterns/endless.json: hazards');
    const bare = clone();
    (
      (endlessOf(bare).climb as Record<string, unknown>).ceiling as Record<
        string,
        Record<string, number>
      >
    )['3']!.hazards = 0;
    expect(() => loadPatterns(bare)).toThrow('patterns/endless.json: hazards');
  });
});

describe('the climb', () => {
  const opening = DEFAULT_PATTERNS.endless.climb.openingCalls;

  it("approaches the tape-alone reach from under it, and arrives by the band's end", () => {
    expect(approachAt(0)).toBe(DEFAULT_PATTERNS.endless.climb.approach);
    expect(approachAt(0)).toBeLessThan(1);
    for (let i = 1; i < opening; i++) {
      expect(approachAt(i), `call ${i}`).toBeGreaterThan(approachAt(i - 1));
    }
    expect(approachAt(opening - 1)).toBe(1);
    expect(approachAt(opening + 20)).toBe(1);
    // The opening band is endless's own: a gentler burst is measured here and
    // nowhere else, and the shipped set the other bands read has no such lever
    // in its parallelism at all.
    expect('approach' in DEFAULT_PATTERNS.parallelism.tiers['2']).toBe(false);
  });

  it('holds flat through the opening calls, then rises a step a call', () => {
    for (let i = 0; i < opening; i++) expect(reachAt(i), `call ${i}`).toBe(0);
    expect(reachAt(opening)).toBeCloseTo(DEFAULT_PATTERNS.endless.climb.stepPerCall, 10);
    expect(reachAt(opening + 4)).toBeGreaterThan(reachAt(opening));
  });

  it('never climbs past the ceiling, however long the run', () => {
    for (const i of [30, 60, 200, 1000]) expect(reachAt(i), `call ${i}`).toBe(CLIMB_MAX);
    // The mutation: a curve with no ceiling would have gone on climbing.
    const step = DEFAULT_PATTERNS.endless.climb.stepPerCall;
    expect((1000 - opening + 1) * step).toBeGreaterThan(CLIMB_MAX);
  });

  it('leaves every shift measurement exactly where it was', () => {
    // Climb 0 and climb 1 are the two stops the shift already stood on, so
    // adding a third above them may not move either of these numbers.
    const spec = DEFAULT_PATTERNS.parallelism.tiers['2'];
    expect(copiesAt(spec, 0, 4, 0)).toBe(spec.copies);
    expect(copiesAt(spec, 3, 4, 0)).toBe(spec.copiesLater);
    expect(copiesAt(spec, 0, 4, 1)).toBe(spec.copiesLater);
    expect(copiesAt(spec, 3, 4, 1)).toBe(spec.copiesShift);
    expect(intensityAt(spec, 3, 4, 1)).toBeCloseTo(spec.intensityShift, 10);
    // And the stop above them lands on the endless reach, not past it.
    expect(copiesAt(spec, 3, 4, CLIMB_MAX)).toBe(spec.copiesEndless);
    expect(intensityAt(spec, 3, 4, CLIMB_MAX)).toBeCloseTo(spec.intensityEndless, 10);
  });

  it('holds the ceiling on a run that goes well past it', () => {
    // No run the bots take gets near the thirtieth call on the shipped pool,
    // so the ceiling is measured on a run given lamps enough to reach it —
    // the reach saturates near the twenty-eighth call, and this one plays
    // forty. The lever under test is the ceiling, not the pool.
    const out = run(4, 2, 'sweeper', 40, deepPool(2, 90));
    const ceiling = DEFAULT_PATTERNS.endless.climb.ceiling['2'];
    expect(out.calls.length).toBeGreaterThan(30);
    const copies = Math.max(...out.calls.map((c) => c.copiesPeak));
    const intensity = Math.max(...out.calls.map((c) => c.intensityPeak));
    const hazards = Math.max(...out.calls.map((c) => c.hazardPeak));
    expect(copies).toBeLessThanOrEqual(ceiling.copies);
    expect(intensity).toBeLessThanOrEqual(ceiling.intensity + 1e-9);
    expect(hazards).toBeLessThanOrEqual(ceiling.hazards);
    // Not vacuous: the run actually arrives at the asymptote.
    expect(copies).toBe(ceiling.copies);
    expect(intensity).toBeCloseTo(ceiling.intensity, 10);
  });

  it('goes red when the reach is lifted above the ceiling', () => {
    // The mutation the bar above protects against: a reach past the stated
    // asymptote. The loader refuses the file, and a set that skipped the
    // loader is caught on the field.
    const ceiling = DEFAULT_PATTERNS.endless.climb.ceiling['2'];
    const out = run(
      4,
      2,
      'sweeper',
      40,
      patched(2, { copiesEndless: ceiling.copies + 4 }, deepPool(2, 90)),
    );
    expect(Math.max(...out.calls.map((c) => c.copiesPeak))).toBeGreaterThan(ceiling.copies);
  });
});

describe('the endless band', () => {
  const calls = (tier: 1 | 2 | 3, bot: BotName) =>
    SEEDS.reduce((sum, seed) => sum + run(seed, tier, bot, 60).calls.length, 0);

  it('refuses the gentlest rung by name', () => {
    expect(() => run(1, 0, 'reader', 10)).toThrow(ENDLESS_NO_TIER_ZERO);
    expect(() => run(1, 0, 'reader', 10)).toThrow(/start at seat/);
    // The three it is offered at all take a run.
    for (const tier of [1, 2, 3] as const) {
      expect(run(1, tier, 'reader', 3).calls.length, `tier ${tier}`).toBeGreaterThan(0);
    }
  });

  it('at seat the reader outlasts the mover', () => {
    // Measured over twenty seeds: reader thirty-nine calls, mover thirty-four,
    // the ship that never moves twenty. The bars sit under the measurement.
    const reader = calls(1, 'reader');
    const sweeper = calls(1, 'sweeper');
    expect(reader, `reader ${reader} mover ${sweeper}`).toBeGreaterThan(sweeper);
    // Twenty-five with aimed fire from a sweeping formation (2026-09-17). Measured when set: thirty-two.
    expect(reader).toBeGreaterThanOrEqual(25);
    // The boss waits for the grid or half the wave (the Director, 2026-09-17),
    // so a ship that never moves can live past its first call at seat now;
    // measured when set: twenty-seven over twenty seeds. It never outlasts
    // the reader.
    const idle = calls(1, 'idle');
    expect(idle, `idle ${idle} reader ${reader}`).toBeGreaterThanOrEqual(SEEDS.length);
    expect(idle, `idle ${idle} reader ${reader}`).toBeLessThanOrEqual(reader);
  });

  it('at hardcore the reader outlasts the mover, and neither lasts long', () => {
    // Measured: reader twenty-nine, mover twenty-four, on a pool of three
    // against a rung whose own lamp count is one.
    const reader = calls(3, 'reader');
    const sweeper = calls(3, 'sweeper');
    expect(reader, `reader ${reader} mover ${sweeper}`).toBeGreaterThan(sweeper);
    expect(reader).toBeGreaterThanOrEqual(24);
    expect(reader).toBeLessThan(SEEDS.length * 4);
  });

  it('at live the bots take enough calls over the seeds for the band to mean something', () => {
    // Live is the rung the formations are cleared on rather than dodged, so
    // the mover outlasts the reader here and the two swap back at seat.
    // Measured: mover a hundred and seventy-two calls over twenty seeds
    // (shortest run seven, longest nineteen), reader a hundred and thirteen.
    const sweeper = SEEDS.map((seed) => run(seed, 2, 'sweeper', 60));
    const taken = sweeper.map((r) => r.calls.length);
    const total = taken.reduce((a, b) => a + b, 0);
    // Re-based 2026-09-17 to the Director's heat on the live rung (every
    // class fires, on the way in): the mover, which never dodges, takes
    // fewer calls than it did on the quiet formation. Measured when set: 119.
    // Fifty-five with aimed fire from a sweeping formation (2026-09-17). Measured when set: sixty-seven.
    expect(total, `mover ${total}`).toBeGreaterThanOrEqual(55);
    // Two, not five, since the same re-base: on the hot live rung a mover
    // that never dodges can lose the pool inside its second call. Measured
    // when set: a shortest run of two.
    expect(Math.min(...taken), 'the shortest run at live').toBeGreaterThanOrEqual(2);
    // Forty since the formation fires only from above the ship's row
    // (2026-09-17, `fromAbove`): a reader that hunts a tell low on the
    // field is not shot at by sprites beside it, and the runs that measured
    // eighty-five under the sweep alone came out shorter once the fire came
    // only from above and aimed. Measured when set: sixty-odd.
    expect(calls(2, 'reader')).toBeGreaterThanOrEqual(40);
    // Long enough that the climb passes the full reach of a shift, which is
    // the whole point of a pool that outlives the opening band.
    // The climb past the tape-alone reach is no longer read off a bot's run:
    // on the hot live rung the runs are a few calls each and too few of
    // them reach past the opening band to pin the reach here. The curve
    // itself is pinned by the climb cases above (the floor, the step and
    // the ceiling); a person's run is the Director's bar.
  });

  it('a run ends, and the end is the last lamp', () => {
    const out = run(5, 2, 'sweeper', 60);
    expect(out.ended).toBe('lamps');
    expect(out.lamps).toBe(0);
    expect(out.pool).toBe(DEFAULT_PATTERNS.endless.lamps.pool['2']);
    expect(out.calls[out.calls.length - 1]!.lampsLost).toBeGreaterThan(0);
    // The pool is the run's, not the rung's three: the mutation is a pool of
    // one, which ends the run on its first call.
    const thin = runEndless(ROSTER, {
      seed: 5,
      tier: 2,
      calls: 60,
      patterns: deepPool(2, 1),
      bot: (round) => botFor('sweeper', round),
    });
    expect(thin.calls.length).toBeLessThan(out.calls.length);
  });
});

describe('the draw', () => {
  it('has no hole: every flavor and every tape by the twentieth call', () => {
    const flavors = new Map<string, number>();
    const tapes = new Map<string, number>();
    for (let seed = 1; seed <= 100; seed++) {
      for (const call of endlessPlan(ROSTER, { seed, calls: 20 })) {
        flavors.set(call.role, (flavors.get(call.role) ?? 0) + 1);
        tapes.set(call.pick.name, (tapes.get(call.pick.name) ?? 0) + 1);
      }
    }
    const table = [
      `flavors: ${[...flavors.entries()].map(([k, n]) => `${k} ${n}`).join(', ')}`,
      `tapes: ${ROSTER.map((r) => `${r.name} ${tapes.get(r.name) ?? 0}`).join(', ')}`,
    ].join(' | ');
    expect(flavors.size, table).toBe(DEFAULT_PATTERNS.shift.flavors.length);
    const missing = ROSTER.filter((r) => !tapes.has(r.name)).map((r) => r.name);
    expect(missing, table).toEqual([]);
  });

  it('offers three tapes a call, never the same tape twice on one menu', () => {
    for (const call of endlessPlan(ROSTER, { seed: 11, calls: 20 })) {
      expect(call.candidates.length).toBe(DEFAULT_PATTERNS.endless.menu.candidates);
      expect(new Set(call.candidates.map((c) => c.name)).size).toBe(call.candidates.length);
      expect(call.candidates.map((c) => c.name)).toContain(call.pick.name);
      expect(call.seeded).toBe(true);
      expect(call.tell).toBeNull();
    }
  });

  it('widens the slice before the reach rises', () => {
    const opening = DEFAULT_PATTERNS.endless.climb.openingCalls;
    const first = DEFAULT_PATTERNS.endless.menu.widenAt[0]!;
    expect(first, 'novelty arrives before lethality does').toBeLessThan(opening);
    expect(widenStep(0)).toBe(0);
    expect(widenStep(first)).toBe(1);
  });

  it('draws the same run twice for one seed and a different one for another', () => {
    const a = endlessPlan(ROSTER, { seed: 12, calls: 12 }).map((c) => `${c.pick.name}|${c.role}`);
    const b = endlessPlan(ROSTER, { seed: 12, calls: 12 }).map((c) => `${c.pick.name}|${c.role}`);
    const c = endlessPlan(ROSTER, { seed: 13, calls: 12 }).map((x) => `${x.pick.name}|${x.role}`);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});

describe('the lamps and the chain', () => {
  const sweep = (): EndlessRun[] => {
    const out: EndlessRun[] = [];
    for (const tier of [1, 2, 3] as Tier[]) {
      for (const bot of ['sweeper', 'reader'] as BotName[]) {
        for (const seed of SEEDS) out.push(run(seed, tier, bot, 30));
      }
    }
    return out;
  };
  const RUNS = sweep();
  const CALLS = RUNS.flatMap((r) => r.calls);

  it('gives a lamp back on a clean call and on no other, never past the pool', () => {
    for (const call of CALLS) {
      const pool = DEFAULT_PATTERNS.endless.lamps.pool[String(call.tier) as '1' | '2' | '3'];
      expect(call.lamps, `${call.place} past the pool`).toBeLessThanOrEqual(pool);
      if (call.lampsBack > 0) {
        expect(call.clean, `${call.place} refilled after losing a lamp`).toBe(true);
        expect(call.lampsBefore).toBeLessThan(pool);
        expect(call.lampsBack).toBe(DEFAULT_PATTERNS.endless.lamps.backOnCleanCall);
      }
      if (!call.clean) expect(call.lampsBack).toBe(0);
    }
    // Not vacuous: the refill fires somewhere in the sweep.
    expect(CALLS.filter((c) => c.lampsBack > 0).length).toBeGreaterThan(10);
  });

  it('starts every run on the pool its tier names, and never on the rung', () => {
    for (const tier of [1, 2, 3] as const) {
      const out = run(3, tier, 'reader', 2);
      expect(out.pool).toBe(DEFAULT_PATTERNS.endless.lamps.pool[String(tier) as '1' | '2' | '3']);
      expect(out.calls[0]!.lampsBefore).toBe(out.pool);
    }
    // The mutation: the rung's own lamp count is not what a run starts on.
    expect(run(3, 3, 'reader', 2).pool).not.toBe(
      DEFAULT_PATTERNS.ladder.rungs.find((r) => r.tier === 3)!.lamps,
    );
  });

  it('puts the chain back to one link the moment a lamp goes', () => {
    for (const call of CALLS) {
      expect(call.chainResets > 0, `${call.place}`).toBe(call.lampsLost > 0);
    }
    expect(CALLS.filter((c) => c.chainResets > 0).length).toBeGreaterThan(50);
  });

  it('never lets the chain past its cap', () => {
    const cap = DEFAULT_PATTERNS.endless.score.chainCap;
    for (const call of CALLS) expect(call.chainEnd).toBeLessThanOrEqual(cap);
    expect(Math.max(...CALLS.map((c) => c.chainEnd))).toBe(cap);
    expect(chainWord(cap + 9)).toBe(DEFAULT_PATTERNS.endless.chainWords[cap - 1]);
  });

  it('a breather call has no return fire: the ship that never moves survives it', () => {
    // Every call a breather, so the bar is measured rather than inferred from
    // one that a short run may never reach.
    const rest: PatternSet = {
      ...DEFAULT_PATTERNS,
      endless: { ...DEFAULT_PATTERNS.endless, breatherEvery: 1 },
    };
    const out = runEndless(ROSTER, {
      seed: 2,
      tier: 3,
      calls: 6,
      patterns: rest,
      bot: (round) => botFor('idle', round),
    });
    expect(out.calls.every((c) => c.breather)).toBe(true);
    expect(out.calls.length).toBe(6);
    expect(out.calls.every((c) => c.lampsLost === 0)).toBe(true);
    // The mutation: the same seed with the shipped cadence, where the first
    // call does return fire, takes the pool away at once.
    const fired = run(2, 3, 'idle', 6);
    expect(isBreather(0)).toBe(false);
    expect(fired.calls.length).toBeLessThan(6);
    expect(fired.ended).toBe('lamps');
  });
});

describe('the score', () => {
  it('is the same number twice for one seed', () => {
    const a = run(9, 2, 'reader', 20);
    const b = run(9, 2, 'reader', 20);
    expect(a.score).toBe(b.score);
    expect(a.lines).toEqual(b.lines);
    expect(a.rank).toBe(b.rank);
    expect(a.code).toBe(b.code);
    expect(a.calls.map((c) => c.points)).toEqual(b.calls.map((c) => c.points));
  });

  it('is the three lines and nothing else, and time is not among them', () => {
    const out = run(15, 2, 'sweeper', 12);
    expect(out.lines.catches + out.lines.bosses + out.lines.calls).toBe(out.score);
    expect(out.lines.catches).toBeGreaterThan(0);
    expect(out.lines.calls).toBeGreaterThan(0);
    // The call bonus rises with the reach, so a later call banks more for the
    // same chain — which is the only way lasting long pays.
    const early = out.calls.find((c) => c.reach === 0 && c.chainEnd > 0)!;
    const late = out.calls[out.calls.length - 1]!;
    expect(late.reach).toBeGreaterThan(early.reach);
    expect(late.banked / late.chainEnd).toBeGreaterThan(early.banked / early.chainEnd);
  });

  it('names the run with a word from the table, and the table is a ladder', () => {
    expect(rankWord(0, 2)).toBe(DEFAULT_PATTERNS.endless.rank['2'][0]!.word);
    const top = DEFAULT_PATTERNS.endless.rank['2'].at(-1)!;
    expect(rankWord(top.at, 2)).toBe(top.word);
    expect(rankWord(top.at * 100, 2)).toBe(top.word);
    expect(rankWord(top.at - 1, 2)).not.toBe(top.word);
  });
});

describe('what the run says', () => {
  const out = run(7, 2, 'sweeper', 6);
  const words = endlessWords(out);

  it('carries no digit and no forbidden word on any printed line', () => {
    for (const line of words) {
      const hit = new RegExp(SCREEN_FORBIDDEN.source, 'i').exec(line);
      expect(hit?.[0], `"${line}"`).toBeUndefined();
    }
    expect(words.length).toBeGreaterThan(20);
  });

  it('the guard itself catches a planted line', () => {
    // The mutation for the bar above: a line that does carry a digit must be
    // found, or the loop above is measuring nothing.
    const planted = [...words, 'the second call took 3 lamps'];
    const hits = planted.filter((l) => new RegExp(SCREEN_FORBIDDEN.source, 'i').test(l));
    expect(hits).toEqual(['the second call took 3 lamps']);
  });

  it('names every call, its menu, its climb step and its tell', () => {
    for (const call of out.calls) {
      expect(words.some((l) => l.startsWith(call.place))).toBe(true);
    }
    expect(words.some((l) => l.includes('on the menu:'))).toBe(true);
    expect(words.some((l) => l.includes('the tell:'))).toBe(true);
    expect(words.some((l) => l.includes('the run:'))).toBe(true);
  });

  it('keeps the digits in the score lines, where a screen never looks', () => {
    const lines = endlessScoreLines(out);
    expect(lines.some((l) => l.includes(String(out.score)))).toBe(true);
    // Each line says what it HOLDS. The three lines hold points and used to
    // be labelled with the names of counts, so `catches: 3000` read as three
    // thousand catches after thirty, and `calls: 1040` sat directly above
    // `calls taken: 7` — one word meaning two things in one footer.
    expect(lines[0]).toBe(
      `from catches: ${out.lines.catches} (${out.calls.reduce((n, c) => n + c.catches, 0)} caught, ${out.calls.reduce((n, c) => n + c.drops, 0)} picked up)`,
    );
    expect(lines[1]).toBe(
      `from bosses: ${out.lines.bosses} (${out.calls.reduce((n, c) => n + c.bosses, 0)} put down)`,
    );
    expect(lines[2]).toBe(`banked at each call's end: ${out.lines.calls}`);
    expect(lines[3]).toBe(`total: ${out.score}`);
    expect(lines.some((l) => l.startsWith('calls taken: '))).toBe(true);
    // No line starts with a bare count word that means points.
    expect(lines.some((l) => /^(catches|bosses|calls):/.test(l))).toBe(false);
  });
});

describe('the code', () => {
  const names = ROSTER.map((r) => r.name);

  it('is five words and reads back to the seed and the difficulty', () => {
    for (const seed of [0, 1, 4242, SEED_SPACE - 1]) {
      for (const difficulty of [0, 1, 2, 3] as Tier[]) {
        const code = encodeEndless(names, { seed, difficulty });
        expect(code.split(' ').length).toBe(5);
        expect(decodeEndless(names, code)).toEqual({ ok: true, seed, difficulty });
      }
    }
  });

  it('says which menu it came from, and which words are not words', () => {
    const code = encodeEndless(names, { seed: 77, difficulty: 2 });
    expect(decodeEndless([...names, 'another.tape'], code)).toEqual({
      ok: false,
      why: 'another menu',
    });
    expect(decodeEndless(names, 'ash acorn ash button')).toEqual({ ok: false, why: 'not a code' });
    expect(decodeEndless(names, `${code} cliff`)).toEqual({ ok: false, why: 'not a code' });
    expect(decodeEndless(names, 'ash acorn ash button sev7n')).toEqual({
      ok: false,
      why: 'not a code',
    });
  });

  it('leaves the shift codes decoding exactly as they did', () => {
    const draw = drawShift(names, 12345, 2);
    const code = encodeShift(names, draw);
    expect(code.split(' ').length).toBe(4);
    expect(decodeShift(names, code)).toEqual({ ok: true, draw });
    // A shift reader never mistakes an endless code for a draw, and the other
    // way about, because the count is the first thing either one reads.
    expect(decodeShift(names, encodeEndless(names, { seed: 5, difficulty: 1 }))).toEqual({
      ok: false,
      why: 'not a code',
    });
    expect(decodeEndless(names, code)).toEqual({ ok: false, why: 'not a code' });
  });

  it('a run carries the code of its own draw', () => {
    const out = run(21, 2, 'reader', 4);
    expect(decodeEndless(names, out.code)).toEqual({ ok: true, seed: 21, difficulty: 2 });
  });
});

// Stage C. The run's words: what a menu row is called, what a header says
// twice, what the progress ladders say once they run out, what a call's line
// claims about a lamp, and which bags the calls walk.
describe('what a long run says about itself', () => {
  const OPTS = { seed: 11, tier: 2 as Tier, calls: 6 };

  it('gives every row on a menu a name no other row shares', () => {
    // `strip` replaces each needle with a space and a digit is a needle, so
    // two tapes called `run-1` and `run-2` rendered as one row; the pick is
    // still resolved on the raw name, so only the surface was ambiguous —
    // and from G32 the seat picks a tape BY NAME off this menu.
    const roster: EndlessTape[] = [
      { name: 'run-1', tape: ROSTER[0]!.tape },
      { name: 'run-2', tape: ROSTER[1]!.tape },
      { name: 'run-3', tape: ROSTER[2]!.tape },
      ...ROSTER.slice(3),
    ];
    const plan = endlessPlan(roster, { seed: 5, calls: 12 });
    for (const call of plan) {
      const shown = call.candidates.map((c) => c.display);
      expect(new Set(shown).size, shown.join('|')).toBe(shown.length);
      for (const c of call.candidates) {
        expect(c.display).not.toMatch(SCREEN_FORBIDDEN);
        expect(c.display.trim()).not.toBe('');
        // The header row and the menu row agree about which tape this is.
        expect(c.header[0]).toBe(c.display);
      }
    }
  });

  it('refuses a roster whose tape has no name a screen can show', () => {
    const roster: EndlessTape[] = [{ name: '2026', tape: ROSTER[0]!.tape }, ...ROSTER.slice(1)];
    expect(() => endlessPlan(roster, { seed: 1, calls: 2 })).toThrow(/no name the screen can show/);
  });

  it('says a breather once, not three times in one header', () => {
    const run = runEndless(ROSTER, { ...OPTS, calls: 10, bot: (r) => botFor('idle', r) });
    const words = endlessWords(run);
    for (const line of words) {
      if (!line.includes(' · ')) continue;
      const parts = line.split(' · ');
      expect(new Set(parts).size, line).toBe(parts.length);
    }
    // The breather's climb word says the climb is held; the trough flavor's
    // telegraph already says the call is a rest.
    const breather = endlessPlan(ROSTER, { seed: 3, calls: 10 }).find((c) => c.breather);
    expect(breather).toBeDefined();
    expect(breather!.reachWord).toBe(BREATHER_REACH);
    expect(breather!.reachWord).not.toBe(
      DEFAULT_PATTERNS.shift.flavors.find((f) => f.role === 'trough')?.telegraph,
    );
  });

  it('keeps climbing both word ladders past the tables that used to saturate', () => {
    // Both ladders ran out — the places at twelve, the reach near the
    // twenty-eighth — so a fifty-call run read exactly like a thirteen-call
    // one, in a mode whose whole progress signal is words.
    const places = new Set<string>();
    for (const i of [11, 12, 17, 18, 25, 26, 33, 34, 50]) places.add(placeWord(i));
    expect(places.size).toBeGreaterThan(4);
    expect(placeWord(12)).not.toBe(placeWord(11));
    expect(placeWord(40)).not.toBe(placeWord(12));
    expect(beyondWord(0)).not.toBe(beyondWord(40));
    for (const word of [...places, beyondWord(0), beyondWord(40)]) {
      expect(word).not.toMatch(/\d/);
    }
  });

  it('walks one bag store across the whole run, not a fresh one per call', () => {
    // Forty calls of four waves is about a hundred and sixty wave-card draws
    // out of pools of thirty-one; a fresh bag per call restarted the walk and
    // abandoned the no-repeat rule in the one mode a player sits in long
    // enough to notice.
    const bags: LineBags = {};
    const run = runEndless(ROSTER, {
      seed: 11,
      tier: 2,
      calls: 8,
      bot: (r) => botFor('sweeper', r),
      bags,
    });
    expect(run.calls.length).toBeGreaterThan(1);

    const pools = new Map<string, string[]>(Object.entries(DEFAULT_PATTERNS.voice.wave));
    const drawn = new Map<string, string[]>();
    for (const call of run.calls) {
      for (const row of call.said) {
        if (row.kind !== 'wave') continue;
        const line = row.text.includes(' — ') ? row.text.split(' — ')[1]! : '';
        for (const [key, pool] of pools) {
          if (!pool.includes(line)) continue;
          const seen = drawn.get(key) ?? [];
          seen.push(line);
          drawn.set(key, seen);
        }
      }
    }
    expect(drawn.size).toBeGreaterThan(0);
    for (const [key, seen] of drawn) {
      // Inside one cycle of a pool no line is heard twice, across the run.
      const cycle = seen.slice(0, pools.get(key)!.length);
      expect(new Set(cycle).size, `${key}: ${cycle.join(' | ')}`).toBe(cycle.length);
    }

    // And the store the caller handed in is the one every call walked: its
    // walk length matches the draws the run actually made.
    let total = 0;
    for (const [key, seen] of drawn) {
      const bag = bags[`wave/${key}`];
      expect(bag, key).toBeDefined();
      expect(bag!.cycle * bag!.order.length + bag!.at, key).toBe(seen.length);
      total += seen.length;
    }
    // More draws than there were calls, so the walk provably crossed a call
    // boundary rather than restarting inside each one.
    expect(total).toBeGreaterThan(run.calls.length);
  });

  it('reads a call line off the record rather than guessing from clean', () => {
    const run = runEndless(ROSTER, { ...OPTS, calls: 8, bot: (r) => botFor('reader', r) });
    const words = endlessWords(run);
    const lines = words.filter((l) => l.includes('the chain reads'));
    expect(lines.length).toBe(run.calls.length);
    run.calls.forEach((call, i) => {
      const line = lines[i]!;
      // A lamp only 'comes back' when one actually did: a clean call taken at
      // a full pool refills nothing, which is the ordinary case and includes
      // the first call of every run.
      if (call.lampsBack > 0) expect(line).toContain('a lamp comes back');
      else expect(line).not.toContain('a lamp comes back');
      if (call.clean && call.lampsBack === 0) expect(line).toContain('the call ran clean');
    });
    // The call that ENDS the run says so in its own line.
    if (run.ended === 'lamps') expect(lines[lines.length - 1]).toContain('the last lamp went');
  });

  it('names the rung in words wherever it used to print a tier index', () => {
    const run = runEndless(ROSTER, { ...OPTS, calls: 3, bot: (r) => botFor('idle', r) });
    const words = endlessWords(run);
    const footer = words.find((l) => l.startsWith('the run:'))!;
    expect(footer).toContain(rungWord(run.difficulty));
    // The rank word means a different scale on every rung, so the rung is
    // named beside it rather than left to be inferred.
    expect(footer).toContain(run.rank);
    expect(ENDLESS_NO_TIER_ZERO).toContain(rungWord(0));
    expect(ENDLESS_NO_TIER_ZERO).toContain(rungWord(1));
  });
});
