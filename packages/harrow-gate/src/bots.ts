// Scripted players, one per play style in ai-playtest's persona profiles. A bot
// is a generator that reads the live state and yields the next input. Bots
// never see the events: they play from what a player could know.
//
// They are the cabinet's proof that the town can separate play styles before
// anyone pays for a model run: if a style cannot come out distinct even when it
// is scripted perfectly, the town is missing content, and the band test fails.

import type { Direction, Patterns, State, Switches } from './types';
import { DEFAULT_PATTERNS, ROAD } from './patterns';
import { intro, newGame, step, switchesFor } from './sim';
import type { Turn } from './stats';

export type Ctx = { p: Patterns; sw: Switches; readonly s: State };
export type Bot = { id: string; play: (c: Ctx) => Generator<string, void, void> };
export type BotRun = { id: string; turns: Turn[]; state: State };

// ── moving about ─────────────────────────────────────────────────────────────

/** Shortest open path from here to a place, as directions. Locked and riddle exits count only once open. */
export function route(p: Patterns, s: State, target: string): Direction[] {
  const prev = new Map<string, { from: string; dir: Direction }>();
  const queue = [s.place];
  const seen = new Set([s.place]);
  while (queue.length > 0) {
    const at = queue.shift()!;
    if (at === target) break;
    const place = p.town.places[at]!;
    for (const [dir, to] of Object.entries(place.exits) as Array<[Direction, string]>) {
      if (to === ROAD || seen.has(to)) continue;
      const lock = place.locks?.[dir];
      if (lock && !s.pack.includes(lock)) continue;
      if (place.riddle === dir && !s.riddleOpen) continue;
      seen.add(to);
      prev.set(to, { from: at, dir });
      queue.push(to);
    }
  }
  const path: Direction[] = [];
  for (let at = target; at !== s.place;) {
    const step = prev.get(at);
    if (!step) return [];
    path.unshift(step.dir);
    at = step.from;
  }
  return path;
}

function* goTo(c: Ctx, target: string): Generator<string, void, void> {
  for (let guard = 0; c.s.place !== target && guard < 30; guard++) {
    const dir = route(c.p, c.s, target)[0];
    if (!dir) return;
    yield dir;
  }
}

function peopleAt(c: Ctx): string[] {
  return Object.entries(c.p.people.people)
    .filter(([, x]) => x.at === c.s.place)
    .map(([id]) => id);
}

function* talkAll(c: Ctx, again = false): Generator<string, void, void> {
  for (const id of peopleAt(c)) {
    const person = c.p.people.people[id]!;
    yield `talk to ${person.aliases[0]}`;
    for (const topic of Object.keys(person.topics)) {
      yield `ask ${person.aliases[0]} about ${topic}`;
      if (again) yield `ask ${person.aliases[0]} about ${topic}`;
    }
  }
}

function* examineAll(c: Ctx): Generator<string, void, void> {
  for (const thing of c.p.town.places[c.s.place]!.things) yield `examine ${thing}`;
}

function archiveDark(c: Ctx): boolean {
  return Boolean(c.p.town.places.archive?.dark) && c.sw.choiceCost;
}

/** The main line: the key from the priest, the seal from the archive, out through the gate. */
function* mainLine(
  c: Ctx,
  extra: (c: Ctx) => Generator<string, void, void> = function* () {},
): Generator<string, void, void> {
  if (!c.s.pack.includes('archive key')) {
    yield* goTo(c, 'chapel');
    yield* extra(c);
    yield 'ask priest about archive';
  }
  if (!c.s.pack.includes('seal')) {
    yield* goTo(c, 'archive');
    if (archiveDark(c) && !c.s.lit) yield 'light lamp';
    yield* extra(c);
    yield 'take seal';
  }
  yield* goTo(c, 'gatehouse');
  yield* extra(c);
  yield 'west';
}

/** Visit every reachable place, in route order, doing `here` at each. */
function* tour(
  c: Ctx,
  order: string[],
  here: (c: Ctx) => Generator<string, void, void>,
): Generator<string, void, void> {
  for (const place of order) {
    yield* goTo(c, place);
    if (c.s.place === place) yield* here(c);
  }
}

function* fightUntilDone(c: Ctx, open: string): Generator<string, void, void> {
  yield open;
  for (let guard = 0; c.s.fight && guard < 20; guard++) yield c.s.hp <= 4 ? 'defend' : 'attack';
}

