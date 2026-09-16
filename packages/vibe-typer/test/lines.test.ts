import { describe, expect, it } from 'vitest';

import { askFor, fill, LinePicker, safeTitle } from '../src/lines';
import { DEFAULT_PATTERNS, lineFault } from '../src/patterns';
import { DEFAULT_CORPUS } from '../src/corpus';
import type { Snippet } from '../src/types';

function bash(id: string): Snippet {
  const found = DEFAULT_CORPUS.byStack.bash!.find((s) => s.id === id);
  if (!found) throw new Error(`no snippet ${id}`);
  return found;
}

/**
 * A snippet with no ask of its own: the template pool answers for it. Three of
 * the corpus's two hundred and forty-nine are like this after the slice-3
 * authoring run, and this is one of them.
 */
const SNIPPET = bash('cal-sh-d2-002');
/** A snippet that carries its own ask. */
const OWN_ASK = bash('cal-sh-d1-001');
/**
 * A snippet whose topic nobody has written a pool for, so the tier pool
 * answers it. Every topic the corpus really carries now has one, so the case
 * has to be built rather than found — which is the right way round: the
 * fallback is for a topic the writing has not reached yet.
 */
const NO_TOPIC_POOL = { ...OWN_ASK, topics: ['a-topic-nobody-has-written-for'] };

function picker(seed = 3, tier: 0 | 1 | 2 | 3 = 0): LinePicker {
  const p = new LinePicker(DEFAULT_PATTERNS, { seed, tier });
  p.startLevel(0);
  return p;
}

describe('the line picker', () => {
  it('never repeats a line inside a level', () => {
    const p = picker();
    const asks = new Set<string>();
    const replies = new Set<string>();
    for (let i = 0; i < 16; i++) {
      asks.add(p.ask('bash', 'a website for my cat', SNIPPET));
      replies.add(p.reply());
    }
    expect(asks.size).toBe(16);
    expect(replies.size).toBe(16);
    const hmms = new Set<string>();
    for (let i = 0; i < 12; i++) hmms.add(p.hmm());
    expect(hmms.size).toBe(12);
  });

  it('gives the same words for the same seed and level', () => {
    const a = picker(9);
    const b = picker(9);
    for (let i = 0; i < 8; i++) {
      expect(a.ask('python', 'Uber but for ducks', SNIPPET)).toBe(
        b.ask('python', 'Uber but for ducks', SNIPPET),
      );
      expect(a.reaction(OWN_ASK)).toBe(b.reaction(OWN_ASK));
    }
  });

  it('starts a new bag each level, and a different seed reads differently', () => {
    const a = picker(4);
    const first = a.ship();
    a.startLevel(1);
    const second = a.ship();
    expect(typeof second).toBe('string');
    const other = picker(5);
    const words = new Set<string>();
    for (let i = 0; i < DEFAULT_PATTERNS.agent.ships.length; i++) words.add(other.ship());
    expect(words.has(first)).toBe(true);
  });

  it('walks the sync pool without a repeat inside a meeting', () => {
    const p = picker();
    const said = new Set<string>();
    for (let i = 0; i < DEFAULT_PATTERNS.user.syncs.length; i++) said.add(p.sync());
    expect(said.size).toBe(DEFAULT_PATTERNS.user.syncs.length);
    for (const line of said) expect(DEFAULT_PATTERNS.user.syncs).toContain(line);
  });

  it('keeps a sync line short enough to be chatter', () => {
    for (const line of DEFAULT_PATTERNS.user.syncs) {
      expect(lineFault(line)).toBeNull();
      expect(line.split(/\s+/).length).toBeLessThanOrEqual(5);
    }
    expect(DEFAULT_PATTERNS.user.syncs.length).toBeGreaterThanOrEqual(36);
  });

  it('reads hardcore in tier two words', () => {
    const hard = picker(6, 3);
    const easy = picker(6, 2);
    // A snippet whose topics carry no pool of their own reads the tier pool.
    expect(hard.reaction(NO_TOPIC_POOL)).toBe(easy.reaction(NO_TOPIC_POOL));
  });

  it('walks the check-ins and the answers without a repeat inside a level', () => {
    const p = picker();
    const nags = new Set<string>();
    const replies = new Set<string>();
    for (let i = 0; i < 12; i++) {
      nags.add(p.nag());
      replies.add(p.nagReply());
    }
    expect(nags.size).toBe(12);
    expect(replies.size).toBe(12);
    for (const line of nags) expect(DEFAULT_PATTERNS.user.nags).toContain(line);
    for (const line of replies) expect(DEFAULT_PATTERNS.agent.nagReplies).toContain(line);
  });

  it('keeps every check-in and every answer inside the gate', () => {
    for (const line of DEFAULT_PATTERNS.user.nags) expect(lineFault(line)).toBeNull();
    for (const line of DEFAULT_PATTERNS.agent.nagReplies) expect(lineFault(line)).toBeNull();
    expect(DEFAULT_PATTERNS.user.nags.length).toBeGreaterThanOrEqual(50);
    expect(DEFAULT_PATTERNS.agent.nagReplies.length).toBeGreaterThanOrEqual(50);
  });

  it('reacts to the piece by its topic when a topic has been written for', () => {
    const byTopic = DEFAULT_PATTERNS.user.reactionsByTopic;
    const topic = SNIPPET.topics.find((t) => byTopic[t] !== undefined);
    expect(topic).toBeDefined();
    const pool = byTopic[topic!]!;
    const p = picker();
    const said = new Set<string>();
    for (let i = 0; i < pool.length; i++) said.add(p.reaction(SNIPPET));
    expect([...said].sort()).toEqual([...pool].sort());
    // The tier pool still answers a snippet nobody has written a topic for.
    expect(DEFAULT_PATTERNS.user.reactions['0']).toContain(picker().reaction(NO_TOPIC_POOL));
  });

  it('reviews a product from its own pool, and falls back to the generic one', () => {
    const byProduct = DEFAULT_PATTERNS.user.reviewsByProduct;
    const id = Object.keys(byProduct)[0]!;
    const pool = byProduct[id]!;
    const p = picker();
    for (let i = 0; i < pool.length; i++) expect(pool).toContain(p.review(id));
    expect(DEFAULT_PATTERNS.user.reviews).toContain(picker().review('no-such-level'));
  });

  it('names every product pool after a level that exists', () => {
    const ids = new Set(DEFAULT_PATTERNS.levels.levels.map((l) => l.id));
    for (const id of Object.keys(DEFAULT_PATTERNS.user.reviewsByProduct)) {
      expect(ids, id).toContain(id);
    }
  });

  it('names every topic pool after a topic the corpus carries', () => {
    const topics = new Set(DEFAULT_CORPUS.snippets.flatMap((s) => s.topics));
    for (const topic of Object.keys(DEFAULT_PATTERNS.user.reactionsByTopic)) {
      expect(topics, topic).toContain(topic);
    }
  });
});

