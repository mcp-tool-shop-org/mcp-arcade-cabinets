// G26, G27: the request order, each request's code and each request's value
// are fixed at level start from the seed. Difficulty is a formula and the
// levels climb on it; the seed biases toward this browser's weak pairs and
// never toward a repeat (Q1.9).

import { inBand, weakWeight, type Corpus } from './corpus';
import { value as valueOf } from './difficulty';
import { fill, type LinePicker } from './lines';
import { CORPUS_STACKS, type LevelDef, type Patterns } from './patterns';
import { mixSeed, seededRandom, weightedPick } from './seed';
import type { Band, FedSnippet, LevelPlan, Request, Snippet, Stack, Tier } from './types';

export interface PlanOpts {
  set: Patterns;
  corpus: Corpus;
  picker: LinePicker;
  levelIndex: number;
  seed: number;
  tier: Tier;
  endless: boolean;
  weakBigrams: Record<string, number>;
  /** Snippet ids already spent in this run; the planner never repeats one. */
  used: Set<string>;
  /** Forces every level's stack, for a run pinned to one language. */
  stack?: Stack;
  /**
   * Requests a seated model wrote, already through the code gate (G28 as
   * slice 3 amends it). Endless only: the first of them fill the level's
   * requests in order and are spliced off this buffer; the rest of the
   * level is drawn from the corpus exactly as it always was. A listed
   * level ignores the buffer entirely - the levels are the band's ground.
   *
   * Each item carries the level and stack it was written for, and the
   * planner drops one whose tag does not match the level it is planning.
   */
  supplied?: FedSnippet[];
  /**
   * The product the seat named for a new endless level. The noun list is
   * still drawn first, so the seed's stream is untouched whether or not a
   * seat is sitting; this overrides the drawn string afterwards.
   */
  product?: string;
}

function band(n: number): Band {
  return Math.min(7, Math.max(1, Math.round(n))) as Band;
}

/** Which bands the endless ladder draws from at a level index (G27). */
export function endlessBandAt(set: Patterns, levelIndex: number): { bandMin: Band; bandMax: Band } {
  const e = set.levels.endless;
  const low = band(e.startBand + Math.floor(levelIndex / e.bandEvery));
  return { bandMin: low, bandMax: band(low + 1) };
}

/** The seeded stream a level is planned from. The shell reads it to look ahead. */
export function levelSeedFor(seed: number, levelIndex: number, tier: Tier): number {
  return mixSeed(seed, levelIndex * 7919 + tier);
}

/** What `endlessDef` needs; PlanOpts satisfies it, and so does a peek. */
interface EndlessAt {
  set: Patterns;
  levelIndex: number;
  stack?: Stack;
}

/** An endless level: the product is drawn, the band climbs, the drain grows. */
function endlessDef(opts: EndlessAt, rng: () => number): LevelDef {
  const e = opts.set.levels.endless;
  const i = opts.levelIndex;
  const products = opts.set.products;
  const noun = products.nouns[Math.floor(rng() * products.nouns.length)]!;
  const template = products.templates[Math.floor(rng() * products.templates.length)]!;
  const stacks = CORPUS_STACKS;
  const stack = opts.stack ?? stacks[Math.floor(rng() * stacks.length)]!;
  const bands = endlessBandAt(opts.set, i);
  return {
    id: `endless-${i}`,
    product: template.split('{noun}').join(noun),
    // An endless level has no authored premise; the standup shows nothing.
    story: '',
    stack,
    requests: e.requests,
    bandMin: bands.bandMin,
    bandMax: bands.bandMax,
    drainPerSec: e.drainStart * Math.pow(e.drainGrow, i),
    drainRamp: 0,
    refillShare: e.refillShare,
    messageCost: e.messageCost,
    shipBonus: e.shipBonus,
  };
}

/**
 * The endless level a run would plan at this index, without planning it:
 * the product, the stack and the band range. The shell asks for it so the
 * seat is told the language and the band of the level it is writing for,
 * one level before that level exists. It draws from a fresh stream of the
 * same seed, so peeking changes nothing.
 */
