// A House Call turn (lock G2): full disclosure of what the wire showed up to
// the point of the call, then an irreversible commit of an outcome and a
// confidence, then the rest of the atom's rows scroll in and the tape fact is
// read aloud. The fact is the reveal. No number is shown on the turn.

import type { Call, Fact, Outcome, Tape, TapeRow, TurnOutcomes } from './types';
import { brier, clampConfidence } from './score';

/** Atoms that carry a fact and so make a turn. Inspect has no fact: it is the menu. */
export const TURN_ATOMS: Record<string, readonly Outcome[]> = {
  'poison.follow_through': ['followed', 'held', 'no_call'],
  'protocol.unlisted_call': ['ghost_answered', 'ghost_refused', 'ghost_skipped'],
  'temporal.rug_pull': ['menu_changed', 'menu_stable', 'menu_unknown'],
};

export function turnOutcomes(atomId: string): TurnOutcomes | null {
  const outcomes = TURN_ATOMS[atomId];
  return outcomes ? { atomId, outcomes } : null;
}

export function factFor(tape: Tape, atomId: string): Fact | null {
  return tape.facts.find((f) => f.atom_id === atomId)?.fact ?? null;
}

export function rowsFor(tape: Tape, atomId: string): TapeRow[] {
  return tape.rows.filter((r) => r.atom === atomId);
}

/**
 * Split an atom's rows into what the player sees before the commit and what
 * scrolls in after. Disclosure runs through the menu (the first inbound
 * response to tools/list) and any notifications before the first outbound
 * tools/call. Everything from the first tools/call on is the reveal. For the
 * rug-pull atom the disclosure ends after the first menu too: the N clean calls
 * and the second menu are the reveal.
 */
export function splitRows(rows: readonly TapeRow[]): { disclosure: TapeRow[]; reveal: TapeRow[] } {
  const firstCall = rows.findIndex((r) => r.direction === 'out' && r.method === 'tools/call');
  if (firstCall === -1) return { disclosure: [...rows], reveal: [] };
  return { disclosure: rows.slice(0, firstCall), reveal: rows.slice(firstCall) };
}

export interface PartyMember {
  /** rookie | veteran | recruit — one verb each (lock G5). */
  role: 'rookie' | 'veteran' | 'recruit';
  policy: string;
  verb: string;
  /** For the recruit only: model name from the tape header, or null. */
  model: string | null;
}

/** The party member acting on this tape, from tape facts alone. */
export function partyMember(tape: Tape): PartyMember {
  switch (tape.agent_policy) {
    case 'naive':
      return { role: 'rookie', policy: 'naive', verb: 'follows every whisper', model: null };
    case 'task-only':
      return { role: 'veteran', policy: 'task-only', verb: 'does the job and stops', model: null };
    default:
      return {
        role: 'recruit',
        policy: tape.agent_policy,
        verb: 'is the one you are trying to read',
        model: tape.seat?.model ?? null,
      };
  }
}

export interface TurnSetup {
  atomId: string;
  outcomes: readonly Outcome[];
  disclosure: TapeRow[];
  taskTool: string | null;
  holdout: boolean;
  party: PartyMember;
  server: string;
}

export interface TurnResult {
  atomId: string;
  call: Call;
  truth: Fact;
  hit: boolean;
  /** Multi-class Brier of the call. Never shown during the run (lock G4). */
  score: number;
  reveal: TapeRow[];
  coverageKey: string;
}

export function coverageKey(tape: Tape, atomId: string): string {
  return `${tape.server_name ?? tape.target_kind}|${atomId}|${tape.agent_policy}`;
}

/** What the player sees before committing. Contains no fact and no score. */
export function setupTurn(tape: Tape, atomId: string): TurnSetup | null {
  const outcomes = turnOutcomes(atomId);
  if (!outcomes) return null;
  const atom = tape.atoms.find((a) => a.id === atomId);
  if (!atom) return null;
  const { disclosure } = splitRows(rowsFor(tape, atomId));
  return {
    atomId,
    outcomes: outcomes.outcomes,
    disclosure,
    taskTool: atom.task_tool,
    holdout: atom.holdout,
    party: partyMember(tape),
    server: tape.server_name ?? tape.target_kind,
  };
}

/**
 * The irreversible commit. Returns the resolved turn: the tape fact is the
 * truth, the reveal rows scroll in, the score is computed but not surfaced.
 */
export function commitTurn(tape: Tape, atomId: string, call: Call): TurnResult {
  const outcomes = turnOutcomes(atomId);
  if (!outcomes) throw new Error(`${atomId} is not a turn atom`);
  const truth = factFor(tape, atomId);
  if (!truth) throw new Error(`tape ${tape.bout_id} has no fact for ${atomId}`);
  const clean: Call = { outcome: call.outcome, confidence: clampConfidence(call.confidence) };
  const { reveal } = splitRows(rowsFor(tape, atomId));
  return {
    atomId,
    call: clean,
    truth,
    hit: clean.outcome === truth,
    score: brier(clean, truth, outcomes.outcomes),
    reveal,
    coverageKey: coverageKey(tape, atomId),
  };
}
