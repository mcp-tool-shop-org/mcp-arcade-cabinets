import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  FORBIDDEN_KEYS,
  HEADER_MAX_CHARS,
  TAPE_SCHEMA_ID,
  TapeError,
  loadTape,
} from '../src/index';
import { MAX_ATOMS, MAX_FACTS, MAX_ROWS, TEXT_MAX_CHARS } from '../src/load';

const FIXTURES = path.resolve(__dirname, '../../../fixtures/tapes');

function readRaw(name: string): unknown {
  return JSON.parse(readFileSync(path.join(FIXTURES, name), 'utf8'));
}

const RECEIPT = {
  schema_id: 'mcp-arcade.bout/v1',
  bout_id: 'bout_x',
  scores: { nrp: 1, integrity: 'pass', utility: 'pass', attack_success: false },
  contrastive: { foil: 'a', wire: 'b' },
  operator_call: { recorded: false },
  atoms: [{ id: 'inspect.tools_list', result: 'pass', checks: [] }],
  wire: [],
};

describe('loadTape', () => {
  const files = readdirSync(FIXTURES).filter((f) => f.endsWith('.tape.json'));

  it('pins the tape schema id the instrument exports', () => {
    expect(TAPE_SCHEMA_ID).toBe('mcp-arcade.tape/v1');
    // Sixteen from the instrument, four the cabinet recorded of itself.
    expect(files.length).toBe(20);
  });

  it('loads every fixture tape', () => {
    for (const file of files) {
      const tape = loadTape(readRaw(file));
      expect(tape.schema_id).toBe(TAPE_SCHEMA_ID);
      expect(tape.bout_id.length).toBeGreaterThan(0);
      expect(tape.atoms.length).toBeGreaterThan(0);
      expect(tape.rows.length).toBeGreaterThan(0);
    }
  });

  it('rejects a fixture with scores injected', () => {
    const raw = readRaw('naive-ndjson.tape.json') as Record<string, unknown>;
    raw.scores = { nrp: 1 };
    expect(() => loadTape(raw)).toThrow(TapeError);
    expect(() => loadTape(raw)).toThrow(/scores/);
  });

  it('rejects a nested forbidden key on an otherwise valid tape', () => {
    const raw = readRaw('task-only-ndjson.tape.json') as {
      atoms: Record<string, unknown>[];
    };
    raw.atoms[0]!.result = 'pass';
    expect(() => loadTape(raw)).toThrow(/result/);
  });

  it('rejects a receipt-shaped document', () => {
    expect(() => loadTape(RECEIPT)).toThrow(TapeError);
    expect(() => loadTape(RECEIPT)).toThrow(/forbidden key/);
  });

  it('rejects a wrong schema_id', () => {
    const raw = readRaw('naive-ndjson.tape.json') as Record<string, unknown>;
    raw.schema_id = 'mcp-arcade.bout/v1';
    expect(() => loadTape(raw)).toThrow(/schema_id/);
  });

  it('walks every forbidden verdict key', () => {
    expect([...FORBIDDEN_KEYS]).toEqual(
      expect.arrayContaining([
        'scores',
        'contrastive',
        'operator_call',
        'checks',
        'result',
        'attack_success',
        'nrp',
        'integrity',
        'utility',
      ]),
    );
    for (const key of FORBIDDEN_KEYS) {
      const raw = readRaw('naive-ndjson.tape.json') as Record<string, unknown>;
      raw[key] = key === 'nrp' ? 1 : {};
      expect(() => loadTape(raw), key).toThrow(new RegExp(key));
    }
  });

  it('rejects duplicate atom ids', () => {
    const raw = readRaw('naive-ndjson.tape.json') as { atoms: { id: string }[] };
    raw.atoms.push({ ...raw.atoms[0]! });
    expect(() => loadTape(raw)).toThrow(TapeError);
    expect(() => loadTape(raw)).toThrow(/atom/i);
  });

  it('rejects duplicate fact.atom_id', () => {
    const raw = readRaw('naive-ndjson.tape.json') as { facts: { atom_id: string; fact: string }[] };
    raw.facts.push({ ...raw.facts[0]! });
    expect(() => loadTape(raw)).toThrow(TapeError);
    expect(() => loadTape(raw)).toThrow(/atom|fact|duplicate|unique/i);
  });

  it('rejects empty atoms', () => {
    const raw = readRaw('naive-ndjson.tape.json') as { atoms: unknown[] };
    raw.atoms = [];
    expect(() => loadTape(raw)).toThrow(TapeError);
    expect(() => loadTape(raw)).toThrow(/atom/i);
  });

  it('rejects empty rows', () => {
    const raw = readRaw('naive-ndjson.tape.json') as { rows: unknown[] };
    raw.rows = [];
    expect(() => loadTape(raw)).toThrow(TapeError);
    expect(() => loadTape(raw)).toThrow(/row/i);
  });

  it('rejects a row.atom that is not in the atom list', () => {
    const raw = readRaw('naive-ndjson.tape.json') as { rows: { atom: string }[] };
    raw.rows[0]!.atom = 'no.such.atom';
    expect(() => loadTape(raw)).toThrow(TapeError);
    expect(() => loadTape(raw)).toThrow(/atom/i);
  });

  it('rejects a fact.atom_id that is not in the atom list', () => {
    const raw = readRaw('naive-ndjson.tape.json') as { facts: { atom_id: string }[] };
    raw.facts[0]!.atom_id = 'no.such.atom';
    expect(() => loadTape(raw)).toThrow(TapeError);
    expect(() => loadTape(raw)).toThrow(/atom|fact/i);
  });

  it('rejects empty atom ids and ids that contain a colon', () => {
    for (const id of ['', 'para:x', 'foo:bar']) {
      const raw = readRaw('naive-ndjson.tape.json') as { atoms: { id: string }[] };
      raw.atoms[0]!.id = id;
      expect(() => loadTape(raw), `atom id ${JSON.stringify(id)}`).toThrow(TapeError);
      expect(() => loadTape(raw), `atom id ${JSON.stringify(id)}`).toThrow(/empty|:/);
    }
    for (const id of ['', 'para:x', 'foo:bar']) {
      const raw = readRaw('naive-ndjson.tape.json') as { rows: { atom: string }[] };
      raw.rows[0]!.atom = id;
      expect(() => loadTape(raw), `row.atom ${JSON.stringify(id)}`).toThrow(TapeError);
      expect(() => loadTape(raw), `row.atom ${JSON.stringify(id)}`).toThrow(/empty|:/);
    }
  });
});

