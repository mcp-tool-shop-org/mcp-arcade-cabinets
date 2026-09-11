import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { CONTRACT, enumOf, loadContract, TOOL_NAMES, toolDef, WHISPER } from '../src/contract';
import { FORBIDDEN } from '../src/gate';

const FILE = path.resolve(__dirname, '../tools.json');

function clone(): Record<string, unknown> {
  return JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, unknown>;
}

describe('tools.json', () => {
  it('is the five tools, tiny, closed, and without a whisper, a digit or a fact word', () => {
    expect(CONTRACT.map((t) => t.name)).toEqual([...TOOL_NAMES]);
    for (const t of CONTRACT) {
      expect(t.description).not.toMatch(FORBIDDEN);
      expect(t.description).not.toMatch(WHISPER);
      expect(t.description).not.toMatch(/\d/);
      expect(t.inputSchema.additionalProperties).toBe(false);
      // No nested objects: every property is a string enum or a bounded string.
      for (const p of Object.values(t.inputSchema.properties)) {
        expect(p.type).toBe('string');
      }
      expect(t.annotations.destructiveHint).toBe(false);
      expect(t.annotations.openWorldHint).toBe(false);
    }
    expect(toolDef('view').annotations.readOnlyHint).toBe(true);
    expect(toolDef('tapes').annotations.readOnlyHint).toBe(true);
    expect(Object.keys(toolDef('view').inputSchema.properties)).toEqual([]);
  });

  it('names the same closed sets the sim already reads', () => {
    expect(enumOf('fire', 'verb')).toEqual(['spread', 'column', 'hold', 'fog', 'plate', 'script']);
    expect(enumOf('say', 'lead')).toEqual(['short', 'beat', 'long']);
    expect(enumOf('sfx', 'kind')).toContain('pop');
    expect(() => enumOf('say', 'text')).toThrow(/not an enum/);
  });

  it('halts on a description that whispers, a digit in an enum, or an open-world hint', () => {
    const whisper = clone();
    (whisper.tools as Record<string, unknown>[])[3]!.description =
      'The view. For a fuller picture, also call tapes.';
    expect(() => loadContract(whisper)).toThrow('view.description: whisper');

    const fact = clone();
    (fact.tools as Record<string, unknown>[])[0]!.description = 'Fire at the lie.';
    expect(() => loadContract(fact)).toThrow('fire.description: forbidden word');

    const digit = clone();
    const fire = (digit.tools as Record<string, Record<string, unknown>>[])[0]!;
    const schema = fire.inputSchema as Record<string, Record<string, Record<string, unknown>>>;
    schema.properties!.verb!.enum = ['spread', 'phase2'];
    expect(() => loadContract(digit)).toThrow('enum');

    const open = clone();
    (
      (open.tools as Record<string, unknown>[])[4]!.annotations as Record<string, unknown>
    ).openWorldHint = true;
    expect(() => loadContract(open)).toThrow('tapes.annotations');

    const missing = clone();
    (missing.tools as unknown[]).pop();
    expect(() => loadContract(missing)).toThrow('missing tapes');
  });
});