export function endlessPeek(opts: {
  set: Patterns;
  seed: number;
  tier: Tier;
  levelIndex: number;
  stack?: Stack;
}): LevelDef {
  const at: EndlessAt = { set: opts.set, levelIndex: opts.levelIndex };
  if (opts.stack) at.stack = opts.stack;
  return endlessDef(at, seededRandom(levelSeedFor(opts.seed, opts.levelIndex, opts.tier)));
}

/** The suffix a level's id carries once the run has moved it off its stack. */
export const MOVED_SUFFIX = '-moved';

/** The level definition at an index, or null when a listed run is finished. */
export function levelDefAt(opts: PlanOpts, rng: () => number): LevelDef | null {
  if (opts.endless) return endlessDef(opts, rng);
  const def = opts.set.levels.levels[opts.levelIndex];
  if (!def) return null;
  if (!opts.stack) return def;
  // A run pinned to one language drops the level's pinned snippets when the
  // language is not the level's own: those ids live in the level's stack, and
  // a run that moved the stack asked for the band, not for the story.
  if (opts.stack === def.stack) return { ...def, stack: opts.stack };
  // Moved off its stack, the level is moved off its story too. It used to
  // keep the authored id, product and premise while drawing its four
  // requests from another language: `--stack sql --level 1` announced "a
  // rideshare for ducks", asked for a sandwich ledger in SQL, and closed
  // with the review written for the ducks. The product now comes from the
  // list the endless ladder draws from, the premise goes (there is none for
  // this pairing), and the id carries a suffix so `reviewsByProduct` misses
  // and the generic reviews play — the same three moves `endlessDef` makes
  // for a level that has no authored story at all.
  const products = opts.set.products;
  const noun = products.nouns[Math.floor(rng() * products.nouns.length)]!;
  const template = products.templates[Math.floor(rng() * products.templates.length)]!;
  const moved: LevelDef = {
    ...def,
    id: `${def.id}${MOVED_SUFFIX}`,
    product: template.split('{noun}').join(noun),
    story: '',
    stack: opts.stack,
  };
  delete moved.snippets;
  return moved;
}

/**
 * Candidates for a request: unused, in band, widening only when it must.
 *
 * The last rung used to hand back the whole stack unfiltered, so once a
 * stack's free pool was spent the planner drew already-played snippets with
 * no signal anywhere — no event, no flag, nothing in the transcript —
 * against this file's own claim that the seed never biases toward a repeat
 * (Q1.9). A run pinned to one stack spends four snippets a level out of the
 * forty or so in band, so an endless session passes that point inside ten
 * levels, and `used` was never pruned, so the run could not start a fresh
 * cycle deliberately either.
 *
 * Reaching that rung now clears the stack's ids out of `used` — a new cycle,
 * declared rather than drifted into — keeping only what this level has
 * already drawn, so a repeat is never back to back inside a level. The
 * caller records it on the plan (`recycled`), which is how "the stack ran
 * out" reaches the shell and the transcript.
 */
function candidates(
  corpus: Corpus,
  stack: Stack,
  def: LevelDef,
  used: Set<string>,
  drawnHere: ReadonlySet<string>,
): { pool: Snippet[]; recycled: boolean } {
  const near = inBand(corpus, stack, def.bandMin, def.bandMax);
  const wider = inBand(corpus, stack, band(def.bandMin - 1), band(def.bandMax + 1));
  for (const list of [near, wider]) {
    const free = list.filter((s) => !used.has(s.id));
    if (free.length > 0) return { pool: free, recycled: false };
  }
  const all = corpus.byStack[stack] ?? [];
  const spent = all.filter((s) => !used.has(s.id));
  if (spent.length > 0) return { pool: spent, recycled: false };
  for (const snippet of all) {
    if (!drawnHere.has(snippet.id)) used.delete(snippet.id);
  }
  const fresh = all.filter((s) => !drawnHere.has(s.id));
  return fresh.length > 0
    ? { pool: fresh, recycled: true }
    : { pool: [...all], recycled: all.length > 0 };
}

