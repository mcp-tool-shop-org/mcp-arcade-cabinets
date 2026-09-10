import { describe, expect, it } from 'vitest';

import { bossFrame, createRoundState, makeTextCtx, renderRound, revealOnHit } from '../src/index';
import type { Beat, Boss, DrawContext, Round } from '../src/types';

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
  return { tapeId: 'bout_render', duration: 8, beats, seed: 0, waveBounds: [], tier: 0 };
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
    renderRound(ctx, state, { furniture: ['naive-ndjson', 'server the-fixture', 'policy naive'] });
    expect(ctx.texts.length).toBeGreaterThan(0);
    for (const t of ctx.texts) expect(t).not.toMatch(FORBIDDEN);
    // The bout id is hex; it never reaches the canvas, and a live caption is dropped at the end.
    expect(ctx.texts.join('\n')).not.toMatch(/bout_render/);
    expect(ctx.texts.join('\n')).not.toMatch(/leak/);
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
    expect(player(off.calls)).toBe(
      `rect #c8d0dc ${state.player.x} ${state.player.y} ${state.player.w} ${state.player.h}`,
    );
    const lamps = (calls: string[]) => calls.filter((c) => c.startsWith('rect #e8c060'));
    expect(lamps(on.calls)).toEqual(lamps(off.calls));
  });

  it('veils the lower third while blind and draws a boss rect by kind', () => {
    const state = createRoundState(roundOf([]));
    state.blind = 0.5;
    state.boss = {
      kind: 'menu',
      x: 100,
      y: 40,
      w: 120,
      h: 40,
      phase: 0,
      hp: 1,
      alive: true,
      plate: null,
      hitT: Number.POSITIVE_INFINITY,
    };
    const ctx = recordingCtx();
    renderRound(ctx, state);
    expect(ctx.calls.some((c) => c.startsWith('rect rgba(52, 52, 82, 0.88) 0 240'))).toBe(true);
    expect(ctx.calls.some((c) => c.startsWith('rect #3a8a8a 100 40 120 40'))).toBe(true);
  });

  it('asks a sprite context for the same keys for a lie and its honest twin, and the reveal key after the hit', () => {
    const withSprites = () => {
      const base = recordingCtx();
      return Object.assign(base, {
        drawSprite(key: string, x: number, y: number, w: number, h: number) {
          base.calls.push(`sprite ${key} ${x} ${y} ${w} ${h}`);
          return true;
        },
      });
    };
    const lie = createRoundState(roundOf([beat({ id: 'a', lie: true })]));
    const honest = createRoundState(roundOf([beat({ id: 'a', lie: false })]));
    const a = withSprites();
    const b = withSprites();
    renderRound(a, lie);
    renderRound(b, honest);
    expect(a.calls).toEqual(b.calls);
    expect(a.calls.some((c) => c.startsWith('sprite grid '))).toBe(true);
    expect(a.calls.some((c) => c.startsWith('sprite player '))).toBe(true);
    // With a sprite drawn, the class rectangle is not drawn on top of it.
    expect(a.calls.some((c) => c.startsWith('rect #5b8c5a'))).toBe(false);
    revealOnHit(lie.enemies[0]!);
    const c = withSprites();
    renderRound(c, lie);
    expect(c.calls.some((x) => x.startsWith('sprite revealed '))).toBe(true);
    expect(c.calls.some((x) => x.startsWith('sprite grid '))).toBe(false);
  });

  it('picks the boss frame from the rect and the plate, never a fact', () => {
    const boss = (over: Partial<Boss>): Boss => ({
      kind: 'menu',
      x: 0,
      y: 0,
      w: 72,
      h: 48,
      phase: 0,
      hp: 1,
      alive: true,
      plate: null,
      hitT: Number.POSITIVE_INFINITY,
      ...over,
    });
    expect(bossFrame(boss({ kind: 'menu', w: 72 }))).toBe('boss-menu-open');
    expect(bossFrame(boss({ kind: 'menu', w: 16 }))).toBe('boss-menu-slit');
    expect(bossFrame(boss({ kind: 'doorman' }))).toBe('boss-doorman-plate-gone');
    expect(bossFrame(boss({ kind: 'doorman', plate: { x: 0, y: 0, w: 28, h: 10 } }))).toBe(
      'boss-doorman-plate-out',
    );
    expect(bossFrame(boss({ kind: 'whisperer' }))).toBe('boss-whisperer');
  });
});

