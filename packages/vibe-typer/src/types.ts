// Vibe Typer — every type the cabinet trades in. No logic lives here.
//
// The lock is G23–G30 in docs/vibe-typer.dispatch.md. The two that shape
// these types: the scoreboard is valuation, hype and streak and nothing else
// (G23), and a request's value is a deterministic number over its code that
// the preview grows by (G24).

export type Stack = 'bash' | 'csharp' | 'java' | 'javascript' | 'python' | 'sql' | 'integration';

/** Tier 3 is hardcore and comes from the selector only (G25, G26). */
export type Tier = 0 | 1 | 2 | 3;

export type Beat = 'request' | 'reply' | 'code' | 'ship' | 'compaction' | 'creep' | 'sync';

export type Band = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Snippet {
  id: string;
  stack: Stack;
  band: Band;
  title: string;
  code: string;
  notes: string[];
  topics: string[];
  /**
   * The user's own words for the job this code does, so the request and the
   * code are the same thing (slice 3). `{product}` may stand in it; the
   * template pool in user.json is the fallback for a snippet without one.
   * A seated model writes one for every request it sends (G28 amended).
   */
  ask?: string;
  /**
   * One line the user says when this request's piece ships, so the reaction
   * answers the request instead of a pool that never read it. `{product}` may
   * stand in it and is the only hole; `{title}` is refused, the way it is in
   * `ask`. A reaction that leans on a story level's premise uses the SAME
   * `for` binding the ask uses — there is no second binding field — so it
   * plays only inside that level. A snippet without one falls through to the
   * pool the picker draws today.
   */
  reaction?: string;
  /**
   * The level id whose premise this snippet's `ask` — or its `reaction` —
   * was written against.
   * Present only on a snippet whose ask names something that belongs to one
   * story — a duck, a sandwich, a sock, the cat — or leans on a pronoun that
   * story supplies. The planner uses such an ask only inside that level; the
   * template pool plays everywhere else, so the request always matches the
   * product on screen. A snippet a seat writes never carries one: a seated
   * request is written for the level in hand.
   */
  for?: string;
}

/**
 * A request a seat wrote, tagged with the level it was written for.
 *
 * The seat reads the next level with `endlessPeek` — its stack, its band,
 * its product — and writes against that. The buffer used to be untagged, so
 * a surplus left over from one level was typed in the next, which draws a
 * fresh random stack: the bed, the palette and the device frame all say one
 * language while the code and the ask are another. The tag is what lets the
 * planner drop such a request instead of playing it.
 */
export interface FedSnippet {
  snippet: Snippet;
  /** The endless level index this request was gated for. */
  levelIndex: number;
  /** The stack it was gated against, which is the peeked level's stack. */
  stack: Stack;
}

export interface Creep {
  /** One more code line, appended to the request once the creep beat has passed. */
  line: string;
  /** The user's "oh also" ask, shown and voiced before the line is typeable (Q4.1). */
  ask: string;
}

export interface Request {
  id: string;
  ask: string;
  reply: string;
  snippet: Snippet;
  value: number;
  creep?: Creep;
}

export interface LevelPlan {
  id: string;
  product: string;
  /** The level's premise in one line; empty in endless until a seat writes one. */
  story: string;
  stack: Stack;
  tier: Tier;
  requests: Request[];
  drainPerSec: number;
  /** Fraction added to drainPerSec by the level's last request (the only mid-level ramp, G26). */
  drainRamp: number;
  refillShare: number;
  messageCost: number;
  shipBonus: number;
  /**
   * The request index a quick sync sits in front of, when this level drew one.
   * Never the first request and never after the last: a sync is between two
   * requests, and it is a breather (slice 2).
   */
  syncAt?: number;
  /**
   * Set when this level had to reach the widening ladder's last rung: the
   * stack's free pool was spent, so the planner started a fresh cycle and
   * drew snippets the run has already played. Absent on every level that
   * drew from unused snippets. It is on the plan rather than in an event
   * because the plan is what the container serializes for `view` and what
   * the transcript reads at the end — "the stack ran out" is a state of the
   * level, not a frame it passed through.
   */
  recycled?: true;
  seed: number;
}

/** One keystroke per step, or none. */
export interface RunInput {
  key?: string;
  backspace?: boolean;
  enter?: boolean;
  tab?: boolean;
}

export interface ChatLine {
  who: 'user' | 'agent';
  line: string;
  at: number;
  /** A check-in while you type. It costs nothing and changes nothing (slice 3). */
  nag?: true;
}

export interface BuiltPiece {
  id: string;
  size: number;
}

export type Event =
  | { kind: 'key'; ok: boolean; pitch: number }
  | { kind: 'line'; ok: boolean }
  | { kind: 'hmm' }
  | { kind: 'piece'; size: number }
  | { kind: 'ship'; nearMiss: boolean }
  | { kind: 'message'; who: 'user' | 'agent'; nag?: true }
  | { kind: 'compaction' }
  | { kind: 'milestone'; name: string }
  | { kind: 'copilot'; on: boolean }
  | { kind: 'creep' }
  | { kind: 'sync'; on: boolean }
  | { kind: 'over'; how: 'shipped' | 'context' | 'unplanned' };

export interface RunState {
  plan: LevelPlan;
  endless: boolean;
  levelIndex: number;
  requestIndex: number;
  beat: Beat;
  /** The line being typed. */
  target: string;
  /** The player's buffer; always rendered, wrong characters included (Q1.4). */
  typed: string;
  /** Which line of the snippet is in hand. */
  lineIndex: number;
  /** Indices in `typed` that are wrong; empty means clean. */
  errors: number[];
  /** The context bar, 0..1. */
  context: number;
  valuation: number;
  hype: number;
  streak: number;
  /** Null in hardcore (G26). `until` is a clock reading in seconds. */
  copilot: { until: number; used: boolean } | null;
  /**
   * The pieces the preview is drawn from, newest last, capped at
   * `BUILT_CAP`. A container session has no natural end, so the array a run
   * carries is a window and not the whole history; `pieceCount` is the
   * count that never falls off.
   */
  built: BuiltPiece[];
  /** Every piece this run has shipped, including the ones off the window. */
  pieceCount: number;
  chat: ChatLine[];
  clock: number;
  over: boolean;
  /**
   * How the run ended. `unplanned` is the endless ladder finding no level to
   * plan — an empty candidate pool, which is the planner coming up empty and
   * never a product the player finished.
   */
  ended?: 'shipped' | 'context' | 'unplanned';
  /** Drained by the shell each frame; `stepRun` clears them at the top of a step. */
  events: Event[];
  /** Char share of the current request taken by Copilot; folded into the payout at ship. */
  discountShare: number;
  /** Set when a creep is waiting to be appended after its beat. */
  creepPending: boolean;
  /** Snippet ids already used in this run; the planner never repeats one. */
  used: string[];
  /** Weak bigrams the planner biases toward, carried across levels in endless. */
  weakBigrams: Record<string, number>;
  /** Milestones already crossed, so a stinger fires once. */
  milestones: string[];
}
