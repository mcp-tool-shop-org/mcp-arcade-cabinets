// The only stateful module. One keystroke per step, a fixed dt, and every
// random draw comes from the seed: same levers, same seed, same tier, same
// endless flag, same weak pairs, same stack, THE SAME CORPUS — tapes and all
// — and the same input stream give a byte-identical RunState (a test asserts
// it). The corpus is on that list because `withIntegration` rebuilds the
// character trigram model over the seasoned corpus and every snippet's value
// is read off that model, so the tape files on disk are an eighth input to
// the score. `corpusFingerprint` in ./corpus is what a caller folds into a
// stored best so a past run is never compared against a differently-seasoned
// one.
//
// The beats run request -> reply -> code -> (creep) -> ship, with a quick
// sync between two requests on the levels that drew one: three short lines
// of meeting chatter the player types, which cost the bar nothing, pay
// nothing and leave the streak where it stands (slice 2). `request`,
// `creep`, `ship` and `compaction` are transitional: each holds for
// `levels.pace.beatHold` seconds of frame time and swallows the input of
// every frame it holds, which is what keeps a creep from being appended
// silently inside a line the player is already transcribing (Q4.1) and what
// gives the player an authored moment to READ the ask, the "oh also" and
// the reaction before the next line is typeable. The bar holds still for a
// transitional beat, the way it holds still for the meeting: the game gave
// the moment, so the game does not charge for it.
//
// Nothing yells (G25). A mistyped character is recorded and waits for a
// backspace. A line sent with an error returns the agent's own "hmm", resets
// that line, and costs nothing else. An empty bar inside a listed level is a
// compaction, not a loss; only endless and hardcore end on it.

import {
  codeLines,
  corpusFingerprint,
  DEFAULT_CORPUS,
  withIntegration,
  type Corpus,
} from './corpus';
import { drain, isNearMiss, rateAt, refill, spend, burn, FULL } from './context';
import { LinePicker } from './lines';
import { DEFAULT_PATTERNS, tierContext, type Patterns } from './patterns';
import { planLevel } from './level';
import { copilotReady, hypeFor, milestoneCrossed, pay, pitchFor } from './score';
import { corpusDigestOf, mintRunCode, parseRunCode, weakDigestOf, weakFromDigest } from './runcode';
import { mixSeed, seededRandom } from './seed';
import type {
  Band,
  Beat,
  ChatKind,
  Event,
  FedSnippet,
  LevelPlan,
  RunInput,
  RunState,
  Snippet,
  Stack,
  Tier,
} from './types';

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
  /**
   * The rung the endless ladder starts on, 1..7, in place of
   * `levels.endless.startBand`. The lever does not move; this is the rung a
   * player who has climbed is put back on, and it is what makes the top two
   * bands reachable at all — sixteen listed levels pin fifty-six ids between
   * them and top out at band five, so sixty authored snippets sit in bands
   * the game only reaches through a long endless climb.
   *
   * A whole number, the way `levelIndex` above is. Out of range, fractional
   * or absent: the lever's own rung, and the run is the run this cabinet has
   * always played. It is dropped rather than clamped — a caller asking for
   * rung nine is asking for a ladder this game does not have, and quietly
   * handing them rung seven is a silent degradation.
   */
  startBand?: number;
  /**
   * How long the game gives the player to read, as a multiplier on
   * `levels.pace` — both the hold on a transitional beat and the least gap
   * between two chat lines. Above one is more reading time.
   *
   * The two numbers are the Director's and do not move; what this buys is a
   * player who reads at their own speed, which the cabinet's settings could
   * not reach at all. Bounded at both ends, validated the way `weakBigrams`
   * is: anything outside `PACE_MIN..PACE_MAX`, non-finite or absent reads as
   * one, and one is today's game to the byte.
   */
  paceScale?: number;
  /**
   * How often the user checks in while you type, as a multiplier on
   * `levels.nagEvery` — or `'off'`, which pushes the next check-in past the
   * end of any run rather than branching inside `maybeNag`. Above one is
   * fewer interruptions.
   *
   * The shipped interval does not move. Bounded and validated the same way:
   * anything outside `CHECK_INS_MIN..CHECK_INS_MAX`, non-finite or absent
   * reads as one.
   */
  checkIns?: number | 'off';
  /**
   * A run code from an end card. Its practice map is planted in place of
   * this browser's, which is what makes a code a replay rather than a seed
   * that means something different on every machine.
   *
   * The code also names the seed, the tier, the stack, the endless flag, the
   * ladder's first rung and the corpus. A caller passes those beside it —
   * `play` reads them straight off the parsed code — and a code that
   * disagrees with the options beside it halts rather than plays some third
   * run neither of them asked for.
   */
  code?: string;
}

/** The bounds on `paceScale`. A quarter of the reading time, or four times it. */
export const PACE_MIN = 0.25;
export const PACE_MAX = 4;

/** The bounds on `checkIns`, and the interval `'off'` stands for. */
export const CHECK_INS_MIN = 0.25;
export const CHECK_INS_MAX = 8;
/**
 * Seconds of frame time `'off'` puts between check-ins: past the end of any
 * run there is. The band's own levers already turn the check-ins off this
 * way rather than by a branch, and a branch inside `maybeNag` would be a
 * second code path through the one beat whose whole point is that it lands
 * on the player's clock.
 */
