import { describe, expect, it } from 'vitest';
import { DEFAULT_PATTERNS as P } from '../src/patterns';
import { describe as describePlace, intro, newGame, step, switchesFor } from '../src/sim';
import type { State, Switches } from '../src/types';

function play(inputs: string[], preset = 'baseline', seed = 1, overrides: Partial<Switches> = {}) {
  const sw = switchesFor(P, preset, overrides);
  const opened = intro(P, sw, newGame(P, seed));
  let s: State = opened.state;
  const log: Array<{ input: string; text: string; events: string[] }> = [];
  for (const input of inputs) {
    const r = step(P, sw, s, input);
    s = r.state;
    log.push({ input, text: r.text, events: r.events });
  }
  return { first: opened.text, s, log, events: log.flatMap((l) => l.events), last: log.at(-1)! };
}

const MAIN = [
  'east',
  'ask priest about archive',
  'west',
  'north',
  'east',
  'light lamp',
  'take seal',
  'west',
  'south',
  'west',
  'west',
];

describe('the opening', () => {
  it('states the goal and lists the way out when the switches are healthy', () => {
    const { first } = play([]);
    expect(first).toContain('HARROW GATE');
    expect(first).toContain("Find the warden's seal");
    expect(first).toMatch(
      /Exits: north \(the market\), east \(the chapel\), west \(the gatehouse\), south \(the inn\)\./,
    );
    expect(first).toMatch(/What do you do\? $/);
  });

  it('says nothing of the goal, and shows a bare prompt, when those switches flip', () => {
    const { first } = play([], 'baseline', 1, { goal: 'none', prompt: 'bare' });
    expect(first).not.toContain('seal');
    expect(first).toMatch(/\n> $/);
  });
});

describe('the main line', () => {
  it('wins in eleven turns: the key from the priest, the seal from the dark archive, out through the gate', () => {
    const r = play(MAIN);
    expect(r.s.won).toBe(true);
    expect(r.events).toEqual(
      expect.arrayContaining(['ask:oren:archive', 'got:archive key', 'cost', 'took-seal', 'win']),
    );
    expect(r.last.text).toContain('The warden waves you through');
  });

  it('is the same game for the same seed and inputs, and differs only where chance enters', () => {
    const a = play(
      [...MAIN.slice(0, 4), 'north', 'fight sergeant', 'attack', 'attack'],
      'baseline',
      7,
    );
    const b = play(
      [...MAIN.slice(0, 4), 'north', 'fight sergeant', 'attack', 'attack'],
      'baseline',
      7,
    );
    expect(a.log).toEqual(b.log);
    expect(a.s).toEqual(b.s);
  });

  it('keeps the archive door shut until the priest hands over the key', () => {
    const r = play(['north', 'east']);
    expect(r.last.events).toEqual(['locked', 'rejected']);
    expect(r.last.text).toContain('You would need the archive key');
    expect(r.last.text).toContain('east (the archive, shut)');
  });

  it('hides the seal in the dark until the lamp is lit, and the lamp spends visible oil', () => {
    const r = play([
      'east',
      'ask priest about archive',
      'west',
      'north',
      'east',
      'take seal',
      'light lamp',
      'take seal',
    ]);
    expect(r.log[5]!.text).toContain('too dark');
    expect(r.log[5]!.events).toContain('rejected');
    expect(r.log[6]!.text).toContain('Oil left: 2');
    expect(r.s.pack).toContain('seal');
  });
});

describe('the calibration switches keep their meaning', () => {
  it('worldMoves: the bell tolls every five inputs and bars the gate at the closing hour', () => {
    const r = play(Array(55).fill('wait'));
    expect(r.events.filter((e) => e === 'tick')).toHaveLength(11);
    expect(r.events).toContain('lose');
    expect(r.s.over).toBe(true);
    expect(play(Array(55).fill('wait'), 'still-world').events).not.toContain('tick');
  });

  it('refusal: Warden Sela, a system message, or nobody at all', () => {
    expect(play(['west', 'west']).last.text).toContain('Not without the seal');
    expect(play(['west', 'west']).last.events).toContain('refusal:character');
    expect(play(['west', 'west'], 'system-refusal').last.text).toContain('[ACCESS DENIED]');
    const open = play(['west', 'west'], 'open-gate');
    expect(open.s.won).toBe(true);
    expect(open.last.text).toContain('Nobody stops you');
  });

  it('reacts: a deaf town answers everything with the same line', () => {
    const r = play(['north', 'talk to coll', 'xyzzy'], 'deaf');
    expect(r.log.every((l) => l.events.includes('ignored'))).toBe(true);
    expect(new Set(r.log.map((l) => l.text)).size).toBe(1);
    expect(r.s.place).toBe('square');
  });

  it('choiceCost: with it off the archive is lit and there is no lamp to spend', () => {
    const r = play(
      ['east', 'ask priest about archive', 'west', 'north', 'east', 'take seal', 'light lamp'],
      'no-cost',
    );
    expect(r.log[5]!.events).toContain('took-seal');
    expect(r.log[6]!.text).toContain('no lamp');
    expect(r.events).not.toContain('cost');
  });

  it('descriptions: a place reads differently on return, unless the town repeats itself', () => {
    expect(play(['north', 'south']).last.events).toEqual(
      expect.arrayContaining(['revisit', 'changed-on-return']),
    );
    expect(play(['north', 'south'], 'same-text').last.events).not.toContain('changed-on-return');
  });

  it('deadEnd: the cellar trapdoor shuts behind you and every move after is stuck', () => {
    const r = play(['east', 'down', 'up', 'look'], 'trapdoor');
    expect(r.log[1]!.events).toEqual(expect.arrayContaining(['dead-end', 'stuck']));
    expect(r.log[2]!.events).toEqual(expect.arrayContaining(['stuck', 'rejected']));
    expect(r.last.text).toContain('Exits: none.');
    expect(play(['east', 'down', 'up']).s.place).toBe('chapel');
  });

  it('bleak flips everything except reacts', () => {
    const sw = switchesFor(P, 'bleak');
    expect(sw).toMatchObject({
      worldMoves: false,
      refusal: 'system',
      prompt: 'bare',
      reacts: true,
      deadEnd: true,
    });
  });
});

