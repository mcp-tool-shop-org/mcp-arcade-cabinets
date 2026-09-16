// The pure parts of the offline authoring script. Nothing here touches the
// network: the model's answers below are strings in the shapes the sample run
// met (a code fence, a preamble, an object keyed by id, an array of arrays),
// so the parser is held against the mess it will really be handed.

import { describe, expect, it } from 'vitest';

import {
  chunk,
  chunkEven,
  corpusTopics,
  groupCandidates,
  keepFirstPassing,
  makeGate,
  mapLimit,
  mergeDropped,
  parseArgv,
  parseCandidates,
  poolFilter,
  productPhrase,
  promptHash,
  runOpts,
  sampleSnippets,
  stripFences,
} from '../scripts/author-lib.mjs';
import { lineFault } from '../src/patterns';
import { britishHit } from '../src/spelling';
import { DEFAULT_CORPUS } from '../src/corpus';

// The script injects both halves of the gate from the bundled package, so the
// test composes it the same way rather than from a copy of either list.
const gate = makeGate(lineFault, britishHit);
const askGate = makeGate(lineFault, britishHit, { maxWords: 10 });

describe('parseArgv', () => {
  const USAGE = 'usage: node scripts/author.mjs run --model <spec>';
  const shape = {
    valued: new Set(['model', 'only', 'pool', 'chunk', 'concurrency']),
    bare: new Set(['apply', 'revoice']),
    usage: USAGE,
  };
  const read = (...argv: string[]) => parseArgv(argv, shape);

  it('takes the positional words, the valued flags and the bare ones', () => {
    const got = read('run', '--model', 'ollama:a-tag', '--chunk=40', '--apply');
    expect(got.positional).toEqual(['run']);
    expect(got.flags).toEqual({ model: 'ollama:a-tag', chunk: '40', apply: true });
  });

  it('refuses an unknown flag, and says the usage', () => {
    expect(() => read('run', '--nope', 'x')).toThrow(/unknown flag --nope/);
    expect(() => read('run', '--nope', 'x')).toThrow(USAGE);
  });

  it('refuses an unknown flag that has no value, by its name and not its value', () => {
    // The name is read before the value is taken, so a flag nobody knows says
    // so rather than complaining about a value it was never going to use.
    expect(() => read('run', '--nope')).toThrow(/unknown flag --nope/);
    expect(() => read('run', '--nope')).not.toThrow(/missing value/);
  });

  it('refuses an unknown short flag', () => {
    expect(() => read('run', '-x')).toThrow(/unknown flag -x/);
  });

  it('still refuses a known flag with no value', () => {
    expect(() => read('run', '--model')).toThrow(/missing value for --model/);
    expect(() => read('run', '--model', '--apply')).toThrow(/missing value for --model/);
  });

  it('refuses a value handed to a flag that is its own answer', () => {
    expect(() => read('run', '--apply=yes')).toThrow(/--apply takes no value/);
  });

  it('answers the help flag without reading anything else', () => {
    expect(read('--help').flags.help).toBe(true);
    expect(read('-h').flags.help).toBe(true);
  });
});

describe('runOpts', () => {
  const defaults = {
    temperature: 0.9,
    timeoutMs: 1_800_000,
    ollama: 'http://127.0.0.1:11434',
    concurrency: 2,
    chunk: 40,
  };

  it('falls back to every default when no flag was given', () => {
    const got = runOpts({}, defaults);
    expect(got.temperature).toBe(0.9);
    expect(got.timeoutMs).toBe(1_800_000);
    expect(got.ollama).toBe('http://127.0.0.1:11434');
    expect(got.concurrency).toBe(2);
    expect(got.chunk).toBe(40);
    expect(got.spare).toBeNull();
    expect(got.poolsNamed).toBe(false);
  });

  it('reads the numbers it was given', () => {
    const got = runOpts(
      { chunk: '12', concurrency: '4', temperature: '0.4', spare: '14' },
      defaults,
    );
    expect(got.chunk).toBe(12);
    expect(got.concurrency).toBe(4);
    expect(got.temperature).toBe(0.4);
    expect(got.spare).toBe(14);
  });

  it('refuses a flag that is not a number, one reason a flag', () => {
    // NaN walks quietly into a chunk size, a width, a temperature and a
    // timeout, and turns into a call that asks for nothing or waits forever.
    for (const key of ['chunk', 'concurrency', 'temperature', 'timeout']) {
      expect(() => runOpts({ [key]: 'four' }, defaults), key).toThrow(
        `--${key} wants a number, not "four"`,
      );
      expect(() => runOpts({ [key]: '' }, defaults), key).toThrow(/wants a number/);
      expect(() => runOpts({ [key]: 'Infinity' }, defaults), key).toThrow(/wants a number/);
    }
  });

  it('keeps a width and a chunk at one at the least', () => {
    expect(runOpts({ concurrency: '0', chunk: '-3' }, defaults).concurrency).toBe(1);
    expect(runOpts({ concurrency: '0', chunk: '-3' }, defaults).chunk).toBe(1);
  });
});

