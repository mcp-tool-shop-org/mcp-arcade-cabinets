// Shared drive loop for the band and the sim tests. Not a test file itself.

import path from 'node:path';

import { gateCode, VALUE_TOLERANCE } from '../src/codegate';
import { endlessPeek } from '../src/level';
import { DT, botFor, integrationFrom, parseBot, type Bot } from '../src/play';
import {
  corpusOf,
  createRun,
  feedRequests,
  stepRun,
  suppliedCount,
  type CreateRunOpts,
} from '../src/sim';
import { DEFAULT_PATTERNS, type Patterns } from '../src/patterns';
import type { Event, RunState, Snippet, Tier } from '../src/types';

export const SEEDS = [1, 2, 3];
export const TIERS: Tier[] = [0, 1, 2, 3];
export const LEVELS = DEFAULT_PATTERNS.levels.levels.length;
/** Ninety minutes of simulated play; a bar that needs more has already failed. */
export const TICK_CAP = 60 * 60 * 90;

export interface RunReport {
  ended: 'shipped' | 'context' | null;
  compactions: number;
  ships: number;
  pieces: number;
  levels: number;
  valuation: number;
  hypes: number[];
  streakDrops: number;
  copilotOn: number;
  creeps: number;
  nearMisses: number;
  /** Check-ins the user sent while the player typed (slice 3). */
  nags: number;
  /**
   * Check-ins that landed where they may not: off a code beat, or on the run's
   * very first line. The band asserts this is zero.
   */
  nagFaults: number;
  lines: string[];
  ticks: number;
  /** Streak drops with no bad key, no bad line and no compaction in the same step. */
  unexplainedDrops: number;
  milestones: string[];
  state: RunState;
}

export interface DriveOpts {
  bot: string;
  seed: number;
  tier: Tier;
  level?: number;
  endless?: boolean;
  maxTicks?: number;
  /** Levers other than the default ones; the nag bars drive the same run twice. */
  levers?: Patterns;
  /**
   * Called before every step, so a bar can play the endless seat: it feeds
   * gated requests into the run the way the shell's prefetch does (G13).
   * Absent, and the run is the run this cabinet has always played.
   */
  supply?: (state: RunState) => void;
}

/**
 * The integration stack, built from the repo's own fixture tapes, exactly as
 * the shell builds it from the bundled ones. Two of the sixteen listed levels
 * are integration levels, so the band has to season its corpus the way the
 * game does or those two levels would have nothing to plan from. Read once.
 */
/**
 * Where the fixture tapes are, resolved from this file and not from the
 * process cwd — Ghost's band test does the same (`path.resolve(__dirname,
 * '../../../fixtures/tapes')`). Resolved from the cwd, running the band
 * from inside the package directory found no tapes at all, and
 * `integrationFrom` swallows a missing directory and returns nothing, so
 * the two integration levels planned from an empty stack and failed
 * naming `patterns/levels.json: levels.8` — the wrong thing entirely.
 */
const TAPES = path.resolve(__dirname, '../../../fixtures/tapes');

let seasoning: readonly Snippet[] | null = null;
function integrationSeasoning(): readonly Snippet[] {
  if (!seasoning) {
    seasoning = integrationFrom(TAPES);
    // An empty seasoning is not a run with no integration levels; it is a
    // band that cannot measure two of its sixteen. Say so here, where the
    // tapes are, rather than four frames down inside the planner.
    if (seasoning.length === 0) throw new Error(`no tapes under ${TAPES}`);
  }
  return seasoning;
}

export function makeBot(spec: string, seed: number): Bot {
  const parsed = parseBot(spec);
  if (!parsed) throw new Error(`unknown bot ${spec}`);
  return botFor(parsed, seed);
}

