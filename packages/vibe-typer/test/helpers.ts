// Shared drive loop for the band and the sim tests. Not a test file itself.

import { DT, botFor, parseBot, type Bot } from '../src/play';
import { createRun, stepRun, type CreateRunOpts } from '../src/sim';
import { DEFAULT_PATTERNS } from '../src/patterns';
import type { Event, RunState, Tier } from '../src/types';

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
  dated?: boolean;
  maxTicks?: number;
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
    ...(opts.dated === true ? { dated: true } : {}),
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
