// The campaign director (lock G6, finding 13): sequences fixed tapes by the
// player's measured calibration. Not a shuffle, not a leaderboard. Fixture
// tapes first; seat tapes and live-server tapes unlock as reliability earns
// them. Deterministic given the same history.

import type { Tape } from './types';

export interface CampaignEntry {
  name: string;
  tape: Tape;
}

export interface History {
  /** Mean Brier over recent completed runs (lower is better). */
  recentMeanBrier: number | null;
  /** Coverage cells already touched across all runs. */
  coverage: ReadonlySet<string>;
  /** Tape names already played. */
  played: ReadonlySet<string>;
}

/** Difficulty tier of a tape from its header facts alone. */
export function tier(tape: Tape): 0 | 1 | 2 {
  if (tape.target_kind === 'fixture' || tape.target_kind === 'docker') {
    return tape.agent_policy === 'naive' || tape.agent_policy === 'task-only' ? 0 : 1;
  }
  return 2; // a live server
}

/** The highest tier the player has earned. Calibration opens doors; volume does not. */
export function unlockedTier(history: History): 0 | 1 | 2 {
  const b = history.recentMeanBrier;
  if (b === null) return 0;
  if (b <= 0.2) return 2;
  if (b <= 0.4) return 1;
  return 0;
}

function cellsOf(tape: Tape): string[] {
  const server = tape.server_name ?? tape.target_kind;
  return tape.atoms.map((a) => `${server}|${a.id}|${tape.agent_policy}`);
}

/**
 * Pick the next tape: within the unlocked tiers, prefer the tape that adds the
 * most uncovered cells; break ties by name for determinism. Returns null when
 * nothing unplayed is unlocked.
 */
export function nextTape(
  campaign: readonly CampaignEntry[],
  history: History,
): CampaignEntry | null {
  const maxTier = unlockedTier(history);
  const candidates = campaign
    .filter((e) => !history.played.has(e.name) && tier(e.tape) <= maxTier)
    .map((e) => ({
      entry: e,
      gain: cellsOf(e.tape).filter((c) => !history.coverage.has(c)).length,
    }))
    .sort((a, b) => b.gain - a.gain || a.entry.name.localeCompare(b.entry.name));
  return candidates[0]?.entry ?? null;
}
