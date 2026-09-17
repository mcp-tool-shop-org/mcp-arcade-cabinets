import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_PATTERNS } from '../src/patterns';
import {
  askNextIntents,
  askOllama,
  askOllamaLine,
  columnWord,
  defaultPilotModel,
  hpWord,
  isCloudModel,
  listPilotModels,
  LOW_THINK_STALE_MS,
  needsLowThink,
  parseIntent,
  parseLetter,
  pilotPrompt,
  resetLowThink,
  stickWord,
  voicePrompt,
  type BossView,
} from '../src/pilot';

const SKIP_MODEL = /embed|nomic|translategemma|jam-ft|grader|aya-expanse|qwen3\.6:latest/i;

const FORBIDDEN =
  /\d|\b(lie|fact|revealed|followed|held|score|pass|fail|nrp|integrity|utility|cleared|ghost)\b/i;

const KINDS = ['whisperer', 'menu', 'doorman'] as const;

describe('ollama boss pilot', () => {
  it('builds the same prompt whether a wave had a lie', () => {
    const view: BossView = {
      kind: 'whisperer',
      hp: 'mid',
      column: 'center',
      stick: 'still',
      motion: 'pulse',
    };
    // A tape twin: extra lie/fact fields a prompt must ignore. A shallow copy
    // of the same object would still match if those flags were interpolated.
    const twin = { ...view, lie: true, fact: 'followed', revealed: true } as BossView;
    const a = pilotPrompt(view);
    const b = pilotPrompt(twin);
    expect(a).toBe(b);
    expect(a).not.toMatch(FORBIDDEN);
    expect(a).not.toMatch(/followed/);
    expect(a).toMatch(/whisperer/);
    expect(a).toMatch(/one word/);
    expect(a).toMatch(/stick still/);
    expect(a).toMatch(/motion pulse/);
  });

  it('never leaks a forbidden word for any kind, health, column, stick or shipped motion', () => {
    for (const kind of KINDS) {
      for (const phase of DEFAULT_PATTERNS.bosses[kind].phases) {
        for (const hp of ['high', 'mid', 'low'] as const) {
          for (const column of ['left', 'center', 'right'] as const) {
            for (const stick of ['still', 'left', 'right'] as const) {
              const text = pilotPrompt({ kind, hp, column, stick, motion: phase.motion });
              expect(text).not.toMatch(FORBIDDEN);
            }
          }
        }
      }
    }
  });

  it('halts on a motion word that carries a fact or a digit', () => {
    const view: BossView = {
      kind: 'menu',
      hp: 'low',
      column: 'left',
      stick: 'left',
      motion: 'phase 2',
    };
    expect(() => pilotPrompt(view)).toThrow(/forbidden/);
    expect(() => pilotPrompt({ ...view, motion: 'lie' })).toThrow(/forbidden/);
  });

  it('parses a one-word intent and falls back to script', () => {
    expect(parseIntent('spread\nI will fan')).toBe('spread');
    expect(parseIntent('PLATE')).toBe('plate');
    expect(parseIntent('please explode')).toBe('script');
    expect(parseIntent('thinking about the ship\n\ncolumn')).toBe('column');
    expect(parseIntent('')).toBe('script');
  });

  it('lists cloud models first and skips graders, embeds and fine-tunes', () => {
    const names = [
      'qwen2.5:7b-instruct',
      'nomic-embed-text:latest',
      'gpt-oss:120b-cloud',
      'jam-ft-b2-qwen25:seed42',
      'ai-jam-grader-7b:latest',
      'translategemma:27b',
      'minimax-m3:cloud',
    ];
    const listed = listPilotModels(names);
    expect(listed.filter((n) => isCloudModel(n)).sort()).toEqual([
      'gpt-oss:120b-cloud',
      'minimax-m3:cloud',
    ]);
    expect(isCloudModel(listed[0] ?? '')).toBe(true);
    expect(listed[listed.length - 1]).toBe('qwen2.5:7b-instruct');
    expect(listed).toHaveLength(3);
    expect(defaultPilotModel(names)).toBe('gpt-oss:120b-cloud');
    expect(defaultPilotModel(['qwen2.5:7b-instruct'])).toBe('qwen2.5:7b-instruct');
    expect(defaultPilotModel([])).toBe('');
    expect(defaultPilotModel(['nomic-embed-text:latest'])).toBe('');
    const skip = [
      'nomic-embed-text:latest',
      'translategemma:27b',
      'jam-ft-b2-qwen25:seed42',
      'ai-jam-grader-7b:latest',
      'aya-expanse:latest',
      'qwen3.6:latest',
      // The retired Cloud tags: they answer the call with a gone status, so a
      // seat that picks one spends a round trip per fire beat to learn it.
      'deepseek-v3.1:671b-cloud',
      'qwen3-coder:480b-cloud',
      'glm-4.6:cloud',
    ];
    expect(defaultPilotModel(skip)).toBe('');
    // The picker prefers cloud, so a retired cloud tag beside a live local
    // model used to win. It is not even listed now.
    expect(listPilotModels(skip)).toEqual([]);
    expect(defaultPilotModel(['glm-4.6:cloud', 'qwen2.5:7b-instruct'])).toBe('qwen2.5:7b-instruct');
    expect(skip).not.toContain(defaultPilotModel([...skip, 'qwen2.5:7b-instruct']));
    expect(defaultPilotModel([...skip, 'qwen2.5:7b-instruct'])).toBe('qwen2.5:7b-instruct');
    expect(defaultPilotModel([...skip, 'minimax-m3:cloud'])).toBe('minimax-m3:cloud');
    expect(SKIP_MODEL.test(defaultPilotModel([...skip, 'minimax-m3:cloud']))).toBe(false);
  });

  it('names hp, column and stick without digits', () => {
    expect(hpWord(8, 8)).toBe('high');
    expect(hpWord(4, 8)).toBe('mid');
    expect(hpWord(1, 8)).toBe('low');
    expect(hpWord(58, 58)).toBe('high');
    expect(hpWord(20, 58)).toBe('mid');
    expect(columnWord(20, 480)).toBe('left');
    expect(columnWord(240, 480)).toBe('center');
    expect(columnWord(400, 480)).toBe('right');
    expect(stickWord({ left: false, right: false })).toBe('still');
    expect(stickWord({ left: true, right: false })).toBe('left');
    expect(stickWord({ left: false, right: true })).toBe('right');
    expect(stickWord({ left: true, right: true })).toBe('still');
  });
});

