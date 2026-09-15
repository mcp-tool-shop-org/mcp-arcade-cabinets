// Shared drive loop for the band and the sim tests. Not a test file itself.

import { gateCode, VALUE_TOLERANCE } from '../src/codegate';
import { endlessPeek } from '../src/level';
import { DT, botFor, parseBot, type Bot } from '../src/play';
import {
  corpusOf,
  createRun,
  feedRequests,
  stepRun,
  suppliedCount,
  type CreateRunOpts,
} from '../src/sim';
import { DEFAULT_PATTERNS } from '../src/patterns';
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
  /**
   * Called before every step, so a bar can play the endless seat: it feeds
   * gated requests into the run the way the shell's prefetch does (G13).
   * Absent, and the run is the run this cabinet has always played.
   */
  supply?: (state: RunState) => void;
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
    ...(opts.level !== undefined ? { levelIndex: opts.level } : {}),
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
  while (!state.over && report.ticks < cap) {
    report.ticks += 1;
    opts.supply?.(state);
    stepRun(state, bot(state), DT);
    tally(state.events, report);
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
  const state = createRun({ seed, tier, endless: true });
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
