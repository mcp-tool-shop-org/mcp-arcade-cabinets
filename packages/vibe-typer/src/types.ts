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
   * The user's own ask for this snippet, when it has one: the request
   * describes the job the code actually does. `{product}` may appear.
   * Absent on a corpus snippet that has not been written one, where the
   * template pool in user.json is the fallback (slice 3).
   */
  ask?: string;
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
  | { kind: 'message'; who: 'user' | 'agent' }
  | { kind: 'compaction' }
  | { kind: 'milestone'; name: string }
  | { kind: 'copilot'; on: boolean }
  | { kind: 'creep' }
  | { kind: 'sync'; on: boolean }
  | { kind: 'over'; how: 'shipped' | 'context' };

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
  built: BuiltPiece[];
  chat: ChatLine[];
  clock: number;
  over: boolean;
  ended?: 'shipped' | 'context';
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
