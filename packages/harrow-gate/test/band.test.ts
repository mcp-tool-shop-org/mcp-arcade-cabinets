// The persona band. Every bar here is the andon: a failure stops the build.
//
// ai-playtest's persona profiles count a play style only if it separates: its
// target signal beats control by the noise floor, and no other persona in the
// profile goes further on it. Before anyone pays for a model run, this proves
// the town gives every style something to move, by playing each style as a
// scripted bot and applying the same rule. When a bar fails, the town or the
// bot moves, never the bar.
//
// The profiles, targets and floors are copied from ai-playtest
// (src/personas.ts): change them there, change them here in the same pass.

import { describe, expect, it } from 'vitest';
import { BOTS, playBot, type BotRun } from '../src/bots';
import { offPath, signals } from '../src/stats';

type Target = { signal: string; direction: 'high' | 'low' };

const PROFILES: Record<string, Record<string, Target>> = {
  scientific: {
    novice: { signal: 'rejectedRate', direction: 'low' },
    briefed: { signal: 'turnsToFinish', direction: 'low' },
    systematic: { signal: 'repeatRate', direction: 'high' },
  },
  bughunter: {
    cartographer: { signal: 'novelStates', direction: 'high' },
    closer: { signal: 'turnsPlayed', direction: 'low' },
    'boundary-pusher': { signal: 'rejectedRate', direction: 'high' },
    'continuity-auditor': { signal: 'share:examine,talk', direction: 'high' },
  },
  player: {
    runner: { signal: 'turnsToFinish', direction: 'low' },
    reader: { signal: 'share:talk,examine', direction: 'high' },
    completionist: { signal: 'novelStates', direction: 'high' },
    grinder: { signal: 'share:fight,wait', direction: 'high' },
    quitter: { signal: 'share:quit', direction: 'high' },
    tinkerer: { signal: 'share:use', direction: 'high' },
  },
  gaming: {
    'genre-veteran': { signal: 'share:save,menu', direction: 'high' },
    speedrunner: { signal: 'turnsToFinish', direction: 'low' },
    theorycrafter: { signal: 'share:examine', direction: 'high' },
    'returning-player': { signal: 'share:help', direction: 'high' },
  },
};

const COUNTS = new Set(['novelStates', 'turnsPlayed', 'turnsToFinish']);
const NOISE = { share: 0.1, count: 0.2 };

function value(run: BotRun, signal: string, control: BotRun): number | null {
  const g = signals(run.turns);
  if (signal.startsWith('share:'))
    return signal
      .slice(6)
      .split(',')
      .reduce((a, t) => a + (g.share[t] ?? 0), 0);
  if (signal === 'offPath') return offPath(run.turns, control.turns);
  const v = (g as unknown as Record<string, number | null>)[signal];
  return v ?? null;
}

const control = playBot(BOTS.control!);
const replicate = playBot(BOTS.replicate!);

describe('the persona band on the baseline town', () => {
  for (const [profile, targets] of Object.entries(PROFILES)) {
    describe(profile, () => {
      const runs = Object.fromEntries(Object.keys(targets).map((id) => [id, playBot(BOTS[id]!)]));
      for (const [id, target] of Object.entries(targets)) {
        it(`${id} plays distinctly on ${target.signal}`, () => {
          const v = value(runs[id]!, target.signal, control);
          const c = value(control, target.signal, control);
          expect(v, `${id} has no ${target.signal}`).not.toBeNull();
          expect(c, `control has no ${target.signal}`).not.toBeNull();
          const r = value(replicate, target.signal, control);
          const measured = r === null ? 0 : Math.abs(r - c!);
          const base = COUNTS.has(target.signal) ? Math.max(1, NOISE.count * c!) : NOISE.share;
          const floor = Math.max(base, measured);
          const gap = target.direction === 'high' ? v! - c! : c! - v!;
          expect(
            gap,
            `${id}: ${target.signal} ${v} vs control ${c}, floor ${floor}`,
          ).toBeGreaterThanOrEqual(floor);
          for (const rival of Object.keys(targets)) {
            if (rival === id) continue;
            const rv = value(runs[rival]!, target.signal, control);
            if (rv === null) continue;
            const further = target.direction === 'high' ? rv > v! : rv < v!;
            expect(
              further,
              `${rival} went further than ${id} on ${target.signal}: ${rv} vs ${v}`,
            ).toBe(false);
          }
        });
      }
    });
  }

  it('replicate plays exactly what control plays, so the measured floor is zero', () => {
    expect(replicate.turns.map((t) => t.input)).toEqual(control.turns.map((t) => t.input));
  });

  it('control is a plain player: it wins, and it makes the ordinary mistakes a novice avoids', () => {
    expect(control.state.won).toBe(true);
    expect(signals(control.turns).rejectedRate).toBeGreaterThan(0);
  });
});