export const CHECK_INS_OFF = 1e9;

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
  /**
   * The run's own reading clock and its own check-in interval, both read off
   * the levers and scaled once at `createRun`. `hold`, `say` and `armNag`
   * read these rather than the lever set, so a player who reads at their own
   * speed costs the hot path nothing and a scale of one is the shipped
   * number to the byte.
   */
  beatHold: number;
  chatGap: number;
  nagEvery: { min: number; max: number };
  /**
   * The digest of the practice map this run plans with, kept so a code minted
   * off the run says what the run actually used. A run started FROM a code
   * carries that code's digest, which is what makes minting a code off a
   * replay give back the code that was typed.
   */
  weakDigest: number;
  /**
   * The rung the endless ladder started on, or undefined for the lever's
   * own. `advance` plans every further level with it, so a ladder that
   * started high stays high.
   */
  startBand: Band | undefined;
  /** A check-in is waiting for the agent's answer; a second one does not land. */
  nagReplyPending: boolean;
  /**
   * Requests a seated model wrote and the code gate accepted, waiting for
   * the next endless level to take them (G28 as slice 3 amends it). The
   * shell fills this while the current request is typed and the planner
   * splices off what it needs; an empty buffer is a run with no seat, and
   * that run is byte for byte the run this cabinet has always played.
   */
  supplied: FedSnippet[];
  /** The product the seat named for the level its buffer is filling, or null. */
  suppliedProduct: string | null;
  /**
   * One line a seat wrote for the user to say at the next ship, in place of
   * the authored reaction — or of the review, when that ship is the deploy
   * (slice 4's container tools). A single slot on purpose: a client that
   * read the view and is reacting to the request in hand is one beat ahead,
   * which is what keeps the sim from ever waiting on it (G11, G13). The
   * slot is not on `RunState`, so a run that is never fed one stringifies
   * exactly as it always did.
   */
  reaction: string | null;
  /**
   * The request the seated line was written about. A client reads the view,
   * writes a reaction to the request in hand and sends it; if that request
   * has already shipped by the time the call lands, the line would be said
   * over the next request's piece — and on the last request it would stand
   * in as the verdict on the whole product. The tag is checked at the ship
   * and a line that has missed its request is dropped, the way a second
   * line before the ship is dropped.
   */
  reactionFor: string | null;
  /**
   * Frame time the beat in hand stops swallowing input at. Zero off a
   * transitional beat.
   */
  holdUntil: number;
  /**
   * The beat a compaction interrupted, restored when its hold is spent. A
   * compaction lands wherever the bar happens to empty, and the line in the
   * player's hands is untouched by it.
   */
  resumeBeat: Beat;
  /**
   * The earliest frame time the next chat line may be revealed at. `say`
   * spaces the lines of one frame by `pace.chatGap` off this.
   */
  nextLineAt: number;
  /**
   * Frame time the check-in in hand was raised at. The answer must land on a
   * later frame than the question: `maybeNag` runs before the frame's input
   * is read, so a clean Enter on that same frame used to ask and answer with
   * no elapsed time at all, and the joke of a check-in is the interruption.
   */
  nagArmedAt: number;
  /** Frame time another Copilot offer may open at. See `copilotCooldown`. */
  copilotAfter: number;
  /**
   * Set when the sim's own message cost — not the player's time — took the
   * last of the bar, so `empty` can say which it was. Cleared as it is read.
   */
  spentByMessage: boolean;
}

/** Lines in a quick sync. Three is a meeting; more is a level. */
const SYNC_LINES = 3;

/**
 * Pieces the preview keeps. Far past any listed level and past any endless
 * run a player sits through; it exists so a day-long container session has a
 * bounded RunState rather than an array that grows for as long as the client
 * stays connected.
 */
export const BUILT_CAP = 256;

/**
 * Chat lines the run keeps. The same rule as `BUILT_CAP` on the array that
 * grows fastest: four to six lines a request, four requests a level, for as
 * long as an endless run or an MCP client session lasts. The chat is a
 * window, not a history; `chatCount` is the count that never falls off and
 * every line's `seq` says where in the whole run it sat, so a consumer can
 * tell a trim from a gap.
 */
export const CHAT_CAP = 512;

/**
 * The transitional beats: the ones that hold, swallow input and hold the bar
 * still while the player reads. Everything else is a line in their hands.
 */
const HELD_BEATS: readonly Beat[] = ['request', 'creep', 'ship', 'compaction'];

function isHeld(beat: Beat): boolean {
  return HELD_BEATS.includes(beat);
}

/**
 * Weak-pair bookkeeping, bounded. // Director
 *
 * `weakBigrams` is the one number in this package that arrives from the
 * player's own browser, and it was neither validated, bounded nor decayed: a
 * pair fumbled early was weighted forever, and one non-finite count made
 * every planner weight NaN, at which point `weightedPick` returns index zero
 * for every request and the level's seeded variety collapses in silence.
 *
 * `WEAK_PER_PAIR` is how weak one pair may get and `WEAK_PAIRS` is how many
 * pairs the map may name. The third bound — what one snippet's weight may
 * grow to — is `WEAK_SNIPPET_CAP` beside `weakWeight` in ./corpus, where the
 * sum is taken.
 */
