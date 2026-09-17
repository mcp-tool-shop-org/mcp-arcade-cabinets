import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadTape, type Fact, type Tape } from '@mcp-arcade-cabinets/tape-core';

import { labelTape } from '../src/label';
import { DEFAULT_PATTERNS, type PatternSet } from '../src/patterns';

const DIR = path.resolve(__dirname, '../../../fixtures/tapes');

const FORBIDDEN =
  /\d|\b(lie|fact|revealed|followed|held|score|pass|fail|nrp|integrity|utility|cleared|ghost_answered|ghost_refused|menu_changed|menu_stable)\b/i;

function flipFact(fact: Fact): Fact {
  if (fact === 'followed') return 'held';
  if (fact === 'held') return 'followed';
  if (fact === 'ghost_answered') return 'ghost_refused';
  if (fact === 'ghost_refused') return 'ghost_answered';
  if (fact === 'menu_changed') return 'menu_stable';
  if (fact === 'menu_stable') return 'menu_changed';
  return fact;
}

function load(name: string): Tape {
  return loadTape(JSON.parse(readFileSync(path.join(DIR, `${name}.tape.json`), 'utf8')));
}

describe('labelTape', () => {
  it('names fixture, seat and live from the header, never a fact', () => {
    expect(labelTape(load('naive-ndjson')).label).toBe('fixture');
    expect(labelTape(load('livefire.intern.task-only-wrap-on')).label).toBe('live');
    const seated = load('livefire.intern.ollama-wrap-on');
    // A seated live stdio tape still derives live (stdio rule wins).
    expect(labelTape(seated).label).toBe('live');
    const docker = load('calibration.docker-fixture.ollama');
    expect(labelTape(docker).label).toBe('live');
  });

  it('writes a why with no digit and no fact word', () => {
    for (const f of readdirSync(DIR)) {
      if (!f.endsWith('.tape.json')) continue;
      const out = labelTape(load(f.replace(/\.tape\.json$/, '')));
      expect(out.label, f).toMatch(/^(fixture|seat|live)$/);
      expect(out.why, f).not.toMatch(FORBIDDEN);
      expect(out.why, f).toMatch(/waves/);
      expect(out.why, f).toMatch(/bosses/);
      expect(out.why, f).toMatch(/wire/);
    }
  });

  it('is identical after every fact on the tape is flipped', () => {
    const tape = load('naive-ndjson');
    const flipped: Tape = {
      ...tape,
      facts: tape.facts.map((f) => ({ ...f, fact: flipFact(f.fact) })),
    };
    expect(flipped.facts.map((f) => f.fact).sort()).not.toEqual(
      tape.facts.map((f) => f.fact).sort(),
    );
    expect(labelTape(tape)).toEqual(labelTape(flipped));
  });

  it('differs when the header or the wire shape differs', () => {
    const fixture = labelTape(load('naive-ndjson'));
    const live = labelTape(load('livefire.intern.task-only-wrap-on'));
    const framed = labelTape(load('naive-content-length'));
    expect(fixture.label).not.toBe(live.label);
    expect(fixture.why).not.toBe(live.why);
    expect(fixture.why).not.toBe(framed.why);
  });
});

// Stage C. The picker's word used to map BOTH the gentlest rung and the
// harshest to 'fixture', so a tier-three tape — one lamp, hazards on — was
// announced as the easiest thing on the menu.
describe('the picker names every rung', () => {
  const LADDER = DEFAULT_PATTERNS.ladder;

  it('gives all four rungs a word of their own', () => {
    const words = new Set<string>();
    for (const rung of LADDER.rungs) {
      const tape = { ...load('naive-ndjson') };
      const forced: PatternSet = {
        ...DEFAULT_PATTERNS,
        ladder: { ...LADDER, derive: [{ tier: rung.tier as 0 | 1 | 2, offLadder: true }] },
      };
      const out = labelTape(tape, forced);
      expect(out.label).toBeTruthy();
      expect(words.has(out.label), out.label).toBe(false);
      words.add(out.label);
      expect(out.why).not.toMatch(FORBIDDEN);
    }
    // Four rungs, four words. The harshest used to share the gentlest's.
    expect(words.size).toBe(LADDER.rungs.length);
    expect(words.size).toBe(4);
  });

  it('says so when the target is not on the ladder', () => {
    const tape = load('naive-ndjson');
    const off = labelTape({ ...tape, target_kind: 'websocket' });
    expect(off.why).toMatch(/not on the ladder/);
    expect(off.why).not.toMatch(FORBIDDEN);
    const on = labelTape(tape);
    expect(on.why).not.toMatch(/not on the ladder/);
    // And a tape that IS on the ladder says what the rung changes.
    expect(on.why).toContain(DEFAULT_PATTERNS.ladder.rungs[0]!.why);
  });
});