/**
 * The creep for a request, in the snippet's own words when it has them.
 *
 * The creep beat's whole comedy is that the user is changing the job
 * mid-build, and it was the one beat where the ask and the code came from
 * unrelated draws: the line was lifted out of a randomly chosen OTHER
 * snippet in the band and the "oh also" was drawn blind from the pool, so
 * the follow-up request and the line the player typed about it had no
 * relationship at all. This is the closing slice 3 made for requests
 * (`Snippet.ask`), on the beat it was left open on.
 *
 * A snippet's own creep honors the same `for` binding its ask does — a creep
 * that leans on one story's premise plays only in that level. A snippet
 * without one falls through to the band draw and the template pool, which is
 * the path this cabinet has always played.
 *
 * NOT closed here, and the lead's call: the request's own snippet has no
 * spare row to lend. Every non-blank row of it is typed already, so a creep
 * drawn from it would repeat a line the player just finished. That is why
 * the fallback is still another snippet's row rather than this one's.
 */
function authoredCreep(snippet: Snippet, levelId: string): { line: string; ask: string } | null {
  const own = snippet.creep;
  if (!own) return null;
  const bound = typeof snippet.for === 'string' && snippet.for !== '';
  if (bound && snippet.for !== levelId) return null;
  return { line: own.line, ask: own.ask };
}

/** A one-line addition from the same stack at or under the request's band. */
function creepLine(corpus: Corpus, stack: Stack, at: Band, rng: () => number): string | null {
  const pool = inBand(corpus, stack, 1, at).filter(
    (s) => s.code.includes('\n') || s.code.length > 0,
  );
  if (pool.length === 0) return null;
  const snippet = pool[Math.floor(rng() * pool.length)]!;
  const lines = snippet.code.split('\n').filter((l) => l.trim() !== '');
  if (lines.length === 0) return null;
  return lines[Math.floor(rng() * lines.length)]!;
}

/**
 * Plan one level: the ordered requests with their fixed code and value.
 * Same levers, same seed, same weak pairs — same plan, byte for byte.
 */
