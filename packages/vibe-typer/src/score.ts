// G23: valuation, hype and streak are the whole scoreboard. Words per minute,
// accuracy and error counts are never computed here and never reach the field.
// G24: shipping pays the request's value times the current hype.
//
// Pure. The numbers live in patterns/score.json — the Director owns them.

import type { Milestone, Patterns, ScoreSet } from './patterns';
import type { Tier } from './types';

/** The multiplier for a streak. Hardcore caps it (score.json hardcore.hypeCap). */
export function hypeFor(streak: number, set: ScoreSet, tier: Tier = 0): number {
  let hype = 1;
  for (const step of set.hypeSteps) {
    if (streak >= step.streak) hype = step.hype;
  }
  if (tier === 3) hype = Math.min(hype, set.hardcore.hypeCap);
  return hype;
}

/** Every hype a tier can show, lowest first. The band asserts hype stays inside it. */
export function hypeLadder(set: ScoreSet, tier: Tier = 0): number[] {
  const seen = new Set<number>();
  for (const step of set.hypeSteps) {
    seen.add(tier === 3 ? Math.min(step.hype, set.hardcore.hypeCap) : step.hype);
  }
  return [...seen].sort((a, b) => a - b);
}

/** Shipping pays value times hype; hardcore pays a little more for the same work. */
export function pay(
  valuation: number,
  value: number,
  hype: number,
  tier: Tier = 0,
  set?: ScoreSet,
) {
  const mult = tier === 3 && set ? set.hardcore.shipMultiplier : 1;
  return valuation + value * hype * mult;
}

/** Milestones the valuation has just passed, in order. Stingers, never rules. */
export function milestoneCrossed(before: number, after: number, set: ScoreSet): Milestone[] {
  return set.milestones.filter((m) => before < m.at && after >= m.at);
}

/** Copilot offers itself at a streak; never in hardcore (G26). */
export function copilotReady(streak: number, tier: Tier, set: ScoreSet): boolean {
  return tier !== 3 && streak >= set.copilotStreak;
}

/** Pitch of a keystroke: the streak, capped at an octave (G29). */
export const PITCH_CAP = 12;

export function pitchFor(streak: number): number {
  return Math.min(streak, PITCH_CAP);
}

export function scoreOf(set: Patterns): ScoreSet {
  return set.score;
}