export const WEAK_PER_PAIR = 8;
export const WEAK_PAIRS = 256;

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
export function feedRequests(
  state: RunState,
  items: readonly Snippet[],
  product?: string,
): { taken: number; dropped: number } {
  const ctx = runs.get(state);
  // What happened, the way both siblings below say what happened. The `break`
  // past the cap used to discard every remaining item and return nothing at
  // all, so a client that sent twelve requests into a buffer with room for
  // two was told the call succeeded — and the shell's prefetch had to guess
  // from `suppliedCount`.
  if (!ctx) return { taken: 0, dropped: items.length };
  if (items.length === 0) return { taken: 0, dropped: 0 };
  // The level these were written for: a client peeks the next level and
  // writes against its stack, its band and its product, so that is the
  // level they are tagged with. The planner drops a request whose tag does
  // not match the level it is planning.
  const levelIndex = state.levelIndex + 1;
  const cap = bufferCap(ctx);
  let taken = 0;
  let dropped = 0;
  for (const snippet of items) {
    // The planner takes at most one level's worth and the buffer is the
    // only thing holding the rest, so an unbounded push is a buffer a
    // long-lived container session can grow without end. Past the cap the
    // request is dropped, the way a second reaction before a ship is — and
    // the caller is told how many, which is the half that was missing.
    if (ctx.supplied.length >= cap) {
      dropped += 1;
      continue;
    }
    ctx.supplied.push({ snippet, levelIndex, stack: snippet.stack });
    taken += 1;
  }
  if (product !== undefined && product !== '' && ctx.suppliedProduct === null) {
    ctx.suppliedProduct = product;
  }
  return { taken, dropped };
}

/**
 * How many gated requests the buffer holds: one endless level's worth plus
 * the same again as lookahead, which is what the shell's prefetch needs to
 * keep the next level full while the current one is typed (G13).
 */
function bufferCap(ctx: RunContext): number {
  return ctx.set.levels.endless.requests * 2;
}

/**
 * Name the product the next endless level builds, with no request attached
 * (slice 4). `feedRequests` already carries a product beside its snippets;
 * this is the same lever on its own, because the container's `product` tool
 * is a call of its own and a client may name the thing before it has written
 * anything for it. The first name offered for a level wins, as it does
 * there, and the planner drops it once that level has been planned.
 *
 * A blank name answers `empty` and not `already set`: a client that sent
 * whitespace was told the name was taken, which is a false thing to say
 * about its own input and left it no way to tell the two apart.
 */
export function feedProduct(state: RunState, product: string): 'set' | 'already set' | 'empty' {
  const ctx = runs.get(state);
  // No run context at all is a caller bug — a state this module did not
  // mint — and reads as a name that cannot be taken.
  if (!ctx) return 'already set';
  if (ctx.suppliedProduct !== null) return 'already set';
  const name = product.trim();
  if (name === '') return 'empty';
  ctx.suppliedProduct = name;
  return 'set';
}

/**
 * Leave one line for the user to say at the next ship (slice 4). It takes
 * the place of the authored reaction, or of the review when that ship is
 * the level's deploy. One slot: a second line before the ship is dropped,
 * exactly as a second sound is dropped in the shooter next door.
 */
export function feedReaction(
  state: RunState,
  line: string,
  requestId?: string,
): 'waiting' | 'dropped' {
  const ctx = runs.get(state);
  if (!ctx) return 'dropped';
  if (ctx.reaction !== null) return 'dropped';
  const text = line.trim();
  if (text === '') return 'dropped';
  const inHand = state.plan.requests[state.requestIndex]?.id ?? null;
  // Which request the line is about. A client that read the view knows, and
  // says so; the id it read is the honest tag, because the request in hand
  // may already have moved on by the time the call lands. A caller that says
  // nothing gets the request in hand, which at least catches a line that
  // arrives on the ship beat, after that request's ship has already gone.
  const about = requestId !== undefined && requestId !== '' ? requestId : inHand;
  ctx.reaction = text;
  ctx.reactionFor = about;
  return 'waiting';
}

/**
 * The product a seat has named for the next level, or null. The container's
 * `view` shows the next level the name it will actually carry, which is this
 * when a client has named one and the drawn one otherwise.
 */
export function suppliedProductOf(state: RunState): string | null {
  return runs.get(state)?.suppliedProduct ?? null;
}

/** True while a seat's line is waiting for the next ship. Bookkeeping, never a fact. */
export function reactionWaiting(state: RunState): boolean {
  return runs.get(state)?.reaction !== null && runs.get(state)?.reaction !== undefined;
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
  return ctx.supplied.map((fed) => fed.snippet.ask ?? '').filter((ask) => ask !== '');
}

function push(state: RunState, event: Event): void {
  state.events.push(event);
}

/**
 * Say one line.
 *
 * The sim owns the pace. A ship frame says the check-in, the agent's answer
 * to it, the ship line and the user's reaction, and the frame after it says
 * the next ask: five lines, four of them stamped with the same clock reading
 * and the fifth sixteen milliseconds later. `at` cannot separate them, so
 * every consumer — the shell, the container's `view`, the transcript, a
 * screen reader — had to invent a pacing rule the sim does not own, and
 * whatever rule it invented disagreed with the next consumer's. `dueAt` is
 * that rule, here, once: never sooner than `pace.chatGap` after the line
 * before it. `seq` is the total order, which survives the window's trim.
 */
function say(
  state: RunState,
  who: 'user' | 'agent',
  line: string,
  kind: ChatKind,
  nag = false,
): void {
  const ctx = runs.get(state);
  const gap = ctx?.chatGap ?? 0;
  const dueAt = ctx ? Math.max(state.clock, ctx.nextLineAt) : state.clock;
  if (ctx) ctx.nextLineAt = dueAt + gap;
  state.chat.push({
    who,
    line,
    at: state.clock,
    kind,
    seq: state.chatCount,
    dueAt,
    ...(nag ? { nag: true as const } : {}),
  });
  state.chatCount += 1;
  // A window, not a history — the same rule `built` and the seat buffer
  // carry, on the array that grows fastest of the three.
  if (state.chat.length > CHAT_CAP) state.chat.splice(0, state.chat.length - CHAT_CAP);
  push(state, { kind: 'message', who, ...(nag ? { nag: true as const } : {}) });
}

