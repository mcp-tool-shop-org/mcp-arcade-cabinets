// The run code: one short string that names a whole run.
//
// `sim.ts`'s header lists what two byte-identical runs must share — the
// levers, the seed, the tier, the stack, the endless flag, the weak pairs and
// the corpus. The end card used to hand the player the SEED and say typing it
// on the menu plays the same run again, and on a browser that has played
// before that was not true: the planner weights every candidate by the weak
// pairs the browser has stored, so the same seed the next evening plans
// different requests and the same seed on a friend's machine is a different
// run outright. The number carried one of the inputs out of seven.
//
// The code carries the rest. Seventeen characters in four groups, and a digit
// is allowed here because this is the one surface a player reads off the end
// card and types back into the menu box — it is not the field.
//
// The two digests are digests and not the things themselves: sixty-four
// pairs of practice counts do not fit in a code anyone would type, and
// neither does a corpus. What each one buys is different, and both are said
// plainly rather than implied:
//
//   * The WEAK digest is what the run's practice map is minted FROM. A run
//     started from a code plants the map that digest names, so everybody who
//     types the code plays the same requests in the same order — which is
//     the property the seed alone could not give. The map is synthesized, so
//     it is not the browser's own map character for character; it is the map
//     the code names, and the code is the thing being replayed.
//   * The CORPUS digest is a refusal. Every snippet's value is read off a
//     trigram model built over the corpus the tapes seasoned, so a code
//     minted on a rig with fixtures names a different scoreboard than the
//     same code on a build without them. `createRun` halts rather than play
//     a run that only looks like the one the code names.

import { STACKS } from './patterns';
import { hashString, mixSeed, seededRandom } from './seed';
import type { Band, Stack, Tier } from './types';

/**
 * The code's own version. A code from another version parses as null rather
 * than as a run: the layout below is the whole contract, and reading old
 * bits with new offsets is the silent-degradation shape this package refuses
 * everywhere else.
 */
export const RUN_CODE_VERSION = 2;

/**
 * Crockford's base32: no I, no L, no O, no U, so nothing in a code can be
 * mistaken for a one or a zero by a player reading it off a screen, and no
 * group of four can spell a word by accident.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
/** What a player may type in place of the characters the alphabet leaves out. */
const LOOKALIKE: Record<string, string> = { I: '1', L: '1', O: '0', U: 'V' };

/** Characters in a code. Version 1 was 16 chars; version 2 is 17. */
const CODE_CHARS = 17;
const CODE_CHARS_V1 = 16;
/** Group sizes for the v2 format: 4-4-4-5. */
const GROUPS = [4, 4, 4, 5];

/**
 * The layout, most significant field first. Version 1 was 80 bits; version 2
 * is 85 bits (17 base32 chars). A field added later takes a new version.
 */
const BITS_V1 = {
  version: 4,
  endless: 1,
  tier: 2,
  stack: 3,
  startBand: 3,
  seed: 32,
  weak: 15,
  corpus: 15,
  check: 5,
} as const;

const BITS_V2 = {
  version: 4,
  endless: 1,
  tier: 2,
  /** Zero is no pinned stack; otherwise the index in `STACKS`, plus one. */
  stack: 3,
  /** Zero is the ladder's own first rung; otherwise the rung, 1..7. */
  startBand: 3,
  /** 0-based listed level, 0..31. Only meaningful when endless is false. */
  levelIndex: 5,
  seed: 32,
  weak: 15,
  corpus: 15,
  check: 5,
} as const;

export const WEAK_DIGEST_BITS = BITS_V2.weak;
export const CORPUS_DIGEST_BITS = BITS_V2.corpus;

/** A weak map with no bias in it at all. The digest a fresh browser mints. */
export const WEAK_CLEAN = 0;

