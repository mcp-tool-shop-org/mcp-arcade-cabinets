// The fairness band. Every bar here is the andon: a failure stops the build.
// Three seeds, every listed level, every tier. The numbers the bars measure
// live in patterns/levels.json and patterns/context.json; when a bar fails,
// the levers move, not the bar.

import { describe, expect, it, vi } from 'vitest';

// The band drives whole runs: sixteen levels, four tiers, three seeds, and the
// check-in bar drives every one of those twice so it can compare the two runs
// byte for byte. That is well past vitest's five-second default, and it grew
// past it the moment the levels went from eight to sixteen. The bars are the
// andon; a bar that fails because the clock ran out tells nobody anything.
vi.setConfig({ testTimeout: 120_000 });

import { DEFAULT_PATTERNS, type Patterns } from '../src/patterns';
import { hypeLadder } from '../src/score';
import { SCREEN_FORBIDDEN } from '../src/play';
import { drive, seatFiller, LEVELS, SEEDS, TIERS, type RunReport } from './helpers';
import type { Tier } from '../src/types';

const REQUESTS = DEFAULT_PATTERNS.levels.levels.map((l) => l.requests);
/** Idle proves nothing ships by itself; half an hour of it is proof enough. */
const IDLE_TICKS = 60 * 60 * 30;
/**
 * Check-ins a level may carry, measured at `typist:40:0.03` on the gentlest
 * tier over seeds 1 to 3 and rounded out: a level runs anywhere from about two
 * minutes to about twenty at forty words a minute, and one interval cannot put
 * every one of them inside the same narrow count.
 *
 * The floor is a floor **for a level long enough to have one**. The gap is
 * drawn from sixty to a hundred and forty seconds and the run's first line is
 * never interrupted, so a level that finishes inside two minutes can honestly
 * see none — the integration level at band three runs about a hundred and
 * fifteen seconds and does exactly that on one seed. `NAG_FLOOR_SECONDS` is
 * where the floor starts applying, and it is the measurement, not a wish.
 */
const NAG_MIN = 1;
const NAG_MAX = 16;
const NAG_FLOOR_SECONDS = 180;

/** The same levers with the check-ins pushed past the end of any run. */
const NAGS_OFF: Patterns = {
  ...DEFAULT_PATTERNS,
  levels: { ...DEFAULT_PATTERNS.levels, nagEvery: { min: 1e9, max: 1e9 } },
};

/** The run with the words taken out: everything a check-in may not move. */
function bones(report: RunReport): string {
  return JSON.stringify({ ...report.state, chat: [], events: [] });
}

function everyLevel(): number[] {
  return Array.from({ length: LEVELS }, (_, i) => i);
}

describe('idle', () => {
  it('never ships a request at any tier', () => {
    for (const tier of TIERS) {
      for (const level of everyLevel()) {
        for (const seed of SEEDS) {
          const run = drive({ bot: 'idle', seed, tier, level, maxTicks: IDLE_TICKS });
          expect(run.pieces, `tier ${tier} level ${level} seed ${seed}`).toBe(0);
          expect(run.valuation).toBe(0);
        }
      }
    }
  });

  it('reaches a compaction under hardcore, and the end of the bar in it', () => {
    for (const tier of [0, 1, 2] as Tier[]) {
      for (const level of everyLevel()) {
        const run = drive({ bot: 'idle', seed: 1, tier, level, maxTicks: IDLE_TICKS });
        expect(run.compactions, `tier ${tier} level ${level}`).toBeGreaterThan(0);
        expect(run.ended).toBeNull();
      }
    }
    for (const level of everyLevel()) {
      for (const seed of SEEDS) {
        const run = drive({ bot: 'idle', seed, tier: 3, level, maxTicks: IDLE_TICKS });
        expect(run.ended, `level ${level} seed ${seed}`).toBe('context');
        expect(run.compactions).toBe(0);
      }
    }
  });
});

