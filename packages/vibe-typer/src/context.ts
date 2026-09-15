// G26: the context bar is the pace. It drains at the level's rate, each user
// message costs a slice, shipping refills a share, and in hardcore every
// mistyped character burns. Mid-level, the drain rate is the only ramp (Q3.8).
//
// Pure, clamped to 0..1 at every boundary.

import type { LevelPlan } from './types';

export const FULL = 1;
export const EMPTY = 0;

export function clamp(context: number): number {
  if (!Number.isFinite(context)) return EMPTY;
  return Math.min(FULL, Math.max(EMPTY, context));
}

/**
 * The drain rate at a request. The level's rate at the first request, and
 * `drainRamp` more by its last — the one thing that ramps inside a level.
 */
export function rateAt(plan: LevelPlan, requestIndex: number): number {
  const last = plan.requests.length - 1;
  const share = last <= 0 ? 0 : Math.min(1, Math.max(0, requestIndex / last));
  return plan.drainPerSec * (1 + plan.drainRamp * share);
}

export function drain(context: number, rate: number, dt: number): number {
  return clamp(context - rate * dt);
}

/** A user message costs a fixed slice of the bar. */
export function spend(context: number, cost: number): number {
  return clamp(context - cost);
}

/** Shipping compacts: the bar gains a share of what is missing, never over full. */
export function refill(context: number, share: number): number {
  return clamp(context + (FULL - context) * share);
}

/** Hardcore only: a mistyped character burns the bar (G26). */
export function burn(context: number, amount: number): number {
  return clamp(context - amount);
}

/** A ship with the bar nearly empty is authored as a near-miss (Q3.6). */
export const NEAR_MISS = 0.1;

export function isNearMiss(context: number): boolean {
  return context < NEAR_MISS;
}
