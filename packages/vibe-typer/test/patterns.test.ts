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
import { DEFAULT_CORPUS } from '../src/corpus';

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
    // Sixteen authored levels is the slice-3 floor: two a corpus stack, a
    // third for the two the corpus is deepest in, and two integration ones.
    expect(set.levels.levels.length).toBeGreaterThanOrEqual(16);
    expect(Object.keys(set.user.asks).sort()).toEqual([...STACKS].sort());
  });

  it('gives every stack forty-eight asks a tier and the agent its pools', () => {
    // Three times the size slice one shipped, which is what the authoring run
    // wrote and what the loader's MIN_* constants now refuse to go under.
    for (const stack of STACKS) {
      for (const tier of ['0', '1', '2'] as const) {
        expect(DEFAULT_PATTERNS.user.asks[stack][tier].length, stack).toBeGreaterThanOrEqual(48);
      }
    }
    for (const tier of ['0', '1', '2'] as const) {
      expect(DEFAULT_PATTERNS.user.reactions[tier].length).toBeGreaterThanOrEqual(36);
    }
    expect(DEFAULT_PATTERNS.agent.replies.length).toBeGreaterThanOrEqual(72);
    expect(DEFAULT_PATTERNS.agent.hmm.length).toBeGreaterThanOrEqual(36);
    expect(DEFAULT_PATTERNS.agent.compactions.length).toBeGreaterThanOrEqual(24);
    expect(DEFAULT_PATTERNS.agent.ships.length).toBeGreaterThanOrEqual(24);
    expect(DEFAULT_PATTERNS.user.creeps.length).toBeGreaterThanOrEqual(36);
    expect(DEFAULT_PATTERNS.user.reviews.length).toBeGreaterThanOrEqual(24);
    expect(DEFAULT_PATTERNS.user.syncs.length).toBeGreaterThanOrEqual(36);
    expect(DEFAULT_PATTERNS.user.nags.length).toBeGreaterThanOrEqual(50);
    expect(DEFAULT_PATTERNS.agent.nagReplies.length).toBeGreaterThanOrEqual(50);
  });

  it('gives every corpus topic a reaction and every level a review', () => {
    const topics = new Set(DEFAULT_CORPUS.snippets.flatMap((s) => s.topics));
    for (const topic of topics) {
      expect(DEFAULT_PATTERNS.user.reactionsByTopic[topic], topic).toBeDefined();
    }
    for (const def of DEFAULT_PATTERNS.levels.levels) {
      expect(DEFAULT_PATTERNS.user.reviewsByProduct[def.id], def.id).toBeDefined();
    }
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

  it('halts on an integration level that pins snippets, or on a bad band', () => {
    // The integration stack may be listed as of slice 3, but it has no corpus
    // file — it is built from tape headers at play time — so there is no id in
    // it that a story could pin. A pinned list on one is the halt.
    const stack = clone(RAW);
    stack.levels.levels[0]!.stack = 'integration';
    delete stack.levels.levels[0]!.snippets;
    expect(() => loadPatterns(stack)).not.toThrow();

    const pinned = clone(RAW);
    pinned.levels.levels[0]!.stack = 'integration';
    pinned.levels.levels[0]!.snippets = ['int-a-b-1', 'int-a-b-3', 'int-a-b-5', 'int-a-c-1'];
    expect(() => loadPatterns(pinned)).toThrow('patterns/levels.json: levels.0.snippets');

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

  it('halts on a voice lever the worker would refuse', () => {
    const noBlock = clone(RAW) as Record<string, unknown>;
    delete (noBlock.cabinet as Record<string, unknown>).voice;
    expect(() => loadPatterns(noBlock)).toThrow('patterns/cabinet.json: voice');

    for (const preset of ['', 'af bella', 'af/bella', '_bella']) {
      const bad = clone(RAW) as Record<string, unknown>;
      ((bad.cabinet as Record<string, unknown>).voice as { user: { preset: string } }).user.preset =
        preset;
      expect(() => loadPatterns(bad), preset).toThrow('patterns/cabinet.json: voice.user.preset');
    }

    for (const rate of [0.49, 2.01, 'quick']) {
      const bad = clone(RAW) as Record<string, unknown>;
      ((bad.cabinet as Record<string, unknown>).voice as { user: { rate: unknown } }).user.rate =
        rate;
      expect(() => loadPatterns(bad), String(rate)).toThrow(
        'patterns/cabinet.json: voice.user.rate',
      );
    }

    for (const loudness of [-24.1, 12.1, null]) {
      const bad = clone(RAW) as Record<string, unknown>;
      (
        (bad.cabinet as Record<string, unknown>).voice as { user: { loudness: unknown } }
      ).user.loudness = loudness;
      expect(() => loadPatterns(bad), String(loudness)).toThrow(
        'patterns/cabinet.json: voice.user.loudness',
      );
    }

    for (const gap of [0.09, 3.01, 'half']) {
      const bad = clone(RAW) as Record<string, unknown>;
      ((bad.cabinet as Record<string, unknown>).voice as { maxGap: unknown }).maxGap = gap;
      expect(() => loadPatterns(bad), String(gap)).toThrow('patterns/cabinet.json: voice.maxGap');
    }
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

describe('the user has one voice', () => {
  it('is the preset the lever names and the sheet names, which are the same', () => {
    const { preset, rate, loudness } = DEFAULT_PATTERNS.cabinet.voice.user;
    expect(rate).toBeGreaterThanOrEqual(0.5);
    expect(rate).toBeLessThanOrEqual(2);
    expect(loudness).toBeLessThanOrEqual(12);
    expect(DEFAULT_PATTERNS.cabinet.voice.maxGap).toBeGreaterThan(0);

    // The writing brief a model is given and the lever the cabinet plays are
    // two files; a person is one. `## The voice` in the sheet is the tie.
    const sheet = readFileSync(
      path.resolve(__dirname, '..', 'patterns', 'voice', 'user.md'),
      'utf8',
    );
    const section = /\n## The voice\n([\s\S]*?)\n## /.exec(sheet);
    expect(section, 'the sheet has no "## The voice" section').not.toBeNull();
    const named = /`([A-Za-z0-9_-]+)`/.exec(section![1]!);
    expect(named, 'the sheet names no preset').not.toBeNull();
    expect(named![1]).toBe(preset);
  });

  it("is not one of the shooter's three", () => {
    expect(['bf_emma', 'am_michael', 'bm_george']).not.toContain(
      DEFAULT_PATTERNS.cabinet.voice.user.preset,
    );
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

describe('the quick sync is not the user talking', () => {
  function normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * A tic's head: its first three words, or the whole of it when it is
   * shorter. A tic is a shape and not a fixed string — `my cousin is asking`
   * and `my cousin is watching` are the same person doing the same thing — so
   * the head is what a sync line is held against.
   */
  function head(tic: string): string {
    return tic.split(' ').slice(0, 3).join(' ');
  }

  /**
   * The user's tics, read out of `patterns/voice/user.md` itself so the rule
   * follows the sheet rather than a copy of it. Each backtick span under
   * "Their tics" is one.
   */
  function userTics(): string[] {
    const sheet = readFileSync(path.resolve('packages/vibe-typer/patterns/voice/user.md'), 'utf8');
    const section = /^## Their tics$([\s\S]*?)^## /m.exec(sheet);
    expect(section, 'the user sheet still lists the tics').not.toBeNull();
    const tics = [...section![1]!.matchAll(/`([^`]+)`/g)].map((m) => head(normalize(m[1] ?? '')));
    expect(tics.length).toBeGreaterThanOrEqual(6);
    return tics;
  }

  it('lets no user tic into a sync line', () => {
    // A sync is meeting chatter between two people, and the shell never says
    // which of them said it, so a line only one of them could have said is the
    // wrong line. The pool is written to its own prompt under neither voice
    // sheet for exactly this reason.
    const tics = userTics();
    for (const line of DEFAULT_PATTERNS.user.syncs) {
      const flat = normalize(line);
      for (const tic of tics) {
        expect(flat.includes(tic), `${line} carries the tic "${tic}"`).toBe(false);
      }
    }
  });

  it('finds those same tics in the user pools, so the rule can fail', () => {
    // The check over the user's own lines finds plenty, which is what shows
    // the rule above is measuring something rather than passing for want of
    // anything to match.
    const tics = userTics();
    const mine = [...DEFAULT_PATTERNS.user.nags, ...DEFAULT_PATTERNS.user.creeps];
    const hits = mine.filter((line) => tics.some((tic) => normalize(line).includes(tic)));
    expect(hits.length).toBeGreaterThan(0);
  });
});
