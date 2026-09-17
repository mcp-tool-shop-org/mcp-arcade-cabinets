import { describe, expect, it } from 'vitest';

import {
  FORBIDDEN,
  gateLine,
  lineKey,
  NAMES,
  normalizeLine,
  SAY_MAX_WORDS,
  UNPRINTABLE,
} from '../src/gate';

describe('the say gate', () => {
  it('passes a short dry line and normalizes its wrapping', () => {
    const r = gateLine('  "The plate is out, and the plate has opinions."  ');
    expect(r).toEqual({ ok: true, line: 'The plate is out, and the plate has opinions.' });
    expect(normalizeLine('**Hush.**')).toBe('Hush.');
    expect(normalizeLine('  many   spaces here ')).toBe('many spaces here');
  });

  it('caps at twelve words', () => {
    const twelve = 'one two three four five six seven eight nine ten eleven twelve.';
    expect(gateLine(twelve).ok).toBe(true);
    expect(gateLine(`${twelve.slice(0, -1)} thirteen.`)).toEqual({ ok: false, reason: 'long' });
    expect(SAY_MAX_WORDS).toBe(12);
    expect(gateLine('one two three four five', { maxWords: 4 })).toEqual({
      ok: false,
      reason: 'long',
    });
  });

  it('allows one sentence only', () => {
    expect(gateLine('I heard that. I was not meant to.')).toEqual({
      ok: false,
      reason: 'sentences',
    });
    expect(gateLine('Really? Yes.')).toEqual({ ok: false, reason: 'sentences' });
    expect(gateLine('A line\nand another')).toEqual({ ok: false, reason: 'sentences' });
    expect(gateLine('Hush... the plate is listening.').ok).toBe(true);
    expect(gateLine('Hush!').ok).toBe(true);
  });

  it('refuses a digit, a fact or score word, and a tool, model or seat name', () => {
    expect(gateLine('I have 3 items.')).toEqual({ ok: false, reason: 'digit' });
    // Any script's digit and any number glyph, not only ASCII (Grok's review).
    for (const line of [
      'I have ３ items.',
      'I have ٣ items.',
      'Item ③ is mine.',
      'The plate is ½ out.',
      'Take the ³ path.',
    ]) {
      expect(gateLine(line)).toEqual({ ok: false, reason: 'digit' });
    }
    expect(gateLine('The menu is a lie.')).toEqual({ ok: false, reason: 'forbidden' });
    expect(gateLine('Score is a word I do not use.')).toEqual({ ok: false, reason: 'forbidden' });
    expect(gateLine('You revealed nothing.')).toEqual({ ok: false, reason: 'forbidden' });
    expect(gateLine('Say hello to the plate.')).toEqual({ ok: false, reason: 'name' });
    expect(gateLine('Fire when ready.')).toEqual({ ok: false, reason: 'name' });
    expect(gateLine('Kimi told me so.')).toEqual({ ok: false, reason: 'name' });
    expect(gateLine('The seat is warm.')).toEqual({ ok: false, reason: 'name' });
    expect(gateLine('I am a model and the door is a suggestion.').ok).toBe(true);
    expect(gateLine('A tool I was not given is still a tool.').ok).toBe(true);
  });

  it('refuses a character nobody typed, the way the typing cabinet does', () => {
    // Each of these passed every other rule — not whitespace, not a digit,
    // not a closed word, not a name — and landed on the field caption and in
    // the body posted to the voice worker, which writes it into a receipt.
    const sneaky: [string, string][] = [
      ['zero width space', 'The plate\u200bis out.'],
      ['right-to-left override', 'The plate is \u202eout.'],
      ['a left-to-right mark', 'The plate\u200e is out.'],
      ['a C0 control', 'The plate\u0007 is out.'],
      ['a soft hyphen', 'The pla\u00adte is out.'],
      ['a bidi isolate', 'The \u2066plate\u2069 is out.'],
      ['a C1 control', 'The plate\u0085is out.'],
      ['a word joiner', 'The plate\u2060is out.'],
    ];
    for (const [why, line] of sneaky) {
      expect(gateLine(line), why).toEqual({ ok: false, reason: 'character' });
    }
    // The separators and the byte-order mark are whitespace to `normalizeLine`
    // and become one space before the rule is reached; they stay in the class
    // so the rule does not depend on that staying true.
    for (const ch of ['\u2028', '\u2029', '\ufeff']) {
      expect(UNPRINTABLE.test(ch), ch.codePointAt(0)?.toString(16)).toBe(true);
    }
    // The rule is that class and not the whole keyboard: a persona sheet may
    // carry an accent or a curly mark, and the gate does not straighten them.
    expect(gateLine('The plate is out, naturellement.').ok).toBe(true);
    expect(gateLine('The Doorman’s plate is out.').ok).toBe(true);
    expect(UNPRINTABLE.test('The plate is out.')).toBe(false);
  });

  it('refuses a line longer than the bound instead of clipping it to fit', () => {
    // A clipped line the gate then admitted would have the boss say
    // something the caller did not write, and read back as accepted.
    const short = 'The plate is out.';
    expect(gateLine(short, { maxChars: short.length }).ok).toBe(true);
    expect(gateLine(short, { maxChars: short.length - 1 })).toEqual({
      ok: false,
      reason: 'overlong',
    });
    // Long enough that the first twelve words would have passed on their own.
    const padded = `${short}${' '.repeat(200)}`;
    expect(gateLine(padded, { maxChars: 160 })).toEqual({ ok: false, reason: 'overlong' });
    expect(gateLine(padded).ok).toBe(true);
  });

  it('refuses a repeat within the window, letters only', () => {
    const recent = ['Nobody listed me and here I am.'];
    expect(gateLine('nobody listed me, and here I am!', { recent })).toEqual({
      ok: false,
      reason: 'repeat',
    });
    expect(gateLine('Nobody listed me and here I stay.', { recent }).ok).toBe(true);
    expect(lineKey('Hello, World!')).toBe('helloworld');
  });

  it('refuses nothing at all', () => {
    expect(gateLine('')).toEqual({ ok: false, reason: 'empty' });
    expect(gateLine('   ')).toEqual({ ok: false, reason: 'empty' });
    expect(gateLine(undefined)).toEqual({ ok: false, reason: 'empty' });
    expect(gateLine(42)).toEqual({ ok: false, reason: 'empty' });
  });

  it('keeps the pilot prompt words and the names list disjoint from the persona voice', () => {
    expect(FORBIDDEN.test('honest')).toBe(false);
    expect(FORBIDDEN.test('tool')).toBe(false);
    expect(NAMES.test('model')).toBe(false);
    expect(NAMES.test('the Menu')).toBe(false);
  });
});
