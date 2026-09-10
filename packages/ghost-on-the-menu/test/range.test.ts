// Expressive-range test (W15, Smith & Whitehead 2010): every fixture tape's
// round is plotted on density and threat. Tapes whose wire differs must
// produce different rounds; a generator that flattens every tape into the
// same round has a hole. Tapes that are the same bout under a different
// framing (ndjson vs content-length) are allowed to coincide.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadTape, type Tape } from '@mcp-arcade-cabinets/tape-core';

import { prepassRound } from '../src/prepass';
import type { Round } from '../src/types';

const DIR = path.resolve(__dirname, '../../../fixtures/tapes');

function fixtures(): { name: string; tape: Tape }[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.tape.json'))
    .map((f) => ({
      name: f.replace(/\.tape\.json$/, ''),
      tape: loadTape(JSON.parse(readFileSync(path.join(DIR, f), 'utf8'))),
    }));
}

/** What the wire looked like, ignoring framing and ids. */
function wireSignature(tape: Tape): string {
  return tape.rows.map((r) => `${r.atom}|${r.direction}|${r.method}|${r.note}`).join('\n');
}

/** What the round looks like: class, members and timing of every beat. */
function roundSignature(round: Round): string {
  return round.beats.map((b) => `${b.t.toFixed(2)}:${b.sprite}:${b.members}`).join(',');
}

describe('expressive range', () => {
  const all = fixtures().map((f) => ({ ...f, round: prepassRound(f.tape, { seconds: 150 }) }));

  it('has at least a dozen fixtures to plot', () => {
    expect(all.length).toBeGreaterThanOrEqual(12);
  });

  // HOLE, found 2026-09-10: calibration.docker-fixture.naive and
  // ollama-intern-mcp.naive-wrap differ on the wire (tool names, server)
  // yet produce identical rounds, because placement depends only on the
  // class sequence and the seed defaults to 0. Owner: Grok, prepass — derive
  // the seed from the tape and let it drive x and the path pick. `fails`
  // flips this red the day it is fixed, so the assertion then goes live.
  it.fails('gives tapes with different wire different rounds', () => {
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i]!;
        const b = all[j]!;
        if (wireSignature(a.tape) === wireSignature(b.tape)) continue;
        expect(roundSignature(a.round), `${a.name} vs ${b.name}`).not.toBe(roundSignature(b.round));
      }
    }
  });

  // HOLE, found 2026-09-10: density is 0.25 beats/s on every fixture at
  // every tier, because the round is always 4 s per beat and no fixture hits
  // the clamp, so the plot has two points (tier 0 and tier 2). W13 asks for
  // a density curve per tier. Owner: Grok, prepass — waves.json per tier.
  it.fails('spreads the fixtures across density and tier, not one point', () => {
    const points = new Set(
      all.map((f) => `${(f.round.beats.length / f.round.duration).toFixed(3)}@${f.round.tier}`),
    );
    expect(points.size).toBeGreaterThanOrEqual(3);
    const tiers = new Set(all.map((f) => f.round.tier));
    expect(tiers.has(0)).toBe(true);
    expect(tiers.has(2)).toBe(true);
  });

  it('keeps every round inside the clamp and every lie inside a wave', () => {
    for (const f of all) {
      expect(f.round.duration).toBeGreaterThanOrEqual(45);
      expect(f.round.duration).toBeLessThanOrEqual(120);
      for (const b of f.round.beats) {
        const wave = f.round.waveBounds.find((w) => w.atom === b.source.atom);
        expect(wave, `${f.name} ${b.id}`).toBeDefined();
        expect(b.t).toBeGreaterThanOrEqual(wave!.t0);
        expect(b.t).toBeLessThanOrEqual(wave!.t1);
      }
    }
  });
});
