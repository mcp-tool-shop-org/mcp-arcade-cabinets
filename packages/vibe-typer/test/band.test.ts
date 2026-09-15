// The fairness band. Every bar here is the andon: a failure stops the build.
// Three seeds, every listed level, every tier. The numbers the bars measure
// live in patterns/levels.json and patterns/context.json; when a bar fails,
// the levers move, not the bar.

import { describe, expect, it } from 'vitest';

import { DEFAULT_PATTERNS } from '../src/patterns';
import { hypeLadder } from '../src/score';
import { SCREEN_FORBIDDEN } from '../src/play';
import { drive, LEVELS, SEEDS, TIERS } from './helpers';
import type { Tier } from '../src/types';

const REQUESTS = DEFAULT_PATTERNS.levels.levels.map((l) => l.requests);
/** Idle proves nothing ships by itself; half an hour of it is proof enough. */
const IDLE_TICKS = 60 * 60 * 30;

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

  it('keeps the dated jokes off unless they are asked for', () => {
    const plain = drive({ bot: 'perfect', seed: 1, tier: 0, level: 0 });
    const dated = new Set(DEFAULT_PATTERNS.user.dated);
    expect(plain.lines.some((line) => dated.has(line))).toBe(false);
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
