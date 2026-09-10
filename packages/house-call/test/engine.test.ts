import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  brier,
  commit,
  implied,
  isOver,
  nextTape,
  readout,
  reliability,
  reveal,
  setupTurn,
  splitRows,
  startRun,
  tier,
  unlockedTier,
  type Tape,
} from '../src/index';

const FIXTURES = path.resolve(__dirname, '../../../fixtures/tapes');
const load = (name: string): Tape =>
  JSON.parse(readFileSync(path.join(FIXTURES, `${name}.tape.json`), 'utf8')) as Tape;

// No score word, no figure, and no grade: the reveal is the call beside the fact (G4).
const FORBIDDEN =
  /\b(nrp|integrity|utility|attack_success|pass|fail|score|brier|right|wrong|correct|read it)\b|1\.00/i;

describe('scoring is a bounded proper rule on the stated confidence (G3)', () => {
  const outcomes = ['followed', 'held'] as const;
  it('prices confidence: right at 0.8 beats right at 0.5; wrong at 0.8 is punished', () => {
    expect(brier({ outcome: 'held', confidence: 0.8 }, 'held', outcomes)).toBeCloseTo(0.08, 6);
    expect(brier({ outcome: 'held', confidence: 0.5 }, 'held', outcomes)).toBeCloseTo(0.5, 6);
    expect(brier({ outcome: 'held', confidence: 0.8 }, 'followed', outcomes)).toBeCloseTo(1.28, 6);
    expect(brier({ outcome: 'held', confidence: 1 }, 'followed', outcomes)).toBe(2);
    expect(brier({ outcome: 'held', confidence: 1 }, 'held', outcomes)).toBe(0);
  });
  it('a coin flip scores the same whichever way it lands: hedging buys nothing', () => {
    expect(brier({ outcome: 'held', confidence: 0.5 }, 'held', outcomes)).toBe(
      brier({ outcome: 'held', confidence: 0.5 }, 'followed', outcomes),
    );
  });
  it('spreads the remaining mass evenly over three outcomes', () => {
    const three = ['followed', 'held', 'no_call'] as const;
    const p = implied({ outcome: 'followed', confidence: 0.7 }, three);
    expect(p.get('followed')).toBeCloseTo(0.7);
    expect(p.get('held')).toBeCloseTo(0.15);
    expect(p.get('no_call')).toBeCloseTo(0.15);
  });
  it('clamps confidence into [0.5, 1]', () => {
    expect(brier({ outcome: 'held', confidence: 0.1 }, 'held', outcomes)).toBeCloseTo(0.5, 6);
    expect(brier({ outcome: 'held', confidence: 7 }, 'held', outcomes)).toBe(0);
  });
  it('refuses an outcome that is not on the turn', () => {
    expect(() => brier({ outcome: 'menu_changed', confidence: 0.9 }, 'held', outcomes)).toThrow();
  });
});

describe('a turn is a belief test (G2)', () => {
  it('discloses the menu and the task, hides the calls until the commit', () => {
    const tape = load('naive-ndjson');
    const setup = setupTurn(tape, 'poison.follow_through');
    expect(setup).not.toBeNull();
    expect(setup!.taskTool).toBe('echo');
    expect(setup!.party.role).toBe('rookie');
    const disclosedMethods = setup!.disclosure.map((r) => r.method);
    expect(disclosedMethods).toContain('tools/list');
    expect(disclosedMethods).not.toContain('tools/call');
    // The setup names the options a player may call; it must carry no truth.
    const blob = JSON.stringify(setup);
    expect(blob).not.toMatch(/"(fact|truth|hit|score)"/);
    expect(setup!.outcomes).toEqual(['followed', 'held', 'no_call']);
  });
  it('the reveal is the tape fact, and the rows that scroll in start at the first call', () => {
    const tape = load('naive-ndjson');
    const { reveal: rows } = splitRows(tape.rows.filter((r) => r.atom === 'poison.follow_through'));
    expect(rows[0]?.method).toBe('tools/call');
    const run = startRun(tape);
    const after = commit(run, { outcome: 'held', confidence: 0.9 });
    const result = after.results[0]!;
    expect(result.truth).toBe('followed');
    expect(result.hit).toBe(false);
    expect(result.reveal.length).toBeGreaterThan(0);
  });
  it('the inspect atom is not a turn: the menu is disclosure, not a question', () => {
    const tape = load('task-only-ndjson');
    expect(setupTurn(tape, 'inspect.tools_list')).toBeNull();
    const run = startRun(tape);
    expect(run.pending.concat(run.current?.atomId ?? [])).not.toContain('inspect.tools_list');
  });
});

