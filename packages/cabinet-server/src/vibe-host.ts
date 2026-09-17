// The one place that touches the typing cabinet's `RunState`. It builds a
// `VibeHost` from it and hands the four tools words: the closed view, a
// place to put the next level's product, a place to put a gated request,
// and a one-line slot for the user's next reaction.
//
// Everything a client is shown is one level ahead of the level being typed
// (G26: the level in hand was fixed at level start, and G13: nothing waits).
// `endlessPeek` is what makes that possible — it draws the next endless
// level's definition from a fresh stream of the same seed and plans
// nothing, so looking at it costs the run nothing.

import {
  corpusOf,
  endlessPeek,
  feedProduct,
  feedReaction,
  feedRequests,
  gateCode,
  leversOf,
  planOf,
  suppliedAsks,
  suppliedCount,
  suppliedProductOf,
  VALUE_TOLERANCE,
  type RunState,
  type Snippet,
} from '@mcp-arcade-cabinets/vibe-typer';

import { lineKey } from './gate';
import { bandWord, LANGUAGE_WORDS, sayablePairs, STACK_WORDS } from './vibe-words';
import type { AskAnswer, ReactAnswer, VibeAsk, VibeHost } from './vibe-cabinet';

/**
 * The handle words. A request's own id is `endless-<n>` or `<def.id>-<i>`
 * and carries digits, and nothing this cabinet shows a client is a number
 * (G25), so a client is given a handle instead and the host maps it back.
 *
 * Two words out of this list, drawn from the ask's own letters, so the same
 * ask always has the same handle and a handle read out of a view a moment
 * ago still names the request it named then — which is the whole point of
 * tagging a reaction rather than letting it land on whatever ships next.
 */
export const HANDLE_WORDS = [
  'acorn',
  'anchor',
  'apron',
  'basket',
  'beacon',
  'bramble',
  'candle',
  'cedar',
  'cinder',
  'copper',
  'dial',
  'ember',
  'fennel',
  'garnet',
  'harbor',
  'hollow',
  'ivory',
  'kettle',
  'lantern',
  'marble',
  'meadow',
  'needle',
  'onyx',
  'pebble',
  'quill',
  'ribbon',
  'saddle',
  'thimble',
  'timber',
  'velvet',
  'willow',
  'yarrow',
] as const;

/** FNV-1a over the ask's letters. Any stable spread over the word list would do. */
function handleHash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * The handle for one ask: two words, no digit, the same every time for the
 * same words. Two different asks can collide, and the host answers the
 * first request in the plan whose ask hashes here — a bounded wrongness of
 * the same kind the untagged path had for every reaction, and far smaller.
 */
export function askHandle(ask: string): string {
  const h = handleHash(lineKey(ask));
  const n = HANDLE_WORDS.length;
  return `${HANDLE_WORDS[h % n]!}-${HANDLE_WORDS[(h >>> 8) % n]!}`;
}

/** Asks the view shows back, so a client does not send the same thing twice. */
export const RECENT_TO_SEAT = 3;
/** Weak letter pairs the view names. */
export const WEAK_TO_SEAT = 8;
/** User lines the reaction gate compares against for a repeat. */
export const REACT_WINDOW = 8;

/**
 * The run under the host, read on every call. The server starts the next
 * run underneath a client that never disconnects, and the seed moves with
 * it, so both are read through the getter rather than captured.
 */
export interface VibeLive {
  state: RunState;
  /** The run's own seed. The next level's definition is drawn from it. */
  seed: number;
  /**
   * Runs that have ended under this client. Bumped by the step on rollover.
   *
   * It is never shown as a count — nothing here is a number (G25). It is the
   * one bit the view needs to tell a client that the run it was playing has
   * been replaced under it: everything it queued, the product it named and
   * the reaction it left all lived on the old state. Optional, so a live
   * built by hand in a test need not carry it.
   */
  runs?: number;
}

/**
 * The three asks a client is shown: the ones it has already queued for the
 * next level first, because those have not been said yet and so are nowhere
 * in the chat to be found, then the most recent lines the user has actually
 * said. A client that could not see its own queue would write the same
 * request for every slot (measured on the pull path, slice 3 decision 19).
 */
export function recentAsks(queued: readonly string[], said: readonly string[]): string[] {
  const out = queued.slice(-RECENT_TO_SEAT);
  const room = RECENT_TO_SEAT - out.length;
  return room > 0 ? [...out, ...said.slice(-room)] : out;
}

