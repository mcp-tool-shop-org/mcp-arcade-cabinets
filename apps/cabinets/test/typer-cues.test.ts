import { describe, expect, it } from 'vitest';

import type { Event } from '@mcp-arcade-cabinets/vibe-typer';
import {
  CONFETTI_MAX,
  EVENT_KINDS,
  FLASH_SHIP,
  SHAKE_BAD_LINE,
  SHAKE_COMPACTION,
  SHAKE_LONG_LINE,
  SHAKE_SCALE_MAX,
  cueFor,
  cuesFor,
  rateFor,
  shakeFor,
} from '../src/typer-cues';

/** One event of every kind, so the runtime half of the table is walked. */
const EVERY: Event[] = [
  { kind: 'key', ok: true, pitch: 0 },
  { kind: 'key', ok: false, pitch: 0 },
  { kind: 'line', ok: true },
  { kind: 'line', ok: false },
  { kind: 'hmm' },
  { kind: 'piece', size: 12 },
  { kind: 'ship', nearMiss: false },
  { kind: 'ship', nearMiss: true },
  { kind: 'message', who: 'user' },
  { kind: 'message', who: 'user', nag: true },
  { kind: 'message', who: 'agent' },
  { kind: 'compaction', streak: 4, hype: 2 },
  { kind: 'milestone', name: 'seed' },
  { kind: 'copilot', on: true },
  { kind: 'copilot', on: false },
  { kind: 'creep' },
  { kind: 'sync', on: true },
  { kind: 'sync', on: false },
  { kind: 'over', how: 'shipped' },
  { kind: 'over', how: 'context' },
];

