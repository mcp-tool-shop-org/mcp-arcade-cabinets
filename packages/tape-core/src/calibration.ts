import type { Tape } from './types';

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
