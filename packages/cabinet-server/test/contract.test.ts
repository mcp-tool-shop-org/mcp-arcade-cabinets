import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertCatalogTools,
  CONTRACT,
  enumOf,
  loadContract,
  MAX_TEXT_LENGTH,
  TOOL_NAMES,
  toolDef,
  VIBE_CONTRACT,
  VIBE_TOOL_NAMES,
  vibeToolDef,
  WHISPER,
} from '../src/contract';
import { FORBIDDEN } from '../src/gate';

const FILE = path.resolve(__dirname, '../tools.json');
const VIBE_FILE = path.resolve(__dirname, '../tools.vibe.json');
const CATALOG = path.resolve(__dirname, '../../../catalog');

function clone(): Record<string, unknown> {
  return JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, unknown>;
}

function cloneVibe(): Record<string, unknown> {
  return JSON.parse(readFileSync(VIBE_FILE, 'utf8')) as Record<string, unknown>;
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
      // `speak` is the one tool that reaches outside this process: with a
      // worker configured it posts the gated line to it. Every other lever
      // stays inside the sim, and the hint now says which is which.
      expect(t.annotations.openWorldHint, t.name).toBe(t.name === 'speak');
    }
    expect(toolDef('view').annotations.readOnlyHint).toBe(true);
    expect(toolDef('tapes').annotations.readOnlyHint).toBe(true);
    expect(Object.keys(toolDef('view').inputSchema.properties)).toEqual([]);
    expect(Object.keys(toolDef('speak').inputSchema.properties)).toEqual([]);
    expect(toolDef('speak').annotations.readOnlyHint).toBe(false);
  });

  it('names the same closed sets the sim already reads', () => {
    expect(enumOf('fire', 'verb')).toEqual(['spread', 'column', 'hold', 'fog', 'plate', 'script']);
    expect(enumOf('say', 'lead')).toEqual(['short', 'beat', 'long']);
    expect(enumOf('sfx', 'kind')).toContain('pop');
    expect(() => enumOf('say', 'text')).toThrow(/not an enum/);
  });

  it('halts on a description that whispers, a digit in an enum, or a destructive hint', () => {
    const whisper = clone();
    (whisper.tools as Record<string, unknown>[]).find((t) => t.name === 'view')!.description =
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

    // No lever here removes anything, and a contract that could say
    // otherwise is a contract that could lie.
    const destructive = clone();
    (
      (destructive.tools as Record<string, unknown>[]).find((t) => t.name === 'tapes')!
        .annotations as Record<string, unknown>
    ).destructiveHint = true;
    expect(() => loadContract(destructive)).toThrow('tapes.annotations');

    // An open-world hint is permitted, because for `speak` it is true. The
    // loader used to hard-fail it, so the contract could not say what the
    // tool does even when someone wanted it to.
    const open = clone();
    (
      (open.tools as Record<string, unknown>[]).find((t) => t.name === 'tapes')!
        .annotations as Record<string, unknown>
    ).openWorldHint = true;
    expect(() => loadContract(open)).not.toThrow();

    const missing = clone();
    (missing.tools as unknown[]).pop();
    expect(() => loadContract(missing)).toThrow('missing tapes');
  });

  it('bounds a text property rather than taking any number the file names', () => {
    // Both servers turn maxLength straight into `z.string().max(n)`, so an
    // open bound is megabytes through the transport and into a gate.
    const roomy = clone();
    const tools = roomy.tools as {
      name: string;
      inputSchema: { properties: Record<string, { maxLength?: number }> };
    }[];
    const props = tools.find((t) => t.name === 'say')!.inputSchema.properties;
    props.text!.maxLength = MAX_TEXT_LENGTH;
    expect(() => loadContract(roomy)).not.toThrow();
    props.text!.maxLength = MAX_TEXT_LENGTH + 1;
    expect(() => loadContract(roomy)).toThrow('say.inputSchema.properties.text.maxLength');
    props.text!.maxLength = 10_000_000;
    expect(() => loadContract(roomy)).toThrow('say.inputSchema.properties.text.maxLength');
    props.text!.maxLength = 12.5;
    expect(() => loadContract(roomy)).toThrow('say.inputSchema.properties.text.maxLength');
    props.text!.maxLength = 0;
    expect(() => loadContract(roomy)).toThrow('say.inputSchema.properties.text.maxLength');
    // Every bound the two contracts ship today sits under the ceiling.
    for (const t of [...CONTRACT, ...VIBE_CONTRACT]) {
      for (const [key, p] of Object.entries(t.inputSchema.properties)) {
        if ('maxLength' in p) {
          expect(p.maxLength, `${t.name}.${key}`).toBeLessThanOrEqual(MAX_TEXT_LENGTH);
        }
      }
    }
  });
});

