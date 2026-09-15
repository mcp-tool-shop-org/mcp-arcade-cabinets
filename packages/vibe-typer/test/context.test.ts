import { describe, expect, it } from 'vitest';

import {
  burn,
  clamp,
  drain,
  EMPTY,
  FULL,
  isNearMiss,
  NEAR_MISS,
  rateAt,
  refill,
  spend,
} from '../src/context';
import { DEFAULT_PATTERNS, tierContext } from '../src/patterns';
import { createRun } from '../src/sim';

describe('the context bar', () => {
  it('never leaves the bar', () => {
    expect(clamp(-4)).toBe(EMPTY);
    expect(clamp(9)).toBe(FULL);
    expect(clamp(Number.NaN)).toBe(EMPTY);
    expect(drain(0.01, 1, 1)).toBe(EMPTY);
    expect(spend(0.02, 0.5)).toBe(EMPTY);
    expect(refill(0.99, 1)).toBe(FULL);
    expect(burn(0.005, 0.01)).toBe(EMPTY);
  });

  it('drains by rate and time, and pays for a message', () => {
    expect(drain(1, 0.01, 10)).toBeCloseTo(0.9, 10);
    expect(spend(1, 0.05)).toBeCloseTo(0.95, 10);
    expect(burn(1, 0.01)).toBeCloseTo(0.99, 10);
  });

  it('refills a share of what is missing, never more', () => {
    expect(refill(0, 0.5)).toBeCloseTo(0.5, 10);
    expect(refill(0.5, 0.5)).toBeCloseTo(0.75, 10);
    expect(refill(1, 0.5)).toBe(FULL);
    expect(refill(0.4, 0)).toBeCloseTo(0.4, 10);
  });

  it('ramps the drain across a level and nowhere else', () => {
    const state = createRun({ seed: 7, tier: 0, endless: false });
    const plan = state.plan;
    const first = rateAt(plan, 0);
    const last = rateAt(plan, plan.requests.length - 1);
    expect(first).toBeCloseTo(plan.drainPerSec, 10);
    expect(last).toBeCloseTo(plan.drainPerSec * (1 + plan.drainRamp), 10);
    expect(rateAt(plan, 99)).toBe(last);
    expect(rateAt(plan, -3)).toBe(first);
  });

  it('scales the drain by tier and softens the refill as it climbs', () => {
    const set = DEFAULT_PATTERNS;
    expect(tierContext(set, 0).drainScale).toBe(1);
    expect(tierContext(set, 3).drainScale).toBeGreaterThan(tierContext(set, 0).drainScale);
    expect(tierContext(set, 3).refillShare).toBeLessThan(tierContext(set, 0).refillShare);
    const easy = createRun({ seed: 7, tier: 0, endless: false });
    const hard = createRun({ seed: 7, tier: 3, endless: false });
    expect(hard.plan.drainPerSec).toBeGreaterThan(easy.plan.drainPerSec);
  });

  it('calls a ship on an almost empty bar a near miss', () => {
    expect(isNearMiss(NEAR_MISS / 2)).toBe(true);
    expect(isNearMiss(NEAR_MISS)).toBe(false);
    expect(isNearMiss(1)).toBe(false);
  });
});
