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

import type { Band, Beat, Stack, Tier } from './types';

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
 * `Sprocket`, which no word here matches on a boundary.
 */
export const MODEL_FORBIDDEN =
  /\b(claude|gpt|chatgpt|opus|sonnet|haiku|gemini|llama|mistral|qwen|grok|kimi|codex|copilot|cursor|openai|anthropic|ollama|deepseek)\b/i;

/**
 * Ghost's list bars a word on its boundary, so a plural or a verb form of a
 * barred word slipped past it (the authoring sample kept `scores`). The list
 * above must stay identical to Ghost's, so the forms are barred here, beside
 * it, and `lineFault` reads both. Only the forms that still carry the barred
 * meaning: `a following` and `holds` are ordinary words in a fond line.
 */
export const FORM_FORBIDDEN =
  /\b(lies|lied|facts|scores|scored|scoring|passes|passed|fails|failed|failing|ghosts)\b/i;

/**
 * Every beat, so the loader can require a word for each. The `satisfies`
 * object below is the exhaustiveness check: add a member to `Beat` and this
 * file stops compiling until the beat is listed here and worded in the lever.
 */
const BEAT_KEYS = {
  request: true,
  reply: true,
  code: true,
  creep: true,
  sync: true,
  ship: true,
  compaction: true,
} satisfies Record<Beat, true>;
export const BEATS = Object.keys(BEAT_KEYS) as readonly Beat[];

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
// The pool floors. A floor is a no-repeat guarantee: a level draws at most a
// handful of lines from each pool and never repeats one inside the level, so
// the floor is that handful with room, and a pool that falls under it fails
// the load, which fails the build. Slice three's authoring run had raised the
// floors to three times the hand-written size; the coordinator's proofread
// after 0.11.0 (the Director read the game and the lines were nonsense) cut
// every pool that lands against a request to the lines that make sense
// against any request, and set the floors back to what the draw needs. Size
// was never quality, and the pools that are drawn blind — the agent's replies,
// ship lines and check-in answers, the user's check-ins, creeps and generic
// reviews — may not name a piece the request did not ask for; a test holds
// that rule now. `scripts/author.mjs` tops pools up to these same numbers.
const MIN_ASKS = 8;
const MIN_REACTIONS = 36;
const MIN_CREEPS = 12;
// Ten since the health pass: the generic reviews also serve as the reaction while
// the by-topic pool is off, and a level draws at most three reactions and one
// verdict, so ten leaves room with no repeat; two lines that asserted a launch
// mid-level were cut by the lead.
const MIN_REVIEWS = 10;
/**
 * A quick sync is three of these; a level must never repeat one. The floor
 * is what a level's draw needs with room to spare, not the count the pool
 * happened to have: two sync lines were cut when the pool joined the
 * lines-neutral gate (they named a piece the request never asked for) and a
 * floor pinned to the old size would have made the cut a halt.
 */
const MIN_SYNCS = 32;
/** A sync line is chatter, not a sentence: five words is the ceiling (slice 2). */
const MAX_SYNC_WORDS = 5;
/** Check-ins and the agent's answers to them: a level draws a few of each. */
const MIN_NAGS = 16;
const MIN_NAG_REPLIES = 12;
const MIN_REPLIES = 16;
const MIN_HMM = 12;
/** Lowered with MIN_SYNCS, and for the same reason: two lines were cut. */
const MIN_COMPACTIONS = 20;
const MIN_SHIPS = 8;

/**
 * The user's delivery, authored data (slice 4C). One preset speaks every one
 * of their lines; the worker owns the catalog and refuses a name it does not
 * have, so the loader checks the shape and the worker checks the membership.
 * `patterns/voice/user.md` names the same preset under `## The voice`, and a
 * test holds the two together so the writing brief and the lever cannot
 * disagree about who is talking.
 */
export interface VoiceSet {
  user: {
    preset: string;
    /** Speech rate multiplier, the worker's own bounds. */
    rate: number;
    /** Gain in decibels around the preset's level. */
    loudness: number;
  };
  /**
   * The longest mid-line pause a take may hold before the receipt calls it a
   * hole, seconds. fx-dub's default, which the user's lines never reached in
   * measurement because `lineFault` caps them at one sentence.
   */
  maxGap: number;
}

/** A preset name as the worker spells them: a short ASCII token. */
const PRESET_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/i;

export interface CabinetSet {
  name: string;
  tagline: string;
  agentName: string;
  voice: VoiceSet;
  words: {
    valuation: string;
    hype: string;
    streak: string;
    context: string;
    /** The beat in words. The enum is never on screen (slice 2's decision 5). */
    beats: Record<Beat, string>;
  };
}

