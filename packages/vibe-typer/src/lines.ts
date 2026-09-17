// G28: the user and the agent are authored data behind the gate. This is the
// picker. No line repeats inside a level (Q5.9)
// beat, and hardcore borrows tier two's words.

import { lineFault, lineTier, type Patterns } from './patterns';
import { mixSeed, shuffleOrder } from './seed';
import type { Snippet, Stack, Tier } from './types';

interface Bag {
  order: number[];
  at: number;
  cycle: number;
  size: number;
}

function emptyBag(): Bag {
  return { order: [], at: 0, cycle: 0, size: 0 };
}

export interface PickerOpts {
  seed: number;
  tier: Tier;
}

/**
 * The one bag the generic reviews are walked from, whether the draw is a
 * reaction mid-level or the verdict at the deploy. One bag is what makes a
 * level's four lines four different lines.
 */
const GENERIC_REVIEW_BAG = 'review';

/**
 * A seeded walk through each pool. Same seed and same level, same words.
 * A pool is reshuffled only when it runs out, which a level's handful of
 * beats never does for a pool of the sizes the loader demands.
 */
export class LinePicker {
  private readonly set: Patterns;
  private readonly seed: number;
  private readonly tier: Tier;
  private bags = new Map<string, Bag>();
  private level = 0;
  /**
   * Generic reviews already said as a reaction in this level, so the deploy's
   * verdict is never a line the user has just said mid-level.
   */
  private saidAsReaction = new Set<string>();

  constructor(set: Patterns, opts: PickerOpts) {
    this.set = set;
    this.seed = opts.seed >>> 0;
    this.tier = opts.tier;
  }

  /** New level, new bags: repeats are barred inside a level, not across one. */
  startLevel(levelIndex: number): void {
    this.level = levelIndex;
    this.bags = new Map();
    this.saidAsReaction = new Set();
  }

  private next(key: string, pool: readonly string[]): string {
    if (pool.length === 0) return '';
    let bag = this.bags.get(key);
    if (!bag || bag.size !== pool.length) {
      bag = emptyBag();
      bag.size = pool.length;
      this.bags.set(key, bag);
    }
    if (bag.at >= bag.order.length) {
      const salt = mixSeed(hashKey(key), this.level * 131 + bag.cycle);
      bag.order = shuffleOrder(pool.length, mixSeed(this.seed, salt));
      bag.at = 0;
      bag.cycle += 1;
    }
    const i = bag.order[bag.at]!;
    bag.at += 1;
    return pool[i]!;
  }

  private askPool(stack: Stack): string[] {
    const tier = lineTier(this.tier);
    return this.set.user.asks[stack][tier];
  }

  /**
   * The user's ask for this snippet. A snippet that carries its own `ask`
   * describes the job its code actually does, so the request and the code are
   * the same thing (slice 3); a snippet without one falls back to the tier's
   * template pool, and only that path spends a draw from the bag.
   *
   * `levelId` is the level the snippet is being drawn into. A snippet whose
   * ask is written against one story level's premise carries `for`, and its
   * own words are used only in that level; anywhere else the template pool
   * plays, because the premise is not there to hold the ask up.
   */
  ask(stack: Stack, product: string, snippet: Snippet, levelId?: string): string {
    return askFor(snippet, product, this, stack, levelId);
  }

  /** The template pool's next ask, filled. The fallback path of `ask`. */
  templateAsk(stack: Stack, product: string, snippet: Snippet): string {
    const raw = this.next(`ask.${stack}`, this.askPool(stack));
    return fill(raw, product, snippet);
  }

  reply(): string {
    return this.next('reply', this.set.agent.replies);
  }

  /**
   * The user's reaction to the piece that just shipped.
   *
   * Two pools, and the lever picks which.
   *
   * With `reactionsByTopicEnabled` ON this is what it always was: the first
   * of the snippet's topics with a pool of its own, then the tier pool. One
   * bag a topic, so a level never repeats a reaction.
   *
   * OFF — which is how it ships — neither of those plays. The by-topic pool
   * is keyed to the snippet's *code construct* and not to the request, so it
   * draws a metaphor for a loop or an insert and lands as a non sequitur
   * against the ask the player just read. The tier pool is worse: it was
   * authored as "the user names the thing that just shipped", so seventy of
   * its hundred and eight lines name a piece the request never asked for
   * ("the logo blinks when you open the fridge." after a request about duck
   * fares), which is the class the Director read on the published 0.11.0.
   * The generic reviews are the pool that is true of any piece whatever was
   * asked for — the lead rewrote them for exactly that and the
   * lines-neutral gate holds them — so they answer the ship. They share one
   * bag with the deploy's own review, which is what keeps a level from
   * saying the same line twice.
   *
   * The tier pools stay in the lever file, behind the lever, for the
   * authoring run that will write reactions per request to land on.
   */
  reaction(snippet: Snippet): string {
    if (this.set.user.reactionsByTopicEnabled) {
      for (const topic of snippet.topics) {
        const pool = this.set.user.reactionsByTopic[topic];
        if (pool && pool.length > 0) return this.next(`reaction.topic.${topic}`, pool);
      }
      return this.next(
        `reaction.${lineTier(this.tier)}`,
        this.set.user.reactions[lineTier(this.tier)],
      );
    }
    const line = this.next(GENERIC_REVIEW_BAG, this.set.user.reviews);
    if (line !== '') this.saidAsReaction.add(line);
    return line;
  }

