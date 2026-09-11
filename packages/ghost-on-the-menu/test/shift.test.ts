// The shift (slice 7): the draw is seeded and fresh, the code round-trips
// and refuses what it should, the climb is data, and nothing on a card or
// in a code carries a digit or a forbidden word.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadTape } from '@mcp-arcade-cabinets/tape-core';

import { copiesAt, DEFAULT_PATTERNS, intensityAt } from '../src/patterns';
import { createRoundState, prepassRound, stepRound } from '../src/index';
import {
  climbAt,
  decodeShift,
  drawShift,
  encodeShift,
  lengthWord,
  ordinalWord,
  rosterFits,
  shiftCard,
} from '../src/shift';
import type { RoundState } from '../src/types';

const DIR = path.resolve(__dirname, '../../../fixtures/tapes');
const ROSTER = readdirSync(DIR)
  .filter((f) => f.endsWith('.tape.json'))
  .map((f) => f.replace(/\.tape\.json$/, ''))
  .sort((a, b) => a.localeCompare(b));

const FORBIDDEN =
  /\d|\b(nrp|integrity|utility|attack_success|pass|fail|score|cleared|lie|lies|fact|revealed|followed|held)\b/i;

describe('the draw', () => {
  it('draws the shift length without replacement, the same for the same seed', () => {
    const a = drawShift(ROSTER, 12345, 1);
    const b = drawShift(ROSTER, 12345, 1);
    expect(a.names).toHaveLength(DEFAULT_PATTERNS.shift.length);
    expect(new Set(a.names).size).toBe(a.names.length);
    expect(a).toEqual(b);
    expect(a.names.every((n) => ROSTER.includes(n))).toBe(true);
  });

  it('differs across seeds', () => {
    const seen = new Set<string>();
    for (let s = 0; s < 40; s++) seen.add(drawShift(ROSTER, s, 1).names.join('|'));
    expect(seen.size).toBeGreaterThan(30);
  });

  it('prefers a draw that shares little with the recent shifts', () => {
    let overlapPlain = 0;
    let overlapFresh = 0;
    for (let s = 0; s < 60; s++) {
      const last = drawShift(ROSTER, s * 7 + 1, 1).names;
      const plain = drawShift(ROSTER, s, 1).names;
      const fresh = drawShift(ROSTER, s, 1, [last]).names;
      overlapPlain += plain.filter((n) => last.includes(n)).length;
      overlapFresh += fresh.filter((n) => last.includes(n)).length;
    }
    expect(overlapFresh).toBeLessThan(overlapPlain);
  });
});

describe('the code', () => {
  it('fits the roster on disk in four words', () => {
    expect(rosterFits(ROSTER)).toBe(true);
  });

  it('round-trips every difficulty and many draws', () => {
    for (let s = 0; s < 50; s++) {
      const difficulty = (s % 4) as 0 | 1 | 2 | 3;
      const draw = drawShift(ROSTER, s * 31 + 7, difficulty);
      const code = encodeShift(ROSTER, draw);
      const words = code.split(' ');
      expect(words).toHaveLength(4);
      expect(code).not.toMatch(FORBIDDEN);
      expect(DEFAULT_PATTERNS.shift.words.even).toContain(words[0]);
      expect(DEFAULT_PATTERNS.shift.words.odd).toContain(words[1]);
      const back = decodeShift(ROSTER, code);
      expect(back).toEqual({ ok: true, draw });
    }
  });

  it('reads a code back through spaces, commas, dashes and case', () => {
    const draw = drawShift(ROSTER, 99, 2);
    const code = encodeShift(ROSTER, draw);
    const words = code.split(' ');
    expect(decodeShift(ROSTER, words.join(', ').toUpperCase())).toEqual({ ok: true, draw });
    expect(decodeShift(ROSTER, `  ${words.join('-')} `)).toEqual({ ok: true, draw });
  });

  it('refuses the wrong number of words, a word off the lists, and a transposition', () => {
    const draw = drawShift(ROSTER, 5, 0);
    const words = encodeShift(ROSTER, draw).split(' ');
    expect(decodeShift(ROSTER, words.slice(0, 3).join(' '))).toEqual({
      ok: false,
      why: 'not a code',
    });
    expect(decodeShift(ROSTER, [...words, 'oak'].join(' '))).toEqual({
      ok: false,
      why: 'not a code',
    });
    expect(decodeShift(ROSTER, `${words[0]} seven ${words[2]} ${words[3]}`)).toEqual({
      ok: false,
      why: 'not a code',
    });
    // Swapping two words puts a one-syllable word in a two-syllable slot.
    expect(decodeShift(ROSTER, `${words[1]} ${words[0]} ${words[2]} ${words[3]}`).ok).toBe(false);
  });

  it('says a code from another menu is from another menu', () => {
    const draw = drawShift(ROSTER, 8, 1);
    const code = encodeShift(ROSTER, draw);
    const other = [...ROSTER, 'a-tape-that-is-not-here'];
    expect(decodeShift(other, code)).toEqual({ ok: false, why: 'another menu' });
  });

  it('spells nothing with a digit or a forbidden word', () => {
    for (const w of [...DEFAULT_PATTERNS.shift.words.even, ...DEFAULT_PATTERNS.shift.words.odd]) {
      expect(w).not.toMatch(FORBIDDEN);
      expect(w).toMatch(/^[a-z]{3,7}$/);
    }
  });
});

