// The pools that land against a request are drawn blind: the agent's reply
// to an ask, its line at the ship, its "hmm", its line at a compaction, its
// answer to a check-in, and the user's check-ins, creeps, sync chatter and
// generic reviews are picked by the seed with no knowledge of what was
// asked. A line in one of them that names a piece ("the greeting is almost
// ready", "giving every button a blanket") is therefore nonsense against
// most requests, and the Director read it as such on the published 0.11.0.
//
// Three rules hold that now, weakest first:
//
//   1. PIECES is a DENYLIST and a FLOOR, not the property. It catches the
//      words we have already been burned by. It cannot catch a piece nobody
//      has listed, and it cannot catch a claim made with verbs — "tucking in
//      the corners" names no noun and still asserts a physical act against a
//      request that may have been to make the login faster. Naming it a
//      floor is the point: do not mistake a pass here for the line making
//      sense.
//   2. VOCABULARY is the property, inverted. Every word of every blind line
//      must be in a fixed list. A word nobody has thought of yet fails
//      closed, which a denylist can never do. Growing PIECES is a treadmill;
//      this is the form that closes.
//   3. BLIND is DERIVED from the picker, not listed by hand. Every method a
//      level's beats call with no knowledge of the request is exercised
//      against sentinel pools, and the pool it reaches must be one of the
//      pools these rules scan. A new blind pool joins the gate by existing.
//
// The reviews by product are keyed to the level and may name what the level
// is (its product is on screen all level); they may not name a piece the
// level never built. The per-snippet asks are held by `for` in the corpus
// files and the loader's story-noun rule, and this file checks that binding.
//
// One pool is a known debt: `user.reactions` — see THE REACTION DEBT below.
import { describe, expect, it } from 'vitest';

import { DEFAULT_CORPUS, askIsBound, STORY_NOUNS } from '../src/corpus';
import { LinePicker } from '../src/lines';
import { DEFAULT_PATTERNS, PIECE_RULE, type Patterns } from '../src/patterns';
import type { Snippet, Tier } from '../src/types';

/**
 * The piece rule moved to src/patterns.ts, because one lever can re-light a
 * pool of lines it catches and the loader has to be able to refuse that flip
 * (`reactionsByTopicEnabled`). Everything the old comment said about it still
 * holds and is worth repeating here, where the rule is scanned across every
 * blind pool: PIECES is a DENYLIST and a FLOOR, not the property. It catches
 * the words we have already been burned by, it cannot catch a piece nobody
 * has listed, and it cannot catch a claim made with verbs. VOCABULARY below
 * is the form that fails closed.
 */
const PIECE = PIECE_RULE;

/**
 * Every word the blind pools are allowed to use. Pinned from the pools as
 * they stand after the 0.11.1 proofread. A line that reaches for a word
 * outside this list fails, and whoever added it looks at the line and either
 * cuts it or adds the word on purpose. That is the whole mechanism: the list
 * is small because the lines say little about anything concrete, and any
 * growth in it is a decision somebody made rather than one that slipped in.
 */