describe('poolFilter', () => {
  it('takes everything when no pool was named', () => {
    const all = poolFilter(undefined);
    expect(all('user.syncs')).toBe(true);
    expect(all('agent.replies')).toBe(true);
  });

  it('takes one pool by its whole name', () => {
    const one = poolFilter('user.syncs');
    expect(one('user.syncs')).toBe(true);
    expect(one('user.creeps')).toBe(false);
    expect(one('user.sync')).toBe(false);
  });

  it('takes a whole branch by its head', () => {
    const agent = poolFilter('agent');
    expect(agent('agent.replies')).toBe(true);
    expect(agent('agent.nagReplies')).toBe(true);
    expect(agent('user.creeps')).toBe(false);
  });

  it('takes a comma-separated list', () => {
    const two = poolFilter('user.syncs, agent.ships');
    expect(two('user.syncs')).toBe(true);
    expect(two('agent.ships')).toBe(true);
    expect(two('agent.hmm')).toBe(false);
  });
});

describe('parseCandidates', () => {
  it('reads a bare JSON array', () => {
    expect(parseCandidates('["one", "two"]')).toEqual(['one', 'two']);
  });

  it('reads through a code fence', () => {
    const text = '```json\n{"a": ["one"]}\n```';
    expect(parseCandidates(text)).toEqual({ a: ['one'] });
  });

  it('reads through a preamble and a sign-off', () => {
    const text = 'Sure, here you go:\n\n[["one"], ["two"]]\n\nHope that helps.';
    expect(parseCandidates(text)).toEqual([['one'], ['two']]);
  });

  it('takes the first balanced value when the preamble carries a bracket', () => {
    const text = 'Here are the lines [one per piece]:\n\n{"a": ["one", "two"]}\n';
    // The preamble's own bracket is the first one, so the parser has to start
    // there, fail to find anything usable, and go on to the real value.
    expect(parseCandidates(text)).toEqual({ a: ['one', 'two'] });
  });

  it('takes an array that follows a bracketed preamble', () => {
    const text = 'Notes [read these first]: three candidates each.\n[["one"], ["two"]]';
    expect(parseCandidates(text)).toEqual([['one'], ['two']]);
  });

  it('is not fooled by a bracket inside a string', () => {
    expect(parseCandidates('{"a": ["a ] bracket", "b"]}')).toEqual({ a: ['a ] bracket', 'b'] });
  });

  it('forgives one trailing comma', () => {
    expect(parseCandidates('["one", "two",]')).toEqual(['one', 'two']);
  });

  it('says so when there is no JSON at all', () => {
    expect(() => parseCandidates('I would rather not.')).toThrow(/no JSON/);
  });

  it('says so when the JSON does not parse', () => {
    expect(() => parseCandidates('[one, two]')).toThrow(/does not parse/);
  });

  it('strips a fence without swallowing the body', () => {
    expect(stripFences('```\nhello\n```')).toBe('hello');
  });
});