/**
 * The keys a request's ask is compared against for a repeat, both as it was
 * written and with `{product}` filled in, because a client may write either
 * and both land on the field as the same line.
 */
function askKeys(ask: string, product: string): string[] {
  const filled = ask.split('{product}').join(product);
  return filled === ask ? [lineKey(ask)] : [lineKey(ask), lineKey(filled)];
}

/**
 * Has this already been asked for? Measured on a live seat: shown its own
 * three most recent asks under `asked` in the view, a model wrote the same
 * request into four slots running. The view is words and a model may read
 * them or not; a no-repeat rule belongs in the gate, where the shooter's
 * `say` has always kept its own.
 *
 * The window is the whole queue plus the chat's last few user lines. The
 * queue is exactly the level being written and is never longer than that
 * level, so it is the level's own length by construction; the chat window is
 * `REACT_WINDOW`, the same one a reaction is compared against, so the
 * cabinet has one no-repeat window rather than two numbers to keep in step.
 */
export function isRepeatAsk(
  ask: string,
  product: string,
  queued: readonly string[],
  said: readonly string[],
): boolean {
  const want = new Set(askKeys(ask, product));
  for (const seen of [...queued, ...said.slice(-REACT_WINDOW)]) {
    for (const key of askKeys(seen, product)) {
      if (key !== '' && want.has(key)) return true;
    }
  }
  return false;
}

/** The view, as `key value` lines. Nothing here is a number and nothing is measured. */
export function vibeViewLines(live: VibeLive): string {
  const { state } = live;
  const levers = leversOf(state);
  const plan = planOf(state);
  const next = endlessPeek({
    set: levers,
    seed: live.seed,
    tier: plan.tier,
    levelIndex: state.levelIndex + 1,
  });
  const named = suppliedProductOf(state);
  const product = named ?? next.product;
  const asks = recentAsks(
    suppliedAsks(state).map((ask) => ask.split('{product}').join(product)),
    state.chat.filter((line) => line.who === 'user').map((line) => line.line),
  );
  const pairs = sayablePairs(
    Object.entries(state.weakBigrams)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, WEAK_TO_SEAT)
      .map(([pair]) => pair),
  );
  const room = suppliedCount(state) < next.requests;
  // One line, while it is fresh, and gone again after the first level of the
  // new run. A client that never disconnects is the case this server is
  // built for, and the one event that throws away everything it holds was
  // the one event it was never told about.
  const rolled =
    (live.runs ?? 0) > 0 && state.levelIndex === 0
      ? ['run a new run just started; anything you sent before is gone']
      : [];
  return [
    ...rolled,
    `product ${product}`,
    `team ${STACK_WORDS[next.stack] ?? 'wires'}`,
    // Lower case throughout: this is a cabinet's words, and nothing here
    // yells (G25). `C sharp` and `SQL` are the only two that would.
    `language ${(LANGUAGE_WORDS[next.stack] ?? LANGUAGE_WORDS.integration!).toLowerCase()}`,
    `band ${bandWord(next.bandMin)}`,
    // The handle first, then the words: a client that wants to say a line
    // back about one of these quotes the handle in `react`, and the line is
    // dropped rather than said over the wrong piece if that request has
    // already gone by the time the call lands.
    ...asks.map((ask) => `asked ${askHandle(ask)} ${ask}`),
    ...(pairs.length > 0 ? [`pairs ${pairs.join(' ')}`] : []),
    `next ${named === null ? 'the next level wants a product' : 'the product is set'}`,
    `room ${room ? 'the next level has room' : 'the next level is full'}`,
  ].join('\n');
}

/**
 * Which request a handle names, or why it names none. `shipped` is the case
 * the tag exists for: a client read the view, wrote a line about the request
 * in hand, and that request went out before the call landed — the line would
 * otherwise be said over the next piece, or stand in as the verdict on the
 * whole product when it was the last one.
 */
export function requestFor(
  state: RunState,
  handle: string,
  gone: readonly string[] = [],
): { kind: 'request'; id: string } | { kind: 'shipped' } | { kind: 'unknown' } {
  const want = handle.trim().toLowerCase();
  const requests = state.plan.requests;
  for (let i = 0; i < requests.length; i++) {
    const request = requests[i]!;
    if (askHandle(request.ask) !== want) continue;
    return i < state.requestIndex ? { kind: 'shipped' } : { kind: 'request', id: request.id };
  }
  // A handle the level in hand does not carry is not automatically a handle
  // the cabinet never minted. It only searched the current plan, so a handle
  // read from `view` one level ago — or from before the server started the
  // next run underneath the client — came back unknown, and the client was
  // told the view did not name it. That says the client misread the view.
  // What actually happened is that the client was late, which is the one
  // case the tag was added to name honestly, and a client acting on the old
  // answer re-reads the view looking for a handle it copied correctly
  // instead of reacting sooner. `unknown` is now reserved for a handle the
  // cabinet has genuinely never minted.
  if (gone.includes(want)) return { kind: 'shipped' };
  return { kind: 'unknown' };
}

