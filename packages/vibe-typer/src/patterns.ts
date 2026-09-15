// Every lever the cabinet reads, validated at load. The loader halts on the
// first bad key with `patterns/<file>: <key>` — the same halting shape as
// Ghost's patterns.ts, copied and not imported.
//
// Text gate (G28): every authored line passes VOICE_FORBIDDEN, carries no
// tool or model name, is one sentence of at most twelve words, and never
// yells. VOICE_FORBIDDEN below is copied verbatim from
// packages/ghost-on-the-menu/src/patterns.ts:48 — THE TWO LISTS MUST STAY
// IDENTICAL. A test compares them character for character; if Ghost's list
// grows, this one grows with it in the same commit.

import type { Band, Stack, Tier } from './types';

import cabinetJson from '../patterns/cabinet.json';
import levelsJson from '../patterns/levels.json';
import scoreJson from '../patterns/score.json';
import contextJson from '../patterns/context.json';
import difficultyJson from '../patterns/difficulty.json';
import userJson from '../patterns/user.json';
import agentJson from '../patterns/agent.json';
import productsJson from '../patterns/products.json';

/** Copied verbatim from packages/ghost-on-the-menu/src/patterns.ts:48. Keep identical. */
export const VOICE_FORBIDDEN =
  /\d|\b(lie|fact|revealed|followed|held|score|pass|fail|nrp|integrity|utility|cleared|ghost)\b/i;

/**
 * No line names the thing that writes it (G17). The agent's own name is
 * `Claudette`, which no word here matches on a boundary.
 */
export const MODEL_FORBIDDEN =
  /\b(claude|gpt|chatgpt|opus|sonnet|haiku|gemini|llama|mistral|qwen|grok|kimi|codex|copilot|cursor|openai|anthropic|ollama|deepseek)\b/i;

export const CORPUS_STACKS: readonly Stack[] = [
  'bash',
  'csharp',
  'java',
  'javascript',
  'python',
  'sql',
];
export const STACKS: readonly Stack[] = [...CORPUS_STACKS, 'integration'];
/** Hardcore reuses tier two's words; only these three key the line pools. */
export const LINE_TIERS = ['0', '1', '2'] as const;
export const TIER_KEYS = ['0', '1', '2', '3'] as const;
export const MAX_WORDS = 12;
const MIN_ASKS = 16;
const MIN_REACTIONS = 12;
const MIN_CREEPS = 12;
const MIN_REVIEWS = 8;
/** A quick sync is three of these; twelve is enough that no level repeats one. */
const MIN_SYNCS = 12;
/** A sync line is chatter, not a sentence: five words is the ceiling (slice 2). */
const MAX_SYNC_WORDS = 5;
const MIN_DATED = 8;
const MIN_REPLIES = 24;
const MIN_HMM = 12;
const MIN_COMPACTIONS = 8;
const MIN_SHIPS = 8;

export interface CabinetSet {
  name: string;
  tagline: string;
  agentName: string;
  words: { valuation: string; hype: string; streak: string; context: string };
}

export interface LevelDef {
  id: string;
  product: string;
  stack: Stack;
  requests: number;
  bandMin: Band;
  bandMax: Band;
  drainPerSec?: number;
  drainRamp: number;
  refillShare?: number;
  messageCost?: number;
  shipBonus: number;
}

export interface EndlessDef {
  startBand: Band;
  /** Bands climb by one every this many levels. */
  bandEvery: number;
  drainStart: number;
  /** Multiplier on the drain each further level. */
  drainGrow: number;
  products: 'products.json';
  requests: number;
  refillShare: number;
  messageCost: number;
  shipBonus: number;
}

export interface LevelsSet {
  levels: LevelDef[];
  /** Share of requests that carry a scope creep. */
  creepShare: number;
  /** Share of levels that get one quick sync between two requests (slice 2). */
  syncShare: number;
  /** How hard the planner leans toward snippets carrying the player's weak pairs. */
  weakBias: number;
  endless: EndlessDef;
}

