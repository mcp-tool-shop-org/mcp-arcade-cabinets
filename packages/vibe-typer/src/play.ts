// The scripted play-through for `pnpm test:play vibe-typer` and the bots the
// fairness band drives. This is the only module that reads the disk: the
// tapes it opens give the integration stack its server and tool names (G30 —
// headers and rows, never a receipt, never a fact). It stays off the barrel
// so the browser bundle never pulls node:fs.
//
// THE TAPES ARE AN INPUT TO THE SCORE, not only to the integration stack.
// `withIntegration` rebuilds the character trigram model over the seasoned
// corpus, and every snippet's value is read off that model — so the corpus a
// run plans from is the corpus PLUS whatever tapes were on disk, and two
// runs are byte-identical only when that whole corpus is the same one. It is
// why a tape dropped in silence is a halt here rather than a skip, and why
// the directory is resolved from this module and never from the cwd.

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadTape, TapeError, type Tape } from '@mcp-arcade-cabinets/tape-core';

import { integrationSnippets, type IntegrationSeed } from './corpus';
import { createRun, stepRun, type CreateRunOpts } from './sim';
import { DEFAULT_PATTERNS } from './patterns';
import { hashString, seededRandom, mixSeed } from './seed';
import type { RunInput, RunState, Snippet, Stack, Tier } from './types';

/** Copied from scripts/play.mjs:18. The printed screen may not carry these. */
export const SCREEN_FORBIDDEN =
  /\d|\b(nrp|integrity|utility|attack_success|pass|fail|score|cleared|lie|fact|revealed|followed|held|ghost_answered|ghost_refused|menu_changed|menu_stable)\b/i;

export const DT = 1 / 60;

/**
 * Where the tapes live when the caller names no directory, resolved from
 * this module and not from the process cwd. `test/helpers.ts` fixed exactly
 * this for itself — from inside the package directory a cwd-relative resolve
 * found no tapes at all — and this default had the same trap: `play({ level:
 * 8 })` from anywhere but the repo root got no integration snippets and then
 * halted naming a lever file, blaming `levels.json` for a missing directory.
 * `src/` and `dist/` both sit one level under the package, so the same
 * relative walk holds for the bundle `pnpm test:play` loads.
 */
export const DEFAULT_TAPES = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../fixtures/tapes',
);

/** A file name or an error message on stderr, with anything that is not printable ASCII replaced. */
function plain(text: string): string {
  return text.replace(/[^ -~]/g, '?');
}
/** Forty minutes of simulated play. Past this the run is called an overrun. */
const MAX_TICKS = 60 * 60 * 40;
const WRONG_KEYS = 'abcdefghijklmnopqrstuvwxyz';

export type Bot = (state: RunState) => RunInput;

const NOTHING: RunInput = {};

/** A bot that never types. The band asks it to prove nothing ships by itself. */
export function idleBot(): Bot {
  return () => NOTHING;
}

function wrongKey(expected: string | undefined, rng: () => number): string {
  for (let i = 0; i < 8; i++) {
    const key = WRONG_KEYS[Math.floor(rng() * WRONG_KEYS.length)]!;
    if (key !== expected) return key;
  }
  return expected === 'q' ? 'w' : 'q';
}

/**
 * A typist at a cadence, with a rate of mistypes it fixes on its next press.
 * It types the target character, sends a full line with Enter, and never
 * reads anything the player cannot see. A quick sync is typed like any other
 * line; it is the meeting, and the meeting is still words on the screen.
 */
export function typistBot(wpm: number, errorRate: number, seed: number): Bot {
  const period = 60 / (Math.max(1, wpm) * 5);
  const rng = seededRandom(seed >>> 0);
  let nextAt = 0;
  return (state) => {
    if (state.clock < nextAt) return NOTHING;
    if (state.beat !== 'reply' && state.beat !== 'code' && state.beat !== 'sync') return NOTHING;
    nextAt = state.clock + period;
    if (state.errors.length > 0) return { backspace: true };
    if (state.typed.length >= state.target.length) return { enter: true };
    const expected = state.target[state.typed.length];
    if (errorRate > 0 && rng() < errorRate) return { key: wrongKey(expected, rng) };
    return { key: expected! };
  };
}