export interface LevelDef {
  id: string;
  product: string;
  /** The level's premise in one line, through the same gate as every line. */
  story: string;
  stack: Stack;
  /**
   * The level's requests by snippet id, in story order, when the level is
   * authored end to end. Exactly `requests` ids, all from the level's stack.
   * Absent, the level draws from its band as it always has.
   */
  snippets?: string[];
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
  /** Seconds of frame time between two check-ins, drawn per nag (slice 3). */
  nagEvery: { min: number; max: number };
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
  /** Reactions that know what shipped, keyed by a corpus topic (slice 3). */
  reactionsByTopic: Record<string, string[]>;
  /**
   * Whether the picker may draw `reactionsByTopic` at all. Off.
   *
   * The pool is keyed to the *code construct* a snippet carries, not to the
   * request the user made, so the line that lands after an ask reads as a
   * metaphor for a loop or an insert and not as an answer: "the new duck
   * slips into the lineup." after "add my first sandwich to a ledger". Until
   * an authoring run writes reactions per snippet, the picker draws the
   * tier's neutral reactions, which are held to the lines-neutral gate. The
   * data and the loader stay so that run has somewhere to land.
   *
   * Turning it on is not a one-character change: `loadUser` halts on the
   * first by-topic or tier line that names a piece the request never asked
   * for, and it names that line. Cleaning the pools is the price of the
   * flip, which is what the flip was always asking for.
   */
  reactionsByTopicEnabled: boolean;
  creeps: string[];
  reviews: string[];
  /** Reviews that name the product, keyed by level id (slice 3). */
  reviewsByProduct: Record<string, string[]>;
  /** The check-ins the user sends while you type (slice 3). */
  nags: string[];
  /** The quick sync's chatter; the player types three of them (slice 2). */
  syncs: string[];
}

