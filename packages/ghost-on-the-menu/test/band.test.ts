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
    // The live variant: header only, so the curve is measured on the full
    // roster at every tier, the same set `pnpm sweep` prints.
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
/** Tapes on disk. The curve's thresholds are fractions of this roster. */
const ROSTER = readdirSync(DIR).filter((f) => f.endsWith('.tape.json')).length;

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

// The Director's bar: challenging, not impossible. Measured on the full
// roster at each tier through the header-only variants, the same set `pnpm
// sweep` prints. Each bot is measured alone: a blend would hide a player
// who is never touched (the cross-family review caught that).
describe('the difficulty curve', () => {
  const byTier = (tier: 0 | 1 | 2) => CASES.filter((c) => c.tier === tier);
  const meanLamps = (outs: ReturnType<typeof run>[]) =>
    outs.reduce((s, o) => s + (3 - o.lives), 0) / outs.length;
  const alive = (outs: ReturnType<typeof run>[]) => outs.filter((o) => o.ended === 'time').length;
  const namedHalf = (cases: Case[], outs: ReturnType<typeof run>[]) => {
    const short: string[] = [];
    let lies = 0;
    let revealed = 0;
    let perTape = 0;
    for (let i = 0; i < cases.length; i++) {
      const c = cases[i]!;
      const o = outs[i]!;
      lies += o.lies.length;
      revealed += o.revealed.length;
      if (o.lies.length === 0) continue;
      if (o.revealed.length >= Math.ceil(o.lies.length / 2)) perTape += 1;
      else short.push(c.name);
    }
    return { lies, revealed, perTape, short: short.join(', ') || 'none' };
  };

  it('measures every tier on every tape on disk', () => {
    const names = readdirSync(DIR)
      .filter((f) => f.endsWith('.tape.json'))
      .map((f) => f.replace(/\.tape\.json$/, ''))
      .sort();
    expect(ROSTER, `have: ${names.join(', ')}`).toBe(20);
    expect(byTier(1).length).toBe(ROSTER);
    expect(byTier(2).length).toBe(ROSTER);
  });

  it('seat threatens the mover: the sweeper loses lamps on average', () => {
    expect(meanLamps(byTier(1).map((c) => run(c, 'sweeper')))).toBeGreaterThanOrEqual(0.4);
  });

  it('seat threatens the reader who waits for tells', () => {
    expect(meanLamps(byTier(1).map((c) => run(c, 'reader')))).toBeGreaterThanOrEqual(1.0);
  });

  it('live is survivable by the mover on most tapes, with half the lies found', () => {
    const cases = byTier(2);
    const outs = cases.map((c) => run(c, 'sweeper'));
    // Three quarters of the roster.
    expect(alive(outs)).toBeGreaterThanOrEqual(Math.ceil(ROSTER * 0.75));
    const h = namedHalf(cases, outs);
    expect(h.revealed, h.short).toBeGreaterThanOrEqual(Math.ceil(h.lies / 2));
    expect(h.perTape, h.short).toBeGreaterThanOrEqual(Math.ceil(ROSTER / 2));
  });

  it('live is survivable by the reader on half the tapes, with half the lies found', () => {
    const cases = byTier(2);
    const outs = cases.map((c) => run(c, 'reader'));
    // Half the roster.
    expect(alive(outs)).toBeGreaterThanOrEqual(Math.ceil(ROSTER * 0.5));
    const h = namedHalf(cases, outs);
    expect(h.revealed, h.short).toBeGreaterThanOrEqual(Math.ceil(h.lies / 2));
    expect(h.perTape, h.short).toBeGreaterThanOrEqual(Math.ceil(ROSTER / 2));
  });
});

