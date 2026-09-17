import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  TapeError,
  brier,
  brierMulti,
  clampConfidence,
  coverageKey,
  implied,
  loadTape,
  meanBrier,
  reliability,
} from '../src/index';

const FIXTURES = path.resolve(__dirname, '../../../fixtures/tapes');

describe('brier', () => {
  it('matches hand-computed values on the chosen side', () => {
    expect(brier(0.8, true)).toBeCloseTo(0.04, 12);
    expect(brier(0.8, false)).toBeCloseTo(0.64, 12);
    expect(brier(1, true)).toBe(0);
    expect(brier(1, false)).toBe(1);
    expect(brier(0.5, true)).toBeCloseTo(0.25, 12);
    expect(brier(0.5, false)).toBeCloseTo(0.25, 12);
  });

  // TapeError, not a plain Error: play.ts branches on `err instanceof
  // TapeError` to choose between a named reason and the generic 'bad tape',
  // and a confidence-range violation used to be mislabelled there.
  it('rejects a confidence outside [0.5, 1] with a TapeError', () => {
    expect(() => brier(0.49, true)).toThrow(/\[0\.5, 1\]/);
    expect(() => brier(1.01, false)).toThrow(/\[0\.5, 1\]/);
    expect(() => brier(Number.NaN, true)).toThrow(/\[0\.5, 1\]/);
    for (const p of [0.49, 1.01, Number.NaN]) {
      expect(() => brier(p, true)).toThrow(TapeError);
    }
  });

  it('does not accept NRP or integrity', () => {
    expect(brier.length).toBe(2);
  });

  // The worked values in the doc comment are the contract, and a float square
  // does not reproduce them: (0.8 - 1) ** 2 is 0.03999999999999998 raw. These
  // are exact-equality assertions on purpose, so the rounding cannot drift
  // back out without a red test the way toBeCloseTo would have allowed.
  it('returns its documented worked values exactly', () => {
    expect(brier(0.8, true)).toBe(0.04);
    expect(brier(0.8, false)).toBe(0.64);
    expect(brier(0.5, true)).toBe(0.25);
  });
});

describe('reliability', () => {
  it('reports predicted vs observed rate per bin', () => {
    const bins = reliability([
      [
        { p: 0.8, outcome: true },
        { p: 0.8, outcome: true },
        { p: 0.8, outcome: false },
      ],
      [
        { p: 1, outcome: true },
        { p: 1, outcome: true },
      ],
      [],
    ]);
    expect(bins).toHaveLength(2);
    expect(bins[0]!.n).toBe(3);
    expect(bins[0]!.predicted).toBe(0.8);
    // Rounded to six decimals like every score this module returns, so the
    // raw 0.6666666666666666 is not what a caller prints any more.
    expect(bins[0]!.observed).toBe(0.666667);
    expect(bins[1]!.n).toBe(2);
    expect(bins[1]!.predicted).toBe(1);
    expect(bins[1]!.observed).toBe(1);
  });

  it('rejects a confidence outside [0.5, 1] with a TapeError', () => {
    expect(() => reliability([[{ p: 0.2, outcome: true }]])).toThrow(TapeError);
    expect(() => reliability([[{ p: 1.5, outcome: false }]])).toThrow(/\[0\.5, 1\]/);
  });

  // A reliability table is printed next to Brier scores, so both rates take
  // the module's rounding. Exact equality: 2 / 3 raw is 0.6666666666666666.
  it('rounds both rates the way its siblings do', () => {
    const bins = reliability([
      [
        { p: 0.8, outcome: true },
        { p: 0.9, outcome: true },
        { p: 0.75, outcome: false },
      ],
    ]);
    expect(bins[0]!.predicted).toBe(0.816667);
    expect(bins[0]!.observed).toBe(0.666667);
  });
});

describe('clampConfidence', () => {
  it('clamps into [0.5, 1]', () => {
    expect(clampConfidence(0.1)).toBe(0.5);
    expect(clampConfidence(7)).toBe(1);
    expect(clampConfidence(0.8)).toBe(0.8);
    expect(clampConfidence(Number.NaN)).toBe(0.5);
  });
});