/** The acceptance bot: ninety words a minute, clean. Hardcore is beatable by it. */
export function perfectBot(seed: number): Bot {
  return typistBot(90, 0, seed);
}

export interface BotSpec {
  name: string;
  wpm: number;
  errorRate: number;
}

/** `idle`, `perfect`, `typist:40` or `typist:60:0.02`. */
export function parseBot(raw: string | undefined): BotSpec | null {
  const spec = (raw ?? 'typist:40').trim();
  if (spec === 'idle') return { name: 'idle', wpm: 0, errorRate: 0 };
  if (spec === 'perfect') return { name: 'perfect', wpm: 90, errorRate: 0 };
  const parts = spec.split(':');
  if (parts[0] !== 'typist' || parts.length > 3) return null;
  const wpm = Number(parts[1] ?? '40');
  const errorRate = parts[2] === undefined ? 0.03 : Number(parts[2]);
  if (!Number.isFinite(wpm) || wpm <= 0 || wpm > 300) return null;
  if (!Number.isFinite(errorRate) || errorRate < 0 || errorRate >= 1) return null;
  return { name: spec, wpm, errorRate };
}

export function botFor(spec: BotSpec, seed: number): Bot {
  if (spec.name === 'idle') return idleBot();
  return typistBot(spec.wpm, spec.errorRate, mixSeed(seed, hashString(spec.name)));
}

/** Tool names a tape calls, read off its rows. A name, never a fact (G30). */
export function seedFromTape(tape: Tape): IntegrationSeed {
  const tools = new Set<string>();
  for (const row of tape.rows) {
    if (row.method !== 'tools/call') continue;
    const note = row.note.trim();
    const after = note.startsWith('tools/call ') ? note.slice('tools/call '.length) : '';
    const name = after.split(/\s+/)[0] ?? '';
    if (name !== '') tools.add(name);
  }
  return {
    server: tape.server_name ?? tape.target_kind,
    policy: tape.agent_policy,
    tools: [...tools].sort(),
  };
}

/** Every tape under a directory, as integration seeds. Unreadable files are skipped. */
export function integrationFrom(dir: string): Snippet[] {
  let names: string[] = [];
  try {
    names = readdirSync(dir)
      .filter((f) => f.endsWith('.tape.json'))
      .sort();
  } catch {
    return [];
  }
  const seeds: IntegrationSeed[] = [];
  for (const name of names) {
    try {
      const tape = loadTape(JSON.parse(readFileSync(path.join(dir, name), 'utf8')));
      seeds.push(seedFromTape(tape));
    } catch (err) {
      // A tape this cabinet cannot read is skipped and named; anything else
      // — a JSON syntax error, an unreadable file — is a broken fixture and
      // halts. The guard here used to `continue` on one branch and fall off
      // the end of the block on the other, which are the same thing, so
      // every error looked exactly like a directory with no tapes in it.
      // The integration stack seasons the trigram model, so a tape dropped
      // in silence moves every snippet's value.
      // The halt names the file and nothing else: the message reaches the
      // printed transcript through `play`, which is scanned as a screen.
      if (!(err instanceof TapeError)) {
        throw new Error(`cannot read the tape named ${plain(name)}`, { cause: err });
      }
      process.stderr.write(`skipping tape ${plain(name)}: ${plain(err.message)}\n`);
    }
  }
  return integrationSnippets(seeds);
}

export interface PlayArgs {
  tier?: Tier;
  endless?: boolean;
  bot?: string;
  seed?: number;
  stack?: Stack;
  level?: number;
  /** Where the tapes live; only read for the integration stack. */
  tapes?: string;
}

