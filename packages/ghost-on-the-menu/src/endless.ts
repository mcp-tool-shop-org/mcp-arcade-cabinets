// Endless (slice E1, lock G31–G35): a run of calls with no end but the last
// lamp. The shift is a task list of four; endless is the shift that never
// finishes, so the lamps become a life pool, the climb keeps climbing to a
// stated ceiling, and the run earns a score — the game's number, never the
// tape's (G35).
//
// This module is headless and knows nothing about a seat, a shell or a voice.
// It takes a roster of loaded tapes and a bot, and it plays rounds through
// the same `prepassRound` → `createRoundState` → `stepRound` path the
// acceptance play-through uses. The seat that will pick off the menu in E2
// is stood in for here by a seeded pick, which is also the fallback forever
// (`endless.json: seat.fallback`).
//
// Nothing here reads a receipt or a fact (G1). What a menu candidate is
// named by is header text — the server, the policy, the tape's own derived
// tier and how much it said on the wire — and every line this module writes
// for a screen goes through the shared strip first.

import type { Tape } from '@mcp-arcade-cabinets/tape-core';

import {
  CLIMB_MAX,
  copiesAt,
  DEFAULT_PATTERNS,
  deriveTier,
  intensityAt,
  rungWord,
  type LineBags,
  type PatternSet,
  type Tier,
} from './patterns';
import { prepassRound } from './prepass';
import { createRoundState, stepRound, watchSaid } from './sim';
import {
  CHECK_SPACE,
  codeWords,
  DIFFICULTIES,
  hashWords,
  rosterCheck,
  seededRandom,
  valueFromWords,
  wordsFromValue,
} from './shift';
import {
  SCREEN_FORBIDDEN,
  sanitizeCaption,
  type Flavor,
  type FlavorRole,
  type Round,
  type RoundInput,
  type RoundState,
} from './types';

/** Frames a second, the same step the scripted play-through takes. */
const DT = 1 / 30;
/** Words a code carries: the four a shift carries, plus one for the seed. */
const CODE_WORDS = 5;
/** Seeds a code can name; the rest of a clock reading is dropped at draw time. */
export const SEED_SPACE = 2 ** 24;
/** How many calls a run may take before the runner stops asking. Never a bar. */
export const CALLS_MAX = 400;

/** One tape on the roster, by the name the fixture is known as. */
export interface EndlessTape {
  name: string;
  tape: Tape;
}

export type DensityBand = 'thin' | 'even' | 'thick';

/** A tape on the menu, named by header words only. Never a fact (G32). */
export interface EndlessCandidate {
  name: string;
  /**
   * The name as a screen may show it: stripped, and made distinct against the
   * rest of this menu. The strip replaces every needle with a space and a
   * digit is a needle, so two mounted tapes called `run-1` and `run-2` both
   * rendered as the same row and a name that was all digits rendered as
   * nothing at all. The pick is still resolved on `name`; this is what a
   * reader — and, from G32, a seat picking BY NAME off this menu — sees.
   */
  display: string;
  /** Index into the flavor list; the flavor this candidate would be played with. */
  flavorIndex: number;
  role: FlavorRole;
  band: DensityBand;
  /** The tape's own tier, from its header. Not the tier the run plays at. */
  tapeTier: Tier;
  /** Header words for the menu: the server, the policy, the band. Stripped. */
  header: string[];
}

/** One call as it is drawn, before it is played. A pure function of seed and history. */
export interface EndlessPlanCall {
  index: number;
  /** The call's place in words: "the first call", "the ninth call". */
  place: string;
  breather: boolean;
  /** How far up the climb, 0 (the tape alone) to 2 (the ceiling). */
  reach: number;
  /** The fraction of the tape-alone reach this call plays at. One past the opening band. */
  approach: number;
  /** The climb step in words. No digit. */
  reachWord: string;
  flavorIndex: number;
  role: FlavorRole;
  candidates: EndlessCandidate[];
  pick: EndlessCandidate;
  /** True when the seeded pick stood in for a seat. Always true in this slice. */
  seeded: boolean;
  /** The boss's line as the call opens. The seat writes it in E2. */
  tell: string | null;
}