describe('a run walks the atoms, keeps coverage apart, and shows numbers only at the end (G3, G4)', () => {
  it('plays task-only-ndjson end to end with honest calls', () => {
    const tape = load('task-only-ndjson');
    let run = startRun(tape);
    const order: string[] = [];
    const calls = {
      'poison.follow_through': 'held',
      'temporal.rug_pull': 'menu_changed',
      'protocol.unlisted_call': 'ghost_answered',
    } as const;
    while (!isOver(run)) {
      const atom = run.current!.atomId as keyof typeof calls;
      order.push(atom);
      run = commit(run, { outcome: calls[atom], confidence: 0.9 });
    }
    expect(order).toEqual(['poison.follow_through', 'temporal.rug_pull', 'protocol.unlisted_call']);
    expect(run.results.every((r) => r.hit)).toBe(true);
    const out = readout(run);
    expect(out.turns).toBe(3);
    expect(out.meanBrier).toBeCloseTo(0.015, 6); // 3-way Brier, right at 0.9: 0.01 + 2*(0.05^2)
    expect(out.coverageCells).toHaveLength(3);
    expect(out.coverageCells[0]).toMatch(/^mcp-arcade-fixture\|/); // server name, not target kind
  });
  it('the per-turn narrative carries no number and no verdict word', () => {
    const tape = load('naive-ndjson');
    let run = startRun(tape);
    const texts: string[] = [];
    while (!isOver(run)) {
      // Always call the second option: wrong on poison (the rookie followed), a mix elsewhere.
      const outcome = run.current!.outcomes[1]!;
      run = commit(run, { outcome, confidence: 0.85 });
      texts.push(reveal(run.results[run.results.length - 1]!));
    }
    for (const t of texts) {
      expect(t).not.toMatch(FORBIDDEN);
      expect(t).not.toMatch(/\d/);
      expect(t).toMatch(/the tape shows/);
    }
    // Wrong call on the poison turn: the fact is shown, the miss is not announced.
    expect(texts[0]).toContain('You called holds');
    expect(texts[0]).toContain('followed the whisper');
    expect(texts[0]).not.toMatch(/did not|missed|you read/i);
  });
  it('the reliability readout bins by stated confidence', () => {
    const bins = reliability([
      { confidence: 0.9, hit: true },
      { confidence: 0.92, hit: false },
      { confidence: 0.6, hit: true },
    ]);
    const top = bins.find((b) => b.from === 0.9)!;
    expect(top.n).toBe(2);
    expect(top.observed).toBe(0.5);
    expect(top.predicted).toBeCloseTo(0.91);
    expect(bins.find((b) => b.from === 0.6)!.n).toBe(1);
  });
});

describe('the director sequences fixed tapes by measured calibration (G6)', () => {
  const campaign = [
    { name: 'task-only-ndjson', tape: load('task-only-ndjson') },
    { name: 'naive-ndjson', tape: load('naive-ndjson') },
    { name: 'calibration.docker-fixture.ollama', tape: load('calibration.docker-fixture.ollama') },
    { name: 'livefire.intern.naive-wrap-on', tape: load('livefire.intern.naive-wrap-on') },
  ];
  it('tiers by header facts alone', () => {
    expect(tier(load('naive-ndjson'))).toBe(0);
    expect(tier(load('calibration.docker-fixture.ollama'))).toBe(1);
    expect(tier(load('livefire.intern.naive-wrap-on'))).toBe(2);
  });
  it('a new player only sees the fixture controls; good calibration opens the seat, then live', () => {
    const fresh = { recentMeanBrier: null, coverage: new Set<string>(), played: new Set<string>() };
    expect(unlockedTier(fresh)).toBe(0);
    expect(nextTape(campaign, fresh)!.name).toBe('naive-ndjson');
    const good = { ...fresh, recentMeanBrier: 0.3 };
    expect(unlockedTier(good)).toBe(1);
    const sharp = { ...fresh, recentMeanBrier: 0.1 };
    expect(unlockedTier(sharp)).toBe(2);
  });
  it('prefers uncovered cells and never repeats a tape; volume alone unlocks nothing', () => {
    const played = new Set(['naive-ndjson', 'task-only-ndjson']);
    const coverage = new Set(
      campaign
        .slice(0, 2)
        .flatMap((e) =>
          e.tape.atoms.map((a) => `${e.tape.server_name}|${a.id}|${e.tape.agent_policy}`),
        ),
    );
    // Poor calibration: the fixture controls are played out and nothing else is unlocked.
    const stuck = { recentMeanBrier: 0.9, coverage, played };
    expect(nextTape(campaign, stuck)).toBeNull();
    // Tier 1 earned: the seat tape on the docker fixture (three atoms, older proof).
    const decent = { recentMeanBrier: 0.3, coverage, played };
    expect(nextTape(campaign, decent)!.name).toBe('calibration.docker-fixture.ollama');
    // Tier 2 earned: the live tape adds four new cells, the docker seat tape three.
    const earned = { recentMeanBrier: 0.1, coverage, played };
    expect(nextTape(campaign, earned)!.name).toBe('livefire.intern.naive-wrap-on');
  });
});
