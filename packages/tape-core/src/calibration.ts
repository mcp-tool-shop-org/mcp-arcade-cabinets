import { TapeError, type Tape } from './types';

export const MIN_CONFIDENCE = 0.5;
export const MAX_CONFIDENCE = 1;

/** Clamp a stated confidence into [0.5, 1]. Non-finite values become 0.5. */
export function clampConfidence(p: number): number {
  if (!Number.isFinite(p)) return MIN_CONFIDENCE;
  return Math.min(MAX_CONFIDENCE, Math.max(MIN_CONFIDENCE, p));
}

function round(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}

/**
 * Probability vector implied by a call: clamped confidence on the named
 * outcome, remaining mass spread evenly over the others.
 */
export function implied(
  call: { outcome: string; confidence: number },
  outcomes: readonly string[],
): Map<string, number> {
  if (outcomes.length < 2) {
    throw new TapeError('outcomes must have at least two entries');
  }
  if (!outcomes.includes(call.outcome)) {
    throw new TapeError(`call outcome ${call.outcome} is not one of ${outcomes.join(', ')}`);
  }
  const p = clampConfidence(call.confidence);
  const others = outcomes.filter((o) => o !== call.outcome);
  const rest = (1 - p) / others.length;
  const m = new Map<string, number>();
  for (const o of outcomes) m.set(o, o === call.outcome ? p : rest);
  return m;
}

/**
 * Multi-class Brier: sum over outcomes of (implied − one-hot)².
 * Lower is better; 0 is perfect; worst case at full confidence on a wrong
 * answer is 2 (any k ≥ 2). Cabinets should use this so 2- and 3-outcome
 * turns share one scale.
 *
 * Worked values: right at 0.8 on two outcomes → 0.08; right at 0.9 on three
 * → 0.015; wrong at 1.0 on two → 2.
 *
 * Does not accept or emit NRP, integrity, or utility.
 */
export function brierMulti(
  call: { outcome: string; confidence: number },
  truth: string,
  outcomes: readonly string[],
): number {
  if (!outcomes.includes(truth)) {
    throw new TapeError(`truth ${truth} is not one of ${outcomes.join(', ')}`);
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

/** Mean of Brier scores. Empty list is 0. */
export function meanBrier(scores: readonly number[]): number {
  if (!scores.length) return 0;
  return round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/**
 * Binary Brier score for a call that names a side with confidence p ∈ [0.5, 1].
 *
 * Mapping: the player names one side (the call) and states p, the probability
 * that this side is the tape fact. p cannot be below 0.5 because the player
 * would have named the other side instead.
 *
 * Let o = 1 if the named side matches the tape (`outcome` true), else 0.
 * The implied probability on the named side is p; on the other side is 1 − p.
 * The score is (p − o)². Lower is better; 0 is perfect.
 *
 * This is exactly half of `brierMulti` for k = 2: the two-class sum is
 * (p − o)² + ((1 − p) − (1 − o))² = 2(p − o)². Cabinets should use
 * `brierMulti` so 2- and 3-outcome turns share one scale.
 *
 * Worked values: p=0.8 right → 0.04; p=0.8 wrong → 0.64; p=1 right → 0;
 * p=1 wrong → 1; p=0.5 either way → 0.25.
 *
 * This function does not accept or emit NRP, integrity, or utility.
 */
export function brier(p: number, outcome: boolean): number {
  if (!Number.isFinite(p) || p < 0.5 || p > 1) {
    throw new Error(`confidence p must be in [0.5, 1], got ${p}`);
  }
  const o = outcome ? 1 : 0;
  return (p - o) ** 2;
}

/** One binary call: stated confidence p on the chosen side, and whether it matched. */
export interface BinaryCall {
  p: number;
  outcome: boolean;
}

/** Predicted vs observed rate for one confidence bin. */
export interface ReliabilityBin {
  predicted: number;
  observed: number;
  n: number;
}

/**
 * Reliability diagram: predicted vs observed rate per confidence bin.
 * `bins` is already grouped (one inner array per bin). Empty bins are omitted.
 * Does not accept or emit NRP, integrity, or utility.
 */
export function reliability(bins: readonly (readonly BinaryCall[])[]): ReliabilityBin[] {
  const out: ReliabilityBin[] = [];
  for (const bin of bins) {
    if (bin.length === 0) continue;
    let pSum = 0;
    let hits = 0;
    for (const call of bin) {
      if (!Number.isFinite(call.p) || call.p < 0.5 || call.p > 1) {
        throw new Error(`confidence p must be in [0.5, 1], got ${call.p}`);
      }
      pSum += call.p;
      if (call.outcome) hits += 1;
    }
    out.push({
      predicted: pSum / bin.length,
      observed: hits / bin.length,
      n: bin.length,
    });
  }
  return out;
}

/** Coverage cell: distinct (server, atom, policy). Never summed into a score. */
export function coverageKey(tape: Tape, atomId: string): string {
  return `${tape.server_name ?? ''}|${atomId}|${tape.agent_policy}`;
}