describe('the ask a snippet carries', () => {
  it('uses the snippet own words and spends no draw from the pool', () => {
    const p = picker();
    const product = 'a website for my cat';
    // The snippet's own words, with the product filled into them.
    expect(p.ask('bash', product, OWN_ASK)).toBe(OWN_ASK.ask!.split('{product}').join(product));
    // The template bag is untouched, so the next drawn ask is the pool's first.
    const fresh = picker();
    expect(p.ask('bash', product, SNIPPET)).toBe(fresh.ask('bash', product, SNIPPET));
  });

  it('falls back to the template pool for a snippet without one', () => {
    const p = picker();
    const line = p.ask('bash', 'a website for my cat', SNIPPET);
    expect(SNIPPET.ask).toBeUndefined();
    expect(line).not.toContain('{product}');
    expect(line).not.toContain('{title}');
  });

  it('fills the product into a snippet own ask, and never a title', () => {
    const withHole: Snippet = { ...SNIPPET, ask: 'can {product} do the thing' };
    expect(askFor(withHole, 'Uber but for ducks', picker(), 'bash')).toBe(
      'can Uber but for ducks do the thing',
    );
    for (const snippet of DEFAULT_CORPUS.snippets) {
      if (snippet.ask === undefined) continue;
      expect(lineFault(snippet.ask), snippet.id).toBeNull();
      expect(snippet.ask, snippet.id).not.toContain('{title}');
    }
  });
});

describe('filling a line', () => {
  it('puts the product and the title into the ask', () => {
    const line = fill('i want {title} for {product}', 'Uber but for ducks', SNIPPET);
    expect(line).toBe(`i want ${SNIPPET.title} for Uber but for ducks`);
  });

  it('stands in for a title the chat may not say', () => {
    const digit: Snippet = { ...SNIPPET, title: 'ES6 class', topics: ['class', 'syntax'] };
    expect(safeTitle(digit)).toBe('class');
    const nothing: Snippet = { ...SNIPPET, title: 'top 3 rows', topics: ['utility-class'] };
    expect(safeTitle(nothing)).toBe('that thing');
    expect(safeTitle(SNIPPET)).toBe(SNIPPET.title);
  });
});
