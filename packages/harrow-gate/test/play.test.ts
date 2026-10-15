import { describe, expect, it } from 'vitest';
import { normalize, parse } from '../src/parse';
import { DEFAULT_PATTERNS as P } from '../src/patterns';
import { openSession, parseArgs } from '../src/play';
import { BOTS, playBot, route } from '../src/bots';
import { newGame } from '../src/sim';
import { offPath, signals, tag } from '../src/stats';

describe('parse', () => {
  it('reads directions, phrases and synonyms from the verbs lever', () => {
    expect(parse('N', P.verbs)).toEqual({ verb: 'go', rest: 'north', dir: 'north' });
    expect(parse('go west', P.verbs)).toMatchObject({ verb: 'go', dir: 'west' });
    expect(parse('climb down', P.verbs)).toMatchObject({ verb: 'go', dir: 'down' });
    expect(parse('Talk to the Warden!', P.verbs)).toEqual({ verb: 'talk', rest: 'warden' });
    expect(parse('look at the fountain', P.verbs)).toEqual({ verb: 'examine', rest: 'fountain' });
    expect(parse('x board', P.verbs)).toEqual({ verb: 'examine', rest: 'board' });
    expect(parse('frobnicate', P.verbs)).toEqual({ verb: '', rest: 'frobnicate' });
    expect(parse('   ', P.verbs)).toEqual({ verb: '', rest: '' });
    expect(normalize('Take an  Apple.')).toBe('take apple');
  });

  it('goes to an adjacent place by name', () => {
    const r = openSession({ preset: 'baseline', seed: 1, knobs: {} }, () => {});
    expect(r.session.send('go to market').text).toContain('The market.');
  });
});

describe('the stdio session', () => {
  it("writes the truth log ai-playtest's answer key reads: the switches first, then one line a turn", () => {
    const log: Array<Record<string, unknown>> = [];
    const { first, session } = openSession(
      { preset: 'trapdoor', seed: 2, knobs: { prompt: 'bare' } },
      (o) => log.push(o),
    );
    expect(first).toMatch(/\n> $/);
    session.send('east');
    const r = session.send('down');
    expect(r.over).toBe(false);
    expect(log[0]).toMatchObject({
      variant: 'trapdoor',
      seed: 2,
      knobs: { deadEnd: true, prompt: 'bare' },
    });
    expect(log[2]).toMatchObject({
      t: 2,
      in: 'down',
      room: 'cellar',
      ev: expect.arrayContaining(['dead-end', 'stuck']),
    });
    expect(session.send('quit')).toMatchObject({ over: true });
  });

  it('reads its arguments, and refuses a bad seed or an unknown preset', () => {
    expect(parseArgs(['--preset', 'deaf', '--seed', '4', '--knobs', '{"goal":"none"}'])).toEqual({
      preset: 'deaf',
      seed: 4,
      knobs: { goal: 'none' },
    });
    expect(parseArgs([])).toEqual({ preset: 'baseline', seed: 1, knobs: {} });
    expect(() => parseArgs(['--seed', '-1'])).toThrow(/whole number/);
    expect(() => openSession({ preset: 'nope', seed: 1, knobs: {} }, () => {})).toThrow(
      /unknown preset nope/,
    );
  });

  it('answers nothing once the game is over', () => {
    const { session } = openSession({ preset: 'open-gate', seed: 1, knobs: {} }, () => {});
    expect(session.send('west').text).toContain('The gatehouse');
    expect(session.send('west').over).toBe(true);
    expect(session.send('look')).toEqual({ text: '', over: true });
  });
});

describe('bots and signals', () => {
  it('route finds the open path and treats locked exits as closed', () => {
    const s = newGame(P);
    expect(route(P, s, 'archive')).toEqual([]);
    expect(route(P, { ...s, pack: [...s.pack, 'archive key'] }, 'archive')).toEqual([
      'north',
      'east',
    ]);
    expect(route(P, s, 'tower top')).toEqual([]);
  });

  it('tags inputs in order, so run away is flee before run is move', () => {
    expect(tag('run away')).toBe('flee');
    expect(tag('spar')).toBe('fight');
    expect(tag('xyzzy')).toBeNull();
  });

  it('turnsToFinish ignores a run the player quit, and offPath measures against control', () => {
    const quitter = playBot(BOTS.quitter!);
    expect(signals(quitter.turns).turnsToFinish).toBeNull();
    const control = playBot(BOTS.control!);
    expect(offPath(control.turns, control.turns)).toBe(0);
    expect(offPath([], control.turns)).toBe(0);
    expect(signals([])).toMatchObject({ turnsPlayed: 0, rejectedRate: 0, repeatRate: 0 });
  });

  it('every bot plays every preset without throwing, inside the budget', () => {
    for (const preset of Object.keys(P.switches.presets)) {
      for (const bot of Object.values(BOTS)) {
        const run = playBot(bot, preset, 3, 60);
        expect(run.turns.length, `${bot.id} on ${preset}`).toBeLessThanOrEqual(60);
      }
    }
  });
});
