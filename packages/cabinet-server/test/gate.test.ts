import { describe, expect, it } from 'vitest';

import { FORBIDDEN, gateLine, lineKey, NAMES, normalizeLine, SAY_MAX_WORDS } from '../src/gate';

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
