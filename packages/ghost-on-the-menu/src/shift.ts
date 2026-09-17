// The shift (slice 7, G19–G22): a run of calls drawn from the roster and
// played back to back, as one agent session working through a task list.
// The draw is seeded from the clock, never from a fact; the lamps refill at
// every call (the Director's word); the climb is data (`shift.json` and the
// `copiesShift` / `intensityShift` levers); and the whole shift is named by
// a code of four words so it can be handed to someone. No digit anywhere.
//
// The code is two alternating lists of sixty-four concrete nouns (even
// positions one syllable, odd positions two, after the PGP word list), six
// bits a word, twenty-four bits: the rank of the ordered draw in the roster,
// the difficulty index, and a four-bit check of the roster that made it.
// A code from another menu says so instead of playing the wrong tapes.

import type { Tape } from '@mcp-arcade-cabinets/tape-core';

import { DEFAULT_PATTERNS, type PatternSet } from './patterns';
import { SCREEN_FORBIDDEN, sanitizeCaption, type Flavor } from './types';

export interface ShiftDraw {
  /** Roster names in play order. */
  names: string[];
  /** Index into the shell's difficulty list, never a sim tier by itself. */
  difficulty: 0 | 1 | 2 | 3;
  /**
   * How many calls the lever asked for. A roster shorter than the shift is a
   * legitimate configuration — a container started with one mounted tape —
   * and the draw was silently shortened with nothing recorded, so a one-tape
   * cabinet announced four calls and played one, and the very first card
   * already read 'last'. `names.length` is what was drawn; this is what was
   * asked for, and a caller that finds them different can say so.
   */
  asked: number;
}

export type ShiftDecode =
  { ok: true; draw: ShiftDraw } | { ok: false; why: 'not a code' | 'another menu' };

const WORD_BITS = 6;
const CODE_WORDS = 4;
/** Difficulty indices a code can carry; the shell's list is four long. */
export const DIFFICULTIES = 4;
/** Values the roster check occupies; four bits. */
export const CHECK_SPACE = 16;
const CODE_SPACE = 2 ** (WORD_BITS * CODE_WORDS);

/**
 * Spell a value as `count` words off the two alternating lists, six bits a
 * word, most significant first. Extracted from encodeShift so the endless
 * code (five words: a seed, the difficulty and the roster check) spells
 * itself the same way instead of a second, drifting copy of the arithmetic.
 */
export function wordsFromValue(
  value: number,
  count: number,
  set: PatternSet = DEFAULT_PATTERNS,
): string[] {
  const { even, odd } = set.shift.words;
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    const shift = WORD_BITS * (count - 1 - i);
    const digit = Math.floor(value / 2 ** shift) % 2 ** WORD_BITS;
    words.push((i % 2 === 0 ? even : odd)[digit]!);
  }
  return words;
}

/** Split a code into its words: lower case, spaces, commas, dashes or dots. */
export function codeWords(code: string): string[] {
  return code
    .toLowerCase()
    .trim()
    .split(/[\s,\-·]+/)
    .filter(Boolean);
}

/**
 * Read `count` words back to the value `wordsFromValue` spelled, or null
 * when a word is off its list or the count is wrong (a transposition of an
 * even and an odd word is heard here, which is the point of two lists).
 */
export function valueFromWords(
  words: readonly string[],
  count: number,
  set: PatternSet = DEFAULT_PATTERNS,
): number | null {
  if (words.length !== count) return null;
  const { even, odd } = set.shift.words;
  let value = 0;
  for (let i = 0; i < count; i++) {
    const digit = (i % 2 === 0 ? even : odd).indexOf(words[i]!);
    if (digit === -1) return null;
    value = value * 2 ** WORD_BITS + digit;
  }
  return value;
}