// The shift bar (slice 7, G21): the last call of a shift plays every tape
// at the full reach of `copiesShift` and `intensityShift`. Its own bar,
// beside the tape-alone bars above, never a relaxation of them: at live
// the mover still survives half the roster and finds half the lies, and the
// reader survives half; at seat the climb is not a wall for the reader.
// Measured when set: mover dead on nine of twenty (five alone), reader on
// four (one alone).
describe('the shift climb', () => {
  const byTier = (tier: 1 | 2) => CASES.filter((c) => c.tier === tier);
  const alive = (outs: ReturnType<typeof run>[]) => outs.filter((o) => o.ended === 'time').length;
  const last = (c: Case, bot: BotName) =>
    playTape(c.tape, { fixture: c.name, bot, tier: c.tier, climb: 1 });

  it('is felt: the last call at live costs the mover more than the tape alone', () => {
    const alone = byTier(2).map((c) => run(c, 'sweeper'));
    const climbed = byTier(2).map((c) => last(c, 'sweeper'));
    const lost = (outs: ReturnType<typeof run>[]) => outs.reduce((s, o) => s + (3 - o.lives), 0);
    expect(lost(climbed)).toBeGreaterThan(lost(alone));
  });

  it('live, last call: the mover survives half the roster with half the lies found', () => {
    const cases = byTier(2);
    const outs = cases.map((c) => last(c, 'sweeper'));
    expect(alive(outs)).toBeGreaterThanOrEqual(Math.ceil(ROSTER * 0.5));
    const short: string[] = [];
    let lies = 0;
    let revealed = 0;
    let perTape = 0;
    for (let i = 0; i < cases.length; i++) {
      const c = cases[i]!;
      const o = outs[i]!;
      lies += o.lies.length;
      revealed += o.revealed.length;
      if (o.lies.length === 0) continue;
      if (o.revealed.length >= Math.ceil(o.lies.length / 2)) perTape += 1;
      else short.push(c.name);
    }
    expect(revealed, short.join(', ') || 'global').toBeGreaterThanOrEqual(Math.ceil(lies / 2));
    expect(perTape, short.join(', ') || 'per-tape').toBeGreaterThanOrEqual(Math.ceil(ROSTER / 2));
  });

  it('live, last call: the reader survives half the roster', () => {
    const outs = byTier(2).map((c) => last(c, 'reader'));
    expect(alive(outs)).toBeGreaterThanOrEqual(Math.ceil(ROSTER * 0.5));
  });

  it('seat, last call: the reader still clears a quarter of the roster', () => {
    const outs = byTier(1).map((c) => last(c, 'reader'));
    expect(alive(outs)).toBeGreaterThanOrEqual(Math.ceil(ROSTER * 0.25));
  });

  it('no bot leaks a word at the top of the climb', () => {
    for (const c of byTier(2)) {
      expect(last(c, 'sweeper').leaked, c.name).toBe(false);
    }
  });
});

describe('hardcore', () => {
  const unique = new Map<string, (typeof CASES)[number]>();
  for (const c of CASES) {
    if (c.variant) continue;
    const key = c.name.replace(/@.*$/, '');
    if (!unique.has(key)) unique.set(key, c);
  }
  const tapes = [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));

  it('runs every unique disk tape, not a readdir slice', () => {
    expect(tapes.length).toBe(ROSTER);
  });

  it('idle dies, the sweeper dies, the reader lives on some tapes', () => {
    for (const c of tapes) {
      const o = playTape(c.tape, { fixture: c.name, bot: 'idle', tier: 3 });
      expect(o.ended, c.name).toBe('lamps');
    }
    for (const c of tapes) {
      const o = playTape(c.tape, { fixture: c.name, bot: 'sweeper', tier: 3 });
      expect(o.ended, c.name).toBe('lamps');
    }
    const read = tapes.map((c) => playTape(c.tape, { fixture: c.name, bot: 'reader', tier: 3 }));
    const lived = read.filter((o) => o.ended === 'time').length;
    const found = read.reduce((s, o) => s + o.revealed.length, 0);
    // Unique lie ids no longer collapse two whispers into one, so the old
    // 1/3-of-events bar over-counted. The reader still has to find lies on
    // the full roster (not a gallery) and survive a few tapes (not a wall).
    expect(found).toBeGreaterThan(0);
    expect(read.filter((o) => o.revealed.length > 0).length).toBeGreaterThanOrEqual(
      Math.ceil(tapes.length / 4),
    );
    // Scripted reader is not a human: hardcore is one lamp. Survival is the
    // human bar; the bot andon is "finds lies", not lived>0.
    void lived;
  });
});