/**
 * A host over a live run. `get` is read on every call so the server can
 * start the next run underneath a client that never disconnects. The
 * accepted requests are kept for `pnpm sit` to print; they are not reachable
 * from any tool.
 */
export interface VibeHostOpts {
  /** Whether the run has stopped moving under the step guard. */
  stuck?: () => boolean;
}

export function vibeHostFor(
  get: () => VibeLive,
  opts: VibeHostOpts = {},
): VibeHost & { readonly accepted: readonly Snippet[] } {
  const accepted: Snippet[] = [];
  /**
   * The handles of requests that have gone by, newest last, bounded to the
   * same window a reaction is compared against so the cabinet has one
   * no-repeat window rather than two numbers to keep in step.
   *
   * Filled when the plan turns, from the plan that is being replaced, so a
   * handle still in the level in hand is always found by the search above
   * and never shadowed by this list.
   */
  const gone: string[] = [];
  let seenPlan: RunState['plan'] | null = null;
  let seenHandles: string[] = [];
  const mark = (state: RunState) => {
    if (state.plan === seenPlan) return;
    for (const handle of seenHandles) {
      if (gone.includes(handle)) continue;
      gone.push(handle);
      while (gone.length > REACT_WINDOW) gone.shift();
    }
    seenPlan = state.plan;
    seenHandles = state.plan.requests.map((request) => askHandle(request.ask));
  };
  return {
    accepted,
    ...(opts.stuck ? { stuck: opts.stuck } : {}),
    view: () => {
      mark(get().state);
      return vibeViewLines(get());
    },
    product(name: string) {
      return feedProduct(get().state, name);
    },
    ask(request: VibeAsk): AskAnswer {
      const live = get();
      const { state } = live;
      mark(state);
      const levers = leversOf(state);
      const next = endlessPeek({
        set: levers,
        seed: live.seed,
        tier: planOf(state).tier,
        levelIndex: state.levelIndex + 1,
      });
      // Full is the buffer already being as long as the level it fills. A
      // refusal costs no slot: this path has no retry budget, because the
      // client chooses when to stop asking, and whatever is not queued when
      // the level turns is drawn from the corpus as it always was.
      if (suppliedCount(state) >= next.requests) return { kind: 'full' };
      // Before the code gate, because a repeat is about the request and not
      // about the code, and because the cheapest true thing to say about a
      // request that was already made is that it was already made.
      const repeat = isRepeatAsk(
        request.ask,
        suppliedProductOf(state) ?? next.product,
        suppliedAsks(state),
        state.chat.filter((line) => line.who === 'user').map((line) => line.line),
      );
      if (repeat) return { kind: 'refused', reason: 'repeat' };
      const gated = gateCode(request, {
        stack: next.stack,
        bandMin: next.bandMin,
        bandMax: next.bandMax,
        corpus: corpusOf(state),
        set: levers.difficulty,
        tolerance: VALUE_TOLERANCE,
      });
      // The gate's `detail` is carried out rather than dropped: it is the
      // only place the specifics of a refusal exist, and the cabinet filters
      // it before a client sees it.
      if (!gated.ok) {
        return gated.detail === undefined
          ? { kind: 'refused', reason: gated.reason }
          : { kind: 'refused', reason: gated.reason, detail: gated.detail };
      }
      accepted.push(gated.snippet);
      feedRequests(state, [gated.snippet]);
      return { kind: 'queued' };
    },
    react(line: string, about?: string): ReactAnswer {
      const { state } = get();
      mark(state);
      // No tag is the old behavior, which the sim already treats as "the
      // request in hand": honest for a client that did not read a handle.
      if (about === undefined || about.trim() === '') return feedReaction(state, line);
      const found = requestFor(state, about, gone);
      if (found.kind === 'shipped') return 'missed';
      if (found.kind === 'unknown') return 'no such request';
      return feedReaction(state, line, found.id);
    },
    recent() {
      return get()
        .state.chat.filter((line) => line.who === 'user')
        .slice(-REACT_WINDOW)
        .map((line) => line.line);
    },
  };
}
