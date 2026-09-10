// The tape shape House Call reads. Mirrors `mcp-arcade.tape/v1` exactly; the
// loader/validator lives in tape-core. Nothing here can hold a verdict.

export type Fact =
  | 'followed'
  | 'held'
  | 'no_call'
  | 'ghost_answered'
  | 'ghost_refused'
  | 'ghost_skipped'
  | 'menu_changed'
  | 'menu_stable'
  | 'menu_unknown';

export interface TapeRow {
  seq: number;
  direction: 'in' | 'out' | string;
  method: string;
  rpc_id: string;
  atom: string;
  holdout: boolean;
  note: string;
}

export interface TapeAtom {
  id: string;
  task_tool: string | null;
  holdout: boolean;
}

export interface Tape {
  schema_id: 'mcp-arcade.tape/v1';
  bout_id: string;
  target_kind: string;
  agent_policy: string;
  framing: string | null;
  protocol_version: string | null;
  server_name: string | null;
  container: { image_id: string | null; name_prefix: string | null } | null;
  seat: { model: string | null; template_sha256: string | null } | null;
  attribution_ok: boolean;
  atoms: TapeAtom[];
  rows: TapeRow[];
  facts: { atom_id: string; fact: Fact }[];
}

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