describe('the cue table', () => {
  it('answers every event kind', () => {
    for (const event of EVERY) {
      const cue = cueFor(event);
      expect(cue.name, event.kind).toBeTruthy();
      expect(cue.pitch).toBeGreaterThanOrEqual(0);
      expect(cue.shake).toBeGreaterThanOrEqual(0);
      expect(cue.flash).toBeLessThanOrEqual(FLASH_SHIP);
      expect(cue.confetti).toBeLessThanOrEqual(CONFETTI_MAX);
    }
  });

  it('covers the union: every kind the package has is in the list and answered', () => {
    const listed = new Set(EVENT_KINDS);
    const walked = new Set(EVERY.map((e) => e.kind));
    expect([...walked].sort()).toEqual([...listed].sort());
    // A kind added to the package with no cue is a type error in cueFor's
    // `never` default; this is the same check at run time.
    expect(EVENT_KINDS).toHaveLength(12);
  });

  it('gives a distinct name to each side of the events that have two', () => {
    expect(cueFor({ kind: 'key', ok: true, pitch: 3 }).name).toBe('key');
    expect(cueFor({ kind: 'key', ok: false, pitch: 3 }).name).toBe('keybad');
    expect(cueFor({ kind: 'line', ok: true }).name).toBe('sent');
    expect(cueFor({ kind: 'line', ok: false }).name).toBe('hmm');
    expect(cueFor({ kind: 'message', who: 'user' }).name).toBe('ping');
    expect(cueFor({ kind: 'message', who: 'user', nag: true }).name).toBe('nag');
    expect(cueFor({ kind: 'message', who: 'agent' }).name).toBe('blip');
    // The agent's answer to a check-in is the agent speaking, and sounds it.
    expect(cueFor({ kind: 'message', who: 'agent', nag: true }).name).toBe('blip');
    expect(cueFor({ kind: 'copilot', on: true }).name).toBe('shimmerIn');
    expect(cueFor({ kind: 'copilot', on: false }).name).toBe('shimmerOut');
    expect(cueFor({ kind: 'sync', on: true }).name).toBe('syncIn');
    expect(cueFor({ kind: 'sync', on: false }).name).toBe('syncOut');
    expect(cueFor({ kind: 'over', how: 'shipped' }).name).toBe('endShipped');
    expect(cueFor({ kind: 'over', how: 'context' }).name).toBe('endContext');
  });

  it('picks the grazed deploy when the bar was nearly out', () => {
    const clean = cueFor({ kind: 'ship', nearMiss: false });
    const grazed = cueFor({ kind: 'ship', nearMiss: true });
    expect(clean.name).toBe('deploy');
    expect(grazed.name).toBe('grazed');
    expect(grazed.flash).toBe(clean.flash);
    expect(grazed.confetti).toBe(clean.confetti);
  });

  it('turns a streak into a rate of an octave at most', () => {
    expect(rateFor(0)).toBe(1);
    expect(rateFor(12)).toBeCloseTo(2, 10);
    expect(rateFor(7)).toBeCloseTo(Math.pow(2, 7 / 12), 10);
    expect(cueFor({ kind: 'key', ok: true, pitch: 5 }).pitch).toBe(5);
  });

  it('shakes a bad line and a compaction, and never a bad key', () => {
    expect(cueFor({ kind: 'line', ok: false }).shake).toBe(SHAKE_BAD_LINE);
    expect(cueFor({ kind: 'hmm' }).shake).toBe(SHAKE_BAD_LINE);
    expect(cueFor({ kind: 'compaction', streak: 0, hype: 0 }).shake).toBe(SHAKE_COMPACTION);
    expect(cueFor({ kind: 'key', ok: false, pitch: 0 }).shake).toBe(0);
    expect(cueFor({ kind: 'key', ok: true, pitch: 0 }).shake).toBe(0);
    expect(cueFor({ kind: 'piece', size: 40 }).shake).toBe(0);
  });

  it('scales the shake by the line, and stops scaling at the cap', () => {
    expect(shakeFor(SHAKE_BAD_LINE, 0)).toBe(SHAKE_BAD_LINE);
    expect(shakeFor(SHAKE_BAD_LINE, SHAKE_LONG_LINE)).toBeCloseTo(
      SHAKE_BAD_LINE * SHAKE_SCALE_MAX,
      10,
    );
    expect(shakeFor(SHAKE_BAD_LINE, SHAKE_LONG_LINE * 4)).toBeCloseTo(
      SHAKE_BAD_LINE * SHAKE_SCALE_MAX,
      10,
    );
    expect(shakeFor(0, 200)).toBe(0);
  });

  it('flashes and throws confetti on the ship alone', () => {
    for (const event of EVERY) {
      const cue = cueFor(event);
      if (cue.name === 'deploy' || cue.name === 'grazed') {
        expect(cue.flash).toBe(FLASH_SHIP);
        expect(cue.confetti).toBe(CONFETTI_MAX);
        continue;
      }
      expect(cue.flash, cue.name).toBe(0);
      expect(cue.confetti, cue.name).toBe(0);
    }
  });

  it('puts the milestone word on the board and nothing else there', () => {
    expect(cueFor({ kind: 'milestone', name: 'unicorn' }).toast).toBe('unicorn');
    expect(cueFor({ kind: 'piece', size: 4 }).toast).toBe('');
  });

  it('says a step bad line once, and every keystroke of it', () => {
    const cues = cuesFor([
      { kind: 'key', ok: true, pitch: 1 },
      { kind: 'key', ok: true, pitch: 2 },
      { kind: 'line', ok: false },
      { kind: 'hmm' },
      { kind: 'message', who: 'agent' },
    ]);
    expect(cues.map((c) => c.name)).toEqual(['key', 'key', 'hmm', 'blip']);
  });

  it('leaves a check-in as quiet as any other line', () => {
    const nag = cueFor({ kind: 'message', who: 'user', nag: true });
    expect(nag.shake).toBe(0);
    expect(nag.flash).toBe(0);
    expect(nag.confetti).toBe(0);
    expect(nag.toast).toBe('');
  });

  it('carries the built piece size through to the pop', () => {
    expect(cueFor({ kind: 'piece', size: 31.5 }).size).toBe(31.5);
  });
});