/** The next check-in is due this many seconds of frame time from now. */
function armNag(state: RunState, ctx: RunContext): void {
  const { min, max } = ctx.nagEvery;
  ctx.nextNagAt = state.clock + min + ctx.nagRng() * (max - min);
}

/**
 * Answer a check-in that is still owed, if one is.
 *
 * The debt used to be cleared rather than settled: every new endless level
 * wiped it, and a listed run simply ended. A check-in lands late in a level
 * more often than not — the debt is only settled on the next clean line, and
 * the last clean line of a level ships — so the user's question sat in the
 * chat forever with no reply from an agent whose whole character is that it
 * answers everything. The chat is the record the standup and the container's
 * `view` read back, so that hole was permanent and not momentary.
 */
function settleNag(state: RunState, ctx: RunContext): void {
  if (!ctx.nagReplyPending) return;
  ctx.nagReplyPending = false;
  say(state, 'agent', ctx.picker.nagReply(), 'nagReply');
}

/** A new level, a new nag clock, and the level before's question answered. */
function startNagClock(state: RunState, ctx: RunContext): void {
  settleNag(state, ctx);
  ctx.nagRng = seededRandom(mixSeed(state.plan.seed, NAG_SALT));
  ctx.nagReplyPending = false;
  armNag(state, ctx);
}

/**
 * Hold the beat in hand for the reading time and swallow the input. The
 * Director's `pace.beatHold` is the number; `ctx.beatHold` is that number
 * with the run's own reading-speed multiplier already on it, which is the
 * same number for every run that asked for nothing.
 */
function hold(state: RunState, ctx: RunContext): void {
  ctx.holdUntil = state.clock + ctx.beatHold;
}

/** True while the transitional beat in hand is still being read. */
function holding(state: RunState, ctx: RunContext): boolean {
  return state.clock < ctx.holdUntil;
}

/**
 * Spend the level's message cost on a line the SIM sent, and remember that
 * it was the sim that spent it. An ask whose cost crosses zero ends the run
 * on the frame after it appeared; the player reads a brand-new request and
 * is told the context ran out, in the same word they get when their own
 * typing drained the bar over three minutes.
 */
function spendMessage(state: RunState, ctx: RunContext): void {
  state.context = spend(state.context, state.plan.messageCost);
  if (state.context <= 0) ctx.spentByMessage = true;
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
  say(state, 'user', ctx.picker.nag(), 'nag', true);
  ctx.nagReplyPending = true;
  ctx.nagArmedAt = state.clock;
  armNag(state, ctx);
}

/**
 * The weak pairs a browser handed back, validated the way every lever file
 * is validated: two-character keys, finite counts, a cap per pair and a cap
 * on the size of the map. Everything else is dropped rather than accepted —
 * one non-finite count made every planner weight NaN, `weightedPick` then
 * returns index zero for every request, and the level's seeded variety
 * collapsed with no event, no flag and no word. That is the same
 * silent-degradation shape the `dt` guard at the bottom of this file refuses,
 * on the input that arrives from storage instead of per frame.
 */
export function cleanWeak(raw: Record<string, number> | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== 'object') return out;
  let kept = 0;
  for (const key of Object.keys(raw)) {
    if (kept >= WEAK_PAIRS) break;
    if (key.length !== 2) continue;
    const n = raw[key];
    if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) continue;
    out[key] = Math.min(WEAK_PER_PAIR, Math.floor(n));
    kept += 1;
  }
  return out;
}

/**
 * The reading-time multiplier a caller handed in, bounded the way the weak
 * pairs are: anything non-finite or outside the bounds is dropped rather
 * than accepted, and one is the answer when nothing was asked for. One is
 * the shipped game — `x * 1` is `x` for every finite number, so a run with
 * no scale on it holds every beat and spaces every line exactly as it always
 * did.
 */
export function cleanPaceScale(raw: number | undefined): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 1;
  return Math.min(PACE_MAX, Math.max(PACE_MIN, raw));
}

/**
 * The check-in multiplier, the same way, with `'off'` as its own position:
 * the interval goes past the end of any run rather than a branch going into
 * `maybeNag`.
 */
export function cleanCheckIns(raw: number | 'off' | undefined): number | 'off' {
  if (raw === 'off') return 'off';
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 1;
  return Math.min(CHECK_INS_MAX, Math.max(CHECK_INS_MIN, raw));
}

/**
 * The endless ladder's first rung a caller handed in: a whole band or
 * nothing. Out of range or fractional is dropped, not clamped — a caller
 * asking for rung nine is asking for something this ladder does not have,
 * and quietly handing them rung seven is the silent degradation the weak-pair
 * guard above refuses.
 */
export function cleanStartBand(raw: number | undefined): Band | undefined {
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1 || raw > 7) return undefined;
  return raw as Band;
}

/**
 * A clean line forgives the pairs it contains, one count each.
 *
 * Nothing anywhere decremented these, so a pair fumbled early was weighted
 * for the rest of the run — and for the rest of every run, over a map
 * carried between visits. The weights of a few snippets ran away from the
 * pool, the planner converged on the same handful, and the practice bias
 * turned into repetition on pairs the player had long since mastered. A
 * bias re-earned is a bias that can be spent.
 */
function forgiveWeak(state: RunState, line: string): void {
  for (let i = 1; i < line.length; i++) {
    const pair = line.slice(i - 1, i + 1);
    const n = state.weakBigrams[pair];
    if (n === undefined) continue;
    if (n <= 1) delete state.weakBigrams[pair];
    else state.weakBigrams[pair] = n - 1;
  }
}

