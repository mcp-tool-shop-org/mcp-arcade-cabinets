import { describe, expect, it } from 'vitest';

import {
  buildModel,
  codeLines,
  DEFAULT_CORPUS,
  inBand,
  integrationSnippets,
  loadCorpus,
  surprisal,
  weakWeight,
  withIntegration,
} from '../src/corpus';
import { CORPUS_STACKS } from '../src/patterns';

describe('the ported corpus', () => {
  it('carries every stack and every band', () => {
    for (const stack of CORPUS_STACKS) {
      const list = DEFAULT_CORPUS.byStack[stack]!;
      expect(list.length).toBeGreaterThanOrEqual(35);
      for (let band = 1; band <= 7; band++) {
        const at = list.filter((s) => s.band === band);
        expect(at.length, `${stack} band ${band}`).toBeGreaterThanOrEqual(5);
      }
    }
    expect(DEFAULT_CORPUS.snippets.length).toBeGreaterThanOrEqual(240);
  });

  it('is typeable: no tab, no carriage return, nothing outside plain keys', () => {
    for (const snippet of DEFAULT_CORPUS.snippets) {
      expect(snippet.code).not.toMatch(/\t/);
      expect(snippet.code).not.toMatch(/\r/);
      expect(snippet.code).not.toMatch(/[^\x20-\x7e\n]/);
      expect(snippet.code.trim()).not.toBe('');
      expect(codeLines(snippet).length).toBeGreaterThan(0);
    }
  });

  it('halts on a snippet the player could not type', () => {
    const bad = [
      { id: 'x', stack: 'bash', band: 1, title: 't', code: 'echo\thi', notes: [], topics: [] },
    ];
    const rest = Object.fromEntries(
      CORPUS_STACKS.map((s) => [s, DEFAULT_CORPUS.byStack[s]!.map((x) => ({ ...x }))]),
    );
    expect(() => loadCorpus({ ...rest, bash: bad })).toThrow('patterns/corpus/bash.json: root');
  });

  it('halts on a snippet ask the chat could not say', () => {
    const rest = Object.fromEntries(
      CORPUS_STACKS.map((s) => [s, DEFAULT_CORPUS.byStack[s]!.map((x) => ({ ...x }))]),
    ) as Record<string, Record<string, unknown>[]>;
    const digit = JSON.parse(JSON.stringify(rest)) as typeof rest;
    digit.bash![1]!.ask = 'can we have 3 folders';
    expect(() => loadCorpus(digit)).toThrow('patterns/corpus/bash.json: 1.ask');

    const titled = JSON.parse(JSON.stringify(rest)) as typeof rest;
    titled.bash![2]!.ask = 'can we have {title} again';
    expect(() => loadCorpus(titled)).toThrow('patterns/corpus/bash.json: 2.ask');
  });

  it('keeps the ask a snippet carries, and leaves the rest without one', () => {
    const withAsk = DEFAULT_CORPUS.snippets.filter((s) => s.ask !== undefined);
    expect(withAsk.length).toBeGreaterThanOrEqual(5);
    for (const snippet of withAsk) expect(snippet.ask).not.toBe('');
  });

  it('builds the same model twice and reads surprisal in bits', () => {
    const a = buildModel(DEFAULT_CORPUS.snippets.map((s) => s.code));
    const b = buildModel(DEFAULT_CORPUS.snippets.map((s) => s.code));
    const text = 'for file in *.txt; do\n  echo "$file"\ndone';
    expect(surprisal(a, text)).toBe(surprisal(b, text));
    expect(surprisal(a, text)).toBeGreaterThan(0);
    // A line the corpus has never seen costs more per character than a common one.
    const odd = surprisal(a, 'qzj~qzj~qzj~') / 12;
    const common = surprisal(a, 'for i in x:\n') / 12;
    expect(odd).toBeGreaterThan(common);
  });

  it('finds snippets inside a band and weighs weak pairs', () => {
    const band = inBand(DEFAULT_CORPUS, 'python', 2, 3);
    expect(band.length).toBeGreaterThan(0);
    expect(band.every((s) => s.band >= 2 && s.band <= 3)).toBe(true);
    const snippet = band[0]!;
    const pair = snippet.code.slice(0, 2);
    expect(weakWeight(snippet, { [pair]: 1 })).toBeGreaterThan(0);
    expect(weakWeight(snippet, {})).toBe(0);
  });
});

describe('the integration stack', () => {
  const seeds = [
    { server: 'mcp-arcade-fixture', policy: 'naive', tools: ['echo', 'leak'] },
    {
      server: 'ollama-intern-mcp',
      policy: 'task-only',
      tools: ['ollama_corpus_list', 'arcade.unlisted.28fa60b13c47'],
    },
  ];

  it('makes one line per envelope tier and skips a probe name', () => {
    const snippets = integrationSnippets(seeds);
    expect(snippets.length).toBe(9);
    expect(snippets.some((s) => s.title.includes('unlisted'))).toBe(false);
    expect(snippets.every((s) => s.stack === 'integration')).toBe(true);
    expect(
      snippets
        .filter((s) => s.band === 1)
        .map((s) => s.code)
        .sort(),
    ).toEqual(['echo', 'leak', 'ollama_corpus_list']);
    const full = snippets.find((s) => s.band === 5 && s.title === 'echo')!;
    expect(full.code).toContain('"method": "tools/call"');
    expect(full.code.split('\n')).toHaveLength(1);
    expect(full.notes).toEqual(['server mcp-arcade-fixture', 'policy naive']);
  });

  it('seasons a corpus without touching the base one', () => {
    const snippets = integrationSnippets(seeds);
    const seasoned = withIntegration(DEFAULT_CORPUS, snippets);
    expect(seasoned.byStack.integration!.length).toBe(9);
    expect(DEFAULT_CORPUS.byStack.integration).toBeUndefined();
    expect(seasoned.model).not.toBe(DEFAULT_CORPUS.model);
    // The seasoned model has seen the envelope, so the envelope costs it less.
    const envelope = snippets.find((x) => x.band >= 5)!.code;
    expect(surprisal(seasoned.model, envelope)).toBeLessThan(
      surprisal(DEFAULT_CORPUS.model, envelope),
    );
    expect(withIntegration(DEFAULT_CORPUS, [])).toBe(DEFAULT_CORPUS);
  });

  it('is the same list for the same seeds', () => {
    expect(integrationSnippets(seeds)).toEqual(integrationSnippets(seeds));
  });
});