  /** A check-in while the player types: costs nothing, changes nothing. */
  nag(): string {
    return this.next('nag', this.set.user.nags);
  }

  /** What the agent says back to a check-in, once the line in hand is out. */
  nagReply(): string {
    return this.next('nagReply', this.set.agent.nagReplies);
  }

  hmm(): string {
    return this.next('hmm', this.set.agent.hmm);
  }

  compaction(): string {
    return this.next('compaction', this.set.agent.compactions);
  }

  ship(): string {
    return this.next('ship', this.set.agent.ships);
  }

  creep(): string {
    return this.next('creep', this.set.user.creeps);
  }

  /**
   * The level's review. The product's own pool first, then the generic one.
   *
   * The generic pool is also where a reaction comes from while the by-topic
   * lever is off, so the deploy skips any line the user already said this
   * level and takes what is left. The shared bag makes that true by itself
   * for any level short enough to matter; the check is here so it stays true
   * if the two ever draw from different bags again. A level that has somehow
   * said every generic line takes the next draw as it always did.
   */
  review(levelId: string): string {
    const pool = this.set.user.reviewsByProduct[levelId];
    if (pool && pool.length > 0) return this.next(`review.${levelId}`, pool);
    const generic = this.set.user.reviews;
    for (let i = 0; i < generic.length; i++) {
      const line = this.next(GENERIC_REVIEW_BAG, generic);
      if (line === '' || !this.saidAsReaction.has(line)) return line;
    }
    return this.next(GENERIC_REVIEW_BAG, generic);
  }

  /** One line of a quick sync: meeting chatter, three to a sync (slice 2). */
  sync(): string {
    return this.next('sync', this.set.user.syncs);
  }
}

function hashKey(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * A name the chat may say: the snippet's title if it passes the gate, else a
 * clean topic, else a plain word. Corpus titles are not authored lines, so a
 * handful carry a digit or a barred word and are stood in for.
 */
export function safeTitle(snippet: Snippet): string {
  if (lineFault(snippet.title) === null) return snippet.title;
  for (const topic of snippet.topics) {
    const word = topic.replace(/[-_]+/g, ' ');
    if (lineFault(word) === null) return word;
  }
  return 'that thing';
}

/**
 * The ask for a request: the snippet's own words when it has them, else the
 * picker's template pool. `{product}` is filled either way; `{title}` cannot
 * appear in a snippet's own ask, because the loader refuses one that has it.
 *
 * A snippet whose ask was written against one story level's premise carries
 * `for`. Its own words hold up only in that level — "reverse the line of
 * waiting ducks" is a request in the rideshare for ducks and nonsense in an
 * app for lost socks — so anywhere else the template pool plays instead. A
 * level id is required to use a bound ask at all: a caller that does not say
 * which level it is planning gets the template pool, which is safe
 * everywhere.
 */
export function askFor(
  snippet: Snippet,
  product: string,
  picker: LinePicker,
  stack: Stack,
  levelId?: string,
): string {
  const bound = typeof snippet.for === 'string' && snippet.for !== '';
  const ownAskPlays = !bound || snippet.for === levelId;
  if (typeof snippet.ask === 'string' && snippet.ask !== '' && ownAskPlays) {
    return fill(snippet.ask, product, snippet);
  }
  return picker.templateAsk(stack, product, snippet);
}

/**
 * A product name that carries its own relative clause — "an app that rates
 * hat collections", "a website that rates your handwriting". Dropped into
 * `make {product} <verb phrase>` it garden-paths: the reader finishes the
 * clause, takes the request for done, and the verb that follows reads as a
 * second request jammed onto the first ("make an app that rates hat
 * collections give the engineering team a raise").
 */
const RELATIVE_PRODUCT = /\b(that|which|who)\b/i;
/** The shape that garden-paths, in any case a seat may write it. */
const MAKE_PRODUCT = /^make {product} /i;

/**
 * Fill an ask template. Unknown placeholders are left alone by design.
 *
 * One shape is rewritten rather than filled: `make {product} <verb phrase>`
 * with a product that carries a relative clause becomes `make it <verb
 * phrase>`. The product is on screen above the chat all level, so the
 * pronoun has its antecedent, and "make it ..." is the voice the template
 * pools already speak. Every other shape — the product at the end of the
 * line, a product with no clause in it — fills exactly as it always did.
 */
export function fill(template: string, product: string, snippet: Snippet): string {
  const jams =
    MAKE_PRODUCT.test(template) &&
    template.length > 'make {product} '.length &&
    RELATIVE_PRODUCT.test(product);
  const filled = jams
    ? `make it ${template.slice('make {product} '.length)}`
    : template.split('{product}').join(product);
  return filled.split('{product}').join(product).split('{title}').join(safeTitle(snippet));
}