export interface HypeStep {
  streak: number;
  hype: number;
}

export interface Milestone {
  name: string;
  at: number;
}

export interface ScoreSet {
  hypeSteps: HypeStep[];
  copilotStreak: number;
  copilotSeconds: number;
  copilotDiscount: number;
  milestones: Milestone[];
  hardcore: { hypeCap: number; shipMultiplier: number };
}

export interface ContextTier {
  /** The tier's own base rate, used when a level does not name one. */
  drainPerSec: number;
  /** What the tier does to a level's rate. Tier zero is one by definition. */
  drainScale: number;
  messageCost: number;
  refillShare: number;
  hardcoreBurnPerError: number;
}

export interface ContextSet {
  tiers: Record<'0' | '1' | '2' | '3', ContextTier>;
}

export interface KeyPos {
  row: number;
  col: number;
  hand: string;
  finger: number;
}

export interface DifficultySet {
  keys: Record<string, KeyPos>;
  shift: Record<string, string>;
  costs: {
    repeat: number;
    sameFinger: number;
    sameHand: number;
    alternate: number;
    rowJump: number;
    shift: number;
    space: number;
    newline: number;
    unknown: number;
  };
  weights: {
    surprisal: number;
    travel: number;
    length: number;
    punctuation: number;
    identifier: number;
    identifierMin: number;
    bracket: number;
    scale: number;
  };
}

export type TierLines = Record<'0' | '1' | '2', string[]>;

export interface UserSet {
  asks: Record<Stack, TierLines>;
  reactions: TierLines;
  creeps: string[];
  reviews: string[];
  /** The quick sync's chatter; the player types three of them (slice 2). */
  syncs: string[];
  /** Dated jokes; the seed skips them unless the player turns them on (Q5.7). */
  dated: string[];
}

export interface AgentSet {
  replies: string[];
  hmm: string[];
  compactions: string[];
  ships: string[];
}

export interface ProductsSet {
  nouns: string[];
  templates: string[];
}

export interface Patterns {
  cabinet: CabinetSet;
  levels: LevelsSet;
  score: ScoreSet;
  context: ContextSet;
  difficulty: DifficultySet;
  user: UserSet;
  agent: AgentSet;
  products: ProductsSet;
}