describe('the typists', () => {
  it('ships every level at the gentlest tier with no compaction at all', () => {
    for (const level of everyLevel()) {
      for (const seed of SEEDS) {
        const run = drive({ bot: 'typist:40:0.03', seed, tier: 0, level });
        const where = `level ${level} seed ${seed}`;
        expect(run.ended, where).toBe('shipped');
        expect(run.pieces, where).toBe(REQUESTS[level]);
        expect(run.compactions, where).toBe(0);
      }
    }
  });

  it('ships every level one tier up with at most one compaction', () => {
    for (const level of everyLevel()) {
      for (const seed of SEEDS) {
        const run = drive({ bot: 'typist:40:0.03', seed, tier: 1, level });
        const where = `level ${level} seed ${seed}`;
        expect(run.ended, where).toBe('shipped');
        expect(run.pieces, where).toBe(REQUESTS[level]);
        expect(run.compactions, where).toBeLessThanOrEqual(1);
      }
    }
  });

  it('ships every level at the hot tier at sixty words a minute', () => {
    for (const level of everyLevel()) {
      for (const seed of SEEDS) {
        const run = drive({ bot: 'typist:60:0.02', seed, tier: 2, level });
        const where = `level ${level} seed ${seed}`;
        expect(run.ended, where).toBe('shipped');
        expect(run.pieces, where).toBe(REQUESTS[level]);
        expect(run.compactions, where).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('hardcore', () => {
  it('is beatable by a clean ninety words a minute', () => {
    for (const level of everyLevel()) {
      for (const seed of SEEDS) {
        const run = drive({ bot: 'perfect', seed, tier: 3, level });
        const where = `level ${level} seed ${seed}`;
        expect(run.ended, where).toBe('shipped');
        expect(run.pieces, where).toBe(REQUESTS[level]);
        expect(run.compactions, where).toBe(0);
      }
    }
  });

  it('hurts: a forty word typist runs out on at least half the levels', () => {
    let out = 0;
    for (const level of everyLevel()) {
      const ends = SEEDS.map((seed) => drive({ bot: 'typist:40:0.03', seed, tier: 3, level }));
      if (ends.every((run) => run.ended === 'context')) out += 1;
    }
    expect(out).toBeGreaterThanOrEqual(Math.ceil(LEVELS / 2));
  });
});

describe('endless', () => {
  it('runs six levels for a clean typist and two for a fast one', () => {
    for (const seed of SEEDS) {
      const clean = drive({ bot: 'perfect', seed, tier: 0, endless: true });
      expect(clean.ended, `perfect seed ${seed}`).toBe('context');
      expect(clean.levels, `perfect seed ${seed}`).toBeGreaterThanOrEqual(6);
      const typist = drive({ bot: 'typist:40:0.03', seed, tier: 0, endless: true });
      expect(typist.ended, `typist seed ${seed}`).toBe('context');
      expect(typist.levels, `typist seed ${seed}`).toBeGreaterThanOrEqual(2);
    }
  });
});

// G11, as the slice-3 kickoff reads it: endless with a seat is measured on
// its own bar, with the seat swapped for the authored pool. The bar above
// is the pool; this one is the seat, played by gated corpus snippets fed
// the way the shell's prefetch feeds them. Feeding may never shorten a run
// or cost the player anything: `drive` throws the moment a valuation falls.
describe('endless with a seat', () => {
  it('lasts at least as long as the same run with no seat, and never pays less', () => {
    for (const seed of SEEDS) {
      const plain = drive({ bot: 'perfect', seed, tier: 0, endless: true });
      const seated = drive({
        bot: 'perfect',
        seed,
        tier: 0,
        endless: true,
        supply: seatFiller(seed, 0, 4),
      });
      const where = `seed ${seed}`;
      expect(seated.ended, where).toBe('context');
      expect(seated.levels, where).toBeGreaterThanOrEqual(plain.levels);
      expect(seated.pieces, where).toBeGreaterThanOrEqual(plain.pieces);
      expect(seated.valuation, where).toBeGreaterThan(0);
      expect(seated.unexplainedDrops, where).toBe(0);
    }
  });
});

describe('the scoreboard', () => {
  it('never falls, stays on the ladder, and drops the streak only on a miss', () => {
    for (const tier of TIERS) {
      const ladder = hypeLadder(DEFAULT_PATTERNS.score, tier);
      for (const bot of ['typist:40:0.03', 'perfect']) {
        for (const seed of SEEDS) {
          // `drive` throws if the valuation ever falls.
          const run = drive({ bot, seed, tier, level: (seed + tier) % LEVELS });
          const where = `tier ${tier} bot ${bot} seed ${seed}`;
          for (const hype of run.hypes) expect(ladder, where).toContain(hype);
          expect(run.unexplainedDrops, where).toBe(0);
        }
      }
    }
  });

  it('pays every ship and grows the preview by what it counts', () => {
    const run = drive({ bot: 'perfect', seed: 2, tier: 0, level: 3 });
    expect(run.state.built).toHaveLength(run.pieces);
    const built = run.state.built.reduce((n, p) => n + p.size, 0);
    expect(built).toBeGreaterThan(0);
    expect(run.valuation).toBeGreaterThanOrEqual(built);
  });
});

describe('the check-in', () => {
  it('lands a handful a level, and only where it may', () => {
    for (const level of everyLevel()) {
      for (const seed of SEEDS) {
        const run = drive({ bot: 'typist:40:0.03', seed, tier: 0, level });
        const where = `level ${level} seed ${seed}`;
        const seconds = run.ticks / 60;
        if (seconds >= NAG_FLOOR_SECONDS) {
          expect(run.nags, `${where} (${Math.round(seconds)}s)`).toBeGreaterThanOrEqual(NAG_MIN);
        }
        expect(run.nags, where).toBeLessThanOrEqual(NAG_MAX);
        // Never off a code beat — so never in a meeting, a creep, a ship, an
        // ask or a reply — and never on the run's very first line.
        expect(run.nagFaults, where).toBe(0);
      }
    }
  });

  it('keeps to the code beat at every tier, endless included', () => {
    for (const tier of TIERS) {
      for (const seed of SEEDS) {
        const listed = drive({ bot: 'typist:40:0.03', seed, tier, level: (seed + tier) % LEVELS });
        expect(listed.nagFaults, `tier ${tier} seed ${seed}`).toBe(0);
        const endless = drive({ bot: 'typist:40:0.03', seed, tier, endless: true });
        expect(endless.nagFaults, `endless tier ${tier} seed ${seed}`).toBe(0);
      }
    }
  });

  it('changes no valuation, no vibes, no streak and no plan', () => {
    for (const tier of TIERS) {
      for (const level of everyLevel()) {
        for (const seed of SEEDS) {
          const where = `tier ${tier} level ${level} seed ${seed}`;
          const on = drive({ bot: 'typist:40:0.03', seed, tier, level });
          const off = drive({ bot: 'typist:40:0.03', seed, tier, level, levers: NAGS_OFF });
          expect(off.nags, where).toBe(0);
          expect(on.valuation, where).toBe(off.valuation);
          expect(on.hypes, where).toEqual(off.hypes);
          expect(on.state.streak, where).toBe(off.state.streak);
          expect(on.ticks, where).toBe(off.ticks);
          // The whole run minus the words: the plan, the pieces, the bar, the
          // milestones and the weak pairs are the same to the byte.
          expect(bones(on), where).toBe(bones(off));
        }
      }
    }
  });
});

describe('the words', () => {
  it('keeps a digit and a barred word off every line the chat says', () => {
    for (const tier of TIERS) {
      for (const level of everyLevel()) {
        const run = drive({ bot: 'typist:50:0.05', seed: 2, tier, level });
        for (const line of run.lines) {
          expect(SCREEN_FORBIDDEN.test(line), `tier ${tier} level ${level}: ${line}`).toBe(false);
        }
      }
    }
  });
});

describe('replay', () => {
  it('gives the same run twice for the same seed and bot', () => {
    for (const seed of SEEDS) {
      const a = drive({ bot: 'typist:45:0.04', seed, tier: 1, level: 2 });
      const b = drive({ bot: 'typist:45:0.04', seed, tier: 1, level: 2 });
      expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
      expect(a.ticks).toBe(b.ticks);
    }
  });
});

describe('copilot', () => {
  it('offers itself at least once a level to a clean typist, and never in hardcore', () => {
    for (const level of everyLevel()) {
      for (const seed of SEEDS) {
        const easy = drive({ bot: 'perfect', seed, tier: 0, level });
        expect(easy.copilotOn, `level ${level} seed ${seed}`).toBeGreaterThan(0);
        const hard = drive({ bot: 'perfect', seed, tier: 3, level });
        expect(hard.copilotOn, `hardcore level ${level} seed ${seed}`).toBe(0);
        expect(hard.state.copilot).toBeNull();
      }
    }
  });
});
