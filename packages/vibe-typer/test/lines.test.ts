import { describe, expect, it } from 'vitest';

import { askFor, fill, LinePicker, safeTitle } from '../src/lines';
import { DEFAULT_PATTERNS, lineFault, type Patterns } from '../src/patterns';
import { DEFAULT_CORPUS } from '../src/corpus';
import type { Snippet } from '../src/types';

function bash(id: string): Snippet {
  const found = DEFAULT_CORPUS.byStack.bash!.find((s) => s.id === id);
  if (!found) throw new Error(`no snippet ${id}`);
  return found;
}

/**
 * The same snippet with the two lines it carries taken off, so the pools
 * answer for it: the template pool for the request, the generic reviews for
 * the reaction. Both are the fallback path, and after the reactions authoring
 * run of 2026-09-17 every corpus snippet carries both lines, so the fallback
 * has to be built rather than found.
 */
function withoutLines(snippet: Snippet): Snippet {
  const copy = { ...snippet };
  delete copy.ask;
  delete copy.reaction;
  return copy;
}

/**
 * A snippet with no ask of its own: the template pool answers for it. The
 * coherence pass wrote an ask for every one of the corpus's two hundred and
 * forty-nine, so this case is built rather than found — which is the right way
 * round, the same way `NO_TOPIC_POOL` below is: the fallback is for a piece the
 * writing has not reached yet, and the rule under test is unchanged.
 */
const SNIPPET = withoutLines(bash('cal-sh-d2-002'));
/** A snippet that carries its own ask. */
const OWN_ASK = bash('cal-sh-d1-001');
/**
 * A snippet whose topic nobody has written a pool for, so the tier pool
 * answers it. Every topic the corpus really carries now has one, so the case
 * has to be built rather than found — which is the right way round: the
 * fallback is for a topic the writing has not reached yet.
 */
const NO_TOPIC_POOL = {
  ...withoutLines(OWN_ASK),
  topics: ['a-topic-nobody-has-written-for'],
};