/** Drive one run to its end and report what the band cares about. */
export function drive(opts: DriveOpts): RunReport {
  const create: CreateRunOpts = {
    seed: opts.seed,
    tier: opts.tier,
    endless: opts.endless === true,
    integration: integrationSeasoning(),
    ...(opts.level !== undefined ? { levelIndex: opts.level } : {}),
    ...(opts.levers ? { levers: opts.levers } : {}),
  };
  const state = createRun(create);
  const bot = makeBot(opts.bot, opts.seed);
  const report: RunReport = {
    ended: null,
    compactions: 0,
    ships: 0,
    pieces: 0,
    levels: 1,
    valuation: 0,
    hypes: [],
    streakDrops: 0,
    copilotOn: 0,
    creeps: 0,
    nearMisses: 0,
    nags: 0,
    nagFaults: 0,
    lines: state.chat.map((c) => c.line),
    ticks: 0,
    unexplainedDrops: 0,
    milestones: [],
    state,
  };
  const cap = opts.maxTicks ?? TICK_CAP;
  let lastStreak = state.streak;
  let lastValuation = state.valuation;
  let chatAt = state.chat.length;
  const firstLevel = state.levelIndex;
  while (!state.over && report.ticks < cap) {
    report.ticks += 1;
    opts.supply?.(state);
    // The beat, the request and the line as they stood when the step began:
    // a check-in is raised before the step reads any input, so these are what
    // it saw. The band asserts a nag never lands anywhere else.
    const beat = state.beat;
    const onFirstLine =
      state.levelIndex === firstLevel && state.requestIndex === 0 && state.lineIndex === 0;
    stepRun(state, bot(state), DT);
    tally(state.events, report);
    if (state.events.some((e) => e.kind === 'message' && e.nag === true)) {
      if (beat !== 'code' || onFirstLine) report.nagFaults += 1;
    }
    if (state.valuation + 1e-9 < lastValuation) throw new Error('valuation fell');
    lastValuation = state.valuation;
    if (state.streak < lastStreak) {
      report.streakDrops += 1;
      const caused = state.events.some(
        (e) =>
          (e.kind === 'key' && !e.ok) || (e.kind === 'line' && !e.ok) || e.kind === 'compaction',
      );
      if (!caused) report.unexplainedDrops += 1;
    }
    lastStreak = state.streak;
    if (!report.hypes.includes(state.hype)) report.hypes.push(state.hype);
    for (let i = chatAt; i < state.chat.length; i++) report.lines.push(state.chat[i]!.line);
    chatAt = state.chat.length;
    report.levels = state.levelIndex + 1;
  }
  report.ended = state.ended ?? null;
  report.valuation = state.valuation;
  report.pieces = state.built.length;
  return report;
}

function tally(events: readonly Event[], report: RunReport): void {
  for (const event of events) {
    if (event.kind === 'compaction') report.compactions += 1;
    else if (event.kind === 'piece') report.ships += 1;
    else if (event.kind === 'ship' && event.nearMiss) report.nearMisses += 1;
    else if (event.kind === 'copilot' && event.on) report.copilotOn += 1;
    else if (event.kind === 'creep') report.creeps += 1;
    else if (event.kind === 'message' && event.nag === true) report.nags += 1;
    else if (event.kind === 'milestone') report.milestones.push(event.name);
  }
}

// ——— the endless seat, played by the corpus ————————————————————————————————
//
// G11 says a seated model is measured on its own bar with the seat swapped
// for the authored pool. The swap here is the corpus itself: real snippets
// of the stack and band the next endless level will draw, put through the
// same code gate a model's answer goes through, and fed the same way. What
// the bar then measures is the feeding, not the model.

/** Gated requests for the endless level at `levelIndex`, drawn from the corpus. */
export function seatFeed(seed: number, tier: Tier, levelIndex: number, count: number): Snippet[] {
  const state = createRun({ seed, tier, endless: true, integration: integrationSeasoning() });
  const corpus = corpusOf(state);
  const def = endlessPeek({ set: DEFAULT_PATTERNS, seed, tier, levelIndex });
  const out: Snippet[] = [];
  for (const snippet of corpus.byStack[def.stack] ?? []) {
    if (out.length >= count) break;
    if (snippet.band < def.bandMin || snippet.band > def.bandMax) continue;
    const gated = gateCode(
      {
        ask: `can you make {product} do the ${snippet.id.replace(/[^a-z]+/gi, ' ').trim()} thing`,
        code: snippet.code,
        title: 'a small thing',
        notes: ['it does the one job'],
      },
      {
        stack: def.stack,
        bandMin: def.bandMin,
        bandMax: def.bandMax,
        corpus,
        set: DEFAULT_PATTERNS.difficulty,
        tolerance: VALUE_TOLERANCE,
        id: `seat-${levelIndex}-${out.length}`,
      },
    );
    if (gated.ok) out.push(gated.snippet);
  }
  return out;
}

/**
 * A `supply` hook that keeps the next level's buffer full, the way the
 * shell's prefetch does. Memoized per level, because the bar calls it every
 * step and the gate is not free.
 */
export function seatFiller(seed: number, tier: Tier, count: number): (state: RunState) => void {
  const done = new Set<number>();
  return (state: RunState) => {
    const next = state.levelIndex + 1;
    if (done.has(next) || suppliedCount(state) > 0) return;
    done.add(next);
    feedRequests(state, seatFeed(seed, tier, next, count), undefined);
  };
}