/**
 * The first chat line that carried something the screen may not show: where
 * it was, who said it, what the scan matched and the line itself.
 *
 * A leak used to be reported as the bare word "leaked" over a transcript
 * printing the last four chat lines. An endless run says hundreds of lines,
 * so a needle that landed on the twelfth was flagged and then invisible, and
 * the operator had no way to find it short of re-running under a debugger —
 * while every other failure in this module names itself usefully.
 */
export interface Leak {
  /** Which chat line, counting the first one said as one. */
  at: number;
  who: 'user' | 'agent';
  /** What the screen scan matched. */
  needle: string;
  /** The line as it was said. */
  line: string;
}

/** The first line of a chat that may not be shown, or null. */
export function firstLeak(chat: readonly { who: 'user' | 'agent'; line: string }[]): Leak | null {
  for (let i = 0; i < chat.length; i++) {
    const said = chat[i]!;
    const hit = SCREEN_FORBIDDEN.exec(said.line);
    if (hit) return { at: i + 1, who: said.who, needle: hit[0], line: said.line };
  }
  return null;
}

/** One line of why, naming the leak. Digits are allowed: this is not the screen. */
export function leakWhy(leak: Leak): string {
  return `leaked: the ${leak.who} said ${leak.needle} on chat line ${leak.at}`;
}

export interface Transcript {
  ok: boolean;
  text: string;
  leaked: boolean;
  ended: 'shipped' | 'context' | 'unplanned' | null;
  valuation: number;
  levels: number;
  pieces: number;
  compactions: number;
  overrun: boolean;
  why: string;
}

const TIER_WORDS = ['easy', 'warm', 'hot', 'hardcore'];

function fail(text: string, why: string): Transcript {
  return {
    ok: false,
    text,
    leaked: false,
    ended: null,
    valuation: 0,
    levels: 0,
    pieces: 0,
    compactions: 0,
    overrun: false,
    why,
  };
}

function screenClean(lines: readonly string[]): boolean {
  return !lines.some((line) => SCREEN_FORBIDDEN.test(line));
}

/**
 * One level (or endless until the bar empties) at a fixed frame. The summary
 * is words, plus the valuation, which is allowed on the board (G23).
 */