describe('the climb', () => {
  it('is data: the first call is the tape alone, the last is the full reach', () => {
    expect(climbAt(0)).toBe(0);
    expect(climbAt(DEFAULT_PATTERNS.shift.length - 1)).toBe(1);
    for (let i = 1; i < DEFAULT_PATTERNS.shift.length; i++) {
      expect(climbAt(i)).toBeGreaterThanOrEqual(climbAt(i - 1));
    }
  });

  it('lifts both ends of the wave schedule and never below the tape alone', () => {
    const spec = DEFAULT_PATTERNS.parallelism.tiers['2'];
    const waves = 6;
    for (let w = 0; w < waves; w++) {
      expect(copiesAt(spec, w, waves, 1)).toBeGreaterThanOrEqual(copiesAt(spec, w, waves, 0));
      expect(intensityAt(spec, w, waves, 1)).toBeGreaterThanOrEqual(intensityAt(spec, w, waves, 0));
    }
    // The last call starts where the first one ended.
    expect(copiesAt(spec, 0, waves, 1)).toBe(copiesAt(spec, waves - 1, waves, 0));
    expect(intensityAt(spec, 0, waves, 1)).toBeCloseTo(intensityAt(spec, waves - 1, waves, 0));
    expect(copiesAt(spec, waves - 1, waves, 1)).toBe(spec.copiesShift);
    expect(intensityAt(spec, waves - 1, waves, 1)).toBeCloseTo(spec.intensityShift);
  });

  it('is on the round and never reads a fact', () => {
    const file = path.resolve(DIR, 'naive-ndjson.tape.json');
    const raw = JSON.parse(readFileSync(file, 'utf8')) as {
      facts: { atom_id: string; fact: string }[];
    };
    const a = prepassRound(loadTape(raw), { seconds: 150, seed: 0, tier: 2, climb: 1 });
    expect(a.climb).toBe(1);
    const flipped = JSON.parse(JSON.stringify(raw)) as typeof raw;
    const rug = flipped.facts.find((f) => f.atom_id === 'temporal.rug_pull');
    if (rug) rug.fact = rug.fact === 'menu_changed' ? 'menu_stable' : 'menu_changed';
    const b = prepassRound(loadTape(flipped), { seconds: 150, seed: 0, tier: 2, climb: 1 });
    const sa = createRoundState(a);
    const sb = createRoundState(b);
    const snap = (s: RoundState) =>
      `${s.enemies.filter((e) => e.alive).length}:${s.enemyShots.length}:${s.parallelism ? 'burst' : 'quiet'}`;
    const seenA: string[] = [];
    const seenB: string[] = [];
    for (let i = 0; i < 1500; i++) {
      stepRound(sa, { left: false, right: false, fire: false }, 1 / 30);
      stepRound(sb, { left: false, right: false, fire: false }, 1 / 30);
      seenA.push(snap(sa));
      seenB.push(snap(sb));
      if (sa.scene || sb.scene) break;
    }
    expect(seenA).toEqual(seenB);
    expect(seenA.some((s) => s.endsWith('burst'))).toBe(true);
  });
});

describe('the card', () => {
  it('names the server, the policy and the task tools in words only', () => {
    for (const f of readdirSync(DIR)) {
      if (!f.endsWith('.tape.json')) continue;
      const tape = loadTape(JSON.parse(readFileSync(path.join(DIR, f), 'utf8')));
      const lines = shiftCard(tape);
      expect(lines.length).toBeGreaterThanOrEqual(2);
      expect(lines[0]).toMatch(/^server /);
      expect(lines[1]).toMatch(/^policy /);
      for (const l of lines) expect(l).not.toMatch(FORBIDDEN);
    }
  });

  it('speaks the place in the shift in words', () => {
    expect(ordinalWord(0, 4)).toBe('first');
    expect(ordinalWord(2, 4)).toBe('third');
    expect(ordinalWord(3, 4)).toBe('last');
    expect(lengthWord(4)).toBe('four');
  });
});
