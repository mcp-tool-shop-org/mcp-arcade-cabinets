import { describe, expect, it } from 'vitest';

import { DT } from '../src/play';
import { DEFAULT_PATTERNS, tierContext, type Patterns } from '../src/patterns';
import {
  agentNameOf,
  codeOf,
  createRun,
  feedRequests,
  leversOf,
  planOf,
  stepRun,
  suppliedCount,
  syncOf,
} from '../src/sim';
import { endlessPeek } from '../src/level';
import type { Event, RunInput, RunState, Tier } from '../src/types';
import { makeBot, seatFeed } from './helpers';

function step(state: RunState, input: RunInput = {}): RunState {
  return stepRun(state, input, DT);
}

function typeable(state: RunState): boolean {
  return state.beat === 'reply' || state.beat === 'code' || state.beat === 'sync';
}

function toTyping(state: RunState): void {
  let guard = 0;
  while (!state.over && !typeable(state) && guard < 16) {
    step(state);
    guard += 1;
  }
}

/** Type the current target and press Enter; `mistakeAt` mistypes one character. */
function sendLine(state: RunState, mistakeAt = -1): void {
  toTyping(state);
  const target = state.target;
  for (let i = 0; i < target.length; i++) {
    const key = i === mistakeAt ? (target[i] === 'z' ? 'q' : 'z') : target[i]!;
    step(state, { key });
  }
  step(state, { enter: true });
}

function kinds(events: readonly Event[]): string[] {
  return events.map((e) => e.kind);
}

function shipRequest(state: RunState): void {
  const guard = 400;
  let n = 0;
  const index = state.requestIndex;
  while (!state.over && state.requestIndex === index && n < guard) {
    if (typeable(state)) sendLine(state);
    else step(state);
    n += 1;
  }
}

/** Ship requests until the meeting lands. Seed 1, tier 0, level 2 draws one. */
function toSync(state: RunState): void {
  let guard = 0;
  while (!state.over && state.beat !== 'sync' && guard < 8) {
    shipRequest(state);
    guard += 1;
  }
}

describe('the beats', () => {
  it('lands the ask, then the reply, then the code, then the ship', () => {
    const state = createRun({ seed: 4, tier: 0, endless: false });
    const request = state.plan.requests[0]!;
    expect(state.beat).toBe('request');
    expect(state.chat[0]).toMatchObject({ who: 'user', line: request.ask });
    expect(state.context).toBeCloseTo(1 - state.plan.messageCost, 10);

    step(state);
    expect(state.beat).toBe('reply');
    expect(state.target).toBe(request.reply);

    sendLine(state);
    expect(state.beat).toBe('code');
    expect(state.chat.at(-1)).toMatchObject({ who: 'agent', line: request.reply });
    expect(state.target).toBe(codeOf(state)[0]);
    expect(state.lineIndex).toBe(0);

    const lines = codeOf(state).length;
    for (let i = 0; i < lines; i++) sendLine(state);
    if (state.beat === 'creep') {
      step(state);
      sendLine(state);
    }
    expect(state.beat).toBe('ship');
    expect(state.built).toHaveLength(1);
    expect(state.valuation).toBeGreaterThan(0);
    expect(state.built[0]!.size).toBeCloseTo(request.value, 6);

    step(state);
    expect(state.requestIndex).toBe(1);
    expect(state.beat).toBe('request');
  });

  it('ends a listed level with shipped and an over event', () => {
    const state = createRun({ seed: 4, tier: 0, endless: false });
    for (let i = 0; i < state.plan.requests.length; i++) shipRequest(state);
    expect(state.over).toBe(true);
    expect(state.ended).toBe('shipped');
    expect(kinds(state.events)).toContain('over');
    expect(state.built).toHaveLength(state.plan.requests.length);
    // The last ship carries the near-miss reading and the level's bonus.
    expect(state.valuation).toBeGreaterThan(state.plan.shipBonus);
  });

  it('chains the next level in endless and keeps the bar where it is', () => {
    const state = createRun({ seed: 4, tier: 0, endless: true });
    const first = state.plan.id;
    for (let i = 0; i < state.plan.requests.length; i++) shipRequest(state);
    step(state);
    expect(state.over).toBe(false);
    expect(state.levelIndex).toBe(1);
    expect(state.plan.id).not.toBe(first);
    expect(state.requestIndex).toBe(0);
  });
});