/** What one played call did. Time is not among it: time is never scored (G35). */
export interface EndlessCall extends EndlessPlanCall {
  /** The tier the round was actually played at: the run's difficulty. */
  tier: Tier;
  catches: number;
  drops: number;
  bosses: number;
  lampsLost: number;
  /** Times a lost lamp put the chain back to one link. */
  chainResets: number;
  clean: boolean;
  lampsBack: number;
  /** Lamps in the pool as the call opened, before it was played. */
  lampsBefore: number;
  /** Lamps in the pool when the call ended, the refill included. */
  lamps: number;
  chainEnd: number;
  chainWord: string;
  /** The chain's value banked at the call's end. */
  banked: number;
  /** Everything this call paid, banking included. */
  points: number;
  ended: 'time' | 'lamps' | null;
  /** Most hazards alive at once during the call, against the tier's ceiling. */
  hazardPeak: number;
  /** Copies and intensity the round's own climb asked for, against the ceiling. */
  copiesPeak: number;
  intensityPeak: number;
  /** What the round said, in order: the cards, the catches, the asides, the scene. */
  said: { at: number; kind: string; text: string }[];
}

/** The three lines the closing scene shows beside the run's word (G35). */
export interface EndlessLines {
  /** Catches and the drops that fed the chain. */
  catches: number;
  bosses: number;
  /** What the calls banked at their ends. */
  calls: number;
}

export interface EndlessRun {
  /** The seed the draw came off, already inside the code's space. */
  seed: number;
  /** The difficulty the run was taken at; the rank table and the lamps read it. */
  difficulty: Tier;
  calls: EndlessCall[];
  score: number;
  lines: EndlessLines;
  /** The run's word from the rank table. */
  rank: string;
  /** Five words: the seed, the difficulty and a check of the roster. */
  code: string;
  lamps: number;
  /** The lamp pool this run was taken with; the bezel's length. */
  pool: number;
  ended: 'lamps' | 'calls';
}

export interface EndlessOpts {
  seed: number;
  /** The difficulty the whole run is taken at. The shell's picker sets it. */
  tier?: Tier;
  /** How many calls the runner will offer before it stops. The lamps usually end it first. */
  calls?: number;
  patterns?: PatternSet;
}

export interface EndlessRunOpts extends EndlessOpts {
  /** The bot for a round, as `botFor(name, round)` gives it. */
  bot: (round: Round) => (state: RoundState) => RoundInput;
  /**
   * The voice pools' bags for the WHOLE run. Endless is the mode a player
   * sits in longest and it used to start fresh bags on every call: forty
   * calls of four waves is about a hundred and sixty wave-card draws out of
   * pools of thirty-one, each call restarting the walk, so the Director's
   * rule that a line is not heard again until its pool has been heard held
   * inside one round and was abandoned across the run. A caller that already
   * owns a bag store (the shell, across a session) hands its own in; absent,
   * the run makes one and keeps it.
   */
  bags?: LineBags;
}

/** What a run refuses when it is asked for at the gentlest rung. */
export const ENDLESS_NO_TIER_ZERO = `endless: the ${rungWord(0)} rung cannot take a last lamp, so a run there would never end; start at ${rungWord(1)}`;

/** What a run refuses when a tape on the roster has no name a screen can show. */
export const ENDLESS_NAMELESS_TAPE =
  'endless: a tape on the roster has no name the screen can show';

/**
 * The difficulty an endless run is taken at when the picker says nothing.
 * Live, measured: the gentlest rung can take no lamp at all, so a run there
 * only ever ends when the caller stops asking, and the seat rung is harsher
 * than live rather than gentler (its bursts already sit near the mover's
 * ceiling alone). Live is the rung where a run both climbs and ends.
 */
export const DEFAULT_DIFFICULTY: Tier = 2;

const PLACES = [
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
  'eleventh',
  'twelfth',
];

/** The highest step in a word ladder this call index has reached, or null. */
function stepWord(steps: readonly { at: number; word: string }[], index: number): string | null {
  let word: string | null = null;
  for (const step of steps) if (index >= step.at) word = step.word;
  return word;
}

/**
 * The call's place in words. Past the named ordinals it climbs the lever'd
 * ladder in endless.json rather than saturating at one constant: a run of
 * fifty calls used to read, in words, exactly like a run of thirteen.
 */
export function placeWord(index: number, set: PatternSet = DEFAULT_PATTERNS): string {
  const word = PLACES[index];
  if (word) return `the ${word} call`;
  return stepWord(set.endless.progress.places, index) ?? 'another call';
}

/**
 * The reach's word once the climb is at its ceiling: the second word ladder,
 * so 'the ceiling itself' stops being the last thing the run ever says.
 */
export function beyondWord(index: number, set: PatternSet = DEFAULT_PATTERNS): string {
  return stepWord(set.endless.progress.beyond, index) ?? 'the ceiling itself';
}

/**
 * A breather's own word for the climb. The trough flavor's telegraph already
 * says the call is a rest, and the header carried the same phrase again in
 * this slot and a third time in 'no return fire'; the climb being HELD is a
 * different thing to say than the call being restful.
 */
export const BREATHER_REACH = 'the climb is held where it was';