/** Same hash the prepass uses for its seed: FNV-1a over UTF-16 units. */
export function hashWords(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A small seeded generator (mulberry32); the clock seeds it, a fact never does. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function permutations(n: number, k: number): number {
  let p = 1;
  for (let i = 0; i < k; i++) p *= n - i;
  return p;
}

/** The roster check: four bits of the sorted names, so a code names its menu. */
export function rosterCheck(roster: readonly string[]): number {
  return hashWords([...roster].sort().join('\n')) % CHECK_SPACE;
}

/** True when a roster of this size still fits a four-word code. */
export function rosterFits(roster: readonly string[], set: PatternSet = DEFAULT_PATTERNS): boolean {
  const k = set.shift.length;
  return permutations(roster.length, k) * DIFFICULTIES * CHECK_SPACE <= CODE_SPACE;
}

/** How far up the climb this call sits, from `shift.json`; the first call is the tape as played alone. */
export function climbAt(index: number, set: PatternSet = DEFAULT_PATTERNS): number {
  const climb = set.shift.climb;
  return climb[Math.min(climb.length - 1, Math.max(0, index))] ?? 0;
}

/** Authored flavor at this call index. Same index, same flavor; never a fact. */
export function flavorAt(index: number, set: PatternSet = DEFAULT_PATTERNS): Flavor {
  const flavors = set.shift.flavors;
  return flavors[Math.min(flavors.length - 1, Math.max(0, index))] ?? flavors[0]!;
}

/** Telegraph words for the call card. No climb number, no digit. */
export function flavorTelegraph(index: number, set: PatternSet = DEFAULT_PATTERNS): string {
  return flavorAt(index, set).telegraph;
}

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];

/** The call's place in the shift, in words: "the second call", "the last call". */
export function ordinalWord(index: number, length: number): string {
  if (index >= length - 1) return 'last';
  return ORDINALS[index] ?? 'next';
}

const LENGTH_WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

export function lengthWord(length: number): string {
  return LENGTH_WORDS[length] ?? 'several';
}

/**
 * The shift's own title, read off the draw rather than off the lever. The
 * shell wrote it from the lever as a literal, so a cabinet with one mounted
 * tape promised four calls and played one. A draw that came up short says so,
 * in words, because a short roster is a configuration and not a defect.
 */
export function shiftTitle(draw: ShiftDraw): string {
  const drawn = draw.names.length;
  const base = `${lengthWord(drawn)} ${drawn === 1 ? 'call' : 'calls'} drawn from the roster, back to back, the bursts climbing call by call. The lamps refill at every call.`;
  if (drawn >= draw.asked) return base;
  return `${base} The roster is shorter than a full shift, so the draw is ${lengthWord(drawn)} rather than ${lengthWord(draw.asked)}.`;
}

/**
 * Draw a shift: `length` names without replacement. Several candidate draws
 * come off the seeded generator and the one that shares the fewest names
 * with the recent shifts is kept (Spotify's shuffle rework, 2025: uniform
 * draws read as rigged; score candidates for freshness instead). Ties keep
 * the first, so the draw is a function of seed and history alone.
 */
export function drawShift(
  roster: readonly string[],
  seed: number,
  difficulty: 0 | 1 | 2 | 3,
  recent: readonly (readonly string[])[] = [],
  set: PatternSet = DEFAULT_PATTERNS,
): ShiftDraw {
  const length = Math.min(set.shift.length, roster.length);
  if (length < 1) throw new Error('shift: empty roster');
  const rng = seededRandom(seed);
  const seen = new Set(recent.flat());
  let best: string[] | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let c = 0; c < 6; c++) {
    const pool = [...roster];
    const pick: string[] = [];
    for (let i = 0; i < length; i++) {
      const j = Math.floor(rng() * pool.length);
      pick.push(pool[j]!);
      pool.splice(j, 1);
    }
    const score = pick.filter((n) => seen.has(n)).length;
    if (score < bestScore) {
      best = pick;
      bestScore = score;
    }
  }
  return { names: best!, difficulty, asked: set.shift.length };
}

