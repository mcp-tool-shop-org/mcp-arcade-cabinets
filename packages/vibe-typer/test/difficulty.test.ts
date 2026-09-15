import { describe, expect, it } from 'vitest';

import { buildModel, DEFAULT_CORPUS } from '../src/corpus';
import { travel, travelCost, value, valueOf, valueParts } from '../src/difficulty';
import { DEFAULT_PATTERNS } from '../src/patterns';
import type { Band } from '../src/types';

const SET = DEFAULT_PATTERNS.difficulty;
const MODEL = DEFAULT_CORPUS.model;

describe('the value formula', () => {
  it('is monotone in length for otherwise identical text', () => {
    const one = valueOf('abc abc\n', MODEL, SET);
    const two = valueOf('abc abc\nabc abc\n', MODEL, SET);
    const three = valueOf('abc abc\nabc abc\nabc abc\n', MODEL, SET);
    expect(two).toBeGreaterThan(one);
    expect(three).toBeGreaterThan(two);
  });

  it('charges more for a shifted same-finger pair than for an alternating one', () => {
    expect(valueOf('))', MODEL, SET)).toBeGreaterThan(valueOf('ab', MODEL, SET));
    expect(travel('))', SET)).toBeGreaterThan(travel('ab', SET));
  });

  it('prices a key pair by hand, finger and row', () => {
    const same = travelCost('e', 'd', SET); // same finger, one row apart
    const hand = travelCost('a', 'f', SET); // same hand, different fingers
    const alt = travelCost('a', 'j', SET); // different hands
    expect(same).toBeGreaterThan(hand);
    expect(hand).toBeGreaterThan(alt);
    expect(travelCost(')', ')', SET)).toBe(SET.costs.repeat);
    expect(travelCost('a', ')', SET)).toBeGreaterThan(travelCost('a', '0', SET));
    expect(travelCost('a', '\n', SET)).toBe(SET.costs.newline);
    expect(travelCost('a', ' ', SET)).toBe(SET.costs.space);
  });

  it('gives the same snippet the same value across two model builds', () => {
    const other = buildModel(DEFAULT_CORPUS.snippets.map((s) => s.code));
    for (const snippet of DEFAULT_CORPUS.snippets.slice(0, 20)) {
      expect(value(snippet, other, SET)).toBe(value(snippet, MODEL, SET));
    }
  });

  it('is always positive and names its terms', () => {
    const parts = valueParts('print("hello")\n', MODEL, SET);
    expect(parts.total).toBeGreaterThan(0);
    expect(parts.surprisal).toBeGreaterThan(0);
    expect(parts.travel).toBeGreaterThan(0);
    expect(parts.bracket).toBeGreaterThan(0);
    expect(valueOf('', MODEL, SET)).toBeGreaterThan(0);
  });

  it('weighs a long identifier and a closing bracket', () => {
    const plain = valueParts('aaaa aaaa aaaa', MODEL, SET);
    const named = valueParts('aaaaaaaaaaaa a', MODEL, SET);
    expect(named.identifier).toBeGreaterThan(plain.identifier);
    expect(valueParts('()', MODEL, SET).bracket).toBeGreaterThan(
      valueParts('((', MODEL, SET).bracket,
    );
  });

  it('climbs with the band: mean value by band never falls', () => {
    const means: number[] = [];
    for (let band = 1 as Band; band <= 7; band++) {
      const list = DEFAULT_CORPUS.snippets.filter((s) => s.band === band);
      const sum = list.reduce((n, s) => n + value(s, MODEL, SET), 0);
      means.push(sum / list.length);
    }
    for (let i = 1; i < means.length; i++) {
      expect(means[i], `band ${i + 1} against band ${i}`).toBeGreaterThan(means[i - 1]!);
    }
  });
});