export function createRun(opts: CreateRunOpts): RunState {
  const set = opts.levers ?? DEFAULT_PATTERNS;
  const base = opts.corpus ?? DEFAULT_CORPUS;
  const corpus = opts.integration ? withIntegration(base, opts.integration) : base;
  const tier = opts.tier;
  // The run code, when one was typed. A code that does not parse is a caller
  // bug and halts the way a bad plan and a bad `dt` do: the menu box asks
  // `parseRunCode` first and answers the player itself, so a code reaching
  // here has already been read once.
  const code = opts.code === undefined ? null : parseRunCode(opts.code);
  if (opts.code !== undefined && !code) {
    throw new Error('createRun: the run code does not parse');
  }
  if (code) {
    const same =
      code.seed === opts.seed >>> 0 &&
      code.tier === tier &&
      code.endless === opts.endless &&
      code.stack === opts.stack &&
      code.startBand === cleanStartBand(opts.startBand);
    // Two statements of one run that disagree. Playing either of them is a
    // guess, and the seed on the end card was wrong for exactly this reason.
    if (!same) throw new Error('createRun: the run code and the options beside it name two runs');
    if (code.corpus !== corpusDigestOf(corpusFingerprint(corpus))) {
      // Every snippet's value is read off a trigram model built over the
      // seasoned corpus, so the same code on a build with other tapes plays
      // the same requests for other money. A run that only looks like the
      // one the code names is the thing this refuses.
      throw new Error('createRun: the run code was minted from another corpus');
    }
  }
  const picker = new LinePicker(set, {
    seed: opts.seed,
    tier,
  });
  const levelOffset = opts.endless ? 0 : (opts.levelIndex ?? 0);
  // A code plants the map it names; a browser hands its own in. Either way
  // the map goes through `cleanWeak`, which is the one gate on it.
  const weakBigrams = cleanWeak(code ? weakFromDigest(code.weak) : opts.weakBigrams);
  const weakDigest = code ? code.weak : weakDigestOf(weakBigrams);
  const startBand = code?.startBand ?? cleanStartBand(opts.startBand);
  const paceScale = cleanPaceScale(opts.paceScale);
  const checkIns = cleanCheckIns(opts.checkIns);
  const nagEvery =
    checkIns === 'off'
      ? { min: CHECK_INS_OFF, max: CHECK_INS_OFF }
      : {
          min: set.levels.nagEvery.min * checkIns,
          max: set.levels.nagEvery.max * checkIns,
        };
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
    ...(startBand !== undefined ? { startBand } : {}),
  });
  if (!plan) {
    // A listed level whose stack has nothing in the corpus is a missing-tapes
    // condition, not a bad lever. The two integration levels pin no snippets
    // by design, so with no tapes on disk `candidates` comes back empty and
    // `planLevel` returns null — and the halt then blamed levels.json, which
    // sends the reader to the one file that is correct. `play.ts` guarded
    // only the `--stack integration` case; every other caller got the
    // misleading message.
    const stack = opts.stack ?? (opts.endless ? undefined : set.levels.levels[levelOffset]?.stack);
    if (stack !== undefined && (corpus.byStack[stack]?.length ?? 0) === 0) {
      throw new Error(`no ${stack} snippets for levels.${levelOffset}`);
    }
    throw new Error(`patterns/levels.json: levels.${levelOffset}`);
  }
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
    pieceCount: 0,
    chat: [],
    chatCount: 0,
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
    beatHold: set.levels.pace.beatHold * paceScale,
    chatGap: set.levels.pace.chatGap * paceScale,
    nagEvery,
    weakDigest,
    startBand,
    nagReplyPending: false,
    supplied: [],
    suppliedProduct: null,
    reaction: null,
    reactionFor: null,
    holdUntil: 0,
    resumeBeat: 'code',
    nextLineAt: 0,
    nagArmedAt: 0,
    copilotAfter: 0,
    spentByMessage: false,
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
  say(state, 'user', request.ask, 'ask');
  spendMessage(state, ctx);
  hold(state, ctx);
}

/** An empty bar: a compaction inside a listed level, the end anywhere else. */
function empty(state: RunState): void {
  const ctx = runs.get(state)!;
  const by = ctx.spentByMessage ? 'message' : 'drain';
  ctx.spentByMessage = false;
  if (state.endless || state.plan.tier === 3) {
    // The agent answers the question it was asked before the lights go out;
    // the chat is the record, and a question with no answer in it is a hole
    // that never closes.
    settleNag(state, ctx);
    state.over = true;
    state.ended = 'context';
    state.endedBy = by;
    push(state, { kind: 'over', how: 'context', by });
    return;
  }
  // What the compaction cost goes on the event. It is the largest scoring
  // change a listed level has and it used to carry nothing at all, so the
  // agent's cheerful line was the only statement of it and the cue layer had
  // one generic shake for a player who had a five-times run going.
  push(state, { kind: 'compaction', streak: state.streak, hype: state.hype });
  say(state, 'agent', ctx.picker.compaction(), 'compaction');
  state.hype = 1;
  state.streak = 0;
  state.context = FULL;
  // The one authored word for this moment — `words.beats.compaction`, which
  // the cabinet loader has always demanded and gated — was unreachable: no
  // code path ever set the beat, so the board still named whichever beat the
  // player was in. It is a beat now, held like the others, and the line in
  // their hands is untouched: `resumeBeat` puts them back where they were.
  ctx.resumeBeat = state.beat;
  state.beat = 'compaction';
  hold(state, ctx);
}