const VOCABULARY = new Set([
  'a',
  'absolutely',
  'add',
  'adding',
  'again',
  'agree',
  'all',
  'almost',
  'along',
  'already',
  'also',
  'am',
  'and',
  'appreciate',
  'are',
  'arrow',
  'as',
  'asked',
  'asking',
  'at',
  'attention',
  'audio',
  'away',
  'back',
  'bake',
  'bakery',
  'be',
  'beautifully',
  'begins',
  'behind',
  'belong',
  'best',
  'better',
  'big',
  'bigger',
  'bits',
  'blanket',
  'block',
  'brackets',
  'bread',
  'breathing',
  'bright',
  'bubbles',
  'build',
  'building',
  'built',
  'call',
  'came',
  'can',
  'care',
  'careful',
  'castle',
  'checking',
  'cheer',
  'chunk',
  'cinnamon',
  'clarifies',
  'close',
  'code',
  'comma',
  'confetti',
  'connection',
  'copied',
  'corners',
  'could',
  'cousin',
  'cried',
  'deeply',
  'delete',
  'demo',
  'deploy',
  'did',
  'direction',
  'disagreed',
  'do',
  'does',
  'done',
  'draft',
  'dragon',
  'edges',
  'end',
  'enough',
  'ever',
  'everyone',
  'everything',
  'exactly',
  'far',
  'feel',
  'felt',
  'fern',
  'final',
  'finished',
  'fitting',
  'fix',
  'fixing',
  'folding',
  'for',
  'from',
  'front',
  'fun',
  'gave',
  'gentle',
  'gentler',
  'gently',
  'getting',
  'giving',
  'glow',
  'go',
  'going',
  'good',
  'got',
  'great',
  'happily',
  'happy',
  'have',
  'heads',
  'here',
  'hmm',
  'holding',
  'humming',
  'hums',
  'i',
  'idea',
  'immediately',
  'impressed',
  'in',
  'into',
  'investors',
  'invited',
  'is',
  'it',
  'its',
  'itself',
  'just',
  'keep',
  'keeping',
  'kept',
  'know',
  'landed',
  'landing',
  'last',
  'launch',
  'layout',
  'left',
  'let',
  'lights',
  'like',
  'line',
  'lines',
  'little',
  'live',
  'loading',
  'look',
  'looking',
  'looks',
  'loop',
  'loose',
  'love',
  'lovely',
  'machine',
  'made',
  'makes',
  'making',
  'mascot',
  'matched',
  'me',
  'means',
  'mind',
  'mom',
  'more',
  'move',
  'much',
  'my',
  'nearly',
  'neat',
  'need',
  'needed',
  'needs',
  'nested',
  'never',
  'new',
  'next',
  'nicely',
  'nine',
  'no',
  'not',
  'nothing',
  'now',
  'office',
  'official',
  'oh',
  'on',
  'one',
  'only',
  'our',
  'out',
  'own',
  'packed',
  'pair',
  'part',
  'parts',
  'party',
  'peek',
  'phone',
  'piece',
  'pieces',
  'place',
  'practically',
  'pretty',
  'project',
  'pull',
  'pulling',
  'quiet',
  'quietly',
  'read',
  'ready',
  'real',
  'recap',
  'redo',
  'refresh',
  'refreshed',
  'resting',
  'result',
  'right',
  'room',
  'round',
  'rush',
  'safe',
  'same',
  'saving',
  'says',
  'sec',
  'second',
  'see',
  'sense',
  'shape',
  'sharing',
  'shines',
  'ship',
  'shipped',
  'should',
  'showed',
  'sideways',
  'sits',
  'slipped',
  'small',
  'smell',
  'smiling',
  'smoothing',
  'so',
  'soft',
  'softly',
  'solid',
  'soon',
  'sorry',
  'sounds',
  'sparkle',
  'sparkles',
  'stand',
  'standing',
  'start',
  'starting',
  'stayed',
  'steadily',
  'step',
  'still',
  'stop',
  'straightening',
  'stray',
  'stroke',
  'strong',
  'succeed',
  'superb',
  'talk',
  'taller',
  'team',
  'tell',
  'test',
  'thanks',
  'that',
  'the',
  'there',
  'they',
  'thing',
  'things',
  'this',
  'thrilled',
  'tidy',
  'tied',
  'tight',
  'times',
  'tiny',
  'to',
  'toast',
  'today',
  'together',
  'told',
  'tomorrow',
  'too',
  'total',
  'touch',
  'touches',
  'true',
  'tucking',
  'twice',
  'typed',
  'typing',
  'unicorn',
  'up',
  'us',
  'very',
  'vibe',
  'want',
  'warm',
  'was',
  'water',
  'way',
  'we',
  'well',
  'what',
  'when',
  'where',
  'which',
  'will',
  'wiring',
  'with',
  'wonderful',
  'work',
  'works',
  'worries',
  'wrong',
  'yet',
  'you',
  'your',
]);

