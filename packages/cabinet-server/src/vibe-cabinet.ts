// The typing cabinet's capability boundary (slice 4). The push path of the
// endless seat: where the pull path has the shell ask a model for the next
// request, these four tools let any MCP client sit in the user's chair and
// send one.
//
// The same rules as the shooter's cabinet next door, and for the same
// reasons. Fact-blind at the boundary (G12): the tools reach a `VibeHost`
// of words, never the state, and there is no method on that host that
// returns a valuation, a count, a verdict or a tape row, so no tool can. The
// seat proposes and the sim disposes (G11): every call is a proposal the
// seeded sim takes at the next level, or at the next ship, or drops. Nothing
// here waits (G13): a client reads `view`, writes for the level that is
// coming, and the level in hand is never touched. Nothing names the model
// (G17).
//
// What a client may do, in order: read `view`, name the next thing being
// built with `product`, send requests for it with `ask`, and say a line back
// with `react`. The nags stay authored in this slice.

import { lineFault, productFault, type CodeGateReason } from '@mcp-arcade-cabinets/vibe-typer';

import { vibeToolDef } from './contract';
import { lineKey, normalizeLine, VIBE_NAMES } from './gate';
import { VIBE_TOOL_NAMES, type VibeToolName } from './tool-names';

/** A request a client offered, before the code gate has seen it. */
export interface VibeAsk {
  ask: string;
  code: string;
  title: string;
  notes: string[];
}

/**
 * Why a request cannot play: the code gate's own reasons, plus `repeat`,
 * which the host decides because only it can see what is already queued.
 */
export type AskRefusal = CodeGateReason | 'repeat';

/**
 * What the host says about a request. `full` is the buffer for the next
 * level already being as long as that level is; `refused` carries the
 * gate's reason word and nothing else — never the code, never the line.
 */
export type AskAnswer =
  { kind: 'queued' } | { kind: 'full' } | { kind: 'refused'; reason: AskRefusal };

/**
 * Words only, and a place to put a proposal. Everything the four tools can
 * reach. There is nothing here that can answer "how much is it worth" or
 * "how far in are we", which is the point.
 */
export interface VibeHost {
  /** The closed view, already rendered as `key value` lines. Never a digit. */
  view(): string;
  /** Name the thing the next level builds. The first name offered wins. */
  product(name: string): 'set' | 'already set';
  /** Offer one request for the next level. */
  ask(request: VibeAsk): AskAnswer;
  /** Leave one line for the user to say at the next ship. */
  react(line: string): 'waiting' | 'dropped';
  /** Lines the user has said lately, for the no-repeat window. */
  recent(): readonly string[];
}

