// The pure parts of the offline authoring script. Nothing here touches the
// network: the model's answers below are strings in the shapes the sample run
// met (a code fence, a preamble, an object keyed by id, an array of arrays),
// so the parser is held against the mess it will really be handed.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  chunk,
  chunkEven,
  claimsRepeat,
  corpusTopics,
  crossBracketTwins,
  familyClash,
  groupCandidates,
  keepFirstPassing,
  lineKey,
  makeGate,
  mapLimit,
  mergeDropped,
  modelFamily,
  parseArgv,
  parseCandidates,
  poolFilter,
  productPhrase,
  promptHash,
  runOpts,
  sampleSnippets,
  settleDrop,
  stripFences,
  voiceExemplars,
  writerLookupNames,
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

// The editor may not be the family that wrote the lines. Slice three left that
// to memory and it was not remembered; these three functions are how the tool
// holds it instead, so they are held here.
describe('modelFamily', () => {
  it('reads an Ollama tag by its name', () => {
    expect(modelFamily('ollama:kimi-k2.6:cloud')).toBe('moonshot');
    expect(modelFamily('ollama:mistral-large-3:675b-cloud')).toBe('mistral');
    expect(modelFamily('ollama:gpt-oss:120b-cloud')).toBe('openai');
    expect(modelFamily('ollama:gemma4:31b')).toBe('google');
    expect(modelFamily('ollama:glm-5.3-flash:cloud')).toBe('zhipu');
  });

  it('reads an OpenRouter id by its vendor prefix', () => {
    expect(modelFamily('openrouter:moonshotai/kimi-k2-thinking')).toBe('moonshot');
    expect(modelFamily('openrouter:mistralai/mistral-large')).toBe('mistral');
    expect(modelFamily('openrouter:x-ai/grok-4')).toBe('xai');
    expect(modelFamily('openrouter:anthropic/claude-opus-5')).toBe('anthropic');
  });

  it('says unknown rather than guessing', () => {
    expect(modelFamily('openrouter:nobody/a-model')).toBe('unknown');
    expect(modelFamily('')).toBe('unknown');
    expect(modelFamily(null)).toBe('unknown');
  });
});

describe('writerLookupNames', () => {
  it('walks a dotted key from the whole name down to its last part', () => {
    expect(writerLookupNames('user.nags')).toEqual(['user.nags', 'nags']);
    expect(writerLookupNames('user.reviewsByProduct.cat-website')).toEqual([
      'user.reviewsByProduct.cat-website',
      'reviewsByProduct.cat-website',
      'cat-website',
    ]);
  });

  it('never repeats a name, and answers nothing for nothing', () => {
    expect(writerLookupNames('nags')).toEqual(['nags']);
    expect(writerLookupNames('')).toEqual([]);
  });
});

describe('familyClash', () => {
  const placed = [
    { name: 'user.creeps', family: 'moonshot' },
    { name: 'agent.replies', family: 'mistral' },
  ];
  const names = (got: { name: string }[]) => got.map((c) => c.name);

  it('names the pools the editor wrote itself', () => {
    expect(names(familyClash('mistral', placed))).toEqual(['agent.replies']);
    expect(names(familyClash('moonshot', placed))).toEqual(['user.creeps']);
    expect(familyClash('mistral', placed)[0]!.why).toMatch(/the editor is the family/);
  });

  it('is empty when the editor wrote none of them', () => {
    expect(familyClash('google', placed)).toEqual([]);
  });

  it('names a pool whose writer could not be read, whoever the editor is', () => {
    // A receipt that failed to parse leaves a pool with no writer, and a gate
    // that cannot see who wrote a pool has no ground to say the editor did not.
    // Not knowing is a halt, not a pass — this is the seam a corrupt receipt
    // would otherwise open.
    const blind = [...placed, { name: 'user.syncs', family: 'unknown' }];
    expect(names(familyClash('google', blind))).toEqual(['user.syncs']);
    expect(familyClash('google', blind)[0]!.why).toMatch(/could not be read/);
    expect(names(familyClash('mistral', blind))).toEqual(['agent.replies', 'user.syncs']);
    // A pool with no family word at all is the same case.
    expect(names(familyClash('google', [{ name: 'user.nags' }]))).toEqual(['user.nags']);
  });

  it('does not halt on an editor the tables cannot place, but still halts on the pool', () => {
    // An editor nobody can place cannot be shown to be marking its own work,
    // so it clears the pools that name a writer and only those.
    expect(familyClash('unknown', placed)).toEqual([]);
    expect(familyClash('', placed)).toEqual([]);
    expect(names(familyClash('unknown', [{ name: 'user.syncs', family: 'unknown' }]))).toEqual([
      'user.syncs',
    ]);
  });
});