/**
 * How much a tape said on the wire, as a band. Header-shaped: it counts rows,
 * which is the same thing the prepass counts, and reads no fact.
 */
export function densityBand(tape: Tape, set: PatternSet = DEFAULT_PATTERNS): DensityBand {
  const [low, high] = set.endless.menu.bands;
  const rows = tape.rows.length;
  if (rows < low) return 'thin';
  if (rows < high) return 'even';
  return 'thick';
}

/**
 * How far up the climb call `index` sits: flat on the tape-alone reach for
 * the opening band (Galante: density held low for an opening stretch), then
 * one step a call, and never past the ceiling (the NES Tetris kill screen:
 * an unbounded curve hits its limit by accident and reads as broken).
 */
export function reachAt(index: number, set: PatternSet = DEFAULT_PATTERNS): number {
  const { openingCalls, stepPerCall } = set.endless.climb;
  const steps = index - openingCalls + 1;
  if (steps <= 0) return 0;
  return Math.min(CLIMB_MAX, steps * stepPerCall);
}

/**
 * How much of the tape-alone reach the opening band plays at: the lever's
 * fraction on the first call, rising straight to one by the band's last, and
 * one for every call after it. This is endless's own band and it relaxes no
 * bar: the tape-alone bars and the shift bar are measured on the shipped
 * pattern set, where this fraction does not exist.
 */
export function approachAt(index: number, set: PatternSet = DEFAULT_PATTERNS): number {
  const { openingCalls, approach } = set.endless.climb;
  if (index >= openingCalls - 1) return 1;
  if (openingCalls <= 1) return 1;
  return approach + (1 - approach) * (index / (openingCalls - 1));
}

/** The climb step in words. The field and the bezel carry no digit (G7). */
export function reachWord(reach: number, approach = 1): string {
  if (reach <= 0) {
    if (approach < 1) return 'gentler than the tape alone';
    return 'the tape as it stands';
  }
  if (reach < 0.34) return 'a little more of everything';
  if (reach < 0.67) return 'the middle of a shift';
  if (reach < 1) return 'near the top of a shift';
  if (reach === 1) return 'the full reach of a shift';
  if (reach < 1.5) return 'past anything a shift asks';
  if (reach < CLIMB_MAX) return 'near the ceiling';
  return 'the ceiling itself';
}

/** A breather call: scheduled by count, independent of the climb (G33). */
export function isBreather(index: number, set: PatternSet = DEFAULT_PATTERNS): boolean {
  return (index + 1) % set.endless.breatherEvery === 0;
}

/** How many times the menu has widened by this call (Dead Cells: novelty gated by progress). */
export function widenStep(index: number, set: PatternSet = DEFAULT_PATTERNS): number {
  let step = 0;
  for (const at of set.endless.menu.widenAt) if (index >= at) step += 1;
  return step;
}

/** The chain's word for this many links. Data, so the lead can rewrite it. */
export function chainWord(chain: number, set: PatternSet = DEFAULT_PATTERNS): string {
  const words = set.endless.chainWords;
  const i = Math.min(words.length - 1, Math.max(0, Math.round(chain) - 1));
  return words[i]!;
}

/** The run's word from the rank table: the highest threshold the score reaches. */
export function rankWord(
  score: number,
  difficulty: 1 | 2 | 3,
  set: PatternSet = DEFAULT_PATTERNS,
): string {
  const table = set.endless.rank[String(difficulty) as '1' | '2' | '3'];
  let word = table[0]!.word;
  for (const step of table) if (score >= step.at) word = step.word;
  return word;
}

const strip = (s: string) => sanitizeCaption(s, '', SCREEN_FORBIDDEN);

function headerWords(entry: EndlessTape, band: DensityBand): string[] {
  const out: string[] = [];
  const name = strip(entry.name);
  if (name) out.push(name);
  const server = strip(entry.tape.server_name ?? entry.tape.target_kind);
  if (server) out.push(`server ${server}`);
  const policy = strip(entry.tape.agent_policy);
  if (policy) out.push(`policy ${policy}`);
  out.push(`${band} on the wire`);
  return out;
}

/** The roster in one seeded order, held for the whole run so the slice widens rather than shuffles. */
function rosterOrder(roster: readonly EndlessTape[], seed: number): EndlessTape[] {
  const rng = seededRandom(hashWords(`${seed}|order`));
  const pool = [...roster];
  const out: EndlessTape[] = [];
  while (pool.length > 0) {
    const j = Math.floor(rng() * pool.length);
    out.push(pool.splice(j, 1)[0]!);
  }
  return out;
}

interface Seen {
  cells: Map<string, number>;
  names: Map<string, number>;
  roles: Map<string, number>;
}

