// The guard both stdio entries put between the timer and the sim. A throw
// inside a timer callback is an uncaught exception: it tears down a listed
// server mid-session and prints a raw stack with machine paths on stderr,
// which is the one thing every other miss in those files avoids.

import { describe, expect, it } from 'vitest';

import { createStepFaults, guardStep, STEP_FAULT_LINE } from '../src/step-guard';

describe('the step guard', () => {
  it('swallows a throw from the sim, counts it, and keeps stepping', () => {
    const said: string[] = [];
    const faults = createStepFaults();
    let bad = true;
    const seen: number[] = [];
    const step = guardStep(
      (dt) => {
        if (bad) throw new Error(`ENOENT: no such file, open 'C:\\Users\\someone\\tape.json'`);
        seen.push(dt);
      },
      faults,
      (line) => void said.push(line),
    );

    // Without the guard this is the throw that leaves the timer callback.
    expect(() => step(0.033)).not.toThrow();
    expect(faults.count).toBe(1);
    expect(said).toEqual([STEP_FAULT_LINE]);

    // Said once: a timer that faults thirty times a second must not flood.
    for (let i = 0; i < 30; i++) step(0.033);
    expect(faults.count).toBe(31);
    expect(said).toHaveLength(1);

    // The next tick still calls the sim, so a bad round is a quiet round.
    bad = false;
    step(0.05);
    expect(seen).toEqual([0.05]);
    expect(faults.count).toBe(31);
  });

  it('says a rule and never a machine path, a stack or the error', () => {
    const said: string[] = [];
    const faults = createStepFaults();
    guardStep(
      () => {
        throw new Error(`EACCES: /home/someone/.config/cabinet, at step (/app/server.js:12:3)`);
      },
      faults,
      (line) => void said.push(line),
    )(0.033);
    const line = said[0]!;
    expect(line).toBe(STEP_FAULT_LINE);
    expect(line).not.toMatch(/[/\\]/);
    expect(line).not.toMatch(/\d/);
    expect(line).not.toMatch(/EACCES|Error|at step/);
    expect(line.endsWith('\n')).toBe(true);
  });

  it('a step that never throws is the step itself, and the counter stays at nothing', () => {
    const faults = createStepFaults();
    const seen: number[] = [];
    const step = guardStep(
      (dt) => void seen.push(dt),
      faults,
      () => {
        throw new Error('nothing to say');
      },
    );
    step(0.01);
    step(0.02);
    expect(seen).toEqual([0.01, 0.02]);
    expect(faults).toEqual({ count: 0, said: false });
  });
});