export interface VibeToolResult {
  [key: string]: unknown;
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

export interface VibeCallRecord {
  name: VibeToolName;
  ok: boolean;
  /** Why a word gate or the code gate refused, or 'ok'. */
  gate?: string;
}

export interface VibeCabinet {
  call(name: string, args: unknown): VibeToolResult;
  /** Every call made, in order. Words only. */
  readonly log: readonly VibeCallRecord[];
}

function text(t: string, isError = false): VibeToolResult {
  return isError
    ? { content: [{ type: 'text', text: t }], isError: true }
    : { content: [{ type: 'text', text: t }] };
}

function argOf(args: unknown, key: string): unknown {
  if (typeof args !== 'object' || args === null) return undefined;
  return (args as Record<string, unknown>)[key];
}

/**
 * Why this line cannot be the user's, or null. The chat gate every authored
 * line already passes (`lineFault`: empty, padded, a digit or a closed word,
 * a model's name, a character off this keyboard, a shout, more than one
 * sentence, more than twelve words), plus the two things a pool of authored
 * lines gets for free — it never names a lever, and it never repeats.
 */
export function reactFault(
  raw: unknown,
  recent: readonly string[] = [],
): { ok: true; line: string } | { ok: false; reason: string } {
  if (typeof raw !== 'string') return { ok: false, reason: 'empty' };
  if (/[\r\n]/.test(raw.trim())) return { ok: false, reason: 'more than one sentence' };
  const line = normalizeLine(raw);
  const fault = line === '' ? 'empty' : lineFault(line);
  if (fault !== null) return { ok: false, reason: fault };
  if (VIBE_NAMES.test(line)) return { ok: false, reason: 'names a tool or a model' };
  const key = lineKey(line);
  for (const said of recent) {
    if (lineKey(said) === key) return { ok: false, reason: 'that line was just said' };
  }
  return { ok: true, line };
}

/** A spelling fault names the word it found; the tools say the rule instead. */
function sayReason(fault: string): string {
  return fault.startsWith('spelling:') ? 'a British spelling' : fault;
}

/**
 * Split the one bounded string the contract can carry into notes. The
 * contract admits bounded strings and closed enums and nothing else — no
 * arrays, no nested objects — and that closedness is the point, so notes
 * arrive as one field with a line per note.
 *
 * More than three lines is NOT trimmed here: the code gate refuses it and
 * names the reason. Nothing on this path fixes what a seat wrote.
 */
export function splitNotes(raw: unknown): string[] {
  if (typeof raw !== 'string') return [];
  return raw
    .split('\n')
    .map((n) => n.trim())
    .filter((n) => n !== '');
}

/**
 * A field longer than the contract's own bound for it, or null. The bound is
 * read out of `tools.vibe.json` so the contract stays the one place it is
 * written down.
 *
 * This used to clip the string to the bound and gate the short version. That
 * is a repair, and this path never repairs: a gate accepts or refuses, and a
 * caller whose request was silently shortened and then accepted would have
 * played code it did not write. The stdio server's zod shape rejects an
 * over-long field at the transport, so what this catches is an in-process
 * caller — `pnpm sit`, a test, anything holding a cabinet directly.
 */
export function tooLong(name: VibeToolName, key: string, value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const p = vibeToolDef(name).inputSchema.properties[key];
  return p !== undefined && 'maxLength' in p && value.length > p.maxLength;
}

/** The refusal every tool says, in its own closing words. */
const TOO_LONG = 'too long';

/** The typing cabinet: its four tools over a host of words. */
export function createVibeCabinet(host: VibeHost): VibeCabinet {
  const log: VibeCallRecord[] = [];

  function view(): VibeToolResult {
    log.push({ name: 'view', ok: true });
    return text(host.view());
  }

  function product(args: unknown): VibeToolResult {
    const raw = argOf(args, 'product');
    if (typeof raw !== 'string') {
      log.push({ name: 'product', ok: false });
      return text('product wants a few plain words', true);
    }
    const name = normalizeLine(raw);
    const fault = tooLong('product', 'product', raw)
      ? TOO_LONG
      : name === ''
        ? 'empty'
        : productFault(name);
    if (fault !== null) {
      log.push({ name: 'product', ok: false, gate: sayReason(fault) });
      return text(
        `the gate refused it (${sayReason(fault)}); the cabinet draws one of its own instead`,
      );
    }
    const r = host.product(name);
    log.push({ name: 'product', ok: r === 'set', gate: 'ok' });
    return text(r === 'set' ? 'the next level will build that' : 'the product is set');
  }

  function ask(args: unknown): VibeToolResult {
    const askText = argOf(args, 'ask');
    const code = argOf(args, 'code');
    const title = argOf(args, 'title');
    const notesRaw = argOf(args, 'notes');
    // All four fields, because the contract marks all four required. A
    // non-string `notes` used to fall through `splitNotes` to an empty list
    // and queue as though the caller had sent none, while the refusal for
    // its three siblings already named it. The stdio transport's zod shape
    // covers an MCP client; the gap was the in-process caller `tooLong` was
    // written for.
    if (
      typeof askText !== 'string' ||
      typeof code !== 'string' ||
      typeof title !== 'string' ||
      typeof notesRaw !== 'string'
    ) {
      log.push({ name: 'ask', ok: false });
      return text('ask wants the words, the code, a title and the notes', true);
    }
    const over = (['ask', 'code', 'title', 'notes'] as const).some((key) =>
      tooLong('ask', key, argOf(args, key)),
    );
    if (over) {
      log.push({ name: 'ask', ok: false, gate: TOO_LONG });
      return text(`the gate refused it (${TOO_LONG}); the cabinet plays one of its own instead`);
    }
    const r = host.ask({ ask: askText, code, title, notes: splitNotes(notesRaw) });
    if (r.kind === 'full') {
      log.push({ name: 'ask', ok: false, gate: 'full' });
      return text('the next level is full');
    }
    if (r.kind === 'refused') {
      log.push({ name: 'ask', ok: false, gate: r.reason });
      return text(`the gate refused it (${r.reason}); the cabinet plays one of its own instead`);
    }
    log.push({ name: 'ask', ok: true, gate: 'ok' });
    return text('the next request is queued');
  }

  function react(args: unknown): VibeToolResult {
    const raw = argOf(args, 'text');
    const gate = tooLong('react', 'text', raw)
      ? ({ ok: false, reason: TOO_LONG } as const)
      : reactFault(raw, host.recent());
    if (!gate.ok) {
      log.push({ name: 'react', ok: false, gate: sayReason(gate.reason) });
      return text(
        `the gate refused it (${sayReason(gate.reason)}); the user says one of their own instead`,
      );
    }
    const r = host.react(gate.line);
    log.push({ name: 'react', ok: r === 'waiting', gate: 'ok' });
    return text(
      r === 'waiting'
        ? 'the user will say it at the next thing that ships'
        : 'a reaction is already waiting; dropped',
    );
  }

  // One closed list, the same shape the shooter's cabinet uses: a name in
  // tools.vibe.json with no handler here fails at create time, and a name
  // only in tools.vibe.json already fails loadContract.
  const handlers: Record<VibeToolName, (args: unknown) => VibeToolResult> = {
    view: () => view(),
    product,
    ask,
    react,
  };
  for (const n of VIBE_TOOL_NAMES) {
    if (typeof handlers[n] !== 'function') throw new Error(`tools.vibe.json: no dispatch for ${n}`);
  }

  return {
    log,
    call(name: string, args: unknown): VibeToolResult {
      if (!(VIBE_TOOL_NAMES as readonly string[]).includes(name)) {
        throw new Error(`no such tool: ${name}`);
      }
      return handlers[name as VibeToolName](args);
    },
  };
}