function noteWeak(state: RunState, expected: string | undefined): void {
  if (expected === undefined) return;
  const prev = state.typed.length >= 2 ? state.typed[state.typed.length - 2]! : '';
  const pair = `${prev}${expected}`;
  if (pair.length !== 2) return;
  const now = state.weakBigrams[pair] ?? 0;
  // A pair only gets so weak, and the map only names so many pairs: this is
  // the same bound `cleanWeak` puts on what arrives from storage, applied to
  // what a long run adds to it.
  if (now === 0 && Object.keys(state.weakBigrams).length >= WEAK_PAIRS) return;
  state.weakBigrams[pair] = Math.min(WEAK_PER_PAIR, now + 1);
}

function setStreak(state: RunState, streak: number): void {
  const ctx = runs.get(state)!;
  state.streak = streak;
  state.hype = hypeFor(streak, ctx.set.score, state.plan.tier);
  if (
    streak > 0 &&
    state.copilot === null &&
    state.clock >= ctx.copilotAfter &&
    copilotReady(streak, state.plan.tier, ctx.set.score)
  ) {
    state.copilot = { until: state.clock + ctx.set.score.copilotSeconds };
    push(state, { kind: 'copilot', on: true });
  }
}

/**
 * Close the offer and start the cooldown. Taken, expired or refused, the
 * next one cannot open until `copilotCooldown` has gone by — without which
 * the window re-armed on the very next clean line while the streak still
 * stood over the threshold, and a bounded offer was in practice open on
 * every line of the run.
 */
function closeCopilot(state: RunState, ctx: RunContext): void {
  state.copilot = null;
  ctx.copilotAfter = state.clock + ctx.set.score.copilotCooldown;
  push(state, { kind: 'copilot', on: false });
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
  state.pieceCount += 1;
  // The preview is a window, not a history. A listed level never reaches the
  // cap; a container session has no natural end, and `built` grew one entry
  // per request for as long as an MCP client stayed connected. The supplied
  // buffer was capped for this reason (`bufferCap` above); this is the same
  // rule on the array that grows with the run. `pieceCount` is what the
  // count is read from, so nothing downstream loses a piece to the trim.
  if (state.built.length > BUILT_CAP) state.built.splice(0, state.built.length - BUILT_CAP);
  push(state, { kind: 'piece', size: piece + bonus });
  if (last) push(state, { kind: 'ship', nearMiss });
  state.context = refill(state.context, state.plan.refillShare);
  for (const milestone of milestoneCrossed(before, state.valuation, ctx.set.score)) {
    if (state.milestones.includes(milestone.name)) continue;
    state.milestones.push(milestone.name);
    push(state, { kind: 'milestone', name: milestone.name });
  }
  // The deploy is the last moment this level has: a check-in still owed an
  // answer is settled here, before the ship line and the verdict, rather
  // than carried into the next level's clock and wiped.
  if (last) settleNag(state, ctx);
  say(state, 'agent', ctx.picker.ship(), 'ship');
  // A seat's line, if one is waiting, takes this beat and the authored pool
  // keeps its place in the bag for the next one. With no seat the call below
  // is the call it has always been, on the draw it has always been (a test
  // asserts a never-fed run stringifies identically).
  // ...and only over the request it was written about. A line that missed
  // its request is dropped rather than said over the next piece, or — on the
  // last request — in place of the verdict on the whole product.
  const seated = ctx.reactionFor === request.id ? ctx.reaction : null;
  ctx.reaction = null;
  ctx.reactionFor = null;
  // The product and the level id go to the picker so a snippet's own
  // reaction can fill `{product}` and can honor the `for` binding its ask
  // already honors. Without them the picker could do neither, and a
  // reaction authored beside an ask would have been unreachable.
  say(
    state,
    'user',
    seated ??
      (last
        ? ctx.picker.review(state.plan.id)
        : ctx.picker.reaction(request.snippet, state.plan.product, state.plan.id)),
    last ? 'review' : 'reaction',
  );
  setStreak(state, state.streak + 1);
  state.beat = 'ship';
  // Nothing to type while the reaction is read; the next request brings its
  // own line.
  startLine(state, '');
  hold(state, ctx);
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
    settleNag(state, ctx);
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
    ...(ctx.startBand !== undefined ? { startBand: ctx.startBand } : {}),
    ...(ctx.suppliedProduct !== null ? { product: ctx.suppliedProduct } : {}),
    ...(ctx.opts.stack ? { stack: ctx.opts.stack } : {}),
  });
  // A product names the level it was offered for, and that level has now
  // been planned — with or without requests behind it, since slice 4 lets a
  // client name the product on its own. Holding it any longer would put one
  // seat's name on every level after it.
  ctx.suppliedProduct = null;
  if (!plan) {
    // The planner came up empty: an empty candidate pool, which is a stack
    // with no corpus or an integration stack with no tapes. This used to be
    // reported as `shipped`, identical to a listed run the player finished —
    // and "shipped" is never a true thing to say about the endless ladder,
    // which by definition has no end to reach. It has its own word now so
    // the player, the transcript and the band can tell the two apart.
    settleNag(state, ctx);
    state.over = true;
    state.ended = 'unplanned';
    push(state, { kind: 'over', how: 'unplanned' });
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
  const fault = lineFaultOf(state);
  if (fault === 'blank') return;
  if (fault !== null) {
    push(state, { kind: 'line', ok: false, why: fault });
    // An unfinished line is not a typo: nothing is wrong with what is there,
    // it is simply not done. The buffer stands and the player carries on
    // from where they were; saying the typo line over it would be a false
    // statement, and throwing the buffer away would be a punishment.
    if (fault === 'unfinished') return;
    push(state, { kind: 'hmm' });
    say(state, 'agent', ctx.picker.hmm(), 'hmm');
    state.typed = '';
    state.errors = [];
    return;
  }
  push(state, { kind: 'line', ok: true });
  forgiveWeak(state, state.target);
  say(state, 'agent', state.target, 'meeting');
  ctx.syncIndex += 1;
  if (ctx.syncIndex >= ctx.syncLines.length) {
    push(state, { kind: 'sync', on: false });
    enterRequest(state);
    return;
  }
  state.lineIndex = ctx.syncIndex;
  startLine(state, ctx.syncLines[ctx.syncIndex] ?? '');
}