export interface AgentSet {
  replies: string[];
  hmm: string[];
  compactions: string[];
  ships: string[];
  /** What the agent says back to a check-in: fond, sycophantic, unbothered. */
  nagReplies: string[];
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

/**
 * Things a request might build. A line that lands against a request the
 * writer never read may not name one: "the greeting is almost ready" is
 * nonsense against a request to make the login faster, and the Director read
 * exactly that on the published 0.11.0.
 *
 * The list lived in test/lines-neutral.test.ts, which is still where it is
 * scanned across every blind pool and where its limits are written out — it
 * is a denylist and a floor, not the property, and the vocabulary rule next
 * to it is what fails closed. It is here as well because one lever, and only
 * one, can re-light a pool of lines this rule catches by flipping a boolean,
 * and a gate a test cannot reach is no gate at all: see `loadUser`.
 */
export const PIECES: readonly string[] = [
  'greeting',
  'button',
  'table',
  'list',
  'chart',
  'background',
  'image',
  'picture',
  'card',
  'header',
  'footer',
  'badge',
  'slider',
  'clock',
  'countdown',
  'menu',
  'grid',
  'stepper',
  'avatar',
  'banner',
  'picker',
  'frame',
  'layer',
  'border',
  'font',
  'heading',
  'link',
  'icon',
  'margin',
  'row',
  'column',
  'form',
  'screen',
  'sidebar',
  'tooltip',
  'spinner',
  'dashboard',
  'radio',
  'checkbox',
  'input',
  'label',
  'email',
  'login',
  'search',
  'profile',
  'page',
  'map',
  'calendar',
  'timer',
  'progress',
  'duck',
  'yogurt',
  'fridge',
  'toaster',
  'door',
  'hat',
  'bonnet',
  'sock',
  // Ordinary things a request builds that the first list missed. Added
  // because a denylist that stops growing stops catching, not because any
  // line used them.
  'modal',
  'drawer',
  'carousel',
  'toggle',
  'tab',
  'navbar',
  'accordion',
  'gallery',
  'widget',
  'cart',
  'playlist',
  'invoice',
  'panel',
  'tile',
  'gauge',
  'timeline',
  'overlay',
];

/**
 * Plural-aware: `column` bars `columns`, which is the form the line the
 * Director read actually used. `piece` is deliberately not in the list — it
 * is the game's own word for whatever got built and is true of every
 * request.
 */
export const PIECE_RULE = new RegExp(`\\b(${PIECES.join('|')})(?:s|es)?\\b`, 'i');

/** True when a line names a thing the request may never have asked for. */
export function namesAPiece(line: string): boolean {
  return PIECE_RULE.test(line);
}

/** Why this line cannot be said, or null. One reason, in words. */
export function lineFault(line: string): string | null {
  if (typeof line !== 'string' || line.trim() === '') return 'empty';
  if (line !== line.trim()) return 'padded';
  if (VOICE_FORBIDDEN.test(line)) return 'forbidden word or digit';
  if (FORM_FORBIDDEN.test(line)) return 'forbidden word or digit';
  if (MODEL_FORBIDDEN.test(line)) return 'names a tool or a model';
  // A curly quote or a dash from a writing model is not a key on this
  // keyboard; the line is refused, never straightened (the gate never fixes).
  if (/[^\x20-\x7e]/.test(line)) return 'not ascii';
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

/**
 * The voice block. Every bound here is the worker's own (`voice/worker.py`):
 * a rate outside `0.5..2.0`, a loudness outside `-24..12` or a gap outside
 * `0.1..3.0` is a 400 from the worker, and a halt at load is a better place
 * to learn that than a silent cabinet.
 */
function loadVoice(raw: unknown, file: string): VoiceSet {
  const obj = asRecord(raw, file, 'voice');
  const userRaw = asRecord(at(obj, 'user', file, 'voice.user'), file, 'voice.user');
  const preset = asString(
    at(userRaw, 'preset', file, 'voice.user.preset'),
    file,
    'voice.user.preset',
  );
  if (!PRESET_RE.test(preset)) fail(file, 'voice.user.preset');
  const rate = asNumber(at(userRaw, 'rate', file, 'voice.user.rate'), file, 'voice.user.rate');
  if (!(rate >= 0.5 && rate <= 2)) fail(file, 'voice.user.rate');
  const loudness = asNumber(
    at(userRaw, 'loudness', file, 'voice.user.loudness'),
    file,
    'voice.user.loudness',
  );
  if (!(loudness >= -24 && loudness <= 12)) fail(file, 'voice.user.loudness');
  const maxGap = asNumber(at(obj, 'maxGap', file, 'voice.maxGap'), file, 'voice.maxGap');
  if (!(maxGap >= 0.1 && maxGap <= 3)) fail(file, 'voice.maxGap');
  return { user: { preset, rate, loudness }, maxGap };
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
  const voice = loadVoice(req(obj, file, 'voice'), file);
  const wordsRaw = asRecord(req(obj, file, 'words'), file, 'words');
  const words = { beats: {} as Record<Beat, string> } as CabinetSet['words'];
  for (const key of ['valuation', 'hype', 'streak', 'context'] as const) {
    const word = asString(at(wordsRaw, key, file, `words.${key}`), file, `words.${key}`);
    if (lineFault(word) !== null) fail(file, `words.${key}`);
    words[key] = word;
  }
  const beatsRaw = asRecord(at(wordsRaw, 'beats', file, 'words.beats'), file, 'words.beats');
  for (const beat of BEATS) {
    const key = `words.beats.${beat}`;
    const word = asString(at(beatsRaw, beat, file, key), file, key);
    if (lineFault(word) !== null) fail(file, key);
    words.beats[beat] = word;
  }
  return { name, tagline, agentName, voice, words };
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
    const story = asString(at(rec, 'story', file, key('story')), file, key('story'));
    if (lineFault(story) !== null) fail(file, key('story'));
    const bandMin = asBand(at(rec, 'bandMin', file, key('bandMin')), file, key('bandMin'));
    const bandMax = asBand(at(rec, 'bandMax', file, key('bandMax')), file, key('bandMax'));
    if (bandMax < bandMin) fail(file, key('bandMax'));
    const def: LevelDef = {
      id,
      product,
      story,
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
    if (rec.snippets !== undefined) {
      // A level authored end to end pins its requests by id, in story order.
      // That the ids exist in the level's stack is a corpus question, and the
      // loader never reads the corpus: level.test.ts checks it, so a typo
      // halts `pnpm test` rather than the first play-through that draws it.
      const pinned = asArray(rec.snippets, file, key('snippets')).map((item, j) =>
        asString(item, file, `${key('snippets')}.${j}`),
      );
      if (pinned.length !== def.requests) fail(file, key('snippets'));
      const seenIds = new Set<string>();
      pinned.forEach((snippetId, j) => {
        if (snippetId.trim() === '' || seenIds.has(snippetId)) {
          fail(file, `${key('snippets')}.${j}`);
        }
        seenIds.add(snippetId);
      });
      def.snippets = pinned;
    }
    return def;
  });
  const creepShare = asUnit(req(obj, file, 'creepShare'), file, 'creepShare');
  const syncShare = asUnit(req(obj, file, 'syncShare'), file, 'syncShare');
  const weakBias = asNumber(req(obj, file, 'weakBias'), file, 'weakBias');
  if (weakBias < 0) fail(file, 'weakBias');
  const nagRaw = asRecord(req(obj, file, 'nagEvery'), file, 'nagEvery');
  const nagEvery = {
    min: asPositive(at(nagRaw, 'min', file, 'nagEvery.min'), file, 'nagEvery.min'),
    max: asPositive(at(nagRaw, 'max', file, 'nagEvery.max'), file, 'nagEvery.max'),
  };
  if (nagEvery.max < nagEvery.min) fail(file, 'nagEvery.max');
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
  return { levels, creepShare, syncShare, weakBias, nagEvery, endless };
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
  // The lever that decides whether the by-topic pool is ever drawn. Absent
  // reads as off, so a lever file that predates the switch loads and plays
  // the neutral reactions.
  const enabled = obj.reactionsByTopicEnabled;
  if (enabled !== undefined && typeof enabled !== 'boolean') fail(file, 'reactionsByTopicEnabled');
  const reactions = loadTierLines(req(obj, file, 'reactions'), file, 'reactions', MIN_REACTIONS);
  const reactionsByTopic = loadPools(req(obj, file, 'reactionsByTopic'), file, 'reactionsByTopic');
  // The lever was a one-character cliff with nothing behind it. Flipping it
  // re-lights the by-topic pool — keyed to the snippet's code construct and
  // not to the request, so it draws a metaphor for a loop against whatever
  // was asked — and the tier pool behind it, which was authored as "the user
  // names the thing that just shipped". Both carry lines that name a piece
  // the request never asked for: the class the Director read on the
  // published 0.11.0. Nothing measured either pool, and the loader took
  // `true` without a further word.
  //
  // So the flip is now a gate rather than a cliff. Turning it on means the
  // pools it turns on have been cleaned first; until then the load halts and
  // names the line, which is the whole size of the job it is asking for. The
  // tier pool is held too, because the by-topic path falls through to it for
  // a snippet whose topics have no pool of their own.
  if (enabled === true) {
    for (const [name, pool] of Object.entries(reactionsByTopic)) {
      pool.forEach((line, i) => {
        if (namesAPiece(line)) fail(file, `reactionsByTopic.${name}.${i}`);
      });
    }
    for (const tier of LINE_TIERS) {
      reactions[tier].forEach((line, i) => {
        if (namesAPiece(line)) fail(file, `reactions.${tier}.${i}`);
      });
    }
  }
  return {
    asks,
    reactions,
    reactionsByTopic,
    reactionsByTopicEnabled: enabled === true,
    creeps: loadLines(req(obj, file, 'creeps'), file, 'creeps', MIN_CREEPS),
    reviews: loadLines(req(obj, file, 'reviews'), file, 'reviews', MIN_REVIEWS),
    reviewsByProduct: loadPools(req(obj, file, 'reviewsByProduct'), file, 'reviewsByProduct'),
    nags: loadLines(req(obj, file, 'nags'), file, 'nags', MIN_NAGS),
    syncs: loadSyncs(req(obj, file, 'syncs'), file, 'syncs'),
  };
}

/**
 * A record of named pools — reactions by topic, reviews by product. The
 * record may be empty; a pool that is there carries at least one line and
 * every line passes the gate. The halt names the pool and the line.
 */
function loadPools(raw: unknown, file: string, key: string): Record<string, string[]> {
  const obj = asRecord(raw, file, key);
  const out: Record<string, string[]> = {};
  for (const name of Object.keys(obj)) {
    if (name.trim() === '') fail(file, key);
    out[name] = loadLines(obj[name], file, `${key}.${name}`, 1);
  }
  return out;
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
    nagReplies: loadLines(req(obj, file, 'nagReplies'), file, 'nagReplies', MIN_NAG_REPLIES),
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
  // A level's stack must have asks. The integration stack may be listed as of
  // slice 3 — two of the sixteen levels are about wiring the little tools
  // together — but it has no corpus file: it is built from tape headers at
  // play time, so there is no id in it that a story could pin. A listed
  // integration level therefore draws its four requests from its band, and a
  // pinned list on one is the halt.
  for (const [i, def] of levels.levels.entries()) {
    if (!user.asks[def.stack]) fail('user.json', `asks.${def.stack}`);
    if (def.stack === 'integration' && def.snippets) fail('levels.json', `levels.${i}.snippets`);
  }
  // A review keyed to a product that is not a level id never fires: the
  // picker looks the plan's id up and falls through to the generic pool with
  // no signal at all. Every other lever in this file halts at load on a bad
  // key, and this one now does too — a renamed level takes its reviews with
  // it or the cabinet does not start.
  const levelIds = new Set(levels.levels.map((def) => def.id));
  for (const name of Object.keys(user.reviewsByProduct)) {
    if (!levelIds.has(name)) fail('user.json', `reviewsByProduct.${name}`);
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

// Pure for the same reason `DEFAULT_CORPUS` is: see the note there. The
// levers are read by the cabinet, the tests and the play-through, and the
// loader still halts on the first bad key for all of them. It is only a
// bundle that carries the other cabinet that gets to drop this.
export const DEFAULT_PATTERNS: Patterns = /* #__PURE__ */ loadPatterns({
  cabinet: cabinetJson,
  levels: levelsJson,
  score: scoreJson,
  context: contextJson,
  difficulty: difficultyJson,
  user: userJson,
  agent: agentJson,
  products: productsJson,
});