export function planLevel(opts: PlanOpts): LevelPlan | null {
  const levelSeed = levelSeedFor(opts.seed, opts.levelIndex, opts.tier);
  const rng = seededRandom(levelSeed);
  const def = levelDefAt(opts, rng);
  if (!def) return null;
  const tierDefaults = opts.set.context.tiers[String(opts.tier) as '0' | '1' | '2' | '3'];
  const stack = def.stack;
  const weakBias = opts.set.levels.weakBias;
  // The seat's requests, in the order they were fed, and only in endless.
  // Splicing them off is what makes the buffer a queue the shell refills
  // one request at a time while the current one is typed (G13).
  const buffer = opts.endless ? (opts.supplied ?? []) : [];
  const spliced = buffer.length > 0 ? buffer.splice(0, Math.min(def.requests, buffer.length)) : [];
  // A fed request is used only in the level it was written for. A seat that
  // over-delivers leaves the surplus in the buffer, and the next level draws
  // a fresh random stack; without this the leftovers were typed under
  // another language's bed, palette and device frame, carrying an ask
  // written for the previous product. A dropped one is dropped, not
  // requeued: the corpus draw below is the no-seat path and is always right.
  const taken = spliced
    .filter((fed) => fed.levelIndex === opts.levelIndex && fed.stack === stack)
    .map((fed) => fed.snippet);
  // The noun list was drawn above, inside `levelDefAt`, so the stream is
  // the same whether or not a seat is sitting. The override lands after.
  //
  // It no longer waits on a fed request. Slice 4 gives the container a
  // `product` tool of its own, so a client can name the thing it wants
  // built before it has written a line of code for it; tying the name to a
  // snippet would have made that call do nothing. Endless only, still: the
  // listed levels' products are authored and are the band's ground.
  const product = opts.endless && opts.product !== undefined ? opts.product : def.product;
  const requests: Request[] = [];
  const pinned = def.snippets;
  /** Snippets this level has already taken; a fresh cycle never frees them. */
  const drawnHere = new Set<string>();
  let recycled = false;
  for (let i = 0; i < def.requests; i++) {
    // Three ways a request gets its snippet, and they cannot collide: a fed
    // one is endless only, a pinned one is a listed story level only, and a
    // drawn one is everything else. A pinned level plays its authored
    // snippets in story order and draws nothing for them, so the rng call
    // order is: no pick, then the creep draw per request, then the sync
    // draw. A fed one is the same: the seat already chose. A drawn level is
    // exactly as it was. An id that is not in the stack is a halt, not a
    // quiet fallback.
    const fed = taken[i];
    let snippet: Snippet;
    if (fed) {
      snippet = fed;
    } else if (pinned) {
      const id = pinned[i];
      const found =
        id === undefined ? undefined : (opts.corpus.byStack[stack] ?? []).find((x) => x.id === id);
      if (!found) throw new Error(`patterns/levels.json: levels.${opts.levelIndex}.snippets.${i}`);
      snippet = found;
    } else {
      const drawn = candidates(opts.corpus, stack, def, opts.used, drawnHere);
      if (drawn.pool.length === 0) break;
      if (drawn.recycled) recycled = true;
      const weights = drawn.pool.map((s) => 1 + weakBias * weakWeight(s, opts.weakBigrams));
      snippet = drawn.pool[weightedPick(weights, rng)]!;
    }
    opts.used.add(snippet.id);
    drawnHere.add(snippet.id);
    const request: Request = {
      id: `${def.id}-${i}`,
      // `picker.ask` prefers the snippet's own words and falls back to the
      // template pool (sub-slice B part two). A seated snippet always has
      // its own, which is the point of the seat: the request describes the
      // job this code actually does. Nothing special is needed here for it.
      ask: opts.picker.ask(stack, product, snippet, def.id),
      reply: opts.picker.reply(),
      snippet,
      value: valueOf(snippet, opts.corpus.model, opts.set.difficulty),
    };
    if (rng() < opts.set.levels.creepShare) {
      // The snippet's own creep first. It spends no draw from the band pool
      // and none from the template bag, exactly as a snippet's own ask
      // spends none from the template pool — so authoring a creep onto a
      // snippet moves the stream for the requests after it, the same way
      // authoring an ask onto one does, and the corpus carries none today.
      const own = authoredCreep(snippet, def.id);
      if (own) {
        request.creep = { line: own.line, ask: fill(own.ask, product, snippet) };
      } else {
        const line = creepLine(opts.corpus, stack, snippet.band, rng);
        if (line !== null) request.creep = { line, ask: opts.picker.creep() };
      }
    }
    requests.push(request);
  }
  if (requests.length === 0) return null;
  // The quick sync (slice 2): a meeting between two requests, never in front
  // of the first and never after the last. Drawn after the requests so the
  // snippets a level plans are the same with the lever at zero.
  const syncAt =
    requests.length >= 2 && rng() < opts.set.levels.syncShare
      ? 1 + Math.floor(rng() * (requests.length - 1))
      : undefined;
  return {
    id: def.id,
    // The noun list was drawn inside `levelDefAt` either way, so the seed's
    // stream is the same whether or not a seat is sitting; `product` is
    // `def.product` unless a seat named this level and fed it.
    product,
    story: def.story,
    stack,
    tier: opts.tier,
    requests,
    drainPerSec: (def.drainPerSec ?? tierDefaults.drainPerSec) * tierDefaults.drainScale,
    drainRamp: def.drainRamp,
    refillShare: def.refillShare ?? tierDefaults.refillShare,
    messageCost: def.messageCost ?? tierDefaults.messageCost,
    shipBonus: def.shipBonus,
    ...(syncAt === undefined ? {} : { syncAt }),
    ...(recycled ? { recycled: true as const } : {}),
    seed: levelSeed,
  };
}
