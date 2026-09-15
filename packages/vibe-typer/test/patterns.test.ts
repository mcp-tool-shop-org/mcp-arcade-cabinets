import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  BEATS,
  DEFAULT_PATTERNS,
  lineFault,
  lineTier,
  loadPatterns,
  STACKS,
  tierContext,
  VOICE_FORBIDDEN,
} from '../src/patterns';

import cabinetJson from '../patterns/cabinet.json';
import levelsJson from '../patterns/levels.json';
import scoreJson from '../patterns/score.json';
import contextJson from '../patterns/context.json';
import difficultyJson from '../patterns/difficulty.json';
import userJson from '../patterns/user.json';
import agentJson from '../patterns/agent.json';
import productsJson from '../patterns/products.json';

const RAW = {
  cabinet: cabinetJson,
  levels: levelsJson,
  score: scoreJson,
  context: contextJson,
  difficulty: difficultyJson,
  user: userJson,
  agent: agentJson,
  products: productsJson,
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** The levers as loose data, so a halt test can spoil exactly one key. */
function loose(): Record<string, Record<string, unknown>> {
  return JSON.parse(JSON.stringify(RAW)) as Record<string, Record<string, unknown>>;
}

/** The level rows of a loose copy. */
function rowsOf(raw: Record<string, Record<string, unknown>>): Record<string, unknown>[] {
  return raw.levels!.levels as Record<string, unknown>[];
}

describe('the levers load', () => {
  it('loads every file', () => {
    const set = loadPatterns(clone(RAW));
    expect(set.cabinet.name).toBe('Vibe Typer');
    expect(set.cabinet.words.hype).toBe('vibes');
    expect(Object.keys(set.cabinet.words.beats).sort()).toEqual([...BEATS].sort());
    expect(set.cabinet.words.beats.code).toBe('the code');
    expect(set.levels.levels.length).toBeGreaterThanOrEqual(8);
    expect(Object.keys(set.user.asks).sort()).toEqual([...STACKS].sort());
  });

  it('gives every stack sixteen asks a tier and the agent its pools', () => {
    for (const stack of STACKS) {
      for (const tier of ['0', '1', '2'] as const) {
        expect(DEFAULT_PATTERNS.user.asks[stack][tier].length).toBeGreaterThanOrEqual(16);
      }
    }
    expect(DEFAULT_PATTERNS.agent.replies.length).toBeGreaterThanOrEqual(24);
    expect(DEFAULT_PATTERNS.agent.hmm.length).toBeGreaterThanOrEqual(12);
    expect(DEFAULT_PATTERNS.agent.compactions.length).toBeGreaterThanOrEqual(8);
    expect(DEFAULT_PATTERNS.agent.ships.length).toBeGreaterThanOrEqual(8);
    expect(DEFAULT_PATTERNS.user.creeps.length).toBeGreaterThanOrEqual(12);
    expect(DEFAULT_PATTERNS.user.reviews.length).toBeGreaterThanOrEqual(8);
    expect(DEFAULT_PATTERNS.user.nags.length).toBeGreaterThanOrEqual(12);
    expect(DEFAULT_PATTERNS.agent.nagReplies.length).toBeGreaterThanOrEqual(12);
  });

  it('gives every level a story and reads the check-in clock', () => {
    for (const def of DEFAULT_PATTERNS.levels.levels) {
      expect(lineFault(def.story), def.id).toBeNull();
    }
    const nag = DEFAULT_PATTERNS.levels.nagEvery;
    expect(nag.min).toBeGreaterThan(0);
    expect(nag.max).toBeGreaterThanOrEqual(nag.min);
  });

  it('hardcore borrows tier two and tier three burns', () => {
    expect(lineTier(3)).toBe('2');
    expect(lineTier(0)).toBe('0');
    expect(tierContext(DEFAULT_PATTERNS, 3).hardcoreBurnPerError).toBeGreaterThan(0);
    expect(tierContext(DEFAULT_PATTERNS, 0).hardcoreBurnPerError).toBe(0);
  });
});

describe('the gate halts', () => {
  it('halts on a digit in a line, naming the file and the key', () => {
    const raw = clone(RAW);
    raw.user.asks.bash['0'][2] = 'can we add 2 buttons';
    expect(() => loadPatterns(raw)).toThrow('patterns/user.json: asks.bash.0.2');
  });

  it('halts on a forbidden word, a model name, a yell and a long line', () => {
    const digit = clone(RAW);
    digit.agent.replies[0] = 'that is a fact about the build';
    expect(() => loadPatterns(digit)).toThrow('patterns/agent.json: replies.0');

    const model = clone(RAW);
    model.agent.hmm[1] = 'let me ask gemini about that line';
    expect(() => loadPatterns(model)).toThrow('patterns/agent.json: hmm.1');

    const yell = clone(RAW);
    yell.agent.ships[0] = 'shipped it';
    yell.agent.ships[1] = 'SHIPPED it now';
    expect(() => loadPatterns(yell)).toThrow('patterns/agent.json: ships.1');

    const long = clone(RAW);
    long.user.creeps[0] = 'oh also can it do this and that and the other thing too please';
    expect(() => loadPatterns(long)).toThrow('patterns/user.json: creeps.0');
  });

  it('halts on a missing key and on a duplicate line', () => {
    const missing = clone(RAW) as Record<string, unknown>;
    delete (missing.score as Record<string, unknown>).copilotStreak;
    expect(() => loadPatterns(missing)).toThrow('patterns/score.json: copilotStreak');

    const gone = clone(RAW) as Record<string, unknown>;
    delete gone.products;
    expect(() => loadPatterns(gone)).toThrow('patterns/products.json: products');

    const dupe = clone(RAW);
    dupe.agent.ships[1] = dupe.agent.ships[0]!;
    expect(() => loadPatterns(dupe)).toThrow('patterns/agent.json: ships.1');
  });

  it('halts on a sync line that runs long, and on a missing sync share', () => {
    const long = clone(RAW);
    long.user.syncs[0] = 'can you please share your screen with us';
    expect(() => loadPatterns(long)).toThrow('patterns/user.json: syncs.0');

    const gone = clone(RAW) as Record<string, unknown>;
    delete (gone.levels as Record<string, unknown>).syncShare;
    expect(() => loadPatterns(gone)).toThrow('patterns/levels.json: syncShare');
  });

  it('halts on a level with no story and on one that yells', () => {
    const gone = loose();
    delete rowsOf(gone)[0]!.story;
    expect(() => loadPatterns(gone)).toThrow('patterns/levels.json: levels.0.story');

    const yell = loose();
    rowsOf(yell)[1]!.story = 'the ducks are READY for this';
    expect(() => loadPatterns(yell)).toThrow('patterns/levels.json: levels.1.story');
  });

  it('halts on a pinned list of the wrong length and on a repeat in it', () => {
    const short = loose();
    rowsOf(short)[0]!.snippets = ['cal-sh-d1-001', 'cal-sh-d1-005'];
    expect(() => loadPatterns(short)).toThrow('patterns/levels.json: levels.0.snippets');

    const twice = loose();
    rowsOf(twice)[0]!.snippets = ['a', 'b', 'c', 'c'];
    expect(() => loadPatterns(twice)).toThrow('patterns/levels.json: levels.0.snippets.3');
  });

  it('halts on a check-in clock that runs backwards, and on a short pool', () => {
    const backwards = loose();
    backwards.levels!.nagEvery = { min: 90, max: 30 };
    expect(() => loadPatterns(backwards)).toThrow('patterns/levels.json: nagEvery.max');

    const gone = loose();
    delete gone.levels!.nagEvery;
    expect(() => loadPatterns(gone)).toThrow('patterns/levels.json: nagEvery');

    const short = loose();
    short.user!.nags = (short.user!.nags as string[]).slice(0, 4);
    expect(() => loadPatterns(short)).toThrow('patterns/user.json: nags');

    const answers = loose();
    (answers.agent!.nagReplies as string[])[2] = 'let me ask claude about that one';
    expect(() => loadPatterns(answers)).toThrow('patterns/agent.json: nagReplies.2');
  });

  it('halts on a named pool with a bad line, and takes an empty record', () => {
    const topic = loose();
    const byTopic = topic.user!.reactionsByTopic as Record<string, string[]>;
    byTopic.print![0] = 'it printed 3 things';
    expect(() => loadPatterns(topic)).toThrow('patterns/user.json: reactionsByTopic.print.0');

    const empty = loose();
    empty.user!.reactionsByTopic = {};
    empty.user!.reviewsByProduct = {};
    expect(loadPatterns(empty).user.reactionsByTopic).toEqual({});

    const bare = loose();
    bare.user!.reviewsByProduct = { 'cat-website': [] };
    expect(() => loadPatterns(bare)).toThrow('patterns/user.json: reviewsByProduct.cat-website');
  });

  it('halts on a level that names the integration stack or a bad band', () => {
    const stack = clone(RAW);
    stack.levels.levels[0]!.stack = 'integration';
    expect(() => loadPatterns(stack)).toThrow('patterns/levels.json: levels.0.stack');

    const band = clone(RAW);
    band.levels.levels[0]!.bandMax = 0;
    expect(() => loadPatterns(band)).toThrow('patterns/levels.json: levels.0.bandMax');
  });

  it('halts on a missing beat word and on a beat word that cannot be said', () => {
    const gone = clone(RAW) as Record<string, unknown>;
    const words = (gone.cabinet as Record<string, unknown>).words as Record<string, unknown>;
    delete (words.beats as Record<string, unknown>).creep;
    expect(() => loadPatterns(gone)).toThrow('patterns/cabinet.json: words.beats.creep');

    const noBeats = clone(RAW) as Record<string, unknown>;
    delete ((noBeats.cabinet as Record<string, unknown>).words as Record<string, unknown>).beats;
    expect(() => loadPatterns(noBeats)).toThrow('patterns/cabinet.json: words.beats');

    const bad = clone(RAW);
    bad.cabinet.words.beats.ship = 'shipping 2 things';
    expect(() => loadPatterns(bad)).toThrow('patterns/cabinet.json: words.beats.ship');
  });

  it('names the reason a line cannot be said', () => {
    expect(lineFault('can it be more blockchain')).toBeNull();
    expect(lineFault('add 3 ducks')).toBe('forbidden word or digit');
    expect(lineFault('ship it now. and again')).toBe('more than one sentence');
    expect(lineFault('   ')).toBe('empty');
    expect(lineFault('do it now ')).toBe('padded');
    expect(lineFault('the scores look great')).toBe('forbidden word or digit');
    expect(lineFault('it’s live')).toBe('not ascii');
    expect(lineFault('so — anyway')).toBe('not ascii');
  });
});

describe('the two forbidden lists', () => {
  it('is the same regular expression Ghost uses', () => {
    const file = path.resolve('packages/ghost-on-the-menu/src/patterns.ts');
    const source = readFileSync(file, 'utf8');
    const match = /const VOICE_FORBIDDEN =\s*(\/[^\n]*\/i);/.exec(source);
    expect(match).not.toBeNull();
    expect(match![1]).toBe(String(VOICE_FORBIDDEN));
  });
});