describe('caption paint', () => {
  it('paints a wave card in furniture colour at the top and a catch in amber low on the field', () => {
    const state = createRoundState(roundOf([]));
    state.caption = { text: 'poison', t: 1, kind: 'wave', line: 'Hush. The Whisperer is working.' };
    const a = recordingCtx();
    renderRound(a, state);
    expect(a.calls.some((c) => c.startsWith('text #c8d0dc 16 40 poison'))).toBe(true);
    expect(
      a.calls.some((c) => c.startsWith('text #c8d0dc 16 58 Hush. The Whisperer is working.')),
    ).toBe(true);
    state.caption = { text: 'tools/call leak', t: 1, kind: 'catch' };
    const b = recordingCtx();
    renderRound(b, state);
    expect(
      b.calls.some((c) => c.startsWith('text #e8a04a 16 ') && c.endsWith('tools/call leak')),
    ).toBe(true);
  });

  it('draws the end-scene voice line above the furniture, never a digit', () => {
    const state = createRoundState(roundOf([]));
    state.scene = {
      tapeId: state.tapeId,
      cleared: [],
      line: 'The cabinet thanks you for not counting.',
    };
    const ctx = makeTextCtx();
    renderRound(ctx, state, { furniture: ['naive-ndjson', 'server the-fixture', 'policy naive'] });
    expect(ctx.texts[0]).toBe('The cabinet thanks you for not counting.');
    expect(ctx.texts.join('\n')).toMatch(/policy naive/);
    for (const t of ctx.texts) expect(t).not.toMatch(FORBIDDEN);
  });

  it('draws a drop as a rectangle until art, same key for any fact', () => {
    const state = createRoundState(roundOf([]));
    state.drops.push({ kind: 'lamp', x: 100, y: 80, w: 14, h: 14, alive: true });
    const a = recordingCtx();
    renderRound(a, state);
    expect(a.calls.some((c) => c.startsWith('rect #f0d878 100 80 14 14'))).toBe(true);
  });
});

describe('hit feedback paint', () => {
  it('flashes the boss white right after a hit and not later', () => {
    const state = createRoundState(roundOf([]));
    const boss = (hitT: number): Boss => ({
      kind: 'whisperer',
      x: 100,
      y: 24,
      w: 96,
      h: 40,
      phase: 0,
      hp: 5,
      alive: true,
      plate: null,
      hitT,
    });
    state.boss = boss(0.02);
    const a = recordingCtx();
    renderRound(a, state);
    expect(a.calls.some((c) => c.startsWith('rect rgba(255, 255, 255, 0.75) 100 24 96 40'))).toBe(
      true,
    );
    state.boss = boss(1);
    const b = recordingCtx();
    renderRound(b, state);
    expect(b.calls.some((c) => c.startsWith('rect rgba(255, 255, 255, 0.75)'))).toBe(false);
  });

  it('blinks the ship during grace and draws it steadily otherwise', () => {
    const state = createRoundState(roundOf([]));
    const drawn = (s: typeof state) => {
      const ctx = recordingCtx();
      renderRound(ctx, s);
      return ctx.calls.some((c) => c.startsWith('rect #c8d0dc'));
    };
    expect(drawn(state)).toBe(true);
    state.grace = 0.5;
    state.playerHitT = 0.05;
    expect(drawn(state)).toBe(true);
    state.playerHitT = 0.15;
    expect(drawn(state)).toBe(false);
    state.grace = 0;
    expect(drawn(state)).toBe(true);
  });
});

describe('boss-down burst', () => {
  it('draws an expanding ring for a moment after a kill and nothing before or after', () => {
    const state = createRoundState(roundOf([]));
    const ring = (s: typeof state) => {
      const ctx = recordingCtx();
      renderRound(ctx, s);
      return ctx.calls.filter((c) => c.startsWith('rect #e8e0c8')).length;
    };
    expect(ring(state)).toBe(0);
    state.t = 10;
    state.bossDownT = 9.9;
    expect(ring(state)).toBe(8);
    state.t = 11;
    expect(ring(state)).toBe(0);
  });
});
