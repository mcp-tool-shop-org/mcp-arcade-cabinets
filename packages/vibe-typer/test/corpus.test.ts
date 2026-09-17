import { describe, expect, it } from 'vitest';

import {
  askIsBound,
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

  // An ask written against one story level's premise is a request only
  // inside that level. Untagged, it was drawn into any in-band level of its
  // stack: the endless ladder starts at the band those asks live in, so an
  // app for lost socks opened by asking for ducks.
  it('halts on a story ask that does not say which level it is for', () => {
    const rest = Object.fromEntries(
      CORPUS_STACKS.map((s) => [s, DEFAULT_CORPUS.byStack[s]!.map((x) => ({ ...x }))]),
    ) as Record<string, Record<string, unknown>[]>;

    const loose = JSON.parse(JSON.stringify(rest)) as typeof rest;
    loose.bash![3]!.ask = 'reverse the line of waiting ducks';
    delete loose.bash![3]!.for;
    expect(() => loadCorpus(loose)).toThrow('patterns/corpus/bash.json: 3.ask');

    // The same ask, now saying whose story it belongs to, loads.
    const bound = JSON.parse(JSON.stringify(rest)) as typeof rest;
    bound.bash![3]!.ask = 'reverse the line of waiting ducks';
    bound.bash![3]!.for = 'duck-rides';
    expect(loadCorpus(bound).byStack.bash![3]!.for).toBe('duck-rides');

    // And an empty tag is no tag at all.
    const blank = JSON.parse(JSON.stringify(rest)) as typeof rest;
    blank.bash![4]!.for = '  ';
    expect(() => loadCorpus(blank)).toThrow('patterns/corpus/bash.json: 4.for');
  });

  // The reaction is the ask's row one down: the line the user says when this
  // request's piece ships. It goes through the ask's gate verbatim, and it
  // leans on the SAME `for` — no second binding field — so a reaction about
  // ducks plays in the rideshare for ducks and nowhere else. Authoring is
  // then one key per snippet in six JSON files and no code.
  it('holds a snippet reaction to the gate its ask is held to', () => {
    const rest = Object.fromEntries(
      CORPUS_STACKS.map((s) => [s, DEFAULT_CORPUS.byStack[s]!.map((x) => ({ ...x }))]),
    ) as Record<string, Record<string, unknown>[]>;

    const digit = JSON.parse(JSON.stringify(rest)) as typeof rest;
    digit.bash![1]!.reaction = 'that is 3 times better than i asked for';
    expect(() => loadCorpus(digit)).toThrow('patterns/corpus/bash.json: 1.reaction');

    const titled = JSON.parse(JSON.stringify(rest)) as typeof rest;
    titled.bash![2]!.reaction = 'the {title} is exactly it';
    expect(() => loadCorpus(titled)).toThrow('patterns/corpus/bash.json: 2.reaction');

    const notAString = JSON.parse(JSON.stringify(rest)) as typeof rest;
    notAString.bash![5]!.reaction = 7;
    expect(() => loadCorpus(notAString)).toThrow('patterns/corpus/bash.json: 5.reaction');

    // A story noun with no level to hold it up: the ask row's own halt.
    const loose = JSON.parse(JSON.stringify(rest)) as typeof rest;
    loose.bash![3]!.reaction = 'the ducks look so much happier now';
    delete loose.bash![3]!.for;
    expect(() => loadCorpus(loose)).toThrow('patterns/corpus/bash.json: 3.reaction');

    // The same line, saying whose story it belongs to, loads and is kept.
    const bound = JSON.parse(JSON.stringify(rest)) as typeof rest;
    bound.bash![3]!.reaction = 'the ducks look so much happier now';
    bound.bash![3]!.for = 'duck-rides';
    expect(loadCorpus(bound).byStack.bash![3]!.reaction).toBe('the ducks look so much happier now');

    // `{product}` is the one hole, exactly as it is on the ask.
    const held = JSON.parse(JSON.stringify(rest)) as typeof rest;
    held.bash![6]!.reaction = 'that is what {product} was missing';
    expect(loadCorpus(held).byStack.bash![6]!.reaction).toBe('that is what {product} was missing');
  });

  it('flags a story ask and leaves an ordinary one alone', () => {
    expect(askIsBound('split one bill among five ducks')).toBe(true);
    expect(askIsBound('keep only the socks with no partner')).toBe(true);
    expect(askIsBound('use unknown if the sock has no owner')).toBe(true);
    expect(askIsBound('add two numbers and show the answer.')).toBe(false);
    expect(askIsBound('let {product} announce it is here.')).toBe(false);
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