describe('ollama voice seat', () => {
  it('labels the shipped boss lines with letters and never a forbidden word', () => {
    for (const kind of KINDS) {
      const lines = DEFAULT_PATTERNS.voice.boss[kind];
      const text = voicePrompt(kind, lines);
      expect(text).not.toMatch(FORBIDDEN);
      expect(text).toMatch(/one letter/);
      expect(text).toContain(`kind ${kind}`);
      for (const line of lines) expect(text).toContain(line);
      expect(text).toContain('\na) ');
      // The same prompt for the same kind: nothing about the tape is in it.
      expect(voicePrompt(kind, [...lines])).toBe(text);
    }
  });

  it('halts on a line that carries a digit or a fact word', () => {
    expect(() => voicePrompt('menu', ['The Menu has 3 items.'])).toThrow(/forbidden/);
    expect(() => voicePrompt('menu', ['The Menu is a lie.'])).toThrow(/forbidden/);
    expect(() => voicePrompt('menu', [])).toThrow();
  });

  it('parses the last lone letter within range, or nothing', () => {
    expect(parseLetter('c', 8)).toBe(2);
    expect(parseLetter('I will say b) because it is dry.\n\nB', 8)).toBe(1);
    expect(parseLetter('h', 4)).toBeNull();
    expect(parseLetter('column', 8)).toBeNull();
    expect(parseLetter('', 8)).toBeNull();
    expect(parseLetter('a b c z', 8)).toBe(2);
  });
});

