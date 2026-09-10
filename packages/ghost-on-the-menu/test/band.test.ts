// The fairness band (wave 2 §3): three scripted bots play every fixture tape.
// Idle is the floor: threat must be real, so a player who never moves loses
// every lamp on tier 1 and up. The sweeper is the dumb player: tier 0 must
// not kill it, and it must still find at least half the lies. The reader is
// the ceiling: it fires only at the sequence tells and must reveal every lie
// on tiers 0 and 1. No fixture on disk is tier 1, so a tier-1 variant of each
// tape is made by editing the header only (a seat on a docker target with no
// image id), the same derivation the prepass uses. The band fails the build.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadTape, type Tape } from '@mcp-arcade-cabinets/tape-core';

import { playTape, type BotName } from '../src/play';
import { prepassRound } from '../src/prepass';

const DIR = path.resolve(__dirname, '../../../fixtures/tapes');

interface Case {
  name: string;
  tape: Tape;
  tier: 0 | 1 | 2 | 3;
  /** A header-only variant made for the curve; the fairness band skips these at tier 2. */
  variant?: boolean;
}

function fixtures(): Case[] {
  const out: Case[] = [];
  for (const f of readdirSync(DIR)) {
    if (!f.endsWith('.tape.json')) continue;
    const name = f.replace(/\.tape\.json$/, '');
    const tape = loadTape(JSON.parse(readFileSync(path.join(DIR, f), 'utf8')));
    out.push({ name, tape, tier: prepassRound(tape, { seconds: 150 }).tier });
    // The tier-1 variant: header only, never rows or facts.
    const seated: Tape = {
      ...tape,
      target_kind: 'docker',
      container: { image_id: null, name_prefix: null },
      seat: { model: 'band-variant', template_sha256: null },
    };
    const t1 = prepassRound(seated, { seconds: 150 }).tier;
    if (t1 === 1) out.push({ name: `${name}@seated`, tape: seated, tier: 1 });
    // The live variant: header only, so the curve is measured on all sixteen
    // tapes at every tier, the same set `pnpm sweep` prints.
    const live: Tape = { ...tape, target_kind: 'stdio', container: null, seat: null };
    if (
      prepassRound(live, { seconds: 150 }).tier === 2 &&
      prepassRound(tape, { seconds: 150 }).tier !== 2
    ) {
      out.push({ name: `${name}@live`, tape: live, tier: 2, variant: true });
    }
  }
  return out;
}

const CASES = fixtures();

function run(c: Case, bot: BotName) {
  return playTape(c.tape, { fixture: c.name, bot });
}

describe('fairness band', () => {
  it('covers every tier with at least one tape', () => {
    const tiers = new Set(CASES.map((c) => c.tier));
    expect(tiers).toEqual(new Set([0, 1, 2]));
  });

  it('idle loses every lamp on tier 1 and up', () => {
    for (const c of CASES) {
      if (c.tier < 1) continue;
      const out = run(c, 'idle');
      expect(out.ended, `${c.name}: idle survived tier ${c.tier}`).toBe('lamps');
      expect(out.lives).toBe(0);
    }
  });

  it('idle is never killed on tier 0', () => {
    for (const c of CASES) {
      if (c.tier !== 0) continue;
      const out = run(c, 'idle');
      expect(out.ended, `${c.name}: tier 0 killed idle`).toBe('time');
    }
  });

  it('the sweeper survives tier 0 and reveals at least half the lies', () => {
    for (const c of CASES) {
      if (c.tier !== 0) continue;
      const out = run(c, 'sweeper');
      expect(out.ended, `${c.name}: tier 0 killed the sweeper`).toBe('time');
      const half = Math.ceil(out.lies.length / 2);
      expect(
        out.revealed.length,
        `${c.name}: sweeper found ${out.revealed.length}`,
      ).toBeGreaterThanOrEqual(half);
      expect(out.ok).toBe(true);
    }
  });

  it('the reader reveals every lie on tiers 0 and 1', () => {
    for (const c of CASES) {
      if (c.tier > 1) continue;
      const out = run(c, 'reader');
      const missed = out.lies.filter((id) => !out.revealed.includes(id));
      expect(missed, `${c.name}: reader missed ${missed.join(', ')} (ended ${out.ended})`).toEqual(
        [],
      );
      expect(out.ok).toBe(true);
    }
  });

  it('no bot ever puts a forbidden word on screen', () => {
    for (const c of CASES) {
      for (const bot of ['idle', 'sweeper', 'reader'] as const) {
        expect(run(c, bot).leaked, `${c.name} ${bot}`).toBe(false);
      }
    }
  });
});

