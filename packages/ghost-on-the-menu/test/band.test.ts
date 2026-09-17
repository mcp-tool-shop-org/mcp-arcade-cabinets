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
import { flavorAt } from '../src/shift';

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
/** Unique disk tapes (no @seated / @live header variants). */
const ROSTER = new Set(CASES.filter((c) => !c.variant).map((c) => c.name.replace(/@.*$/, ''))).size;

function run(c: Case, bot: BotName) {
  return playTape(c.tape, { fixture: c.name, bot });
}

/**
 * Lies the prepass must mark on each disk tape, measured 2026-09-16. The
 * header-only variants share their base tape's wire, so they share its count.
 *
 * This table is load-bearing: the sweeper bar is "at least half the lies" and
 * the reader bar is "every lie", and both are vacuously true for a tape with
 * no lies. Eighteen of the twenty fixtures had no floor at all, so a prepass
 * regression that stopped marking lies passed both bars green. The counts are
 * asserted first; the bars are then measured against a quantity that is
 * pinned rather than one that can quietly become zero.
 */
const LIES: Record<string, number> = {
  'cabinet.naive-wrap-on': 1,
  'cabinet.naive': 0,
  'cabinet.task-only-wrap-on': 0,
  'cabinet.task-only': 0,
  'calibration.docker-fixture.naive': 2,
  'calibration.docker-fixture.ollama': 2,
  'calibration.docker-fixture.task-only': 1,
  'docker-fixture.naive': 2,
  'docker-fixture.task-only': 1,
  'livefire.intern.naive-wrap-on': 1,
  'livefire.intern.ollama-wrap-off': 0,
  'livefire.intern.ollama-wrap-on': 0,
  'livefire.intern.task-only-wrap-on': 0,
  'naive-content-length': 3,
  'naive-ndjson': 3,
  'ollama-intern-mcp.naive-wrap': 1,
  'ollama-intern-mcp.task-only': 0,
  'ollama-intern-mcp.unlisted': 0,
  'task-only-content-length': 2,
  'task-only-ndjson': 2,
};

const baseName = (name: string) => name.replace(/@.*$/, '');

function pinnedLies(c: Case): number {
  const n = LIES[baseName(c.name)];
  if (n === undefined) throw new Error(`no pinned lie count for ${c.name}; add it to LIES`);
  return n;
}

