// The endless seat (G28 as slice 3 amends it). The seat proposes a whole
// request; the code gate in the cabinet package disposes. Everything here
// measures the proposing: the prompt is fact-blind, the tiering is the say
// seat's, and an answer that is not an object is null rather than a throw,
// because the corpus plays either way (G11, G13).

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  askEndlessFor,
  bandWord,
  ENDLESS_SCHEMA,
  ENDLESS_SYSTEM,
  ENDLESS_TOOL_DESCRIPTION,
  ENDLESS_TOOL_NAME,
  endlessPrompt,
  parseRequest,
  type EndlessView,
} from '../src/endless';
import { FORBIDDEN } from '../src/gate';

const STACKS = ['bash', 'csharp', 'java', 'javascript', 'python', 'sql', 'integration'] as const;

function view(over: Partial<EndlessView> = {}): EndlessView {
  return {
    product: 'a diary for houseplants',
    stack: 'python',
    bandMin: 1,
    bandMax: 2,
    recent: ['can you make the list shorter'],
    weak: ['th', '()'],
    newLevel: false,
    ...over,
  };
}

describe('the endless prompt', () => {
  it('is fact-blind for every stack and band, and never carries a digit', () => {
    for (const stack of STACKS) {
      for (let band = 1; band <= 7; band++) {
        const p = endlessPrompt(
          view({ stack, bandMin: band, bandMax: band, newLevel: band % 2 === 0 }),
        );
        const where = `${stack} ${band}`;
        expect(`${p.system}\n${p.user}`, where).not.toMatch(FORBIDDEN);
        expect(p.system, where).toBe(ENDLESS_SYSTEM);
        expect(p.user, where).toContain('a diary for houseplants');
        expect(p.user, where).toContain(bandWord(band));
        expect(p.user, where).toContain('twelve words');
      }
    }
  });

  it('names the team in a word and the language plainly', () => {
    expect(endlessPrompt(view({ stack: 'bash' })).user).toContain('shell');
    expect(endlessPrompt(view({ stack: 'bash' })).user).toContain('bash');
    expect(endlessPrompt(view({ stack: 'sql' })).user).toContain('tables');
    expect(endlessPrompt(view({ stack: 'sql' })).user).toContain('SQL');
    expect(endlessPrompt(view({ stack: 'integration' })).user).toContain('wires');
  });

  it('asks for a product only when the level is new', () => {
    expect(endlessPrompt(view({ newLevel: true })).user).toContain('product -');
    expect(endlessPrompt(view({ newLevel: false })).user).not.toContain('product -');
  });

  it('drops a weak pair that carries a digit rather than throwing on it', () => {
    // A weak pair is two characters of real code; a digit there is ordinary.
    const p = endlessPrompt(view({ weak: ['th', '1)', '0.', 'in'] }));
    expect(p.user).not.toMatch(FORBIDDEN);
    expect(p.user).toContain('th in');
  });

  it('throws when the view itself leaks a forbidden word', () => {
    expect(() => endlessPrompt(view({ product: 'an app that keeps the score' }))).toThrow(
      /forbidden/,
    );
    expect(() => endlessPrompt(view({ recent: ['it followed the plan'] }))).toThrow(/forbidden/);
    expect(() => endlessPrompt(view({ product: 'an app for 3 cats' }))).toThrow(/forbidden/);
  });

  it('holds both tiers to one schema', () => {
    expect(ENDLESS_SCHEMA.required).toEqual(['ask', 'code', 'title', 'notes', 'product']);
    expect(ENDLESS_SCHEMA.additionalProperties).toBe(false);
  });

  it('describes every field it insists on, and names all five in the tool sentence', () => {
    // This was the one contract in the package nothing held to the package's
    // standards: five properties with no descriptions, the rules living only
    // in the user turn, and a tool sentence that named four of the five. A
    // seat whose provider weights the tool schema over the prose saw five
    // undescribed required fields.
    for (const key of ENDLESS_SCHEMA.required) {
      const prop = ENDLESS_SCHEMA.properties[key as keyof typeof ENDLESS_SCHEMA.properties] as {
        description?: string;
      };
      expect(prop.description, key).toBeTypeOf('string');
      expect(prop.description, key).not.toBe('');
      expect(ENDLESS_TOOL_DESCRIPTION, key).toContain(key);
    }
    expect(ENDLESS_TOOL_NAME).toBe('endless_request');
  });
});