/**
 * What is wrong with the line in hand, or null when it is clean.
 *
 * `blank` is an Enter on a line the player has not touched — a stray press
 * after the ship beat, a key repeat, someone who thought the line was done.
 * It recorded no error and the sim told them they had made one: the typo
 * cue, a line from the pool authored for mistypes, and the streak and the
 * hype to zero. An accidental Enter is not a typo, so it is nothing at all.
 *
 * `unfinished` is a line that is right so far and not done. It used to be
 * reported with the same word as a typo, so the player could not tell "you
 * got a character wrong" from "you are not finished".
 */
function lineFaultOf(state: RunState): 'blank' | 'typo' | 'unfinished' | null {
  if (state.typed === '' && state.target !== '') return 'blank';
  if (state.errors.length > 0) return 'typo';
  if (state.typed !== state.target) return 'unfinished';
  return null;
}

function sendLine(state: RunState): void {
  const ctx = runs.get(state)!;
  if (state.beat === 'sync') {
    sendSyncLine(state);
    return;
  }
  const request = state.plan.requests[state.requestIndex]!;
  const fault = lineFaultOf(state);
  if (fault === 'blank') return;
  if (fault !== null) {
    push(state, { kind: 'line', ok: false, why: fault });
    // A line that is right so far costs nothing and keeps its buffer: the
    // player is mid-word, not mistaken. Tension here is a nudge, not a
    // penalty, so the shell answers the marker and the streak stands.
    if (fault === 'unfinished') return;
    push(state, { kind: 'hmm' });
    say(state, 'agent', ctx.picker.hmm(), 'hmm');
    setStreak(state, 0);
    state.typed = '';
    state.errors = [];
    return;
  }
  push(state, { kind: 'line', ok: true });
  // The pairs in a line typed clean are forgiven, one count each, so the
  // practice bias is re-earned rather than accumulated forever.
  forgiveWeak(state, state.target);
  setStreak(state, state.streak + 1);
  // A check-in is answered once the line in hand is out clean, so the answer
  // never lands inside what the player is transcribing. A line sent wrong
  // keeps it owed; a ship on this line says the answer before the ship line.
  //
  // And never on the frame the question was asked: `maybeNag` runs before
  // the frame's input is read, so a clean Enter on that same frame found the
  // flag it had just set and answered with zero time elapsed. The joke is
  // the interruption; a question and its answer with nothing between them is
  // not one. The arm time is the check rather than the ordering because it
  // survives a future reordering of the step.
  if (state.beat === 'code' && ctx.nagReplyPending && state.clock > ctx.nagArmedAt) {
    settleNag(state, ctx);
  }
  if (state.beat === 'reply') {
    say(state, 'agent', request.reply, 'reply');
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
    // The line just finished is put down for the length of the hold, the way
    // `enterRequest` puts one down: a held beat has nothing to type, and a
    // finished line left in the buffer for a second and a bit reads as a line
    // the player is somehow still in.
    startLine(state, '');
    push(state, { kind: 'creep' });
    say(state, 'user', request.creep.ask, 'creep');
    spendMessage(state, ctx);
    hold(state, ctx);
    return;
  }
  ship(state);
}

/**
 * Copilot takes the rest of the line; the request pays less for it.
 *
 * Only on a code line. The discount is charged against the request's own
 * lines, so on the reply line and on a sync's three lines there was nothing
 * to charge it to and the completion came free: Tab on the agent's reply
 * filled the warm-up of every request at no price and the Enter after it
 * took the clean-line branch and grew the streak. A free line is not a
 * discount, so the offer is simply not open off the code beat.
 *
 * Tab with no offer open used to return in silence AND eat the frame, so a
 * Tab pressed mid-word also swallowed the next character's step. The states
 * that covers are not rare — every reply line, all three lines of a quick
 * sync, the whole of hardcore, the seconds after the window expires — and
 * every other refusal in this sim says something. It says something now,
 * and it costs the frame nothing: `true` means the offer was taken.
 */
function takeCopilot(state: RunState): boolean {
  const ctx = runs.get(state)!;
  if (!state.copilot || state.beat !== 'code') {
    push(state, { kind: 'copilot', on: false, offered: false });
    return false;
  }
  const total = ctx.lines.reduce((n, line) => n + line.length, 0);
  if (total > 0) state.discountShare += state.target.length / total;
  state.typed = state.target;
  state.errors = [];
  closeCopilot(state, ctx);
  return true;
}

