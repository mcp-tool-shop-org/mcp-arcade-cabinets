// The pure parts of the offline authoring script. Nothing here touches the
// network: the model's answers below are strings in the shapes the sample run
// met (a code fence, a preamble, an object keyed by id, an array of arrays),
// so the parser is held against the mess it will really be handed.

import { describe, expect, it } from 'vitest';

import {
  britishHit,
  chunk,
  corpusTopics,
  groupCandidates,
  keepFirstPassing,
  makeGate,
  mergeDropped,
  parseCandidates,
  productPhrase,
  promptHash,
  sampleSnippets,
  stripFences,
} from '../scripts/author-lib.mjs';
import { lineFault } from '../src/patterns';
import { DEFAULT_CORPUS } from '../src/corpus';

const gate = makeGate(lineFault);
const askGate = makeGate(lineFault, { maxWords: 10 });

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
    expect(got.get('a')).toEqual(['one', 'two']);
    expect(got.get('b')).toEqual(['three']);
  });

  it('takes an array of arrays, in order', () => {
    const got = groupCandidates([['one'], ['two']], keys, 3);
    expect(got.get('a')).toEqual(['one']);
    expect(got.get('b')).toEqual(['two']);
  });

  it('chunks a flat array of the right length', () => {
    const flat = ['a1', 'a2', 'a3', 'b1', 'b2', 'b3'];
    const got = groupCandidates(flat, keys, 3);
    expect(got.get('a')).toEqual(['a1', 'a2', 'a3']);
    expect(got.get('b')).toEqual(['b1', 'b2', 'b3']);
  });

  it('gives one each when the model wrote one each', () => {
    const got = groupCandidates(['one', 'two'], keys, 3);
    expect(got.get('a')).toEqual(['one']);
    expect(got.get('b')).toEqual(['two']);
  });

  it('leaves a key empty rather than inventing a line', () => {
    const got = groupCandidates({ a: ['one'] }, keys, 3);
    expect(got.get('b')).toEqual([]);
  });

  it('ignores a non-string among the candidates', () => {
    const got = groupCandidates({ a: ['one', 7, null] }, keys, 3);
    expect(got.get('a')).toEqual(['one']);
  });
});

describe('britishHit', () => {
  it('catches the spellings on the list', () => {
    expect(britishHit('make the colour nicer')).toBe('colour');
    expect(britishHit('a loyalty programme for the machine')).toBe('programme');
    expect(britishHit('the folder should feel organised')).toBe('organised');
    expect(britishHit('whilst you were typing')).toBe('whilst');
    expect(britishHit('a marvellous little thing')).toBe('marvellous');
    expect(britishHit('put it in the catalogue')).toBe('catalogue');
  });

  it('leaves the American words alone', () => {
    for (const line of [
      'the logs sound optimistic today',
      'i love a good parallelism',
      'the analysis is wonderful',
      'paint the color a friendly blue',
      'it is a program that runs',
      'center the button please',
    ]) {
      expect(britishHit(line)).toBeNull();
    }
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
    expect(gate('make the colour warmer')).toBe('british:colour');
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
    expect(got.dropped).toEqual({ 'forbidden word or digit': 1, 'british:colour': 1 });
  });

  it('keeps nothing when nothing passes', () => {
    const got = keepFirstPassing(['add 2 ducks', 'do it now!'], gate);
    expect(got.kept).toBeNull();
    expect(got.dropped).toEqual({ 'forbidden word or digit': 1, yells: 1 });
  });

  it('strips the transport whitespace and says how often', () => {
    const got = keepFirstPassing(['  make it duck shaped  '], gate);
    expect(got.kept).toBe('make it duck shaped');
    expect(got.trimmed).toBe(1);
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
});