// The three header fields a cabinet paints on its field (the tape, the
// server, the policy — G10) used to take any string at all: no charset and no
// word constraint, so a tape could smuggle a verdict word straight onto the
// canvas. They are constrained here, at the boundary, as well as stripped by
// the cabinet's renderer. A digit is deliberately still allowed: a server may
// legitimately have one in its name, and refusing the tape over it would make
// a real recording unplayable. The screen strip drops digits before painting.
describe('the header fields a cabinet paints', () => {
  const FIELDS = ['server_name', 'target_kind', 'agent_policy'] as const;

  it('refuses a verdict word in any of them', () => {
    for (const field of FIELDS) {
      for (const word of ['pass', 'fail', 'score', 'cleared', 'lie', 'revealed', 'followed']) {
        const raw = readRaw('naive-ndjson.tape.json') as Record<string, unknown>;
        raw[field] = `acme ${word} labs`;
        expect(() => loadTape(raw), `${field}=${word}`).toThrow(TapeError);
        expect(() => loadTape(raw), `${field}=${word}`).toThrow(new RegExp(word));
      }
      for (const fact of ['ghost_answered', 'menu_changed', 'held']) {
        const raw = readRaw('naive-ndjson.tape.json') as Record<string, unknown>;
        raw[field] = fact;
        expect(() => loadTape(raw), `${field}=${fact}`).toThrow(TapeError);
      }
    }
  });

  it('refuses a control character or an unbounded header', () => {
    for (const field of FIELDS) {
      const raw = readRaw('naive-ndjson.tape.json') as Record<string, unknown>;
      raw[field] = `two\nlines`;
      expect(() => loadTape(raw), `${field} newline`).toThrow(/printable/);
      const long = readRaw('naive-ndjson.tape.json') as Record<string, unknown>;
      long[field] = 'a'.repeat(HEADER_MAX_CHARS + 1);
      expect(() => loadTape(long), `${field} length`).toThrow(/characters/);
    }
  });

  it('still takes an ordinary name, a digit included', () => {
    const raw = readRaw('naive-ndjson.tape.json') as Record<string, unknown>;
    raw.server_name = 'ollama-intern-mcp-3';
    raw.agent_policy = 'naive';
    raw.target_kind = 'stdio';
    expect(loadTape(raw).server_name).toBe('ollama-intern-mcp-3');
  });
});

