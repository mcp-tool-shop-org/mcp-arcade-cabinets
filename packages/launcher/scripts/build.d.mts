// Types for the pack script, so a test can run the gate instead of describing
// it. `build.mjs` is plain node on purpose — it runs from `prepack` and from
// the root build scripts with no build step of its own — and TypeScript will
// not take an untyped `.mjs` import under `strict`, so its public surface is
// declared here rather than the test asserting against `any`.
//
// Only what a test calls is declared. The script's own internals (the CABINETS
// table, `pack`, `layoutOf`) stay private to it.

/** One cabinet's pack spec, as `CABINETS` holds it. Opaque to a caller. */
export interface CabinetSpec {
  name: string;
  stdio: string;
  public: string[];
}

/**
 * A cabinet a package can be built for. The union lives here, beside the
 * script that owns the table, rather than being re-typed by every caller: a
 * third cabinet is one edit here and a compile error in every Record that
 * has not grown a key for it.
 */
export type Cabinet = 'ghost' | 'vibe';

/** The keys of the pack script's own CABINETS table, in its own order. */
export const CABINET_NAMES: readonly Cabinet[];

/**
 * The typing cabinet's recorded beds, one a corpus stack. Exported so the
 * pack gate's tests read the gate's own list instead of retyping it.
 */
export const VIBE_TRACK_KEYS: string[];

/**
 * The shooter's recorded beds, one a wave and a boss. Exported for the same
 * reason as the list above: the gate's list is the one a test may read.
 */
export const GHOST_TRACK_KEYS: string[];

/** The least a recorded bed may weigh in a tarball, in bytes. */
export const BED_MIN_BYTES: number;

/** Write the lines to stderr and `process.exit(1)`. */
export function halt(lines: string[]): never;

/** The arguments, or `{ bad }` naming what was wrong with them. */
export function parsePackArgs(
  argv: readonly string[],
): { cabinet: string; check: boolean; out?: string; bad?: undefined } | { bad: string };

/**
 * The gate `prepack` runs over a `dist` that is already written. Halts by
 * writing to `process.stderr` and calling `process.exit(1)`; returns the
 * cabinet's spec when everything checks out.
 */
export function checkDist(opts: { cabinet: string; out?: string }): Promise<CabinetSpec>;
