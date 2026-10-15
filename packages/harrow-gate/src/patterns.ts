// Every lever the cabinet reads, validated at load. The loader halts on the
// first bad key with `patterns/<file>: <key>`, the halting shape Ghost's and
// Vibe Typer's loaders use (copied, not imported: cabinets share a chassis,
// never a module). A lever that names a place, item or person that does not
// exist is a broken town, and it fails here rather than mid-run.

import type { Patterns } from './types';

import townJson from '../patterns/town.json';
import peopleJson from '../patterns/people.json';
import itemsJson from '../patterns/items.json';
import foesJson from '../patterns/foes.json';
import clockJson from '../patterns/clock.json';
import switchesJson from '../patterns/switches.json';
import verbsJson from '../patterns/verbs.json';
import textJson from '../patterns/text.json';

export class PatternError extends Error {
  constructor(file: string, key: string, why: string) {
    super(`patterns/${file}: ${key}: ${why}`);
    this.name = 'PatternError';
  }
}

const DIRECTIONS = ['north', 'south', 'east', 'west', 'up', 'down'] as const;
/** The way out of town. An exit may lead here; it is not a place. */
export const ROAD = 'road';

const SWITCH_VALUES: Record<string, readonly unknown[]> = {
  worldMoves: [true, false],
  refusal: ['character', 'system', 'none'],
  prompt: ['clear', 'bare'],
  reacts: [true, false],
  choiceCost: [true, false],
  goal: ['stated', 'none'],
  descriptions: ['varied', 'repeats'],
  deadEnd: [true, false],
};

/** Text keys the sim reads. A missing one is a hole in what the town can say. */
const TEXT_KEYS = [
  'title',
  'goal',
  'refusal',
  'win',
  'lose',
  'toll',
  'market',
  'dark',
  'deaf',
  'trapdoor',
  'stuck',
  'stuckPlace',
  'noExit',
  'locked',
  'riddle',
  'riddleRight',
  'riddleWrong',
  'riddleAnswer',
  'noRiddle',
  'unknown',
  'wait',
  'look',
  'nothingThere',
  'takeNone',
  'takeDark',
  'taken',
  'already',
  'noLamp',
  'dry',
  'lit',
  'litArchive',
  'nobody',
  'noTopic',
  'topicsHint',
  'giveNone',
  'giveNo',
  'buyNone',
  'buyPoor',
  'bought',
  'fightNone',
  'fightDone',
  'fightStart',
  'hit',
  'foeHits',
  'foeMisses',
  'defend',
  'won',
  'sparWon',
  'sparPaid',
  'sparLost',
  'knockedOut',
  'fled',
  'notFighting',
  'rest',
  'restPoor',
  'restWhere',
  'saved',
  'loaded',
  'noSave',
  'quit',
  'help',
  'hints',
] as const;