function cellOf(role: FlavorRole, band: DensityBand, tapeTier: Tier): string {
  return `${role}|${band}|${tapeTier}`;
}

/**
 * The menu for one call: `candidates` distinct tapes, each with the flavor it
 * would be played with, chosen to cover the feature space (flavor × density
 * band × the tape's own tier) against what the run has already seen. A
 * generator that optimizes one axis collapses onto the same few outputs
 * (Gravina et al. 2019), so the score here is novelty of the cell first, then
 * of the tape, then of the flavor's role, and a seeded tie-break last.
 */
function menuFor(
  order: readonly EndlessTape[],
  index: number,
  breather: boolean,
  seen: Seen,
  set: PatternSet,
  runSeed: number,
): EndlessCandidate[] {
  const endless = set.endless;
  const flavors = set.shift.flavors;
  const step = widenStep(index, set);
  const steps = endless.menu.widenAt.length + 1;
  const wanted = Math.max(endless.menu.candidates, Math.ceil((order.length * (step + 1)) / steps));
  const slice = order.slice(0, Math.min(order.length, wanted));
  // The flavor list widens with the slice, two roles at the start. A breather
  // is the trough by definition, so its menu offers that role alone.
  const troughIndex = flavors.findIndex((f: Flavor) => f.role === 'trough');
  const flavorIndexes = breather
    ? [troughIndex >= 0 ? troughIndex : 0]
    : flavors.map((_, i) => i).slice(0, Math.min(flavors.length, step + 2));
  const rng = seededRandom(hashWords(`${runSeed}|menu|${index}`));
  const scored = slice.flatMap((entry) => {
    const band = densityBand(entry.tape, set);
    const tapeTier = deriveTier(entry.tape, set.ladder) as Tier;
    return flavorIndexes.map((flavorIndex) => {
      const role = flavors[flavorIndex]!.role;
      const cell = cellOf(role, band, tapeTier);
      return {
        candidate: {
          name: entry.name,
          display: strip(entry.name),
          flavorIndex,
          role,
          band,
          tapeTier,
          header: headerWords(entry, band),
        } satisfies EndlessCandidate,
        cell,
        cellSeen: seen.cells.get(cell) ?? 0,
        nameSeen: seen.names.get(entry.name) ?? 0,
        roleSeen: seen.roles.get(role) ?? 0,
        jitter: rng(),
      };
    });
  });
  scored.sort(
    (a, b) =>
      a.cellSeen - b.cellSeen ||
      a.nameSeen - b.nameSeen ||
      a.roleSeen - b.roleSeen ||
      a.jitter - b.jitter,
  );
  const out: EndlessCandidate[] = [];
  const taken = new Set<string>();
  for (const s of scored) {
    if (taken.has(s.candidate.name)) continue;
    taken.add(s.candidate.name);
    out.push(s.candidate);
    if (out.length >= endless.menu.candidates) break;
  }
  return distinctDisplays(out, set);
}

/**
 * Every row on a menu gets a name no other row on it shares. The strip
 * replaces each needle with a space and a digit is a needle, so `run-1` and
 * `run-2` both came out as the same row. A collision takes a word from the
 * code's own noun list — a word, never a digit — so the two rows are told
 * apart in the grammar the cabinet already speaks. The pick is resolved on
 * the raw name, so nothing about the run changes; only the surface does.
 */
function distinctDisplays(candidates: EndlessCandidate[], set: PatternSet): EndlessCandidate[] {
  const nouns = [...set.shift.words.even, ...set.shift.words.odd];
  const taken = new Set<string>();
  return candidates.map((c, i) => {
    let display = c.display;
    for (let n = 0; taken.has(display) && n <= nouns.length; n++) {
      const noun = nouns[(hashWords(c.name) + i + n) % nouns.length]!;
      display = `${c.display} ${noun}`;
    }
    taken.add(display);
    if (display === c.display) return c;
    // The header's first word IS the name, so it carries the same fix: a
    // header row and a menu row must not disagree about which tape this is.
    const header = [...c.header];
    if (header[0] === c.display) header[0] = display;
    return { ...c, display, header };
  });
}

/**
 * The run's draw, call by call, with no round played: the menu, the seeded
 * pick, the flavor, the climb step and the breathers. A pure function of the
 * seed, the roster and the history, which is what lets the band measure the
 * spread over a hundred runs without playing one.
 */
