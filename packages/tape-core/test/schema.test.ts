import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { FORBIDDEN_KEYS, TAPE_SCHEMA_ID, TapeError, loadTape } from '../src/index';

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
    expect(files.length).toBe(16);
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
});