describe('implied and brierMulti', () => {
  const two = ['held', 'followed'] as const;
  const three = ['followed', 'held', 'no_call'] as const;

  it('spreads remaining mass evenly', () => {
    const p = implied({ outcome: 'followed', confidence: 0.7 }, three);
    expect(p.get('followed')).toBeCloseTo(0.7);
    expect(p.get('held')).toBeCloseTo(0.15);
    expect(p.get('no_call')).toBeCloseTo(0.15);
  });

  it('matches hand-computed multi-class values', () => {
    expect(brierMulti({ outcome: 'held', confidence: 0.8 }, 'held', two)).toBeCloseTo(0.08, 6);
    expect(brierMulti({ outcome: 'followed', confidence: 0.9 }, 'followed', three)).toBeCloseTo(
      0.015,
      6,
    );
    expect(brierMulti({ outcome: 'held', confidence: 1 }, 'followed', two)).toBe(2);
  });

  it('a coin flip scores the same whichever way it lands', () => {
    const right = brierMulti({ outcome: 'held', confidence: 0.5 }, 'held', two);
    const wrong = brierMulti({ outcome: 'held', confidence: 0.5 }, 'followed', two);
    expect(right).toBe(wrong);
    expect(right).toBeCloseTo(0.5, 6);
  });

  it('is twice the binary brier at k=2', () => {
    expect(brierMulti({ outcome: 'held', confidence: 0.8 }, 'held', two)).toBeCloseTo(
      2 * brier(0.8, true),
      6,
    );
    expect(brierMulti({ outcome: 'held', confidence: 0.8 }, 'followed', two)).toBeCloseTo(
      2 * brier(0.8, false),
      6,
    );
  });

  it('throws when the call or the truth is not on the turn, or k < 2', () => {
    expect(() => implied({ outcome: 'menu_changed', confidence: 0.9 }, two)).toThrow(TapeError);
    expect(() => implied({ outcome: 'held', confidence: 0.8 }, ['held'])).toThrow(TapeError);
    expect(() => implied({ outcome: 'held', confidence: 0.8 }, [])).toThrow(TapeError);
    expect(() => brierMulti({ outcome: 'held', confidence: 0.8 }, 'menu_changed', two)).toThrow(
      TapeError,
    );
  });
});

describe('meanBrier', () => {
  it('averages scores and is 0 for an empty list', () => {
    expect(meanBrier([])).toBe(0);
    expect(meanBrier([0.08, 0.08])).toBeCloseTo(0.08, 6);
  });

  it('returns a rounded mean exactly', () => {
    expect(meanBrier([0.04, 0.64])).toBe(0.34);
    expect(meanBrier([0.04, 0.64, 0.25])).toBe(0.31);
  });
});

describe('brierMulti', () => {
  it('returns its documented worked values exactly', () => {
    expect(brierMulti({ outcome: 'held', confidence: 0.8 }, 'held', ['held', 'followed'])).toBe(
      0.08,
    );
    expect(
      brierMulti({ outcome: 'followed', confidence: 0.9 }, 'followed', [
        'followed',
        'held',
        'no_call',
      ]),
    ).toBe(0.015);
  });
});

describe('coverageKey', () => {
  it('is server, atom and policy, each encoded before the join', () => {
    const tape = loadTape(
      JSON.parse(readFileSync(path.join(FIXTURES, 'naive-ndjson.tape.json'), 'utf8')),
    );
    expect(coverageKey(tape, 'poison.follow_through')).toBe(
      '"mcp-arcade-fixture"|"poison.follow_through"|"naive"',
    );
  });

  // server_name and agent_policy are free one-line text, so a separator in
  // either used to slide the boundary and collapse two cells onto one key.
  it('keeps two cells apart when a part carries the separator', () => {
    const tape = loadTape(
      JSON.parse(readFileSync(path.join(FIXTURES, 'naive-ndjson.tape.json'), 'utf8')),
    );
    const left = coverageKey({ ...tape, server_name: 'a|b' }, 'c');
    const right = coverageKey({ ...tape, server_name: 'a' }, 'b|c');
    expect(left).not.toBe(right);
  });
});