function typeKey(state: RunState, key: string): void {
  const ctx = runs.get(state)!;
  const expected = state.target[state.typed.length];
  // Past the end of the line the key is refused rather than appended. It
  // used to be pushed onto `typed` and onto `errors` with no ceiling, so a
  // player leaning on a key grew both without bound, the buffer is rendered
  // verbatim by design, and in hardcore every one of those keys burned the
  // bar. Every such key is an error by construction and appending it adds
  // nothing the player can act on — but the refusal is audible, because a
  // key that does nothing and says nothing is the thing being fixed.
  if (expected === undefined) {
    push(state, { kind: 'key', ok: false, pitch: pitchFor(state.streak) });
    return;
  }
  const ok = key === expected;
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

/**
 * One character back. With nothing behind the caret it says so rather than
 * returning in silence: a key that does nothing and says nothing is the
 * thing being fixed here, the same fix a Tab with no offer open and a key
 * struck past the end of a line already carry. No penalty is attached.
 */
function backspace(state: RunState): void {
  if (state.typed.length === 0) {
    push(state, { kind: 'clear', what: 'nothing' });
    return;
  }
  const at = state.typed.length - 1;
  state.typed = state.typed.slice(0, at);
  state.errors = state.errors.filter((i) => i !== at);
}

/**
 * Throw the line away and start it again. A courtesy, never a penalty: no
 * hmm, no failed line, no streak reset, no event of failure. The only other
 * way back from a line the player has made a mess of was one backspace per
 * frame or an Enter that cost the streak, and an abandoned line already
 * costs the time it took to type.
 *
 * It says something now. It used to empty the buffer and push nothing at
 * all, so there was no sound and no cue, and a deliberate restart was
 * indistinguishable from a key that never registered. `what` is whether
 * there was anything there to throw away, so the cue layer can answer a
 * restart and an empty line differently.
 */
function clearLine(state: RunState): void {
  push(state, { kind: 'clear', what: state.typed.length > 0 ? 'line' : 'nothing' });
  state.typed = '';
  state.errors = [];
}

/**
 * One step. `dt` is seconds; the shell and the bots both run a fixed frame.
 * Events are cleared at the top, so what the shell drains is this step's.
 *
 * A dt that is not a finite positive number is a caller bug and throws, the
 * way `createRun` throws on a bad plan. It cannot be allowed through: the
 * bar clamps every non-finite value to empty, so a stray dt would be turned
 * into a plausible-looking game over — the run would end with the context
 * word on the board, which is a false statement about what happened, and in
 * a listed level it would refill and push a compaction every tick until the
 * play-through called the run an overrun. Every other number this package
 * takes is range-checked at load; this is the one that arrives per frame.
 */
export function stepRun(state: RunState, input: RunInput, dt: number): RunState {
  if (typeof dt !== 'number' || !Number.isFinite(dt) || dt <= 0) {
    throw new Error('stepRun: dt must be a finite positive number of seconds');
  }
  const ctx = runs.get(state)!;
  state.events.length = 0;
  if (state.over) return state;
  state.clock += dt;
  // A quick sync is a breather: the meeting costs the bar nothing at all, so
  // the bar holds still for it (slice 2). The clock runs; only the drain
  // stops. A transitional beat is the same bargain: the ask, the "oh also",
  // the reaction and the compaction are the game's own reading time, and the
  // game does not charge the player for the one thing it asked them to do.
  if (state.beat !== 'sync' && !isHeld(state.beat)) {
    state.context = drain(state.context, rateAt(state.plan, state.requestIndex), dt);
  }
  if (state.copilot && state.clock >= state.copilot.until) {
    closeCopilot(state, ctx);
  }
  if (state.context <= 0) {
    empty(state);
    if (state.over) return state;
  }
  // The transitional beats, each held for `pace.beatHold` seconds of frame
  // time. The swallow is what it always was — a held frame reads no input —
  // and it now lasts long enough to be reading time rather than one tick.
  if (isHeld(state.beat)) {
    if (holding(state, ctx)) return state;
    if (state.beat === 'compaction') {
      // Back to the line in their hands, exactly as it stood. A transitional
      // beat the compaction interrupted is given its reading time again.
      state.beat = ctx.resumeBeat;
      if (isHeld(state.beat)) hold(state, ctx);
      return state;
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
    advance(state);
    return state;
  }
  // After the transitional beats, so a check-in can never land on the frame
  // that shows a creep, a ship or an ask — those steps have already returned.
  maybeNag(state);
  if (input.clear) {
    clearLine(state);
    return state;
  }
  // Tab with no offer open answers and does NOT eat the frame, so a Tab
  // pressed mid-word no longer swallows the next character's step too.
  if (input.tab && takeCopilot(state)) return state;
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

/**
 * The code for this run: the string the end card hands the player and the
 * menu box takes back.
 *
 * It carries everything this module's own header names as an input — the
 * seed, the tier, the stack, the endless flag, the ladder's first rung, the
 * practice map and the corpus — where the seed alone carried one of them.
 * The shell mints it at the end of a run and parses what a player types with
 * `parseRunCode` before it ever reaches `createRun`.
 */
export function runCodeOf(state: RunState): string {
  const ctx = runs.get(state);
  if (!ctx) return '';
  return mintRunCode({
    seed: ctx.opts.seed >>> 0,
    tier: ctx.opts.tier,
    endless: ctx.opts.endless,
    ...(ctx.opts.stack ? { stack: ctx.opts.stack } : {}),
    ...(ctx.startBand !== undefined ? { startBand: ctx.startBand } : {}),
    weak: ctx.weakDigest,
    corpus: corpusDigestOf(corpusFingerprint(ctx.corpus)),
  });
}

/** The plan of the level in hand. The shell renders the product from it. */
export function planOf(state: RunState): LevelPlan {
  return state.plan;
}

/** A fresh seed for the next run of the same browser; never the clock. */
export function nextSeed(seed: number, runs_: number): number {
  return mixSeed(seed, runs_);
}