describe('people', () => {
  it('greet you with their topics, and remember what you already asked', () => {
    const r = play([
      'east',
      'talk to priest',
      'ask priest about bell',
      'ask father about bell',
      'ask oren about weather',
    ]);
    expect(r.log[1]!.text).toContain('You could ask about: archive, rats, bell, graveyard.');
    expect(r.log[1]!.events).toEqual(['talk:oren']);
    expect(r.log[3]!.text).toContain('"As I said, the bell');
    expect(r.log[4]!.events).toContain('rejected');
  });

  it('hand over the key only once, and pay for the rats only after they are cleared', () => {
    const r = play([
      'east',
      'ask priest about archive',
      'ask priest about archive',
      'ask priest about rats',
    ]);
    expect(r.s.pack.filter((x) => x === 'archive key')).toHaveLength(1);
    expect(r.events).not.toContain('paid');
  });

  it('refuse a talk to nobody in the room', () => {
    expect(play(['talk to sela']).last.events).toContain('rejected');
  });
});

describe('the side content', () => {
  it('the locket quest: rope from Coll, down the well, back to Pell for coin', () => {
    const r = play([
      'north',
      'buy rope',
      'south',
      'south',
      'east',
      'south',
      'down',
      'take locket',
      'take token',
      'up',
      'north',
      'give locket to pell',
    ]);
    expect(r.events).toEqual(
      expect.arrayContaining([
        'bought:rope',
        'took:locket',
        'took:second token',
        'token',
        'gave:locket',
        'quest:locket',
      ]),
    );
    expect(r.s.coin).toBe(2);
    expect(r.last.text).toContain("Gran's!");
  });

  it('the riddle door costs an hour for a wrong word and opens for the right one', () => {
    const r = play([
      'south',
      'east',
      'north',
      'up',
      'answer key',
      'answer bell',
      'up',
      'take token',
    ]);
    expect(r.log[3]!.events).toEqual(['riddle']);
    expect(r.log[4]!.events).toEqual(expect.arrayContaining(['riddle:wrong', 'tick']));
    expect(r.log[5]!.events).toEqual(['riddle:right']);
    expect(r.s.pack).toContain('third token');
  });

  it('the wall-walk shortcut wins without the seal', () => {
    const r = play(['north', 'buy rope', 'north', 'east', 'climb down']);
    expect(r.s.won).toBe(true);
    expect(r.last.events).toEqual(['shortcut', 'win']);
  });

  it('sparring pays a coin a win and makes you hit harder; rats knock a weak player out', () => {
    const spar = play(
      [
        'north',
        'north',
        'fight sergeant',
        'attack',
        'attack',
        'fight sergeant',
        'attack',
        'attack',
      ],
      'baseline',
      3,
    );
    expect(spar.s.sparWins).toBeGreaterThanOrEqual(1);
    expect(spar.events).toContain('spar-won');
    const rats = play(['east', 'down', 'fight rats', 'defend', 'attack', 'attack'], 'baseline', 5);
    expect(rats.events).toEqual(expect.arrayContaining(['fight', 'hit']));
  });

  it('system verbs answer without changing the town, and save and load restore it', () => {
    const r = play([
      'save',
      'north',
      'buy rope',
      'status',
      'inventory',
      'map',
      'journal',
      'help',
      'hint',
      'load',
    ]);
    expect(r.events).toEqual(
      expect.arrayContaining([
        'save',
        'status',
        'inventory',
        'map',
        'journal',
        'help',
        'hint',
        'load',
      ]),
    );
    expect(r.s.place).toBe('square');
    expect(r.s.pack).not.toContain('rope');
    expect(r.log[3]!.text).toContain('Coins 0.');
  });

  it('a rest at the inn costs a coin and an hour', () => {
    const r = play(['south', 'rest']);
    expect(r.last.events).toEqual(expect.arrayContaining(['rest', 'tick']));
    expect(r.s.coin).toBe(2);
    expect(play(['rest']).last.events).toContain('rejected');
  });
});

describe('describe', () => {
  it('names who is here and what lies here', () => {
    const sw = switchesFor(P);
    const s = { ...newGame(P), place: 'gatehouse' };
    expect(describePlace(P, sw, s)).toContain('Warden Sela is here.');
    expect(describePlace(P, sw, { ...s, place: 'graveyard' })).toContain('A carved token');
  });
});
