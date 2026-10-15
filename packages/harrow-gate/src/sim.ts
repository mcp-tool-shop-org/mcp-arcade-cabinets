// The town. A pure simulation: step(state, input) returns a new state, the
// text the player sees, and the events that happened. The events are the
// answer key; they never reach the screen. Same seed, same inputs, same run.
//
// Every calibration switch keeps the meaning it has in ai-playtest's
// calibration/game.mjs, and the events carry the same names, so its answer
// key grades a run here unchanged. The rest of the town is new: people with
// topics, a side quest, tokens, fights, a riddle door and system verbs, so a
// play style has something to move.

import type { Direction, Patterns, State, StepResult, Switches } from './types';
import { parse } from './parse';
import { ROAD } from './patterns';

// ── small helpers ────────────────────────────────────────────────────────────

/** mulberry32, stepped on the state so a run replays exactly. */
function draw(s: State): number {
  s.rng = (s.rng + 0x6d2b79f5) >>> 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function line(p: Patterns, key: string, vars: Record<string, string | number> = {}): string {
  let v: unknown = p.text;
  for (const part of key.split('.')) v = (v as Record<string, unknown> | undefined)?.[part];
  if (typeof v !== 'string') throw new Error(`text.json has no line "${key}"`);
  return v.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

/** A refusal: the town answered, and nothing changed. The event is the answer key for rejected input. */
function fail(
  p: Patterns,
  ev: string[],
  key: string,
  vars: Record<string, string | number> = {},
): string {
  ev.push('rejected');
  return line(p, key, vars);
}

function clone(s: State): State {
  return JSON.parse(JSON.stringify(s)) as State;
}

export function switchesFor(
  p: Patterns,
  preset = 'baseline',
  overrides: Partial<Switches> = {},
): Switches {
  const named = p.switches.presets[preset];
  if (!named)
    throw new Error(
      `unknown preset ${preset}; known: ${Object.keys(p.switches.presets).join(', ')}`,
    );
  return { ...p.switches.defaults, ...named, ...overrides };
}

// ── a new game ───────────────────────────────────────────────────────────────

export function newGame(p: Patterns, seed = 1): State {
  const ground: Record<string, string[]> = {};
  const pack: string[] = [];
  for (const [id, item] of Object.entries(p.items.items)) {
    if (item.start) pack.push(id);
    if (item.at) (ground[item.at] ??= []).push(id);
  }
  return {
    place: p.town.start,
    prev: p.town.start,
    turn: 0,
    hour: p.clock.startHour,
    hp: p.foes.player.hp,
    coin: p.items.coins,
    oil: p.items.oil,
    lit: false,
    pack,
    ground,
    visits: { [p.town.start]: 1 },
    lastText: {},
    asked: {},
    given: [],
    paid: [],
    defeated: [],
    sparWins: 0,
    fight: null,
    riddleOpen: false,
    questsDone: [],
    stuck: false,
    over: false,
    won: false,
    rng: seed >>> 0,
    saved: null,
  };
}

/** The opening screen. Records the start place as seen, so a return can be compared with it. */
export function intro(p: Patterns, sw: Switches, state: State): { state: State; text: string } {
  const s = clone(state);
  const goal = sw.goal === 'stated' ? `${line(p, 'goal')}\n\n` : '';
  const first = describe(p, sw, s);
  s.lastText[s.place] = first;
  return { state: s, text: `${line(p, 'title')}\n\n${goal}${first}${promptBlock(p, sw, s)}` };
}

// ── what the player sees ─────────────────────────────────────────────────────

function peopleHere(p: Patterns, place: string): string[] {
  return Object.entries(p.people.people)
    .filter(([, person]) => person.at === place)
    .map(([id]) => id);
}

function foeHere(p: Patterns, s: State): string | null {
  const found = Object.entries(p.foes.foes).find(
    ([id, foe]) => foe.at === s.place && !(foe.once && s.defeated.includes(id)),
  );
  return found ? found[0] : null;
}

function inDark(p: Patterns, sw: Switches, s: State): boolean {
  return Boolean(p.town.places[s.place]!.dark) && sw.choiceCost && !s.lit;
}

function visibleItems(p: Patterns, sw: Switches, s: State): string[] {
  const dark = inDark(p, sw, s);
  return (s.ground[s.place] ?? []).filter((id) => !(dark && p.items.items[id]!.dark));
}

function marketLine(p: Patterns, sw: Switches, s: State): string {
  if (!sw.worldMoves) return '';
  const span = p.clock.closingHour - p.clock.startHour;
  const at = (s.hour - p.clock.startHour) / span;
  return line(p, at < 0.34 ? 'market.early' : at < 0.67 ? 'market.middle' : 'market.late');
}

export function describe(p: Patterns, sw: Switches, s: State): string {
  const place = p.town.places[s.place]!;
  if (s.stuck) return line(p, 'stuckPlace');
  const seen = s.visits[s.place] ?? 1;
  let text = sw.descriptions === 'varied' && seen > 1 ? place.text[1] : place.text[0];
  if (s.place === 'market') text += marketLine(p, sw, s);
  if (inDark(p, sw, s)) text += line(p, 'dark');
  for (const id of visibleItems(p, sw, s)) {
    const shown = p.items.items[id]!.shown;
    if (shown) text += ` ${shown}`;
  }
  const people = peopleHere(p, s.place).map((id) => p.people.people[id]!.name);
  if (people.length > 0)
    text += ` ${people.join(' and ')} ${people.length === 1 ? 'is' : 'are'} here.`;
  const foe = foeHere(p, s);
  if (foe && !p.foes.foes[foe]!.spar) text += ` ${capital(p.foes.foes[foe]!.name)} lurk here.`;
  return text;
}

function capital(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function promptBlock(p: Patterns, sw: Switches, s: State): string {
  if (sw.prompt === 'bare') return '\n> ';
  const place = p.town.places[s.place]!;
  const exits = s.stuck
    ? 'none'
    : Object.entries(place.exits)
        .map(([dir, to]) => {
          const name = to === ROAD ? 'the west road' : p.town.places[to]!.name;
          const lock = place.locks?.[dir as Direction];
          const shut = (lock && !s.pack.includes(lock)) || (place.riddle === dir && !s.riddleOpen);
          return `${dir} (${name}${shut ? ', shut' : ''})`;
        })
        .join(', ');
  const lamp = sw.choiceCost ? `light lamp (oil left: ${s.oil}), ` : '';
  return `\nExits: ${exits}.\nYou can type: look, go <direction>, examine <thing>, take <thing>, talk to <someone>, ask <someone> about <topic>, ${lamp}help, quit.\nWhat do you do? `;
}

// ── the clock ────────────────────────────────────────────────────────────────

/** Move the town on by whole hours. The bell tolls each one; the last bars the gate. */
function advanceHours(p: Patterns, sw: Switches, s: State, hours: number, ev: string[]): string {
  if (!sw.worldMoves) return '';
  let out = '';
  for (let i = 0; i < hours && !s.over; i++) out += ringHour(p, s, ev);
  return out;
}

function ringHour(p: Patterns, s: State, ev: string[]): string {
  s.hour += 1;
  ev.push('tick');
  const name = p.clock.hourNames[Math.min(s.hour, p.clock.closingHour)] ?? String(s.hour);
  if (s.hour >= p.clock.closingHour) {
    s.over = true;
    ev.push('lose');
    return `\n${line(p, 'lose', { hour: name })}`;
  }
  return `\n${line(p, 'toll', { hour: name })}`;
}

/** The turn clock: every turnsPerHour inputs, an hour passes. */
function tick(p: Patterns, sw: Switches, s: State, ev: string[]): string {
  if (!sw.worldMoves || s.over) return '';
  if (s.turn % p.clock.turnsPerHour !== 0) return '';
  return ringHour(p, s, ev);
}

// ── a step ───────────────────────────────────────────────────────────────────

export function step(p: Patterns, sw: Switches, state: State, raw: string): StepResult {
  const s = clone(state);
  const ev: string[] = [];
  if (s.over) return { state: s, text: '', events: [] };
  const input = String(raw).trim().toLowerCase();
  s.turn += 1;
  let out: string;
  if (input === 'quit') {
    s.over = true;
    ev.push('quit');
    out = line(p, 'quit');
  } else if (!sw.reacts) {
    ev.push('ignored');
    out = line(p, 'deaf');
  } else {
    out = act(p, sw, s, input, ev);
  }
  if (s.stuck) ev.push('stuck');
  out += tick(p, sw, s, ev);
  return { state: s, text: s.over ? out : `${out}${promptBlock(p, sw, s)}`, events: ev };
}

function act(p: Patterns, sw: Switches, s: State, input: string, ev: string[]): string {
  const c = parse(input, p.verbs);
  if (s.fight && c.verb === 'go') return flee(p, s, ev);
  switch (c.verb) {
    case 'go':
      return move(p, sw, s, c.dir ?? dirToPlace(p, s, c.rest), ev);
    case 'look':
      return c.rest && c.rest !== 'around' ? examine(p, sw, s, c.rest, ev) : describe(p, sw, s);
    case 'examine':
      return examine(p, sw, s, c.rest, ev);
    case 'take':
      return take(p, sw, s, c.rest, ev);
    case 'talk':
      return talk(p, s, c.rest, ev);
    case 'ask':
      return ask(p, s, c.rest, ev);
    case 'give':
      return give(p, s, c.rest, ev);
    case 'buy':
      return buy(p, s, c.rest, ev);
    case 'light':
      return light(p, sw, s, ev);
    case 'fight':
    case 'spar':
      return startFight(p, sw, s, c.verb === 'spar' ? 'brask' : c.rest, ev);
    case 'attack':
      return s.fight ? round(p, sw, s, false, ev) : startFight(p, sw, s, c.rest, ev);
    case 'defend':
      return s.fight ? round(p, sw, s, true, ev) : fail(p, ev, 'notFighting');
    case 'flee':
      return s.fight ? flee(p, s, ev) : fail(p, ev, 'notFighting');
    case 'rest':
      return rest(p, sw, s, ev);
    case 'wait':
      return line(p, 'wait');
    case 'answer':
      return answer(p, sw, s, c.rest, ev);
    case 'inventory':
      ev.push('inventory');
      return inventory(p, s);
    case 'status':
      ev.push('status');
      return status(p, sw, s);
    case 'map':
      ev.push('map');
      return map(p, s);
    case 'journal':
      ev.push('journal');
      return journal(p, sw, s);
    case 'help':
      ev.push('help');
      return line(p, 'help');
    case 'hint':
      ev.push('hint');
      return hint(p, sw, s);
    case 'save':
      ev.push('save');
      s.saved = snapshot(s);
      return line(p, 'saved');
    case 'load':
      return load(p, sw, s, ev);
    default:
      ev.push('unknown-command');
      return fail(p, ev, 'unknown');
  }
}

function dirToPlace(p: Patterns, s: State, name: string): Direction | undefined {
  const exits = p.town.places[s.place]!.exits;
  const hit = Object.entries(exits).find(
    ([, to]) => to === name || (to !== ROAD && p.town.places[to]!.name.endsWith(name)),
  );
  return hit?.[0] as Direction | undefined;
}

// ── moving ───────────────────────────────────────────────────────────────────

function move(
  p: Patterns,
  sw: Switches,
  s: State,
  dir: Direction | undefined,
  ev: string[],
): string {
  if (s.stuck) return fail(p, ev, 'stuck');
  const place = p.town.places[s.place]!;
  const to = dir ? place.exits[dir] : undefined;
  if (!dir || !to) return fail(p, ev, 'noExit');
  const lock = place.locks?.[dir];
  if (lock && !s.pack.includes(lock)) {
    ev.push('locked', 'rejected');
    return line(p, 'locked', { dir, item: p.items.items[lock]!.name });
  }
  if (place.riddle === dir && !s.riddleOpen) {
    ev.push('riddle');
    return line(p, 'riddle');
  }
  if (to === ROAD) return leave(p, sw, s, ev);
  s.prev = s.place;
  s.place = to;
  s.lit = false;
  s.visits[to] = (s.visits[to] ?? 0) + 1;
  if (s.visits[to]! > 1) ev.push('revisit');
  if (to === 'cellar' && sw.deadEnd) {
    s.stuck = true;
    ev.push('dead-end');
    return `${shown(p, sw, s, ev)}\n${line(p, 'trapdoor')}`;
  }
  return shown(p, sw, s, ev);
}

/** The road out. Through the gatehouse the warden wants the seal; off the wall walk, nobody asks. */
function leave(p: Patterns, sw: Switches, s: State, ev: string[]): string {
  if (s.place !== 'gatehouse') {
    s.over = true;
    s.won = true;
    ev.push('shortcut', 'win');
    return line(p, 'win.shortcut');
  }
  const hasSeal = s.pack.includes('seal');
  if (sw.refusal !== 'none' && !hasSeal) {
    ev.push(`refusal:${sw.refusal}`);
    return line(p, `refusal.${sw.refusal}`);
  }
  s.over = true;
  s.won = true;
  ev.push('win');
  return line(p, hasSeal ? 'win.seal' : 'win.open');
}

/**
 * Describe the place on arrival and record whether it reads differently from
 * the last time it was shown: measured from the text itself, because a place
 * can change two ways, a varied description on a return visit or the hour.
 */
function shown(p: Patterns, sw: Switches, s: State, ev: string[]): string {
  const text = describe(p, sw, s);
  const before = s.lastText[s.place];
  if (before !== undefined && before !== text) ev.push('changed-on-return');
  s.lastText[s.place] = text;
  return text;
}

// ── things ───────────────────────────────────────────────────────────────────

function findItem(p: Patterns, ids: string[], words: string): string | undefined {
  if (!words) return undefined;
  return ids.find(
    (id) => id === words || p.items.items[id]!.name.includes(words) || id.endsWith(words),
  );
}

function examine(p: Patterns, sw: Switches, s: State, words: string, ev: string[]): string {
  if (!words) return describe(p, sw, s);
  ev.push('examine');
  const place = p.town.places[s.place]!;
  const thing = place.things.find((t) => t === words || t.includes(words) || words.includes(t));
  if (thing) {
    const items = visibleItems(p, sw, s)
      .map((id) => p.items.items[id]!.shown)
      .filter(Boolean);
    const extra = items.length > 0 ? ` ${items.join(' ')}` : '';
    return `You look closely at the ${thing}.${inDark(p, sw, s) ? line(p, 'dark') : extra || ' Nothing more to see.'}`;
  }
  const item = findItem(p, [...s.pack, ...visibleItems(p, sw, s)], words);
  if (item) return `It is ${p.items.items[item]!.name}.`;
  const person = personHere(p, s, words);
  if (person) return p.people.people[person]!.greet;
  return fail(p, ev, 'nothingThere');
}

function take(p: Patterns, sw: Switches, s: State, words: string, ev: string[]): string {
  const here = s.ground[s.place] ?? [];
  const item = findItem(p, here, words);
  if (!item) {
    if (findItem(p, s.pack, words)) return fail(p, ev, 'already');
    return fail(p, ev, 'takeNone', { thing: words || 'such thing' });
  }
  if (inDark(p, sw, s) && p.items.items[item]!.dark) return fail(p, ev, 'takeDark');
  s.ground[s.place] = here.filter((id) => id !== item);
  s.pack.push(item);
  ev.push(`took:${item}`);
  if (p.items.items[item]!.token) ev.push('token');
  if (item === 'seal') ev.push('took-seal');
  return line(p, 'taken', { item: p.items.items[item]!.name });
}

function light(p: Patterns, sw: Switches, s: State, ev: string[]): string {
  if (!sw.choiceCost) return fail(p, ev, 'noLamp');
  if (s.oil <= 0) return fail(p, ev, 'dry');
  s.oil -= 1;
  s.lit = true;
  ev.push('cost');
  return (
    line(p, 'lit', { oil: s.oil }) + (p.town.places[s.place]!.dark ? line(p, 'litArchive') : '')
  );
}

function inventory(p: Patterns, s: State): string {
  const names = s.pack.map((id) =>
    id === 'lamp' ? `a lamp (oil: ${s.oil})` : p.items.items[id]!.name,
  );
  return `You carry ${names.length > 0 ? names.join(', ') : 'nothing'}, and ${s.coin} coin${s.coin === 1 ? '' : 's'}.`;
}

function status(p: Patterns, sw: Switches, s: State): string {
  const clock = sw.worldMoves ? ` The bell last rang ${p.clock.hourNames[s.hour] ?? s.hour}.` : '';
  return `Health ${s.hp} of ${p.foes.player.hp}. Coins ${s.coin}. Lamp oil ${s.oil}.${clock}`;
}

function map(p: Patterns, s: State): string {
  const known = Object.keys(s.visits).map((id) => p.town.places[id]!.name);
  return `Places you know: ${known.join(', ')}.`;
}

function journal(p: Patterns, sw: Switches, s: State): string {
  const parts: string[] = [];
  parts.push(sw.goal === 'stated' ? line(p, 'goal') : 'You have no particular aim.');
  if ((s.asked.pell ?? []).includes('locket') && !s.questsDone.includes('locket'))
    parts.push('Pell lost a locket down the well.');
  if (s.questsDone.includes('locket')) parts.push("You found Pell's locket.");
  const tokens = s.pack.filter((id) => p.items.items[id]!.token).length;
  const total = Object.values(p.items.items).filter((i) => i.token).length;
  if (tokens > 0) parts.push(`Carved tokens found: ${tokens} of ${total}.`);
  return parts.join(' ');
}

function hint(p: Patterns, sw: Switches, s: State): string {
  if (sw.goal !== 'stated') return line(p, 'hints.none');
  if (s.pack.includes('seal')) return line(p, 'hints.gate');
  if (!s.pack.includes('archive key')) return line(p, 'hints.key');
  if (s.place === 'archive' && inDark(p, sw, s)) return line(p, 'hints.dark');
  return line(p, 'hints.seal');
}

function snapshot(s: State): string {
  return JSON.stringify({ ...s, saved: null });
}

function load(p: Patterns, sw: Switches, s: State, ev: string[]): string {
  if (!s.saved) return fail(p, ev, 'noSave');
  const restored = JSON.parse(s.saved) as State;
  const turn = s.turn;
  const saved = s.saved;
  Object.assign(s, restored, { turn, saved });
  ev.push('load');
  return `${line(p, 'loaded')}\n${describe(p, sw, s)}`;
}

// ── people ───────────────────────────────────────────────────────────────────

function personHere(p: Patterns, s: State, words: string): string | undefined {
  const here = peopleHere(p, s.place);
  if (!words) return here.length === 1 ? here[0] : undefined;
  return here.find((id) =>
    p.people.people[id]!.aliases.some((a) => words === a || words.includes(a)),
  );
}

function talk(p: Patterns, s: State, words: string, ev: string[]): string {
  const id = personHere(p, s, words);
  if (!id) return fail(p, ev, 'nobody');
  const person = p.people.people[id]!;
  ev.push(`talk:${id}`);
  return `${person.greet} ${line(p, 'topicsHint', { topics: Object.keys(person.topics).join(', ') })}`;
}

function ask(p: Patterns, s: State, words: string, ev: string[]): string {
  const m = /^(.*?)\s+about\s+(.+)$/.exec(words);
  const who = m ? m[1]! : '';
  const topicWords = m ? m[2]! : words;
  const id = personHere(p, s, who);
  if (!id) return fail(p, ev, 'nobody');
  const person = p.people.people[id]!;
  const topic = Object.keys(person.topics).find(
    (t) => topicWords === t || topicWords.includes(t) || t.includes(topicWords),
  );
  if (!topic) return fail(p, ev, 'noTopic', { name: person.name });
  const asked = (s.asked[id] ??= []);
  const again = asked.includes(topic);
  if (!again) asked.push(topic);
  ev.push(`ask:${id}:${topic}`);
  let out = `${person.name}: "${again ? p.people.again : ''}${person.topics[topic]!}"`;
  const gift = person.gives?.[topic];
  if (gift && !s.pack.includes(gift) && !s.given.includes(gift)) {
    s.pack.push(gift);
    s.given.push(gift);
    ev.push(`got:${gift}`);
    out += ` You now have ${p.items.items[gift]!.name}.`;
  }
  const pay = person.pays?.[topic];
  const payKey = `${id}:${topic}`;
  if (pay && s.defeated.includes(pay.after) && !s.paid.includes(payKey)) {
    s.coin += pay.coin;
    s.paid.push(payKey);
    ev.push('paid');
    out += ` ${person.name} presses ${pay.coin} coins into your hand.`;
  }
  return out;
}

function give(p: Patterns, s: State, words: string, ev: string[]): string {
  const m = /^(.*?)\s+to\s+(.+)$/.exec(words);
  const item = findItem(p, s.pack, m ? m[1]! : words);
  if (!item) return fail(p, ev, 'giveNone');
  const id = personHere(p, s, m ? m[2]! : '');
  if (!id) return fail(p, ev, 'nobody');
  const quest = Object.entries(p.items.quests).find(
    ([qid, q]) => q.giver === id && q.wants === item && !s.questsDone.includes(qid),
  );
  if (!quest) return fail(p, ev, 'giveNo', { name: p.people.people[id]!.name });
  const [qid, q] = quest;
  s.pack = s.pack.filter((x) => x !== item);
  s.coin += q.coin;
  s.questsDone.push(qid);
  ev.push(`gave:${item}`, `quest:${qid}`);
  return q.reply;
}

function buy(p: Patterns, s: State, words: string, ev: string[]): string {
  const here = new Set(peopleHere(p, s.place));
  const entry = Object.entries(p.items.items).find(
    ([id, item]) =>
      item.seller &&
      here.has(item.seller) &&
      (id === words || item.name.includes(words) || id.endsWith(words)),
  );
  if (!entry || !words) return fail(p, ev, 'buyNone');
  const [id, item] = entry;
  if (s.pack.includes(id)) return fail(p, ev, 'already');
  if (s.coin < item.price!) return fail(p, ev, 'buyPoor', { price: item.price!, coin: s.coin });
  s.coin -= item.price!;
  s.pack.push(id);
  ev.push(`bought:${id}`);
  return line(p, 'bought', { item: item.name, coin: s.coin });
}

// ── fights ───────────────────────────────────────────────────────────────────

function startFight(p: Patterns, sw: Switches, s: State, words: string, ev: string[]): string {
  const id = foeHere(p, s);
  const foe = id ? p.foes.foes[id] : undefined;
  if (!id || !foe) {
    const done = Object.entries(p.foes.foes).some(
      ([fid, f]) => f.at === s.place && s.defeated.includes(fid),
    );
    return fail(p, ev, done ? 'fightDone' : 'fightNone');
  }
  const named = foe.name.toLowerCase();
  if (
    words &&
    !named.includes(words) &&
    !id.includes(words) &&
    !(foe.spar && p.people.people[id]?.aliases.some((a) => words.includes(a)))
  ) {
    return line(p, 'fightNone');
  }
  s.fight = { foe: id, hp: foe.hp };
  ev.push(foe.spar ? 'spar' : 'fight');
  return `${line(p, 'fightStart', { foe: foe.name })} ${round(p, sw, s, false, ev)}`;
}

function attackPower(p: Patterns, s: State): number {
  const pl = p.foes.player;
  return pl.attack + Math.min(pl.bonusMax, Math.floor(s.sparWins / pl.bonusEvery));
}

function round(p: Patterns, sw: Switches, s: State, defending: boolean, ev: string[]): string {
  const fight = s.fight!;
  const foe = p.foes.foes[fight.foe]!;
  let out = defending ? line(p, 'defend') : '';
  if (!defending) {
    fight.hp -= attackPower(p, s);
    ev.push('hit');
    out += line(p, 'hit', { foe: foe.name });
  }
  if (fight.hp <= 0) {
    s.fight = null;
    if (foe.spar) {
      s.sparWins += 1;
      ev.push('spar-won');
      out += line(p, 'sparWon');
      if (s.sparWins <= (foe.paidWins ?? 0)) {
        s.coin += foe.pay ?? 0;
        out += line(p, 'sparPaid');
      }
      return out;
    }
    if (foe.once) s.defeated.push(fight.foe);
    ev.push('defeated');
    return out + line(p, 'won', { foe: foe.name });
  }
  let dmg = foe.min + Math.floor(draw(s) * (foe.max - foe.min + 1));
  if (defending) dmg = Math.floor(dmg / 2);
  s.hp -= dmg;
  out +=
    dmg > 0
      ? line(p, 'foeHits', { foe: capital(foe.name), dmg })
      : line(p, 'foeMisses', { foe: capital(foe.name) });
  if (foe.spar && s.hp <= (foe.yield ?? 0)) {
    s.fight = null;
    ev.push('spar-lost');
    return out + line(p, 'sparLost');
  }
  if (s.hp <= 0) {
    s.fight = null;
    s.hp = p.foes.player.hp;
    s.prev = s.place;
    s.place = 'inn';
    s.lit = false;
    s.visits.inn = (s.visits.inn ?? 0) + 1;
    ev.push('knocked-out');
    return out + line(p, 'knockedOut') + advanceHours(p, sw, s, p.foes.knockoutHours, ev);
  }
  return out.trimEnd();
}

function flee(p: Patterns, s: State, ev: string[]): string {
  const foe = p.foes.foes[s.fight!.foe]!;
  s.fight = null;
  ev.push('fled');
  if (s.prev !== s.place && !s.stuck) {
    const from = s.place;
    s.place = s.prev;
    s.prev = from;
    s.visits[s.place] = (s.visits[s.place] ?? 0) + 1;
  }
  return line(p, 'fled', { foe: foe.name });
}

function rest(p: Patterns, sw: Switches, s: State, ev: string[]): string {
  if (s.place !== 'inn') return fail(p, ev, 'restWhere');
  if (s.coin < p.clock.restCoin) return fail(p, ev, 'restPoor');
  s.coin -= p.clock.restCoin;
  s.hp = p.foes.player.hp;
  ev.push('rest');
  return line(p, 'rest') + advanceHours(p, sw, s, 1, ev);
}

function answer(p: Patterns, sw: Switches, s: State, words: string, ev: string[]): string {
  const place = p.town.places[s.place]!;
  if (!place.riddle || s.riddleOpen) return fail(p, ev, 'noRiddle');
  if (words.split(' ').includes(line(p, 'riddleAnswer'))) {
    s.riddleOpen = true;
    ev.push('riddle:right');
    return line(p, 'riddleRight');
  }
  ev.push('riddle:wrong');
  return line(p, 'riddleWrong') + advanceHours(p, sw, s, 1, ev);
}