// ── the styles ───────────────────────────────────────────────────────────────

const TOUR = [
  'inn',
  'old quarter',
  'well',
  'well bottom',
  'well',
  'old quarter',
  'tower',
  'tower top',
  'tower',
  'old quarter',
  'inn',
  'square',
  'chapel',
  'graveyard',
  'chapel',
  'cellar',
  'chapel',
  'square',
  'market',
  'barracks',
  'wall walk',
  'barracks',
  'market',
  'archive',
  'market',
  'square',
  'gatehouse',
];

export const BOTS: Record<string, Bot> = {
  /** A plain player: looks around, makes a couple of ordinary mistakes, follows the main line. */
  control: {
    id: 'control',
    *play(c) {
      yield 'look';
      yield* goTo(c, 'market');
      yield 'east';
      yield 'look';
      yield* goTo(c, 'chapel');
      yield 'talk to priest';
      yield 'ask priest about archive';
      yield* goTo(c, 'archive');
      yield 'take seal';
      yield* mainLine(c);
    },
  },
  replicate: { id: 'replicate', play: (c) => BOTS.control!.play(c) },
  runner: { id: 'runner', play: (c) => mainLine(c) },
  briefed: { id: 'briefed', play: (c) => mainLine(c) },
  reader: {
    id: 'reader',
    *play(c) {
      yield* examineAll(c);
      yield* mainLine(c, function* (c2) {
        yield* talkAll(c2);
        yield* examineAll(c2);
      });
    },
  },
  completionist: {
    id: 'completionist',
    *play(c) {
      yield* goTo(c, 'market');
      yield 'buy rope';
      yield* goTo(c, 'old quarter');
      yield 'ask pell about tower';
      yield* tour(c, TOUR, function* (c2) {
        yield* talkAll(c2);
        if (c2.s.place === 'well bottom') {
          yield 'take locket';
          yield 'take token';
        }
        if (c2.s.place === 'old quarter' && c2.s.pack.includes('locket'))
          yield 'give locket to pell';
        if (c2.s.place === 'tower' && !c2.s.riddleOpen) yield 'answer bell';
        if (c2.s.place === 'tower top' || c2.s.place === 'graveyard') yield 'take token';
        if (c2.s.place === 'cellar' && !c2.s.stuck) yield* fightUntilDone(c2, 'fight rats');
        if (c2.s.place === 'archive') {
          if (archiveDark(c2)) yield 'light lamp';
          yield 'take seal';
        }
      });
      yield* mainLine(c);
    },
  },
  grinder: {
    id: 'grinder',
    *play(c) {
      yield* goTo(c, 'barracks');
      for (let bout = 0; bout < 4; bout++) {
        if (c.s.hp <= 5) {
          yield* goTo(c, 'inn');
          yield c.s.coin > 0 ? 'rest' : 'wait';
          yield* goTo(c, 'barracks');
        }
        yield* fightUntilDone(c, 'fight sergeant');
      }
      yield* goTo(c, 'cellar');
      if (!c.s.stuck) yield* fightUntilDone(c, 'fight rats');
      yield* goTo(c, 'inn');
      yield 'rest';
      yield 'wait';
      yield* mainLine(c);
    },
  },
  quitter: {
    id: 'quitter',
    *play(c) {
      yield* goTo(c, 'tower');
      yield 'up';
      yield 'answer door';
      yield 'answer key';
      yield 'quit';
    },
  },
  tinkerer: {
    id: 'tinkerer',
    *play(c) {
      yield 'light lamp';
      yield 'give lamp to fountain';
      yield 'put lamp in fountain';
      yield* goTo(c, 'market');
      yield 'buy rope';
      yield 'give rope to coll';
      yield 'combine rope and lamp';
      yield 'use rope on trestles';
      yield* goTo(c, 'barracks');
      yield 'give lamp to brask';
      yield 'use rope on stair';
      yield* goTo(c, 'old quarter');
      yield 'give rope to pell';
      yield 'open houses';
      yield* goTo(c, 'well');
      yield 'use rope on winch';
      yield 'light lamp';
      yield 'climb down';
      yield 'take locket';
      yield 'drop lamp';
      yield 'use locket';
      yield* goTo(c, 'old quarter');
      yield 'give locket to pell';
      yield* goTo(c, 'tower');
      yield 'open iron door';
      yield 'use rope on iron door';
    },
  },
  'genre-veteran': {
    id: 'genre-veteran',
    *play(c) {
      yield 'save';
      yield 'status';
      yield 'journal';
      yield* mainLine(c, function* () {
        yield 'map';
        yield 'inventory';
        yield 'save';
        yield 'status';
      });
    },
  },
  speedrunner: {
    id: 'speedrunner',
    *play(c) {
      yield* goTo(c, 'market');
      yield 'buy rope';
      yield* goTo(c, 'wall walk');
      yield 'climb down';
    },
  },
  theorycrafter: {
    id: 'theorycrafter',
    *play(c) {
      yield* examineAll(c);
      yield* mainLine(c, function* (c2) {
        yield* examineAll(c2);
        yield 'examine lamp';
      });
    },
  },
  'returning-player': {
    id: 'returning-player',
    *play(c) {
      yield 'help';
      yield 'hint';
      yield 'journal';
      yield* mainLine(c, function* () {
        yield 'hint';
        yield 'help';
      });
    },
  },
  cartographer: {
    id: 'cartographer',
    *play(c) {
      yield* goTo(c, 'market');
      yield 'buy rope';
      yield* goTo(c, 'old quarter');
      yield 'answer bell';
      const mapped = new Set<string>();
      yield* tour(
        c,
        TOUR.filter((x) => x !== 'cellar'),
        function* (c2) {
          if (c2.s.place === 'tower' && !c2.s.riddleOpen) yield 'answer bell';
          // A mapmaker writes a place down once; a second look at the same thing shows nothing new.
          if (!mapped.has(c2.s.place)) yield* examineAll(c2);
          mapped.add(c2.s.place);
        },
      );
    },
  },
  closer: {
    id: 'closer',
    *play() {
      yield 'save';
      yield 'quit';
    },
  },
  'boundary-pusher': {
    id: 'boundary-pusher',
    *play(c) {
      for (const odd of [
        'xyzzy',
        'take sky',
        'fight fountain',
        'ask nobody about nothing',
        'eat lamp',
        'go up',
        'give seal to sela',
        'light lamp lamp lamp',
        'west west',
        'answer bell',
        'rest',
        'buy castle',
      ])
        yield odd;
      yield* goTo(c, 'gatehouse');
      yield 'west';
      yield 'take gate';
      yield 'fight sela';
      yield 'flee';
      yield 'load';
    },
  },
  'continuity-auditor': {
    id: 'continuity-auditor',
    *play(c) {
      yield* mainLine(c, function* (c2) {
        yield* talkAll(c2, true);
        yield* examineAll(c2);
        yield* examineAll(c2);
      });
    },
  },
  novice: {
    id: 'novice',
    *play(c) {
      yield 'help';
      yield 'look';
      yield* mainLine(c, function* () {
        yield 'look';
      });
    },
  },
  systematic: {
    id: 'systematic',
    *play(c) {
      yield 'look';
      yield 'look';
      yield* goTo(c, 'chapel');
      yield 'wait';
      yield 'wait';
      yield 'ask priest about archive';
      yield 'ask priest about archive';
      yield* goTo(c, 'archive');
      yield 'light lamp';
      yield 'light lamp';
      yield 'take seal';
      yield 'take seal';
      yield* goTo(c, 'gatehouse');
      yield 'look';
      yield 'look';
      yield 'west';
    },
  },
};

/** Play one bot to the end of the game, the end of its plan, or the turn budget. */
export function playBot(
  bot: Bot,
  preset = 'baseline',
  seed = 1,
  budget = 60,
  p: Patterns = DEFAULT_PATTERNS,
): BotRun {
  const sw = switchesFor(p, preset);
  const opened = intro(p, sw, newGame(p, seed));
  let state = opened.state;
  const ctx: Ctx = {
    p,
    sw,
    get s() {
      return state;
    },
  };
  const turns: Turn[] = [];
  const gen = bot.play(ctx);
  while (!state.over && turns.length < budget) {
    const next = gen.next();
    if (next.done) break;
    const r = step(p, sw, state, next.value);
    state = r.state;
    turns.push({ input: next.value, text: r.text, events: r.events });
  }
  return { id: bot.id, turns, state };
}