/** The salt the synthesized practice map is drawn from. */
const WEAK_CODE_SALT = 0x77a;
/** Pairs a synthesized map names, and how weak any one of them gets. */
const WEAK_CODE_PAIRS = 16;
const WEAK_CODE_PER_PAIR = 4;
/** What code is made of; a practice map names pairs of these. */
const WEAK_CODE_CHARS = 'abcdefghijklmnopqrstuvwxyz_.()= ';

export interface RunCode {
  seed: number;
  tier: Tier;
  endless: boolean;
  /** The stack the run is pinned to, or absent for a run that draws its own. */
  stack?: Stack;
  /** The endless ladder's first rung, or absent for the lever's own. */
  startBand?: Band;
  /** Which listed level this run started from, 0-based. Absent in endless. */
  levelIndex?: number;
  /** The digest of the practice map, `WEAK_CLEAN` for a map with nothing in it. */
  weak: number;
  /** The digest of `corpusFingerprint`, which the tapes on disk move. */
  corpus: number;
}

function mask(bits: number): number {
  return bits >= 32 ? 0xffffffff : (1 << bits) - 1;
}

/**
 * The digest of a practice map: order-independent, because a map is a record
 * and the order its keys were inserted in is not part of what it says.
 * An empty map digests to `WEAK_CLEAN`, which is what a fresh browser hands
 * `createRun` and what the band and the sweep plan with.
 */
export function weakDigestOf(weak: Record<string, number> | undefined): number {
  if (!weak) return WEAK_CLEAN;
  let sum = 0;
  for (const key of Object.keys(weak)) {
    const n = weak[key];
    if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) continue;
    sum = (sum + hashString(`${key}:${Math.floor(n)}`)) >>> 0;
  }
  return sum & mask(BITS_V2.weak);
}

/** The digest of a corpus fingerprint, folded to what the code has room for. */
export function corpusDigestOf(fingerprint: string): number {
  return hashString(fingerprint) & mask(BITS_V2.corpus);
}

/**
 * The practice map a digest names.
 *
 * `WEAK_CLEAN` names the map with nothing in it, exactly — so a code minted
 * from a run that carried no bias replays as that run, character for
 * character, which is every run the band, the sweep and a fresh browser
 * play. Any other digest names a bounded map drawn from it: not the map the
 * browser had, but one map, the same one for everybody who types the code.
 */
export function weakFromDigest(digest: number): Record<string, number> {
  const d = digest & mask(BITS_V2.weak);
  if (d === WEAK_CLEAN) return {};
  const rng = seededRandom(mixSeed(d, WEAK_CODE_SALT));
  const out: Record<string, number> = {};
  for (let i = 0; i < WEAK_CODE_PAIRS; i++) {
    const a = WEAK_CODE_CHARS[Math.floor(rng() * WEAK_CODE_CHARS.length)]!;
    const b = WEAK_CODE_CHARS[Math.floor(rng() * WEAK_CODE_CHARS.length)]!;
    out[`${a}${b}`] = 1 + Math.floor(rng() * WEAK_CODE_PER_PAIR);
  }
  return out;
}

/** The check characters, over everything in front of them. */
function checksum(body: bigint): number {
  return hashString(body.toString(32)) & mask(BITS_V2.check);
}

function push(bits: bigint, value: number, width: number): bigint {
  return (bits << BigInt(width)) | (BigInt(value >>> 0) & BigInt(mask(width)));
}

/**
 * The code for a run. Every field two identical runs must share is in it,
 * the two that cannot fit as digests.
 *
 * A field out of range is a caller bug and halts, the way a bad plan and a
 * bad `dt` halt: a code minted from a tier of nine would parse back as some
 * other tier and play a run nobody asked for.
 */
