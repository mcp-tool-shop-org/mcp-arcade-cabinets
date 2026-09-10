// The tape shape House Call reads is tape-core's: one `Tape` type in the
// workspace, one loader, one set of forbidden keys. Nothing here can hold a
// verdict. House Call adds only the call-side types.

export type { Fact, Tape, TapeAtom, TapeRow } from '@mcp-arcade-cabinets/tape-core';
import type { Fact } from '@mcp-arcade-cabinets/tape-core';

/** The outcomes a player may call on a turn. One set per atom kind. */
export type Outcome = Fact;

export interface TurnOutcomes {
  atomId: string;
  outcomes: readonly Outcome[];
}

/** What the player commits: one outcome and a confidence on it, in [0.5, 1]. */
export interface Call {
  outcome: Outcome;
  confidence: number;
}
