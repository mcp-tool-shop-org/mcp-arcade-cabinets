import { describe, expect, it } from 'vitest';

import { createRoundState, revealOnHit, stepRound, type Enemy, type Round } from '../src/index';

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
    ...over,
  };
}

describe('revealOnHit', () => {
  it('flips a lie and leaves an honest sprite unmarked', () => {
    const lie = enemy({ id: 'lie', lie: true });
    const honest = enemy({ id: 'honest', lie: false });
    revealOnHit(lie);
    revealOnHit(honest);
    expect(lie.revealed).toBe(true);
    expect(honest.revealed).toBe(false);
  });
});

describe('stepRound', () => {
  it('reveals a lie only when a shot hits it', () => {
    const round: Round = {
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
          source: { atom: 'poison.follow_through', method: 'tools/call', note: 'leak', index: 0 },
        },
      ],
    };
    const state = createRoundState(round);
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
    expect(state.cleared).toContain(target.id);
  });

  it('ends with a scene listing cleared lies, not a count', () => {
    const round: Round = {
      tapeId: 'bout_scene',
      duration: 0.05,
      beats: [],
    };
    const state = createRoundState(round);
    stepRound(state, { left: false, right: false, fire: false }, 0.1);
    expect(state.scene).not.toBeNull();
    expect(state.scene!.tapeId).toBe('bout_scene');
    expect(state.scene!.cleared).toEqual([]);
    expect(state).not.toHaveProperty('score');
  });
});