export function validatePatterns(p: Patterns): Patterns {
  const places = p.town.places;
  const placeIds = new Set(Object.keys(places));
  const itemIds = new Set(Object.keys(p.items.items));
  const personIds = new Set(Object.keys(p.people.people));
  const isPlace = (id: string) => placeIds.has(id);

  if (!isPlace(p.town.start))
    throw new PatternError('town.json', 'start', `"${p.town.start}" is not a place`);
  for (const [id, place] of Object.entries(places)) {
    for (const [dir, to] of Object.entries(place.exits)) {
      if (!(DIRECTIONS as readonly string[]).includes(dir))
        throw new PatternError('town.json', `${id}.exits.${dir}`, 'not a direction');
      if (to !== ROAD && !isPlace(to))
        throw new PatternError('town.json', `${id}.exits.${dir}`, `"${to}" is not a place`);
    }
    for (const [dir, item] of Object.entries(place.locks ?? {})) {
      if (!(dir in place.exits))
        throw new PatternError(
          'town.json',
          `${id}.locks.${dir}`,
          'locks an exit that does not exist',
        );
      if (!itemIds.has(item))
        throw new PatternError('town.json', `${id}.locks.${dir}`, `"${item}" is not an item`);
    }
    if (place.riddle && !(place.riddle in place.exits))
      throw new PatternError('town.json', `${id}.riddle`, 'names an exit that does not exist');
    if (place.text.length !== 2 || place.text.some((t) => t.trim() === ''))
      throw new PatternError('town.json', `${id}.text`, 'needs a first-visit and a return line');
  }
  if (!Object.values(places).some((pl) => Object.values(pl.exits).includes(ROAD))) {
    throw new PatternError('town.json', 'places', 'no exit leads to the road, so nobody can win');
  }

  for (const [id, person] of Object.entries(p.people.people)) {
    if (!isPlace(person.at))
      throw new PatternError('people.json', `${id}.at`, `"${person.at}" is not a place`);
    if (person.aliases.length === 0)
      throw new PatternError(
        'people.json',
        `${id}.aliases`,
        'a person needs a name to be called by',
      );
    for (const [topic, item] of Object.entries(person.gives ?? {})) {
      if (!(topic in person.topics))
        throw new PatternError('people.json', `${id}.gives.${topic}`, 'not one of their topics');
      if (!itemIds.has(item))
        throw new PatternError('people.json', `${id}.gives.${topic}`, `"${item}" is not an item`);
    }
    for (const [topic, pay] of Object.entries(person.pays ?? {})) {
      if (!(topic in person.topics))
        throw new PatternError('people.json', `${id}.pays.${topic}`, 'not one of their topics');
      if (!(pay.after in p.foes.foes))
        throw new PatternError(
          'people.json',
          `${id}.pays.${topic}.after`,
          `"${pay.after}" is not a foe`,
        );
    }
  }

  for (const [id, item] of Object.entries(p.items.items)) {
    if (item.at !== undefined && !isPlace(item.at))
      throw new PatternError('items.json', `${id}.at`, `"${item.at}" is not a place`);
    if (item.seller !== undefined && !personIds.has(item.seller))
      throw new PatternError('items.json', `${id}.seller`, `"${item.seller}" is not a person`);
    if ((item.seller === undefined) !== (item.price === undefined))
      throw new PatternError('items.json', `${id}`, 'a price and a seller go together');
  }
  for (const [id, q] of Object.entries(p.items.quests)) {
    if (!personIds.has(q.giver))
      throw new PatternError('items.json', `quests.${id}.giver`, `"${q.giver}" is not a person`);
    if (!itemIds.has(q.wants))
      throw new PatternError('items.json', `quests.${id}.wants`, `"${q.wants}" is not an item`);
  }
  if (!p.items.items.seal)
    throw new PatternError('items.json', 'items.seal', 'the gate needs a seal');

  for (const [id, foe] of Object.entries(p.foes.foes)) {
    if (!isPlace(foe.at))
      throw new PatternError('foes.json', `${id}.at`, `"${foe.at}" is not a place`);
    if (foe.min > foe.max || foe.min < 0)
      throw new PatternError('foes.json', `${id}`, 'damage needs 0 <= min <= max');
    if (foe.spar && foe.yield === undefined)
      throw new PatternError('foes.json', `${id}.yield`, 'a sparring bout needs a yield point');
  }

  const c = p.clock;
  if (c.turnsPerHour < 1)
    throw new PatternError('clock.json', 'turnsPerHour', 'must be at least 1');
  if (c.startHour >= c.closingHour)
    throw new PatternError('clock.json', 'closingHour', 'must come after startHour');
  if (c.hourNames.length <= c.closingHour)
    throw new PatternError('clock.json', 'hourNames', 'needs a name for every hour up to closing');

  for (const [k, v] of Object.entries(p.switches.defaults)) {
    if (!(k in SWITCH_VALUES))
      throw new PatternError('switches.json', `defaults.${k}`, 'not a switch');
    if (!SWITCH_VALUES[k]!.includes(v))
      throw new PatternError('switches.json', `defaults.${k}`, `bad value ${JSON.stringify(v)}`);
  }
  for (const [name, preset] of Object.entries(p.switches.presets)) {
    for (const [k, v] of Object.entries(preset)) {
      if (!(k in SWITCH_VALUES))
        throw new PatternError('switches.json', `presets.${name}.${k}`, 'not a switch');
      if (!SWITCH_VALUES[k]!.includes(v))
        throw new PatternError(
          'switches.json',
          `presets.${name}.${k}`,
          `bad value ${JSON.stringify(v)}`,
        );
    }
  }

  for (const k of TEXT_KEYS) if (!(k in p.text)) throw new PatternError('text.json', k, 'missing');
  return p;
}

export const DEFAULT_PATTERNS: Patterns = validatePatterns({
  town: townJson as unknown as Patterns['town'],
  people: peopleJson as unknown as Patterns['people'],
  items: itemsJson as unknown as Patterns['items'],
  foes: foesJson as unknown as Patterns['foes'],
  clock: clockJson as unknown as Patterns['clock'],
  switches: switchesJson as unknown as Patterns['switches'],
  verbs: verbsJson as unknown as Patterns['verbs'],
  text: textJson as unknown as Patterns['text'],
});
