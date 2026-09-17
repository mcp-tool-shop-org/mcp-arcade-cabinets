import { describe, expect, it } from 'vitest';

import { DT } from '../src/play';
import { DEFAULT_PATTERNS, tierContext, type Patterns } from '../src/patterns';
import {
  agentNameOf,
  codeOf,
  BUILT_CAP,
  CHAT_CAP,
  cleanWeak,
  createRun,
  feedProduct,
  feedReaction,
  feedRequests,
  leversOf,
  planOf,
  reactionWaiting,
  stepRun,
  suppliedCount,
  suppliedProductOf,
  syncOf,
  WEAK_PAIRS,
  WEAK_PER_PAIR,
} from '../src/sim';
import { endlessPeek, planLevel } from '../src/level';
import { LinePicker } from '../src/lines';
import { DEFAULT_CORPUS, type Corpus } from '../src/corpus';
import type { Event, RunInput, RunState, Tier } from '../src/types';
import { makeBot, seatFeed } from './helpers';

function step(state: RunState, input: RunInput = {}): RunState {
  return stepRun(state, input, DT);
}

function typeable(state: RunState): boolean {
  return state.beat === 'reply' || state.beat === 'code' || state.beat === 'sync';
}

/**
 * Frames one transitional beat holds for, plus one. The ask, the "oh also",
 * the reaction and the compaction each hold for `pace.beatHold` seconds of
 * frame time now, not for one frame, so every helper that used to spend a
 * single step on them spends this many.
 */
const HOLD_FRAMES = Math.ceil(DEFAULT_PATTERNS.levels.pace.beatHold / DT) + 1;

/** Step until the held beat in hand has been read and the run has moved on. */
function pass(state: RunState): void {
  const beat = state.beat;
  for (let i = 0; i < HOLD_FRAMES * 4 && !state.over && state.beat === beat; i++) step(state);
}