export function mintRunCode(input: RunCode): string {
  const stack = input.stack === undefined ? 0 : STACKS.indexOf(input.stack) + 1;
  if (stack < 0 || stack > STACKS.length) throw new Error(`mintRunCode: stack ${input.stack}`);
  if (!Number.isInteger(input.tier) || input.tier < 0 || input.tier > 3) {
    throw new Error(`mintRunCode: tier ${input.tier}`);
  }
  const startBand = input.startBand ?? 0;
  if (!Number.isInteger(startBand) || startBand < 0 || startBand > 7) {
    throw new Error(`mintRunCode: startBand ${input.startBand}`);
  }
  const levelIndex = input.levelIndex ?? 0;
  if (!Number.isInteger(levelIndex) || levelIndex < 0 || levelIndex > 31) {
    throw new Error(`mintRunCode: levelIndex ${input.levelIndex}`);
  }
  if (!Number.isInteger(input.seed) || input.seed < 0 || input.seed > 0xffffffff) {
    throw new Error(`mintRunCode: seed ${input.seed}`);
  }
  let body = 0n;
  body = push(body, RUN_CODE_VERSION, BITS_V2.version);
  body = push(body, input.endless ? 1 : 0, BITS_V2.endless);
  body = push(body, input.tier, BITS_V2.tier);
  body = push(body, stack, BITS_V2.stack);
  body = push(body, startBand, BITS_V2.startBand);
  body = push(body, levelIndex, BITS_V2.levelIndex);
  body = push(body, input.seed, BITS_V2.seed);
  body = push(body, input.weak & mask(BITS_V2.weak), BITS_V2.weak);
  body = push(body, input.corpus & mask(BITS_V2.corpus), BITS_V2.corpus);
  let bits = push(body, checksum(body), BITS_V2.check);
  const chars: string[] = [];
  for (let i = 0; i < CODE_CHARS; i++) {
    chars.unshift(ALPHABET[Number(bits & 31n)]!);
    bits >>= 5n;
  }
  const groups: string[] = [];
  let pos = 0;
  for (const g of GROUPS) {
    groups.push(chars.slice(pos, pos + g).join(''));
    pos += g;
  }
  return groups.join('-');
}

/**
 * What a player typed, as a run — or null, which is the menu box's answer
 * and not a halt. Case, spacing, the hyphens and the four characters the
 * alphabet leaves out are all forgiven; a wrong character is not, because
 * the check at the end of the code is what tells a typo from a run.
 */
export function parseRunCode(text: string): RunCode | null {
  if (typeof text !== 'string') return null;
  const raw = text
    .toUpperCase()
    .replace(/[\s-]+/g, '')
    .split('')
    .map((ch) => LOOKALIKE[ch] ?? ch)
    .join('');
  if (raw.length !== CODE_CHARS && raw.length !== CODE_CHARS_V1) return null;
  const isV1 = raw.length === CODE_CHARS_V1;
  let bits = 0n;
  for (const ch of raw) {
    const at = ALPHABET.indexOf(ch);
    if (at < 0) return null;
    bits = (bits << 5n) | BigInt(at);
  }
  const b = isV1 ? BITS_V1 : BITS_V2;
  const check = Number(bits & BigInt(mask(b.check)));
  const body = bits >> BigInt(b.check);
  if (checksum(body) !== check) return null;
  let rest = body;
  const take = (width: number): number => {
    const value = Number(rest & BigInt(mask(width)));
    rest >>= BigInt(width);
    return value;
  };
  const corpus = take(b.corpus);
  const weak = take(b.weak);
  const seed = take(b.seed);
  let levelIndex: number | undefined;
  if (!isV1) {
    levelIndex = take(BITS_V2.levelIndex);
  }
  const startBand = take(b.startBand);
  const stack = take(b.stack);
  const tier = take(b.tier);
  const endless = take(b.endless) === 1;
  const version = take(b.version);
  if (version !== (isV1 ? 1 : RUN_CODE_VERSION)) return null;
  if (stack > STACKS.length) return null;
  const out: RunCode = { seed: seed >>> 0, tier: tier as Tier, endless, weak, corpus };
  if (stack > 0) out.stack = STACKS[stack - 1]!;
  if (startBand > 0) out.startBand = startBand as Band;
  if (!isV1 && levelIndex !== undefined && !endless) out.levelIndex = levelIndex;
  return out;
}
