// Scoring for House Call (lock G3): a proper scoring rule on the stated
// confidence, bounded, so hedging is priced and no answer is free.
//
// The rule itself lives in tape-core (`brierMulti`): one scale for every
// cabinet, so 2- and 3-outcome turns and the director's thresholds agree.
// Worked values (k = 2): right at 0.8 -> 0.08; wrong at 0.8 -> 1.28; a coin
// flip scores 0.5 whichever way it lands. House Call keeps only the
// reliability readout, which bins by stated confidence for the end screen.
//
// Nothing here reads NRP, integrity or utility; the truth is a tape fact.

import {
  MAX_CONFIDENCE,
  MIN_CONFIDENCE,
  brierMulti,
  clampConfidence,
  implied as impliedCore,
  meanBrier,
} from '@mcp-arcade-cabinets/tape-core';

import type { Call, Outcome } from './types';

export { MAX_CONFIDENCE, MIN_CONFIDENCE, clampConfidence, meanBrier };

/** The probability vector implied by a call over `outcomes`. */
export function implied(call: Call, outcomes: readonly Outcome[]): Map<Outcome, number> {
  return impliedCore(call, outcomes) as Map<Outcome, number>;
}

/** Multi-class Brier score of a call against the true outcome. Lower is better. */
export function brier(call: Call, truth: Outcome, outcomes: readonly Outcome[]): number {
  return brierMulti(call, truth, outcomes);
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

function round(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}
