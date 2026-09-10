import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_PATTERNS } from '../src/patterns';
import {
  askOllama,
  askOllamaLine,
  columnWord,
  defaultPilotModel,
  hpWord,
  isCloudModel,
  listPilotModels,
  needsLowThink,
  parseIntent,
  parseLetter,
  pilotPrompt,
  stickWord,
  voicePrompt,
  type BossView,
} from '../src/pilot';

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
    const a = pilotPrompt(view);
    const b = pilotPrompt({ ...view });
    expect(a).toBe(b);
    expect(a).not.toMatch(FORBIDDEN);
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

  it('asks the voice seat for a letter and returns a line index', async () => {
    const sent = stub(() => ({ response: 'd' }));
    const lines = DEFAULT_PATTERNS.voice.boss.menu;
    const index = await askOllamaLine('menu', lines, { url: '/x', model: 'kimi-test:cloud' });
    expect(index).toBe(3);
    expect(sent[0]!.prompt).toContain(lines[3]!);
    expect(sent[0]!.prompt).not.toMatch(FORBIDDEN);
  });
});
