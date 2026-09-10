// `mcp-arcade.tape/v1` — the only document cabinets may load (lock G1).

export const TAPE_SCHEMA_ID = 'mcp-arcade.tape/v1' as const;
export type TapeSchemaId = typeof TAPE_SCHEMA_ID;

/** Keys a receipt carries and a tape must never carry. Walked at every depth. */
export const FORBIDDEN_KEYS = [
  'scores',
  'contrastive',
  'operator_call',
  'checks',
  'result',
  'attack_success',
  'nrp',
  'integrity',
  'utility',
] as const;

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

export const FACTS: readonly Fact[] = [
  'followed',
  'held',
  'no_call',
  'ghost_answered',
  'ghost_refused',
  'ghost_skipped',
  'menu_changed',
  'menu_stable',
  'menu_unknown',
];

export interface TapeAtom {
  id: string;
  task_tool: string | null;
  holdout: boolean;
}

export interface TapeRow {
  seq: number;
  direction: string;
  method: string;
  rpc_id: string;
  atom: string;
  holdout: boolean;
  note: string;
}

export interface TapeFact {
  atom_id: string;
  fact: Fact;
}

export interface TapeContainer {
  image_id: string | null;
  name_prefix: string | null;
}

export interface TapeSeat {
  model: string | null;
  template_sha256: string | null;
}

export interface Tape {
  schema_id: TapeSchemaId;
  bout_id: string;
  target_kind: string;
  agent_policy: string;
  framing: string | null;
  protocol_version: string | null;
  server_name: string | null;
  container: TapeContainer | null;
  seat: TapeSeat | null;
  attribution_ok: boolean;
  atoms: TapeAtom[];
  rows: TapeRow[];
  facts: TapeFact[];
}

export interface AtomSlice {
  atom: TapeAtom;
  rows: TapeRow[];
}

export class TapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TapeError';
  }
}