function toTyping(state: RunState): void {
  let guard = 0;
  while (!state.over && !typeable(state) && guard < HOLD_FRAMES * 8) {
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
  const guard = 4000;
  let n = 0;
  const index = state.requestIndex;
  while (!state.over && state.requestIndex === index && n < guard) {
    if (typeable(state)) sendLine(state);
    else step(state);
    n += 1;
  }
}

/**
 * Ship the request in hand and stop ON the ship beat, before `advance` takes
 * the run to the next request. What the user says at a ship is the last line
 * of the chat only until then.
 */
function toShip(state: RunState): void {
  const lines = codeOf(state).length;
  sendLine(state);
  for (let i = 0; i < lines; i++) sendLine(state);
  if (state.beat === 'creep') {
    pass(state);
    sendLine(state);
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
    expect(state.chat[0]).toMatchObject({ who: 'user', line: request.ask, kind: 'ask', seq: 0 });
    expect(state.context).toBeCloseTo(1 - state.plan.messageCost, 10);

    // The ask holds for the Director's reading time and not for one frame.
    step(state);
    expect(state.beat).toBe('request');
    pass(state);
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
      pass(state);
      sendLine(state);
    }
    expect(state.beat).toBe('ship');
    expect(state.built).toHaveLength(1);
    expect(state.valuation).toBeGreaterThan(0);
    expect(state.built[0]!.size).toBeCloseTo(request.value, 6);

    pass(state);
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
    pass(state);
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
    expect(state.chat.at(-1)!.kind).toBe('compaction');
  });

  // The largest scoring change a listed level has used to carry no payload at
  // all, so the cue layer had one generic shake for a player who had a
  // five-times run going and the agent's line was the only statement of it.
  it('says what the compaction cost, and is a beat the player can read', () => {
    // Level one opens on a four-line piece, so two clean lines leave the run
    // on a code beat with a streak to lose. The bar holds still on a
    // transitional beat, so a compaction can only be reached on one the
    // player is actually typing.
    const state = createRun({ seed: 4, tier: 0, endless: false, levelIndex: 1 });
    sendLine(state);
    sendLine(state);
    expect(state.beat).toBe('code');
    expect(state.streak).toBeGreaterThan(0);
    const streak = state.streak;
    const hype = state.hype;
    const beat = state.beat;
    const target = state.target;
    state.context = 0.00001;
    step(state);
    expect(state.events).toContainEqual({ kind: 'compaction', streak, hype });
    // The one authored word for this moment is reachable: it is a beat, it
    // holds long enough to read, and the line in the player's hands is
    // exactly where they left it when the hold is spent.
    expect(state.beat).toBe('compaction');
    expect(DEFAULT_PATTERNS.cabinet.words.beats.compaction).toBeTruthy();
    pass(state);
    expect(state.beat).toBe(beat);
    expect(state.target).toBe(target);
  });

  it('ends the run on an empty bar in endless and in hardcore', () => {
    const endless = createRun({ seed: 4, tier: 0, endless: true });
    toTyping(endless);
    endless.context = 0.00001;
    step(endless);
    expect(endless.over).toBe(true);
    expect(endless.ended).toBe('context');
    // The player's own time took it, not a message the sim sent.
    expect(endless.endedBy).toBe('drain');
    expect(endless.events).toContainEqual({ kind: 'over', how: 'context', by: 'drain' });

    const hard = createRun({ seed: 4, tier: 3, endless: false });
    toTyping(hard);
    hard.context = 0.00001;
    step(hard);
    expect(hard.over).toBe(true);
    expect(hard.ended).toBe('context');
    expect(kinds(hard.events)).toContain('over');
  });

  // A run could end on a line the player never typed, with the same word
  // they get when their own typing drained the bar over three minutes.
  it('says when the message cost took the last of the bar', () => {
    const state = createRun({ seed: 4, tier: 0, endless: true });
    // Leave the bar with less than one message in it and ship the request,
    // so the next ask is what crosses zero.
    while (!state.over && state.beat !== 'ship') {
      if (typeable(state)) sendLine(state);
      else step(state);
    }
    state.context = state.plan.messageCost / 2;
    // The ship beat hands over to the next ask, whose cost crosses zero; the
    // step after it is where an empty bar is read.
    pass(state);
    expect(state.beat).toBe('request');
    step(state);
    expect(state.over).toBe(true);
    expect(state.ended).toBe('context');
    expect(state.endedBy).toBe('message');
    expect(state.events).toContainEqual({ kind: 'over', how: 'context', by: 'message' });
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
  /** Step to a code line and put an offer on the table that will not expire. */
  function offered(state: RunState, bot: (s: RunState) => RunInput): void {
    let guard = 0;
    while (!state.over && state.beat !== 'code' && guard < 40000) {
      step(state, bot(state));
      guard += 1;
    }
    state.copilot = { until: state.clock + 1000 };
  }

  it('turns on at the streak, takes a line on tab, and pays less for it', () => {
    const state = createRun({ seed: 2, tier: 0, endless: false });
    const bot = makeBot('perfect', 2);
    let guard = 0;
    while (!state.over && state.copilot === null && guard < 40000) {
      step(state, bot(state));
      guard += 1;
    }
    expect(state.copilot).not.toBeNull();
    offered(state, bot);
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

  // The discount is charged against the request's own code lines, so on the
  // reply line and on a sync's three there was nothing to charge it to: Tab
  // filled the warm-up of every request for nothing, and the Enter after it
  // took the clean-line branch and grew the streak. A free line is not a
  // discount, so the offer is not open off the code beat.
  it('does not take the reply line, and keeps the offer for the code', () => {
    const state = createRun({ seed: 2, tier: 0, endless: false });
    const bot = makeBot('perfect', 2);
    // Wind on to a request's reply line, where the offer used to be free.
    let guard = 0;
    while (!state.over && state.beat !== 'reply' && guard < 40000) {
      step(state, bot(state));
      guard += 1;
    }
    expect(state.beat).toBe('reply');
    state.copilot = { until: state.clock + 1000 };
    const typed = state.typed;
    const share = state.discountShare;
    step(state, { tab: true });
    expect(state.typed, 'the reply line was filled for free').toBe(typed);
    expect(state.discountShare).toBe(share);
    // And the offer is still standing, for the code lines it was meant for.
    expect(state.copilot).not.toBeNull();
  });

  // Tab with no offer open used to return in silence AND eat the frame, so a
  // Tab pressed mid-word swallowed the next character's step too. Every other
  // refusal in this sim says something.
  it('answers a tab with no offer open, and does not eat the frame', () => {
    const state = createRun({ seed: 2, tier: 0, endless: false });
    toTyping(state);
    expect(state.copilot).toBeNull();
    const key = state.target[0]!;
    step(state, { tab: true, key });
    expect(state.events).toContainEqual({ kind: 'copilot', on: false, offered: false });
    // The keystroke of that same frame still lands.
    expect(state.typed).toBe(key);
  });

  // The dispatch calls the offer a bounded window and it was not one: it
  // re-armed on the very next clean line while the streak still stood over
  // the threshold, so past the threshold it was open on every line.
  it('does not re-open until the cooldown has gone by', () => {
    const cooldown = DEFAULT_PATTERNS.score.copilotCooldown;
    expect(cooldown).toBeGreaterThan(0);
    const state = createRun({ seed: 2, tier: 0, endless: true });
    const bot = makeBot('perfect', 2);
    let guard = 0;
    while (!state.over && state.copilot === null && guard < 40000) {
      step(state, bot(state));
      guard += 1;
    }
    expect(state.copilot).not.toBeNull();
    offered(state, bot);
    step(state, { tab: true });
    expect(state.copilot).toBeNull();
    const closed = state.clock;
    // Clean lines keep coming and the streak stays over the threshold; the
    // offer stays shut until the cooldown is spent.
    guard = 0;
    let stepped = 0;
    while (!state.over && state.clock < closed + cooldown * 0.8 && guard < 40000) {
      step(state, bot(state));
      expect(state.copilot, `re-armed at ${state.clock}`).toBeNull();
      stepped += 1;
      guard += 1;
    }
    expect(stepped, 'the run ended before the cooldown could be measured').toBeGreaterThan(60);
    expect(state.streak).toBeGreaterThanOrEqual(DEFAULT_PATTERNS.score.copilotStreak);
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
    expect(state.chat.at(-1)).toMatchObject({
      who: 'user',
      line: request.creep!.ask,
      kind: 'creep',
    });
    // The creep beat swallows the input of every frame it holds, and it
    // holds for reading time rather than for one frame: the "oh also" was on
    // screen for about sixteen milliseconds before the line it describes was
    // the live target.
    const held = state.clock;
    step(state, { key: 'a' });
    expect(state.typed).toBe('');
    expect(state.beat).toBe('creep');
    pass(state);
    expect(state.clock - held).toBeGreaterThanOrEqual(DEFAULT_PATTERNS.levels.pace.beatHold);
    expect(state.typed).toBe('');
    expect(state.beat).toBe('code');
    expect(state.target).toBe(request.creep!.line);
    expect(codeOf(state)).toHaveLength(lines + 1);
  });

  // The creep's line and its ask came from unrelated draws: the line was
  // lifted out of a randomly chosen OTHER snippet in the band and the ask was
  // drawn blind from the pool, so the follow-up request and the code the
  // player typed about it had no relationship at all.
  it('takes the snippet own creep when it has one, and honors its binding', () => {
    const own = { line: 'print("one more thing")', ask: 'can it say one more thing at the end' };
    const levers: Patterns = {
      ...DEFAULT_PATTERNS,
      levels: { ...DEFAULT_PATTERNS.levels, creepShare: 1 },
    };
    const plain = planLevel({
      set: levers,
      corpus: DEFAULT_CORPUS,
      picker: new LinePicker(levers, { seed: 1, tier: 0 }),
      levelIndex: 0,
      seed: 1,
      tier: 0,
      endless: false,
      weakBigrams: {},
      used: new Set<string>(),
    })!;
    expect(plain.requests[0]!.creep).toBeDefined();
    // The same level, with its first snippet carrying a creep of its own.
    const seasoned: Corpus = {
      ...DEFAULT_CORPUS,
      byStack: Object.fromEntries(
        Object.entries(DEFAULT_CORPUS.byStack).map(([stack, list]) => [
          stack,
          list.map((s) => (s.id === plain.requests[0]!.snippet.id ? { ...s, creep: own } : s)),
        ]),
      ),
    };
    const authored = planLevel({
      set: levers,
      corpus: seasoned,
      picker: new LinePicker(levers, { seed: 1, tier: 0 }),
      levelIndex: 0,
      seed: 1,
      tier: 0,
      endless: false,
      weakBigrams: {},
      used: new Set<string>(),
    })!;
    expect(authored.requests[0]!.creep).toEqual(own);

    // A creep written against one story level's premise plays only there.
    const bound: Corpus = {
      ...DEFAULT_CORPUS,
      byStack: Object.fromEntries(
        Object.entries(DEFAULT_CORPUS.byStack).map(([stack, list]) => [
          stack,
          list.map((s) =>
            s.id === plain.requests[0]!.snippet.id
              ? { ...s, creep: own, for: 'some-other-level' }
              : s,
          ),
        ]),
      ),
    };
    const elsewhere = planLevel({
      set: levers,
      corpus: bound,
      picker: new LinePicker(levers, { seed: 1, tier: 0 }),
      levelIndex: 0,
      seed: 1,
      tier: 0,
      endless: false,
      weakBigrams: {},
      used: new Set<string>(),
    })!;
    expect(elsewhere.requests[0]!.creep).not.toEqual(own);
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

  it('answers a mistyped line with the agent own hmm and leaves the streak alone', () => {
    const state = createRun({ seed: SEED, tier: 0, endless: false, levelIndex: LEVEL });
    toSync(state);
    const streak = state.streak;
    const before = state.chat.length;
    const target = state.target;
    expect(target.length).toBeGreaterThan(1);

    // One short of the line is not a mistake, it is an unfinished line: it
    // says so with its own word and keeps every character already typed.
    for (const ch of target.slice(0, target.length - 1)) step(state, { key: ch });
    const typed = state.typed;
    step(state, { enter: true });
    expect(state.events).toContainEqual({ kind: 'line', ok: false, why: 'unfinished' });
    expect(state.chat.length, 'an unfinished line was answered as a typo').toBe(before);
    expect(state.typed).toBe(typed);
    expect(state.streak).toBe(streak);

    // A wrong character is the mistake, and that is what the hmm answers. The
    // keystroke costs the streak wherever it lands, in a meeting as anywhere
    // else; what the meeting never does is take one for the SEND.
    step(state, { key: target.at(-1) === 'z' ? 'q' : 'z' });
    const afterKey = state.streak;
    step(state, { enter: true });
    expect(state.chat.length).toBe(before + 1);
    expect(state.chat.at(-1)!.who).toBe('agent');
    expect(state.chat.at(-1)!.kind).toBe('hmm');
    expect(DEFAULT_PATTERNS.agent.hmm).toContain(state.chat.at(-1)!.line);
    expect(state.typed).toBe('');
    expect(state.errors).toEqual([]);
    expect(state.streak).toBe(afterKey);
    expect(state.beat).toBe('sync');
    expect(state.target).toBe(target);
  });

  it('gives a level one sync and no more', () => {
    const state = createRun({ seed: SEED, tier: 0, endless: false, levelIndex: LEVEL });
    let syncs = 0;
    let guard = 0;
    while (!state.over && guard < 4000) {
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

describe('the check-in', () => {
  /** The same levers with a check-in due every half second of frame time. */
  function fast(every = 0.5): Patterns {
    return {
      ...DEFAULT_PATTERNS,
      levels: { ...DEFAULT_PATTERNS.levels, nagEvery: { min: every, max: every } },
    };
  }

  /**
   * Level one, not level zero: a check-in is legal only on a code line that is
   * not the run's first, and every test here reaches one by sending two whole
   * lines. Level zero's story opens on a one-line piece after the slice-3
   * authoring run, so the second line sent there ships the piece instead of
   * moving the line index. Level one opens on four lines.
   */
  function run(): RunState {
    return createRun({ levers: fast(), seed: 1, tier: 0, endless: false, levelIndex: 1 });
  }

  /** Step until a check-in lands, and hand back the step it landed on. */
  function toNag(state: RunState, cap = 600): number {
    for (let i = 0; i < cap; i++) {
      step(state);
      if (state.events.some((e) => e.kind === 'message' && e.nag === true)) return i;
    }
    throw new Error('no check-in landed');
  }

  it('never lands on the run first line, and lands after it', () => {
    const state = run();
    sendLine(state); // the reply, so the code is in hand at line zero
    expect(state.beat).toBe('code');
    expect(state.lineIndex).toBe(0);
    for (let i = 0; i < 240; i++) step(state);
    expect(state.chat.some((c) => c.nag === true)).toBe(false);
    sendLine(state); // the first code line is out; the line index moves on
    toNag(state);
    const nag = state.chat.find((c) => c.nag === true)!;
    expect(nag.who).toBe('user');
    expect(DEFAULT_PATTERNS.user.nags).toContain(nag.line);
  });

  it('carries the flag on the line and on the event', () => {
    const state = run();
    sendLine(state);
    sendLine(state);
    toNag(state);
    const event = state.events.find((e) => e.kind === 'message' && e.nag === true);
    expect(event).toMatchObject({ kind: 'message', who: 'user', nag: true });
    expect(state.chat.at(-1)).toMatchObject({ who: 'user', nag: true });
  });

  it('costs the bar nothing, pays nothing and leaves the streak standing', () => {
    const state = run();
    sendLine(state);
    sendLine(state);
    const context = state.context;
    const valuation = state.valuation;
    const hype = state.hype;
    const streak = state.streak;
    const pieces = state.built.length;
    const steps = toNag(state) + 1;
    expect(state.valuation).toBe(valuation);
    expect(state.hype).toBe(hype);
    expect(state.streak).toBe(streak);
    expect(state.built).toHaveLength(pieces);
    // The bar moved by the level's own drain over those frames and by nothing
    // else: a message that cost the bar would take the level's messageCost.
    const drained = context - state.context;
    expect(drained).toBeLessThan(state.plan.messageCost);
    expect(drained).toBeCloseTo(state.plan.drainPerSec * steps * DT, 6);
  });

  it('answers once the line in hand is out clean, and not before', () => {
    const state = run();
    sendLine(state);
    sendLine(state);
    toNag(state);
    const after = state.chat.length;
    // A line sent wrong keeps the answer owed: the agent says its own hmm.
    sendLine(state, 0);
    expect(DEFAULT_PATTERNS.agent.hmm).toContain(state.chat.at(-1)!.line);
    expect(state.chat.filter((c) => DEFAULT_PATTERNS.agent.nagReplies.includes(c.line))).toEqual(
      [],
    );
    sendLine(state);
    const answers = state.chat
      .slice(after)
      .filter((c) => c.who === 'agent' && DEFAULT_PATTERNS.agent.nagReplies.includes(c.line));
    expect(answers).toHaveLength(1);
    expect(answers[0]!.nag).toBeUndefined();
  });

  it('holds a second check-in while the first is owed an answer', () => {
    const state = run();
    sendLine(state);
    sendLine(state);
    toNag(state);
    for (let i = 0; i < 900; i++) step(state);
    expect(state.chat.filter((c) => c.nag === true)).toHaveLength(1);
    // The answer lands with the line, and the next check-in may come after it.
    sendLine(state);
    while (!state.over && state.beat !== 'code') sendLine(state);
    toNag(state);
    expect(state.chat.filter((c) => c.nag === true)).toHaveLength(2);
  });

  it('plans the level the same whether the check-ins are on or off', () => {
    const off: Patterns = {
      ...DEFAULT_PATTERNS,
      levels: { ...DEFAULT_PATTERNS.levels, nagEvery: { min: 1e9, max: 1e9 } },
    };
    for (const level of [2, 4, 6]) {
      const a = createRun({ levers: fast(), seed: 3, tier: 0, endless: false, levelIndex: level });
      const b = createRun({ levers: off, seed: 3, tier: 0, endless: false, levelIndex: level });
      expect(JSON.stringify(a.plan)).toBe(JSON.stringify(b.plan));
    }
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

  // The corpus is in the list on purpose: `withIntegration` rebuilds the
  // character trigram model over the seasoned corpus and every snippet's
  // value is read off that model, so the tapes on disk are an input to the
  // score and not only to the integration stack. Two runs are byte-identical
  // when the whole corpus is the same one, which is what this drives.
  it('gives a byte-identical state for the same corpus, levers, seed and input', () => {
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });

  it('gives a different run for a different seed', () => {
    // An endless level draws: every listed level pins its snippets by id after
    // the slice-3 authoring run except the two integration ones, so a listed
    // level's requests are the same at every seed on purpose.
    const a = createRun({ seed: 1, tier: 0, endless: true });
    const b = createRun({ seed: 2, tier: 0, endless: true });
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
    expect(agentNameOf(createRun({ seed: 4, tier: 0, endless: false }))).toBe('Sprocket');
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

  // The planner takes at most one level's worth and the buffer holds the
  // rest, so an unbounded push is a buffer an MCP client sitting in the
  // user's chair can grow without end over a long container session.
  it('stops taking requests once the buffer is a level ahead', () => {
    const state = createRun({ seed: 5, tier: 0, endless: true });
    const cap = DEFAULT_PATTERNS.levels.endless.requests * 2;
    for (let i = 0; i < 12; i++) feedRequests(state, seatFeed(5, 0, 1, 4));
    expect(suppliedCount(state)).toBe(cap);
    // And the level in hand is unaffected: dropping past the cap is a drop,
    // never a throw and never a stall.
    finishLevel(state);
    expect(state.over).toBe(false);
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

// The two levers slice 4's container tools pull that the pull path never
// needed: a product with no request behind it, and one line for the user to
// say at the next ship.
describe("the seat's product, on its own", () => {
  it('names the next endless level with nothing else fed', () => {
    const state = createRun({ seed: 5, tier: 0, endless: true });
    const drawn = endlessPeek({ set: DEFAULT_PATTERNS, seed: 5, tier: 0, levelIndex: 1 }).product;
    expect(feedProduct(state, 'a diary for houseplants')).toBe('set');
    expect(suppliedProductOf(state)).toBe('a diary for houseplants');
    expect(suppliedCount(state)).toBe(0);
    // The level in hand is fixed at level start and never moves (G26).
    expect(planOf(state).product).not.toBe('a diary for houseplants');
    finishLevel(state);
    expect(state.levelIndex).toBe(1);
    expect(planOf(state).product).toBe('a diary for houseplants');
    expect(planOf(state).product).not.toBe(drawn);
    // Every request of that level is still the corpus, drawn as it always
    // was: naming a product buys the name and nothing else.
    expect(planOf(state).requests.every((r) => !r.snippet.id.startsWith('seat-'))).toBe(true);
    expect(planOf(state).requests.every((r) => !r.ask.includes('{product}'))).toBe(true);
  });

  it('keeps the first name offered and drops the name once its level has been planned', () => {
    const state = createRun({ seed: 5, tier: 0, endless: true });
    expect(feedProduct(state, 'a diary for houseplants')).toBe('set');
    expect(feedProduct(state, 'a hat rental for crows')).toBe('already set');
    expect(feedProduct(state, '   ')).toBe('already set');
    finishLevel(state);
    expect(planOf(state).product).toBe('a diary for houseplants');
    expect(suppliedProductOf(state)).toBeNull();
    // Not every level after it: a name belongs to one level.
    finishLevel(state);
    expect(planOf(state).product).toBe(
      endlessPeek({ set: DEFAULT_PATTERNS, seed: 5, tier: 0, levelIndex: 2 }).product,
    );
  });

  it('changes nothing in a run that is never given one', () => {
    const plain = createRun({ seed: 9, tier: 0, endless: true });
    const bot = makeBot('perfect', 9);
    for (let i = 0; i < 60000 && !plain.over; i++) step(plain, bot(plain));
    const same = createRun({ seed: 9, tier: 0, endless: true });
    const bot2 = makeBot('perfect', 9);
    for (let i = 0; i < 60000 && !same.over; i++) {
      expect(suppliedProductOf(same)).toBeNull();
      step(same, bot2(same));
    }
    expect(JSON.stringify(same)).toBe(JSON.stringify(plain));
  });
});

describe("the seat's reaction", () => {
  /**
   * Ship one request and return the user's reaction to it. The span also
   * carries the next request's ask, because the step that advances a beat
   * says it, so the reaction is the first user line and not the last.
   */
  function shipAndHear(state: RunState): string {
    const before = state.chat.length;
    shipRequest(state);
    const said = state.chat.slice(before).filter((line) => line.who === 'user');
    return said.length > 0 ? said[0]!.line : '';
  }

  it('lands at the next ship in place of the authored reaction', () => {
    const seated = createRun({ seed: 5, tier: 0, endless: true });
    const plain = createRun({ seed: 5, tier: 0, endless: true });
    expect(feedReaction(seated, 'that is so much better than i asked for')).toBe('waiting');
    expect(reactionWaiting(seated)).toBe(true);
    expect(shipAndHear(seated)).toBe('that is so much better than i asked for');
    expect(reactionWaiting(seated)).toBe(false);
    const authored = shipAndHear(plain);
    expect(authored).not.toBe('that is so much better than i asked for');
    // One line, one ship: the next ship is the authored pool again, and the
    // seat's line is in the chat exactly once.
    expect(shipAndHear(seated)).not.toBe('that is so much better than i asked for');
    expect(
      seated.chat.filter((line) => line.line === 'that is so much better than i asked for'),
    ).toHaveLength(1);
  });

  it('takes the review at the deploy, and only one line waits at a time', () => {
    const state = createRun({ seed: 5, tier: 0, endless: true });
    const last = planOf(state).requests.length - 1;
    while (!state.over && state.requestIndex < last) shipRequest(state);
    expect(state.requestIndex).toBe(last);
    expect(feedReaction(state, 'it is everything i wanted and nothing i asked for')).toBe(
      'waiting',
    );
    expect(feedReaction(state, 'a second line before the ship')).toBe('dropped');
    expect(feedReaction(state, '   ')).toBe('dropped');
    const before = state.chat.length;
    shipRequest(state);
    const said = state.chat.slice(before).filter((line) => line.who === 'user');
    expect(said.map((line) => line.line)).toContain(
      'it is everything i wanted and nothing i asked for',
    );
    expect(said.map((line) => line.line)).not.toContain('a second line before the ship');
  });

  it('changes nothing at all in a run that is never given one', () => {
    const plain = createRun({ seed: 8, tier: 0, endless: true });
    const bot = makeBot('typist:40:0.03', 8);
    for (let i = 0; i < 90000 && !plain.over; i++) step(plain, bot(plain));
    const same = createRun({ seed: 8, tier: 0, endless: true });
    const bot2 = makeBot('typist:40:0.03', 8);
    for (let i = 0; i < 90000 && !same.over; i++) {
      expect(reactionWaiting(same)).toBe(false);
      step(same, bot2(same));
    }
    expect(JSON.stringify(same)).toBe(JSON.stringify(plain));
  });

  // A client reads the view, writes about the request in hand and sends it.
  // If that request ships before the call lands, the line used to be said
  // over the next request's piece — and on the last request it stood in as
  // the verdict on the whole product.
  it('is dropped when the ship that arrives is not the request it was written about', () => {
    const line = 'that is exactly the thing i meant';

    // A client that read the view at request zero, wrote about it, and had
    // the call land after request zero had already shipped. The line names
    // the request it is about, so the ship that arrives is not its ship.
    const late = createRun({ seed: 5, tier: 0, endless: true });
    const first = late.plan.requests[0]!.id;
    shipRequest(late);
    expect(late.requestIndex).toBe(1);
    expect(feedReaction(late, line, first)).toBe('waiting');
    const heard = shipAndHear(late);
    expect(heard).not.toBe(line);
    expect(heard).not.toBe('');
    expect(reactionWaiting(late)).toBe(false);
    expect(late.chat.some((c) => c.line === line)).toBe(false);

    // The same line, named for the request actually in hand, is said.
    const onTime = createRun({ seed: 5, tier: 0, endless: true });
    shipRequest(onTime);
    const inHand = onTime.plan.requests[onTime.requestIndex]!.id;
    expect(feedReaction(onTime, line, inHand)).toBe('waiting');
    expect(shipAndHear(onTime)).toBe(line);

    // And a caller that names no request keeps the old behaviour: the
    // request in hand when the call landed.
    const bare = createRun({ seed: 5, tier: 0, endless: true });
    expect(feedReaction(bare, line)).toBe('waiting');
    expect(shipAndHear(bare)).toBe(line);
  });

  it('is not on the state, so a fed run and an unfed one differ only in what was said', () => {
    const state = createRun({ seed: 5, tier: 0, endless: true });
    feedReaction(state, 'that is so much better than i asked for');
    // The slot lives beside the run, not in it: nothing a player could save
    // or replay carries a line that has not been said yet.
    expect(JSON.stringify(state)).not.toContain('so much better than i asked for');
  });
});

// ——— the boundaries of a step ————————————————————————————————————————————

describe('the step', () => {
  // Every numeric lever in this package is range-checked at load. The one
  // number that arrives per frame was not checked at all, and `clamp` maps
  // every non-finite value to empty by design — so a stray dt was turned
  // into a plausible-looking game over: the player and the transcript were
  // told the context ran out, which is a false statement about the run.
  it('refuses a dt that is not a finite positive number of seconds', () => {
    const state = createRun({ seed: 4, tier: 0, endless: false });
    const clock = state.clock;
    const context = state.context;
    for (const dt of [Number.NaN, Number.POSITIVE_INFINITY, -1, 0]) {
      expect(() => stepRun(state, {}, dt), String(dt)).toThrow('dt');
    }
    // A caller bug reads as a caller bug: the run is where it was, and the
    // bar was never told the context ran out.
    expect(state.clock).toBe(clock);
    expect(state.context).toBe(context);
    expect(state.over).toBe(false);
    expect(state.ended).toBeUndefined();
    expect(() => step(state)).not.toThrow();
  });

  // `built` grew one entry per request for as long as a client stayed
  // connected, and the stdio cabinet server serializes RunState for `view`
  // on a session with no natural end. The supplied buffer was capped for
  // exactly this reason; the preview is a window now, and the count is what
  // never falls off.
  it('keeps the preview a window and the count whole', () => {
    const state = createRun({ seed: 4, tier: 0, endless: false });
    const shipped = state.plan.requests[0]!.snippet.id;
    for (let i = 0; i < BUILT_CAP + 10; i++) state.built.push({ id: `old-${i}`, size: 1 });
    shipRequest(state);
    expect(state.built).toHaveLength(BUILT_CAP);
    expect(state.built.at(-1)!.id).toBe(shipped);
    expect(state.pieceCount).toBe(1);
  });

  // An endless level that cannot be planned — a stack with no corpus, an
  // integration stack with no tapes — used to be reported as a completed
  // run: `shipped`, identical to a listed level the player finished. The
  // ladder is endless by definition, so shipped is never a true thing to say
  // about it; the one honest reading is that the planner came up empty.
  it('names the planner coming up empty rather than calling the ladder shipped', () => {
    const bash = DEFAULT_CORPUS.byStack.bash!;
    const corpus: Corpus = { snippets: bash, byStack: { bash }, model: DEFAULT_CORPUS.model };
    // A seed whose first endless level is the stack this corpus has and whose
    // second is one it does not.
    let seed = -1;
    for (let s = 1; s < 400 && seed < 0; s++) {
      const set = DEFAULT_PATTERNS;
      const first = endlessPeek({ set, seed: s, tier: 0, levelIndex: 0 });
      const second = endlessPeek({ set, seed: s, tier: 0, levelIndex: 1 });
      if (first.stack === 'bash' && second.stack !== 'bash') seed = s;
    }
    expect(seed).toBeGreaterThan(0);
    const state = createRun({ seed, tier: 0, endless: true, corpus });
    for (let i = 0; i < 8 && !state.over; i++) shipRequest(state);
    expect(state.over).toBe(true);
    expect(state.ended).toBe('unplanned');
    expect(state.events.some((e) => e.kind === 'over' && e.how === 'unplanned')).toBe(true);
  });
});

// ——— the reaction the request carries ————————————————————————————————————

describe('the ship', () => {
  // `ship` called the picker with neither the product nor the level id, so a
  // reaction authored beside an ask could not have its `{product}` filled and
  // could not honour the `for` binding its ask already honours — the authoring
  // run would have been rewritten afterwards. Both go across now.
  it('lets the request answer itself, with the product filled', () => {
    const state = createRun({ seed: 4, tier: 0, endless: false });
    const request = state.plan.requests[0]!;
    expect(state.plan.requests.length).toBeGreaterThan(1);
    request.snippet = { ...request.snippet, reaction: 'that is exactly what {product} needed' };
    toShip(state);
    expect(state.chat.at(-1)).toMatchObject({
      who: 'user',
      line: `that is exactly what ${state.plan.product} needed`,
    });
  });

  it('drops a reaction written for another level and takes the pool instead', () => {
    const state = createRun({ seed: 4, tier: 0, endless: false });
    const request = state.plan.requests[0]!;
    request.snippet = {
      ...request.snippet,
      reaction: 'the ducks are all lined up now',
      for: 'some-other-level',
    };
    toShip(state);
    const said = state.chat.at(-1)!;
    expect(said.who).toBe('user');
    expect(said.line).not.toBe('the ducks are all lined up now');
    expect(DEFAULT_PATTERNS.user.reviews).toContain(said.line);
  });
});

// ——— what a line in hand costs, and what it does not ————————————————————

describe('sending a line', () => {
  // `clean` was `no errors and typed === target`, so an accidental Enter with
  // an untouched buffer — a stray press after the ship beat, a key repeat,
  // someone who thought the line was done — got the typo cue, a line from the
  // pool authored for mistypes, and the streak and the hype to zero. The
  // player recorded no error and the sim told them they had made one.
  it('does nothing at all on an enter with an untouched line', () => {
    const state = createRun({ seed: 4, tier: 0, endless: false });
    sendLine(state); // the reply, clean, so the streak stands at one
    expect(state.beat).toBe('code');
    const streak = state.streak;
    const hype = state.hype;
    const chat = state.chat.length;
    const target = state.target;
    step(state, { enter: true });
    expect(state.events).toEqual([]);
    expect(state.chat).toHaveLength(chat);
    expect(state.streak).toBe(streak);
    expect(state.hype).toBe(hype);
    expect(state.target).toBe(target);
    expect(state.typed).toBe('');
  });

  // A line that is correct so far and not finished was reported with the typo
  // word, so the player could not tell "you got a character wrong" from "you
  // are not finished" — and the buffer they had typed correctly was thrown
  // away for it.
  it('tells an unfinished line from a typo, and keeps what was typed', () => {
    const state = createRun({ seed: 4, tier: 0, endless: false });
    sendLine(state);
    const target = state.target;
    expect(target.length).toBeGreaterThan(2);
    const streak = state.streak;
    for (const ch of target.slice(0, target.length - 1)) step(state, { key: ch });
    const typed = state.typed;
    step(state, { enter: true });
    expect(state.events).toContainEqual({ kind: 'line', ok: false, why: 'unfinished' });
    expect(kinds(state.events)).not.toContain('hmm');
    expect(state.typed, 'the correct characters were thrown away').toBe(typed);
    expect(state.streak).toBe(streak);

    // And a genuine typo still says so, with its own word.
    step(state, { key: target.at(-1) === 'z' ? 'q' : 'z' });
    step(state, { enter: true });
    expect(state.events).toContainEqual({ kind: 'line', ok: false, why: 'typo' });
    expect(kinds(state.events)).toContain('hmm');
    expect(state.typed).toBe('');
  });

  // `typeKey` appended before it checked, and `expected` is undefined once the
  // buffer reaches the target, so every further key was appended and pushed
  // onto `errors` with no ceiling — a player leaning on a key grew both
  // without bound, and in hardcore each of those keys burned the bar.
  it('refuses a key past the end of the line, and still answers it', () => {
    const state = createRun({ seed: 4, tier: 0, endless: false });
    toTyping(state);
    const target = state.target;
    for (const ch of target) step(state, { key: ch });
    expect(state.typed).toBe(target);
    for (let i = 0; i < 40; i++) step(state, { key: 'z' });
    expect(state.typed).toBe(target);
    expect(state.errors).toEqual([]);
    // Refused, not silent: the shell has something to answer with.
    expect(state.events.some((e) => e.kind === 'key' && !e.ok)).toBe(true);
    // And the line still goes out clean, because nothing was wrong with it.
    step(state, { enter: true });
    expect(state.events).toContainEqual({ kind: 'line', ok: true });
  });

  // The only ways back from a line the player has made a mess of were N
  // backspaces at one per frame or an Enter that cost the streak.
  it('clears the line on demand with no hmm and no cost', () => {
    const state = createRun({ seed: 4, tier: 0, endless: false });
    sendLine(state);
    const target = state.target;
    const chat = state.chat.length;
    step(state, { key: target[0] === 'z' ? 'q' : 'z' });
    step(state, { key: 'z' });
    expect(state.errors.length).toBeGreaterThan(0);
    const streak = state.streak;
    step(state, { clear: true });
    expect(state.typed).toBe('');
    expect(state.errors).toEqual([]);
    expect(state.target).toBe(target);
    expect(state.chat).toHaveLength(chat);
    expect(state.events.some((e) => e.kind === 'line' || e.kind === 'hmm')).toBe(false);
    // The streak was already lost to the mistyped character; the clearing
    // itself takes nothing at all.
    expect(state.streak).toBe(streak);
  });
});

// ——— what the chat carries ————————————————————————————————————————————

describe('the chat', () => {
  // `ChatLine` carried one marker and no others, so a verdict on the whole
  // product, a reaction to one piece, an agent's typo line and a meeting
  // aside all read as "agent, text" to the transcript, to the container's
  // view and to an assistive reader.
  it('marks every line with the beat that said it, in a total order', () => {
    const state = createRun({ seed: 4, tier: 0, endless: false });
    for (let i = 0; i < state.plan.requests.length; i++) shipRequest(state);
    expect(state.chat.length).toBeGreaterThan(4);
    const seen = new Set<string>();
    state.chat.forEach((line, i) => {
      expect(typeof line.kind, `line ${i}`).toBe('string');
      expect(line.kind, `line ${i}`).not.toBe('');
      seen.add(line.kind);
    });
    expect([...seen]).toContain('ask');
    expect([...seen]).toContain('reply');
    expect([...seen]).toContain('ship');
    expect([...seen]).toContain('review');
    // The order is total and never reused, which `at` — a clock reading —
    // cannot be: a ship frame says four lines on one reading.
    const seqs = state.chat.map((line) => line.seq);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(new Set(seqs).size).toBe(seqs.length);
    expect(state.chatCount).toBe(state.chat.length);
  });

  // Five lines used to land across two frames with the same timestamp and no
  // ordering hint, and `at` is the only pacing information the sim handed out.
  it('paces the lines it says so a reader can keep up', () => {
    const gap = DEFAULT_PATTERNS.levels.pace.chatGap;
    const state = createRun({ seed: 4, tier: 0, endless: false });
    for (let i = 0; i < state.plan.requests.length; i++) shipRequest(state);
    for (let i = 1; i < state.chat.length; i++) {
      const prev = state.chat[i - 1]!;
      const line = state.chat[i]!;
      expect(line.dueAt, `line ${i} lands on top of the one before it`).toBeGreaterThanOrEqual(
        prev.dueAt + gap - 1e-9,
      );
      // A line is never revealed before it was said.
      expect(line.dueAt).toBeGreaterThanOrEqual(line.at - 1e-9);
    }
  });

  // `built` was capped and the seat buffer was capped, both with comments
  // naming the day-long container session as the reason. The array that grows
  // fastest had no cap at all.
  it('keeps a window and not a history, and counts what falls off', () => {
    const state = createRun({ seed: 4, tier: 0, endless: false });
    const said = state.chatCount;
    for (let i = 0; i < CHAT_CAP + 20; i++) {
      state.chat.push({ who: 'agent', line: 'x', at: 0, kind: 'ship', seq: -1, dueAt: 0 });
    }
    shipRequest(state);
    expect(state.chat.length).toBeLessThanOrEqual(CHAT_CAP);
    expect(state.chatCount).toBeGreaterThan(said);
    // The newest line is still the newest line after the trim.
    expect(state.chat.at(-1)!.seq).toBe(state.chatCount - 1);
  });
});

// ——— the check-in, settled rather than dropped ————————————————————————

describe('the check-in debt', () => {
  function fastNags(): Patterns {
    return {
      ...DEFAULT_PATTERNS,
      levels: { ...DEFAULT_PATTERNS.levels, nagEvery: { min: 0.5, max: 0.5 } },
    };
  }

  // `maybeNag` runs before the frame's input is read, so a clean Enter on
  // that frame found the flag it had just set and answered it. A question
  // and its answer with no elapsed time between them is not an interruption.
  it('never answers a check-in on the frame it was asked', () => {
    const state = createRun({
      levers: fastNags(),
      seed: 1,
      tier: 0,
      endless: false,
      levelIndex: 1,
    });
    sendLine(state);
    sendLine(state);
    let guard = 0;
    let answers = 0;
    while (!state.over && guard < 6000 && answers < 2) {
      guard += 1;
      const before = state.chat.length;
      // Type the line out, then press Enter on every frame from there: one of
      // those Enters lands on the frame a check-in is raised.
      if (typeable(state) && state.typed.length < state.target.length) {
        step(state, { key: state.target[state.typed.length]! });
      } else if (typeable(state)) {
        step(state, { enter: true });
      } else {
        step(state);
      }
      const said = state.chat.slice(before);
      const asked = said.some((line) => line.nag === true);
      const answered = said.some((line) => line.kind === 'nagReply');
      expect(asked && answered, 'asked and answered on one frame').toBe(false);
      if (answered) answers += 1;
    }
    expect(answers, 'no check-in was ever answered').toBeGreaterThan(0);
  });

  // `startNagClock` cleared the flag outright for every new endless level and
  // a listed run just ended, so a check-in that landed late in a level — the
  // common case — sat in the chat forever with no reply from an agent whose
  // whole character is that it answers everything.
  it('settles an owed check-in rather than dropping it at the end', () => {
    const state = createRun({
      levers: fastNags(),
      seed: 1,
      tier: 0,
      endless: false,
      levelIndex: 1,
    });
    for (let i = 0; i < state.plan.requests.length; i++) shipRequest(state);
    expect(state.over).toBe(true);
    const asked = state.chat.filter((line) => line.nag === true).length;
    const answered = state.chat.filter((line) => line.kind === 'nagReply').length;
    expect(asked).toBeGreaterThan(0);
    expect(answered, 'a question was left in the chat with no answer').toBe(asked);
  });
});

// ——— the weak pairs the browser hands back ————————————————————————————

describe('the weak pairs', () => {
  // The one number in this package that comes back from the player's own
  // browser, and it was neither validated, bounded nor decayed. A single
  // non-finite count made every planner weight NaN, `weightedPick` then
  // returns index zero for every request, and a level's seeded variety
  // collapsed with no event, no flag and no word.
  it('takes only what it can use, and bounds what it takes', () => {
    const dirty = {
      ab: 3,
      c: 9,
      toolong: 2,
      de: Number.NaN,
      fg: Number.POSITIVE_INFINITY,
      hi: -4,
      jk: 0,
      lm: 1e9,
    } as unknown as Record<string, number>;
    const clean = cleanWeak(dirty);
    expect(Object.keys(clean).sort()).toEqual(['ab', 'lm']);
    expect(clean.ab).toBe(3);
    expect(clean.lm).toBe(WEAK_PER_PAIR);
    for (const n of Object.values(clean)) expect(Number.isFinite(n)).toBe(true);

    const many: Record<string, number> = {};
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    for (const a of alphabet) for (const b of alphabet) many[`${a}${b}`] = 2;
    expect(Object.keys(cleanWeak(many)).length).toBeLessThanOrEqual(WEAK_PAIRS);

    // And a run built from a spoiled map plans a level rather than collapsing
    // onto the pool's first snippet for every request.
    const state = createRun({ seed: 3, tier: 0, endless: true, weakBigrams: dirty });
    for (const n of Object.values(state.weakBigrams)) expect(Number.isFinite(n)).toBe(true);
    expect(new Set(state.plan.requests.map((r) => r.snippet.id)).size).toBe(
      state.plan.requests.length,
    );
  });

  // Nothing anywhere decremented these, so a pair fumbled early was weighted
  // for the rest of the run and for every run after it.
  it('forgives a pair on a line typed clean', () => {
    const state = createRun({ seed: 4, tier: 0, endless: false });
    toTyping(state);
    const target = state.target;
    const pair = target.slice(0, 2);
    expect(pair.length).toBe(2);
    state.weakBigrams = { [pair]: 4 };
    sendLine(state);
    expect(state.weakBigrams[pair]).toBe(3);
  });

  // A pair only gets so weak, however long the run.
  it('never lets one pair pass its own ceiling', () => {
    const state = createRun({ seed: 4, tier: 0, endless: false });
    const bot = makeBot('typist:60:0.25', 4);
    for (let i = 0; i < 40000 && !state.over; i++) step(state, bot(state));
    for (const [key, n] of Object.entries(state.weakBigrams)) {
      expect(key.length, key).toBe(2);
      expect(n, key).toBeLessThanOrEqual(WEAK_PER_PAIR);
    }
    expect(Object.keys(state.weakBigrams).length).toBeLessThanOrEqual(WEAK_PAIRS);
  });
});

// ——— what the container tools are told ————————————————————————————————

describe('what a fed call answers', () => {
  // `feedRequests` dropped past the cap in silence and returned void, while
  // both of its siblings answer with a word.
  it('says how many requests were taken and how many were dropped', () => {
    const state = createRun({ seed: 5, tier: 0, endless: true });
    const cap = DEFAULT_PATTERNS.levels.endless.requests * 2;
    const feed = seatFeed(5, 0, 1, 4);
    expect(feed.length).toBe(4);
    expect(feedRequests(state, [])).toEqual({ taken: 0, dropped: 0 });
    let taken = 0;
    let dropped = 0;
    for (let i = 0; i < 4; i++) {
      const answer = feedRequests(state, feed);
      taken += answer.taken;
      dropped += answer.dropped;
    }
    expect(taken).toBe(cap);
    expect(dropped).toBe(16 - cap);
    expect(suppliedCount(state)).toBe(cap);
  });

  // `feedProduct` collapsed three outcomes into 'already set', so a client
  // that sent a blank product was told the name was already taken.
  it('says a blank product is blank and not taken', () => {
    const state = createRun({ seed: 5, tier: 0, endless: true });
    expect(feedProduct(state, '   ')).toBe('empty');
    expect(feedProduct(state, '')).toBe('empty');
    expect(suppliedProductOf(state)).toBeNull();
    expect(feedProduct(state, 'a diary for houseplants')).toBe('set');
    expect(feedProduct(state, 'a hat rental for crows')).toBe('already set');
  });
});

// ——— the halt names the right file ————————————————————————————————————

describe('a level with nothing to plan from', () => {
  // Levels nine and sixteen pin no snippets by design, so with no tapes on
  // disk `candidates` comes back empty and the halt blamed levels.json — the
  // one file that is correct. `play.ts` guarded only `--stack integration`.
  it('names the missing tapes rather than the lever file', () => {
    const bash = DEFAULT_CORPUS.byStack.bash!;
    const corpus: Corpus = { snippets: bash, byStack: { bash }, model: DEFAULT_CORPUS.model };
    const integrationLevel = DEFAULT_PATTERNS.levels.levels.findIndex(
      (def) => def.stack === 'integration',
    );
    expect(integrationLevel).toBeGreaterThan(-1);
    expect(() =>
      createRun({ seed: 4, tier: 0, endless: false, corpus, levelIndex: integrationLevel }),
    ).toThrow(`no integration snippets for levels.${integrationLevel}`);
    // A level index that is not in the file is still a lever fault.
    expect(() => createRun({ seed: 4, tier: 0, endless: false, levelIndex: 99 })).toThrow(
      'patterns/levels.json: levels.99',
    );
  });
});
