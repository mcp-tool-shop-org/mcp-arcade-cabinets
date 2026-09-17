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
