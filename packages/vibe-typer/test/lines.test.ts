import { describe, expect, it } from 'vitest';

import { fill, LinePicker, safeTitle } from '../src/lines';
import { DEFAULT_PATTERNS } from '../src/patterns';
import { DEFAULT_CORPUS } from '../src/corpus';
import type { Snippet } from '../src/types';

const SNIPPET = DEFAULT_CORPUS.byStack.bash![0]!;

function picker(seed = 3, tier: 0 | 1 | 2 | 3 = 0, dated = false): LinePicker {
  const p = new LinePicker(DEFAULT_PATTERNS, { seed, tier, ...(dated ? { dated: true } : {}) });
  p.startLevel(0);
  return p;
}

describe('the line picker', () => {
  it('never repeats a line inside a level', () => {
    const p = picker();
    const asks = new Set<string>();
    const replies = new Set<string>();
    for (let i = 0; i < 16; i++) {
      asks.add(p.ask('bash', 'a website for my cat', SNIPPET));
      replies.add(p.reply());
    }
    expect(asks.size).toBe(16);
    expect(replies.size).toBe(16);
    const hmms = new Set<string>();
    for (let i = 0; i < 12; i++) hmms.add(p.hmm());
    expect(hmms.size).toBe(12);
  });

  it('gives the same words for the same seed and level', () => {
    const a = picker(9);
    const b = picker(9);
    for (let i = 0; i < 8; i++) {
      expect(a.ask('python', 'Uber but for ducks', SNIPPET)).toBe(
        b.ask('python', 'Uber but for ducks', SNIPPET),
      );
      expect(a.reaction()).toBe(b.reaction());
    }
  });

  it('starts a new bag each level, and a different seed reads differently', () => {
    const a = picker(4);
    const first = a.ship();
    a.startLevel(1);
    const second = a.ship();
    expect(typeof second).toBe('string');
    const other = picker(5);
    const words = new Set<string>();
    for (let i = 0; i < 8; i++) words.add(other.ship());
    expect(words.has(first)).toBe(true);
  });

  it('skips the dated jokes unless the player turns them on', () => {
    const dated = new Set(DEFAULT_PATTERNS.user.dated);
    const plain = picker(2);
    const seen = new Set<string>();
    for (let i = 0; i < 16; i++) seen.add(plain.ask('sql', 'a dashboard', SNIPPET));
    expect([...seen].some((line) => dated.has(line))).toBe(false);

    const on = picker(2, 0, true);
    const withDated = new Set<string>();
    for (let i = 0; i < 24; i++) withDated.add(on.ask('sql', 'a dashboard', SNIPPET));
    expect([...withDated].some((line) => dated.has(line))).toBe(true);
  });

  it('reads hardcore in tier two words', () => {
    const hard = picker(6, 3);
    const easy = picker(6, 2);
    expect(hard.reaction()).toBe(easy.reaction());
  });
});

describe('filling a line', () => {
  it('puts the product and the title into the ask', () => {
    const line = fill('i want {title} for {product}', 'Uber but for ducks', SNIPPET);
    expect(line).toBe(`i want ${SNIPPET.title} for Uber but for ducks`);
  });

  it('stands in for a title the chat may not say', () => {
    const digit: Snippet = { ...SNIPPET, title: 'ES6 class', topics: ['class', 'syntax'] };
    expect(safeTitle(digit)).toBe('class');
    const nothing: Snippet = { ...SNIPPET, title: 'top 3 rows', topics: ['utility-class'] };
    expect(safeTitle(nothing)).toBe('that thing');
    expect(safeTitle(SNIPPET)).toBe(SNIPPET.title);
  });
});
