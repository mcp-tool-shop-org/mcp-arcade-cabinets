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

  constructor(set: Patterns, opts: PickerOpts) {
    this.set = set;
    this.seed = opts.seed >>> 0;
    this.tier = opts.tier;
  }

  /** New level, new bags: repeats are barred inside a level, not across one. */
  startLevel(levelIndex: number): void {
    this.level = levelIndex;
    this.bags = new Map();
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
   */
  ask(stack: Stack, product: string, snippet: Snippet): string {
    return askFor(snippet, product, this, stack);
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
   * The user's reaction to the piece that just shipped. The first of the
   * snippet's topics with a pool of its own wins, so the line names what was
   * built; a snippet whose topics nobody has written for reads the tier pool
   * as it always did. One bag a topic, so a level never repeats a reaction.
   */
  reaction(snippet: Snippet): string {
    for (const topic of snippet.topics) {
      const pool = this.set.user.reactionsByTopic[topic];
      if (pool && pool.length > 0) return this.next(`reaction.topic.${topic}`, pool);
    }
    return this.next(
      `reaction.${lineTier(this.tier)}`,
      this.set.user.reactions[lineTier(this.tier)],
    );
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

  /** The level's review. The product's own pool first, then the generic one. */
  review(levelId: string): string {
    const pool = this.set.user.reviewsByProduct[levelId];
    if (pool && pool.length > 0) return this.next(`review.${levelId}`, pool);
    return this.next('review', this.set.user.reviews);
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
 */
export function askFor(
  snippet: Snippet,
  product: string,
  picker: LinePicker,
  stack: Stack,
): string {
  if (typeof snippet.ask === 'string' && snippet.ask !== '') {
    return fill(snippet.ask, product, snippet);
  }
  return picker.templateAsk(stack, product, snippet);
}

/** Fill an ask template. Unknown placeholders are left alone by design. */
export function fill(template: string, product: string, snippet: Snippet): string {
  return template.split('{product}').join(product).split('{title}').join(safeTitle(snippet));
}
