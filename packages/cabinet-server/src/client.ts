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
  'Each beat, call fire with one verb: spread, column, hold, fog, plate, or script.';

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

async function chatOnce(
  opts: ChatOpts,
  system: string,
  user: string,
  tools: readonly ToolDef[],
  budget: { think: boolean | 'low'; num_predict: number },
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
    tools: tools.map(toOllamaTool),
    stream: false,
    think: budget.think,
    options: { temperature: 0, num_predict: budget.num_predict },
  };
  if (!isCloudModel(opts.model)) body.keep_alive = opts.keepAlive ?? DEFAULT_KEEP_ALIVE;
  if (extra.format) body.format = extra.format;
  const res = await f(opts.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const j = (await res.json()) as OllamaChatBody;
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

const SHORT = { think: false as const, num_predict: 48 };
const LOW = { think: 'low' as const, num_predict: 160 };

/**
 * One chat call with tools. A model that spent a short budget thinking and
 * answered nothing is asked again with `think: 'low'` and remembered.
 */
export async function chatTools(
  opts: ChatOpts,
  system: string,
  user: string,
  tools: readonly ToolDef[],
  extra: { format?: object; num_predict?: number } = {},
): Promise<ChatAnswer> {
  const fmt = extra.format ? { format: extra.format } : {};
  if (!thinkers.has(opts.model)) {
    const short = extra.num_predict ? { ...SHORT, num_predict: extra.num_predict } : SHORT;
    const first = await chatOnce(opts, system, user, tools, short, fmt);
    const empty = first.calls.length === 0 && first.content.trim() === '';
    if (!empty || first.thinking === '') return first;
    thinkers.add(opts.model);
  }
  const low = extra.num_predict
    ? { ...LOW, num_predict: Math.max(LOW.num_predict, extra.num_predict) }
    : LOW;
  return chatOnce(opts, system, user, tools, low, fmt);
}

export interface FireAnswer {
  /** The verb the model put through `fire`, or null. */
  intent: PilotIntent | null;
  /** True when the model answered (prose or content JSON) but called no tool. */
  suppressed: boolean;
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
  const suppressed = intent === null && a.content.trim() !== '';
  return { intent, suppressed, ms: a.ms, low: a.low, raw: a };
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
  scripted: number;
  errors: number;
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

export function sameView(a: SeatView, b: SeatView): boolean {
  return (
    a.kind === b.kind &&
    a.hp === b.hp &&
    a.column === b.column &&
    a.stick === b.stick &&
    a.motion === b.motion &&
    a.wave === b.wave
  );
}

export function createSeat(opts: SeatOpts): Seat {
  const stats: SeatStats = {
    asked: 0,
    admitted: 0,
    revoked: 0,
    late: 0,
    suppressed: 0,
    scripted: 0,
    errors: 0,
    byVerb: {},
    msSum: 0,
  };
  let pending: { view: SeatView; tAsked: number; token: number } | null = null;
  let ready: { view: SeatView; answer: FireAnswer | null; error: string | null } | null = null;
  let token = 0;
  let now = 0;
  const say = (s: string) => opts.onStatus?.(s);

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
        ready = { view, answer, error: null };
        pending = null;
      })
      .catch((err: unknown) => {
        if (!pending || pending.token !== mine) return;
        stats.errors += 1;
        ready = { view, answer: null, error: err instanceof Error ? err.message : String(err) };
        pending = null;
      });
  }

  function admit(r: NonNullable<typeof ready>) {
    if (r.error !== null) {
      opts.admit('script');
      stats.scripted += 1;
      say(/retired/i.test(r.error) ? 'seat: model retired' : 'seat: no answer, script');
      return;
    }
    const a = r.answer!;
    if (a.intent === null) {
      opts.admit('script');
      stats.scripted += 1;
      if (a.suppressed) stats.suppressed += 1;
      say(a.suppressed ? 'seat answered, called nothing: script' : 'seat: script');
      return;
    }
    opts.admit(a.intent);
    stats.admitted += 1;
    stats.byVerb[a.intent] = (stats.byVerb[a.intent] ?? 0) + 1;
    say(`seat called fire: ${a.intent}`);
  }

  return {
    tick(view, t, waiting) {
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
      if (!pending && !ready) ask(view);
    },
    stats: () => stats,
    busy: () => pending !== null,
  };
}
