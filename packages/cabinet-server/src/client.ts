// The seat side of the contract. `chatTools` is one Ollama `/api/chat` call
// with the cabinet's tools attached; `askFire` asks the boss seat for one
// verb through the `fire` tool, with the schema path on when asked, and
// reports a model that answered but pulled no lever (finding 18) instead of
// silently scripting it. `createSeat` is the beat machine (G13): one verb
// per beat, prefetched during the previous beat, revoked if the view
// changed, late is the script, the boundary never moves.

import {
  isCloudModel,
  PILOT_INTENTS,
  type PilotIntent,
} from '@mcp-arcade-cabinets/ghost-on-the-menu';

import type { SeatView } from './cabinet';
import { enumOf, toolDef, type ToolDef } from './contract';
import { FORBIDDEN } from './gate';

export interface ChatOpts {
  /** `.../api/chat`. */
  url: string;
  model: string;
  /** `keep_alive` for local models so nothing unloads between beats. */
  keepAlive?: string;
  fetchImpl?: typeof fetch;
}

export interface ToolCall {
  name: string;
  arguments: unknown;
}

export interface ChatAnswer {
  calls: ToolCall[];
  content: string;
  thinking: string;
  ms: number;
  /** True when the model needed `think: 'low'` to answer. */
  low: boolean;
}

/** Frozen system prompt for the boss seat over tools. Same for every tape. */
export const SEAT_SYSTEM =
  'You are a boss in an arcade cabinet. You do not know which sprites are honest. ' +
  'The lines below are your view of the field for this one beat. ' +
  'Call fire once, with one verb: spread, column, hold, fog, plate, or script.';

export function seatPrompt(view: SeatView): string {
  const text = [
    `wave ${view.wave}`,
    `kind ${view.kind}`,
    `health ${view.hp}`,
    `ship ${view.column}`,
    `stick ${view.stick}`,
    `motion ${view.motion}`,
  ].join('\n');
  if (FORBIDDEN.test(`${SEAT_SYSTEM}\n${text}`))
    throw new Error('seat prompt leaked a forbidden word');
  return text;
}

/** The schema path: constrain the content to one verb when the model answers in prose. */
export const VERB_FORMAT = {
  type: 'object',
  properties: { verb: { type: 'string', enum: [...PILOT_INTENTS] } },
  required: ['verb'],
} as const;

/** Models seen to spend a short budget thinking; asked with `think: 'low'` next time. */
const thinkers = new Set<string>();

export function needsLowThinkChat(model: string): boolean {
  return thinkers.has(model);
}

export const DEFAULT_KEEP_ALIVE = '30m';

function toOllamaTool(def: ToolDef) {
  return {
    type: 'function',
    function: { name: def.name, description: def.description, parameters: def.inputSchema },
  };
}

interface OllamaChatBody {
  message?: {
    content?: string;
    thinking?: string;
    tool_calls?: { function?: { name?: string; arguments?: unknown } }[];
  };
  error?: string;
}

function errName(err: unknown): string {
  if (err instanceof Error) return err.name;
  if (err && typeof err === 'object' && 'name' in err && typeof err.name === 'string') {
    return err.name;
  }
  return '';
}

function errCause(err: unknown): unknown {
  return err && typeof err === 'object' && 'cause' in err ? err.cause : undefined;
}

function errCode(err: unknown): string {
  let cur: unknown = err;
  for (let i = 0; i < 4 && cur && typeof cur === 'object'; i++) {
    if ('code' in cur && typeof cur.code === 'string') return cur.code;
    cur = errCause(cur);
  }
  return '';
}

function isAbort(err: unknown): boolean {
  let cur: unknown = err;
  for (let i = 0; i < 4 && cur; i++) {
    const name = errName(cur);
    if (name === 'TimeoutError' || name === 'AbortError') return true;
    cur = errCause(cur);
  }
  return false;
}

/**
 * Map a hung or down daemon to a digit-free transport word. Same envelope as
 * ghost-on-the-menu `generate()`: timeout / down / missing / bad payload.
 */
