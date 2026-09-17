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
   * The creep this snippet carries in its own words, when it has one: the
   * extra line and the "oh also" that describes it, written together. The
   * planner prefers it over the band draw, and it honors the same `for`
   * binding the ask does.
   */
  creep?: AuthoredCreep;
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

/**
 * A creep a snippet carries in its own words: the extra line and the ask that
 * describes it, written together.
 *
 * Without one the creep is two unrelated draws — a line lifted out of some
 * other snippet in the band and an "oh also" drawn blind from the pool — so
 * the follow-up request and the code the player types about it are about
 * nothing in particular. This is the same closing slice 3 made for requests
 * (`Snippet.ask`), on the one beat whose whole comedy is that the user is
 * changing the job mid-build.
 *
 * `{product}` may stand in the ask and is the only hole, exactly as in `ask`
 * and `reaction`. A creep that leans on a story level's premise uses the
 * SAME `for` binding the ask uses — there is no second binding field — so it
 * plays only inside that level.
 */
export interface AuthoredCreep {
  line: string;
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
  /**
   * Throw the line away and start it again (the shell binds Escape). A
   * courtesy, never a penalty: no hmm, no failed line, no streak reset. The
   * only other way back from a line the player has made a mess of is one
   * backspace per frame, and an abandoned line already costs the time it
   * took to type.
   */
  clear?: boolean;
}

/**
 * What kind of line this is. The beat that said it, put on the line, so
 * every surface downstream labels the same line the same way.
 *
 * `state.beat` and the bracketing events are live-only and gone by the time
 * anything reads the array back, so a verdict on the whole product, a
 * reaction to one piece, an agent's typo line and a meeting aside all read
 * as "agent, text" in the transcript, in the container's `view` and to an
 * assistive reader. The vocabulary is the one the cabinet already authors a
 * word for per beat, plus the four lines that are not beats of their own.
 */
export type ChatKind =
  | 'ask'
  | 'reply'
  | 'meeting'
  | 'creep'
  | 'ship'
  | 'reaction'
  | 'review'
  | 'compaction'
  | 'hmm'
  | 'nag'
  | 'nagReply';

export interface ChatLine {
  who: 'user' | 'agent';
  line: string;
  at: number;
  /** What kind of line it is, from the beat that said it. */
  kind: ChatKind;
  /**
   * Where this line sits in everything the run has said, counting from zero
   * and never reused. `at` cannot order a frame that says four lines, and
   * the window below drops the oldest entries, so this is the one number a
   * consumer can page and re-sync from.
   */
  seq: number;
  /**
   * The frame-clock reading at which this line should be revealed. The sim
   * owns the pace: lines said on one frame are spread `pace.chatGap` seconds
   * apart, so the shell, the container's `view`, the transcript and a screen
   * reader all pace the same reveal instead of each inventing a rule.
   */
  dueAt: number;
  /** A check-in while you type. It costs nothing and changes nothing (slice 3). */
  nag?: true;
}

export interface BuiltPiece {
  id: string;
  size: number;
}

/**
 * Why a line did not go out. `typo` is a character the player got wrong;
 * `unfinished` is a line that is right so far and not done. The two used to
 * be reported with the same word, so the player could not tell "you got a
 * character wrong" from "you are not finished".
 */
export type LineFault = 'typo' | 'unfinished';

export type Event =
  | { kind: 'key'; ok: boolean; pitch: number }
  | { kind: 'line'; ok: boolean; why?: LineFault }
  | { kind: 'hmm' }
  | { kind: 'piece'; size: number }
  | { kind: 'ship'; nearMiss: boolean }
  | { kind: 'message'; who: 'user' | 'agent'; nag?: true }
  /**
   * The bar emptied inside a listed level. `streak` and `hype` are what the
   * compaction cost, the way `{kind:'piece', size}` carries what a ship
   * gained, so the shell and the cue layer can answer the size of the loss
   * instead of firing one generic shake over a five-times run.
   */
  | { kind: 'compaction'; streak: number; hype: number }
  | { kind: 'milestone'; name: string }
  /**
   * `offered: false` is Tab pressed with no offer open — off the code beat,
   * after the window expired, or in hardcore where the offer never comes.
   * It used to be silence, which is the one refusal in this sim that said
   * nothing at all.
   */
  | { kind: 'copilot'; on: boolean; offered?: false }
  | { kind: 'creep' }
  | { kind: 'sync'; on: boolean }
  /**
   * `by` is what took the last of the bar: the player's own time (`drain`)
   * or the sim's own message cost (`message`). A request whose cost crosses
   * zero ends the run on the frame after it appeared, and the transcript
   * and the standup have no business calling that the same thing as a bar
   * the player drained over three minutes.
   */
  | { kind: 'over'; how: 'shipped' | 'context' | 'unplanned'; by?: 'drain' | 'message' };

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
  /**
   * Null in hardcore (G26). `until` is a clock reading in seconds.
   *
   * There was a `used` flag here that nothing ever set, so the guard that
   * read it was dead and every serialized run carried a field that could
   * only ever be false. The offer is taken once and then closed by setting
   * this to null; what keeps it from re-arming on the very next clean line
   * is `score.json: copilotCooldown`, not a flag.
   */
  copilot: { until: number } | null;
  /**
   * The pieces the preview is drawn from, newest last, capped at
   * `BUILT_CAP`. A container session has no natural end, so the array a run
   * carries is a window and not the whole history; `pieceCount` is the
   * count that never falls off.
   */
  built: BuiltPiece[];
  /** Every piece this run has shipped, including the ones off the window. */
  pieceCount: number;
  /**
   * What has been said, newest last, capped at `CHAT_CAP`. Like `built`,
   * this is a window and not the whole history: four to six lines a request,
   * four requests a level, for as long as an endless run or a container
   * session lasts. `chatCount` is the count that never falls off, and every
   * entry carries a `seq` so a consumer can tell a trim from a gap.
   */
  chat: ChatLine[];
  /** Every line this run has said, including the ones off the window. */
  chatCount: number;
  clock: number;
  over: boolean;
  /**
   * How the run ended. `unplanned` is the endless ladder finding no level to
   * plan — an empty candidate pool, which is the planner coming up empty and
   * never a product the player finished.
   */
  ended?: 'shipped' | 'context' | 'unplanned';
  /**
   * What took the last of the bar when `ended` is `context`: the player's
   * own time, or the message the sim itself sent. Absent on every other
   * ending.
   */
  endedBy?: 'drain' | 'message';
  /** Drained by the shell each frame; `stepRun` clears them at the top of a step. */
  events: Event[];
  /** Char share of the current request taken by Copilot; folded into the payout at ship. */
  discountShare: number;
  /** Set when a creep is waiting to be appended after its beat. */
  creepPending: boolean;
  /** Snippet ids already used in this run; the planner never repeats one. */
  used: string[];
  /**
   * Weak bigrams the planner biases toward, carried across levels in endless.
   *
   * This is the one number in the package that comes back from the player's
   * own browser, so `createRun` validates and bounds it the way every lever
   * file is validated, and a clean line forgives the pairs it contains. A
   * pair fumbled once is not weak forever.
   */
  weakBigrams: Record<string, number>;
  /** Milestones already crossed, so a stinger fires once. */
  milestones: string[];
}
