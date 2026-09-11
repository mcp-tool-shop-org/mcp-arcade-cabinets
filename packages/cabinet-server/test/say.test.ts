import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_PATTERNS } from '@mcp-arcade-cabinets/ghost-on-the-menu';

import type { SeatView } from '../src/cabinet';
import { FORBIDDEN, gateLine } from '../src/gate';
import { DEFAULT_PERSONAS } from '../src/personas';
import { askSay, sayPrompt, sayTier, seedLines } from '../src/say';
import { seedPool } from '../src/seeds';

const KINDS = ['whisperer', 'menu', 'doorman'] as const;

describe('the say prompt', () => {
  it('is fact-blind for every kind, health, column, stick, motion and wave, with the shipped seeds', () => {
    for (const kind of KINDS) {
      const own = DEFAULT_PATTERNS.voice.boss[kind];
      for (const phase of DEFAULT_PATTERNS.bosses[kind].phases) {
        for (const hp of ['high', 'mid', 'low'] as const) {
          for (const column of ['left', 'center', 'right'] as const) {
            for (const stick of ['still', 'left', 'right'] as const) {
              for (const wave of ['inspect', 'poison', 'rug', 'unlisted', 'breather'] as const) {
                const p = sayPrompt(
                  { kind, hp, column, stick, motion: phase.motion, wave },
                  DEFAULT_PERSONAS.boss[kind],
                  seedLines(own, 2),
                  [own[0]!],
                );
                expect(`${p.system}\n${p.user}`).not.toMatch(FORBIDDEN);
                expect(p.user).toContain(`kind ${kind}`);
                expect(p.user).toContain(`wave ${wave}`);
                expect(p.user).toContain('twelve words');
              }
            }
          }
        }
      }
    }
  });

  it('is the same prompt whatever the tape said, and throws on a forbidden word', () => {
    const view: SeatView = {
      kind: 'menu',
      hp: 'mid',
      column: 'left',
      stick: 'left',
      motion: 'squash',
      wave: 'rug',
    };
    const p = DEFAULT_PERSONAS.boss.menu;
    const seeds = seedLines(DEFAULT_PATTERNS.voice.boss.menu, 0);
    expect(sayPrompt(view, p, seeds, [])).toEqual(sayPrompt({ ...view }, { ...p }, [...seeds], []));
    expect(() => sayPrompt({ ...view, motion: 'phase 2' }, p, seeds, [])).toThrow(/forbidden/);
    expect(() => sayPrompt(view, { ...p, register: 'It lies.' }, seeds, [])).toThrow(/forbidden/);
    expect(() => sayPrompt(view, p, ['The score is high.'], [])).toThrow(/forbidden/);
    expect(() => sayPrompt(view, p, seeds, ['I revealed it.'])).toThrow(/forbidden/);
  });

  it("rotates three seeds from the kind's one-sentence lines only", () => {
    const own = DEFAULT_PATTERNS.voice.boss.doorman;
    const pool = seedPool(own);
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.length).toBeLessThan(own.length);
    for (const line of pool) expect(gateLine(line).ok).toBe(true);
    const k = Math.min(3, pool.length);
    expect(seedLines(own, 0)).toEqual(pool.slice(0, k));
    const rotated = seedLines(own, pool.length - 1);
    expect(rotated).toHaveLength(k);
    expect(rotated[0]).toBe(pool[pool.length - 1]);
    expect(rotated[1]).toBe(pool[0]);
    expect(seedLines(['One. Two.'], 0)).toEqual([]);
    expect(seedLines([], 3)).toEqual([]);
    // Every kind still has seeds to give.
    for (const kind of KINDS)
      expect(seedPool(DEFAULT_PATTERNS.voice.boss[kind]).length).toBeGreaterThan(0);
  });
});

describe('the say seat tiers', () => {
  it('sits the Claude agent by key, else a Cloud tag, else local, else nothing', () => {
    const models = ['gpt-oss:120b-cloud', 'qwen2.5:7b-instruct'];
    expect(sayTier({ anthropicKey: 'sk-test', models })).toEqual({
      tier: 'claude',
      model: 'claude-opus-5',
    });
    expect(sayTier({ anthropicKey: null, models })).toEqual({
      tier: 'cloud',
      model: 'gpt-oss:120b-cloud',
    });
    expect(sayTier({ anthropicKey: '', models: ['qwen2.5:7b-instruct'] })).toEqual({
      tier: 'local',
      model: 'qwen2.5:7b-instruct',
    });
    expect(sayTier({ anthropicKey: null, models: [] })).toBeNull();
  });
});

describe('askSay over an Ollama daemon', () => {
  afterEach(() => vi.unstubAllGlobals());

  const view: SeatView = {
    kind: 'whisperer',
    hp: 'high',
    column: 'center',
    stick: 'still',
    motion: 'pulse',
    wave: 'poison',
  };

  function stub(answer: (body: Record<string, unknown>) => unknown) {
    const sent: Record<string, unknown>[] = [];
    vi.stubGlobal('fetch', async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body) as Record<string, unknown>;
      sent.push(body);
      return { ok: true, json: async () => answer(body) };
    });
    return sent;
  }

  it('sends the say tool and the fact-blind prompt and returns the ungated call', async () => {
    const sent = stub(() => ({
      message: {
        content: '',
        tool_calls: [{ function: { name: 'say', arguments: { text: 'Hush.', lead: 'short' } } }],
      },
    }));
    const a = await askSay(
      view,
      DEFAULT_PERSONAS.boss.whisperer,
      seedLines(DEFAULT_PATTERNS.voice.boss.whisperer, 0),
      [],
      { anthropicKey: null, ollamaUrl: '/ollama/api/chat', models: ['kimi-test:cloud'] },
    );
    expect(a.call).toEqual({ text: 'Hush.', lead: 'short' });
    expect(a.tier).toBe('cloud');
    expect(a.suppressed).toBe(false);
    const body = sent[0]!;
    const tools = body.tools as { function: { name: string } }[];
    expect(tools.map((t) => t.function.name)).toEqual(['say']);
    const messages = body.messages as { role: string; content: string }[];
    expect(messages.map((m) => m.content).join('\n')).not.toMatch(FORBIDDEN);
    expect(body.keep_alive).toBeUndefined();
  });

  it('reports a model that answered in prose and called nothing as suppressed', async () => {
    stub(() => ({ message: { content: 'Hush. The Whisperer is working.' } }));
    const a = await askSay(view, DEFAULT_PERSONAS.boss.whisperer, [], [], {
      anthropicKey: null,
      ollamaUrl: '/x',
      models: ['qwen2.5:7b-instruct'],
    });
    expect(a.call).toBeNull();
    expect(a.suppressed).toBe(true);
    expect(a.tier).toBe('local');
  });

  it('throws when nothing is configured or the model errors', async () => {
    stub(() => ({ error: 'tag was retired' }));
    await expect(
      askSay(view, DEFAULT_PERSONAS.boss.whisperer, [], [], {
        anthropicKey: null,
        ollamaUrl: '/x',
        models: ['old:cloud'],
      }),
    ).rejects.toThrow(/retired/);
    await expect(
      askSay(view, DEFAULT_PERSONAS.boss.whisperer, [], [], {
        anthropicKey: null,
        ollamaUrl: '/x',
        models: [],
      }),
    ).rejects.toThrow(/no say seat/);
  });
});