export function play(args: PlayArgs = {}): Transcript {
  const spec = parseBot(args.bot);
  if (!spec) return fail(`unknown bot ${args.bot}`, 'unknown bot; use idle, perfect or typist:wpm');
  const tier = (args.tier ?? 0) as Tier;
  const seed = args.seed ?? 1;
  const endless = args.endless === true;
  const stack = args.stack;
  const opts: CreateRunOpts = {
    seed,
    tier,
    endless,
    ...(stack ? { stack } : {}),
    ...(args.level !== undefined ? { levelIndex: args.level } : {}),
  };
  // The tapes are read for every run, not only for a run forced to the
  // integration stack: two of the sixteen listed levels are integration
  // levels, so the stack has to be there before a level asks for it. A run
  // that forced the stack and found no tapes is still the one hard failure.
  //
  // Inside a guard of its own since Stage A made a tape this cabinet cannot
  // read a halt: a fixture with a JSON syntax error threw straight out of
  // `play`, where every other failure in this function returns a Transcript
  // carrying a `why`. The halting decision was right and the shape of the
  // halt was not.
  let snippets: Snippet[];
  try {
    snippets = integrationFrom(args.tapes ?? DEFAULT_TAPES);
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err), 'bad tape');
  }
  if (stack === 'integration' && snippets.length === 0) {
    return fail('no tapes for the integration stack', 'no tapes');
  }
  if (snippets.length > 0) opts.integration = snippets;
  let state: RunState;
  try {
    state = createRun(opts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return fail(msg, msg);
  }
  const bot = botFor(spec, seed);
  let ticks = 0;
  let compactions = 0;
  let overrun = false;
  // The stack running out is a state of the level, so it is caught while the
  // run is live rather than read off the last plan at the end: an endless
  // ladder that recycled on level three and not on level nine would have
  // said nothing.
  let recycled = state.plan.recycled === true;
  // The needle is kept, not just the fact of it: the chat is scanned from
  // where the last step left off and the FIRST hit is held, so a line that
  // landed early in a long run is still nameable at the end.
  //
  // Scanned by `seq` and not by array length, because the chat is a window
  // now: past CHAT_CAP the oldest lines fall off, a length-based mark would
  // point past the end, and every line after the first trim would go
  // unscanned — in silence, which is the failure this whole block exists to
  // refuse.
  let leak: Leak | null = firstLeak(state.chat);
  let leaked = leak !== null;
  let lastSeq = state.chat.length > 0 ? state.chat[state.chat.length - 1]!.seq : -1;
  while (!state.over) {
    if (ticks >= MAX_TICKS) {
      overrun = true;
      break;
    }
    ticks += 1;
    stepRun(state, bot(state), DT);
    for (const event of state.events) if (event.kind === 'compaction') compactions += 1;
    if (state.plan.recycled === true) recycled = true;
    const said = state.chat.filter((line) => line.seq > lastSeq);
    if (said.length > 0) lastSeq = said[said.length - 1]!.seq;
    const fresh = firstLeak(said);
    if (fresh) {
      leaked = true;
      if (!leak) leak = { ...fresh, at: said[fresh.at - 1]!.seq + 1 };
    }
  }
  const levels = state.levelIndex + 1;
  const tail = state.chat.slice(-4).map((c) => `${c.who} ${c.line}`);
  const furniture = [
    `product ${state.plan.product}`,
    `stack ${state.plan.stack}`,
    `agent ${DEFAULT_PATTERNS.cabinet.agentName}`,
  ];
  if (!screenClean([...furniture, ...tail])) leaked = true;
  // The offending line is printed where the operator will look: the tail of
  // the chat is the last four lines, and the line that leaked is usually not
  // among them. It carries the needle with it, so the runner's own scan hits
  // the evidence as readily as it would have hit the original.
  const screen = [
    ...furniture,
    ...(leak ? [`leak the ${leak.who} said ${leak.line}`] : []),
    ...tail,
  ];
  const endName = overrun
    ? 'run overran'
    : state.ended === 'context'
      ? 'the context ran out'
      : state.ended === 'unplanned'
        ? 'the planner came up empty'
        : 'level shipped';
  const header = [
    DEFAULT_PATTERNS.cabinet.name,
    `level ${state.plan.id} stack ${state.plan.stack} tier ${TIER_WORDS[tier]} bot ${spec.name} seed ${seed} endless ${endless ? 'yes' : 'no'}`,
    endName,
    // `plan.recycled` was written, tested and read by nobody: the comment
    // that justifies the flag says it is how "the stack ran out" reaches the
    // shell and the transcript, and that half was never built. A player in a
    // long endless run started seeing snippets they had already typed and
    // was told nothing, which is the silence the flag was added to end.
    ...(recycled ? ['the stack ran out and started again'] : []),
  ];
  const footer = [
    `valuation: ${Math.round(state.valuation)}`,
    `pieces: ${state.pieceCount}`,
    `levels: ${levels}`,
    `compactions: ${compactions}`,
  ];
  const text = [...header, ...screen, ...footer].join('\n');
  const contextOut = state.ended === 'context';
  // The gentlest tier is the acceptance bar: the bar must not empty there.
  const bar = !(tier === 0 && contextOut);
  // The endless ladder has no end to reach, so a planner that came up empty
  // is a failed run and never a shipped one.
  const planned = state.ended !== 'unplanned';
  const ok = !leaked && !overrun && bar && planned;
  const why = leaked
    ? leak
      ? leakWhy(leak)
      : 'leaked'
    : overrun
      ? 'overrun'
      : !planned
        ? 'the planner came up empty'
        : bar
          ? ''
          : 'the context ran out on the gentlest tier';
  return {
    ok,
    text,
    leaked,
    ended: state.ended ?? null,
    valuation: state.valuation,
    levels,
    pieces: state.pieceCount,
    compactions,
    overrun,
    why,
  };
}
