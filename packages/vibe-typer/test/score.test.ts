import { describe, expect, it } from 'vitest';

import { DEFAULT_PATTERNS } from '../src/patterns';
import {
  copilotReady,
  hypeFor,
  hypeLadder,
  milestoneCrossed,
  pay,
  pitchFor,
  PITCH_CAP,
} from '../src/score';

const SET = DEFAULT_PATTERNS.score;

describe('the scoreboard', () => {
  it('steps hype by streak and never below one', () => {
    expect(hypeFor(0, SET)).toBe(1);
    expect(hypeFor(2, SET)).toBe(1);
    for (const step of SET.hypeSteps) {
      expect(hypeFor(step.streak, SET)).toBe(step.hype);
      expect(hypeFor(step.streak + 1, SET)).toBeGreaterThanOrEqual(step.hype);
    }
    const top = SET.hypeSteps[SET.hypeSteps.length - 1]!;
    expect(hypeFor(top.streak + 100, SET)).toBe(top.hype);
  });

  it('caps hype in hardcore and lists the ladder a tier can show', () => {
    expect(hypeFor(1000, SET, 3)).toBe(SET.hardcore.hypeCap);
    expect(Math.max(...hypeLadder(SET, 3))).toBe(SET.hardcore.hypeCap);
    expect(Math.max(...hypeLadder(SET, 0))).toBeGreaterThan(SET.hardcore.hypeCap);
    expect(hypeLadder(SET, 0)).toContain(1);
  });

  it('pays the value times the hype, and a little more in hardcore', () => {
    expect(pay(10, 4, 3)).toBe(22);
    expect(pay(0, 4, 1)).toBe(4);
    expect(pay(0, 4, 1, 3, SET)).toBe(4 * SET.hardcore.shipMultiplier);
  });

  it('crosses a milestone once, in order', () => {
    const first = SET.milestones[0]!;
    expect(milestoneCrossed(0, first.at, SET).map((m) => m.name)).toEqual([first.name]);
    expect(milestoneCrossed(first.at, first.at + 1, SET)).toEqual([]);
    const all = milestoneCrossed(0, SET.milestones[SET.milestones.length - 1]!.at, SET);
    expect(all.map((m) => m.name)).toEqual(SET.milestones.map((m) => m.name));
    for (const milestone of SET.milestones) expect(milestone.name).not.toMatch(/\d/);
  });

  it('offers Copilot at a streak and never in hardcore', () => {
    expect(copilotReady(SET.copilotStreak - 1, 0, SET)).toBe(false);
    expect(copilotReady(SET.copilotStreak, 0, SET)).toBe(true);
    expect(copilotReady(SET.copilotStreak + 9, 3, SET)).toBe(false);
  });

  it('climbs the keystroke pitch to an octave and holds', () => {
    expect(pitchFor(0)).toBe(0);
    expect(pitchFor(5)).toBe(5);
    expect(pitchFor(PITCH_CAP + 40)).toBe(PITCH_CAP);
  });
});