describe('keystrokes', () => {
  it('records a mistyped character and waits for the backspace', () => {
    const state = createRun({ seed: 4, tier: 0, endless: false });
    toTyping(state);
    const target = state.target;
    step(state, { key: target[0]! });
    expect(state.typed).toBe(target[0]);
    expect(state.errors).toEqual([]);
    const wrong = target[1] === 'z' ? 'q' : 'z';
    step(state, { key: wrong });
    expect(state.typed).toBe(`${target[0]}${wrong}`);
    expect(state.errors).toEqual([1]);
    expect(state.streak).toBe(0);
    expect(state.hype).toBe(1);
    step(state, { backspace: true });
    expect(state.errors).toEqual([]);
    expect(state.typed).toBe(target[0]);
    // A backspace on an empty buffer is not an error, it is nothing.
    step(state, { backspace: true });
    step(state, { backspace: true });
    expect(state.typed).toBe('');
  });

  it('sounds every keystroke with the streak as its pitch', () => {
    const state = createRun({ seed: 4, tier: 0, endless: false });
    toTyping(state);
    step(state, { key: state.target[0]! });
    const event = state.events.find((e) => e.kind === 'key');
    expect(event).toMatchObject({ kind: 'key', ok: true, pitch: 0 });
  });

  it('answers a line sent with an error with hmm, and costs nothing else', () => {
    const state = createRun({ seed: 4, tier: 0, endless: false });
    toTyping(state);
    sendLine(state); // the reply, clean
    const before = { ...state, chat: [...state.chat] };
    const line = state.lineIndex;
    const valuation = state.valuation;
    const context = state.context;
    sendLine(state, 0);
    expect(kinds(state.events)).toContain('hmm');
    expect(state.typed).toBe('');
    expect(state.errors).toEqual([]);
    expect(state.lineIndex).toBe(line);
    expect(state.target).toBe(before.target);
    expect(state.valuation).toBe(valuation);
    expect(state.streak).toBe(0);
    expect(state.hype).toBe(1);
    expect(state.context).toBeLessThan(context);
    expect(state.context).toBeGreaterThan(context - 0.05);
    expect(state.chat.at(-1)!.who).toBe('agent');
    // And the same line still sends cleanly afterwards.
    sendLine(state);
    expect(state.lineIndex === line + 1 || state.beat !== 'code').toBe(true);
  });

  it('climbs the streak on a clean line and drops it on a bad one', () => {
    const state = createRun({ seed: 4, tier: 0, endless: false });
    sendLine(state);
    expect(state.streak).toBe(1);
    sendLine(state);
    expect(state.streak).toBe(2);
    sendLine(state, 0);
    expect(state.streak).toBe(0);
  });
});

describe('the context bar', () => {
  it('compacts inside a listed level and carries on', () => {
    const state = createRun({ seed: 4, tier: 0, endless: false });
    toTyping(state);
    state.context = 0.00001;
    step(state);
    expect(kinds(state.events)).toContain('compaction');
    expect(state.over).toBe(false);
    expect(state.context).toBe(1);
    expect(state.hype).toBe(1);
    expect(state.streak).toBe(0);
    expect(state.chat.at(-1)!.who).toBe('agent');
  });

  it('ends the run on an empty bar in endless and in hardcore', () => {
    const endless = createRun({ seed: 4, tier: 0, endless: true });
    endless.context = 0.00001;
    step(endless);
    expect(endless.over).toBe(true);
    expect(endless.ended).toBe('context');

    const hard = createRun({ seed: 4, tier: 3, endless: false });
    hard.context = 0.00001;
    step(hard);
    expect(hard.over).toBe(true);
    expect(hard.ended).toBe('context');
    expect(kinds(hard.events)).toContain('over');
  });

  it('burns the bar on a mistyped character in hardcore only', () => {
    const burn = tierContext(DEFAULT_PATTERNS, 3).hardcoreBurnPerError;
    const hard = createRun({ seed: 4, tier: 3, endless: false });
    toTyping(hard);
    const before = hard.context;
    step(hard, { key: hard.target[0] === 'z' ? 'q' : 'z' });
    expect(before - hard.context).toBeGreaterThan(burn * 0.9);

    const easy = createRun({ seed: 4, tier: 0, endless: false });
    toTyping(easy);
    const was = easy.context;
    step(easy, { key: easy.target[0] === 'z' ? 'q' : 'z' });
    expect(was - easy.context).toBeLessThan(burn);
  });
});

