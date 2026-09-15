// G28: the user and the agent are authored data behind the gate. This is the
// picker. No line repeats inside a level (Q5.9); dated jokes are skipped
// unless the player turns them on (Q5.7); the pools are keyed by tier and
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
  /** Dated jokes are off unless the player asks for them. */
  dated?: boolean;
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
  private readonly dated: boolean;
  private bags = new Map<string, Bag>();
  private level = 0;

  constructor(set: Patterns, opts: PickerOpts) {
    this.set = set;
    this.seed = opts.seed >>> 0;
    this.tier = opts.tier;
    this.dated = opts.dated === true;
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
    const base = this.set.user.asks[stack][tier];
    return this.dated ? [...base, ...this.set.user.dated] : base;
  }

  /** The user's ask, with {product} and {title} filled from the level and the snippet. */
  ask(stack: Stack, product: string, snippet: Snippet): string {
    const raw = this.next(`ask.${stack}`, this.askPool(stack));
    return fill(raw, product, snippet);
  }

  reply(): string {
    return this.next('reply', this.set.agent.replies);
  }

  reaction(): string {
    return this.next(
      `reaction.${lineTier(this.tier)}`,
      this.set.user.reactions[lineTier(this.tier)],
    );
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

  review(): string {
    return this.next('review', this.set.user.reviews);
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

/** Fill an ask template. Unknown placeholders are left alone by design. */
export function fill(template: string, product: string, snippet: Snippet): string {
  return template.split('{product}').join(product).split('{title}').join(safeTitle(snippet));
}