function wordsOf(line: string): string[] {
  return line
    .toLowerCase()
    .split(/[^a-z']+/)
    .filter((w) => w !== '');
}

const TIERS: Tier[] = [0, 1, 2, 3];

/** The level's product, the one hole a snippet's own reaction may carry. */
const PRODUCT = 'a website for my cat';

/** The pools this file scans, by the name the picker reaches them under. */
function blindPools(set: Patterns): Record<string, readonly string[]> {
  return {
    'agent.replies': set.agent.replies,
    'agent.ships': set.agent.ships,
    'agent.nagReplies': set.agent.nagReplies,
    'agent.hmm': set.agent.hmm,
    'agent.compactions': set.agent.compactions,
    'user.nags': set.user.nags,
    'user.creeps': set.user.creeps,
    'user.reviews': set.user.reviews,
    'user.syncs': set.user.syncs,
  };
}

/**
 * THE REACTION DEBT.
 *
 * `user.reactions` cannot be held to the rules above by cutting. It was
 * authored as "the user names the thing that just shipped", so seventy-two of
 * its hundred and eight lines name a piece, and the lines that survive
 * PIECES ("the dropdown opens to reveal a tiny room") name one the list has
 * not caught yet. Cutting to a clean pool would leave the gentlest tier with
 * three lines that are still not neutral.
 *
 * So the pool is not drawn while `reactionsByTopicEnabled` is off — the
 * reaction takes the generic reviews instead, which ARE held to the rules
 * above — and what guards the pool itself is the pin below.
 *
 * The pin is the LINES, not a count of them. A count is a ceiling on how many
 * piece-naming lines there are and not on WHICH, so swapping one piece-naming
 * line for another passed green while the header above claimed that new
 * nonsense could not land; and a count never tightens, so a partial authoring
 * run that cut a tier from thirty-three lines to twenty would leave thirteen
 * slots of regrowth behind a constant nobody would revisit. Equality closes
 * both ends: a new line and a cut one each fail here, and this list is updated
 * in the same commit that moves the pool.
 *
 * The lever these pools sit behind cannot be flipped while they read like
 * this: `loadUser` halts on the first one (src/patterns.ts).
 */
const REACTION_DEBT: Record<string, readonly string[]> = {
  'user.reactions.0': [
    'the avatar smiles only when you mean it.',
    'the badge counts how many ducks have visited today.',
    'the banner changes color with the room temperature.',
    'the button glows when you think about soup.',
    'the calendar marks today with a small star sticker.',
    'the chat widget says hello like an old friend.',
    'the checkbox ticks like a clock made of wood.',
    'the crumb trail leaves a line of yogurt lids.',
    'the dashboard glows when the room is happy.',
    'the error page offers you a virtual yogurt.',
    'the footer thanks you for staying this long.',
    'the greeting whispers good morning to every visitor.',
    'the header waves hello like a friendly neighbor.',
    'the invite link works even if you are a duck.',
    'the list organizes ducks by how they quack.',
    'the login page greets you like a cousin.',
    'the logo blinks when you open the fridge.',
    'the logout page says see you tomorrow friend.',
    'the notification slides in like yogurt off a spoon.',
    'the page title hums when the tab is open.',
    'the pages let you leaf through like a book.',
    'the profile page lists every cousin in order.',
    'the progress bar fills with warm soup.',
    'the radio buttons quack when you select them.',
    'the search bar hums while it thinks hard.',
    'the settings page has a button labeled maybe.',
    'the sidebar keeps all our secrets safe.',
    'the slider moves like a fern toward sunlight.',
    'the spinner spins in the shape of a duck.',
    'the table seats seventeen ducks without complaining once.',
    'the timer counts down with tiny perfect drama.',
    'the tiny icon watches you like a small pet.',
    'the tooltip explains what the button dreams about.',
  ],
  'user.reactions.1': [
    'every user gets a greeting and a cookie.',
    'my fern has a profile picture now.',
    'the button turned purple and the room feels calm.',
    'the chart is beautiful and my cousin framed it.',
    'the ducks are grouped and my cousin approves.',
    'the email went out and the ducks are informed.',
    'the font is bouncy and my cousin is giggling.',
    'the footer stays down and my cousin is relieved.',
    'the form knows my name and i am home.',
    'the fridge sent an alert and we are famous.',
    'the header waves back and my cousin is delighted.',
    'the icon is a duck and my cousin quacked.',
    'the list sorted itself while i watched in awe.',
    'the menu remembers my last order and cheers.',
    'the screen turned purple and my cousin is inspired.',
    'the search finds yogurt and my cousin is proud.',
    'the sidebar is tidy and my cousin is breathing.',
    'the yogurt tracker is live and my cousin relaxes.',
    'we shipped the greeting and my cousin is emotional.',
  ],
  'user.reactions.2': [
    'the alert banner is just very proud.',
    'the avatar blinked and i felt alive.',
    'the avatar wears a tiny hat now.',
    'the banner image is staring into me.',
    'the border is breathing and i love it.',
    'the break room is on the map.',
    'the button now glows when i blink.',
    'the chart sang and the investors cheered.',
    'the donut chart has actual sprinkles now.',
    'the duck now has its own lawyer.',
    'the font sent me flowers at work.',
    'the icon pack moved to the beach.',
    'the maybe button said yes this time.',
    'the menu icon opened up to me.',
    'the progress ring proposed to my finger.',
    'the search bar found my missing sock.',
    'the share button just told my cousin.',
    'the sidebar has opinions on my outfits.',
    'the slider knows exactly what i want.',
    'the tooltip wrote a memoir about me.',
  ],
};

describe('the pools that are drawn blind', () => {
  for (const [name, pool] of Object.entries(blindPools(DEFAULT_PATTERNS))) {
    it(`${name} names no piece the request did not ask for`, () => {
      const bad = pool.filter((line) => PIECE.test(line));
      expect(bad, `${name} carries a piece:\n${bad.join('\n')}`).toEqual([]);
    });

    it(`${name} reaches for no word outside the vocabulary`, () => {
      const strays: string[] = [];
      for (const line of pool) {
        for (const word of wordsOf(line)) {
          if (!VOCABULARY.has(word)) strays.push(`${word}  <- ${line}`);
        }
      }
      expect(strays, `${name} uses words nobody has looked at:\n${strays.join('\n')}`).toEqual([]);
    });
  }

  it('the rule catches the lines the Director read', () => {
    expect(PIECE.test('You are absolutely right, it should hum a tune.')).toBe(false);
    expect(PIECE.test('Happy to, the greeting is almost ready.')).toBe(true);
    expect(PIECE.test('On it, giving every button a blanket.')).toBe(true);
    expect(PIECE.test('is the greeting ready')).toBe(true);
    // The plural forms, which the old rule let through on its boundary.
    expect(PIECE.test('Hmm, I mixed the two columns together.')).toBe(true);
    expect(PIECE.test('every button is ready')).toBe(true);
    expect(PIECE.test('the forms are lined up')).toBe(true);
    // And the word the game uses for whatever got built, which is true of
    // every request and stays.
    expect(PIECE.test('The piece is standing on its own.')).toBe(false);
    expect(PIECE.test('Nearly there, tucking in the corners.')).toBe(false);
  });

  it('the vocabulary fails closed on a word nobody listed', () => {
    const strays = wordsOf('the carousel is spinning sideways').filter((w) => !VOCABULARY.has(w));
    expect(strays).toContain('carousel');
    expect(wordsOf('the lines are neat and tidy').filter((w) => !VOCABULARY.has(w))).toEqual([]);
  });
});

// ——— the derivation ——————————————————————————————————————————————————————
//
// BLIND used to be a hand-written list, and it was wrong: four pools were
// drawn with no knowledge of the request and none of them was on it. The
// list is derived now. Every pool the picker can reach is filled with a
// sentinel naming it, every method that draws without being told anything
// about the request is called, and the sentinel that comes back says which
// pool that method reached. A method that reaches a pool this file does not
// scan fails here.

const SENTINEL = '@@';

/** A lever set whose every line is a sentinel naming its own pool. */
function sentinelSet(): Patterns {
  const set = structuredClone(DEFAULT_PATTERNS) as Patterns;
  const mark = (name: string) => [`${SENTINEL}${name}`];
  set.agent.replies = mark('agent.replies');
  set.agent.ships = mark('agent.ships');
  set.agent.nagReplies = mark('agent.nagReplies');
  set.agent.hmm = mark('agent.hmm');
  set.agent.compactions = mark('agent.compactions');
  set.user.nags = mark('user.nags');
  set.user.creeps = mark('user.creeps');
  set.user.reviews = mark('user.reviews');
  set.user.syncs = mark('user.syncs');
  for (const tier of ['0', '1', '2'] as const) {
    set.user.reactions[tier] = mark(`user.reactions.${tier}`);
    for (const stack of Object.keys(set.user.asks)) {
      const asks = set.user.asks[stack as keyof typeof set.user.asks];
      asks[tier] = mark(`user.asks.${stack}.${tier}`);
    }
  }
  for (const key of Object.keys(set.user.reactionsByTopic)) {
    set.user.reactionsByTopic[key] = mark(`user.reactionsByTopic.${key}`);
  }
  for (const key of Object.keys(set.user.reviewsByProduct)) {
    set.user.reviewsByProduct[key] = mark(`user.reviewsByProduct.${key}`);
  }
  return set;
}

/** A snippet carrying a topic that has a by-topic pool of its own. */
function topicSnippet(): Snippet {
  const topic = Object.keys(DEFAULT_PATTERNS.user.reactionsByTopic)[0]!;
  return {
    id: 'probe',
    stack: 'bash',
    band: 1,
    title: 'a small thing',
    code: 'echo hi',
    notes: [],
    topics: [topic],
  };
}

/** Methods that draw a line without being told anything about the request. */
function blindMethods(): string[] {
  const proto = LinePicker.prototype as unknown as Record<string, unknown>;
  return Object.getOwnPropertyNames(proto).filter((name) => {
    if (name === 'constructor') return false;
    const fn = proto[name];
    return typeof fn === 'function' && (fn as (...args: never[]) => unknown).length === 0;
  });
}

describe('the blind set is derived from the picker', () => {
  it('every pool a request-blind draw reaches is a pool this file scans', () => {
    const covered = new Set([
      ...Object.keys(blindPools(DEFAULT_PATTERNS)),
      ...Object.keys(REACTION_DEBT),
    ]);
    const reached: string[] = [];
    for (const tier of TIERS) {
      const picker = new LinePicker(sentinelSet(), { seed: 9, tier });
      for (const name of blindMethods()) {
        const draw = (picker as unknown as Record<string, () => string>)[name]!;
        reached.push(draw.call(picker).slice(SENTINEL.length));
      }
      // The two draws that take an argument and fall through to a blind pool
      // anyway: a snippet nobody wrote a topic for, and a level with no
      // reviews of its own.
      reached.push(picker.reaction(topicSnippet(), PRODUCT).slice(SENTINEL.length));
      reached.push(picker.review('no-such-level').slice(SENTINEL.length));
    }
    const loose = [...new Set(reached)].filter((pool) => !covered.has(pool));
    expect(loose, `drawn blind and not scanned here:\n${loose.join('\n')}`).toEqual([]);
    // And the derivation is live: every method above really did reach one.
    expect(reached.every((pool) => pool !== '')).toBe(true);
  });

  it('names the pools it knows about, so a new one is visible in the diff', () => {
    expect(blindMethods().sort()).toEqual([
      'compaction',
      'creep',
      'hmm',
      'nag',
      'nagReply',
      'reply',
      'ship',
      'sync',
    ]);
  });
});

// ——— the reactions ———————————————————————————————————————————————————————

describe('the reactions', () => {
  it('draws neither authored reaction pool while the lever is off', () => {
    expect(DEFAULT_PATTERNS.user.reactionsByTopicEnabled).toBe(false);
    const picker = new LinePicker(sentinelSet(), { seed: 4, tier: 1 });
    // Not the by-topic pool, and not the tier pool either: the generic
    // reviews, which this file holds to both rules above.
    expect(picker.reaction(topicSnippet(), PRODUCT)).toBe(`${SENTINEL}user.reviews`);
  });

  it('answers every request with a line that passes both rules', () => {
    for (const tier of TIERS) {
      const picker = new LinePicker(DEFAULT_PATTERNS, { seed: 3, tier });
      picker.startLevel(0);
      for (const snippet of DEFAULT_CORPUS.snippets.slice(0, 60)) {
        const said = picker.reaction(snippet, PRODUCT);
        expect(DEFAULT_PATTERNS.user.reviews, `tier ${tier}: ${said}`).toContain(said);
        expect(PIECE.test(said), `tier ${tier} reacted with a piece: ${said}`).toBe(false);
        const strays = wordsOf(said).filter((w) => !VOCABULARY.has(w));
        expect(strays, `tier ${tier} reacted with stray words: ${said}`).toEqual([]);
      }
    }
  });

  it('never says the deploy verdict twice in a level', () => {
    for (const tier of TIERS) {
      const picker = new LinePicker(DEFAULT_PATTERNS, { seed: 8, tier });
      const snippet = DEFAULT_CORPUS.snippets[0]!;
      for (let level = 0; level < 4; level++) {
        picker.startLevel(level);
        const said = [
          picker.reaction(snippet, PRODUCT),
          picker.reaction(snippet, PRODUCT),
          picker.reaction(snippet, PRODUCT),
        ];
        const verdict = picker.review('no-such-level');
        expect(said, `tier ${tier} level ${level}`).not.toContain(verdict);
        expect(new Set([...said, verdict]).size, `tier ${tier} level ${level}`).toBe(4);
      }
    }
  });

  it('draws it again when the lever is on, so the gate above is live', () => {
    const set = sentinelSet();
    set.user.reactionsByTopicEnabled = true;
    const picker = new LinePicker(set, { seed: 4, tier: 1 });
    const topic = Object.keys(DEFAULT_PATTERNS.user.reactionsByTopic)[0]!;
    expect(picker.reaction(topicSnippet(), PRODUCT)).toBe(
      `${SENTINEL}user.reactionsByTopic.${topic}`,
    );
  });

  for (const [name, debt] of Object.entries(REACTION_DEBT)) {
    it(`${name} names the nonsense it named and no other (the reaction debt)`, () => {
      const tier = name.slice(-1) as '0' | '1' | '2';
      const bad = DEFAULT_PATTERNS.user.reactions[tier].filter((line) => PIECE.test(line)).sort();
      const grew = bad.filter((line) => !debt.includes(line));
      const cut = debt.filter((line) => !bad.includes(line));
      expect(grew, `${name} grew a piece-naming line:\n${grew.join('\n')}`).toEqual([]);
      expect(cut, `${name} lost one, so the pin above is stale:\n${cut.join('\n')}`).toEqual([]);
    });
  }
});

// ——— the reviews by product ——————————————————————————————————————————————

describe('the reviews by product', () => {
  const products = new Map(DEFAULT_PATTERNS.levels.levels.map((l) => [l.id, l.product]));

  it('names only what its own level is', () => {
    const bad: string[] = [];
    for (const [id, pool] of Object.entries(DEFAULT_PATTERNS.user.reviewsByProduct)) {
      const product = (products.get(id) ?? '').toLowerCase();
      for (const line of pool) {
        const hit = PIECE.exec(line);
        if (!hit) continue;
        // The product is on screen the whole level, so a review may name it.
        // Anything else is a piece the level never built: the verdict on a
        // website for a cat does not mention a contact form.
        if (!product.includes(hit[1]!.toLowerCase())) bad.push(`${id}: ${line} [${hit[0]}]`);
      }
    }
    expect(bad, `a review names what the level never built:\n${bad.join('\n')}`).toEqual([]);
  });

  it('leaves every level a review to draw', () => {
    for (const [id, pool] of Object.entries(DEFAULT_PATTERNS.user.reviewsByProduct)) {
      expect(pool.length, `${id} has no review left`).toBeGreaterThan(0);
    }
  });
});

// ——— the per-snippet asks ————————————————————————————————————————————————
//
// The old header of this file exempted the asks: "the per-snippet asks
// describe their own code". That is true of the code and false of the
// premise. Thirty-odd asks name something that belongs to one story level —
// a duck, a sandwich, a sock — and the planner draws any in-band snippet of
// the level's stack, so those asks reached levels built around something
// else. They carry `for` now, and the loader refuses a new one that does not.

describe('the asks in the corpus', () => {
  const levelIds = new Set(DEFAULT_PATTERNS.levels.levels.map((l) => l.id));
  const withAsk = DEFAULT_CORPUS.snippets.filter((s) => typeof s.ask === 'string' && s.ask !== '');

  it('has asks to check', () => {
    expect(withAsk.length).toBeGreaterThan(200);
  });

  it('names its level whenever it leans on one story', () => {
    const loose = withAsk
      .filter((s) => askIsBound(s.ask!) && s.for === undefined)
      .map((s) => `${s.id}: ${s.ask}`);
    expect(loose, `a story ask with no level to hold it up:\n${loose.join('\n')}`).toEqual([]);
  });

  it('binds only to levels that exist', () => {
    const wrong = DEFAULT_CORPUS.snippets
      .filter((s) => s.for !== undefined && !levelIds.has(s.for))
      .map((s) => `${s.id}: ${s.for}`);
    expect(wrong, `bound to no level:\n${wrong.join('\n')}`).toEqual([]);
  });

  // STORY_NOUNS was a hand-kept list derived from the sixteen levels that
  // exist today with nothing tying it back to them. A seventeenth level whose
  // premise brings a new thing — a bicycle, a greenhouse, a ferry — would
  // reopen the whole ask-leak class in silence: asks naming it would not be
  // "bound", the loader would not ask them which level they are for, and they
  // would be drawn into any level of the same stack and band.
  //
  // So the list is tied to the levels here, the way patterns.test.ts pins
  // VOICE_FORBIDDEN by reading Ghost's source. Every word that appears in
  // exactly ONE level's product or story is either a story noun or is listed
  // below as looked at and not one. A word in neither fails, which is what a
  // new level's premise will do — and the author then says which it is.
  const NOT_A_STORY_NOUN = new Set([
    'about',
    'again',
    'answers',
    'apps',
    'argues',
    'asking',
    'audience',
    'bad',
    'before',
    'blockchain',
    'book',
    'bot',
    'button',
    'buttons',
    'club',
    'coffee',
    'commute',
    'company',
    'computer',
    'cousin',
    'crowded',
    'dashboard',
    'decisions',
    'desktop',
    'disappearing',
    'do',
    'dryer',
    'eaten',
    'ego',
    'enterprise',
    'entire',
    'every',
    'everybody',
    'everywhere',
    'farther',
    'finds',
    'fridge',
    'full',
    'handwriting',
    'has',
    'hourly',
    'houseplants',
    'inside',
    'itself',
    'keeps',
    'leaves',
    'ledger',
    'lobby',
    'long',
    'longer',
    'loops',
    'lost',
    'loyalty',
    'machine',
    'marketplace',
    'meet',
    'metaverse',
    'most',
    'need',
    'needs',
    'news',
    'newsletter',
    'no',
    'nobody',
    'noon',
    'not',
    'nowhere',
    'office',
    'one',
    'other',
    'out',
    'phone',
    'platform',
    'praises',
    'program',
    'proof',
    'proper',
    'remember',
    'rideshare',
    'runs',
    'sees',
    'sell',
    'slightly',
    'soft',
    'speaking',
    'swirls',
    'thermostat',
    'these',
    'tool',
    'tools',
    'traffic',
    'used',
    'wants',
    'we',
    'windowsill',
    'with',
    'workday',
    'worried',
    'write',
    'writes',
    'yogurt',
    'you',
    'your',
  ]);

  it('every word one level alone uses is a story noun or is listed as not one', () => {
    const levels = DEFAULT_PATTERNS.levels.levels;
    const where = new Map<string, string[]>();
    for (const level of levels) {
      for (const word of new Set(wordsOf(`${level.product} ${level.story}`))) {
        if (!where.has(word)) where.set(word, []);
        where.get(word)!.push(level.id);
      }
    }
    const unlooked: string[] = [];
    for (const [word, ids] of where) {
      if (ids.length !== 1) continue;
      if (askIsBound(word) || NOT_A_STORY_NOUN.has(word)) continue;
      unlooked.push(`${word}  <- ${ids[0]}`);
    }
    expect(
      unlooked,
      `a level's premise brings a word nobody has ruled on:\n${unlooked.join('\n')}`,
    ).toEqual([]);
  });

  it('the tie is live: a new premise word fails until somebody rules on it', () => {
    expect(askIsBound('greenhouse')).toBe(false);
    expect(NOT_A_STORY_NOUN.has('greenhouse')).toBe(false);
    // And the words the levels really do supply are ruled on, both ways.
    expect(askIsBound('ducks')).toBe(true);
    expect(NOT_A_STORY_NOUN.has('thermostat')).toBe(true);
  });

  it('the story-noun rule catches the asks the field showed', () => {
    expect(askIsBound('reverse the line of waiting ducks')).toBe(true);
    expect(askIsBound('add my first sandwich to {product}')).toBe(true);
    expect(askIsBound('keep only the socks with no partner')).toBe(true);
    expect(askIsBound('add two numbers and show the answer.')).toBe(false);
    expect(STORY_NOUNS.length).toBeGreaterThan(0);
  });
});

// ——— the whole picker ————————————————————————————————————————————————————
//
// Every case above reads the lever files. This one draws through the picker
// the game actually uses, so the file cannot pass with the pools emptied.

describe('lines drawn through the picker', () => {
  it('are real lines and hold to both rules', () => {
    for (const tier of TIERS) {
      const picker = new LinePicker(DEFAULT_PATTERNS, { seed: 11, tier });
      picker.startLevel(0);
      const drawn: string[] = [];
      for (let i = 0; i < 6; i++) {
        for (const name of blindMethods()) {
          const draw = (picker as unknown as Record<string, () => string>)[name]!;
          drawn.push(draw.call(picker));
        }
        drawn.push(picker.review('no-such-level'));
      }
      for (const line of drawn) {
        expect(line, `tier ${tier} drew an empty line`).not.toBe('');
        expect(PIECE.test(line), `tier ${tier} drew a piece: ${line}`).toBe(false);
        const strays = wordsOf(line).filter((w) => !VOCABULARY.has(w));
        expect(strays, `tier ${tier} drew stray words in: ${line}`).toEqual([]);
      }
    }
  });
});