describe('groupCandidates', () => {
  const keys = ['a', 'b'];

  it('takes an object keyed by id', () => {
    const got = groupCandidates({ a: ['one', 'two'], b: ['three'] }, keys, 3);
    expect(got.groups.get('a')).toEqual(['one', 'two']);
    expect(got.groups.get('b')).toEqual(['three']);
    expect(got.dropped).toEqual({});
  });

  it('takes an array of arrays, in order', () => {
    const got = groupCandidates([['one'], ['two']], keys, 3);
    expect(got.groups.get('a')).toEqual(['one']);
    expect(got.groups.get('b')).toEqual(['two']);
  });

  it('chunks a flat array of the right length', () => {
    const flat = ['a1', 'a2', 'a3', 'b1', 'b2', 'b3'];
    const got = groupCandidates(flat, keys, 3);
    expect(got.groups.get('a')).toEqual(['a1', 'a2', 'a3']);
    expect(got.groups.get('b')).toEqual(['b1', 'b2', 'b3']);
    expect(got.dropped).toEqual({});
  });

  it('gives one each when the model wrote one each', () => {
    const got = groupCandidates(['one', 'two'], keys, 3);
    expect(got.groups.get('a')).toEqual(['one']);
    expect(got.groups.get('b')).toEqual(['two']);
  });

  it('leaves a key empty rather than inventing a line', () => {
    const got = groupCandidates({ a: ['one'] }, keys, 3);
    expect(got.groups.get('b')).toEqual([]);
  });

  it('ignores a non-string among the candidates', () => {
    const got = groupCandidates({ a: ['one', 7, null] }, keys, 3);
    expect(got.groups.get('a')).toEqual(['one']);
  });

  it('records the surplus of a flat array that fits neither shape', () => {
    const seven = ['one', 'two', 'three', 'four', 'five', 'six', 'seven'];
    const got = groupCandidates(seven, keys, 3);
    expect(got.groups.get('a')).toEqual(['one']);
    expect(got.groups.get('b')).toEqual(['two']);
    expect(got.dropped).toEqual({ surplus: 5 });
  });

  it('records a key nobody asked about', () => {
    const got = groupCandidates({ a: ['one'], b: ['two'], c: ['three', 'four'] }, keys, 3);
    expect(got.dropped).toEqual({ surplus: 2 });
  });

  it('records a row past the last key', () => {
    const got = groupCandidates([['one'], ['two'], ['three'], ['four']], keys, 3);
    expect(got.groups.get('b')).toEqual(['two']);
    expect(got.dropped).toEqual({ surplus: 2 });
  });

  it('says nothing about a short answer, which the caller counts as missing', () => {
    const got = groupCandidates(['one'], keys, 3);
    expect(got.groups.get('b')).toEqual([]);
    expect(got.dropped).toEqual({});
  });
});

describe('the gate', () => {
  it('passes a line the cabinet would say', () => {
    expect(gate('can you make the ducks arrive faster')).toBeNull();
  });

  it('gives the package reason first', () => {
    expect(gate('add 2 ducks')).toBe('forbidden word or digit');
    expect(gate('do it now')).toBeNull();
    expect(gate('do it now!')).toBe('yells');
    expect(gate('please do ASAP work')).toBe('yells');
  });

  it('names the British spelling it found', () => {
    expect(gate('make the colour warmer')).toBe('british:colour (write color)');
  });

  it('holds asks to the tighter word cap', () => {
    const eleven = 'can you please put the little duck button on the page';
    expect(gate(eleven)).toBeNull();
    expect(askGate(eleven)).toBe('too many words');
  });

  it('counts a product token as one word', () => {
    expect(askGate('can {product} greet everyone who arrives')).toBeNull();
  });

  it('never edits: a padded line is a drop, not a trim', () => {
    expect(gate(' hello there ')).toBe('padded');
  });
});

describe('keepFirstPassing', () => {
  it('keeps the first that passes and counts the rest', () => {
    const got = keepFirstPassing(
      ['add 2 ducks', 'make it duck shaped', 'make the colour warmer', 'one more duck'],
      gate,
    );
    expect(got.kept).toBe('make it duck shaped');
    expect(got.alternates).toEqual(['one more duck']);
    expect(got.dropped).toEqual({
      'forbidden word or digit': 1,
      'british:colour (write color)': 1,
    });
  });

  it('keeps nothing when nothing passes', () => {
    const got = keepFirstPassing(['add 2 ducks', 'do it now!'], gate);
    expect(got.kept).toBeNull();
    expect(got.dropped).toEqual({ 'forbidden word or digit': 1, yells: 1 });
  });

  it('drops a padded line rather than trimming it into passing', () => {
    const got = keepFirstPassing(['  make it duck shaped  ', 'make it duck shaped'], gate);
    expect(got.kept).toBe('make it duck shaped');
    expect(got.dropped).toEqual({ padded: 1 });
  });

  it('counts an answer that was not a line at all', () => {
    const got = keepFirstPassing([null, 42, ''], gate);
    expect(got.kept).toBeNull();
    expect(got.dropped['not a string']).toBe(2);
  });

  it('survives nothing at all', () => {
    expect(keepFirstPassing(undefined, gate).kept).toBeNull();
  });
});

describe('mergeDropped', () => {
  it('adds one tally into another', () => {
    const into = { yells: 1 };
    mergeDropped(into, { yells: 2, padded: 1 });
    expect(into).toEqual({ yells: 3, padded: 1 });
  });
});