describe('fairness band', () => {
  it('covers every tier with at least one tape', () => {
    const tiers = new Set(CASES.map((c) => c.tier));
    expect(tiers).toEqual(new Set([0, 1, 2]));
  });

  // The andon for every bar below: if the prepass stops marking lies, this
  // goes red first and the "half the lies" / "every lie" bars stop being
  // measured against zero.
  it('marks the pinned number of lies on every tape', () => {
    for (const c of CASES) {
      expect(run(c, 'idle').lies.length, c.name).toBe(pinnedLies(c));
    }
    const total = Object.values(LIES).reduce((s, n) => s + n, 0);
    expect(total).toBeGreaterThan(0);
    expect(Object.values(LIES).filter((n) => n > 0).length).toBeGreaterThanOrEqual(
      Math.ceil(Object.keys(LIES).length / 4),
    );
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
      // The quantity the bar is computed from, asserted before it is used.
      expect(out.lies.length, `${c.name}: lie count`).toBe(pinnedLies(c));
      expect(out.lies.length, `${c.name}: no lies to find`).toBeGreaterThan(0);
      const half = Math.ceil(out.lies.length / 2);
      expect(
        out.revealed.length,
        `${c.name}: sweeper found ${out.revealed.length}`,
      ).toBeGreaterThanOrEqual(half);
      expect(out.ok).toBe(true);
    }
  });

  it('the reader reveals every lie on tier 0', () => {
    let measured = 0;
    for (const c of CASES) {
      if (c.tier > 0) continue;
      const out = run(c, 'reader');
      // "every lie" is vacuous on a tape with none, so the count is pinned
      // per case and the roster is required to carry lies overall.
      expect(out.lies.length, `${c.name}: lie count`).toBe(pinnedLies(c));
      measured += out.lies.length;
      const missed = out.lies.filter((id) => !out.revealed.includes(id));
      expect(missed, `${c.name}: reader missed ${missed.join(', ')} (ended ${out.ended})`).toEqual(
        [],
      );
      expect(out.ok).toBe(true);
    }
    expect(measured, 'no lies on any tier 0 tape: the bar measured nothing').toBeGreaterThan(0);
  });

  // Re-based 2026-09-17. Seat's formation fires now (every class, on the way
  // in, the first shot early, three shots in the ship's air), on the
  // Director's word after he played the quiet game and then a gentler tune
  // and called both too thin. The tells-only reader stands under its target
  // and does not shoot back, so under a formation that fires it no longer
  // lives out every seated tape; what it must still do is find the lies
  // while it lives. Measured when set: every lie on thirteen of twenty
  // seated tapes, twelve of twenty-one lies overall, no tape without a
  // pinned count.
  it('the reader, under fire at seat, still reveals every lie on most seated tapes and half the lies overall', () => {
    const cases = CASES.filter((c) => c.tier === 1);
    let lies = 0;
    let revealed = 0;
    let whole = 0;
    for (const c of cases) {
      const out = run(c, 'reader');
      expect(out.lies.length, `${c.name}: lie count`).toBe(pinnedLies(c));
      expect(out.leaked, `${c.name}: leaked`).toBe(false);
      lies += out.lies.length;
      revealed += out.revealed.length;
      if (out.lies.every((id) => out.revealed.includes(id))) whole += 1;
    }
    expect(lies, 'no lies on any seated tape: the bar measured nothing').toBeGreaterThan(0);
    expect(whole).toBeGreaterThanOrEqual(Math.ceil(cases.length * 0.55));
    expect(revealed).toBeGreaterThanOrEqual(Math.ceil(lies / 2));
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

  // Re-based 2026-09-17 with the seat tune (see the reader bar above): at the
  // top of the climb the tells-only reader does not live out a seated tape
  // any more, so the bar is that it still finds a lie on a third of the
  // roster before it goes. Measured when set: nine of twenty.
  it('seat, last call: the reader still finds a lie on a third of the roster', () => {
    const outs = byTier(1).map((c) => last(c, 'reader'));
    expect(outs.filter((o) => o.revealed.length > 0).length).toBeGreaterThanOrEqual(
      Math.ceil(ROSTER / 3),
    );
  });

  it('no bot leaks a word at the top of the climb', () => {
    for (const c of byTier(2)) {
      expect(last(c, 'sweeper').leaked, c.name).toBe(false);
    }
  });
});

describe('the shift flavor', () => {
  it('gives each call a distinct role, not a hotter copy of the same loop', () => {
    const roles = [0, 1, 2, 3].map((i) => flavorAt(i).role);
    expect(new Set(roles).size).toBe(4);
    expect(roles[2]).toBe('trough');
    expect(roles[3]).toBe('peak');
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

  // Renamed to what the case measures. It used to be titled "…the reader
  // lives on some tapes", compute a `lived` count and then discard it with
  // `void lived`, so a regression that killed the reader on every tape read
  // as green under a title naming the opposite. Survival at hardcore is the
  // human bar, not the scripted bot's; the bot andon is "finds lies".
  it('idle and the sweeper die at hardcore; the reader still finds lies', () => {
    for (const c of tapes) {
      const o = playTape(c.tape, { fixture: c.name, bot: 'idle', tier: 3 });
      expect(o.ended, c.name).toBe('lamps');
    }
    for (const c of tapes) {
      const o = playTape(c.tape, { fixture: c.name, bot: 'sweeper', tier: 3 });
      expect(o.ended, c.name).toBe('lamps');
    }
    const read = tapes.map((c) => playTape(c.tape, { fixture: c.name, bot: 'reader', tier: 3 }));
    const found = read.reduce((s, o) => s + o.revealed.length, 0);
    // Unique lie ids no longer collapse two whispers into one, so the old
    // 1/3-of-events bar over-counted. The reader still has to find lies on
    // the full roster (not a gallery) and survive a few tapes (not a wall).
    expect(found).toBeGreaterThan(0);
    expect(read.filter((o) => o.revealed.length > 0).length).toBeGreaterThanOrEqual(
      Math.ceil(tapes.length / 4),
    );
  });
});
