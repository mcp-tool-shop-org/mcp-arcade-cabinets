// G26, G27: the request order, each request's code and each request's value
// are fixed at level start from the seed. Difficulty is a formula and the
// levels climb on it; the seed biases toward this browser's weak pairs and
// never toward a repeat (Q1.9).

import { inBand, weakWeight, type Corpus } from './corpus';
import { value as valueOf } from './difficulty';
import type { LinePicker } from './lines';
import { CORPUS_STACKS, type LevelDef, type Patterns } from './patterns';
import { mixSeed, seededRandom, weightedPick } from './seed';
import type { Band, LevelPlan, Request, Snippet, Stack, Tier } from './types';

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
}

function band(n: number): Band {
  return Math.min(7, Math.max(1, Math.round(n))) as Band;
}

/** An endless level: the product is drawn, the band climbs, the drain grows. */
function endlessDef(opts: PlanOpts, rng: () => number): LevelDef {
  const e = opts.set.levels.endless;
  const i = opts.levelIndex;
  const products = opts.set.products;
  const noun = products.nouns[Math.floor(rng() * products.nouns.length)]!;
  const template = products.templates[Math.floor(rng() * products.templates.length)]!;
  const stacks = CORPUS_STACKS;
  const stack = opts.stack ?? stacks[Math.floor(rng() * stacks.length)]!;
  const low = band(e.startBand + Math.floor(i / e.bandEvery));
  return {
    id: `endless-${i}`,
    product: template.split('{noun}').join(noun),
    // An endless level has no authored premise; the standup shows nothing.
    story: '',
    stack,
    requests: e.requests,
    bandMin: low,
    bandMax: band(low + 1),
    drainPerSec: e.drainStart * Math.pow(e.drainGrow, i),
    drainRamp: 0,
    refillShare: e.refillShare,
    messageCost: e.messageCost,
    shipBonus: e.shipBonus,
  };
}

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
  const moved: LevelDef = { ...def, stack: opts.stack };
  delete moved.snippets;
  return moved;
}

/** Candidates for a request: unused, in band, widening only when it must. */
function candidates(corpus: Corpus, stack: Stack, def: LevelDef, used: Set<string>): Snippet[] {
  const tries: Snippet[][] = [
    inBand(corpus, stack, def.bandMin, def.bandMax),
    inBand(corpus, stack, band(def.bandMin - 1), band(def.bandMax + 1)),
    corpus.byStack[stack] ?? [],
  ];
  for (const list of tries) {
    const free = list.filter((s) => !used.has(s.id));
    if (free.length > 0) return free;
  }
  return tries[2] ?? [];
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
  const levelSeed = mixSeed(opts.seed, opts.levelIndex * 7919 + opts.tier);
  const rng = seededRandom(levelSeed);
  const def = levelDefAt(opts, rng);
  if (!def) return null;
  const tierDefaults = opts.set.context.tiers[String(opts.tier) as '0' | '1' | '2' | '3'];
  const stack = def.stack;
  const weakBias = opts.set.levels.weakBias;
  const requests: Request[] = [];
  const pinned = def.snippets;
  for (let i = 0; i < def.requests; i++) {
    // A pinned level plays its authored snippets in story order and draws
    // nothing for them, so the rng call order is: no pick, then the creep
    // draw per request, then the sync draw. A drawn level is exactly as it
    // was. An id that is not in the stack is a halt, not a quiet fallback.
    let snippet: Snippet;
    if (pinned) {
      const id = pinned[i];
      const found =
        id === undefined ? undefined : (opts.corpus.byStack[stack] ?? []).find((x) => x.id === id);
      if (!found) throw new Error(`patterns/levels.json: levels.${opts.levelIndex}.snippets.${i}`);
      snippet = found;
    } else {
      const pool = candidates(opts.corpus, stack, def, opts.used);
      if (pool.length === 0) break;
      const weights = pool.map((s) => 1 + weakBias * weakWeight(s, opts.weakBigrams));
      snippet = pool[weightedPick(weights, rng)]!;
    }
    opts.used.add(snippet.id);
    const request: Request = {
      id: `${def.id}-${i}`,
      ask: opts.picker.ask(stack, def.product, snippet),
      reply: opts.picker.reply(),
      snippet,
      value: valueOf(snippet, opts.corpus.model, opts.set.difficulty),
    };
    if (rng() < opts.set.levels.creepShare) {
      const line = creepLine(opts.corpus, stack, snippet.band, rng);
      if (line !== null) request.creep = { line, ask: opts.picker.creep() };
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
    product: def.product,
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
    seed: levelSeed,
  };
}
