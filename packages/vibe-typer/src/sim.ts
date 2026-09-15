// The only stateful module. One keystroke per step, a fixed dt, and every
// random draw comes from the seed: same levers, same seed, same tier, same
// endless flag, same weak pairs, same stack and the same input stream give a
// byte-identical RunState (a test asserts it).
//
// The beats run request -> reply -> code -> (creep) -> ship. `request`,
// `creep` and `ship` are transitional: each holds for exactly one step and
// swallows that step's input, which is what keeps a creep from being appended
// silently inside a line the player is already transcribing (Q4.1).
//
// Nothing yells (G25). A mistyped character is recorded and waits for a
// backspace. A line sent with an error returns the agent's own "hmm", resets
// that line, and costs nothing else. An empty bar inside a listed level is a
// compaction, not a loss; only endless and hardcore end on it.

import { codeLines, DEFAULT_CORPUS, withIntegration, type Corpus } from './corpus';
import { drain, isNearMiss, rateAt, refill, spend, burn, FULL } from './context';
import { LinePicker } from './lines';
import { DEFAULT_PATTERNS, tierContext, type Patterns } from './patterns';
import { planLevel } from './level';
import { copilotReady, hypeFor, milestoneCrossed, pay, pitchFor } from './score';
import { mixSeed } from './seed';
import type { Event, LevelPlan, RunInput, RunState, Snippet, Stack, Tier } from './types';

export interface CreateRunOpts {
  levers?: Patterns;
  /** The corpus to plan from; the default one plus whatever the tapes season in. */
  corpus?: Corpus;
  /** Integration snippets built from tape headers and rows (G30). */
  integration?: readonly Snippet[];
  seed: number;
  tier: Tier;
  endless: boolean;
  weakBigrams?: Record<string, number>;
  stack?: Stack;
  agentName?: string;
  /** Dated jokes, off by default (Q5.7). */
  dated?: boolean;
  /** Which listed level to play. Ignored in endless, which has its own ladder. */
  levelIndex?: number;
}

interface RunContext {
  set: Patterns;
  corpus: Corpus;
  picker: LinePicker;
  opts: CreateRunOpts;
  /** The current request's code lines, creep included once it has landed. */
  lines: string[];
  agentName: string;
  levelOffset: number;
}

const runs = new WeakMap<RunState, RunContext>();

/** The agent's name on this run; a rename is one string in cabinet.json. */
export function agentNameOf(state: RunState): string {
  return runs.get(state)?.agentName ?? '';
}

/** The current request's code lines, in typing order. The shell draws these. */
export function codeOf(state: RunState): string[] {
  return runs.get(state)?.lines ?? [];
}

/** The levers this run was built with. */
export function leversOf(state: RunState): Patterns {
  return runs.get(state)?.set ?? DEFAULT_PATTERNS;
}

function push(state: RunState, event: Event): void {
  state.events.push(event);
}

function say(state: RunState, who: 'user' | 'agent', line: string): void {
  state.chat.push({ who, line, at: state.clock });
  push(state, { kind: 'message', who });
}

export function createRun(opts: CreateRunOpts): RunState {
  const set = opts.levers ?? DEFAULT_PATTERNS;
  const base = opts.corpus ?? DEFAULT_CORPUS;
  const corpus = opts.integration ? withIntegration(base, opts.integration) : base;
  const tier = opts.tier;
  const picker = new LinePicker(set, {
    seed: opts.seed,
    tier,
    ...(opts.dated === true ? { dated: true } : {}),
  });
  const levelOffset = opts.endless ? 0 : (opts.levelIndex ?? 0);
  const weakBigrams = { ...(opts.weakBigrams ?? {}) };
  picker.startLevel(levelOffset);
  const used = new Set<string>();
  const plan = planLevel({
    set,
    corpus,
    picker,
    levelIndex: levelOffset,
    seed: opts.seed,
    tier,
    endless: opts.endless,
    weakBigrams,
    used,
    ...(opts.stack ? { stack: opts.stack } : {}),
  });
  if (!plan) throw new Error(`patterns/levels.json: levels.${levelOffset}`);
  const state: RunState = {
    plan,
    endless: opts.endless,
    levelIndex: levelOffset,
    requestIndex: 0,
    beat: 'request',
    target: '',
    typed: '',
    lineIndex: 0,
    errors: [],
    context: FULL,
    valuation: 0,
    hype: 1,
    streak: 0,
    copilot: null,
    built: [],
    chat: [],
    clock: 0,
    over: false,
    events: [],
    discountShare: 0,
    creepPending: false,
    used: [...used],
    weakBigrams,
    milestones: [],
  };
  runs.set(state, {
    set,
    corpus,
    picker,
    opts,
    lines: [],
    agentName: opts.agentName ?? set.cabinet.agentName,
    levelOffset,
  });
  enterRequest(state);
  return state;
}

