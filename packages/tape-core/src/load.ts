import {
  FACTS,
  FORBIDDEN_KEYS,
  TAPE_SCHEMA_ID,
  TapeError,
  type Fact,
  type Tape,
  type TapeAtom,
  type TapeContainer,
  type TapeFact,
  type TapeRow,
  type TapeSeat,
} from './types';

const FORBIDDEN = new Set<string>(FORBIDDEN_KEYS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function walkForbidden(value: unknown, path: string): void {
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) walkForbidden(value[i], `${path}[${i}]`);
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN.has(key)) {
      throw new TapeError(`forbidden key "${key}" at ${path || '(root)'}`);
    }
    walkForbidden(child, path ? `${path}.${key}` : key);
  }
}

function req(obj: Record<string, unknown>, key: string, path: string): unknown {
  if (!Object.prototype.hasOwnProperty.call(obj, key)) {
    throw new TapeError(`missing "${key}" at ${path}`);
  }
  return obj[key];
}

function asString(value: unknown, path: string): string {
  if (typeof value !== 'string') throw new TapeError(`${path} must be a string`);
  return value;
}

function asStringOrNull(value: unknown, path: string): string | null {
  if (value === null) return null;
  if (typeof value === 'string') return value;
  throw new TapeError(`${path} must be a string or null`);
}

function asBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') throw new TapeError(`${path} must be a boolean`);
  return value;
}

function asFiniteNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TapeError(`${path} must be a finite number`);
  }
  return value;
}

function asFact(value: unknown, path: string): Fact {
  if (typeof value !== 'string' || !(FACTS as readonly string[]).includes(value)) {
    throw new TapeError(`${path} is not a tape fact`);
  }
  return value as Fact;
}

function loadContainer(value: unknown, path: string): TapeContainer | null {
  if (value === null) return null;
  if (!isRecord(value)) throw new TapeError(`${path} must be an object or null`);
  return {
    image_id: asStringOrNull(req(value, 'image_id', path), `${path}.image_id`),
    name_prefix: asStringOrNull(req(value, 'name_prefix', path), `${path}.name_prefix`),
  };
}

function loadSeat(value: unknown, path: string): TapeSeat | null {
  if (value === null) return null;
  if (!isRecord(value)) throw new TapeError(`${path} must be an object or null`);
  return {
    model: asStringOrNull(req(value, 'model', path), `${path}.model`),
    template_sha256: asStringOrNull(req(value, 'template_sha256', path), `${path}.template_sha256`),
  };
}

function loadAtom(value: unknown, path: string): TapeAtom {
  if (!isRecord(value)) throw new TapeError(`${path} must be an object`);
  return {
    id: asString(req(value, 'id', path), `${path}.id`),
    task_tool: asStringOrNull(req(value, 'task_tool', path), `${path}.task_tool`),
    holdout: asBoolean(req(value, 'holdout', path), `${path}.holdout`),
  };
}

function loadRow(value: unknown, path: string): TapeRow {
  if (!isRecord(value)) throw new TapeError(`${path} must be an object`);
  return {
    seq: asFiniteNumber(req(value, 'seq', path), `${path}.seq`),
    direction: asString(req(value, 'direction', path), `${path}.direction`),
    method: asString(req(value, 'method', path), `${path}.method`),
    rpc_id: asString(req(value, 'rpc_id', path), `${path}.rpc_id`),
    atom: asString(req(value, 'atom', path), `${path}.atom`),
    holdout: asBoolean(req(value, 'holdout', path), `${path}.holdout`),
    note: asString(req(value, 'note', path), `${path}.note`),
  };
}

function loadFact(value: unknown, path: string): TapeFact {
  if (!isRecord(value)) throw new TapeError(`${path} must be an object`);
  return {
    atom_id: asString(req(value, 'atom_id', path), `${path}.atom_id`),
    fact: asFact(req(value, 'fact', path), `${path}.fact`),
  };
}

function loadList<T>(value: unknown, path: string, item: (v: unknown, p: string) => T): T[] {
  if (!Array.isArray(value)) throw new TapeError(`${path} must be an array`);
  return value.map((v, i) => item(v, `${path}[${i}]`));
}

/** Validate `mcp-arcade.tape/v1`. Rejects receipts and any forbidden verdict key. */
export function loadTape(json: unknown): Tape {
  if (!isRecord(json)) throw new TapeError('tape must be an object');
  walkForbidden(json, '');
  const schema = asString(req(json, 'schema_id', '(root)'), 'schema_id');
  if (schema !== TAPE_SCHEMA_ID) {
    throw new TapeError(`schema_id must be ${TAPE_SCHEMA_ID}, got ${schema}`);
  }
  return {
    schema_id: TAPE_SCHEMA_ID,
    bout_id: asString(req(json, 'bout_id', '(root)'), 'bout_id'),
    target_kind: asString(req(json, 'target_kind', '(root)'), 'target_kind'),
    agent_policy: asString(req(json, 'agent_policy', '(root)'), 'agent_policy'),
    framing: asStringOrNull(req(json, 'framing', '(root)'), 'framing'),
    protocol_version: asStringOrNull(req(json, 'protocol_version', '(root)'), 'protocol_version'),
    server_name: asStringOrNull(req(json, 'server_name', '(root)'), 'server_name'),
    container: loadContainer(req(json, 'container', '(root)'), 'container'),
    seat: loadSeat(req(json, 'seat', '(root)'), 'seat'),
    attribution_ok: asBoolean(req(json, 'attribution_ok', '(root)'), 'attribution_ok'),
    atoms: loadList(req(json, 'atoms', '(root)'), 'atoms', loadAtom),
    rows: loadList(req(json, 'rows', '(root)'), 'rows', loadRow),
    facts: loadList(req(json, 'facts', '(root)'), 'facts', loadFact),
  };
}