export function mapTransport(err: unknown, daemon: 'ollama' | 'claude'): Error {
  if (isAbort(err) || (err instanceof Error && /timeout/i.test(err.message))) {
    return new Error(`${daemon} timeout`);
  }
  const code = errCode(err);
  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || err instanceof TypeError) {
    return new Error(`${daemon} down`);
  }
  return err instanceof Error ? err : new Error(String(err));
}

/**
 * Words for a non-ok answer from the daemon, read off the status and the
 * error body rather than collapsed into one.
 *
 * Every status but 404 used to be 'ollama down', thrown before the body was
 * read. Ollama Cloud answers a retired tag with 410 and a body that says so,
 * and a missing or wrong signed-in key with 401/403; all three reached the
 * seat as 'ollama down' and sent the operator to check a daemon that was
 * running fine. It also made `createSeat`'s 'seat: model retired' branch
 * unreachable from a real response, because nothing on this path could
 * produce the word.
 *
 * Digit-free, like everything the seat may put on a status line. The body is
 * already bounded in time by the abort on the request.
 */
async function statusError(res: Response): Promise<string> {
  let error = '';
  try {
    const j = (await res.json()) as { error?: unknown };
    if (typeof j.error === 'string') error = j.error;
  } catch {
    // A gateway's error page is not JSON. The status still says enough.
  }
  if (res.status === 410 || /retired/i.test(error)) return 'ollama model retired';
  if (res.status === 401 || res.status === 403) return 'ollama refused';
  if (res.status === 404) return 'ollama missing';
  return 'ollama error';
}

async function chatOnce(
  opts: ChatOpts,
  system: string,
  user: string,
  tools: readonly ToolDef[],
  budget: { think: boolean | 'low'; num_predict: number; timeoutMs: number },
  extra: { format?: object },
): Promise<ChatAnswer> {
  const f = opts.fetchImpl ?? fetch;
  const t0 = Date.now();
  const body: Record<string, unknown> = {
    model: opts.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    stream: false,
    think: budget.think,
    options: { temperature: 0, num_predict: budget.num_predict },
  };
  // A call with no tools is a call with no `tools` key: the endless seat
  // (G28 as slice 3 amends it) asks for one JSON object and pulls no lever,
  // and an empty array is not the same request to every daemon.
  if (tools.length > 0) body.tools = tools.map(toOllamaTool);
  if (!isCloudModel(opts.model)) body.keep_alive = opts.keepAlive ?? DEFAULT_KEEP_ALIVE;
  if (extra.format) body.format = extra.format;
  let res: Response;
  try {
    res = await f(opts.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(budget.timeoutMs),
    });
  } catch (err) {
    throw mapTransport(err, 'ollama');
  }
  if (!res.ok) {
    throw new Error(await statusError(res));
  }
  let j: OllamaChatBody;
  try {
    j = (await res.json()) as OllamaChatBody;
  } catch {
    throw new Error('ollama bad payload');
  }
  if (j.error) throw new Error(j.error);
  const calls: ToolCall[] = [];
  for (const c of j.message?.tool_calls ?? []) {
    const name = c.function?.name;
    if (typeof name === 'string') calls.push({ name, arguments: c.function?.arguments ?? {} });
  }
  return {
    calls,
    content: String(j.message?.content ?? ''),
    thinking: String(j.message?.thinking ?? ''),
    ms: Date.now() - t0,
    low: budget.think === 'low',
  };
}

const SHORT = { think: false as const, num_predict: 48, timeoutMs: 3_000 };
const LOW = { think: 'low' as const, num_predict: 160, timeoutMs: 8_000 };

/**
 * One chat call with tools. A model that spent a short budget thinking and
 * answered nothing is asked again with `think: 'low'` and remembered.
 */