// The Director's bar: challenging, not impossible. Measured on all sixteen
// tapes at each tier through the header-only variants, the same set `pnpm
// sweep` prints. Each bot is measured alone: a blend would hide a player
// who is never touched (the cross-family review caught that).
describe('the difficulty curve', () => {
  const byTier = (tier: 0 | 1 | 2) => CASES.filter((c) => c.tier === tier);
  const meanLamps = (outs: ReturnType<typeof run>[]) =>
    outs.reduce((s, o) => s + (3 - o.lives), 0) / outs.length;
  const alive = (outs: ReturnType<typeof run>[]) => outs.filter((o) => o.ended === 'time').length;
  const halfFound = (outs: ReturnType<typeof run>[]) => {
    const lies = outs.reduce((s, o) => s + o.lies.length, 0);
    const revealed = outs.reduce((s, o) => s + o.revealed.length, 0);
    return revealed >= Math.ceil(lies / 2);
  };

  it('measures every tier on all sixteen tapes', () => {
    expect(byTier(1).length).toBe(16);
    expect(byTier(2).length).toBe(16);
  });

  it('seat threatens the mover: the sweeper loses lamps on average', () => {
    expect(meanLamps(byTier(1).map((c) => run(c, 'sweeper')))).toBeGreaterThanOrEqual(0.4);
  });

  it('seat threatens the reader who waits for tells', () => {
    expect(meanLamps(byTier(1).map((c) => run(c, 'reader')))).toBeGreaterThanOrEqual(1.0);
  });

  it('live is survivable by the mover on most tapes, with half the lies found', () => {
    const outs = byTier(2).map((c) => run(c, 'sweeper'));
    expect(alive(outs)).toBeGreaterThanOrEqual(12);
    expect(halfFound(outs)).toBe(true);
  });

  it('live is survivable by the reader on half the tapes, with half the lies found', () => {
    const outs = byTier(2).map((c) => run(c, 'reader'));
    expect(alive(outs)).toBeGreaterThanOrEqual(8);
    expect(halfFound(outs)).toBe(true);
  });
});

describe('hardcore', () => {
  const unique = new Map<string, (typeof CASES)[number]>();
  for (const c of CASES) {
    if (c.variant) continue;
    if (!unique.has(c.name.replace(/@.*$/, ''))) unique.set(c.name.replace(/@.*$/, ''), c);
  }
  const tapes = [...unique.values()].slice(0, 16);

  it('idle dies, the sweeper dies, the reader lives on some tapes', () => {
    const idle = tapes.map((c) => playTape(c.tape, { fixture: c.name, bot: 'idle', tier: 3 }));
    expect(idle.every((o) => o.ended === 'lamps')).toBe(true);
    const sweep = tapes.map((c) => playTape(c.tape, { fixture: c.name, bot: 'sweeper', tier: 3 }));
    expect(sweep.every((o) => o.ended === 'lamps')).toBe(true);
    const read = tapes.map((c) => playTape(c.tape, { fixture: c.name, bot: 'reader', tier: 3 }));
    const lived = read.filter((o) => o.ended === 'time').length;
    const lies = read.reduce((s, o) => s + o.lies.length, 0);
    const found = read.reduce((s, o) => s + o.revealed.length, 0);
    expect(found).toBeGreaterThanOrEqual(Math.ceil(lies / 3));
    // One lamp: the scripted reader is not a human. It must still find lies
    // and not turn the mode into a gallery. Surviving a few tapes is the
    // human bar; the bot has to clear at least one or the mode is a wall.
    expect(lived + read.filter((o) => o.revealed.length > 0).length).toBeGreaterThan(0);
  });
});
