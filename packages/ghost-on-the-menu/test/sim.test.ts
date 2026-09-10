import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadTape, type Tape } from '@mcp-arcade-cabinets/tape-core';

import { createRoundState, prepassRound, revealOnHit, stepRound } from '../src/index';
import { PARKING_Y, type Enemy, type Round, type RoundState } from '../src/types';

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

function park(state: RoundState, target: Enemy): void {
  target.mode = 'hover';
  target.pathT = 1;
  target.path = [];
  target.y = 80;
  target.tEnter = 0;
  state.player.x = target.x;
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
    park(state, target);
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
    park(state, target);
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
    park(state, target);
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
    park(state, target);
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

  it('replaces a fog sprite with a FogBank that is not shootable', () => {
    const state = createRoundState(
      roundOf({
        tapeId: 'bout_fog',
        duration: 8,
        beats: [
          {
            id: 'inspect.tools_list:fog:0',
            t: 0.1,
            x: 120,
            sprite: 'fog',
            lie: false,
            members: 1,
            source: {
              atom: 'inspect.tools_list',
              method: 'notifications/message',
              note: 'SUT says: "hi"',
              index: 0,
            },
          },
        ],
      }),
    );
    expect(state.enemies.filter((e) => e.sprite === 'fog')).toHaveLength(0);
    stepRound(state, { left: false, right: false, fire: false }, 0.2);
    expect(state.fog).not.toBeNull();
    expect(state.fog!.alive).toBe(true);
  });

  it('grace stops a burst from taking three lamps', () => {
    const state = createRoundState(roundOf({ tapeId: 'bout_grace', duration: 8 }));
    state.lives = 3;
    state.grace = 0;
    const hit = {
      x: state.player.x,
      y: state.player.y,
      w: 4,
      h: 4,
      vy: 10,
      dead: false,
    };
    state.enemyShots.push({ ...hit }, { ...hit }, { ...hit });
    stepRound(state, { left: false, right: false, fire: false }, 0.01);
    expect(state.lives).toBe(2);
    expect(state.grace).toBeGreaterThan(0);
    state.enemyShots.push({
      x: state.player.x,
      y: state.player.y,
      w: 4,
      h: 4,
      vy: 10,
      dead: false,
    });
    stepRound(state, { left: false, right: false, fire: false }, 0.01);
    expect(state.lives).toBe(2);
  });

  it('boss trajectory does not read the tape fact', () => {
    const file = path.resolve(__dirname, '../../../fixtures/tapes/naive-ndjson.tape.json');
    const raw = JSON.parse(readFileSync(file, 'utf8')) as Tape;
    const a = prepassRound(loadTape(raw), { seconds: 150, seed: 0 });
    const flipped = JSON.parse(JSON.stringify(raw)) as Tape;
    const rug = flipped.facts.find((f) => f.atom_id === 'temporal.rug_pull');
    if (rug) rug.fact = rug.fact === 'menu_changed' ? 'menu_stable' : 'menu_changed';
    const b = prepassRound(loadTape(flipped), { seconds: 150, seed: 0 });
    const sa = createRoundState(a);
    const sb = createRoundState(b);
    const samplesA: string[] = [];
    const samplesB: string[] = [];
    for (let i = 0; i < 400; i++) {
      stepRound(sa, { left: false, right: false, fire: false }, 1 / 30);
      stepRound(sb, { left: false, right: false, fire: false }, 1 / 30);
      const snap = (s: RoundState) =>
        s.boss
          ? `${s.boss.kind}:${s.boss.x.toFixed(3)}:${s.boss.y.toFixed(3)}:${s.boss.w.toFixed(3)}:${s.boss.h.toFixed(3)}:${s.boss.phase}`
          : 'none';
      samplesA.push(snap(sa));
      samplesB.push(snap(sb));
    }
    expect(samplesA).toEqual(samplesB);
    expect(samplesA.some((s) => s.startsWith('whisperer'))).toBe(true);
  });
});
