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
import type { AskAnswer, VibeAsk, VibeHost } from './vibe-cabinet';

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
  return [
    `product ${product}`,
    `team ${STACK_WORDS[next.stack] ?? 'wires'}`,
    // Lower case throughout: this is a cabinet's words, and nothing here
    // yells (G25). `C sharp` and `SQL` are the only two that would.
    `language ${(LANGUAGE_WORDS[next.stack] ?? LANGUAGE_WORDS.integration!).toLowerCase()}`,
    `band ${bandWord(next.bandMin)}`,
    ...asks.map((ask) => `asked ${ask}`),
    ...(pairs.length > 0 ? [`pairs ${pairs.join(' ')}`] : []),
    `next ${named === null ? 'the next level wants a product' : 'the product is set'}`,
    `room ${room ? 'the next level has room' : 'the next level is full'}`,
  ].join('\n');
}

/**
 * A host over a live run. `get` is read on every call so the server can
 * start the next run underneath a client that never disconnects. The
 * accepted requests are kept for `pnpm sit` to print; they are not reachable
 * from any tool.
 */
export function vibeHostFor(
  get: () => VibeLive,
): VibeHost & { readonly accepted: readonly Snippet[] } {
  const accepted: Snippet[] = [];
  return {
    accepted,
    view: () => vibeViewLines(get()),
    product(name: string) {
      return feedProduct(get().state, name);
    },
    ask(request: VibeAsk): AskAnswer {
      const live = get();
      const { state } = live;
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
      if (!gated.ok) return { kind: 'refused', reason: gated.reason };
      accepted.push(gated.snippet);
      feedRequests(state, [gated.snippet]);
      return { kind: 'queued' };
    },
    react(line: string) {
      return feedReaction(get().state, line);
    },
    recent() {
      return get()
        .state.chat.filter((line) => line.who === 'user')
        .slice(-REACT_WINDOW)
        .map((line) => line.line);
    },
  };
}