describe('copilot', () => {
  it('turns on at the streak, takes a line on tab, and pays less for it', () => {
    const state = createRun({ seed: 2, tier: 0, endless: false });
    const bot = makeBot('perfect', 2);
    let guard = 0;
    while (!state.over && state.copilot === null && guard < 40000) {
      step(state, bot(state));
      guard += 1;
    }
    expect(state.copilot).not.toBeNull();
    while (state.beat !== 'code' && !state.over) step(state, bot(state));
    const request = state.plan.requests[state.requestIndex]!;
    step(state, { tab: true });
    expect(state.typed).toBe(state.target);
    expect(state.errors).toEqual([]);
    expect(state.copilot).toBeNull();
    expect(state.discountShare).toBeGreaterThan(0);
    const before = state.valuation;
    shipRequest(state);
    const paid = state.valuation - before;
    expect(paid).toBeLessThan(request.value * state.hype + 1e-9 + request.value);
    expect(state.built.at(-1)!.size).toBeLessThan(request.value);
  });

  it('never offers copilot in hardcore', () => {
    const state = createRun({ seed: 2, tier: 3, endless: false });
    const bot = makeBot('perfect', 2);
    let guard = 0;
    while (!state.over && guard < 40000) {
      step(state, bot(state));
      expect(state.copilot).toBeNull();
      guard += 1;
    }
  });
});

describe('scope creep', () => {
  it('shows the ask a step before the line is typeable', () => {
    let state = createRun({ seed: 1, tier: 0, endless: false });
    let found = false;
    for (let seed = 1; seed <= 12 && !found; seed++) {
      state = createRun({ seed, tier: 0, endless: false });
      if (state.plan.requests.some((r) => r.creep)) found = true;
    }
    expect(found).toBe(true);
    const index = state.plan.requests.findIndex((r) => r.creep);
    for (let i = 0; i < index; i++) shipRequest(state);
    const request = state.plan.requests[state.requestIndex]!;
    expect(request.creep).toBeDefined();
    const lines = codeOf(state).length;
    sendLine(state); // the reply
    for (let i = 0; i < lines; i++) sendLine(state);
    expect(state.beat).toBe('creep');
    expect(state.chat.at(-1)).toMatchObject({ who: 'user', line: request.creep!.ask });
    step(state, { key: 'a' }); // the creep frame swallows the keystroke
    expect(state.typed).toBe('');
    expect(state.beat).toBe('code');
    expect(state.target).toBe(request.creep!.line);
    expect(codeOf(state)).toHaveLength(lines + 1);
  });
});

describe('the quick sync', () => {
  const SEED = 1;
  const LEVEL = 2;

  it('sits between two requests, never in front of the first', () => {
    const state = createRun({ seed: SEED, tier: 0, endless: false, levelIndex: LEVEL });
    const at = state.plan.syncAt;
    expect(at).toBeDefined();
    expect(at).toBeGreaterThanOrEqual(1);
    expect(at).toBeLessThanOrEqual(state.plan.requests.length - 1);

    toSync(state);
    expect(state.beat).toBe('sync');
    expect(state.requestIndex).toBe(at);
    expect(syncOf(state)).toHaveLength(3);
    expect(syncOf(state)).toContain(state.target);
    expect(new Set(syncOf(state)).size).toBe(3);
    for (const line of syncOf(state)) {
      expect(DEFAULT_PATTERNS.user.syncs).toContain(line);
    }
  });

  it('costs the bar nothing, pays nothing, and leaves the streak standing', () => {
    const state = createRun({ seed: SEED, tier: 0, endless: false, levelIndex: LEVEL });
    toSync(state);
    const context = state.context;
    const streak = state.streak;
    const hype = state.hype;
    const valuation = state.valuation;
    const pieces = state.built.length;
    // Two of the three lines, and a hundred idle frames on top of them.
    sendLine(state);
    for (let i = 0; i < 100; i++) step(state);
    sendLine(state);
    expect(state.beat).toBe('sync');
    expect(state.context).toBe(context);
    expect(state.streak).toBe(streak);
    expect(state.hype).toBe(hype);
    expect(state.valuation).toBe(valuation);
    expect(state.built).toHaveLength(pieces);
    expect(state.clock).toBeGreaterThan(0);
  });

  it('lands each line in the chat and hands the next request over when it is done', () => {
    const state = createRun({ seed: SEED, tier: 0, endless: false, levelIndex: LEVEL });
    toSync(state);
    const lines = [...syncOf(state)];
    const index = state.requestIndex;
    sendLine(state);
    expect(state.chat.at(-1)).toMatchObject({ who: 'agent', line: lines[0] });
    expect(kinds(state.events)).toContain('line');
    sendLine(state);
    sendLine(state);
    expect(kinds(state.events)).toContain('sync');
    expect(state.events.some((e) => e.kind === 'sync' && !e.on)).toBe(true);
    expect(state.beat).toBe('request');
    expect(state.requestIndex).toBe(index);
    expect(state.chat.at(-1)).toMatchObject({
      who: 'user',
      line: state.plan.requests[index]!.ask,
    });
  });

  it('answers a short line with the agent own hmm and leaves the streak alone', () => {
    const state = createRun({ seed: SEED, tier: 0, endless: false, levelIndex: LEVEL });
    toSync(state);
    const streak = state.streak;
    const before = state.chat.length;
    const target = state.target;
    expect(target.length).toBeGreaterThan(1);
    // Every character right, one short of the line: the send is what is wrong.
    for (const ch of target.slice(0, target.length - 1)) step(state, { key: ch });
    step(state, { enter: true });
    expect(state.chat.length).toBe(before + 1);
    expect(state.chat.at(-1)!.who).toBe('agent');
    expect(DEFAULT_PATTERNS.agent.hmm).toContain(state.chat.at(-1)!.line);
    expect(state.typed).toBe('');
    expect(state.errors).toEqual([]);
    expect(state.streak).toBe(streak);
    expect(state.beat).toBe('sync');
    expect(state.target).toBe(target);
  });

  it('gives a level one sync and no more', () => {
    const state = createRun({ seed: SEED, tier: 0, endless: false, levelIndex: LEVEL });
    let syncs = 0;
    let guard = 0;
    while (!state.over && guard < 400) {
      if (typeable(state)) sendLine(state);
      else step(state);
      syncs += state.events.filter((e) => e.kind === 'sync' && e.on).length;
      guard += 1;
    }
    expect(state.over).toBe(true);
    expect(state.ended).toBe('shipped');
    expect(syncs).toBe(1);
  });

  it('gives a level with the lever at zero no sync at all', () => {
    const levers: Patterns = {
      ...DEFAULT_PATTERNS,
      levels: { ...DEFAULT_PATTERNS.levels, syncShare: 0 },
    };
    const plain = createRun({ levers, seed: SEED, tier: 0, endless: false, levelIndex: LEVEL });
    const full = createRun({ seed: SEED, tier: 0, endless: false, levelIndex: LEVEL });
    expect(plain.plan.syncAt).toBeUndefined();
    // The lever moves the meeting, never the snippets a level plans.
    expect(plain.plan.requests.map((r) => r.snippet.id)).toEqual(
      full.plan.requests.map((r) => r.snippet.id),
    );
  });
});

