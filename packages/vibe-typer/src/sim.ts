// The only stateful module. One keystroke per step, a fixed dt, and every
// random draw comes from the seed: same levers, same seed, same tier, same
// endless flag, same weak pairs, same stack and the same input stream give a
// byte-identical RunState (a test asserts it).
//
// The beats run request -> reply -> code -> (creep) -> ship, with a quick
// sync between two requests on the levels that drew one: three short lines
// of meeting chatter the player types, which cost the bar nothing, pay
// nothing and leave the streak where it stands (slice 2). `request`,
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
import { mixSeed, seededRandom } from './seed';
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
  /** The quick sync in hand: its three lines and how far the player is through them. */
  syncLines: string[];
  syncIndex: number;
  /** One sync a level, spent or not. */
  syncDone: boolean;
  /**
   * The nag clock. Its own generator, salted off the level seed, so a level
   * plans the same snippets, creeps and meeting whether nags are on or off.
   */
  nagRng: () => number;
  /** Frame time the next check-in is due at. */
  nextNagAt: number;
  /** A check-in is waiting for the agent's answer; a second one does not land. */
  nagReplyPending: boolean;
  /**
   * Requests a seated model wrote and the code gate accepted, waiting for
   * the next endless level to take them (G28 as slice 3 amends it). The
   * shell fills this while the current request is typed and the planner
   * splices off what it needs; an empty buffer is a run with no seat, and
   * that run is byte for byte the run this cabinet has always played.
   */
  supplied: Snippet[];
  /** The product the seat named for the level its buffer is filling, or null. */
  suppliedProduct: string | null;
}

/** Lines in a quick sync. Three is a meeting; more is a level. */
const SYNC_LINES = 3;

/**
 * The salt that keeps the nag clock off the planner's generator (slice 3).
 * The level seed fans out through mixSeed, so the check-ins are replayable
 * and the plan is byte-identical with the nag lever at any value.
 */
export const NAG_SALT = 0x9a9;

const runs = new WeakMap<RunState, RunContext>();

/** The agent's name on this run; a rename is one string in cabinet.json. */
export function agentNameOf(state: RunState): string {
  return runs.get(state)?.agentName ?? '';
}

/** The current request's code lines, in typing order. The shell draws these. */
export function codeOf(state: RunState): string[] {
  return runs.get(state)?.lines ?? [];
}

/** The quick sync in hand, in typing order. Empty outside the sync beat. */
export function syncOf(state: RunState): string[] {
  const ctx = runs.get(state);
  return ctx && state.beat === 'sync' ? ctx.syncLines : [];
}

/** The levers this run was built with. */
export function leversOf(state: RunState): Patterns {
  return runs.get(state)?.set ?? DEFAULT_PATTERNS;
}

/** The corpus this run plans from, tapes and all. The code gate values against it. */
export function corpusOf(state: RunState): Corpus {
  return runs.get(state)?.corpus ?? DEFAULT_CORPUS;
}

/**
 * Hand the run gated requests for the next endless level (G28 amended).
 * They are appended in order and taken in order. This never blocks, never
 * throws and never touches the level in hand: a late answer arriving at
 * any moment is either used by the next level or, if the buffer is already
 * full, simply queued behind what is there (G11, G13).
 *
 * `product` is the name the seat gave the level it is filling for; the
 * first one offered for a buffer wins, and the planner drops it once the
 * level has taken its requests.
 */
export function feedRequests(state: RunState, items: readonly Snippet[], product?: string): void {
  const ctx = runs.get(state);
  if (!ctx || items.length === 0) return;
  ctx.supplied.push(...items);
  if (product !== undefined && product !== '' && ctx.suppliedProduct === null) {
    ctx.suppliedProduct = product;
  }
}

/** How many gated requests are waiting. The shell's prefetch bookkeeping. */
export function suppliedCount(state: RunState): number {
  return runs.get(state)?.supplied.length ?? 0;
}

/**
 * The asks already in the buffer. The shell shows these to the seat along
 * with the chat's own, so a seat filling four slots for one level does not
 * write the same request four times: those asks have not been said yet and
 * so are nowhere in `state.chat` to be found.
 */
export function suppliedAsks(state: RunState): string[] {
  const ctx = runs.get(state);
  if (!ctx) return [];
  return ctx.supplied.map((s) => s.ask ?? '').filter((ask) => ask !== '');
}

function push(state: RunState, event: Event): void {
  state.events.push(event);
}

function say(state: RunState, who: 'user' | 'agent', line: string, nag = false): void {
  state.chat.push({ who, line, at: state.clock, ...(nag ? { nag: true as const } : {}) });
  push(state, { kind: 'message', who, ...(nag ? { nag: true as const } : {}) });
}

/** The next check-in is due this many seconds of frame time from now. */
function armNag(state: RunState, ctx: RunContext): void {
  const { min, max } = ctx.set.levels.nagEvery;
  ctx.nextNagAt = state.clock + min + ctx.nagRng() * (max - min);
}

/** A new level, a new nag clock, and nothing owed from the level before. */
function startNagClock(state: RunState, ctx: RunContext): void {
  ctx.nagRng = seededRandom(mixSeed(state.plan.seed, NAG_SALT));
  ctx.nagReplyPending = false;
  armNag(state, ctx);
}