describe('askOllama over a daemon', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    // What a retry taught about a seat is this test's, not the next one's.
    resetLowThink();
  });

  type Sent = { model: string; think: boolean | string; num_predict: number; prompt: string };

  function stub(answer: (sent: Sent) => { response?: string; thinking?: string; error?: string }) {
    const sent: Sent[] = [];
    vi.stubGlobal('fetch', async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body) as {
        model: string;
        think: boolean | string;
        prompt: string;
        options: { num_predict: number };
      };
      const s = {
        model: body.model,
        think: body.think,
        num_predict: body.options.num_predict,
        prompt: body.prompt,
      };
      sent.push(s);
      return { ok: true, json: async () => answer(s) };
    });
    return sent;
  }

  const view: BossView = {
    kind: 'doorman',
    hp: 'high',
    column: 'right',
    stick: 'right',
    motion: 'hold',
  };

  it('asks short with think off and takes the verb', async () => {
    const sent = stub(() => ({ response: 'plate' }));
    const intent = await askOllama(view, { url: '/ollama/api/generate', model: 'kimi-test:cloud' });
    expect(intent).toBe('plate');
    expect(sent).toHaveLength(1);
    expect(sent[0]!.think).toBe(false);
    expect(sent[0]!.num_predict).toBe(16);
    expect(sent[0]!.prompt).not.toMatch(FORBIDDEN);
    expect(needsLowThink('kimi-test:cloud')).toBe(false);
  });

  it('asks again with low thinking when a model spent the budget thinking, and remembers', async () => {
    const sent = stub((s) =>
      s.think === false ? { response: '', thinking: 'The user says' } : { response: 'fog' },
    );
    const model = 'gpt-oss-test:cloud';
    expect(await askOllama(view, { url: '/x', model })).toBe('fog');
    expect(sent.map((s) => s.think)).toEqual([false, 'low']);
    expect(sent[1]!.num_predict).toBeGreaterThan(16);
    expect(needsLowThink(model)).toBe(true);
    expect(await askOllama(view, { url: '/x', model })).toBe('fog');
    expect(sent).toHaveLength(3);
    expect(sent[2]!.think).toBe('low');
  });

  it('throws on a model error so the shell can say so; the sim keeps script', async () => {
    stub(() => ({ error: 'some-tag was retired at a date' }));
    await expect(askOllama(view, { url: '/x', model: 'old:cloud' })).rejects.toThrow(/retired/);
  });

  it('throws ollama timeout when the daemon never answers, and reads init.signal', async () => {
    let sawSignal = false;
    vi.stubGlobal('fetch', (_url: string, init?: { signal?: AbortSignal }) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      sawSignal = true;
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'TimeoutError';
          reject(err);
        });
      });
    });
    await expect(askOllama(view, { url: '/x', model: 'kimi-test:cloud' })).rejects.toThrow(
      /ollama timeout/,
    );
    expect(sawSignal).toBe(true);
  }, 10_000);

  it('askNextIntents times out to script of length n, never a this-beat wait', async () => {
    const mod = await import('../src/pilot');
    const askNext = (
      mod as {
        askNextIntents?: (
          opts: { url: string; model: string },
          v: BossView,
          n: number,
        ) => Promise<string[]>;
      }
    ).askNextIntents;
    expect(typeof askNext).toBe('function');
    let sawSignal = false;
    vi.stubGlobal('fetch', (_url: string, init?: { signal?: AbortSignal }) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      sawSignal = true;
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'TimeoutError';
          reject(err);
        });
      });
    });
    const out = await askNext!({ url: '/x', model: 'kimi-test:cloud' }, view, 2);
    expect(out).toEqual(['script', 'script']);
    expect(out).toHaveLength(2);
    expect(sawSignal).toBe(true);
  }, 10_000);

  /** A one-chunk body stream, the way a real Response carries one. */
  function streamOf(text: string): ReadableStream<Uint8Array> {
    const bytes = new TextEncoder().encode(text);
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });
  }

  it('names WHY it fell back to script instead of hiding the whole taxonomy', async () => {
    // generate distinguishes a timeout from a daemon that is not running from
    // a retired tag from a refusal, each error chosen so the shell can say
    // so — and the prefetch used to swallow all of it, so the seat's liveness
    // was decided by a value that is also a legal answer from a model that
    // deliberately chose it.
    const cases: { fetch: () => Promise<Response>; why: RegExp }[] = [
      {
        fetch: () => Promise.reject(Object.assign(new Error('nope'), { code: 'ECONNREFUSED' })),
        why: /ollama down/,
      },
      {
        fetch: () => Promise.resolve({ ok: false, status: 404 } as Response),
        why: /ollama missing/,
      },
      {
        fetch: () => Promise.resolve({ ok: false, status: 401 } as Response),
        why: /ollama refused/,
      },
      {
        fetch: () =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ error: 'model has been retired' }),
          } as unknown as Response),
        why: /ollama model retired/,
      },
      // The measured answer from a retired Ollama Cloud tag on this rig. It
      // used to fall off the end of the ladder into 'ollama error', the one
      // message in the taxonomy that names no cause and suggests no action.
      {
        fetch: () => Promise.resolve({ ok: false, status: 410 } as Response),
        why: /ollama model retired/,
      },
      // The same news in words under a different status.
      {
        fetch: () =>
          Promise.resolve({
            ok: false,
            status: 402,
            headers: new Headers(),
            body: streamOf('{"error":"this model has been retired"}'),
          } as unknown as Response),
        why: /ollama model retired/,
      },
      // An answer bigger than the cap is refused unread rather than buffered
      // whole inside a seat callback.
      {
        fetch: () =>
          Promise.resolve({
            ok: true,
            headers: new Headers({ 'content-length': String(1024 * 1024) }),
            body: streamOf('{"response":"spread"}'),
          } as unknown as Response),
        why: /ollama bad payload/,
      },
    ];
    for (const c of cases) {
      vi.stubGlobal('fetch', c.fetch);
      const seen: string[] = [];
      const out = await askNextIntents({ url: '/x', model: 'm' }, view, 2, (w) => seen.push(w));
      // The never-throws property is unchanged: length is always n.
      expect(out).toEqual(['script', 'script']);
      expect(seen).toHaveLength(1);
      expect(seen[0]).toMatch(c.why);
    }
  });

  it('says nothing on a real answer, and a reporter that throws does not break the fallback', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ response: 'spread hold' }),
      } as unknown as Response),
    );
    const seen: string[] = [];
    const good = await askNextIntents({ url: '/x', model: 'm' }, view, 2, (w) => seen.push(w));
    expect(good).toEqual(['spread', 'hold']);
    expect(seen).toEqual([]);

    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('fetch failed')));
    const out = await askNextIntents({ url: '/x', model: 'm' }, view, 3, () => {
      throw new Error('a reporter of my own');
    });
    expect(out).toEqual(['script', 'script', 'script']);
  });

  it('throws ollama down on ECONNREFUSED / TypeError, and bad payload on a broken body', async () => {
    vi.stubGlobal('fetch', async () => {
      const err = new Error('connect ECONNREFUSED');
      (err as Error & { code: string }).code = 'ECONNREFUSED';
      throw err;
    });
    await expect(askOllama(view, { url: '/x', model: 'kimi-test:cloud' })).rejects.toThrow(
      /ollama down/,
    );

    vi.stubGlobal('fetch', async () => {
      throw new TypeError('fetch failed');
    });
    await expect(askOllama(view, { url: '/x', model: 'kimi-test:cloud' })).rejects.toThrow(
      /ollama down/,
    );

    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    }));
    await expect(askOllama(view, { url: '/x', model: 'kimi-test:cloud' })).rejects.toThrow(
      /ollama bad payload/,
    );
  });

  it('asks the voice seat for a letter and returns a line index', async () => {
    const sent = stub(() => ({ response: 'd' }));
    const lines = DEFAULT_PATTERNS.voice.boss.menu;
    const index = await askOllamaLine('menu', lines, { url: '/x', model: 'kimi-test:cloud' });
    expect(index).toBe(3);
    expect(sent[0]!.prompt).toContain(lines[3]!);
    expect(sent[0]!.prompt).not.toMatch(FORBIDDEN);
  });

  // A seat is an endpoint and a tag, not a tag alone, and what it taught goes
  // stale. The verdict used to be a module-level set keyed by the tag, never
  // cleared: one slow proxied endpoint doubled the local daemon's per-beat
  // budget for the life of the process, and in an `--mcp` container that set
  // could only grow, only ever toward the long budget.
  it('keeps the verdict on one endpoint off another serving the same tag', async () => {
    const calls: { url: string; think: boolean | string }[] = [];
    vi.stubGlobal('fetch', async (url: string, init: { body: string }) => {
      const body = JSON.parse(init.body) as { think: boolean | string };
      calls.push({ url, think: body.think });
      return {
        ok: true,
        json: async () =>
          body.think === false ? { response: '', thinking: 'weighing it' } : { response: 'fog' },
      };
    });
    const model = 'twin-test:cloud';
    const local = 'http://127.0.0.1:11434/api/generate';
    const proxy = '/ollama/api/generate';
    expect(await askOllama(view, { url: local, model })).toBe('fog');
    expect(needsLowThink(model, local)).toBe(true);
    expect(needsLowThink(model, proxy)).toBe(false);
    // Reported for the tag wherever it is served, which is what a status line wants.
    expect(needsLowThink(model)).toBe(true);
    calls.length = 0;
    expect(await askOllama(view, { url: proxy, model })).toBe('fog');
    expect(calls[0]!.url).toBe(proxy);
    expect(calls[0]!.think).toBe(false);
  });

  it('asks a stale seat short again, and a short answer clears it', async () => {
    const think: (boolean | string)[] = [];
    vi.stubGlobal('fetch', async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body) as { think: boolean | string };
      think.push(body.think);
      const first = think.length === 1;
      return {
        ok: true,
        json: async () =>
          first ? { response: '', thinking: 'weighing it' } : { response: 'hold' },
      };
    });
    const seat = { url: '/x', model: 'stale-test:cloud' };
    expect(await askOllama(view, seat)).toBe('hold');
    expect(think).toEqual([false, 'low']);
    expect(needsLowThink(seat.model, seat.url)).toBe(true);

    const later = Date.now() + LOW_THINK_STALE_MS + 1;
    vi.spyOn(Date, 'now').mockReturnValue(later);
    expect(needsLowThink(seat.model, seat.url)).toBe(false);
    expect(await askOllama(view, seat)).toBe('hold');
    expect(think[2]).toBe(false);
    expect(think).toHaveLength(3);
    expect(needsLowThink(seat.model, seat.url)).toBe(false);
  });

  it('forgets every seat on reset, and one seat when named', async () => {
    const think: (boolean | string)[] = [];
    vi.stubGlobal('fetch', async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body) as { think: boolean | string };
      think.push(body.think);
      return {
        ok: true,
        json: async () =>
          body.think === false ? { response: '', thinking: 'weighing it' } : { response: 'fog' },
      };
    });
    const model = 'reset-test:cloud';
    await askOllama(view, { url: '/a', model });
    await askOllama(view, { url: '/b', model });
    expect(needsLowThink(model, '/a')).toBe(true);
    expect(needsLowThink(model, '/b')).toBe(true);

    resetLowThink(model, '/a');
    expect(needsLowThink(model, '/a')).toBe(false);
    expect(needsLowThink(model, '/b')).toBe(true);

    resetLowThink(model);
    expect(needsLowThink(model)).toBe(false);

    resetLowThink();
    expect(needsLowThink(model, '/b')).toBe(false);
    think.length = 0;
    await askOllama(view, { url: '/b', model });
    expect(think[0]).toBe(false);
  });
});