function fail(file: string, key: string): never {
  throw new Error(`patterns/${file}: ${key}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function req(obj: Record<string, unknown>, file: string, key: string): unknown {
  if (!Object.prototype.hasOwnProperty.call(obj, key)) fail(file, key);
  return obj[key];
}

/** Like `req`, for a property whose message key is not its own name. */
function at(obj: Record<string, unknown>, prop: string, file: string, key: string): unknown {
  if (!Object.prototype.hasOwnProperty.call(obj, prop)) fail(file, key);
  return obj[prop];
}

function asString(value: unknown, file: string, key: string): string {
  if (typeof value !== 'string') fail(file, key);
  return value;
}

function asNumber(value: unknown, file: string, key: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(file, key);
  return value;
}

function asArray(value: unknown, file: string, key: string): unknown[] {
  if (!Array.isArray(value)) fail(file, key);
  return value;
}

function asRecord(value: unknown, file: string, key: string): Record<string, unknown> {
  if (!isRecord(value)) fail(file, key);
  return value;
}

function asUnit(value: unknown, file: string, key: string): number {
  const n = asNumber(value, file, key);
  if (n < 0 || n > 1) fail(file, key);
  return n;
}

function asPositive(value: unknown, file: string, key: string): number {
  const n = asNumber(value, file, key);
  if (!(n > 0)) fail(file, key);
  return n;
}

function asCount(value: unknown, file: string, key: string): number {
  const n = asNumber(value, file, key);
  if (!Number.isInteger(n) || n < 1) fail(file, key);
  return n;
}

function asBand(value: unknown, file: string, key: string): Band {
  const n = asNumber(value, file, key);
  if (!Number.isInteger(n) || n < 1 || n > 7) fail(file, key);
  return n as Band;
}

function asStack(value: unknown, file: string, key: string): Stack {
  const s = asString(value, file, key);
  if (!(STACKS as readonly string[]).includes(s)) fail(file, key);
  return s as Stack;
}

/** Why this line cannot be said, or null. One reason, in words. */
export function lineFault(line: string): string | null {
  if (typeof line !== 'string' || line.trim() === '') return 'empty';
  if (line !== line.trim()) return 'padded';
  if (VOICE_FORBIDDEN.test(line)) return 'forbidden word or digit';
  if (MODEL_FORBIDDEN.test(line)) return 'names a tool or a model';
  if (line.includes('!')) return 'yells';
  if (/\b[A-Z]{3,}\b/.test(line)) return 'yells';
  const stops = line.match(/[.?]/g) ?? [];
  if (stops.length > 1) return 'more than one sentence';
  if (stops.length === 1 && !/[.?]$/.test(line)) return 'more than one sentence';
  if (line.split(/\s+/).length > MAX_WORDS) return 'too many words';
  return null;
}

/** A pool of authored lines: each one passes the gate, no two are the same. */
function loadLines(raw: unknown, file: string, key: string, min: number): string[] {
  const list = asArray(raw, file, key).map((item, i) => asString(item, file, `${key}.${i}`));
  if (list.length < min) fail(file, key);
  const seen = new Set<string>();
  list.forEach((line, i) => {
    if (lineFault(line) !== null || seen.has(line)) fail(file, `${key}.${i}`);
    seen.add(line);
  });
  return list;
}

function loadTierLines(raw: unknown, file: string, key: string, min: number): TierLines {
  const obj = asRecord(raw, file, key);
  const out = {} as TierLines;
  for (const tier of LINE_TIERS) {
    out[tier] = loadLines(at(obj, tier, file, `${key}.${tier}`), file, `${key}.${tier}`, min);
  }
  return out;
}

function loadCabinet(raw: unknown): CabinetSet {
  const file = 'cabinet.json';
  const obj = asRecord(raw, file, 'name');
  const name = asString(req(obj, file, 'name'), file, 'name');
  const tagline = asString(req(obj, file, 'tagline'), file, 'tagline');
  const agentName = asString(req(obj, file, 'agentName'), file, 'agentName');
  if (lineFault(name) !== null) fail(file, 'name');
  if (lineFault(tagline) !== null) fail(file, 'tagline');
  if (lineFault(agentName) !== null) fail(file, 'agentName');
  const wordsRaw = asRecord(req(obj, file, 'words'), file, 'words');
  const words = {} as CabinetSet['words'];
  for (const key of ['valuation', 'hype', 'streak', 'context'] as const) {
    const word = asString(at(wordsRaw, key, file, `words.${key}`), file, `words.${key}`);
    if (lineFault(word) !== null) fail(file, `words.${key}`);
    words[key] = word;
  }
  return { name, tagline, agentName, words };
}

function loadLevels(raw: unknown): LevelsSet {
  const file = 'levels.json';
  const obj = asRecord(raw, file, 'levels');
  const rows = asArray(req(obj, file, 'levels'), file, 'levels');
  if (rows.length < 8) fail(file, 'levels');
  const ids = new Set<string>();
  const levels = rows.map((row, i) => {
    const rec = asRecord(row, file, `levels.${i}`);
    const key = (k: string) => `levels.${i}.${k}`;
    const id = asString(at(rec, 'id', file, key('id')), file, key('id'));
    if (id.trim() === '' || ids.has(id)) fail(file, key('id'));
    ids.add(id);
    const product = asString(at(rec, 'product', file, key('product')), file, key('product'));
    if (lineFault(product) !== null) fail(file, key('product'));
    const bandMin = asBand(at(rec, 'bandMin', file, key('bandMin')), file, key('bandMin'));
    const bandMax = asBand(at(rec, 'bandMax', file, key('bandMax')), file, key('bandMax'));
    if (bandMax < bandMin) fail(file, key('bandMax'));
    const def: LevelDef = {
      id,
      product,
      stack: asStack(at(rec, 'stack', file, key('stack')), file, key('stack')),
      requests: asCount(at(rec, 'requests', file, key('requests')), file, key('requests')),
      bandMin,
      bandMax,
      drainRamp: asUnit(at(rec, 'drainRamp', file, key('drainRamp')), file, key('drainRamp')),
      shipBonus: asNumber(at(rec, 'shipBonus', file, key('shipBonus')), file, key('shipBonus')),
    };
    if (def.shipBonus < 0) fail(file, key('shipBonus'));
    if (rec.drainPerSec !== undefined) {
      def.drainPerSec = asPositive(rec.drainPerSec, file, key('drainPerSec'));
    }
    if (rec.refillShare !== undefined) {
      def.refillShare = asUnit(rec.refillShare, file, key('refillShare'));
    }
    if (rec.messageCost !== undefined) {
      def.messageCost = asUnit(rec.messageCost, file, key('messageCost'));
    }
    return def;
  });
  const creepShare = asUnit(req(obj, file, 'creepShare'), file, 'creepShare');
  const syncShare = asUnit(req(obj, file, 'syncShare'), file, 'syncShare');
  const weakBias = asNumber(req(obj, file, 'weakBias'), file, 'weakBias');
  if (weakBias < 0) fail(file, 'weakBias');
  const endlessRaw = asRecord(req(obj, file, 'endless'), file, 'endless');
  const ekey = (k: string) => `endless.${k}`;
  const products = asString(
    at(endlessRaw, 'products', file, ekey('products')),
    file,
    ekey('products'),
  );
  if (products !== 'products.json') fail(file, ekey('products'));
  const endless: EndlessDef = {
    startBand: asBand(
      at(endlessRaw, 'startBand', file, ekey('startBand')),
      file,
      ekey('startBand'),
    ),
    bandEvery: asCount(
      at(endlessRaw, 'bandEvery', file, ekey('bandEvery')),
      file,
      ekey('bandEvery'),
    ),
    drainStart: asPositive(
      at(endlessRaw, 'drainStart', file, ekey('drainStart')),
      file,
      ekey('drainStart'),
    ),
    drainGrow: asNumber(
      at(endlessRaw, 'drainGrow', file, ekey('drainGrow')),
      file,
      ekey('drainGrow'),
    ),
    products: 'products.json',
    requests: asCount(at(endlessRaw, 'requests', file, ekey('requests')), file, ekey('requests')),
    refillShare: asUnit(
      at(endlessRaw, 'refillShare', file, ekey('refillShare')),
      file,
      ekey('refillShare'),
    ),
    messageCost: asUnit(
      at(endlessRaw, 'messageCost', file, ekey('messageCost')),
      file,
      ekey('messageCost'),
    ),
    shipBonus: asNumber(
      at(endlessRaw, 'shipBonus', file, ekey('shipBonus')),
      file,
      ekey('shipBonus'),
    ),
  };
  if (!(endless.drainGrow >= 1)) fail(file, ekey('drainGrow'));
  if (endless.shipBonus < 0) fail(file, ekey('shipBonus'));
  return { levels, creepShare, syncShare, weakBias, endless };
}

function loadScore(raw: unknown): ScoreSet {
  const file = 'score.json';
  const obj = asRecord(raw, file, 'hypeSteps');
  const stepsRaw = asArray(req(obj, file, 'hypeSteps'), file, 'hypeSteps');
  if (stepsRaw.length < 2) fail(file, 'hypeSteps');
  const hypeSteps = stepsRaw.map((row, i) => {
    const rec = asRecord(row, file, `hypeSteps.${i}`);
    return {
      streak: asNumber(
        at(rec, 'streak', file, `hypeSteps.${i}.streak`),
        file,
        `hypeSteps.${i}.streak`,
      ),
      hype: asPositive(at(rec, 'hype', file, `hypeSteps.${i}.hype`), file, `hypeSteps.${i}.hype`),
    };
  });
  if (hypeSteps[0]!.streak !== 0 || hypeSteps[0]!.hype !== 1) fail(file, 'hypeSteps.0');
  for (let i = 1; i < hypeSteps.length; i++) {
    if (hypeSteps[i]!.streak <= hypeSteps[i - 1]!.streak) fail(file, `hypeSteps.${i}.streak`);
    if (hypeSteps[i]!.hype <= hypeSteps[i - 1]!.hype) fail(file, `hypeSteps.${i}.hype`);
  }
  const milestonesRaw = asArray(req(obj, file, 'milestones'), file, 'milestones');
  if (milestonesRaw.length < 1) fail(file, 'milestones');
  let last = 0;
  const milestones = milestonesRaw.map((row, i) => {
    const rec = asRecord(row, file, `milestones.${i}`);
    const name = asString(
      at(rec, 'name', file, `milestones.${i}.name`),
      file,
      `milestones.${i}.name`,
    );
    if (lineFault(name) !== null) fail(file, `milestones.${i}.name`);
    const threshold = asPositive(
      at(rec, 'at', file, `milestones.${i}.at`),
      file,
      `milestones.${i}.at`,
    );
    if (threshold <= last) fail(file, `milestones.${i}.at`);
    last = threshold;
    return { name, at: threshold };
  });
  const hardcoreRaw = asRecord(req(obj, file, 'hardcore'), file, 'hardcore');
  const hardcore = {
    hypeCap: asPositive(
      at(hardcoreRaw, 'hypeCap', file, 'hardcore.hypeCap'),
      file,
      'hardcore.hypeCap',
    ),
    shipMultiplier: asPositive(
      at(hardcoreRaw, 'shipMultiplier', file, 'hardcore.shipMultiplier'),
      file,
      'hardcore.shipMultiplier',
    ),
  };
  return {
    hypeSteps,
    copilotStreak: asCount(req(obj, file, 'copilotStreak'), file, 'copilotStreak'),
    copilotSeconds: asPositive(req(obj, file, 'copilotSeconds'), file, 'copilotSeconds'),
    copilotDiscount: asUnit(req(obj, file, 'copilotDiscount'), file, 'copilotDiscount'),
    milestones,
    hardcore,
  };
}

function loadContext(raw: unknown): ContextSet {
  const file = 'context.json';
  const obj = asRecord(raw, file, 'tiers');
  const tiersRaw = asRecord(req(obj, file, 'tiers'), file, 'tiers');
  const tiers = {} as ContextSet['tiers'];
  for (const key of TIER_KEYS) {
    const rec = asRecord(req(tiersRaw, file, key), file, key);
    tiers[key] = {
      drainPerSec: asPositive(
        at(rec, 'drainPerSec', file, `${key}.drainPerSec`),
        file,
        `${key}.drainPerSec`,
      ),
      drainScale: asPositive(
        at(rec, 'drainScale', file, `${key}.drainScale`),
        file,
        `${key}.drainScale`,
      ),
      messageCost: asUnit(
        at(rec, 'messageCost', file, `${key}.messageCost`),
        file,
        `${key}.messageCost`,
      ),
      refillShare: asUnit(
        at(rec, 'refillShare', file, `${key}.refillShare`),
        file,
        `${key}.refillShare`,
      ),
      hardcoreBurnPerError: asUnit(
        at(rec, 'hardcoreBurnPerError', file, `${key}.hardcoreBurnPerError`),
        file,
        `${key}.hardcoreBurnPerError`,
      ),
    };
  }
  if (tiers['3'].hardcoreBurnPerError <= 0) fail(file, '3.hardcoreBurnPerError');
  if (tiers['0'].drainScale !== 1) fail(file, '0.drainScale');
  for (const key of ['1', '2', '3'] as const) {
    if (tiers[key].drainScale < tiers[String(Number(key) - 1) as '0' | '1' | '2'].drainScale) {
      fail(file, `${key}.drainScale`);
    }
  }
  return { tiers };
}

function loadDifficulty(raw: unknown): DifficultySet {
  const file = 'difficulty.json';
  const obj = asRecord(raw, file, 'keys');
  const keysRaw = asRecord(req(obj, file, 'keys'), file, 'keys');
  const keys: Record<string, KeyPos> = {};
  for (const [ch, value] of Object.entries(keysRaw)) {
    if (ch.length !== 1) fail(file, `keys.${ch}`);
    const rec = asRecord(value, file, `keys.${ch}`);
    const hand = asString(at(rec, 'hand', file, `keys.${ch}.hand`), file, `keys.${ch}.hand`);
    if (hand !== 'l' && hand !== 'r') fail(file, `keys.${ch}.hand`);
    keys[ch] = {
      row: asNumber(at(rec, 'row', file, `keys.${ch}.row`), file, `keys.${ch}.row`),
      col: asNumber(at(rec, 'col', file, `keys.${ch}.col`), file, `keys.${ch}.col`),
      hand,
      finger: asNumber(at(rec, 'finger', file, `keys.${ch}.finger`), file, `keys.${ch}.finger`),
    };
  }
  if (Object.keys(keys).length < 40) fail(file, 'keys');
  const shiftRaw = asRecord(req(obj, file, 'shift'), file, 'shift');
  const shift: Record<string, string> = {};
  for (const [ch, value] of Object.entries(shiftRaw)) {
    const base = asString(value, file, `shift.${ch}`);
    if (ch.length !== 1 || base.length !== 1 || !keys[base]) fail(file, `shift.${ch}`);
    shift[ch] = base;
  }
  const costsRaw = asRecord(req(obj, file, 'costs'), file, 'costs');
  const costs = {} as DifficultySet['costs'];
  for (const key of [
    'repeat',
    'sameFinger',
    'sameHand',
    'alternate',
    'rowJump',
    'shift',
    'space',
    'newline',
    'unknown',
  ] as const) {
    const n = asNumber(at(costsRaw, key, file, `costs.${key}`), file, `costs.${key}`);
    if (n < 0) fail(file, `costs.${key}`);
    costs[key] = n;
  }
  const weightsRaw = asRecord(req(obj, file, 'weights'), file, 'weights');
  const weights = {} as DifficultySet['weights'];
  for (const key of [
    'surprisal',
    'travel',
    'length',
    'punctuation',
    'identifier',
    'identifierMin',
    'bracket',
    'scale',
  ] as const) {
    const n = asNumber(at(weightsRaw, key, file, `weights.${key}`), file, `weights.${key}`);
    if (n < 0) fail(file, `weights.${key}`);
    weights[key] = n;
  }
  if (!(weights.scale > 0)) fail(file, 'weights.scale');
  if (!(weights.identifierMin >= 1)) fail(file, 'weights.identifierMin');
  return { keys, shift, costs, weights };
}

function loadUser(raw: unknown): UserSet {
  const file = 'user.json';
  const obj = asRecord(raw, file, 'asks');
  const asksRaw = asRecord(req(obj, file, 'asks'), file, 'asks');
  const asks = {} as UserSet['asks'];
  for (const stack of STACKS) {
    asks[stack] = loadTierLines(
      at(asksRaw, stack, file, `asks.${stack}`),
      file,
      `asks.${stack}`,
      MIN_ASKS,
    );
  }
  return {
    asks,
    reactions: loadTierLines(req(obj, file, 'reactions'), file, 'reactions', MIN_REACTIONS),
    creeps: loadLines(req(obj, file, 'creeps'), file, 'creeps', MIN_CREEPS),
    reviews: loadLines(req(obj, file, 'reviews'), file, 'reviews', MIN_REVIEWS),
    syncs: loadSyncs(req(obj, file, 'syncs'), file, 'syncs'),
    dated: loadLines(req(obj, file, 'dated'), file, 'dated', MIN_DATED),
  };
}

/** The sync pool: the gate, plus a word cap, because a meeting line is short. */
function loadSyncs(raw: unknown, file: string, key: string): string[] {
  const list = loadLines(raw, file, key, MIN_SYNCS);
  list.forEach((line, i) => {
    if (line.split(/\s+/).length > MAX_SYNC_WORDS) fail(file, `${key}.${i}`);
  });
  return list;
}

function loadAgent(raw: unknown): AgentSet {
  const file = 'agent.json';
  const obj = asRecord(raw, file, 'replies');
  return {
    replies: loadLines(req(obj, file, 'replies'), file, 'replies', MIN_REPLIES),
    hmm: loadLines(req(obj, file, 'hmm'), file, 'hmm', MIN_HMM),
    compactions: loadLines(req(obj, file, 'compactions'), file, 'compactions', MIN_COMPACTIONS),
    ships: loadLines(req(obj, file, 'ships'), file, 'ships', MIN_SHIPS),
  };
}

function loadProducts(raw: unknown): ProductsSet {
  const file = 'products.json';
  const obj = asRecord(raw, file, 'nouns');
  const nouns = loadLines(req(obj, file, 'nouns'), file, 'nouns', 16);
  const templates = loadLines(req(obj, file, 'templates'), file, 'templates', 8);
  for (const [i, t] of templates.entries()) {
    if (!t.includes('{noun}')) fail(file, `templates.${i}`);
  }
  return { nouns, templates };
}

const FILES = [
  'cabinet',
  'levels',
  'score',
  'context',
  'difficulty',
  'user',
  'agent',
  'products',
] as const;

/** Validate every lever. The message is `patterns/<file>: <key>` for the first bad key. */
export function loadPatterns(raw: unknown): Patterns {
  const obj = isRecord(raw) ? raw : fail('cabinet.json', 'cabinet');
  for (const name of FILES) {
    if (!Object.prototype.hasOwnProperty.call(obj, name)) fail(`${name}.json`, name);
  }
  const levels = loadLevels(obj.levels);
  const user = loadUser(obj.user);
  // A level's stack must have asks; the integration stack is planned, never listed.
  for (const [i, def] of levels.levels.entries()) {
    if (!user.asks[def.stack]) fail('user.json', `asks.${def.stack}`);
    if (def.stack === 'integration') fail('levels.json', `levels.${i}.stack`);
  }
  return {
    cabinet: loadCabinet(obj.cabinet),
    levels,
    score: loadScore(obj.score),
    context: loadContext(obj.context),
    difficulty: loadDifficulty(obj.difficulty),
    user,
    agent: loadAgent(obj.agent),
    products: loadProducts(obj.products),
  };
}

/** The tier key a line pool is read under; hardcore borrows tier two's words. */
export function lineTier(tier: Tier): '0' | '1' | '2' {
  return tier === 3 ? '2' : (String(tier) as '0' | '1' | '2');
}

/** The context defaults for a tier, before a level overrides them. */
export function tierContext(set: Patterns, tier: Tier): ContextTier {
  return set.context.tiers[String(tier) as '0' | '1' | '2' | '3'];
}

export const DEFAULT_PATTERNS: Patterns = loadPatterns({
  cabinet: cabinetJson,
  levels: levelsJson,
  score: scoreJson,
  context: contextJson,
  difficulty: difficultyJson,
  user: userJson,
  agent: agentJson,
  products: productsJson,
});
