import { describe, expect, it } from 'vitest';
import { DEFAULT_PATTERNS, PatternError, validatePatterns } from '../src/patterns';
import type { Patterns } from '../src/types';

const copy = (): Patterns => JSON.parse(JSON.stringify(DEFAULT_PATTERNS)) as Patterns;

function broken(mutate: (p: Patterns) => void, message: RegExp): void {
  const p = copy();
  mutate(p);
  expect(() => validatePatterns(p)).toThrow(PatternError);
  expect(() => validatePatterns(p)).toThrow(message);
}

describe('the levers', () => {
  it('load clean', () => {
    expect(() => validatePatterns(copy())).not.toThrow();
    expect(Object.keys(DEFAULT_PATTERNS.town.places)).toHaveLength(15);
    expect(Object.keys(DEFAULT_PATTERNS.switches.presets)).toHaveLength(11);
  });

  it('halt on the first broken key, naming the file and the key', () => {
    broken((p) => {
      p.town.start = 'moon';
    }, /patterns\/town\.json: start/);
    broken((p) => {
      p.town.places.square!.exits.north = 'moon';
    }, /square\.exits\.north/);
    broken((p) => {
      (p.town.places.square!.exits as Record<string, string>).sideways = 'market';
    }, /not a direction/);
    broken((p) => {
      p.town.places.well!.locks = { down: 'ladder' };
    }, /"ladder" is not an item/);
    broken((p) => {
      p.town.places.well!.locks = { west: 'rope' };
    }, /locks an exit that does not exist/);
    broken((p) => {
      p.town.places.tower!.riddle = 'east';
    }, /tower\.riddle/);
    broken((p) => {
      p.town.places.square!.text = ['only one', ''];
    }, /first-visit and a return line/);
    broken((p) => {
      p.town.places.gatehouse!.exits = { east: 'square' };
      p.town.places['wall walk']!.exits = { west: 'barracks' };
      p.town.places['wall walk']!.locks = {};
    }, /nobody can win/);
  });

  it('check people, items, foes and quests against the town', () => {
    broken((p) => {
      p.people.people.sela!.at = 'moon';
    }, /people\.json: sela\.at/);
    broken((p) => {
      p.people.people.sela!.aliases = [];
    }, /a name to be called by/);
    broken((p) => {
      p.people.people.oren!.gives = { weather: 'archive key' };
    }, /not one of their topics/);
    broken((p) => {
      p.people.people.oren!.gives = { archive: 'crown' };
    }, /"crown" is not an item/);
    broken((p) => {
      p.people.people.oren!.pays = { rats: { after: 'dragon', coin: 1 } };
    }, /"dragon" is not a foe/);
    broken((p) => {
      p.people.people.oren!.pays = { weather: { after: 'rats', coin: 1 } };
    }, /oren\.pays\.weather/);
    broken((p) => {
      p.items.items.seal!.at = 'moon';
    }, /items\.json: seal\.at/);
    broken((p) => {
      p.items.items.rope!.seller = 'nobody';
    }, /"nobody" is not a person/);
    broken((p) => {
      delete p.items.items.rope!.price;
    }, /a price and a seller go together/);
    broken((p) => {
      p.items.quests.locket!.giver = 'nobody';
    }, /quests\.locket\.giver/);
    broken((p) => {
      p.items.quests.locket!.wants = 'crown';
    }, /quests\.locket\.wants/);
    broken((p) => {
      delete (p.items.items as Record<string, unknown>).seal;
      p.items.quests = {};
      p.town.places.archive!.locks = {};
    }, /the gate needs a seal/);
    broken((p) => {
      p.foes.foes.rats!.at = 'moon';
    }, /foes\.json: rats\.at/);
    broken((p) => {
      p.foes.foes.rats!.min = 5;
    }, /0 <= min <= max/);
    broken((p) => {
      delete p.foes.foes.brask!.yield;
    }, /needs a yield point/);
  });

  it('check the clock, the switches and the text', () => {
    broken((p) => {
      p.clock.turnsPerHour = 0;
    }, /turnsPerHour/);
    broken((p) => {
      p.clock.closingHour = 1;
    }, /closingHour/);
    broken((p) => {
      p.clock.hourNames = ['', 'one'];
    }, /hourNames/);
    broken((p) => {
      (p.switches.defaults as Record<string, unknown>).gravity = true;
    }, /defaults\.gravity/);
    broken((p) => {
      (p.switches.defaults as Record<string, unknown>).refusal = 'polite';
    }, /bad value "polite"/);
    broken((p) => {
      p.switches.presets.odd = { gravity: true } as never;
    }, /presets\.odd\.gravity/);
    broken((p) => {
      p.switches.presets.odd = { prompt: 'loud' } as never;
    }, /presets\.odd\.prompt/);
    broken((p) => {
      delete (p.text as Record<string, unknown>).riddle;
    }, /text\.json: riddle/);
  });
});
