// What both cabinets' servers need to read an operator's environment
// honestly. It is a leaf on purpose: `server.ts` and `server-vibe.ts` are
// two entries with a top-level side effect each, so neither may import the
// other, and a second copy of this rule in the other file is exactly the
// kind of hand-copy the two cabinets keep finding out of step.

/**
 * A whole number out of an environment variable, or null when it is not one.
 * `CABINET_TIER=abc` and `CABINET_SEED=1.5` are **absent**, not the default:
 * a fallback reached through `NaN` reads afterwards as though the operator
 * asked for the default, which they did not. A leading minus is allowed
 * because the sim folds a seed through `>>> 0` and a negative one is an
 * ordinary seed to it.
 */
export function wholeEnv(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const text = raw.trim();
  if (!/^-?\d+$/.test(text)) return null;
  const n = Number(text);
  return Number.isSafeInteger(n) ? n : null;
}

/** Set, and set to something: an empty variable is the operator saying nothing. */
export function setEnv(raw: string | undefined): raw is string {
  return raw !== undefined && raw.trim() !== '';
}