export async function chatTools(
  opts: ChatOpts,
  system: string,
  user: string,
  tools: readonly ToolDef[],
  extra: { format?: object; num_predict?: number; timeoutMs?: number } = {},
): Promise<ChatAnswer> {
  const fmt = extra.format ? { format: extra.format } : {};
  // A caller that asks for a whole snippet rather than one verb needs more
  // than the three and eight seconds one verb is given (slice 4, measured:
  // a slow cloud tag writing code times out on both budgets and the seat
  // never answers at all). Absent, the budgets are the ones the boss seat
  // has always used, so nothing on that path moves.
  const wait = extra.timeoutMs ? { timeoutMs: extra.timeoutMs } : {};
  if (!thinkers.has(opts.model)) {
    const short = {
      ...SHORT,
      ...(extra.num_predict ? { num_predict: extra.num_predict } : {}),
      ...wait,
    };
    const first = await chatOnce(opts, system, user, tools, short, fmt);
    const empty = first.calls.length === 0 && first.content.trim() === '';
    if (!empty || first.thinking === '') return first;
    thinkers.add(opts.model);
  }
  const low = {
    ...LOW,
    ...(extra.num_predict ? { num_predict: Math.max(LOW.num_predict, extra.num_predict) } : {}),
    ...wait,
  };
  return chatOnce(opts, system, user, tools, low, fmt);
}

/** How long a JSON answer may take. Code is longer than a line (slice 3). */
const JSON_TIMEOUT_MS = 20_000;
const JSON_PREDICT = 400;

/**
 * One chat call constrained to a JSON schema, with no tools. The schema path
 * is the whole contract here: the seat is asked for an object and answers
 * with an object, and the caller parses leniently anyway, because a model
 * that wraps its answer in a fence has still answered.
 *
 * `think: 'low'` for the models `chatTools` has already found need it, so a
 * thinker does not spend its whole budget before writing anything.
 */
export async function chatJson(
  opts: ChatOpts,
  system: string,
  user: string,
  schema: object,
  extra: { num_predict?: number; timeoutMs?: number } = {},
): Promise<ChatAnswer> {
  const budget = {
    num_predict: extra.num_predict ?? JSON_PREDICT,
    timeoutMs: extra.timeoutMs ?? JSON_TIMEOUT_MS,
  };
  const fmt = { format: schema };
  if (!needsLowThinkChat(opts.model)) {
    const first = await chatOnce(opts, system, user, [], { think: false, ...budget }, fmt);
    if (first.content.trim() !== '' || first.thinking === '') return first;
    // Measured on this rig: a thinking cloud tag asked with `think: false`
    // spends its budget thinking and answers with nothing at all. Same
    // remedy `chatTools` already uses, and the same memory, so the model
    // pays for the discovery once.
    thinkers.add(opts.model);
  }
  return chatOnce(opts, system, user, [], { think: 'low', ...budget }, fmt);
}

export interface FireAnswer {
  /** The verb the model put through `fire`, or null. */
  intent: PilotIntent | null;
  /** True when the model answered (prose or content JSON) but called no tool. */
  suppressed: boolean;
  /** True when the model called a tool but not with a verb on the menu. */
  badCall: boolean;
  ms: number;
  low: boolean;
  raw: ChatAnswer;
}

export interface AskFireOpts extends ChatOpts {
  /** Enable the schema path (`format`) together with tool calling. */
  constrain?: boolean;
}

/** Ask the boss seat for one verb through the `fire` tool. */
export async function askFire(view: SeatView, opts: AskFireOpts): Promise<FireAnswer> {
  const verbs = enumOf('fire', 'verb');
  const a = await chatTools(opts, SEAT_SYSTEM, seatPrompt(view), [toolDef('fire')], {
    ...(opts.constrain ? { format: VERB_FORMAT } : {}),
  });
  let intent: PilotIntent | null = null;
  for (const c of a.calls) {
    if (c.name !== 'fire') continue;
    const v =
      typeof c.arguments === 'object' && c.arguments !== null
        ? (c.arguments as Record<string, unknown>).verb
        : undefined;
    if (typeof v === 'string' && verbs.includes(v)) intent = v as PilotIntent;
  }
  const badCall = intent === null && a.calls.length > 0;
  const suppressed = intent === null && !badCall && a.content.trim() !== '';
  return { intent, suppressed, badCall, ms: a.ms, low: a.low, raw: a };
}