/** The level's product, which is the one hole a reaction may carry. */
const PRODUCT = 'a website for my cat';

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
      expect(a.reaction(OWN_ASK, PRODUCT)).toBe(b.reaction(OWN_ASK, PRODUCT));
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
    expect(DEFAULT_PATTERNS.user.syncs.length).toBeGreaterThanOrEqual(32);
  });

  it('reads hardcore in tier two words', () => {
    // The ask pool is keyed by tier, and hardcore borrows tier two's.
    const hard = picker(6, 3);
    const easy = picker(6, 2);
    expect(hard.ask('bash', 'a website for my cat', SNIPPET)).toBe(
      easy.ask('bash', 'a website for my cat', SNIPPET),
    );
    // So is the reaction fallback, on the levers that draw it: a snippet
    // whose topics carry no pool of their own reads the tier pool.
    const on: Patterns = {
      ...DEFAULT_PATTERNS,
      user: { ...DEFAULT_PATTERNS.user, reactionsByTopicEnabled: true },
    };
    const hardOn = new LinePicker(on, { seed: 6, tier: 3 });
    const easyOn = new LinePicker(on, { seed: 6, tier: 2 });
    expect(hardOn.reaction(NO_TOPIC_POOL, PRODUCT)).toBe(easyOn.reaction(NO_TOPIC_POOL, PRODUCT));
    expect(DEFAULT_PATTERNS.user.reactions['2']).toContain(hardOn.reaction(NO_TOPIC_POOL, PRODUCT));
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
    // The floors after the proofread: a level draws a few of each and never
    // repeats one, so the floor is that handful with room, not the size the
    // authoring run happened to write.
    expect(DEFAULT_PATTERNS.user.nags.length).toBeGreaterThanOrEqual(16);
    expect(DEFAULT_PATTERNS.agent.nagReplies.length).toBeGreaterThanOrEqual(12);
  });

  // Neither authored reaction pool plays while the lever is off. The
  // by-topic one is keyed to the snippet's code construct and not to the
  // request, so it draws a metaphor for a loop or an insert; the tier one
  // was authored as "the user names the thing that just shipped" and seventy
  // of its hundred and eight lines name a piece the request never asked for.
  // The generic reviews are true of any piece, and the lines-neutral gate
  // holds them.
  it('draws the generic reviews for every snippet while the by-topic lever is off', () => {
    const byTopic = DEFAULT_PATTERNS.user.reactionsByTopic;
    const topic = SNIPPET.topics.find((t) => byTopic[t] !== undefined);
    expect(topic).toBeDefined();
    expect(DEFAULT_PATTERNS.user.reactionsByTopicEnabled).toBe(false);
    const p = picker();
    for (let i = 0; i < 8; i++) {
      const said = p.reaction(SNIPPET, PRODUCT);
      expect(byTopic[topic!]).not.toContain(said);
      expect(DEFAULT_PATTERNS.user.reactions['0']).not.toContain(said);
      expect(DEFAULT_PATTERNS.user.reviews).toContain(said);
    }
    // And a snippet nobody wrote a topic for reads the same pool.
    expect(DEFAULT_PATTERNS.user.reviews).toContain(picker().reaction(NO_TOPIC_POOL, PRODUCT));
  });

  it('says four different lines across a level and its deploy', () => {
    // Three reactions and the verdict, out of one bag: the deploy is never a
    // line the user already said mid-level.
    const p = picker();
    const said = [
      p.reaction(SNIPPET, PRODUCT),
      p.reaction(SNIPPET, PRODUCT),
      p.reaction(SNIPPET, PRODUCT),
    ];
    const verdict = p.review('no-such-level');
    expect(new Set([...said, verdict]).size).toBe(4);
    expect(said).not.toContain(verdict);
    for (const line of [...said, verdict]) {
      expect(DEFAULT_PATTERNS.user.reviews).toContain(line);
    }
    // A level with a product pool of its own is untouched: its verdict comes
    // from that pool, which no reaction can have said.
    const withPool = picker();
    const id = Object.keys(DEFAULT_PATTERNS.user.reviewsByProduct)[0]!;
    withPool.reaction(SNIPPET, PRODUCT);
    expect(DEFAULT_PATTERNS.user.reviewsByProduct[id]).toContain(withPool.review(id));
  });

  it('starts the reaction bag over at each level', () => {
    const p = picker();
    const first = [p.reaction(SNIPPET, PRODUCT), p.reaction(SNIPPET, PRODUCT)];
    p.startLevel(1);
    const verdict = p.review('no-such-level');
    // A new level may say a line the level before it said; what it may not
    // do is repeat inside itself.
    expect(DEFAULT_PATTERNS.user.reviews).toContain(verdict);
    expect(first).toHaveLength(2);
  });

  it('reacts by topic again the moment the lever is on', () => {
    const byTopic = DEFAULT_PATTERNS.user.reactionsByTopic;
    const topic = SNIPPET.topics.find((t) => byTopic[t] !== undefined)!;
    const pool = byTopic[topic]!;
    const on: Patterns = {
      ...DEFAULT_PATTERNS,
      user: { ...DEFAULT_PATTERNS.user, reactionsByTopicEnabled: true },
    };
    const p = new LinePicker(on, { seed: 7, tier: 0 });
    const said = new Set<string>();
    for (let i = 0; i < pool.length; i++) said.add(p.reaction(SNIPPET, PRODUCT));
    expect([...said].sort()).toEqual([...pool].sort());
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

  // The endless ladder builds its products from templates, and one of them
  // is a relative clause: "an app that rates hat collections". Dropped into
  // `make {product} <verb phrase>` that garden-paths — the reader finishes
  // the clause, takes the request for done, and the verb reads as a second
  // request jammed onto the first. The field showed "make an app that rates
  // hat collections give the engineering team a raise".
  it('says one request when the product carries its own clause', () => {
    const jam: Snippet = { ...SNIPPET, ask: 'make {product} give the engineering team a raise' };
    expect(fill(jam.ask!, 'an app that rates hat collections', jam)).toBe(
      'make it give the engineering team a raise',
    );
    // A product with no clause in it reads fine and is left alone.
    expect(fill(jam.ask!, 'a rideshare for ducks', jam)).toBe(
      'make a rideshare for ducks give the engineering team a raise',
    );
    // And the product at the end of the line never jammed, so it still fills.
    const tail: Snippet = { ...SNIPPET, ask: 'add my first sandwich to {product}' };
    expect(fill(tail.ask!, 'an app that rates hat collections', tail)).toBe(
      'add my first sandwich to an app that rates hat collections',
    );
  });

  it('never jams a request in any product the endless ladder can build', () => {
    const { nouns, templates } = DEFAULT_PATTERNS.products;
    const products = templates.flatMap((t) => nouns.map((n) => t.split('{noun}').join(n)));
    const asks = DEFAULT_CORPUS.snippets
      .map((s) => s.ask)
      .filter((ask): ask is string => typeof ask === 'string' && ask.startsWith('make {product} '));
    expect(asks.length).toBeGreaterThan(0);
    for (const product of products) {
      const clause = /\b(that|which|who)\b/i.test(product);
      for (const ask of asks) {
        const said = fill(ask, product, SNIPPET);
        expect(said.startsWith(clause ? 'make it ' : `make ${product} `), said).toBe(true);
      }
    }
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

// ——— the reaction a snippet carries ——————————————————————————————————————
//
// The reaction is the ask's row one down: one line the user says when THIS
// request's piece ships, written beside the ask it answers. Before it, every
// reaction came from a pool that had never read the request — a metaphor for
// a loop against an ask about duck fares — and the only pool that was honest
// about that was the generic reviews, which are true of any piece whatever
// was asked for.

describe('a snippet that carries its own reaction', () => {
  const OWN: Snippet = { ...SNIPPET, reaction: 'that is exactly what {product} needed' };
  const BOUND: Snippet = { ...OWN, for: 'duck-rides' };

  it('says its own line, with the product filled in', () => {
    expect(picker().reaction(OWN, PRODUCT, 'cat-website')).toBe(
      `that is exactly what ${PRODUCT} needed`,
    );
  });

  it('plays a bound reaction only inside its own level', () => {
    expect(picker().reaction(BOUND, PRODUCT, 'duck-rides')).toBe(
      `that is exactly what ${PRODUCT} needed`,
    );
    // Anywhere else the premise is not there to hold it up, so the pool the
    // picker draws today answers instead — the same rule `askFor` has.
    const elsewhere = picker().reaction(BOUND, PRODUCT, 'cat-website');
    expect(DEFAULT_PATTERNS.user.reviews).toContain(elsewhere);
    // And a caller that does not say which level it is planning gets the pool.
    expect(DEFAULT_PATTERNS.user.reviews).toContain(picker().reaction(BOUND, PRODUCT));
  });

  it('spends no draw from the generic bag and is never the verdict', () => {
    // `ask` has this rule already: only the fallback path spends a draw. The
    // deploy's verdict walks the same bag and skips whatever was said as a
    // reaction, so a reaction that spent a draw would move the verdict and
    // could make the level repeat a line the user never said.
    const spent = picker(5);
    for (let i = 0; i < 3; i++) spent.reaction(OWN, PRODUCT, 'cat-website');
    const quiet = picker(5);
    expect(spent.review('no-such-level')).toBe(quiet.review('no-such-level'));

    // The fall-through path does spend one, which is what makes this a test.
    const drawn = picker(5);
    for (let i = 0; i < 3; i++) drawn.reaction(SNIPPET, PRODUCT, 'cat-website');
    expect(drawn.review('no-such-level')).not.toBe(quiet.review('no-such-level'));
  });
});