// What the editor may not take. The first pass on another family took two
// things it should not have: lines the voice sheet itself names, and lines it
// called repeats of a line under a different bracket.
describe('lineKey', () => {
  it('is letters only and lower case, as the cabinet server counts a repeat', () => {
    expect(lineKey('Hello, World!')).toBe('helloworld');
    // The rule that matters here: punctuation and case are not a difference.
    expect(lineKey('On it, and I will keep it small')).toBe(
      lineKey('  On it, and I will keep it small.  '),
    );
  });
});

describe('voiceExemplars', () => {
  const sheet = [
    '# A voice',
    '',
    'Prose about the character, with | a pipe in it that is not a table.',
    '',
    '## Twenty lines that are the voice',
    '',
    '| line                  | where it does its work | source       |',
    '| --------------------- | ---------------------- | ------------ |',
    '| is it live yet        | a check-in             | sample, nags |',
    '| my cousin is asking   | a check-in             | run, nags    |',
  ].join('\n');

  it('takes the first column of every table row and nothing else', () => {
    const keys = voiceExemplars(sheet);
    expect(keys.size).toBe(2);
    expect(keys.has(lineKey('is it live yet'))).toBe(true);
    expect(keys.has(lineKey('My cousin is asking.'))).toBe(true);
    expect(keys.has(lineKey('a check-in'))).toBe(false);
  });

  it('skips the header row and the rule under it, and takes nothing from nothing', () => {
    expect(voiceExemplars(sheet).has(lineKey('line'))).toBe(false);
    expect(voiceExemplars(sheet).has(lineKey('---'))).toBe(false);
    expect(voiceExemplars('').size).toBe(0);
  });

  it('reads the sheets this package actually ships', () => {
    // Both sheets carry twenty lines under "Twenty lines that are the voice".
    // A sheet whose table stopped parsing would silently un-protect every one
    // of them, so the count is asserted rather than assumed.
    const read = (which: 'user' | 'agent') =>
      voiceExemplars(
        readFileSync(path.resolve(`packages/vibe-typer/patterns/voice/${which}.md`), 'utf8'),
      );
    expect(read('user').size).toBe(20);
    expect(read('agent').size).toBe(20);
  });
});

describe('crossBracketTwins and claimsRepeat', () => {
  it('finds a line that sits under two brackets, and ignores one that does not', () => {
    const twins = crossBracketTwins([
      { pool: 'class', line: 'the blueprint knows what it is building.' },
      { pool: 'classes', line: 'The blueprint knows what it is building!' },
      { pool: 'classes', line: 'sorts of items found their family names.' },
    ]);
    expect(twins.has(lineKey('the blueprint knows what it is building.'))).toBe(true);
    expect(twins.has(lineKey('sorts of items found their family names.'))).toBe(false);
  });

  it('reads the clauses the editor actually writes', () => {
    expect(claimsRepeat('already appears in the same list, said a different way')).toBe(true);
    expect(claimsRepeat('redundant with earlier lines about showing buttons')).toBe(true);
    expect(claimsRepeat('appears in a different way as line 3')).toBe(true);
    expect(claimsRepeat('does not sound like that character')).toBe(false);
    expect(claimsRepeat('makes no sense for the place the list says it is used')).toBe(false);
  });
});

describe('settleDrop', () => {
  it('keeps a line the sheet names, whatever else is true of it', () => {
    expect(settleDrop({ isExemplar: true, why: 'does not sound like that character' })).toBe(
      'exemplar',
    );
    expect(settleDrop({ isExemplar: true, atFloor: true, hasTwinElsewhere: true })).toBe(
      'exemplar',
    );
  });

  it('refuses a repeat claim against a twin under another bracket', () => {
    // The case the first pass got wrong: sixty labeled brackets read as one
    // list. Two brackets carrying the same line are two lists, so neither line
    // may go as a duplicate of the other.
    const twins = crossBracketTwins([
      { pool: 'class', line: 'the blueprint knows what it is building.' },
      { pool: 'classes', line: 'the blueprint knows what it is building.' },
    ]);
    const hasTwinElsewhere = twins.has(lineKey('the blueprint knows what it is building.'));
    expect(hasTwinElsewhere).toBe(true);
    expect(
      settleDrop({
        hasTwinElsewhere,
        why: 'already appears in the same list, said a different way',
      }),
    ).toBe('twin');
    // Its own bracket is still its own business: a line dropped for the voice,
    // not for repeating, goes.
    expect(settleDrop({ hasTwinElsewhere, why: 'does not sound like that character' })).toBe(
      'drop',
    );
  });

  it('lets the floor decide when neither of the first two applies', () => {
    expect(settleDrop({ atFloor: true, why: 'does not sound like that character' })).toBe('floor');
    expect(settleDrop({ why: 'does not sound like that character' })).toBe('drop');
    expect(settleDrop({})).toBe('drop');
  });
});