/** A neutral view for the warm-up call at round start. */
export const WARM_VIEW: SeatView = {
  kind: 'whisperer',
  hp: 'high',
  column: 'center',
  stick: 'still',
  motion: 'pulse',
  wave: 'inspect',
};

/** Warm the seat before play: one real ask so the model is loaded and the route is open. */
export async function warmUp(opts: AskFireOpts): Promise<FireAnswer> {
  return askFire(WARM_VIEW, opts);
}

// --- the beat machine ------------------------------------------------------

export interface SeatStats {
  asked: number;
  admitted: number;
  revoked: number;
  late: number;
  suppressed: number;
  /** Tool calls with a verb not on the menu (finding 7: parseable is not good). */
  badCalls: number;
  scripted: number;
  errors: number;
  /** Hard timeout distinct from late/errors; admits script. */
  timeout: number;
  byVerb: Record<string, number>;
  msSum: number;
}

export interface SeatOpts {
  ask: (view: SeatView) => Promise<FireAnswer>;
  /** Admit a verb for the sim's next beat (through the cabinet's `fire`). */
  admit: (verb: PilotIntent) => void;
  /** Round seconds a beat lasts; an answer slower than this was for a beat that has gone. */
  beatSeconds: number;
  onStatus?: (status: string) => void;
}

export interface Seat {
  /**
   * Call every frame with the current view, the round clock, and whether
   * the sim still holds a verb it has not spent.
   */
  tick(view: SeatView | { kind: null }, t: number, waiting: boolean): void;
  stats(): SeatStats;
  /** True while an ask is in flight. */
  busy(): boolean;
}

/**
 * Whether a prefetched answer still stands. The verb was chosen on the
 * boss's own words (kind, health, motion, wave); those revoke it. The
 * ship's column and stick are aim inputs the sim reads live at the beat,
 * and they flip several times a second under a moving player, so they do
 * not revoke (measured: keying on them revoked two answers in three).
 */
export function sameView(a: SeatView, b: SeatView): boolean {
  return a.kind === b.kind && a.hp === b.hp && a.motion === b.motion && a.wave === b.wave;
}

/**
 * How long the seat waits after one failed ask before opening another, in
 * round seconds, and the ceiling the wait grows to over consecutive
 * failures.
 *
 * A refused TCP connection settles in about a millisecond, so a daemon that
 * is not running used to cost a failed ask and a status line on very nearly
 * every frame for the whole round: a permanent failure paid the same price
 * as a transient one, forever, and the status widget said one sentence
 * hundreds of times while the operator was reading it for something else.
 * The voice side next door has had a cadence for exactly this (VOICE_PROBE_S).
 *
 * The first wait is shorter than a beat, so a blip costs the seat one beat
 * at most; the ceiling is well under a round, so a daemon that comes back
 * mid-round is picked up within it. The scripted floor plays throughout
 * either way — nothing here decides whether the round is fun, only how often
 * a dead daemon is asked.
 */
export const SEAT_RETRY_S = 0.5;
export const SEAT_RETRY_MAX_S = 4;

/** The wait after `failures` consecutive failed asks, doubling to the ceiling. */
export function seatRetryWait(failures: number): number {
  if (failures <= 0) return 0;
  return Math.min(SEAT_RETRY_MAX_S, SEAT_RETRY_S * 2 ** (failures - 1));
}