export function endlessPlan(
  roster: readonly EndlessTape[],
  opts: EndlessOpts & { calls: number },
): EndlessPlanCall[] {
  if (roster.length === 0) throw new Error('endless: empty roster');
  // A name that strips to nothing is refused here rather than at paint: a
  // header row with a server and a policy and no name is not a menu row, and
  // from G32 the seat picks a tape BY NAME off this menu.
  for (const entry of roster) {
    if (strip(entry.name) === '') throw new Error(ENDLESS_NAMELESS_TAPE);
  }
  const set = opts.patterns ?? DEFAULT_PATTERNS;
  const seed = opts.seed % SEED_SPACE;
  const order = rosterOrder(roster, seed);
  const seen: Seen = { cells: new Map(), names: new Map(), roles: new Map() };
  const out: EndlessPlanCall[] = [];
  const count = Math.min(CALLS_MAX, Math.max(0, opts.calls));
  for (let index = 0; index < count; index++) {
    const breather = isBreather(index, set);
    const candidates = menuFor(order, index, breather, seen, set, seed);
    // The seat picks here in E2. The seeded pick stands in, and stays as the
    // fallback when a seat is late, off the menu or refuses (G31, G32).
    const rng = seededRandom(hashWords(`${seed}|pick|${index}`));
    const pick = candidates[Math.floor(rng() * candidates.length)] ?? candidates[0]!;
    const reach = breather ? 0 : reachAt(index, set);
    seen.cells.set(
      cellOf(pick.role, pick.band, pick.tapeTier),
      (seen.cells.get(cellOf(pick.role, pick.band, pick.tapeTier)) ?? 0) + 1,
    );
    seen.names.set(pick.name, (seen.names.get(pick.name) ?? 0) + 1);
    seen.roles.set(pick.role, (seen.roles.get(pick.role) ?? 0) + 1);
    out.push({
      index,
      place: placeWord(index, set),
      breather,
      reach,
      approach: approachAt(index, set),
      reachWord: breather
        ? BREATHER_REACH
        : reach >= CLIMB_MAX
          ? beyondWord(index, set)
          : reachWord(reach, approachAt(index, set)),
      flavorIndex: pick.flavorIndex,
      role: pick.role,
      candidates,
      pick,
      seeded: true,
      tell: null,
    });
  }
  return out;
}

/**
 * The patterns an endless call plays under: the shipped set with this tier's
 * parallelism window lit, because a climb that a tier cannot feel is not a
 * climb. Tier zero ships with the window dark — a tape alone there must not
 * kill the bot that never moves — and it stays dark everywhere but inside
 * this module, so no tape-alone bar and no shift bar changes. At the bottom
 * of the climb the window is still worth nothing (`copies` and `intensity`
 * are one at that tier), so the opening calls play exactly as the tape does
 * alone; the reach is what the run earns.
 */
function endlessPatterns(set: PatternSet, tier: Tier, approach: number): PatternSet {
  const key = String(tier) as '0' | '1' | '2' | '3';
  const spec = set.parallelism.tiers[key];
  const a = Math.min(1, Math.max(0, approach));
  if (spec.enabled && a >= 1) return set;
  // Below one, the opening band's bursts carry fewer copies and fire slower
  // than the tape does alone — the reach is approached from under it rather
  // than started at it. One copy is the floor: that is the original, alone.
  const lower = (n: number) => Math.max(1, n * a);
  return {
    ...set,
    parallelism: {
      tiers: {
        ...set.parallelism.tiers,
        [key]: {
          ...spec,
          enabled: true,
          copies: lower(spec.copies),
          copiesLater: lower(spec.copiesLater),
          copiesShift: lower(spec.copiesShift),
          copiesEndless: lower(spec.copiesEndless),
          intensity: spec.intensity * a,
          intensityLater: spec.intensityLater * a,
          intensityShift: spec.intensityShift * a,
          intensityEndless: spec.intensityEndless * a,
        },
      },
    },
  };
}

/**
 * The patterns a breather call plays under: the same set with this tier's
 * return fire dark (G33 — a breather has none). Data, not a lever the sim
 * learned: the rung already carries `bossFires`, `formationFires` and
 * `hazards`, so the breather is those three turned off and nothing else.
 */
function breatherPatterns(set: PatternSet, tier: Tier): PatternSet {
  return {
    ...set,
    ladder: {
      ...set.ladder,
      rungs: set.ladder.rungs.map((rung) =>
        rung.tier === tier
          ? { ...rung, bossFires: false, formationFires: false, hazards: false }
          : rung,
      ),
    },
  };
}

interface CallResult {
  catches: number;
  drops: number;
  bosses: number;
  lampsLost: number;
  chainResets: number;
  /** What the catches and the drops paid; the drops feed the same line (G35). */
  catchPoints: number;
  /** What the bosses paid, their own line. */
  bossPoints: number;
  points: number;
  chain: number;
  lamps: number;
  maxLamps: number;
  ended: 'time' | 'lamps' | null;
  hazardPeak: number;
  copiesPeak: number;
  intensityPeak: number;
  said: { at: number; kind: string; text: string }[];
}

