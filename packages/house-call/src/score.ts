// Scoring for House Call (lock G3): a proper scoring rule on the stated
// confidence, bounded, so hedging is priced and no answer is free.
//
// Multi-class Brier over the turn's outcome set. The player puts `confidence`
// on the chosen outcome and the remaining mass is spread evenly across the
// others. Score is the sum of squared differences to the one-hot truth:
// lower is better, 0 is perfect, and the worst case for k outcomes with full
// confidence on a wrong answer is 2.
//
// Worked values (k = 2): right at 0.8 -> 0.08; wrong at 0.8 -> 1.28;
// right at 0.5 -> 0.5; wrong at 0.5 -> 0.5 (a coin flip scores the same either
// way, which is the whole point).
//
// Nothing here reads NRP, integrity or utility; the truth is a tape fact.

import type { Call, Outcome } from './types';

export const MIN_CONFIDENCE = 0.5;
export const MAX_CONFIDENCE = 1;

export function clampConfidence(p: number): number {
  if (!Number.isFinite(p)) return MIN_CONFIDENCE;
  return Math.min(MAX_CONFIDENCE, Math.max(MIN_CONFIDENCE, p));
}

/** The probability vector implied by a call over `outcomes`. */
export function implied(call: Call, outcomes: readonly Outcome[]): Map<Outcome, number> {
  const p = clampConfidence(call.confidence);
  const others = outcomes.filter((o) => o !== call.outcome);
  const rest = others.length ? (1 - p) / others.length : 0;
  const m = new Map<Outcome, number>();
  for (const o of outcomes) m.set(o, o === call.outcome ? p : rest);
  return m;
}

/** Multi-class Brier score of a call against the true outcome. Lower is better. */
export function brier(call: Call, truth: Outcome, outcomes: readonly Outcome[]): number {
  if (!outcomes.includes(call.outcome)) {
    throw new Error(`call outcome ${call.outcome} is not one of ${outcomes.join(', ')}`);
  }
  const probs = implied(call, outcomes);
  let sum = 0;
  for (const o of outcomes) {
    const p = probs.get(o) ?? 0;
    const y = o === truth ? 1 : 0;
    sum += (p - y) ** 2;
  }
  return round(sum);
}

export interface ReliabilityBin {
  /** Inclusive lower bound of stated confidence for this bin. */
  from: number;
  /** Exclusive upper bound (inclusive for the last bin). */
  to: number;
  /** Turns whose stated confidence fell in this bin. */
  n: number;
  /** Mean stated confidence in the bin. */
  predicted: number;
  /** Share of those turns where the called outcome was the truth. */
  observed: number;
}

/**
 * Reliability readout (lock G4): predicted confidence vs observed hit rate,
 * per confidence bin. Shown at the end of a run, on demand. Bins default to
 * [0.5,0.6), [0.6,0.7), [0.7,0.8), [0.8,0.9), [0.9,1.0].
 */
export function reliability(
  turns: readonly { confidence: number; hit: boolean }[],
  edges: readonly number[] = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
): ReliabilityBin[] {
  const bins: ReliabilityBin[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const from = edges[i] ?? 0;
    const to = edges[i + 1] ?? 1;
    const last = i === edges.length - 2;
    const inBin = turns.filter((t) => {
      const c = clampConfidence(t.confidence);
      return c >= from && (last ? c <= to : c < to);
    });
    const n = inBin.length;
    const predicted = n ? inBin.reduce((a, t) => a + clampConfidence(t.confidence), 0) / n : 0;
    const observed = n ? inBin.filter((t) => t.hit).length / n : 0;
    bins.push({ from, to, n, predicted: round(predicted), observed: round(observed) });
  }
  return bins;
}

export function meanBrier(scores: readonly number[]): number {
  if (!scores.length) return 0;
  return round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function round(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}
