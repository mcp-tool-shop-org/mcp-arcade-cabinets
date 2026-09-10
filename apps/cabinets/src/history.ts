// Player history for the campaign director (G6): recent calibration,
// coverage cells touched, tapes played. Lives in this browser's localStorage,
// never leaves it, and is never shown as a number on the menu. Missing or
// blocked storage reads as a fresh player.

import type { History, Readout } from '@mcp-arcade-cabinets/house-call';

const KEY = 'mcp-arcade-cabinets.history/v1';
/** Runs that count toward the director's calibration read. */
const RECENT = 3;

interface Stored {
  recent: number[];
  coverage: string[];
  played: string[];
}

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { recent: [], coverage: [], played: [] };
    const s = JSON.parse(raw) as Partial<Stored>;
    return {
      recent: Array.isArray(s.recent) ? s.recent.filter((n) => Number.isFinite(n)) : [],
      coverage: Array.isArray(s.coverage) ? s.coverage : [],
      played: Array.isArray(s.played) ? s.played : [],
    };
  } catch {
    return { recent: [], coverage: [], played: [] };
  }
}

function write(s: Stored): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage blocked: the run still happened; the director just forgets it.
  }
}

export function loadHistory(): History {
  const s = read();
  const recent = s.recent.slice(-RECENT);
  return {
    recentMeanBrier: recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : null,
    coverage: new Set(s.coverage),
    played: new Set(s.played),
  };
}

/** Record a finished House Call run. Called once, at the end screen. */
export function recordRun(name: string, out: Readout): void {
  const s = read();
  s.recent = [...s.recent, out.meanBrier].slice(-RECENT);
  s.coverage = [...new Set([...s.coverage, ...out.coverageCells])];
  if (!s.played.includes(name)) s.played.push(name);
  write(s);
}

export function forgetHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to forget
  }
}