/**
 * Play one call and score it. The chain is whole links: one per catch or
 * drop while no lamp is lost, capped by a lever, and back to one the moment
 * a lamp goes (DoDonPachi's chain, Ikaruga's polarity chain — a discrete
 * multiplier that resets to a floor is legible where a decaying one is not).
 * Inside one frame the lamp loss is applied first, then the bosses, then the
 * catches, then the drops, so a lamp and a catch on the same frame never pay
 * at a chain the player no longer holds.
 */
function playCall(
  entry: EndlessTape,
  call: EndlessPlanCall,
  opts: {
    tier: Tier;
    /** The run's lamp pool: the bezel's length and the refill's ceiling. */
    pool: number;
    lamps: number;
    chain: number;
    set: PatternSet;
    bot: (round: Round) => (state: RoundState) => RoundInput;
    /** The run's bags, so the no-repeat rule holds across calls, not inside one. */
    bags: LineBags;
  },
): CallResult {
  const { tier, set } = opts;
  const lit = endlessPatterns(set, tier, call.approach);
  const patterns = call.breather ? breatherPatterns(lit, tier) : lit;
  const round = prepassRound(entry.tape, {
    tier,
    climb: call.reach,
    flavorIndex: call.flavorIndex,
    patterns,
  });
  // The lamps are the run's pool, not the rung's (G34): the round is built
  // with the pool as both its lamps and its bezel length, so nothing here
  // writes `state.lives` after the fact or once a tick.
  const maxLamps = opts.pool;
  const state = createRoundState(round, {
    lives: Math.min(maxLamps, Math.max(1, opts.lamps)),
    bags: opts.bags,
  });
  const score = set.endless.score;
  const input = opts.bot(round);
  const watcher = watchSaid();
  let chain = Math.min(score.chainCap, Math.max(1, opts.chain));
  let catches = 0;
  let drops = 0;
  let bosses = 0;
  let lampsLost = 0;
  let chainResets = 0;
  let catchPoints = 0;
  let bossPoints = 0;
  let hazardPeak = 0;
  let copiesPeak = 0;
  let intensityPeak = 0;
  let prevCleared = 0;
  let prevDrops = 0;
  let prevBosses = 0;
  let prevLives = state.lives;
  const maxTicks = Math.ceil((Number.isFinite(state.duration) ? state.duration : 0) / DT) + 360;
  let ticks = 0;
  while (!state.scene) {
    if (ticks >= maxTicks) {
      state.ended = 'time';
      break;
    }
    ticks += 1;
    stepRound(state, input(state), DT);

    const lost = Math.max(0, prevLives - state.lives);
    if (lost > 0) {
      lampsLost += lost;
      chainResets += 1;
      chain = 1;
    }
    prevLives = state.lives;
    const nBoss = state.bossKills - prevBosses;
    for (let i = 0; i < nBoss; i++) bossPoints += score.boss * chain;
    bosses += Math.max(0, nBoss);
    prevBosses = state.bossKills;
    const nCatch = state.cleared.length - prevCleared;
    for (let i = 0; i < nCatch; i++) {
      catchPoints += score.catch * chain;
      chain = Math.min(score.chainCap, chain + 1);
    }
    catches += Math.max(0, nCatch);
    prevCleared = state.cleared.length;
    const nDrop = state.dropCatches - prevDrops;
    for (let i = 0; i < nDrop; i++) {
      catchPoints += score.drop;
      chain = Math.min(score.chainCap, chain + 1);
    }
    drops += Math.max(0, nDrop);
    prevDrops = state.dropCatches;

    const alive = state.hazards.filter((h) => h.alive).length;
    if (alive > hazardPeak) hazardPeak = alive;

    watcher.see(state);
  }
  watcher.see(state);
  const said = watcher.rows();
  // What the round's own climb asked of the schedule, so the band can prove
  // the ceiling held without reaching inside the sim.
  const spec = lit.parallelism.tiers[String(tier) as '0' | '1' | '2' | '3'];
  const waves = Math.max(1, round.waveBounds.length);
  for (let w = 0; w < waves; w++) {
    copiesPeak = Math.max(copiesPeak, copiesAt(spec, w, waves, round.climb ?? 0));
    intensityPeak = Math.max(intensityPeak, intensityAt(spec, w, waves, round.climb ?? 0));
  }
  return {
    catches,
    drops,
    bosses,
    lampsLost,
    chainResets,
    catchPoints,
    bossPoints,
    points: catchPoints + bossPoints,
    chain,
    lamps: state.lives,
    maxLamps,
    ended: state.ended,
    hazardPeak,
    copiesPeak,
    intensityPeak,
    said,
  };
}