describe('what the seat sends back', () => {
  const good = {
    ask: 'can you make the plants tell me their moods',
    code: 'moods = [p.mood for p in plants]\nprint(moods)',
    title: 'a list of moods',
    notes: ['a comprehension walks the list once'],
    product: '',
  };

  it('takes a plain object', () => {
    const r = parseRequest(good);
    expect(r?.ask).toBe(good.ask);
    expect(r?.product).toBeUndefined();
  });

  it('takes a fenced answer with words around it', () => {
    const text = `Here you go:\n\`\`\`json\n${JSON.stringify(good)}\n\`\`\`\nHope that helps.`;
    expect(parseRequest(text)?.title).toBe('a list of moods');
  });

  it('keeps a product the seat named', () => {
    expect(parseRequest({ ...good, product: 'a spa for garden gnomes' })?.product).toBe(
      'a spa for garden gnomes',
    );
  });

  it('is null rather than a throw when the answer is not a request', () => {
    expect(parseRequest('sorry, I cannot do that')).toBeNull();
    expect(parseRequest('{ not json at all')).toBeNull();
    expect(parseRequest({ ask: 'hi' })).toBeNull();
    expect(parseRequest(null)).toBeNull();
    expect(parseRequest([good])).toBeNull();
    expect(parseRequest({ ...good, code: 7 })).toBeNull();
  });

  it('refuses a field over its bound rather than clipping it to fit', () => {
    // This used to clip and hand the short version to the gate as though
    // the model had written exactly that. `gateCode` has no total-length
    // rule, so a cut landing after a complete statement in a brace-free
    // language passes every check it does have and the player types code
    // the model did not write. A refusal is null, and the corpus plays.
    expect(
      parseRequest({
        ask: 'a'.repeat(900),
        code: 'b'.repeat(9000),
        title: 'c'.repeat(900),
        notes: ['d'.repeat(900), 'e', 'f', 'g', 'h'],
        product: 'i'.repeat(900),
      }),
    ).toBeNull();

    // One field at a time, each exactly one character over its own cap.
    const caps = { ask: 200, code: 2048, title: 80, product: 80 } as const;
    for (const [field, cap] of Object.entries(caps)) {
      expect(parseRequest({ ...good, [field]: 'x'.repeat(cap + 1) }), field).toBeNull();
      expect(parseRequest({ ...good, [field]: 'x'.repeat(cap) }), field).not.toBeNull();
    }
    expect(parseRequest({ ...good, notes: ['n'.repeat(201)] })).toBeNull();
    expect(parseRequest({ ...good, notes: ['n'.repeat(200)] })?.notes).toHaveLength(1);

    // At the caps, and with more notes than the schema asks for, it is
    // still a request: the count is not a field the seat wrote.
    const ok = parseRequest({ ...good, notes: ['d'.repeat(200), 'e', 'f', 'g', 'h'] });
    expect(ok?.notes).toHaveLength(3);
  });
});

describe('askEndlessFor over an Ollama daemon', () => {
  afterEach(() => vi.unstubAllGlobals());

  function stub(answer: (body: Record<string, unknown>) => unknown) {
    const sent: Record<string, unknown>[] = [];
    vi.stubGlobal('fetch', async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body) as Record<string, unknown>;
      sent.push(body);
      return { ok: true, json: async () => answer(body) };
    });
    return sent;
  }

  const answer = {
    ask: 'can you make the plants tell me their moods',
    code: 'moods = [p.mood for p in plants]\nprint(moods)',
    title: 'a list of moods',
    notes: ['a comprehension walks the list once'],
    product: '',
  };

  it('sends the schema, no tools, and the fact-blind prompt', async () => {
    const sent = stub(() => ({ message: { content: JSON.stringify(answer) } }));
    const a = await askEndlessFor(view(), {
      anthropicKey: null,
      ollamaUrl: '/ollama/api/chat',
      models: ['kimi-test:cloud'],
    });
    expect(a.request?.ask).toBe(answer.ask);
    expect(a.tier).toBe('cloud');
    expect(a.suppressed).toBe(false);
    const body = sent[0]!;
    expect(body.tools).toBeUndefined();
    expect(body.format).toEqual(ENDLESS_SCHEMA);
    expect(body.keep_alive).toBeUndefined();
    const messages = body.messages as { role: string; content: string }[];
    expect(messages.map((m) => m.content).join('\n')).not.toMatch(FORBIDDEN);
  });

  it('keeps a local model warm and takes a fenced answer', async () => {
    const sent = stub(() => ({
      message: { content: `\`\`\`json\n${JSON.stringify(answer)}\n\`\`\`` },
    }));
    const a = await askEndlessFor(view(), {
      anthropicKey: null,
      ollamaUrl: '/x',
      models: ['qwen-test:8b'],
    });
    expect(a.request?.title).toBe('a list of moods');
    expect(a.tier).toBe('local');
    expect(sent[0]!.keep_alive).toBe('30m');
  });

  it('gives back nothing usable rather than throwing on a malformed answer', async () => {
    stub(() => ({ message: { content: 'I would rather describe it in words.' } }));
    const a = await askEndlessFor(view(), {
      anthropicKey: null,
      ollamaUrl: '/x',
      models: ['qwen-test:8b'],
    });
    expect(a.request).toBeNull();
    expect(a.suppressed).toBe(true);
  });

  it('maps a transport failure the way the say seat does', async () => {
    stub(() => ({ error: 'tag was retired' }));
    await expect(
      askEndlessFor(view(), { anthropicKey: null, ollamaUrl: '/x', models: ['old:cloud'] }),
    ).rejects.toThrow(/retired/);
    vi.stubGlobal('fetch', async () => {
      throw Object.assign(new Error('connect'), { cause: { code: 'ECONNREFUSED' } });
    });
    await expect(
      askEndlessFor(view(), { anthropicKey: null, ollamaUrl: '/x', models: ['a:cloud'] }),
    ).rejects.toThrow(/ollama down/);
    await expect(
      askEndlessFor(view(), { anthropicKey: null, ollamaUrl: '/x', models: [] }),
    ).rejects.toThrow(/no endless seat/);
  });

  it('sits the Claude tier by key, the same way the say seat does', async () => {
    // No key on this rig, so only the choice is measured, never the call.
    const sent = stub(() => ({ message: { content: JSON.stringify(answer) } }));
    const a = await askEndlessFor(view(), {
      anthropicKey: null,
      ollamaUrl: '/x',
      models: ['a:cloud', 'b:8b'],
    });
    expect(a.model).toBe('a:cloud');
    expect(sent).toHaveLength(1);
  });
});