/**
 * The user checks in while you type. It lands on a code beat only, never in
 * the run's very first line, and never while an earlier check-in is still
 * waiting for its answer. When the moment is wrong the check-in waits; it
 * does not skip. It costs the bar nothing, pays nothing, builds nothing and
 * leaves the streak exactly where it stands — the comedy, and no more.
 */
function maybeNag(state: RunState): void {
  const ctx = runs.get(state)!;
  if (state.clock < ctx.nextNagAt) return;
  if (state.beat !== 'code' || ctx.nagReplyPending) return;
  const first =
    state.levelIndex === ctx.levelOffset && state.requestIndex === 0 && state.lineIndex === 0;
  if (first) return;
  say(state, 'user', ctx.picker.nag(), true);
  ctx.nagReplyPending = true;
  armNag(state, ctx);
}

export function createRun(opts: CreateRunOpts): RunState {
  const set = opts.levers ?? DEFAULT_PATTERNS;
  const base = opts.corpus ?? DEFAULT_CORPUS;
  const corpus = opts.integration ? withIntegration(base, opts.integration) : base;
  const tier = opts.tier;
  const picker = new LinePicker(set, {
    seed: opts.seed,
    tier,
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
  const ctx: RunContext = {
    set,
    corpus,
    picker,
    opts,
    lines: [],
    agentName: opts.agentName ?? set.cabinet.agentName,
    levelOffset,
    syncLines: [],
    syncIndex: 0,
    syncDone: false,
    nagRng: () => 0,
    nextNagAt: 0,
    nagReplyPending: false,
    supplied: [],
    suppliedProduct: null,
  };
  runs.set(state, ctx);
  startNagClock(state, ctx);
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
  say(
    state,
    'user',
    last ? ctx.picker.review(state.plan.id) : ctx.picker.reaction(request.snippet),
  );
  setStreak(state, state.streak + 1);
  state.beat = 'ship';
}

/**
 * The meeting: three short lines, no cost, no pay, the streak left standing.
 * It sits in front of a request the planner picked, never the first one.
 */
function enterSync(state: RunState): void {
  const ctx = runs.get(state)!;
  ctx.syncLines = Array.from({ length: SYNC_LINES }, () => ctx.picker.sync());
  ctx.syncIndex = 0;
  ctx.syncDone = true;
  state.beat = 'sync';
  state.lineIndex = 0;
  push(state, { kind: 'sync', on: true });
  startLine(state, ctx.syncLines[0] ?? '');
}

/** After the ship frame: the sync, the next request, the next level, or the end. */
function advance(state: RunState): void {
  const ctx = runs.get(state)!;
  if (state.requestIndex < state.plan.requests.length - 1) {
    state.requestIndex += 1;
    if (state.plan.syncAt === state.requestIndex && !ctx.syncDone) {
      enterSync(state);
      return;
    }
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
  // The seat's buffer, if a seat is sitting. `planLevel` splices off what
  // it takes, so an empty buffer costs one property read and changes
  // nothing: every draw below is the draw it always was.
  const before = ctx.supplied.length;
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
    supplied: ctx.supplied,
    ...(ctx.suppliedProduct !== null ? { product: ctx.suppliedProduct } : {}),
    ...(ctx.opts.stack ? { stack: ctx.opts.stack } : {}),
  });
  if (ctx.supplied.length !== before) ctx.suppliedProduct = null;
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
  startNagClock(state, ctx);
  ctx.syncDone = false;
  ctx.syncLines = [];
  ctx.syncIndex = 0;
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

/**
 * A sync line sent. Clean, the player said it and the meeting moves on; not
 * clean, the agent's own "hmm" and the line resets. Either way the streak is
 * where it was: a breather neither builds a run nor breaks one.
 */
function sendSyncLine(state: RunState): void {
  const ctx = runs.get(state)!;
  const clean = state.errors.length === 0 && state.typed === state.target;
  if (!clean) {
    push(state, { kind: 'line', ok: false });
    push(state, { kind: 'hmm' });
    say(state, 'agent', ctx.picker.hmm());
    state.typed = '';
    state.errors = [];
    return;
  }
  push(state, { kind: 'line', ok: true });
  say(state, 'agent', state.target);
  ctx.syncIndex += 1;
  if (ctx.syncIndex >= ctx.syncLines.length) {
    push(state, { kind: 'sync', on: false });
    enterRequest(state);
    return;
  }
  state.lineIndex = ctx.syncIndex;
  startLine(state, ctx.syncLines[ctx.syncIndex] ?? '');
}

function sendLine(state: RunState): void {
  const ctx = runs.get(state)!;
  if (state.beat === 'sync') {
    sendSyncLine(state);
    return;
  }
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
  // A check-in is answered once the line in hand is out clean, so the answer
  // never lands inside what the player is transcribing. A line sent wrong
  // keeps it owed; a ship on this line says the answer before the ship line.
  if (state.beat === 'code' && ctx.nagReplyPending) {
    ctx.nagReplyPending = false;
    say(state, 'agent', ctx.picker.nagReply());
  }
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
  // A quick sync is a breather: the meeting costs the bar nothing at all, so
  // the bar holds still for it (slice 2). The clock runs; only the drain stops.
  if (state.beat !== 'sync') {
    state.context = drain(state.context, rateAt(state.plan, state.requestIndex), dt);
  }
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
  // After the transitional beats, so a check-in can never land on the frame
  // that shows a creep, a ship or an ask — those steps have already returned.
  maybeNag(state);
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