describe('promptHash', () => {
  it('is the same for the same prompt and different for a changed one', () => {
    const a = promptHash('system', 'user');
    expect(a).toBe(promptHash('system', 'user'));
    expect(a).not.toBe(promptHash('system', 'user '));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('does not confuse where the system prompt ends', () => {
    expect(promptHash('a', 'b')).not.toBe(promptHash('a\n\nb', ''));
  });
});

describe('sampleSnippets', () => {
  const python = DEFAULT_CORPUS.byStack.python ?? [];

  it('picks the first ten by id inside the band, with no randomness', () => {
    const got = sampleSnippets(python, 'python', 2, 10);
    expect(got).toHaveLength(10);
    expect(got.every((s) => s.band <= 2)).toBe(true);
    expect(got.every((s) => s.stack === 'python')).toBe(true);
    const ids = got.map((s) => s.id);
    expect([...ids].sort()).toEqual(ids);
    expect(sampleSnippets(python, 'python', 2, 10).map((s) => s.id)).toEqual(ids);
  });

  it('never reaches into another stack', () => {
    expect(sampleSnippets(python, 'bash', 7, 10)).toEqual([]);
  });

  it('gives what there is when there is less than asked for', () => {
    expect(sampleSnippets(python, 'python', 1, 999).length).toBeLessThan(python.length);
  });
});

describe('productPhrase', () => {
  it('passes a product that names nobody', () => {
    expect(productPhrase('a website for my cat', {})).toBe('a website for my cat');
  });

  it('swaps a product that names a real company', () => {
    expect(
      productPhrase('Uber but for ducks', { 'Uber but for ducks': 'a rideshare for ducks' }),
    ).toBe('a rideshare for ducks');
  });

  it('returns null when a brand has no brand-free phrase, so the caller can halt', () => {
    expect(productPhrase('Uber but for ducks', {})).toBeNull();
  });

  it('refuses a swap that still names the company', () => {
    expect(
      productPhrase('Uber but for ducks', { 'Uber but for ducks': 'Uber, for ducks' }),
    ).toBeNull();
  });
});

describe('corpusTopics and chunk', () => {
  it('collects every topic word once, sorted', () => {
    const topics = corpusTopics(DEFAULT_CORPUS.snippets);
    expect(topics.length).toBeGreaterThan(20);
    expect([...topics].sort()).toEqual(topics);
    expect(new Set(topics).size).toBe(topics.length);
  });

  it('cuts a list into readable chunks', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
  });

  it('cuts an even chunk into equal calls rather than a full one and a remainder', () => {
    // Fifty-two items at a chunk of forty is two calls either way; the even cut
    // asks the same question twice instead of asking a thin one second.
    const fifty2 = Array.from({ length: 52 }, (_, i) => i);
    expect(chunkEven(fifty2, 40).map((g) => g.length)).toEqual([26, 26]);
    expect(chunkEven(fifty2, 40).flat()).toEqual(fifty2);
    expect(chunkEven([1, 2, 3, 4, 5], 2).map((g) => g.length)).toEqual([2, 2, 1]);
    expect(chunkEven([1, 2, 3], 40)).toEqual([[1, 2, 3]]);
    expect(chunkEven([], 40)).toEqual([]);
  });

  it('never gives a chunk more than the cap', () => {
    for (let n = 1; n <= 200; n += 1) {
      for (const size of [1, 7, 40]) {
        const parts = chunkEven(
          Array.from({ length: n }, (_, i) => i),
          size,
        );
        expect(parts.flat(), `${n} at ${size}`).toHaveLength(n);
        for (const part of parts) expect(part.length, `${n} at ${size}`).toBeLessThanOrEqual(size);
      }
    }
  });
});

describe('mapLimit', () => {
  it('hands the answers back in the order asked, whatever order they finished in', async () => {
    const delays = [40, 5, 25, 1, 15];
    const out = await mapLimit(delays, 3, async (ms: number, i: number) => {
      await new Promise((done) => setTimeout(done, ms));
      return i;
    });
    expect(out).toEqual([0, 1, 2, 3, 4]);
  });

  it('holds the width it was given, and one is a plain walk', async () => {
    let live = 0;
    let most = 0;
    const work = async () => {
      live += 1;
      most = Math.max(most, live);
      await new Promise((done) => setTimeout(done, 5));
      live -= 1;
      return most;
    };
    await mapLimit([1, 2, 3, 4, 5, 6], 2, work);
    expect(most).toBe(2);
    most = 0;
    await mapLimit([1, 2, 3, 4], 1, work);
    expect(most).toBe(1);
  });

  it('takes an empty list without a call', async () => {
    let calls = 0;
    const out = await mapLimit([], 4, async () => {
      calls += 1;
      return 1;
    });
    expect(out).toEqual([]);
    expect(calls).toBe(0);
  });
});