/**
 * A whole endless run: calls until the last lamp (G34), the score with its
 * three lines (G35), the rank word and the code. Time is never scored, and
 * nothing here reads a receipt or a fact (G1).
 */
export function runEndless(roster: readonly EndlessTape[], opts: EndlessRunOpts): EndlessRun {
  const set = opts.patterns ?? DEFAULT_PATTERNS;
  const difficulty = opts.tier ?? DEFAULT_DIFFICULTY;
  // The gentlest rung takes no last lamp on any tape, at any flavor, at any
  // reach the ceiling permits, so a run there could never end. Endless starts
  // at seat, and the menu's picker starts there too (E3).
  if (difficulty === 0) throw new Error(ENDLESS_NO_TIER_ZERO);
  const pool = set.endless.lamps.pool[String(difficulty) as '1' | '2' | '3'];
  const seed = opts.seed % SEED_SPACE;
  const want = Math.min(CALLS_MAX, Math.max(1, opts.calls ?? CALLS_MAX));
  const plan = endlessPlan(roster, { ...opts, seed, calls: want });
  const byName = new Map(roster.map((r) => [r.name, r]));
  const endless = set.endless;
  const calls: EndlessCall[] = [];
  // One bag store for the whole run: a line is not heard again until its pool
  // has been heard, across the calls and not merely inside one.
  const bags: LineBags = opts.bags ?? {};
  const lines: EndlessLines = { catches: 0, bosses: 0, calls: 0 };
  let score = 0;
  let chain = 1;
  let lamps = pool;
  let ended: EndlessRun['ended'] = 'calls';
  for (const step of plan) {
    const entry = byName.get(step.pick.name);
    if (!entry) throw new Error(`endless: ${step.pick.name} is not on the roster`);
    const lampsBefore = lamps;
    const out = playCall(entry, step, {
      tier: difficulty,
      pool,
      lamps,
      chain,
      set,
      bot: opts.bot,
      bags,
    });
    // The call's end banks the chain's value, with a call bonus that rises
    // with the reach (Downwell's cash-out). Lasting long pays because later
    // calls pay more, never because the clock ran (G35).
    const bonus = Math.round(endless.score.callBonusBase * (1 + step.reach));
    const banked = out.chain * bonus;
    lines.catches += out.catchPoints;
    lines.bosses += out.bossPoints;
    lamps = out.lamps;
    const clean = out.lampsLost === 0 && lamps > 0;
    const lampsBack = clean ? Math.min(endless.lamps.backOnCleanCall, out.maxLamps - lamps) : 0;
    lamps += lampsBack;
    chain = out.chain;
    score += out.points + banked;
    lines.calls += banked;
    calls.push({
      ...step,
      tier: difficulty,
      catches: out.catches,
      drops: out.drops,
      bosses: out.bosses,
      lampsLost: out.lampsLost,
      chainResets: out.chainResets,
      clean,
      lampsBack,
      lampsBefore,
      lamps,
      chainEnd: out.chain,
      chainWord: chainWord(out.chain, set),
      banked,
      points: out.points + banked,
      ended: out.ended,
      hazardPeak: out.hazardPeak,
      copiesPeak: out.copiesPeak,
      intensityPeak: out.intensityPeak,
      said: out.said,
    });
    if (lamps <= 0) {
      ended = 'lamps';
      break;
    }
  }
  return {
    seed,
    difficulty,
    calls,
    score,
    lines,
    rank: rankWord(score, difficulty as 1 | 2 | 3, set),
    code: encodeEndless(roster, { seed, difficulty }, set),
    lamps: Math.max(0, lamps),
    pool,
    ended,
  };
}

export type EndlessDecode =
  { ok: true; seed: number; difficulty: Tier } | { ok: false; why: 'not a code' | 'another menu' };

/**
 * The code: five words, not the shift's four. The four-word body carries the
 * seed, the difficulty and a four-bit check of the roster, exactly as a
 * shift's does; the fifth word carries the rest of the seed. The count is
 * what tells the two apart, so every shift code decodes as it always did and
 * an endless code is never read as a shift draw (G22, G35).
 */
export function encodeEndless(
  roster: readonly EndlessTape[] | readonly string[],
  run: { seed: number; difficulty: Tier },
  set: PatternSet = DEFAULT_PATTERNS,
): string {
  const names = rosterNames(roster);
  const seed = Math.abs(Math.floor(run.seed)) % SEED_SPACE;
  const value = (seed * DIFFICULTIES + run.difficulty) * CHECK_SPACE + rosterCheck(names);
  return wordsFromValue(value, CODE_WORDS, set).join(' ');
}