/** The user's ask lands, the bar pays for it, and the reply becomes the target. */
function enterRequest(state: RunState): void {
  const ctx = runs.get(state)!;
  const request = state.plan.requests[state.requestIndex]!;
  ctx.lines = codeLines(request.snippet);
  state.beat = 'request';
  state.target = '';
  state.typed = '';
  state.errors = [];
  state.lineIndex = 0;
  state.discountShare = 0;
  state.creepPending = request.creep !== undefined;
  say(state, 'user', request.ask);
  state.context = spend(state.context, state.plan.messageCost);
}

/** An empty bar: a compaction inside a listed level, the end anywhere else. */
function empty(state: RunState): void {
  const ctx = runs.get(state)!;
  if (state.endless || state.plan.tier === 3) {
    state.over = true;
    state.ended = 'context';
    push(state, { kind: 'over', how: 'context' });
    return;
  }
  push(state, { kind: 'compaction' });
  say(state, 'agent', ctx.picker.compaction());
  state.hype = 1;
  state.streak = 0;
  state.context = FULL;
}

function noteWeak(state: RunState, expected: string | undefined): void {
  if (expected === undefined) return;
  const prev = state.typed.length >= 2 ? state.typed[state.typed.length - 2]! : '';
  const pair = `${prev}${expected}`;
  if (pair.length !== 2) return;
  state.weakBigrams[pair] = (state.weakBigrams[pair] ?? 0) + 1;
}

function setStreak(state: RunState, streak: number): void {
  const ctx = runs.get(state)!;
  state.streak = streak;
  state.hype = hypeFor(streak, ctx.set.score, state.plan.tier);
  if (
    streak > 0 &&
    state.copilot === null &&
    copilotReady(streak, state.plan.tier, ctx.set.score)
  ) {
    state.copilot = { until: state.clock + ctx.set.score.copilotSeconds, used: false };
    push(state, { kind: 'copilot', on: true });
  }
}

function startLine(state: RunState, target: string): void {
  state.target = target;
  state.typed = '';
  state.errors = [];
}

/** The last line is in: pay the request, pop a piece, refill, let the user react. */
function ship(state: RunState): void {
  const ctx = runs.get(state)!;
  const request = state.plan.requests[state.requestIndex]!;
  const last = state.requestIndex === state.plan.requests.length - 1;
  const discount = ctx.set.score.copilotDiscount;
  const share = Math.min(1, Math.max(0, state.discountShare));
  const piece = request.value * (1 - share * (1 - discount));
  const bonus = last ? state.plan.shipBonus : 0;
  const nearMiss = isNearMiss(state.context);
  const before = state.valuation;
  state.valuation = pay(before, piece + bonus, state.hype, state.plan.tier, ctx.set.score);
  // The last piece carries the deploy bonus too, so the preview grows by
  // exactly what the score counts (G24; the review's first change).
  state.built.push({ id: request.snippet.id, size: piece + bonus });
  push(state, { kind: 'piece', size: piece + bonus });
  if (last) push(state, { kind: 'ship', nearMiss });
  state.context = refill(state.context, state.plan.refillShare);
  for (const milestone of milestoneCrossed(before, state.valuation, ctx.set.score)) {
    if (state.milestones.includes(milestone.name)) continue;
    state.milestones.push(milestone.name);
    push(state, { kind: 'milestone', name: milestone.name });
  }
  say(state, 'agent', ctx.picker.ship());
  say(state, 'user', last ? ctx.picker.review() : ctx.picker.reaction());
  setStreak(state, state.streak + 1);
  state.beat = 'ship';
}

/** After the ship frame: the next request, the next level, or the end. */
function advance(state: RunState): void {
  const ctx = runs.get(state)!;
  if (state.requestIndex < state.plan.requests.length - 1) {
    state.requestIndex += 1;
    enterRequest(state);
    return;
  }
  if (!state.endless) {
    state.over = true;
    state.ended = 'shipped';
    push(state, { kind: 'over', how: 'shipped' });
    return;
  }
  const levelIndex = state.levelIndex + 1;
  const used = new Set(state.used);
  ctx.picker.startLevel(levelIndex);
  const plan = planLevel({
    set: ctx.set,
    corpus: ctx.corpus,
    picker: ctx.picker,
    levelIndex,
    seed: ctx.opts.seed,
    tier: state.plan.tier,
    endless: true,
    weakBigrams: state.weakBigrams,
    used,
    ...(ctx.opts.stack ? { stack: ctx.opts.stack } : {}),
  });
  if (!plan) {
    state.over = true;
    state.ended = 'shipped';
    push(state, { kind: 'over', how: 'shipped' });
    return;
  }
  state.plan = plan;
  state.levelIndex = levelIndex;
  state.requestIndex = 0;
  state.used = [...used];
  enterRequest(state);
}