// The wire had no bound at all. The header fields were capped from the first
// day, but rows, atoms, facts and every free-text field on a row were free to
// be any size, and the prepass that consumes them walks the rows more than
// once per row. A whole-session recording therefore did not fail, it stalled:
// a stdio server or a browser frame that simply stopped answering, with no
// name on it. These bounds make an over-large tape a stated refusal instead.
describe('the size of a tape the loader will take', () => {
  function clone(name = 'naive-ndjson.tape.json'): Record<string, unknown> {
    return readRaw(name) as Record<string, unknown>;
  }

  it('refuses more rows than it will play, and names the limit', () => {
    const raw = clone() as unknown as { rows: Record<string, unknown>[] };
    const row = raw.rows[0]!;
    raw.rows = Array.from({ length: MAX_ROWS + 1 }, (_, i) => ({ ...row, seq: i }));
    expect(() => loadTape(raw)).toThrow(TapeError);
    expect(() => loadTape(raw)).toThrow(new RegExp(`rows.*at most ${MAX_ROWS}`));
  });

  it('refuses more atoms than it will play, and names the limit', () => {
    const raw = clone() as unknown as { atoms: Record<string, unknown>[] };
    const atom = raw.atoms[0]!;
    raw.atoms = Array.from({ length: MAX_ATOMS + 1 }, (_, i) => ({ ...atom, id: `atom.${i}` }));
    expect(() => loadTape(raw)).toThrow(TapeError);
    expect(() => loadTape(raw)).toThrow(new RegExp(`atoms.*at most ${MAX_ATOMS}`));
  });

  it('refuses more facts than it will play, and names the limit', () => {
    const raw = clone() as unknown as { facts: Record<string, unknown>[] };
    const fact = raw.facts[0]!;
    raw.facts = Array.from({ length: MAX_FACTS + 1 }, () => ({ ...fact }));
    expect(() => loadTape(raw)).toThrow(TapeError);
    expect(() => loadTape(raw)).toThrow(new RegExp(`facts.*at most ${MAX_FACTS}`));
  });

  it('refuses an unbounded free-text field on a row, and names the limit', () => {
    for (const field of ['note', 'direction', 'method', 'rpc_id'] as const) {
      const raw = clone() as unknown as { rows: Record<string, unknown>[] };
      raw.rows[0]![field] = 'a'.repeat(TEXT_MAX_CHARS + 1);
      expect(() => loadTape(raw), field).toThrow(TapeError);
      expect(() => loadTape(raw), field).toThrow(
        `rows[0].${field} must be at most ${TEXT_MAX_CHARS} characters`,
      );
    }
  });

  it('refuses an unbounded free-text field at the root, and names the limit', () => {
    for (const field of ['bout_id', 'framing', 'protocol_version'] as const) {
      const raw = clone();
      raw[field] = 'a'.repeat(TEXT_MAX_CHARS + 1);
      expect(() => loadTape(raw), field).toThrow(TapeError);
      expect(() => loadTape(raw), field).toThrow(
        new RegExp(`${field} must be at most ${TEXT_MAX_CHARS} characters`),
      );
    }
  });

  it('still takes a tape that sits on the limits', () => {
    const raw = clone() as unknown as { rows: Record<string, unknown>[]; bout_id: string };
    raw.rows[0]!.note = 'a'.repeat(TEXT_MAX_CHARS);
    raw.bout_id = 'b'.repeat(TEXT_MAX_CHARS);
    const tape = loadTape(raw);
    expect(tape.rows[0]!.note.length).toBe(TEXT_MAX_CHARS);
    expect(tape.bout_id.length).toBe(TEXT_MAX_CHARS);
  });

  it('refuses the count before it reads the items', () => {
    // The refusal must cost one length test, not a walk of every row: a tape
    // that is over the bound AND full of unreadable rows still names the count.
    const raw = clone() as unknown as { rows: unknown[] };
    raw.rows = Array.from({ length: MAX_ROWS + 1 }, () => null);
    expect(() => loadTape(raw)).toThrow(new RegExp(`rows.*at most ${MAX_ROWS}`));
  });
});
