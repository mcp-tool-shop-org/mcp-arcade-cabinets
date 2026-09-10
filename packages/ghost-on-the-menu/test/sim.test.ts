import { describe, expect, it } from 'vitest';

import { createRoundState, revealOnHit, stepRound, type Enemy, type Round } from '../src/index';
import { PARKING_Y } from '../src/types';

function enemy(over: Partial<Enemy> & Pick<Enemy, 'id' | 'lie'>): Enemy {
  return {
    x: 100,
    y: 80,
    w: 16,
    h: 12,
    vx: 0,
    vy: 0,
    hoverY: 80,
    sprite: 'grid',
    revealed: false,
    alive: true,
    tEnter: 0,
    members: 1,
    mode: 'hover',
    pathT: 0,
    path: [],
    caughtY: PARKING_Y,
    fireAt: Number.POSITIVE_INFINITY,
    dieAt: 0,
    ...over,
  };
}

function roundOf(over: Partial<Round> & Pick<Round, 'tapeId' | 'duration'>): Round {
  return { beats: [], seed: 0, waveBounds: [], tier: 0, ...over };
}

const FORBIDDEN_CAPTION = /\d|\b(pass|fail|score)\b/i;

describe('revealOnHit', () => {
  it('flips a lie and leaves an honest sprite unmarked', () => {
    const lie = enemy({ id: 'lie', lie: true });
    const honest = enemy({ id: 'honest', lie: false });
    revealOnHit(lie);
    revealOnHit(honest);
    expect(lie.revealed).toBe(true);
    expect(lie.mode).toBe('caught');
    expect(lie.alive).toBe(true);
    expect(honest.revealed).toBe(false);
    expect(honest.mode).toBe('hover');
  });
});

describe('stepRound', () => {
  it('reveals a lie only when a shot hits it; the lie stays alive as a trophy', () => {
    const state = createRoundState(
      roundOf({
        tapeId: 'bout_hit',
        duration: 8,
        beats: [
          {
            id: 'poison.follow_through:followed',
            t: 0,
            x: 240,
            sprite: 'grid',
            lie: true,
            members: 1,
            source: {
              atom: 'poison.follow_through',
              method: 'tools/call',
              note: 'tools/call leak',
              index: 0,
            },
          },
        ],
      }),
    );
    const target = state.enemies[0]!;
    target.y = 80;
    target.tEnter = 0;
    state.player.x = target.x;
    expect(target.revealed).toBe(false);
    let guard = 0;
    while (!target.revealed && guard < 200) {
      stepRound(state, { left: false, right: false, fire: true }, 1 / 30);
      guard += 1;
    }
    expect(target.revealed).toBe(true);
    expect(target.alive).toBe(true);
    expect(target.mode).toBe('caught');
    expect(state.cleared).toContain(target.id);
    expect(state.cleared).toEqual(['poison.follow_through:followed']);
  });

  it('honest sprites despawn after the pop, not on the hit', () => {
    const state = createRoundState(
      roundOf({
        tapeId: 'bout_pop',
        duration: 8,
        beats: [
          {
            id: 'inspect.tools_list:grid:0',
            t: 0,
            x: 240,
            sprite: 'grid',
            lie: false,
            members: 1,
            source: {
              atom: 'inspect.tools_list',
              method: 'tools/call',
              note: 'tools/call echo',
              index: 0,
            },
          },
        ],
      }),
    );
    const target = state.enemies[0]!;
    target.y = 80;
    state.player.x = target.x;
    let guard = 0;
    while (target.mode !== 'dying' && guard < 200) {
      stepRound(state, { left: false, right: false, fire: true }, 1 / 30);
      guard += 1;
    }
    expect(target.mode).toBe('dying');
    expect(target.alive).toBe(true);
    expect(target.revealed).toBe(false);
    stepRound(state, { left: false, right: false, fire: false }, 0.1);
    expect(target.alive).toBe(true);
    stepRound(state, { left: false, right: false, fire: false }, 0.06);
    expect(target.alive).toBe(false);
    expect(state.cleared).toEqual([]);
  });

  it('hitstop freezes the world for its duration', () => {
    const state = createRoundState(
      roundOf({
        tapeId: 'bout_stop',
        duration: 8,
        beats: [
          {
            id: 'poison.follow_through:followed',
            t: 0,
            x: 240,
            sprite: 'grid',
            lie: true,
            members: 1,
            source: {
              atom: 'poison.follow_through',
              method: 'tools/call',
              note: 'tools/call leak',
              index: 0,
            },
          },
        ],
      }),
    );
    const target = state.enemies[0]!;
    target.y = 80;
    state.player.x = target.x;
    let guard = 0;
    while (!target.revealed && guard < 200) {
      stepRound(state, { left: false, right: false, fire: true }, 1 / 30);
      guard += 1;
    }
    expect(state.hitstop).toBeGreaterThan(0);
    const t0 = state.t;
    const y0 = target.y;
    const x0 = state.player.x;
    stepRound(state, { left: true, right: false, fire: true }, 0.05);
    expect(state.t).toBe(t0);
    expect(target.y).toBe(y0);
    expect(state.player.x).toBe(x0);
    expect(state.hitstop).toBeLessThan(0.12);
    expect(state.hitstop).toBeGreaterThan(0);
  });

  it('caption is the wire note, with no digit or grade word', () => {
    const state = createRoundState(
      roundOf({
        tapeId: 'bout_cap',
        duration: 8,
        beats: [
          {
            id: 'protocol.unlisted_call:ghost_answered',
            t: 0,
            x: 240,
            sprite: 'grid',
            lie: true,
            members: 1,
            source: {
              atom: 'protocol.unlisted_call',
              method: 'tools/call',
              note: 'tools/call arcade.unlisted.GOLDEN  [ghost probe: name absent from tools/list]',
              index: 0,
            },
          },
        ],
      }),
    );
    const target = state.enemies[0]!;
    target.y = 80;
    state.player.x = target.x;
    let guard = 0;
    while (!state.caption && guard < 200) {
      stepRound(state, { left: false, right: false, fire: true }, 1 / 30);
      guard += 1;
    }
    expect(state.caption).not.toBeNull();
    expect(state.caption!.text).not.toMatch(FORBIDDEN_CAPTION);
    expect(state.caption!.text).toMatch(/ghost probe|tools\/call/);
    expect(state.caption!.t).toBeGreaterThan(0);
  });

  it('ends with a scene listing cleared lies, not a count', () => {
    const state = createRoundState(roundOf({ tapeId: 'bout_scene', duration: 0.05 }));
    stepRound(state, { left: false, right: false, fire: false }, 0.1);
    expect(state.scene).not.toBeNull();
    expect(state.scene!.tapeId).toBe('bout_scene');
    expect(state.scene!.cleared).toEqual([]);
    expect(state.ended).toBe('time');
    expect(state).not.toHaveProperty('score');
  });
});