describe('determinism', () => {
  const stream: RunInput[] = [];
  for (let i = 0; i < 4000; i++) {
    stream.push(i % 37 === 0 ? { backspace: true } : i % 11 === 0 ? { enter: true } : {});
  }

  function run(): RunState {
    const state = createRun({
      seed: 8,
      tier: 1,
      endless: true,
      weakBigrams: { '))': 3 },
      stack: 'python',
    });
    const bot = makeBot('typist:55:0.04', 8);
    for (let i = 0; i < 20000 && !state.over; i++) {
      step(state, i % 100 === 0 ? stream[i % stream.length]! : bot(state));
    }
    return state;
  }

  it('gives a byte-identical state for the same levers, seed and input', () => {
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });

  it('gives a different run for a different seed', () => {
    const a = createRun({ seed: 1, tier: 0, endless: false });
    const b = createRun({ seed: 2, tier: 0, endless: false });
    expect(JSON.stringify(a.plan.requests.map((r) => r.snippet.id))).not.toBe(
      JSON.stringify(b.plan.requests.map((r) => r.snippet.id)),
    );
  });
});

describe('the run', () => {
  it('hands the shell the plan, the code, the levers and the agent name', () => {
    const state = createRun({ seed: 4, tier: 2 as Tier, endless: false, agentName: 'Bo' });
    expect(agentNameOf(state)).toBe('Bo');
    expect(leversOf(state)).toBe(DEFAULT_PATTERNS);
    expect(planOf(state)).toBe(state.plan);
    expect(codeOf(state).length).toBeGreaterThan(0);
    expect(createRun({ seed: 4, tier: 0, endless: false }).plan.tier).toBe(0);
    expect(agentNameOf(createRun({ seed: 4, tier: 0, endless: false }))).toBe('Claudette');
  });

  it('drains its events every step and stops stepping once it is over', () => {
    const state = createRun({ seed: 4, tier: 0, endless: false });
    expect(state.events.length).toBeGreaterThan(0);
    step(state);
    const after = state.events.length;
    expect(after).toBeLessThanOrEqual(1);
    state.over = true;
    const clock = state.clock;
    step(state, { key: 'a' });
    expect(state.clock).toBe(clock);
    expect(state.events).toEqual([]);
  });

  it('starts a level at a level the caller names', () => {
    const state = createRun({ seed: 4, tier: 0, endless: false, levelIndex: 3 });
    expect(state.plan.id).toBe(DEFAULT_PATTERNS.levels.levels[3]!.id);
    expect(() => createRun({ seed: 4, tier: 0, endless: false, levelIndex: 99 })).toThrow(
      'patterns/levels.json: levels.99',
    );
  });
});