/** The creep frame is over: one more line, now typeable. */
function landCreep(state: RunState): void {
  const ctx = runs.get(state)!;
  const request = state.plan.requests[state.requestIndex]!;
  const creep = request.creep;
  state.creepPending = false;
  if (!creep) {
    ship(state);
    return;
  }
  ctx.lines = [...ctx.lines, creep.line];
  state.lineIndex = ctx.lines.length - 1;
  state.beat = 'code';
  startLine(state, creep.line);
}

function sendLine(state: RunState): void {
  const ctx = runs.get(state)!;
  const request = state.plan.requests[state.requestIndex]!;
  const clean = state.errors.length === 0 && state.typed === state.target;
  if (!clean) {
    push(state, { kind: 'line', ok: false });
    push(state, { kind: 'hmm' });
    say(state, 'agent', ctx.picker.hmm());
    setStreak(state, 0);
    state.typed = '';
    state.errors = [];
    return;
  }
  push(state, { kind: 'line', ok: true });
  setStreak(state, state.streak + 1);
  if (state.beat === 'reply') {
    say(state, 'agent', request.reply);
    state.beat = 'code';
    state.lineIndex = 0;
    startLine(state, ctx.lines[0] ?? '');
    return;
  }
  if (state.lineIndex < ctx.lines.length - 1) {
    state.lineIndex += 1;
    startLine(state, ctx.lines[state.lineIndex]!);
    return;
  }
  if (state.creepPending && request.creep) {
    state.beat = 'creep';
    push(state, { kind: 'creep' });
    say(state, 'user', request.creep.ask);
    state.context = spend(state.context, state.plan.messageCost);
    return;
  }
  ship(state);
}

/** Copilot takes the rest of the line; the request pays less for it. */
function takeCopilot(state: RunState): void {
  const ctx = runs.get(state)!;
  if (!state.copilot || state.copilot.used) return;
  if (state.beat === 'code') {
    const total = ctx.lines.reduce((n, line) => n + line.length, 0);
    if (total > 0) state.discountShare += state.target.length / total;
  }
  state.typed = state.target;
  state.errors = [];
  state.copilot = null;
  push(state, { kind: 'copilot', on: false });
}

function typeKey(state: RunState, key: string): void {
  const ctx = runs.get(state)!;
  const expected = state.target[state.typed.length];
  const ok = expected !== undefined && key === expected;
  state.typed += key;
  if (!ok) {
    state.errors.push(state.typed.length - 1);
    noteWeak(state, expected);
    setStreak(state, 0);
    if (state.plan.tier === 3) {
      state.context = burn(state.context, tierContext(ctx.set, 3).hardcoreBurnPerError);
    }
  }
  push(state, { kind: 'key', ok, pitch: pitchFor(state.streak) });
}

function backspace(state: RunState): void {
  if (state.typed.length === 0) return;
  const at = state.typed.length - 1;
  state.typed = state.typed.slice(0, at);
  state.errors = state.errors.filter((i) => i !== at);
}

/**
 * One step. `dt` is seconds; the shell and the bots both run a fixed frame.
 * Events are cleared at the top, so what the shell drains is this step's.
 */
export function stepRun(state: RunState, input: RunInput, dt: number): RunState {
  state.events.length = 0;
  if (state.over) return state;
  state.clock += dt;
  state.context = drain(state.context, rateAt(state.plan, state.requestIndex), dt);
  if (state.copilot && state.clock >= state.copilot.until) {
    state.copilot = null;
    push(state, { kind: 'copilot', on: false });
  }
  if (state.context <= 0) {
    empty(state);
    if (state.over) return state;
  }
  if (state.beat === 'request') {
    const request = state.plan.requests[state.requestIndex]!;
    state.beat = 'reply';
    startLine(state, request.reply);
    return state;
  }
  if (state.beat === 'creep') {
    landCreep(state);
    return state;
  }
  if (state.beat === 'ship') {
    advance(state);
    return state;
  }
  if (input.tab) {
    takeCopilot(state);
    return state;
  }
  if (input.backspace) {
    backspace(state);
    return state;
  }
  if (input.enter) {
    sendLine(state);
    return state;
  }
  if (typeof input.key === 'string' && input.key.length === 1) {
    typeKey(state, input.key);
  }
  return state;
}

/** The plan of the level in hand. The shell renders the product from it. */
export function planOf(state: RunState): LevelPlan {
  return state.plan;
}

/** A fresh seed for the next run of the same browser; never the clock. */
export function nextSeed(seed: number, runs_: number): number {
  return mixSeed(seed, runs_);
}
