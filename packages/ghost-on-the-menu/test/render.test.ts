import { describe, expect, it } from 'vitest';

import { createRoundState, makeTextCtx, renderRound, revealOnHit } from '../src/index';
import type { Beat, DrawContext, Round } from '../src/types';

/** Records every fill call with the fill style in force, so two frames can be compared. */
function recordingCtx(): DrawContext & { calls: string[] } {
  const calls: string[] = [];
  const ctx = {
    calls,
    fillStyle: '#000000',
    font: '14px sans-serif',
    fillRect(x: number, y: number, w: number, h: number) {
      calls.push(`rect ${ctx.fillStyle} ${x} ${y} ${w} ${h}`);
    },
    fillText(text: string, x: number, y: number) {
      calls.push(`text ${ctx.fillStyle} ${x} ${y} ${text}`);
    },
  };
  return ctx;
}

function beat(over: Partial<Beat> & Pick<Beat, 'id' | 'lie'>): Beat {
  return {
    t: 0,
    x: 240,
    sprite: 'grid',
    members: 1,
    source: {
      atom: 'poison.follow_through',
      method: 'tools/call',
      note: 'tools/call echo',
      index: 0,
    },
    ...over,
  };
}

function roundOf(beats: Beat[]): Round {
  return { tapeId: 'bout_render', duration: 8, beats, seed: 0, waveBounds: [] };
}

const FORBIDDEN = /\d|\b(nrp|integrity|utility|attack_success|pass|fail|score|cleared)\b/i;

describe('renderRound', () => {
  it('draws a lie and an honest sprite identically before the hit (G7)', () => {
    const lie = createRoundState(roundOf([beat({ id: 'a', lie: true })]));
    const honest = createRoundState(roundOf([beat({ id: 'a', lie: false })]));
    const a = recordingCtx();
    const b = recordingCtx();
    renderRound(a, lie);
    renderRound(b, honest);
    expect(a.calls).toEqual(b.calls);
  });

  it('draws the trophy in the reveal paint after the hit and never a cleared line', () => {
    const state = createRoundState(roundOf([beat({ id: 'a', lie: true })]));
    revealOnHit(state.enemies[0]!);
    const ctx = recordingCtx();
    renderRound(ctx, state);
    expect(ctx.calls.some((c) => c.startsWith('rect #e8a04a'))).toBe(true);
    expect(ctx.calls.filter((c) => c.startsWith('text'))).toEqual([]);
  });

  it('puts no digit and no grade word on screen through a whole round', () => {
    const state = createRoundState(roundOf([beat({ id: 'a', lie: true })]));
    state.caption = { text: 'tools/call leak', t: 1 };
    state.scene = { tapeId: state.tapeId, cleared: ['a'] };
    const ctx = makeTextCtx();
    renderRound(ctx, state, { furniture: ['server the-fixture', 'policy naive'] });
    expect(ctx.texts.length).toBeGreaterThan(0);
    for (const t of ctx.texts) expect(t).not.toMatch(FORBIDDEN);
    expect(ctx.texts.join('\n')).toMatch(/tape bout_render/);
    expect(ctx.texts.join('\n')).toMatch(/policy naive/);
  });

  it('draws one lit lamp per life and the rest dark, as rectangles', () => {
    const state = createRoundState(roundOf([]));
    state.lives = 1;
    const ctx = recordingCtx();
    renderRound(ctx, state);
    const lit = ctx.calls.filter((c) => c.startsWith('rect #e8c060')).length;
    const dark = ctx.calls.filter((c) => c.startsWith('rect #2a2a34')).length;
    expect(lit).toBe(1);
    expect(dark).toBe(2);
  });

  it('shake moves the field and the shake-off toggle removes it; the bezel never moves', () => {
    const state = createRoundState(roundOf([]));
    state.shake = 1;
    const on = recordingCtx();
    const off = recordingCtx();
    renderRound(on, state, { shake: true, intensity: 'loud' });
    renderRound(off, state, { shake: false, intensity: 'loud' });
    const player = (calls: string[]) => calls.find((c) => c.startsWith('rect #c8d0dc'));
    expect(player(on.calls)).not.toBe(player(off.calls));
    expect(player(off.calls)).toBe(`rect #c8d0dc ${state.player.x} ${state.player.y} 16 12`);
    const lamps = (calls: string[]) => calls.filter((c) => c.startsWith('rect #e8c060'));
    expect(lamps(on.calls)).toEqual(lamps(off.calls));
  });

  it('veils the lower third while blind and draws a boss rect by kind', () => {
    const state = createRoundState(roundOf([]));
    state.blind = 0.5;
    state.boss = { kind: 'menu', x: 100, y: 40, w: 120, h: 40, phase: 0, hp: 1, alive: true };
    const ctx = recordingCtx();
    renderRound(ctx, state);
    expect(ctx.calls.some((c) => c.startsWith('rect rgba(52, 52, 82, 0.88) 0 240'))).toBe(true);
    expect(ctx.calls.some((c) => c.startsWith('rect #3a8a8a 100 40 120 40'))).toBe(true);
  });
});