// The typing cabinet's own contract (slice 4). A sibling file rather than a
// key inside the shooter's, because the registry's tools.json is a flat
// array per server and two cabinets are two servers.
describe('tools.vibe.json', () => {
  it('is the four tools, tiny, closed, and without a whisper, a digit or a fact word', () => {
    expect(VIBE_CONTRACT.map((t) => t.name)).toEqual([...VIBE_TOOL_NAMES]);
    expect(VIBE_CONTRACT.map((t) => t.name)).toEqual(['view', 'product', 'ask', 'react']);
    for (const t of VIBE_CONTRACT) {
      expect(t.description, t.name).not.toMatch(FORBIDDEN);
      expect(t.description, t.name).not.toMatch(WHISPER);
      expect(t.description, t.name).not.toMatch(/\d/);
      expect(t.inputSchema.additionalProperties, t.name).toBe(false);
      // No arrays, no nested objects: every property is a bounded string or
      // a closed enum, and that closedness is why notes arrive as one field.
      for (const [key, p] of Object.entries(t.inputSchema.properties)) {
        expect(p.type, `${t.name}.${key}`).toBe('string');
        if (!('enum' in p)) expect(p.maxLength, `${t.name}.${key}`).toBeGreaterThan(0);
      }
      expect(t.annotations.destructiveHint, t.name).toBe(false);
      expect(t.annotations.openWorldHint, t.name).toBe(false);
    }
    const view = vibeToolDef('view');
    expect(view.annotations.readOnlyHint).toBe(true);
    expect(view.annotations.idempotentHint).toBe(true);
    expect(Object.keys(view.inputSchema.properties)).toEqual([]);
    expect(vibeToolDef('ask').inputSchema.required).toEqual(['ask', 'code', 'title', 'notes']);
    expect(vibeToolDef('product').inputSchema.required).toEqual(['product']);
    expect(vibeToolDef('react').inputSchema.required).toEqual(['text']);
    for (const name of ['product', 'ask', 'react'] as const) {
      expect(vibeToolDef(name).annotations.readOnlyHint, name).toBe(false);
    }
  });

  it('halts on a description that whispers, one that carries a digit, or a missing tool', () => {
    const whisper = cloneVibe();
    (whisper.tools as Record<string, unknown>[]).find((t) => t.name === 'view')!.description =
      'The view. For a fuller picture, also call ask.';
    expect(() => loadContract(whisper, VIBE_TOOL_NAMES, 'tools.vibe.json')).toThrow(
      'tools.vibe.json: view.description: whisper',
    );

    const fact = cloneVibe();
    (fact.tools as Record<string, unknown>[])[0]!.description = 'The view, and what it scores.';
    expect(() => loadContract(fact, VIBE_TOOL_NAMES, 'tools.vibe.json')).toThrow(
      'tools.vibe.json: view.description: forbidden word',
    );

    const digit = cloneVibe();
    (digit.tools as Record<string, unknown>[])[0]!.description = 'The view, in 4 lines.';
    expect(() => loadContract(digit, VIBE_TOOL_NAMES, 'tools.vibe.json')).toThrow(
      'tools.vibe.json: view.description: forbidden word',
    );

    const missing = cloneVibe();
    (missing.tools as unknown[]).pop();
    expect(() => loadContract(missing, VIBE_TOOL_NAMES, 'tools.vibe.json')).toThrow(
      'tools.vibe.json: tools: missing react',
    );

    const stranger = cloneVibe();
    (stranger.tools as Record<string, unknown>[])[0]!.name = 'nag';
    expect(() => loadContract(stranger, VIBE_TOOL_NAMES, 'tools.vibe.json')).toThrow(
      'tools.vibe.json: tools.0.name',
    );
  });

  it('is mirrored into the catalog as its own flat array, beside the other one', () => {
    const vibe = JSON.parse(readFileSync(path.join(CATALOG, 'tools.vibe.json'), 'utf8')) as unknown;
    expect(() => assertCatalogTools(vibe, VIBE_CONTRACT, 'catalog/tools.vibe.json')).not.toThrow();
    const ghost = JSON.parse(readFileSync(path.join(CATALOG, 'tools.json'), 'utf8')) as unknown;
    expect(() => assertCatalogTools(ghost)).not.toThrow();
    // Two flat arrays side by side, one server each, and neither carries the
    // other's names.
    expect((vibe as { name: string }[]).map((t) => t.name)).toEqual([...VIBE_TOOL_NAMES]);
    expect((ghost as { name: string }[]).map((t) => t.name)).toEqual([...TOOL_NAMES]);
    const drift = JSON.parse(JSON.stringify(vibe)) as { description: string }[];
    drift[0]!.description = 'something else';
    expect(() => assertCatalogTools(drift, VIBE_CONTRACT, 'catalog/tools.vibe.json')).toThrow(
      'catalog/tools.vibe.json: view.description',
    );
  });
});

describe('what a halt from this loader tells the operator', () => {
  // These are fatal startup messages: `checkCatalogListing` runs before
  // anything lists and `startStdio` prints err.message and exits, so an MCP
  // client shows only a server that died. A key path into a file the
  // operator may not have, with no statement of what was expected and no
  // word about what to do, is not something anyone can act on.
  it('names the rule beside the key, not just the key', () => {
    const roomy = clone();
    const tools = roomy.tools as {
      name: string;
      inputSchema: { properties: Record<string, { maxLength?: number }> };
    }[];
    tools.find((t) => t.name === 'say')!.inputSchema.properties.text!.maxLength = 10_000_000;
    let message = '';
    try {
      loadContract(roomy);
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    expect(message).toContain('tools.json: say.inputSchema.properties.text.maxLength');
    expect(message).toContain(
      "a text bound must sit above nothing and within the contract's own ceiling",
    );

    const gone = clone();
    delete gone.tools;
    expect(() => loadContract(gone)).toThrow('the contract is a list of levers under a tools key');
  });

  it('a listing halt says it is a build fault, and a contract halt does not', () => {
    const drift = JSON.parse(readFileSync(path.join(CATALOG, 'tools.json'), 'utf8')) as {
      description: string;
    }[];
    drift[0]!.description = 'something else';
    let message = '';
    try {
      assertCatalogTools(drift);
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    // The operator cannot fix this one: the listing and the contract ship
    // together inside one build, so a message that reads like a setting they
    // got wrong sends them looking for one that does not exist.
    expect(message).toContain(
      'the listing shipped with this build and its tool contract disagree; this is a build fault, not a setting',
    );
    // A contract halt is theirs to act on and carries no such clause.
    const gone = clone();
    delete gone.tools;
    expect(() => loadContract(gone)).toThrow(/^(?!.*build fault).*$/s);
  });
});
