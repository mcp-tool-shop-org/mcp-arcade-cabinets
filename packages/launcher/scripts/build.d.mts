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

/** The arguments, or `{ bad }` naming what was wrong with them. */
export function parsePackArgs(
  argv: string[],
): { cabinet: string; check: boolean; out?: string } | { bad: string };

/**
 * The gate `prepack` runs over a `dist` that is already written. Halts by
 * writing to `process.stderr` and calling `process.exit(1)`; returns the
 * cabinet's spec when everything checks out.
 */
export function checkDist(opts: { cabinet: string; out?: string }): Promise<CabinetSpec>;
