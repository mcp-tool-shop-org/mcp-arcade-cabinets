import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadTape, type Tape } from '@mcp-arcade-cabinets/tape-core';

import { createRoundState, prepassRound, revealOnHit, stepRound } from '../src/index';
import { attachPatterns, DEFAULT_PATTERNS, type PatternSet } from '../src/patterns';
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
    expect(checked).toBeGreaterThan(0);
  });
});
