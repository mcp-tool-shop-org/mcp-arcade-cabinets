// One sim step, guarded. Both stdio entries drive their sim from a timer,
// and a throw inside a timer callback is an uncaught exception: it tears
// down a listed server mid-session and prints a raw stack with machine
// paths on stderr — which is exactly what the menu-shaped misses in both
// servers take care never to do. A malformed overlay tape that survived
// loading, or a state the sim did not expect, is enough.
//
// The rule: count the fault, say it once in path-free words, and keep
// stepping. The next tick calls the sim again, and the shooter's own step
// restarts the round at the scene, so a round that cannot be stepped is a
// quiet round rather than a dead server. Said once, because a timer that
// faults at thirty frames a second would otherwise flood stderr.
//
// This is its own module rather than a helper inside `server.ts` because
// `server-vibe.ts` may not import that file: the bottom of it is a
// top-level side effect a bundler must keep, and importing it would drag
// the shooter's whole graph into the typing cabinet's bundle.

export interface StepFaults {
  /** Steps that threw and were swallowed since the server started. */
  count: number;
  /** Whether the one line has been written. */
  said: boolean;
}

export function createStepFaults(): StepFaults {
  return { count: 0, said: false };
}

/** The one line a fault writes, in the same words as the other misses here. */
export const STEP_FAULT_LINE = 'the round faulted and was not stepped; the cabinet plays on\n';

/**
 * Faults past which the round is called stuck, and the tools stop promising
 * beats a frozen round will never take.
 *
 * A couple of ticks, not one: a single fault is a bad tick the next tick may
 * step straight through, and the shooter's own step restarts the round at
 * the scene. Three in a row is a round that is not coming back on its own,
 * and the only surface that knew it was a line on stderr an MCP client
 * cannot read.
 */
export const STUCK_FAULTS = 3;

/** Whether the round has stopped moving. The counter already existed; this is the reading. */
export function isStuck(faults: StepFaults): boolean {
  return faults.count >= STUCK_FAULTS;
}

/**
 * What every proposing lever answers while the round is stuck, and the extra
 * line `view` prints. Both cabinets say the same rule in the same words, and
 * these live here rather than in either cabinet for the reason at the top of
 * this file: this is the leaf both sides may import.
 */
export const STUCK_ANSWER = 'the round is not moving; nothing was queued';

/** The extra `view` line while the round is stuck. Word-only, like every other line. */
export const STUCK_VIEW_LINE = 'round the round is not moving';

/**
 * Wrap a step so nothing thrown by the sim escapes the timer callback.
 * `write` is the stderr sink, taken as an argument so a test can read the
 * line without a spawn.
 */
export function guardStep(
  step: (dt: number) => void,
  faults: StepFaults,
  write: (line: string) => void = (line) => void process.stderr.write(line),
): (dt: number) => void {
  return (dt: number) => {
    try {
      step(dt);
    } catch {
      faults.count += 1;
      if (!faults.said) {
        faults.said = true;
        write(STEP_FAULT_LINE);
      }
    }
  };
}