/** Rank of an ordered draw among all ordered draws of its length from the roster. */
function rankOf(roster: readonly string[], names: readonly string[]): number {
  const pool = [...roster];
  let rank = 0;
  for (const name of names) {
    const idx = pool.indexOf(name);
    if (idx === -1) throw new Error(`shift: ${name} is not on the roster`);
    rank = rank * pool.length + idx;
    pool.splice(idx, 1);
  }
  return rank;
}

function unrank(roster: readonly string[], rank: number, length: number): string[] {
  const digits: number[] = [];
  let r = rank;
  for (let i = length - 1; i >= 0; i--) {
    const base = roster.length - i;
    digits.unshift(r % base);
    r = Math.floor(r / base);
  }
  const pool = [...roster];
  return digits.map((d) => {
    const name = pool[d]!;
    pool.splice(d, 1);
    return name;
  });
}

/** The four words that name a draw on this roster. */
export function encodeShift(
  roster: readonly string[],
  draw: ShiftDraw,
  set: PatternSet = DEFAULT_PATTERNS,
): string {
  if (!rosterFits(roster, set))
    throw new Error('shift: the roster is too long for a four-word code');
  const value =
    (rankOf(roster, draw.names) * DIFFICULTIES + draw.difficulty) * CHECK_SPACE +
    rosterCheck(roster);
  return wordsFromValue(value, CODE_WORDS, set).join(' ');
}

/** Read a code back: the draw it names, or why it does not name one here. */
export function decodeShift(
  roster: readonly string[],
  code: string,
  set: PatternSet = DEFAULT_PATTERNS,
): ShiftDecode {
  const read = valueFromWords(codeWords(code), CODE_WORDS, set);
  if (read === null) return { ok: false, why: 'not a code' };
  let value = read;
  const check = value % CHECK_SPACE;
  value = Math.floor(value / CHECK_SPACE);
  const difficulty = (value % DIFFICULTIES) as 0 | 1 | 2 | 3;
  const rank = Math.floor(value / DIFFICULTIES);
  if (check !== rosterCheck(roster)) return { ok: false, why: 'another menu' };
  const length = Math.min(set.shift.length, roster.length);
  if (rank >= permutations(roster.length, length)) return { ok: false, why: 'another menu' };
  return {
    ok: true,
    draw: { names: unrank(roster, rank, length), difficulty, asked: set.shift.length },
  };
}

/**
 * The card between calls: header words only (the server, the policy, the
 * tools the agent was asked to run), never a fact, a count or a digit (G10).
 * An index appends that call's flavor telegraph; picker-alone omits it.
 */
export function shiftCard(
  tape: Tape,
  index?: number,
  set: PatternSet = DEFAULT_PATTERNS,
): string[] {
  // The card is tape header text, so it goes through the shared screen strip,
  // not the old digits-only replace: a tape whose agent_policy is `pass` or
  // whose server_name is `revealed` used to print that word here. A value
  // that strips to nothing drops its whole line rather than shipping a bare
  // `server` or `policy` label (G10).
  const clean = (s: string) => sanitizeCaption(s, '', SCREEN_FORBIDDEN);
  // A tool name the strip would touch stays off the card entirely rather than
  // being mangled into half a name, which is what the old digit filter did.
  const tools = [
    ...new Set(
      tape.atoms.map((a) => a.task_tool).filter((t): t is string => !!t && clean(t) === t.trim()),
    ),
  ];
  const lines: string[] = [];
  const server = clean(tape.server_name ?? tape.target_kind);
  if (server) lines.push(`server ${server}`);
  const policy = clean(tape.agent_policy);
  if (policy) lines.push(`policy ${policy}`);
  if (tools.length) lines.push(`asked to run ${tools.slice(0, 4).join(', ')}`);
  if (index !== undefined) {
    const telegraph = clean(flavorTelegraph(index, set));
    if (telegraph) lines.push(telegraph);
  }
  return lines;
}