// ——— the seat's requests (G28 as slice 3 amends it) ————————————————————————
//
// In endless a seated model may write the request the player types. The sim
// never waits for it: the shell feeds gated snippets into a buffer and the
// planner takes what is there when the next level starts. Everything below
// measures that the buffer is a queue, that a listed level ignores it, and
// that an empty buffer changes nothing at all.

/** Run an endless level to its end with a perfect typist. */
function finishLevel(state: RunState): void {
  const level = state.levelIndex;
  let guard = 0;
  const bot = makeBot('perfect', 1);
  while (!state.over && state.levelIndex === level && guard < 400000) {
    step(state, bot(state));
    guard += 1;
  }
}

describe("the seat's requests", () => {
  it('changes nothing at all when nothing is fed', () => {
    const plain = createRun({ seed: 5, tier: 0, endless: true });
    const fed = createRun({ seed: 5, tier: 0, endless: true });
    feedRequests(fed, []);
    expect(suppliedCount(fed)).toBe(0);
    const bot = makeBot('perfect', 5);
    for (let i = 0; i < 40000 && !plain.over; i++) {
      step(plain, bot(plain));
    }
    const bot2 = makeBot('perfect', 5);
    for (let i = 0; i < 40000 && !fed.over; i++) {
      feedRequests(fed, []);
      step(fed, bot2(fed));
    }
    expect(JSON.stringify(fed)).toBe(JSON.stringify(plain));
  });

  it('gives the next endless level the fed requests in order, with the fed product', () => {
    const feed = seatFeed(5, 0, 1, 4);
    expect(feed.length).toBe(4);
    const state = createRun({ seed: 5, tier: 0, endless: true });
    feedRequests(state, feed, 'a diary for houseplants');
    expect(suppliedCount(state)).toBe(4);
    finishLevel(state);
    expect(state.levelIndex).toBe(1);
    expect(suppliedCount(state)).toBe(0);
    expect(planOf(state).requests.map((r) => r.snippet.id)).toEqual(feed.map((f) => f.id));
    expect(planOf(state).product).toBe('a diary for houseplants');
    // The ask is the seat's own, with the product filled in (G28 amended).
    expect(planOf(state).requests[0]!.ask).toContain('a diary for houseplants');
    expect(planOf(state).requests[0]!.ask).not.toContain('{product}');
  });

  it('takes what it was given and draws the rest from the corpus', () => {
    const feed = seatFeed(6, 0, 1, 2);
    expect(feed.length).toBe(2);
    const state = createRun({ seed: 6, tier: 0, endless: true });
    feedRequests(state, feed);
    finishLevel(state);
    const ids = planOf(state).requests.map((r) => r.snippet.id);
    expect(ids.length).toBe(4);
    expect(ids.slice(0, 2)).toEqual(feed.map((f) => f.id));
    expect(ids.slice(2).every((id) => id.startsWith('seat-'))).toBe(false);
    // Nothing was fed for the product, so the noun list's draw stands.
    expect(planOf(state).product).toBe(
      endlessPeek({ set: DEFAULT_PATTERNS, seed: 6, tier: 0, levelIndex: 1 }).product,
    );
  });

  it('gives the same run for the same feed, twice', () => {
    const once = () => {
      const state = createRun({ seed: 7, tier: 0, endless: true });
      feedRequests(state, seatFeed(7, 0, 1, 4), 'a diary for houseplants');
      const bot = makeBot('perfect', 7);
      for (let i = 0; i < 60000 && !state.over; i++) step(state, bot(state));
      return state;
    };
    expect(JSON.stringify(once())).toBe(JSON.stringify(once()));
  });

  it('ignores the buffer in a listed level', () => {
    const state = createRun({ seed: 5, tier: 0, endless: false, levelIndex: 0 });
    const before = planOf(state).requests.map((r) => r.snippet.id);
    feedRequests(state, seatFeed(5, 0, 1, 4), 'a diary for houseplants');
    expect(suppliedCount(state)).toBe(4);
    finishLevel(state);
    expect(state.over).toBe(true);
    expect(planOf(state).requests.map((r) => r.snippet.id)).toEqual(before);
    expect(suppliedCount(state)).toBe(4);
  });
});