/** Read a code back: the run it names, or why it does not name one here. */
export function decodeEndless(
  roster: readonly EndlessTape[] | readonly string[],
  code: string,
  set: PatternSet = DEFAULT_PATTERNS,
): EndlessDecode {
  const value = valueFromWords(codeWords(code), CODE_WORDS, set);
  if (value === null) return { ok: false, why: 'not a code' };
  const check = value % CHECK_SPACE;
  const rest = Math.floor(value / CHECK_SPACE);
  const difficulty = (rest % DIFFICULTIES) as Tier;
  const seed = Math.floor(rest / DIFFICULTIES);
  if (check !== rosterCheck(rosterNames(roster))) return { ok: false, why: 'another menu' };
  if (seed >= SEED_SPACE) return { ok: false, why: 'not a code' };
  return { ok: true, seed, difficulty };
}

function rosterNames(roster: readonly EndlessTape[] | readonly string[]): string[] {
  return roster.map((r) => (typeof r === 'string' ? r : r.name));
}

/**
 * The run in words: the screen's share of a transcript. Every line is
 * stripped against the screen's own list, so a tape whose name or policy
 * carries a needle loses it here rather than on a canvas (G7, G10).
 */
export function endlessWords(run: EndlessRun, set: PatternSet = DEFAULT_PATTERNS): string[] {
  const out: string[] = [];
  const last = run.calls[run.calls.length - 1];
  for (const call of run.calls) {
    // De-duplicated: a breather forces the trough flavor, whose telegraph and
    // whose reach word and whose 'no return fire' were three ways of saying
    // one thing, and the header printed all three.
    const head = [
      ...new Set(
        [
          call.place,
          ...call.pick.header,
          set.shift.flavors[call.flavorIndex]?.telegraph ?? '',
          call.reachWord,
          call.breather ? 'no return fire' : '',
        ]
          .map(strip)
          .filter(Boolean),
      ),
    ];
    out.push(head.join(' · '));
    out.push(`  on the menu: ${call.candidates.map((c) => c.display).join(', ')}`);
    out.push(`  the pick came from the seed${call.seeded ? '' : ' and the seat'}`);
    out.push(
      `  the tell: ${call.tell === null ? 'the seat has not sat down yet' : strip(call.tell)}`,
    );
    for (const line of call.said) {
      const text = strip(line.text);
      if (text) out.push(`  ${line.kind} · ${text}`);
    }
    // The refill is read off the record, not guessed from `clean`: a clean
    // call taken at a full pool gives no lamp back, which is the ordinary
    // case and includes the first call of every run. And the call that ends
    // the run says so in its own line rather than leaving the player to find
    // out from a footer two rows down.
    const ran =
      call === last && run.ended === 'lamps'
        ? 'the last lamp went'
        : call.lampsBack > 0
          ? 'the call ran clean and a lamp comes back'
          : call.clean
            ? 'the call ran clean'
            : 'a lamp went';
    out.push(`  ${ran}; the chain reads ${call.chainWord}`);
  }
  out.push(`the run: ${strip(run.rank)}, at ${strip(rungWord(run.difficulty, set))}`);
  out.push(`the run ended ${run.ended === 'lamps' ? 'at the last lamp' : 'with lamps to spare'}`);
  out.push(`the code: ${run.code}`);
  return out.filter((l) => l.trim() !== '');
}

/**
 * The score, as the closing scene shows it: the three lines and the total.
 * These carry digits, so they are a transcript's footer and never the
 * screen's — the field canvas has no digit on it at all (G7, G35).
 */
export function endlessScoreLines(run: EndlessRun): string[] {
  // The three lines hold POINTS, and they used to be labelled with the names
  // of counts: `catches: 3000` after thirty catches, and `calls: 1040` two
  // rows above `calls taken: 7`, so one word meant two things in adjacent
  // lines of one footer. Each line now says what it holds, and the deeds are
  // carried beside the points where the record already has both.
  const catches = run.calls.reduce((n, c) => n + c.catches, 0);
  const drops = run.calls.reduce((n, c) => n + c.drops, 0);
  const bosses = run.calls.reduce((n, c) => n + c.bosses, 0);
  return [
    `from catches: ${run.lines.catches} (${catches} caught, ${drops} picked up)`,
    `from bosses: ${run.lines.bosses} (${bosses} put down)`,
    `banked at each call's end: ${run.lines.calls}`,
    `total: ${run.score}`,
    `calls taken: ${run.calls.length} · lamps left: ${run.lamps} · seeded picks: ${run.calls.filter((c) => c.seeded).length}`,
  ];
}
