import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { brier, coverageKey, loadTape, reliability } from '../src/index';

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

  it('rejects a confidence outside [0.5, 1]', () => {
    expect(() => brier(0.49, true)).toThrow(/\[0\.5, 1\]/);
    expect(() => brier(1.01, false)).toThrow(/\[0\.5, 1\]/);
    expect(() => brier(Number.NaN, true)).toThrow(/\[0\.5, 1\]/);
  });

  it('does not accept NRP or integrity', () => {
    expect(brier.length).toBe(2);
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
    expect(bins[0]!.predicted).toBeCloseTo(0.8, 12);
    expect(bins[0]!.observed).toBeCloseTo(2 / 3, 12);
    expect(bins[1]!.n).toBe(2);
    expect(bins[1]!.predicted).toBe(1);
    expect(bins[1]!.observed).toBe(1);
  });
});

describe('coverageKey', () => {
  it('is server|atom|policy', () => {
    const tape = loadTape(
      JSON.parse(readFileSync(path.join(FIXTURES, 'naive-ndjson.tape.json'), 'utf8')),
    );
    expect(coverageKey(tape, 'poison.follow_through')).toBe(
      'mcp-arcade-fixture|poison.follow_through|naive',
    );
  });
});
