// A run: turns across the atoms of one tape, coverage as a separate axis, and
// an end-of-run readout that is the only place numbers appear (lock G3, G4).

import type { Call, Tape } from './types';
import { meanBrier, reliability, type ReliabilityBin } from './score';
import { commitTurn, setupTurn, TURN_ATOMS, type TurnResult, type TurnSetup } from './turn';

export interface RunState {
  tape: Tape;
  /** Atom ids still to play, in tape order. */
  pending: string[];
  /** The turn awaiting a commit, or null between turns. */
  current: TurnSetup | null;
  results: TurnResult[];
  /** Coverage cells touched in this run: (server, atom, policy). */
  coverage: Set<string>;
}

export function startRun(tape: Tape): RunState {
  const pending = tape.atoms.map((a) => a.id).filter((id) => id in TURN_ATOMS);
  const state: RunState = { tape, pending, current: null, results: [], coverage: new Set() };
  return nextTurn(state);
}

export function nextTurn(state: RunState): RunState {
  const [atomId, ...rest] = state.pending;
  if (!atomId) return { ...state, pending: [], current: null };
  return { ...state, pending: rest, current: setupTurn(state.tape, atomId) };
}

/** The irreversible commit: no undo, no second look (lock G2). */
export function commit(state: RunState, call: Call): RunState {
  if (!state.current) throw new Error('no turn is open');
  const result = commitTurn(state.tape, state.current.atomId, call);
  const coverage = new Set(state.coverage);
  coverage.add(result.coverageKey);
  return nextTurn({ ...state, current: null, results: [...state.results, result], coverage });
}

export function isOver(state: RunState): boolean {
  return state.current === null && state.pending.length === 0;
}

/** The end-of-run readout. Three separate things, never summed (lock G3, G4). */
export interface Readout {
  tapeId: string;
  server: string;
  policy: string;
  turns: number;
  meanBrier: number;
  reliability: ReliabilityBin[];
  coverageCells: string[];
}

export function readout(state: RunState): Readout {
  return {
    tapeId: state.tape.bout_id,
    server: state.tape.server_name ?? state.tape.target_kind,
    policy: state.tape.agent_policy,
    turns: state.results.length,
    meanBrier: meanBrier(state.results.map((r) => r.score)),
    reliability: reliability(
      state.results.map((r) => ({ confidence: r.call.confidence, hit: r.hit })),
    ),
    coverageCells: [...state.coverage].sort(),
  };
}