export function createSeat(opts: SeatOpts): Seat {
  const stats: SeatStats = {
    asked: 0,
    admitted: 0,
    revoked: 0,
    late: 0,
    suppressed: 0,
    badCalls: 0,
    scripted: 0,
    errors: 0,
    timeout: 0,
    byVerb: {},
    msSum: 0,
  };
  let pending: { view: SeatView; tAsked: number; token: number } | null = null;
  let ready: { view: SeatView; answer: FireAnswer | null; error: string | null } | null = null;
  let token = 0;
  let now = 0;
  /** Consecutive failed asks; cleared by the first answer that comes back. */
  let failures = 0;
  /** Round time before which no new ask is opened. */
  let notBefore = 0;
  /** The last failure sentence said, so it is said once per change. */
  let lastFault: string | null = null;
  const say = (s: string) => opts.onStatus?.(s);
  /**
   * A failure sentence, said once per change rather than once per attempt,
   * the way the shooter's voice hook already says its own notes. A daemon
   * that is down says so, and says it again only when what is wrong changes
   * or after an answer has come back.
   */
  const sayFault = (s: string) => {
    if (lastFault === s) return;
    lastFault = s;
    say(s);
  };

  function ask(view: SeatView) {
    const mine = ++token;
    pending = { view, tAsked: now, token: mine };
    stats.asked += 1;
    say('seat thinking');
    void opts
      .ask(view)
      .then((answer) => {
        if (!pending || pending.token !== mine) return;
        if (now - pending.tAsked > opts.beatSeconds) stats.late += 1;
        stats.msSum += answer.ms;
        // An answer is the daemon working: the wait and the said sentence
        // both start over from here.
        failures = 0;
        notBefore = 0;
        lastFault = null;
        ready = { view, answer, error: null };
        pending = null;
      })
      .catch((err: unknown) => {
        if (!pending || pending.token !== mine) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (/ollama timeout/i.test(msg)) stats.timeout += 1;
        else stats.errors += 1;
        failures += 1;
        notBefore = now + seatRetryWait(failures);
        ready = { view, answer: null, error: msg };
        pending = null;
      });
  }

  function admit(r: NonNullable<typeof ready>) {
    if (r.error !== null) {
      opts.admit('script');
      stats.scripted += 1;
      // One branch per word `statusError` can produce, because collapsing
      // them threw away most of what widening it bought. 'ollama refused'
      // is a wrong or absent signed-in key — the most operator-fixable
      // failure there is — and it reached the player and the sit transcript
      // as 'no answer', which is the sentence that sends an operator to
      // check a daemon that is running fine. 'no answer' is the true
      // fall-through and nothing else.
      sayFault(
        /retired/i.test(r.error)
          ? 'seat: model retired'
          : /ollama down/i.test(r.error)
            ? 'seat: ollama down, script'
            : /ollama timeout/i.test(r.error)
              ? 'ollama timeout'
              : /refused/i.test(r.error)
                ? 'seat: the daemon refused the key, script'
                : /missing/i.test(r.error)
                  ? 'seat: no such model, script'
                  : /bad payload/i.test(r.error)
                    ? 'seat: unreadable answer, script'
                    : 'seat: no answer, script',
      );
      return;
    }
    const a = r.answer!;
    if (a.intent === null) {
      opts.admit('script');
      stats.scripted += 1;
      if (a.suppressed) stats.suppressed += 1;
      if (a.badCall) stats.badCalls += 1;
      say(
        a.suppressed
          ? 'seat answered, called nothing: script'
          : a.badCall
            ? 'seat called fire off the menu: script'
            : 'seat: script',
      );
      return;
    }
    opts.admit(a.intent);
    stats.admitted += 1;
    stats.byVerb[a.intent] = (stats.byVerb[a.intent] ?? 0) + 1;
    say(`seat called fire: ${a.intent}`);
  }

  return {
    tick(view, t, waiting) {
      // A new round starts the clock over, and a wait measured on the old
      // one would otherwise hold the seat shut through the start of it.
      if (t < now) notBefore = 0;
      now = t;
      if (view.kind === null) {
        if (pending) token += 1;
        pending = null;
        ready = null;
        return;
      }
      if (ready && !waiting) {
        if (sameView(ready.view, view)) {
          admit(ready);
          ready = null;
          waiting = true;
        } else {
          stats.revoked += 1;
          ready = null;
          say('seat: view changed, asking again');
        }
      }
      // The wait after a failed ask is the only thing between a daemon that
      // is not running and an ask on every frame of the round.
      if (!pending && !ready && now >= notBefore) ask(view);
    },
    stats: () => stats,
    busy: () => pending !== null,
  };
}
