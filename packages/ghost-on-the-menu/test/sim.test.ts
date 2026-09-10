import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadTape, type Tape } from '@mcp-arcade-cabinets/tape-core';

import { createRoundState, isDecoy, prepassRound, revealOnHit, stepRound } from '../src/index';
import { attachPatterns, burstActive, DEFAULT_PATTERNS, type PatternSet } from '../src/patterns';
import { FIELD, PARKING_Y, type Enemy, type Round, type RoundState } from '../src/types';

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
      vx: 0,
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
      vx: 0,
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
    const poison = a.waveBounds.find((w) => w.atom.startsWith('poison.'));
    const until = (poison?.t0 ?? 8) + 4;
    while (sa.t < until && !sa.scene && !sb.scene) {
      stepRound(sa, { left: false, right: false, fire: false }, 1 / 15);
      stepRound(sb, { left: false, right: false, fire: false }, 1 / 15);
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

  it('aimed boss shot velocities do not read the tape fact', () => {
    const file = path.resolve(__dirname, '../../../fixtures/tapes/naive-ndjson.tape.json');
    const raw = JSON.parse(readFileSync(file, 'utf8')) as Tape;
    const a = prepassRound(loadTape(raw), { seconds: 150, seed: 0, tier: 1 });
    const flipped = JSON.parse(JSON.stringify(raw)) as Tape;
    const rug = flipped.facts.find((f) => f.atom_id === 'temporal.rug_pull');
    if (rug) rug.fact = rug.fact === 'menu_changed' ? 'menu_stable' : 'menu_changed';
    const b = prepassRound(loadTape(flipped), { seconds: 150, seed: 0, tier: 1 });
    const sa = createRoundState(a);
    const sb = createRoundState(b);
    sa.player.x = 200;
    sb.player.x = 200;
    const vel = (s: RoundState) =>
      s.enemyShots.map((sh) => `${sh.vx.toFixed(4)},${sh.vy.toFixed(4)}`).join('|');
    const seenA: string[] = [];
    const seenB: string[] = [];
    const poison = a.waveBounds.find((w) => w.atom.startsWith('poison.'));
    const until = (poison?.t1 ?? 20) + 2;
    while (sa.t < until && !sa.scene && !sb.scene) {
      stepRound(sa, { left: false, right: false, fire: false }, 1 / 15);
      stepRound(sb, { left: false, right: false, fire: false }, 1 / 15);
      if (sa.enemyShots.length) seenA.push(vel(sa));
      if (sb.enemyShots.length) seenB.push(vel(sb));
    }
    expect(seenA.length).toBeGreaterThan(0);
    expect(seenA).toEqual(seenB);
    expect(seenA.some((row) => row.split(',').some((n) => Number(n) !== 0))).toBe(true);
  });

  it('dive schedule does not read the tape fact', () => {
    const file = path.resolve(__dirname, '../../../fixtures/tapes/naive-ndjson.tape.json');
    const raw = JSON.parse(readFileSync(file, 'utf8')) as Tape;
    const a = prepassRound(loadTape(raw), { seconds: 150, seed: 0, tier: 1 });
    const flipped = JSON.parse(JSON.stringify(raw)) as Tape;
    const rug = flipped.facts.find((f) => f.atom_id === 'temporal.rug_pull');
    if (rug) rug.fact = rug.fact === 'menu_changed' ? 'menu_stable' : 'menu_changed';
    const b = prepassRound(loadTape(flipped), { seconds: 150, seed: 0, tier: 1 });
    const sa = createRoundState(a);
    const sb = createRoundState(b);
    const snap = (s: RoundState) =>
      s.enemies
        .filter((e) => e.sprite === 'grid')
        .map((e) => `${e.mode}:${e.x.toFixed(2)}:${e.y.toFixed(2)}`)
        .join('|');
    const samplesA: string[] = [];
    const samplesB: string[] = [];
    for (let i = 0; i < 720; i++) {
      stepRound(sa, { left: false, right: false, fire: false }, 1 / 30);
      stepRound(sb, { left: false, right: false, fire: false }, 1 / 30);
      samplesA.push(snap(sa));
      samplesB.push(snap(sb));
    }
    expect(samplesA).toEqual(samplesB);
    expect(samplesA.some((line) => line.includes('dive'))).toBe(true);
  });

  it('records boss hitT, playerHitT, and bossKills', () => {
    const state = createRoundState(
      roundOf({
        tapeId: 'bout_hitT',
        duration: 8,
        waveBounds: [{ atom: 'poison.follow_through', t0: 0, t1: 6 }],
      }),
    );
    expect(state.playerHitT).toBe(Number.POSITIVE_INFINITY);
    expect(state.bossKills).toBe(0);
    stepRound(state, { left: false, right: false, fire: false }, 1.6);
    expect(state.boss).not.toBeNull();
    expect(state.boss!.hitT).toBe(Number.POSITIVE_INFINITY);
    state.boss!.hp = 1;
    state.player.x = state.boss!.x + state.boss!.w / 2 - state.player.w / 2;
    let guard = 0;
    while (state.boss && guard < 80) {
      stepRound(state, { left: false, right: false, fire: true }, 1 / 30);
      guard += 1;
    }
    expect(state.boss).toBeNull();
    expect(state.bossKills).toBe(1);
    expect(state.bossDownT).toBeGreaterThan(0);
  });

  it('starts with no boss-down time and stamps it on a kill', () => {
    const state = createRoundState(
      roundOf({
        tapeId: 'bout_down',
        duration: 8,
        waveBounds: [{ atom: 'poison.follow_through', t0: 0, t1: 6 }],
      }),
    );
    expect(state.bossDownT).toBe(Number.NEGATIVE_INFINITY);
    stepRound(state, { left: false, right: false, fire: false }, 1.6);
    state.boss!.hp = 1;
    state.player.x = state.boss!.x + state.boss!.w / 2 - state.player.w / 2;
    let guard = 0;
    while (state.boss && guard < 80) {
      stepRound(state, { left: false, right: false, fire: true }, 1 / 30);
      guard += 1;
    }
    expect(state.bossDownT).toBe(state.t);
  });

  it('consumes shots with no damage while the doorman holds', () => {
    const state = createRoundState(
      roundOf({
        tapeId: 'bout_hold',
        duration: 8,
        waveBounds: [{ atom: 'protocol.unlisted_call', t0: 0, t1: 6 }],
      }),
    );
    stepRound(state, { left: false, right: false, fire: false }, 1.6);
    expect(state.boss).not.toBeNull();
    expect(state.boss!.kind).toBe('doorman');
    const hp = state.boss!.hp;
    state.player.x = state.boss!.x + state.boss!.w / 2 - state.player.w / 2;
    for (let i = 0; i < 20; i++) {
      stepRound(state, { left: false, right: false, fire: true }, 1 / 30);
    }
    expect(state.boss).not.toBeNull();
    expect(state.boss!.hp).toBe(hp);
    expect(state.boss!.hitT).toBe(Number.POSITIVE_INFINITY);
  });

  it('shortens boss fire when hp is below half', () => {
    const period = (half: boolean): number => {
      const state = createRoundState(
        roundOf({
          tapeId: 'bout_rage',
          duration: 50,
          waveBounds: [{ atom: 'poison.follow_through', t0: 0, t1: 45 }],
        }),
      );
      stepRound(state, { left: false, right: false, fire: false }, 1.6);
      if (half) state.boss!.hp = Math.floor(state.boss!.hp / 2) - 1;
      const marks: number[] = [];
      let shots = 0;
      let fog = false;
      while (state.t < 40 && marks.length < 3 && !state.scene) {
        stepRound(state, { left: false, right: false, fire: false }, 1 / 30);
        const nowFog = Boolean(state.fog && state.fog.alive);
        if (state.enemyShots.length > shots || (nowFog && !fog)) marks.push(state.t);
        shots = state.enemyShots.length;
        fog = nowFog;
      }
      expect(marks.length).toBeGreaterThanOrEqual(2);
      return marks[1]! - marks[0]!;
    };
    const calm = period(false);
    const mad = period(true);
    expect(mad).toBeLessThan(calm * 0.85);
    expect(mad).toBeGreaterThan(calm * 0.4);
  });

  it('a killed boss stays dead until its wave ends', () => {
    const state = createRoundState(
      roundOf({
        tapeId: 'bout_dead',
        duration: 8,
        waveBounds: [{ atom: 'poison.follow_through', t0: 0, t1: 5 }],
      }),
    );
    stepRound(state, { left: false, right: false, fire: false }, 1.6);
    expect(state.boss).not.toBeNull();
    state.boss!.hp = 1;
    state.player.x = state.boss!.x + state.boss!.w / 2 - state.player.w / 2;
    let guard = 0;
    while (state.boss && guard < 80) {
      stepRound(state, { left: false, right: false, fire: true }, 1 / 30);
      guard += 1;
    }
    expect(state.boss).toBeNull();
    while (state.t < 4.5) {
      stepRound(state, { left: false, right: false, fire: false }, 0.2);
    }
    expect(state.t).toBeLessThan(5);
    expect(state.boss).toBeNull();
  });

  it('throws when the filtered path pool is empty', () => {
    const bad = JSON.parse(JSON.stringify(DEFAULT_PATTERNS)) as PatternSet;
    const gridIds = new Set(
      bad.paths.paths.filter((p) => p.classes.includes('grid')).map((p) => p.id),
    );
    const r0 = bad.ladder.rungs.find((r) => r.tier === 0)!;
    r0.pools = r0.pools.filter((id) => !gridIds.has(id));
    const round = roundOf({
      tapeId: 'bout_pool',
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
    });
    attachPatterns(round, bad);
    expect(() => createRoundState(round)).toThrow('patterns/ladder.json: pools');
  });

  it('opens a wave with a kind caption and no digit or fact name', () => {
    const state = createRoundState(
      roundOf({
        tapeId: 'bout_card',
        duration: 12,
        waveBounds: [
          { atom: 'inspect.tools_list', t0: 0, t1: 3 },
          { atom: 'poison.follow_through', t0: 4, t1: 10 },
        ],
      }),
    );
    stepRound(state, { left: false, right: false, fire: false }, 0.05);
    expect(state.caption).not.toBeNull();
    expect(state.caption!.kind).toBe('wave');
    expect(state.caption!.text).toBe('inspect');
    expect(state.caption!.text).not.toMatch(/\d|pass|fail|score|tools_list|follow_through/i);
    expect(state.boss).toBeNull();
    while (state.t < 4.05) {
      stepRound(state, { left: false, right: false, fire: false }, 0.2);
    }
    expect(state.caption!.kind).toBe('wave');
    expect(state.caption!.text).toBe('poison');
  });

  it('exits hovering sprites when the wave closes and parks trophies', () => {
    const state = createRoundState(
      roundOf({
        tapeId: 'bout_reset',
        duration: 12,
        waveBounds: [
          { atom: 'inspect.tools_list', t0: 0, t1: 3 },
          { atom: 'poison.follow_through', t0: 4, t1: 10 },
        ],
        beats: [
          {
            id: 'inspect.tools_list:init:0',
            t: 0,
            x: 120,
            sprite: 'init',
            lie: false,
            members: 1,
            source: {
              atom: 'inspect.tools_list',
              method: 'initialize',
              note: 'initialize',
              index: 0,
            },
          },
          {
            id: 'inspect.tools_list:grid:1',
            t: 0,
            x: 200,
            sprite: 'grid',
            lie: true,
            members: 1,
            source: {
              atom: 'inspect.tools_list',
              method: 'tools/call',
              note: 'tools/call leak',
              index: 1,
            },
          },
        ],
      }),
    );
    const honest = state.enemies.find((e) => e.id.endsWith(':init:0'))!;
    const trophy = state.enemies.find((e) => e.id.endsWith(':grid:1'))!;
    park(state, honest);
    park(state, trophy);
    revealOnHit(trophy);
    expect(trophy.mode).toBe('caught');
    while (state.t < 4.05) {
      stepRound(state, { left: false, right: false, fire: false }, 0.2);
    }
    expect(honest.mode).toBe('exit');
    expect(trophy.mode).toBe('caught');
    const yExit = honest.y;
    const parked = trophy.y;
    stepRound(state, { left: false, right: false, fire: false }, 0.2);
    expect(trophy.mode).toBe('caught');
    expect(Math.abs(trophy.y - parked)).toBeLessThan(1);
    expect(honest.y).toBeLessThan(yExit);
  });

  it('spawns the boss after the wave caption and emits grids from under the whisperer', () => {
    const state = createRoundState(
      roundOf({
        tapeId: 'bout_emit',
        duration: 12,
        waveBounds: [{ atom: 'poison.follow_through', t0: 0, t1: 10 }],
        beats: [
          {
            id: 'poison.follow_through:grid:0',
            t: 0,
            x: 80,
            sprite: 'grid',
            lie: false,
            members: 3,
            source: {
              atom: 'poison.follow_through',
              method: 'tools/call',
              note: 'tools/call echo',
              index: 0,
            },
          },
        ],
      }),
    );
    const grid = state.enemies[0]!;
    expect(grid.tEnter).toBe(Number.POSITIVE_INFINITY);
    stepRound(state, { left: false, right: false, fire: false }, 0.05);
    expect(state.caption!.kind).toBe('wave');
    expect(state.boss).toBeNull();
    expect(grid.tEnter).toBe(Number.POSITIVE_INFINITY);
    while (state.t < 1.7) {
      stepRound(state, { left: false, right: false, fire: false }, 0.1);
    }
    expect(state.boss).not.toBeNull();
    expect(state.boss!.kind).toBe('whisperer');
    expect(grid.tEnter).toBeLessThan(Number.POSITIVE_INFINITY);
    expect(grid.mode).toBe('enter');
    const origin = grid.path[0]!;
    const mid = state.boss!.x + state.boss!.w / 2;
    const by = state.boss!.y + state.boss!.h;
    expect(Math.abs(origin.x - mid)).toBeLessThan(2);
    expect(Math.abs(origin.y - by)).toBeLessThan(8);
  });

  it('staggers whisperer grids so they never share tEnter or a pixel', () => {
    const state = createRoundState(
      roundOf({
        tapeId: 'bout_stagger',
        duration: 12,
        waveBounds: [{ atom: 'poison.follow_through', t0: 0, t1: 10 }],
        beats: [
          {
            id: 'poison.follow_through:grid:0',
            t: 0,
            x: 80,
            sprite: 'grid',
            lie: false,
            members: 1,
            source: {
              atom: 'poison.follow_through',
              method: 'tools/call',
              note: 'tools/call echo',
              index: 0,
            },
          },
          {
            id: 'poison.follow_through:grid:1',
            t: 0.8,
            x: 200,
            sprite: 'grid',
            lie: true,
            members: 1,
            source: {
              atom: 'poison.follow_through',
              method: 'tools/call',
              note: 'tools/call leak',
              index: 1,
            },
          },
        ],
      }),
    );
    while (state.t < 1.7) {
      stepRound(state, { left: false, right: false, fire: false }, 0.1);
    }
    const grids = state.enemies.filter((e) => e.sprite === 'grid');
    expect(grids).toHaveLength(2);
    expect(grids[0]!.tEnter).not.toBe(grids[1]!.tEnter);
    const later = Math.max(grids[0]!.tEnter, grids[1]!.tEnter);
    expect(later).toBeLessThan(1e6);
    while (state.t < later + 0.4 && state.t < 8) {
      stepRound(state, { left: false, right: false, fire: false }, 1 / 30);
      const live = state.enemies.filter(
        (e) => e.sprite === 'grid' && e.alive && state.t >= e.tEnter,
      );
      if (live.length < 2) continue;
      const key = (e: (typeof live)[0]) => `${e.x.toFixed(1)},${e.y.toFixed(1)}`;
      expect(key(live[0]!)).not.toBe(key(live[1]!));
    }
  });

  it('hovering sprites of a class in a wave do not overlap', () => {
    const file = path.resolve(__dirname, '../../../fixtures/tapes/naive-ndjson.tape.json');
    const tape = loadTape(JSON.parse(readFileSync(file, 'utf8')));
    const round = prepassRound(tape, { seconds: 150, seed: 0, tier: 1 });
    const state = createRoundState(round);
    const aabb = (
      a: { x: number; y: number; w: number; h: number },
      b: { x: number; y: number; w: number; h: number },
    ) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    let checked = 0;
    while (!state.scene && state.t < state.duration) {
      stepRound(state, { left: false, right: false, fire: false }, 1 / 15);
      const hovering = state.enemies.filter(
        (e) => e.alive && e.mode === 'hover' && state.t >= e.tEnter,
      );
      const groups = new Map<string, typeof hovering>();
      for (const e of hovering) {
        const atom = e.id.slice(0, e.id.indexOf(':'));
        const key = `${atom}:${e.sprite}`;
        const list = groups.get(key) ?? [];
        list.push(e);
        groups.set(key, list);
      }
      for (const list of groups.values()) {
        if (list.length < 2) continue;
        checked += 1;
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            expect(aabb(list[i]!, list[j]!)).toBe(false);
          }
        }
      }
    }
    // A wave of mixed classes may never pair; when it does, they must not stack.
    if (checked === 0) return;
  });

  it('a dive aims then commits: a mover can step out, a stayer is hit', () => {
    const diveRound = (): RoundState => {
      const state = createRoundState(
        roundOf({
          tapeId: 'bout_commit',
          duration: 20,
          tier: 1,
          waveBounds: [{ atom: 'inspect.tools_list', t0: 0, t1: 18 }],
          beats: [
            {
              id: 'inspect.tools_list:grid:0',
              t: 0,
              x: 100,
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
      const g = state.enemies[0]!;
      park(state, g);
      g.hoverY = 80;
      g.x = 100;
      state.player.x = 100;
      return state;
    };

    const dodge = diveRound();
    const g1 = dodge.enemies[0]!;
    let guard = 0;
    while (g1.mode !== 'dive' && guard++ < 400) {
      stepRound(dodge, { left: false, right: false, fire: false }, 1 / 30);
    }
    expect(g1.mode).toBe('dive');
    const originY = g1.y;
    const destY = 0.93 * FIELD.height;
    const mid = originY + (destY - originY) * 0.5;
    guard = 0;
    while (g1.y < mid && g1.mode === 'dive' && guard++ < 400) {
      stepRound(dodge, { left: false, right: false, fire: false }, 1 / 30);
    }
    dodge.player.x = 400;
    guard = 0;
    while (g1.mode === 'dive' && g1.y < destY - 8 && guard++ < 400) {
      stepRound(dodge, { left: false, right: false, fire: false }, 1 / 30);
    }
    const cx = g1.x + g1.w / 2;
    expect(cx).toBeLessThan(200);
    expect(cx).toBeGreaterThan(50);

    const stay = diveRound();
    const g2 = stay.enemies[0]!;
    stay.player.x = 100;
    guard = 0;
    while (g2.mode !== 'dive' && guard++ < 400) {
      stepRound(stay, { left: false, right: false, fire: false }, 1 / 30);
    }
    guard = 0;
    let hit = false;
    while (g2.mode === 'dive' && guard++ < 500) {
      stepRound(stay, { left: false, right: false, fire: false }, 1 / 30);
      if (
        g2.x < stay.player.x + stay.player.w &&
        g2.x + g2.w > stay.player.x &&
        g2.y < stay.player.y + stay.player.h &&
        g2.y + g2.h > stay.player.y
      ) {
        hit = true;
      }
    }
    expect(hit).toBe(true);
  });
});

describe('drops', () => {
  it('a downed boss drops a lamp that falls straight down, honest or not', () => {
    const make = (lie: boolean): RoundState =>
      createRoundState(
        roundOf({
          tapeId: 'bout_drop_boss',
          duration: 8,
          seed: 7,
          waveBounds: [{ atom: 'poison.follow_through', t0: 0, t1: 6 }],
          beats: lie
            ? [
                {
                  id: 'poison.follow_through:grid:0',
                  t: 0,
                  x: 240,
                  sprite: 'grid',
                  lie: true,
                  members: 1,
                  source: {
                    atom: 'poison.follow_through',
                    method: 'tools/call',
                    note: 'tools/call echo',
                    index: 0,
                  },
                },
              ]
            : [],
        }),
      );
    const run = (state: RoundState) => {
      stepRound(state, { left: false, right: false, fire: false }, 1.6);
      expect(state.boss).not.toBeNull();
      state.boss!.hp = 0;
      stepRound(state, { left: false, right: false, fire: false }, 1 / 30);
      return state;
    };
    const a = run(make(true));
    const b = run(make(false));
    expect(a.boss).toBeNull();
    expect(b.boss).toBeNull();
    const lampA = a.drops.filter((d) => d.kind === 'lamp');
    const lampB = b.drops.filter((d) => d.kind === 'lamp');
    expect(lampA).toHaveLength(1);
    expect(lampB).toHaveLength(1);
    expect(lampA[0]!.x).toBeCloseTo(lampB[0]!.x, 5);
    expect(lampA[0]!.y).toBeCloseTo(lampB[0]!.y, 5);
    const beforeY = lampA[0]!.y;
    const beforeX = lampA[0]!.x;
    a.player.x = 40;
    stepRound(a, { left: false, right: false, fire: false }, 0.2);
    expect(a.drops[0]!.y).toBeGreaterThan(beforeY);
    expect(a.drops[0]!.x).toBeCloseTo(beforeX, 5);
  });

  it('a cleared formation drops a spread whether the formation was a lie', () => {
    const make = (lie: boolean): RoundState => {
      const state = createRoundState(
        roundOf({
          tapeId: 'bout_drop_form',
          duration: 8,
          seed: 3,
          beats: [
            {
              id: 'inspect.tools_list:grid:0',
              t: 0,
              x: 240,
              sprite: 'grid',
              lie,
              members: 3,
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
      park(state, state.enemies[0]!);
      return state;
    };
    const pop = (state: RoundState) => {
      let guard = 0;
      while (state.drops.length === 0 && guard < 200) {
        stepRound(state, { left: false, right: false, fire: true }, 1 / 30);
        guard += 1;
      }
      return state;
    };
    const a = pop(make(true));
    const b = pop(make(false));
    expect(a.drops).toHaveLength(1);
    expect(b.drops).toHaveLength(1);
    expect(a.drops[0]!.kind).toBe('spread');
    expect(b.drops[0]!.kind).toBe('spread');
  });

  it('catching a lamp restores a life and catching a spread fans the next shots', () => {
    const state = createRoundState(roundOf({ tapeId: 'bout_catch', duration: 8 }));
    state.lives = 1;
    state.drops.push({
      kind: 'lamp',
      x: state.player.x,
      y: state.player.y,
      w: 14,
      h: 14,
      alive: true,
    });
    stepRound(state, { left: false, right: false, fire: false }, 1 / 30);
    expect(state.lives).toBe(2);
    expect(state.dropCatches).toBe(1);
    expect(state.drops).toHaveLength(0);
    state.drops.push({
      kind: 'spread',
      x: state.player.x,
      y: state.player.y,
      w: 14,
      h: 14,
      alive: true,
    });
    stepRound(state, { left: false, right: false, fire: false }, 1 / 30);
    expect(state.spreadT).toBeGreaterThan(0);
    const before = state.shots.length;
    stepRound(state, { left: false, right: false, fire: true }, 1 / 30);
    expect(state.shots.length - before).toBe(3);
  });
});

describe('voice', () => {
  it('picks a wave line and a boss line by seed, never by fact', () => {
    const make = (lie: boolean): RoundState =>
      createRoundState(
        roundOf({
          tapeId: 'bout_voice',
          duration: 12,
          seed: 42,
          waveBounds: [{ atom: 'poison.follow_through', t0: 0, t1: 10 }],
          beats: [
            {
              id: 'poison.follow_through:grid:0',
              t: 0,
              x: 80,
              sprite: 'grid',
              lie,
              members: 1,
              source: {
                atom: 'poison.follow_through',
                method: 'tools/call',
                note: 'tools/call echo',
                index: 0,
              },
            },
          ],
        }),
      );
    const a = make(true);
    const b = make(false);
    stepRound(a, { left: false, right: false, fire: false }, 0.05);
    stepRound(b, { left: false, right: false, fire: false }, 0.05);
    expect(a.caption!.kind).toBe('wave');
    expect(a.caption!.text).toBe('poison');
    expect(a.caption!.line).toBe(b.caption!.line);
    expect(a.caption!.line).toBeTruthy();
    expect(a.caption!.line).not.toMatch(FORBIDDEN_CAPTION);
    expect(a.caption!.line).not.toMatch(/\blie\b|\bfact\b|followed|held/i);
    while (a.t < 1.7) stepRound(a, { left: false, right: false, fire: false }, 0.1);
    while (b.t < 1.7) stepRound(b, { left: false, right: false, fire: false }, 0.1);
    expect(a.boss).not.toBeNull();
    expect(a.caption!.line).toBe(b.caption!.line);
    expect(a.caption!.line).not.toBe('poison');
    expect(a.caption!.line).toMatch(/Whisperer/);
    while (!a.scene) stepRound(a, { left: false, right: false, fire: false }, 0.5);
    expect(a.scene!.line).toBeTruthy();
    expect(a.scene!.line).not.toMatch(FORBIDDEN_CAPTION);
  });
});

describe('parallelism', () => {
  it('spawns honest decoys during a burst and never copies a lie as a lie', () => {
    const spec = DEFAULT_PATTERNS.parallelism.tiers['2'];
    const bounds = [{ atom: 'inspect.tools_list', t0: 0, t1: 24 }];
    let tOn = -1;
    for (let t = 0; t < 24; t += 0.05) {
      if (burstActive(t, 0, bounds, 11, spec)) {
        tOn = t;
        break;
      }
    }
    expect(tOn).toBeGreaterThan(0);
    const state = createRoundState(
      roundOf({
        tapeId: 'bout_para',
        duration: 30,
        seed: 11,
        tier: 2,
        waveBounds: bounds,
        beats: [
          {
            id: 'inspect.tools_list:grid:0',
            t: 0,
            x: 120,
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
          {
            id: 'inspect.tools_list:followed',
            t: 0,
            x: 280,
            sprite: 'grid',
            lie: true,
            members: 1,
            source: {
              atom: 'inspect.tools_list',
              method: 'tools/call',
              note: 'tools/call leak',
              index: 1,
            },
          },
        ],
      }),
    );
    for (const e of state.enemies) park(state, e);
    state.lives = 99;
    const idle = { left: false, right: false, fire: false };
    while (state.t < tOn + 0.2 && !state.scene) stepRound(state, idle, 1 / 30);
    expect(state.parallelism).toBe(true);
    const decoys = state.enemies.filter((e) => isDecoy(e) && e.alive);
    expect(decoys.length).toBeGreaterThan(0);
    expect(decoys.every((d) => d.lie === false)).toBe(true);
    const lies = state.enemies.filter((e) => e.lie);
    expect(lies).toHaveLength(1);
    expect(isDecoy(lies[0]!)).toBe(false);
  });

  it('stays off on the recorded rung', () => {
    const state = createRoundState(
      roundOf({
        tapeId: 'bout_para0',
        duration: 20,
        seed: 3,
        tier: 0,
        waveBounds: [{ atom: 'inspect.tools_list', t0: 0, t1: 18 }],
        beats: [
          {
            id: 'inspect.tools_list:grid:0',
            t: 0,
            x: 200,
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
    park(state, state.enemies[0]!);
    for (let i = 0; i < 90; i++) {
      stepRound(state, { left: false, right: false, fire: false }, 0.2);
    }
    expect(state.parallelism).toBe(false);
    expect(state.enemies.some((e) => isDecoy(e))).toBe(false);
  });
});
