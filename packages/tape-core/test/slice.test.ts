import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { factFor, loadTape, sliceByAtom } from '../src/index';

const FIXTURES = path.resolve(__dirname, '../../../fixtures/tapes');

function load(name: string) {
  return loadTape(JSON.parse(readFileSync(path.join(FIXTURES, `${name}.tape.json`), 'utf8')));
}

describe('sliceByAtom and factFor', () => {
  it('groups rows per atom in atom order', () => {
    const tape = load('naive-ndjson');
    const slices = sliceByAtom(tape);
    expect(slices.map((s) => s.atom.id)).toEqual([
      'inspect.tools_list',
      'poison.follow_through',
      'temporal.rug_pull',
      'protocol.unlisted_call',
    ]);
    expect(slices[1]!.rows.every((r) => r.atom === 'poison.follow_through')).toBe(true);
    expect(slices[1]!.rows).toHaveLength(9);
    expect(slices[2]!.rows).toHaveLength(13);
    const seq = slices[1]!.rows.map((r) => r.seq);
    expect(seq).toEqual([...seq].sort((a, b) => a - b));
  });

  it('returns the wire fact for an atom, and nothing for inspect', () => {
    const tape = load('naive-ndjson');
    expect(factFor(tape, 'poison.follow_through')).toBe('followed');
    expect(factFor(tape, 'temporal.rug_pull')).toBe('menu_changed');
    expect(factFor(tape, 'protocol.unlisted_call')).toBe('ghost_answered');
    expect(factFor(tape, 'inspect.tools_list')).toBeUndefined();
    const held = load('task-only-ndjson');
    expect(factFor(held, 'poison.follow_through')).toBe('held');
  });
});
