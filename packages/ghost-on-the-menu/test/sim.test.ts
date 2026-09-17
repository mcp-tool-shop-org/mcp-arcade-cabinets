import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadTape, type Tape } from '@mcp-arcade-cabinets/tape-core';

import {
  bossKindFor,
  createRoundState,
  fillFor,
  isDecoy,
  MAX_DT,
  prepassRound,
  revealOnHit,
  stepRound,
} from '../src/index';
import { isHittable, watchSaid } from '../src/sim';
import {
  attachPatterns,
  burstActive,
  copiesAt,
  DEFAULT_PATTERNS,
  readLineBags,
  type LineBags,
  type PatternSet,
} from '../src/patterns';
import { flavorAt } from '../src/shift';
import {
  FIELD,
  PARKING_Y,
  type Enemy,
  type Round,
  type RoundInput,
  type RoundState,
} from '../src/types';

/**
 * Let `seconds` of round time pass. stepRound now caps a single step at
 * MAX_DT — the clamp every caller used to keep its own copy of — so a test
 * that wanted a second and a half of clock asks for it here instead of
 * handing the state machine a step it will not integrate.
 */
function advance(state: RoundState, input: RoundInput, seconds: number): RoundState {
  let left = seconds;
  while (left > 1e-9 && !state.scene) {
    const dt = Math.min(MAX_DT, left);
    stepRound(state, input, dt);
    left -= dt;
  }
  return state;
}

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
    advance(state, { left: false, right: false, fire: false }, 0.1);
    expect(target.alive).toBe(true);
    advance(state, { left: false, right: false, fire: false }, 0.06);
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
    expect(state.caption!.text).not.toMatch(/ghost probe|tools\/call|tools\/list/i);
    expect(state.caption!.t).toBeGreaterThan(0);
  });

  it('ends with a scene listing cleared lies, not a count', () => {
    const state = createRoundState(roundOf({ tapeId: 'bout_scene', duration: 0.05 }));
    advance(state, { left: false, right: false, fire: false }, 0.1);
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
    advance(state, { left: false, right: false, fire: false }, 0.2);
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
      advance(sa, { left: false, right: false, fire: false }, 1 / 15);
      advance(sb, { left: false, right: false, fire: false }, 1 / 15);
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
      advance(sa, { left: false, right: false, fire: false }, 1 / 15);
      advance(sb, { left: false, right: false, fire: false }, 1 / 15);
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
    // The schedule is what is measured, not survival: since the formation
    // fires aimed and on entry (2026-09-17) a ship that never moves is gone
    // in seconds, before the first dive.
    sa.lives = 1000;
    sb.lives = 1000;
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
    advance(state, { left: false, right: false, fire: false }, 1.6);
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
    advance(state, { left: false, right: false, fire: false }, 1.6);
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
    advance(state, { left: false, right: false, fire: false }, 1.6);
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
      advance(state, { left: false, right: false, fire: false }, 1.6);
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
    advance(state, { left: false, right: false, fire: false }, 1.6);
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
      advance(state, { left: false, right: false, fire: false }, 0.2);
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
      advance(state, { left: false, right: false, fire: false }, 0.2);
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
      advance(state, { left: false, right: false, fire: false }, 0.2);
    }
    expect(honest.mode).toBe('exit');
    expect(trophy.mode).toBe('caught');
    const yExit = honest.y;
    const parked = trophy.y;
    advance(state, { left: false, right: false, fire: false }, 0.2);
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
      advance(state, { left: false, right: false, fire: false }, 0.1);
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

  // The Director (2026-09-17): the boss appeared too quickly. A boss whose
  // grid enters on its own takes the field once the grid is downed, or at
  // half the wave if the grid still stands; the Whisperer, whose grids come
  // from under it, still comes at once (the test above).
  it('holds a boss back until its grid is downed, or half the wave has passed', () => {
    const make = () =>
      createRoundState(
        roundOf({
          tapeId: 'bout_entry',
          duration: 24,
          waveBounds: [{ atom: 'temporal.list_changed', t0: 0, t1: 20 }],
          beats: [
            {
              id: 'temporal.list_changed:grid:0',
              t: 0,
              x: 80,
              sprite: 'grid',
              lie: false,
              members: 3,
              source: {
                atom: 'temporal.list_changed',
                method: 'tools/list',
                note: 'tools/list again',
                index: 0,
              },
            },
          ],
        }),
      );
    // The grid stands: no boss until half the wave (t0 + 24/2, since the last
    // wave runs to the round's duration), then the Menu takes the field.
    const stands = make();
    while (stands.t < 11.5) {
      stands.lives = stands.maxLives;
      advance(stands, { left: false, right: false, fire: false }, 0.1);
      expect(stands.boss, `t=${stands.t.toFixed(1)} wave=${stands.wave}`).toBeNull();
    }
    while (stands.t < 12.6) {
      stands.lives = stands.maxLives;
      advance(stands, { left: false, right: false, fire: false }, 0.1);
    }
    expect(
      stands.boss,
      `t=${stands.t.toFixed(1)} wave=${stands.wave} scene=${String(stands.scene)}`,
    ).not.toBeNull();
    expect(stands.boss!.kind).toBe('menu');
    // The grid is downed early: the boss comes on the next step.
    const downed = make();
    while (downed.t < 3) {
      downed.lives = downed.maxLives;
      advance(downed, { left: false, right: false, fire: false }, 0.1);
    }
    expect(downed.boss).toBeNull();
    for (const enemy of downed.enemies) enemy.alive = false;
    advance(downed, { left: false, right: false, fire: false }, 0.1);
    expect(downed.boss).not.toBeNull();
    expect(downed.boss!.kind).toBe('menu');
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
      advance(state, { left: false, right: false, fire: false }, 0.1);
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
    const state = createRoundState(
      roundOf({
        tapeId: 'bout_hover_pair',
        duration: 16,
        tier: 1,
        waveBounds: [{ atom: 'inspect.tools_list', t0: 0, t1: 14 }],
        beats: [
          {
            id: 'inspect.tools_list:grid:0',
            t: 0.4,
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
          {
            id: 'inspect.tools_list:grid:1',
            t: 0.6,
            x: 280,
            sprite: 'grid',
            lie: false,
            members: 1,
            source: {
              atom: 'inspect.tools_list',
              method: 'tools/call',
              note: 'tools/call echo',
              index: 1,
            },
          },
        ],
      }),
    );
    const aabb = (
      a: { x: number; y: number; w: number; h: number },
      b: { x: number; y: number; w: number; h: number },
    ) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    let checked = 0;
    while (!state.scene && state.t < state.duration) {
      advance(state, { left: false, right: false, fire: false }, 1 / 15);
      const hovering = state.enemies.filter(
        (e) => e.alive && e.mode === 'hover' && e.sprite === 'grid' && state.t >= e.tEnter,
      );
      if (hovering.length < 2) continue;
      checked += 1;
      for (let i = 0; i < hovering.length; i++) {
        for (let j = i + 1; j < hovering.length; j++) {
          expect(aabb(hovering[i]!, hovering[j]!)).toBe(false);
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('keeps the last-wave boss present during the reserved tail', () => {
    const tail = DEFAULT_PATTERNS.waves.tiers['0'].tail;
    const t1 = 10;
    const duration = t1 + tail;
    const state = createRoundState(
      roundOf({
        tapeId: 'bout_tail',
        duration,
        tier: 0,
        waveBounds: [{ atom: 'protocol.unlisted_call', t0: 0, t1 }],
      }),
    );
    let seen = 0;
    while (state.t < duration - 0.15 && !state.scene) {
      state.lives = state.maxLives;
      stepRound(state, { left: false, right: false, fire: false }, 1 / 30);
      if (state.t > t1 + 0.05 && state.t < duration - 0.1) {
        expect(state.boss, `t=${state.t.toFixed(2)}`).not.toBeNull();
        expect(state.boss!.alive).toBe(true);
        expect(state.boss!.kind).toBe('doorman');
        seen += 1;
      }
    }
    expect(seen).toBeGreaterThan(0);
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
      advance(state, { left: false, right: false, fire: false }, 1.6);
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
    advance(a, { left: false, right: false, fire: false }, 0.2);
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
    // One of the three fire drops, drawn by seed, the same draw whether or not the formation was a lie.
    expect(['spread', 'rapid', 'pierce']).toContain(a.drops[0]!.kind);
    expect(b.drops[0]!.kind).toBe(a.drops[0]!.kind);
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
    while (a.t < 1.7) advance(a, { left: false, right: false, fire: false }, 0.1);
    while (b.t < 1.7) advance(b, { left: false, right: false, fire: false }, 0.1);
    expect(a.boss).not.toBeNull();
    // The boss's card waits for the wave card rather than writing over it, so
    // both runs are stepped until it takes the field; they must agree.
    const bossPool = DEFAULT_PATTERNS.voice.boss.whisperer;
    const NO = { left: false, right: false, fire: false };
    let guard = 0;
    while (guard++ < 400 && !bossPool.includes(a.caption?.line ?? '')) stepRound(a, NO, 1 / 30);
    guard = 0;
    while (guard++ < 400 && !bossPool.includes(b.caption?.line ?? '')) stepRound(b, NO, 1 / 30);
    expect(a.caption!.line).toBe(b.caption!.line);
    expect(a.caption!.line).not.toBe('poison');
    expect(bossPool).toContain(a.caption!.line);
    while (!a.scene) advance(a, { left: false, right: false, fire: false }, 0.5);
    expect(a.scene!.line).toBeTruthy();
    expect(a.scene!.line).not.toMatch(FORBIDDEN_CAPTION);
  });
});

describe('parallelism', () => {
  it('spawns honest decoys during a burst and never copies a lie as a lie', () => {
    const spec = DEFAULT_PATTERNS.parallelism.tiers['1'];
    const bounds = [{ atom: 'inspect.tools_list', t0: 0, t1: 10 }];
    // PATH_RATE 0.35 * tier-1 speed 1 ≈ 2.86s of enter. Pick a seed whose
    // burst opens while hosts are still on the path, not after parking them.
    let seed = 0;
    let tOn = -1;
    for (let s = 0; s < 400 && tOn < 0; s++) {
      for (let t = 0.05; t < 2.8; t += 0.05) {
        if (burstActive(t, 0, bounds, s, spec)) {
          seed = s;
          tOn = t;
          break;
        }
      }
    }
    expect(tOn).toBeGreaterThan(0);
    expect(tOn).toBeLessThan(2.8);
    const extras = copiesAt(spec, 0, 1, 0) - 1;
    expect(extras).toBeGreaterThan(0);
    const state = createRoundState(
      roundOf({
        tapeId: 'bout_para',
        duration: 30,
        seed,
        tier: 1,
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
    state.lives = 99;
    const idle = { left: false, right: false, fire: false };
    let enteredDuringBurst = false;
    while (state.t < 8 && !state.scene) {
      stepRound(state, idle, 1 / 30);
      const hosts = state.enemies.filter(
        (e) => !isDecoy(e) && !e.lie && e.alive && state.t >= e.tEnter,
      );
      if (state.parallelism && hosts.some((h) => h.mode === 'enter' || h.pathT < 1)) {
        enteredDuringBurst = true;
      }
      const hovering = hosts.filter((h) => h.mode === 'hover');
      const decoys = state.enemies.filter((e) => isDecoy(e) && e.alive);
      if (state.parallelism && hovering.length > 0 && decoys.length >= extras * hovering.length) {
        break;
      }
    }
    expect(enteredDuringBurst).toBe(true);
    expect(state.parallelism).toBe(true);
    const decoys = state.enemies.filter((e) => isDecoy(e) && e.alive);
    expect(decoys.length).toBeGreaterThanOrEqual(extras);
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
      advance(state, { left: false, right: false, fire: false }, 0.2);
    }
    expect(state.parallelism).toBe(false);
    expect(state.enemies.some((e) => isDecoy(e))).toBe(false);
  });
});

describe('the ollama seats in the sim', () => {
  const NONE = { left: false, right: false, fire: false };

  function seatedRound(tier: 1 | 3 = 1) {
    const file = path.resolve(__dirname, '../../../fixtures/tapes/naive-ndjson.tape.json');
    const raw = JSON.parse(readFileSync(file, 'utf8')) as Tape;
    return prepassRound(loadTape(raw), { seconds: 150, seed: 0, tier });
  }

  /** One frame with the lamps topped up: these tests are about the boss, not the ship. */
  function tick(state: RoundState, input = NONE): void {
    state.lives = state.maxLives;
    stepRound(state, input, 1 / 30);
  }

  /**
   * Step until a boss of the given kind is up. The boss waits for its wave's
   * grid now (the Director, 2026-09-17), so the grid is downed on the way:
   * these tests are about the boss's beats, and a hovering grid's own fire
   * would land in them.
   */
  function toBoss(state: RoundState, kind: string): void {
    let guard = 0;
    while ((!state.boss || state.boss.kind !== kind) && !state.scene && guard++ < 9000) {
      for (const enemy of state.enemies) enemy.alive = false;
      tick(state);
    }
    expect(
      state.boss?.kind,
      `t=${state.t.toFixed(1)} wave=${state.wave} scene=${String(state.scene)} guard=${guard}`,
    ).toBe(kind);
  }

  /**
   * Step until the boss's own card is on the field. The card waits for a
   * wave card that is still being read rather than writing over it, so a
   * test that wants to read the boss's line waits with it.
   */
  function toBossCard(state: RoundState, kind: 'whisperer' | 'menu' | 'doorman' | 'archivist') {
    const pool = DEFAULT_PATTERNS.voice.boss[kind];
    let guard = 0;
    while (guard++ < 600) {
      const line = state.caption?.line;
      if (line && pool.includes(line)) return line;
      tick(state);
    }
    throw new Error('the boss card never took the field');
  }

  /** Step until the pending intent is spent; return the shots that beat spawned. */
  function beat(state: RoundState, input = NONE) {
    let guard = 0;
    let fresh: typeof state.enemyShots = [];
    while (state.bossIntent !== null && guard++ < 600) {
      const before = new Set(state.enemyShots);
      tick(state, input);
      fresh = state.enemyShots.filter((sh) => !before.has(sh));
    }
    expect(state.bossIntent).toBeNull();
    return fresh;
  }

  it("a pilot spread is a fan of the lever's width, a column an aimed shot", () => {
    const s = createRoundState(seatedRound());
    toBoss(s, 'whisperer');
    // Seat's formation fires now (every class, on the way in); this beat
    // counts the boss's shots alone, so the formation is cleared off first.
    for (const e of s.enemies) e.alive = false;
    const fan = DEFAULT_PATTERNS.fire.tiers['1'].boss.pilot.fan;
    expect(fan).toBeGreaterThan(1);
    s.bossIntent = 'spread';
    const fanned = beat(s);
    expect(fanned).toHaveLength(fan);
    // A fan is straight down, spaced across the lever's own span, not the burst's.
    expect(new Set(fanned.map((sh) => sh.x)).size).toBe(fan);
    expect(fanned.every((sh) => sh.vx === 0)).toBe(true);
    const xs = fanned.map((sh) => sh.x);
    const span = Math.max(...xs) - Math.min(...xs);
    expect(span).toBeCloseTo(DEFAULT_PATTERNS.fire.tiers['1'].boss.pilot.spread * FIELD.width, 3);
    s.bossIntent = 'column';
    const aimed = beat(s);
    expect(aimed).toHaveLength(1);
    expect(aimed[0]!.vx !== 0 || aimed[0]!.vy !== 0).toBe(true);
  });

  it('a pending column leans the boss toward the ship, and the lean eases back', () => {
    const s = createRoundState(seatedRound());
    toBoss(s, 'whisperer');
    const lean = DEFAULT_PATTERNS.fire.tiers['1'].boss.pilot.lean;
    s.player.x = 20;
    // The scripted boss drifts a little either way; a lean drags it far left.
    for (let i = 0; i < 30; i++) tick(s);
    const scripted = s.boss!.x;
    s.bossIntent = 'column';
    for (let i = 0; i < 30 && s.bossIntent === 'column'; i++) tick(s);
    const leaned = s.boss!.x;
    expect(leaned).toBeLessThan(scripted - 40);
    expect(scripted - leaned).toBeLessThanOrEqual(lean + 70);
    // Spent or not, with no column pending the boss eases home.
    s.bossIntent = null;
    for (let i = 0; i < 120; i++) tick(s);
    expect(s.boss!.x).toBeGreaterThan(leaned + 15);
  });

  it('a pilot hold is a silent beat that keeps the boss still', () => {
    const s = createRoundState(seatedRound());
    toBoss(s, 'menu');
    s.bossIntent = 'hold';
    expect(beat(s)).toHaveLength(0);
    const x = s.boss!.x;
    const w = s.boss!.w;
    // The Menu squashes every frame when scripted; held, its rect does not move.
    for (let i = 0; i < 30; i++) tick(s);
    expect(s.boss!.x).toBe(x);
    expect(s.boss!.w).toBe(w);
    // And a held boss is not a guarded boss: the hold reads the seat, the guard reads the data.
    expect(s.boss!.motion).toBe(DEFAULT_PATTERNS.bosses.menu.phases[s.boss!.phase]!.motion);
  });

  it('a pilot fog drops a fog bank and script keeps the phase fire', () => {
    const s = createRoundState(seatedRound());
    toBoss(s, 'doorman');
    s.bossIntent = 'fog';
    beat(s);
    expect(s.fog).not.toBeNull();
    s.bossIntent = 'script';
    beat(s);
  });

  it('a seated beat does not read the tape fact', () => {
    const file = path.resolve(__dirname, '../../../fixtures/tapes/naive-ndjson.tape.json');
    const raw = JSON.parse(readFileSync(file, 'utf8')) as Tape;
    // The rug fact flips the Menu wave's lie flag and nothing else about the
    // layout (a followed whisper is its own sprite by G7, so flipping poison
    // would change the formations themselves, which is the prepass's business).
    const flipped = JSON.parse(JSON.stringify(raw)) as Tape;
    const rug = flipped.facts.find((f) => f.atom_id === 'temporal.rug_pull');
    if (rug) rug.fact = rug.fact === 'menu_changed' ? 'menu_stable' : 'menu_changed';
    const a = createRoundState(prepassRound(loadTape(raw), { seconds: 150, seed: 0, tier: 1 }));
    const b = createRoundState(prepassRound(loadTape(flipped), { seconds: 150, seed: 0, tier: 1 }));
    const script = ['column', 'hold', 'spread', 'fog', 'column', 'plate', 'spread'] as const;
    const snap = (s: RoundState) =>
      [
        s.boss
          ? `${s.boss.kind}:${s.boss.x.toFixed(3)}:${s.boss.w.toFixed(3)}:${s.boss.motion}`
          : 'none',
        s.enemyShots
          .map((sh) => `${sh.x.toFixed(2)},${sh.vx.toFixed(3)},${sh.vy.toFixed(3)}`)
          .join('|'),
        s.fog ? 'fog' : '',
        s.caption?.line ?? '',
      ].join(' ');
    const seenA: string[] = [];
    const seenB: string[] = [];
    const counters = new Map<RoundState, number>([
      [a, 0],
      [b, 0],
    ]);
    a.player.x = 40;
    b.player.x = 40;
    for (let n = 0; n < 5400 && !a.scene && !b.scene; n++) {
      for (const s of [a, b]) {
        if (s.boss && s.boss.alive && s.bossIntent === null) {
          const i = counters.get(s)!;
          s.bossIntent = script[i % script.length]!;
          counters.set(s, i + 1);
        }
        tick(s);
      }
      seenA.push(snap(a));
      seenB.push(snap(b));
    }
    expect(seenA).toEqual(seenB);
    expect(counters.get(a)).toBeGreaterThan(script.length);
    expect(seenA.some((row) => row.includes(','))).toBe(true);
  });

  it("spawns the boss with the seat's line when the wave and kind match, else the seed's", () => {
    const lines = DEFAULT_PATTERNS.voice.boss.whisperer;
    const round = seatedRound();
    const wave = round.waveBounds.findIndex((b) => b.atom.startsWith('poison.'));
    expect(wave).toBeGreaterThanOrEqual(0);
    const s = createRoundState(round);
    s.bossLine = { wave, kind: 'whisperer', index: 5 };
    toBoss(s, 'whisperer');
    expect(s.bossLine).toBeNull();
    expect(toBossCard(s, 'whisperer')).toBe(lines[5]);
    expect(s.caption?.kind).toBe('wave');

    const t = createRoundState(seatedRound());
    t.bossLine = { wave, kind: 'menu', index: 5 };
    toBoss(t, 'whisperer');
    expect(t.bossLine).toBeNull();
    const tLine = toBossCard(t, 'whisperer');
    expect(tLine).not.toBe(lines[5]);
    expect(lines).toContain(tLine);

    const u = createRoundState(seatedRound());
    u.bossLine = { wave, kind: 'whisperer', index: 99 };
    toBoss(u, 'whisperer');
    expect(lines).toContain(toBossCard(u, 'whisperer'));
  });

  it('lands as an aside at its time, gives way to a wave card, and is dropped with the boss', () => {
    const s = createRoundState(seatedRound());
    toBoss(s, 'whisperer');
    expect(s.boss?.alive).toBe(true);
    // The spawn's wave card is up: the line waits for it. Its window is set
    // wide enough to cover the wait; a line that has to wait longer than its
    // window is dropped rather than said late, which the next case pins.
    s.bossSay = { text: 'Hush, the plate is listening.', at: s.t, until: s.t + 30 };
    tick(s);
    expect(s.caption?.kind).toBe('wave');
    expect(s.bossSay).not.toBeNull();
    while (s.caption && s.caption.kind === 'wave') tick(s);
    tick(s);
    expect(s.caption?.kind).toBe('aside');
    expect(s.caption?.text).toBe('Hush, the plate is listening.');
    expect(s.bossSay).toBeNull();
    // A line for later waits on the clock.
    s.bossSay = { text: 'Later.', at: s.t + 1, until: s.t + 30 };
    for (let i = 0; i < 20; i++) tick(s);
    expect(s.bossSay?.text).toBe('Later.');
    for (let i = 0; i < 20; i++) tick(s);
    expect(s.caption?.text).toBe('Later.');
    // A line whose boss is gone is dropped.
    s.bossSay = { text: 'Gone.', at: s.t, until: s.t + 30 };
    s.boss!.hp = 0;
    tick(s);
    tick(s);
    expect(s.bossSay).toBeNull();
    expect(s.caption?.text).not.toBe('Gone.');
  });
});

const NEW_HULLS = ['probe', 'shelf', 'ledger'] as const;

function hullSprite(sprite: string): Round['beats'][number]['sprite'] {
  return sprite as Round['beats'][number]['sprite'];
}

function hpOf(e: Enemy): number {
  const rec = e as Enemy & { hp?: number };
  return typeof rec.hp === 'number' ? rec.hp : 1;
}

function hullRound(sprite: string, over: Partial<Round> & { lie?: boolean } = {}): RoundState {
  const { lie = false, ...rest } = over;
  return createRoundState(
    roundOf({
      tapeId: `bout_${sprite}`,
      duration: 20,
      tier: 1,
      waveBounds: [{ atom: 'inspect.tools_list', t0: 0, t1: 18 }],
      beats: [
        {
          id: `inspect.tools_list:${sprite}:0`,
          t: 0,
          x: 240,
          sprite: hullSprite(sprite),
          lie,
          members: 1,
          source: {
            atom: 'inspect.tools_list',
            method: 'tools/call',
            note: 'tools/call echo',
            index: 0,
          },
        },
      ],
      ...rest,
    }),
  );
}

describe('the new hulls', () => {
  it('lets a shot connect on probe, shelf, and ledger, and none of them is a decoy', () => {
    for (const sprite of NEW_HULLS) {
      const state = hullRound(sprite);
      const target = state.enemies[0];
      if (sprite === 'shelf' && !target) {
        const lives0 = state.lives;
        let guard = 0;
        while (state.lives === lives0 && guard++ < 240) {
          const bank = state.hazards.find((h) => h.alive);
          if (bank) {
            state.player.x = bank.x;
            state.player.y = bank.y;
          }
          stepRound(state, { left: false, right: false, fire: false }, 1 / 30);
        }
        expect(state.lives, 'shelf contact').toBeLessThan(lives0);
        continue;
      }
      expect(target, sprite).toBeDefined();
      expect(isDecoy(target!), sprite).toBe(false);
      park(state, target!);
      let guard = 0;
      let connected = false;
      while (target!.alive && guard < 400) {
        stepRound(state, { left: false, right: false, fire: true }, 1 / 30);
        guard += 1;
        if (!target!.alive || target!.mode === 'dying' || target!.revealed) {
          connected = true;
          break;
        }
      }
      if (sprite === 'shelf' && !connected) {
        const lives = state.lives;
        state.player.x = target!.x;
        state.player.y = target!.y;
        stepRound(state, { left: false, right: false, fire: false }, 1 / 30);
        expect(state.lives, 'shelf contact').toBeLessThan(lives);
      } else {
        expect(connected, sprite).toBe(true);
      }
    }
  });

  it('probe dives', () => {
    const state = hullRound('probe');
    const target = state.enemies[0]!;
    park(state, target);
    let guard = 0;
    while (target.mode !== 'dive' && guard++ < 400) {
      stepRound(state, { left: false, right: false, fire: false }, 1 / 30);
    }
    expect(target.mode).toBe('dive');
  });

  it('ledger takes more than one hit', () => {
    const state = hullRound('ledger');
    const target = state.enemies[0]!;
    expect(hpOf(target)).toBeGreaterThan(1);
    park(state, target);
    let hits = 0;
    let prev = hpOf(target);
    let guard = 0;
    while (target.alive && guard < 600) {
      stepRound(state, { left: false, right: false, fire: true }, 1 / 30);
      guard += 1;
      const now = hpOf(target);
      if (now < prev || !target.alive || target.mode === 'dying') {
        hits += 1;
        prev = now;
      }
    }
    expect(hits).toBeGreaterThan(1);
    expect(target.alive).toBe(false);
  });

  it('a lie of a new class shares the honest sprite until revealOnHit (G7)', () => {
    for (const sprite of NEW_HULLS) {
      const lie = hullRound(sprite, { lie: true });
      const honest = hullRound(sprite, { lie: false });
      const a = lie.enemies[0]!;
      const b = honest.enemies[0]!;
      expect(a.sprite, sprite).toBe(b.sprite);
      expect(a.w, sprite).toBe(b.w);
      expect(a.h, sprite).toBe(b.h);
      expect(fillFor(a.sprite, false), sprite).toBe(fillFor(b.sprite, false));
      expect(a.revealed).toBe(false);
      revealOnHit(a);
      revealOnHit(b);
      expect(a.revealed, sprite).toBe(true);
      expect(b.revealed, sprite).toBe(false);
    }
  });
});

describe('the archivist', () => {
  it('closes inspect waves; poison still brings the whisperer', () => {
    expect(bossKindFor('inspect.anything')).toBe('archivist');
    expect(bossKindFor('inspect.tools_list')).toBe('archivist');
    expect(bossKindFor('poison.follow_through')).toBe('whisperer');
    expect(bossKindFor('temporal.rug_pull')).toBe('menu');
    expect(bossKindFor('protocol.unlisted_call')).toBe('doorman');
  });

  it('never leaves two bosses alive, even when a peak midboss can spawn', () => {
    expect(flavorAt(3).role).toBe('peak');
    const file = path.resolve(__dirname, '../../../fixtures/tapes/naive-ndjson.tape.json');
    const raw = JSON.parse(readFileSync(file, 'utf8')) as Tape;
    const round = prepassRound(loadTape(raw), {
      seconds: 150,
      seed: 0,
      tier: 2,
      climb: 1,
    });
    (round as Round & { flavor?: unknown }).flavor = flavorAt(3);
    const state = createRoundState(round);
    const idle = { left: false, right: false, fire: false };
    const bossBoxes = new Set(Object.values(DEFAULT_PATTERNS.bosses).map((b) => `${b.w}x${b.h}`));
    while (!state.scene && state.t < state.duration) {
      state.lives = state.maxLives;
      stepRound(state, idle, 1 / 30);
      const hulls: string[] = [];
      if (state.boss?.alive) hulls.push(`boss:${state.boss.kind}`);
      for (const e of state.enemies) {
        if (!e.alive || state.t < e.tEnter) continue;
        if (e.id.includes('midboss') || bossBoxes.has(`${e.w}x${e.h}`)) {
          hulls.push(`enemy:${e.id}`);
        }
      }
      expect(hulls.length, `t=${state.t.toFixed(2)} ${hulls.join(',')}`).toBeLessThanOrEqual(1);
    }
  });
});

// openWave used to close only waveBounds[wave - 1]. syncWave reads the wave
// from the clock, so a span shorter than dt (or a caller stepping with a big
// dt) can advance by more than one, and the skipped wave's enemies were never
// set to exit: they kept hovering, firing and diving on top of the new wave
// for the rest of the round.
describe('a wave the clock jumped over', () => {
  const NONE = { left: false, right: false, fire: false };

  function beatOf(atom: string, t: number, x: number, index: number) {
    return {
      id: `${atom}:init:${index}`,
      t,
      x,
      sprite: 'init' as const,
      lie: false,
      members: 1,
      source: { atom, method: 'initialize', note: 'initialize', index },
    };
  }

  function skipRound() {
    return createRoundState(
      roundOf({
        tapeId: 'bout_skip',
        duration: 20,
        waveBounds: [
          { atom: 'inspect.a', t0: 0, t1: 0.05 },
          { atom: 'inspect.b', t0: 0.05, t1: 0.1 },
          { atom: 'inspect.c', t0: 0.1, t1: 20 },
        ],
        beats: [
          beatOf('inspect.a', 0, 60, 0),
          beatOf('inspect.b', 0, 160, 1),
          beatOf('inspect.c', 0, 260, 2),
        ],
      }),
    );
  }

  it('closes every bound before the new wave, not just the last one', () => {
    const state = skipRound();
    for (const e of state.enemies) park(state, e);
    // One step longer than the first two spans together: wave 0 and wave 1
    // are both crossed inside a single tick.
    advance(state, NONE, 0.2);
    expect(state.wave).toBe(2);
    for (const atom of ['inspect.a', 'inspect.b']) {
      const flying = state.enemies.filter(
        (e) =>
          e.id.startsWith(`${atom}:`) &&
          e.alive &&
          e.mode !== 'exit' &&
          e.mode !== 'dying' &&
          e.mode !== 'caught',
      );
      expect(
        flying.map((e) => e.id),
        `${atom} kept flying into wave 2`,
      ).toEqual([]);
    }
    const open = state.enemies.filter((e) => e.id.startsWith('inspect.c:') && e.alive);
    expect(open.length, 'the new wave was closed too').toBeGreaterThan(0);
  });
});

// state.enemies was pushed to and never filtered, so every hull that ever
// died was re-walked by all seven per-frame loops for the rest of the round,
// and spawnDecoys counted those dead hulls as live copies — a host that
// survived a burst-off/burst-on cycle could then never get copies again.
describe('dead hulls leave the field', () => {
  const NONE = { left: false, right: false, fire: false };

  it('compacts dying enemies out of state.enemies and keeps caught trophies', () => {
    const state = createRoundState(
      roundOf({
        tapeId: 'bout_compact',
        duration: 12,
        waveBounds: [{ atom: 'inspect.tools_list', t0: 0, t1: 10 }],
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
            id: 'inspect.tools_list:menu:1',
            t: 0,
            x: 200,
            sprite: 'menu',
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
    const trophy = state.enemies.find((e) => e.id.endsWith(':menu:1'))!;
    park(state, honest);
    park(state, trophy);
    revealOnHit(trophy);
    honest.mode = 'dying';
    honest.dieAt = state.t;
    stepRound(state, NONE, 1 / 30);
    stepRound(state, NONE, 1 / 30);
    expect(honest.alive, 'the hull did not die').toBe(false);
    expect(
      state.enemies.some((e) => e.id === honest.id),
      'a dead hull is still walked every frame',
    ).toBe(false);
    expect(
      state.enemies.some((e) => e.id === trophy.id),
      'the caught trophy the end scene draws was compacted away',
    ).toBe(true);
  });

  it('tops a host up again on the frame after its copies died', () => {
    const bounds = [{ atom: 'inspect.tools_list', t0: 0, t1: 28 }];
    const spec = DEFAULT_PATTERNS.parallelism.tiers['1'];
    const extras = copiesAt(spec, 0, 1, 0) - 1;
    expect(extras).toBeGreaterThan(0);
    const state = createRoundState(
      roundOf({
        tapeId: 'bout_topup',
        duration: 30,
        seed: 0,
        tier: 1,
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
        ],
      }),
    );
    state.lives = 99;
    const hosts = () =>
      state.enemies.filter((e) => !isDecoy(e) && e.alive && e.mode === 'hover' && !e.lie);
    const copies = () => state.enemies.filter((e) => isDecoy(e) && e.alive);
    let ready = false;
    while (state.t < 25 && !state.scene) {
      stepRound(state, NONE, 1 / 30);
      if (state.parallelism && hosts().length > 0 && copies().length >= extras) {
        ready = true;
        break;
      }
    }
    expect(ready, 'the burst never produced copies').toBe(true);
    // Every copy dies on this frame. They are still in state.enemies when
    // spawnDecoys runs next frame (compaction is the last thing a step does),
    // and counting them as copies left the host permanently unable to top up.
    for (const e of state.enemies) if (isDecoy(e)) e.alive = false;
    stepRound(state, NONE, 1 / 30);
    expect(state.parallelism, 'the burst closed before the top-up').toBe(true);
    expect(copies().length, 'a host whose copies died never gets copies again').toBeGreaterThan(0);
    const ids = state.enemies.map((e) => e.id);
    expect(new Set(ids).size, 'a reused copy id').toBe(ids.length);
  });
});

// The formation's answer (2026-09-17). With the levers as they shipped a
// player holding fire killed a wave on its entry paths and the formation
// fired from the hover alone, a mode most sprites never reached: only the
// boss attacked. These levers are what the Director tunes.
describe('formation fire levers', () => {
  /** A tier-1 round with one menu sprite (a shooter that never dives) on its entry path, and a pattern set patched as asked. */
  function entering(patch: (set: PatternSet) => void): { state: RoundState; target: Enemy } {
    const set = JSON.parse(JSON.stringify(DEFAULT_PATTERNS)) as PatternSet;
    patch(set);
    const round = roundOf({
      tapeId: 'bout_fire',
      duration: 30,
      tier: 1,
      beats: [
        {
          id: 'inspect.tools_list:menu:0',
          t: 0,
          x: 240,
          sprite: 'menu',
          lie: false,
          members: 1,
          source: {
            atom: 'inspect.tools_list',
            method: 'tools/list',
            note: 'tools/list',
            index: 0,
          },
        },
      ],
    });
    attachPatterns(round, set);
    const state = createRoundState(round);
    const target = state.enemies[0]!;
    // Far from the ship's column, so the ship never shoots it.
    state.player.x = 20;
    return { state, target };
  }
  const shotsOf = (state: RoundState) => state.enemyShots.length;
  /** Steps once and says whether a shot left the formation on that step (shots are compacted as they leave the field). */
  const fired = (state: RoundState): boolean => {
    const before = shotsOf(state);
    stepRound(state, still, 1 / 60);
    return shotsOf(state) > before;
  };
  const still = { left: false, right: false, fire: false };

  it('fires on the way in only when the tier says onEntry, and from the hover regardless', () => {
    const quiet = entering((set) => {
      set.fire.tiers['1'].formation!.onEntry = false;
      set.fire.tiers['1'].formation!.firstShot = 0.1;
    });
    const loud = entering((set) => {
      set.fire.tiers['1'].formation!.onEntry = true;
      set.fire.tiers['1'].formation!.firstShot = 0.1;
    });
    let quietOnEntry = 0;
    let loudOnEntry = 0;
    // A shot counts as fired on the way in only when the sprite is still on
    // its path after the step: the clock is armed from the entry now, so a
    // sprite may fire on the very step it settles into the hover.
    for (let i = 0; i < 240; i++) {
      if (quiet.target.mode === 'enter' && fired(quiet.state) && quiet.target.mode === 'enter') {
        quietOnEntry += 1;
      }
      if (loud.target.mode === 'enter' && fired(loud.state) && loud.target.mode === 'enter') {
        loudOnEntry += 1;
      }
    }
    expect(quiet.target.mode).toBe('hover');
    expect(loud.target.mode).toBe('hover');
    expect(quietOnEntry).toBe(0);
    expect(loudOnEntry).toBeGreaterThan(0);
    // From the hover both fire.
    let quietHover = 0;
    for (let i = 0; i < 180; i++) if (fired(quiet.state)) quietHover += 1;
    expect(quietHover).toBeGreaterThan(0);
  });

  it('brings the first shot forward by firstShot, as a fraction of the period', () => {
    const at = (firstShot: number): number => {
      const { state, target } = entering((set) => {
        set.fire.tiers['1'].formation!.onEntry = false;
        set.fire.tiers['1'].formation!.firstShot = firstShot;
      });
      park(state, target);
      state.player.x = 20;
      let guard = 0;
      while (shotsOf(state) === 0 && guard++ < 600) stepRound(state, still, 1 / 60);
      return state.t;
    };
    const period = DEFAULT_PATTERNS.fire.tiers['1'].formation!.period;
    const whole = at(1);
    const half = at(0.5);
    expect(whole).toBeGreaterThan(period * 0.95);
    expect(half).toBeGreaterThan(period * 0.45);
    expect(half).toBeLessThan(period * 0.6);
  });

  it("honors a rung cap on the ship's shots in flight, and none when the rung has none", () => {
    const most = (cap: number | null): number => {
      const { state } = entering((set) => {
        set.ladder.rungs.find((r) => r.tier === 1)!.shotsInFlight = cap;
      });
      let peak = 0;
      for (let i = 0; i < 90; i++) {
        stepRound(state, { left: false, right: false, fire: true }, 1 / 60);
        peak = Math.max(peak, state.shots.length);
      }
      return peak;
    };
    expect(most(2)).toBe(2);
    expect(most(4)).toBe(4);
    expect(most(null)).toBeGreaterThan(4);
  });
});

// Grok's consult (docs/ghost-attack.grok-consult.md), the three line defects.
describe('the three defects behind the silent formation', () => {
  const still = { left: false, right: false, fire: false };
  /** A tier-1 round with one sprite of the class asked, on its entry path. */
  function roundWith(sprite: 'menu' | 'grid'): RoundState {
    const round = roundOf({
      tapeId: 'bout_defects',
      duration: 30,
      tier: 1,
      beats: [
        {
          id: `inspect.tools_list:${sprite}:0`,
          t: 0,
          x: 240,
          sprite,
          lie: false,
          members: 1,
          source: {
            atom: 'inspect.tools_list',
            method: 'tools/list',
            note: 'tools/list',
            index: 0,
          },
        },
      ],
    });
    attachPatterns(round, DEFAULT_PATTERNS);
    const state = createRoundState(round);
    state.player.x = 20;
    return state;
  }

  it('a sprite above the field cannot be hit', () => {
    const state = roundWith('menu');
    const target = state.enemies[0]!;
    // Spawned half above the top edge, as a path that starts at the edge does.
    expect(target.y).toBeLessThan(0);
    expect(isHittable(state, target)).toBe(false);
    target.y = 0;
    expect(isHittable(state, target)).toBe(true);
  });

  it("arms a shooter's clock at its entry, so the first shot comes as it settles rather than a period later", () => {
    const state = roundWith('menu');
    const target = state.enemies[0]!;
    let hoverAt = Number.POSITIVE_INFINITY;
    let firstShotAt = Number.POSITIVE_INFINITY;
    for (let i = 0; i < 600 && firstShotAt === Number.POSITIVE_INFINITY; i++) {
      const before = state.enemyShots.length;
      stepRound(state, still, 1 / 60);
      if (target.mode === 'hover' && hoverAt === Number.POSITIVE_INFINITY) hoverAt = state.t;
      if (state.enemyShots.length > before) firstShotAt = state.t;
    }
    const period = DEFAULT_PATTERNS.fire.tiers['1'].formation!.period;
    const firstShot = DEFAULT_PATTERNS.fire.tiers['1'].formation!.firstShot;
    // The entry is longer than firstShot × period, so the clock has run out by
    // the time the sprite settles: it fires on its first hover ticks.
    expect(hoverAt).toBeGreaterThan(period * firstShot);
    expect(firstShotAt).toBeLessThan(hoverAt + 0.2);
  });

  it('a diving grid keeps its gun', () => {
    const state = roundWith('grid');
    const target = state.enemies[0]!;
    let dived = false;
    let shotWhileDiving = 0;
    for (let i = 0; i < 1200; i++) {
      const before = state.enemyShots.length;
      stepRound(state, still, 1 / 60);
      if (target.mode === 'dive') {
        dived = true;
        if (state.enemyShots.length > before) shotWhileDiving += 1;
      }
      if (!target.alive) break;
    }
    expect(dived).toBe(true);
    expect(shotWhileDiving).toBeGreaterThan(0);
  });
});

// The Director's ask (2026-09-17): a capped column needs something to catch.
describe('the fire drops', () => {
  const still = { left: false, right: false, fire: false };
  const firing = { left: false, right: false, fire: true };
  /** A tier-1 round with one grid sprite parked in the hover under the ship, patched as asked. */
  function parked(patch?: (set: PatternSet) => void): {
    state: RoundState;
    target: Enemy;
    set: PatternSet;
  } {
    const set = JSON.parse(JSON.stringify(DEFAULT_PATTERNS)) as PatternSet;
    // No sweep here: the ship is parked under the sprite and must stay under it.
    set.ladder.rungs.find((r) => r.tier === 1)!.sweep = 0;
    patch?.(set);
    const round = roundOf({
      tapeId: 'bout_drops',
      duration: 60,
      tier: 1,
      beats: [
        {
          id: 'inspect.tools_list:grid:0',
          t: 0,
          x: 240,
          sprite: 'grid',
          lie: false,
          members: 1,
          source: { atom: 'inspect.tools_list', method: 'tools/call', note: 'echo', index: 0 },
        },
      ],
    });
    attachPatterns(round, set);
    const state = createRoundState(round);
    return { state, target: state.enemies[0]!, set };
  }

  it("a rapid drop opens the column: the cap and the cooldown are the drop's while it runs", () => {
    const { state, set } = parked();
    state.player.x = 20;
    // The clock is what is measured, not survival under aimed fire.
    state.lives = 1000;
    const rung = set.ladder.rungs.find((r) => r.tier === 1)!;
    let peak = 0;
    for (let i = 0; i < 60; i++) {
      stepRound(state, firing, 1 / 60);
      peak = Math.max(peak, state.shots.length);
    }
    expect(peak).toBe(rung.shotsInFlight);
    state.rapidT = set.drops.rapid.duration;
    state.shots = [];
    let rapidPeak = 0;
    for (let i = 0; i < 60; i++) {
      stepRound(state, firing, 1 / 60);
      rapidPeak = Math.max(rapidPeak, state.shots.length);
    }
    expect(rapidPeak).toBe(set.drops.rapid.shotsInFlight);
    expect(rapidPeak).toBeGreaterThan(peak);
    // It runs out.
    for (let i = 0; i < 60 * 9; i++) stepRound(state, still, 1 / 60);
    expect(state.rapidT).toBe(0);
  });

  it('a pierce drop lets a shot keep going through the sprite it hits', () => {
    const { state, target } = parked();
    park(state, target);
    state.pierceT = 8;
    let hit = false;
    for (let i = 0; i < 90 && !hit; i++) {
      stepRound(state, firing, 1 / 60);
      if (target.mode === 'dying') hit = true;
    }
    expect(hit).toBe(true);
    // The shot that killed it is still in the air.
    expect(state.shots.some((s) => s.pierce && !s.dead)).toBe(true);
  });

  it('a downed grid lets a fire drop fall, drawn by seed over the weights', () => {
    const { state, target, set } = parked();
    park(state, target);
    let guard = 0;
    while (state.drops.length === 0 && guard++ < 120) stepRound(state, firing, 1 / 60);
    expect(state.drops.length).toBe(1);
    expect(['spread', 'rapid', 'pierce']).toContain(state.drops[0]!.kind);
    // The same seed draws the same kind; a weight of zero never falls.
    const again = parked();
    park(again.state, again.target);
    guard = 0;
    while (again.state.drops.length === 0 && guard++ < 120) stepRound(again.state, firing, 1 / 60);
    expect(again.state.drops[0]!.kind).toBe(state.drops[0]!.kind);
    const only = parked((s) => {
      s.drops.spread.weight = 0;
      s.drops.rapid.weight = 0;
    });
    park(only.state, only.target);
    guard = 0;
    while (only.state.drops.length === 0 && guard++ < 120) stepRound(only.state, firing, 1 / 60);
    expect(only.state.drops[0]!.kind).toBe('pierce');
    expect(set.drops.pierce.duration).toBeGreaterThan(0);
  });

  it('catching a rapid or a pierce drop starts its clock', () => {
    const { state, set } = parked((s) => {
      s.drops.spread.weight = 0;
      s.drops.pierce.weight = 0;
    });
    const target = state.enemies[0]!;
    park(state, target);
    let guard = 0;
    while (state.drops.length === 0 && guard++ < 120) stepRound(state, firing, 1 / 60);
    const drop = state.drops[0]!;
    expect(drop.kind).toBe('rapid');
    // Put the ship under it and let it fall in.
    state.player.x = drop.x + drop.w / 2 - state.player.w / 2;
    guard = 0;
    while (state.rapidT === 0 && guard++ < 600) stepRound(state, still, 1 / 60);
    expect(state.rapidT).toBeGreaterThan(set.drops.rapid.duration - 0.2);
  });
});

// The Director's ask (2026-09-17): the formation never reached the edges.
describe('the hover sweeps the field', () => {
  const still = { left: false, right: false, fire: false };
  function hovering(sweep: number, period = 4): { state: RoundState; target: Enemy } {
    const set = JSON.parse(JSON.stringify(DEFAULT_PATTERNS)) as PatternSet;
    const rung = set.ladder.rungs.find((r) => r.tier === 1)!;
    rung.sweep = sweep;
    rung.sweepPeriod = period;
    const round = roundOf({
      tapeId: 'bout_sweep',
      duration: 60,
      tier: 1,
      beats: [
        {
          id: 'inspect.tools_list:menu:0',
          t: 0,
          x: 240,
          sprite: 'menu',
          lie: false,
          members: 1,
          source: {
            atom: 'inspect.tools_list',
            method: 'tools/list',
            note: 'tools/list',
            index: 0,
          },
        },
      ],
    });
    attachPatterns(round, set);
    const state = createRoundState(round);
    const target = state.enemies[0]!;
    park(state, target);
    state.player.x = 20;
    return { state, target };
  }

  it('crosses most of the field over a period with the sweep on, and stays home with it off', () => {
    const on = hovering(1, 4);
    let lo = Number.POSITIVE_INFINITY;
    let hi = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < 60 * 4; i++) {
      stepRound(on.state, still, 1 / 60);
      lo = Math.min(lo, on.target.x);
      hi = Math.max(hi, on.target.x + on.target.w);
    }
    expect(lo).toBeLessThan(FIELD.width * 0.1);
    expect(hi).toBeGreaterThan(FIELD.width * 0.9);
    const off = hovering(0);
    const home = off.target.x;
    for (let i = 0; i < 60 * 4; i++) {
      stepRound(off.state, still, 1 / 60);
      expect(Math.abs(off.target.x - home)).toBeLessThanOrEqual(7);
    }
  });

  it('is a lever per rung, on at every rung that fires', () => {
    for (const r of DEFAULT_PATTERNS.ladder.rungs) {
      if (r.tier === 0) continue;
      expect(r.sweep, `tier ${r.tier}`).toBeGreaterThanOrEqual(0.9);
      expect(r.sweepPeriod).toBeGreaterThan(0);
    }
  });
});

// The Director's note (2026-09-17): from the side only the divers hit.
describe('aimed formation fire', () => {
  const still = { left: false, right: false, fire: false };
  function shooter(aim: boolean): RoundState {
    const set = JSON.parse(JSON.stringify(DEFAULT_PATTERNS)) as PatternSet;
    set.fire.tiers['1'].formation!.aim = aim;
    set.fire.tiers['1'].formation!.firstShot = 0.1;
    set.ladder.rungs.find((r) => r.tier === 1)!.sweep = 0;
    const round = roundOf({
      tapeId: 'bout_aim',
      duration: 30,
      tier: 1,
      beats: [
        {
          id: 'inspect.tools_list:menu:0',
          t: 0,
          x: 240,
          sprite: 'menu',
          lie: false,
          members: 1,
          source: {
            atom: 'inspect.tools_list',
            method: 'tools/list',
            note: 'tools/list',
            index: 0,
          },
        },
      ],
    });
    attachPatterns(round, set);
    const state = createRoundState(round);
    park(state, state.enemies[0]!);
    // The ship parked at the far left; the sprite hovers mid-field.
    state.player.x = 8;
    return state;
  }
  it('lands on a ship parked at the edge when the rung aims, and never when it does not', () => {
    const aimed = shooter(true);
    const straight = shooter(false);
    let aimedHit = false;
    let straightHit = false;
    for (let i = 0; i < 60 * 8; i++) {
      stepRound(aimed, still, 1 / 60);
      stepRound(straight, still, 1 / 60);
      if (aimed.lives < aimed.maxLives) aimedHit = true;
      if (straight.lives < straight.maxLives) straightHit = true;
    }
    expect(aimedHit).toBe(true);
    expect(straightHit).toBe(false);
    for (const k of ['1', '2', '3'] as const)
      expect(DEFAULT_PATTERNS.fire.tiers[k].formation!.aim).toBe(true);
  });
});

// The Director's rule (2026-09-17): the agent's lines are drawn at random
// and not drawn again until all have been used, and the pools grow with
// every update of the repo until they feel diverse.
describe('the voice pools are bags, and they grow', () => {
  const still = { left: false, right: false, fire: false };
  /** A one-beat round at seat with the atom asked, sharing the caller's bags. */
  function roundWith(atom: string, bags: LineBags, seed = 1): RoundState {
    const round = roundOf({
      tapeId: 'bout_bags',
      duration: 6,
      seed,
      tier: 1,
      waveBounds: [{ atom, t0: 0, t1: 5 }],
      beats: [
        {
          id: `${atom}:menu:0`,
          t: 0,
          x: 240,
          sprite: 'menu',
          lie: false,
          members: 1,
          source: { atom, method: 'tools/list', note: 'tools/list', index: 0 },
        },
      ],
    });
    attachPatterns(round, DEFAULT_PATTERNS);
    return createRoundState(round, { bags });
  }

  it('a wave line is not heard again until its whole pool has been heard, across rounds that share the bags', () => {
    const pool = DEFAULT_PATTERNS.voice.wave.poison;
    const bags: LineBags = {};
    const heard: string[] = [];
    for (let i = 0; i < pool.length; i++) {
      const state = roundWith('poison.follow_through', bags, 7 + i);
      stepRound(state, still, 1 / 60);
      heard.push(state.caption!.line!);
    }
    expect(new Set(heard).size).toBe(pool.length);
    expect([...heard].sort()).toEqual([...pool].sort());
    // The next round begins a new walk through the same pool.
    const again = roundWith('poison.follow_through', bags, 99);
    stepRound(again, still, 1 / 60);
    expect(pool).toContain(again.caption!.line!);
  });

  it('a round with no bags of its own walks the same lines for the same seed', () => {
    const a = roundWith('temporal.rug_pull', {}, 3);
    const b = roundWith('temporal.rug_pull', {}, 3);
    stepRound(a, still, 1 / 60);
    stepRound(b, still, 1 / 60);
    expect(a.caption!.line).toBe(b.caption!.line);
  });

  it('an end line and a catch line come from their own bags', () => {
    const bags: LineBags = {};
    const ends = new Set<string>();
    for (let i = 0; i < DEFAULT_PATTERNS.voice.end.length; i++) {
      const state = roundWith('inspect.tools_list', bags, 11 + i);
      state.t = 5.99;
      stepRound(state, still, 0.05);
      expect(state.scene).not.toBeNull();
      ends.add(state.scene!.line!);
    }
    expect(ends.size).toBe(DEFAULT_PATTERNS.voice.end.length);
    expect(bags['end']).toBeDefined();
  });

  it('every pool is at least a dozen lines with no line repeated in it, and the boss pools fit the letter seat', () => {
    const v = DEFAULT_PATTERNS.voice;
    for (const [name, lines] of [
      ...Object.entries(v.wave).map(([k, l]) => [`wave/${k}`, l] as const),
      ...Object.entries(v.boss).map(([k, l]) => [`boss/${k}`, l] as const),
      ...Object.entries(v.aside).map(([k, l]) => [`aside/${k}`, l] as const),
      ...Object.entries(v.catch).map(([k, l]) => [`catch/${k}`, l] as const),
      ['end', v.end] as const,
    ]) {
      expect(lines.length, name).toBeGreaterThanOrEqual(12);
      expect(new Set(lines).size, name).toBe(lines.length);
    }
    for (const lines of Object.values(v.boss)) expect(lines.length).toBeLessThanOrEqual(26);
  });

  it('reads a bag store back only in its own shape', () => {
    expect(readLineBags(null)).toEqual({});
    expect(
      readLineBags({ 'wave/inspect': { order: [2, 0, 1], at: 1, cycle: 0 }, junk: 3 }),
    ).toEqual({
      'wave/inspect': { order: [2, 0, 1], at: 1, cycle: 0 },
    });
    expect(readLineBags({ end: { order: 'no', at: 0, cycle: 0 } })).toEqual({});
    expect(readLineBags({ end: { order: [], at: -1, cycle: 0 } })).toEqual({});
  });
});

// The Director's note (2026-09-17): a shot from beside or below the ship cannot be dodged.
describe('formation fire comes from above', () => {
  const still = { left: false, right: false, fire: false };
  function parkedAt(y: number, fromAbove: number): RoundState {
    const set = JSON.parse(JSON.stringify(DEFAULT_PATTERNS)) as PatternSet;
    set.fire.tiers['1'].formation!.aim = true;
    set.fire.tiers['1'].formation!.firstShot = 0.1;
    set.fire.tiers['1'].formation!.fromAbove = fromAbove;
    set.ladder.rungs.find((r) => r.tier === 1)!.sweep = 0;
    const round = roundOf({
      tapeId: 'bout_above',
      duration: 30,
      tier: 1,
      beats: [
        {
          id: 'inspect.tools_list:menu:0',
          t: 0,
          x: 240,
          sprite: 'menu',
          lie: false,
          members: 1,
          source: {
            atom: 'inspect.tools_list',
            method: 'tools/list',
            note: 'tools/list',
            index: 0,
          },
        },
      ],
    });
    attachPatterns(round, set);
    const state = createRoundState(round);
    const target = state.enemies[0]!;
    park(state, target);
    target.y = y;
    target.hoverY = y;
    state.player.x = 8;
    return state;
  }
  it('a sprite level with the ship is silent under the lever; the same sprite high above fires; with the lever at zero the low one fires too', () => {
    const shotsIn = (state: RoundState) => {
      for (let i = 0; i < 120; i++) stepRound(state, still, 1 / 60);
      return state.enemyShots.length;
    };
    const low = parkedAt(300, 96);
    const high = parkedAt(80, 96);
    const lowNoLever = parkedAt(300, 0);
    expect(shotsIn(low)).toBe(0);
    expect(shotsIn(high)).toBeGreaterThan(0);
    expect(shotsIn(lowNoLever)).toBeGreaterThan(0);
    for (const k of ['1', '2', '3'] as const)
      expect(DEFAULT_PATTERNS.fire.tiers[k].formation!.fromAbove).toBeGreaterThan(0);
  });
});

// Stage C (humanization). Four things the sim did silently, and one it did
// over the player's reading: the dt it was handed, the lamp it took, the drop
// it applied, the ending it did not name, and the boss card it wrote over a
// wave card that was still on the field.
describe('what the round says, and the step it is asked to take', () => {
  const NO: RoundInput = { left: false, right: false, fire: false };

  function bossRound(): Round {
    const file = path.resolve(__dirname, '../../../fixtures/tapes/naive-ndjson.tape.json');
    const raw = JSON.parse(readFileSync(file, 'utf8')) as Tape;
    return prepassRound(loadTape(raw), { seconds: 150, seed: 0, tier: 1 });
  }

  function whispererRound(): Round {
    // The Whisperer's grids come out from under it, so it takes the field on
    // its own beat rather than waiting for a grid to be downed.
    return roundOf({
      tapeId: 'bout_card',
      duration: 20,
      seed: 42,
      waveBounds: [{ atom: 'poison.follow_through', t0: 0, t1: 18 }],
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
      ],
    });
  }

  it('holds the wave card for its whole beat even when a boss takes the field', () => {
    // The boss takes the field at the wave hold and the card holds longer, so
    // spawnBoss used to replace the first authored line of every wave after
    // about a second and a half of its own beat — two sentences of prose
    // under one headline word, the second written over the first.
    const state = createRoundState(whispererRound());
    stepRound(state, NO, 1 / 30);
    const wavePools = Object.values(DEFAULT_PATTERNS.voice.wave).flat();
    const bossPools = Object.values(DEFAULT_PATTERNS.voice.boss).flat();
    const opened = state.caption!.line!;
    expect(wavePools).toContain(opened);
    let sawBoss = false;
    let guard = 0;
    let heldUntil = 0;
    // Through the whole of the card's own hold the line does not change, so
    // the boss's line is never on the field while the card is.
    while (guard++ < 400 && state.caption && state.caption.line === opened) {
      heldUntil = state.t;
      if (state.boss && state.boss.alive) sawBoss = true;
      expect(bossPools).not.toContain(state.caption.line);
      stepRound(state, NO, 1 / 30);
    }
    // The boss took the field on its own beat, well inside the card's hold.
    expect(sawBoss).toBe(true);
    // And the card kept its whole beat: the Director's hold, not the boss's.
    expect(heldUntil).toBeGreaterThan(2.3);
  });

  it('lands the held boss card once the field is clear, still in the boss pool', () => {
    const state = createRoundState(bossRound());
    const bossPools = Object.values(DEFAULT_PATTERNS.voice.boss).flat();
    let guard = 0;
    let landed: string | null = null;
    while (guard++ < 1200 && !state.scene && landed === null) {
      for (const e of state.enemies) e.alive = false;
      state.lives = state.maxLives;
      stepRound(state, NO, 1 / 30);
      const line = state.caption?.line;
      if (line && bossPools.includes(line)) landed = line;
    }
    expect(landed).not.toBeNull();
    expect(state.caption!.kind).toBe('wave');
  });

  it('drops a dt it cannot integrate and caps the one it can', () => {
    const state = createRoundState(roundOf({ tapeId: 'bout_dt', duration: 40 }));
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -1, 0]) {
      stepRound(state, NO, bad);
      expect(Number.isFinite(state.t)).toBe(true);
      expect(state.t).toBe(0);
    }
    // A caller that asks for a whole second gets MAX_DT of clock, not a
    // second of integration with a diver crossing the hitbox inside it.
    stepRound(state, NO, 1);
    expect(state.t).toBeCloseTo(MAX_DT, 10);
  });

  it('says a word when a lamp goes, keyed by what took it', () => {
    const pools = DEFAULT_PATTERNS.voice.lamp;
    const state = createRoundState(roundOf({ tapeId: 'bout_lamp', duration: 40 }));
    state.lives = 4;
    state.grace = 0;
    state.enemyShots.push({
      x: state.player.x,
      y: state.player.y,
      w: 4,
      h: 4,
      vx: 0,
      vy: 10,
      dead: false,
    });
    stepRound(state, NO, 0.01);
    expect(state.lives).toBe(3);
    expect(state.caption?.kind).toBe('lamp');
    expect(pools.shot).toContain(state.caption!.text);
    expect(state.caption!.text).not.toMatch(FORBIDDEN_CAPTION);
    // The four causes are four pools, so a player can learn what is killing
    // them; every line in every one is clean.
    for (const cause of ['hazard', 'dive', 'shelf', 'shot'] as const) {
      expect(pools[cause].length).toBeGreaterThan(0);
      for (const line of pools[cause]) expect(line).not.toMatch(FORBIDDEN_CAPTION);
    }
  });

  it('says a word on a caught drop and again when a timed one runs out', () => {
    const state = createRoundState(roundOf({ tapeId: 'bout_drop', duration: 40 }));
    const spec = DEFAULT_PATTERNS.drops.spread;
    state.drops.push({
      kind: 'spread',
      x: state.player.x,
      y: state.player.y,
      w: spec.box.w,
      h: spec.box.h,
      alive: true,
    });
    stepRound(state, NO, 0.01);
    expect(state.spreadT).toBeGreaterThan(0);
    expect(DEFAULT_PATTERNS.voice.drops.catch.spread).toContain(state.caption!.text);
    let guard = 0;
    while (guard++ < 4000 && state.spreadT > 0) stepRound(state, NO, MAX_DT);
    // The tick that spends the last of it says so rather than leaving the
    // player to discover the fan has closed.
    expect(DEFAULT_PATTERNS.voice.drops.ends.spread).toContain(state.caption!.text);
  });

  it('names the ending on the closing scene, differently for the two endings', () => {
    const byTime = createRoundState(roundOf({ tapeId: 'bout_end_time', duration: 1 }));
    while (!byTime.scene) stepRound(byTime, NO, MAX_DT);
    expect(byTime.ended).toBe('time');
    expect(DEFAULT_PATTERNS.voice.ending.time).toContain(byTime.scene!.ending);

    const byLamps = createRoundState(roundOf({ tapeId: 'bout_end_lamps', duration: 40 }));
    byLamps.lives = 0;
    stepRound(byLamps, NO, MAX_DT);
    expect(byLamps.ended).toBe('lamps');
    expect(DEFAULT_PATTERNS.voice.ending.lamps).toContain(byLamps.scene!.ending);
    expect(byLamps.scene!.ending).not.toBe(byTime.scene!.ending);
  });

  // watchSaid overloaded one variable as both the caption key and a 'scene'
  // sentinel, so every round's closing rows were emitted TWICE: stepRound
  // returns the moment state.scene is set, so state.caption is never cleared,
  // the next see() found a key that was not 'scene' any more, re-pushed the
  // live caption, and the scene branch then re-pushed the ending and the
  // line. Both runners call see() once after their loop, so both hit it.
  it("emits a round's closing rows once however many times it is seen", () => {
    const state = createRoundState(roundOf({ tapeId: 'bout_said', duration: 2 }));
    const watcher = watchSaid();
    let guard = 0;
    while (guard++ < 400 && !state.scene) {
      stepRound(state, NO, MAX_DT);
      watcher.see(state);
    }
    expect(state.scene).not.toBeNull();
    // A live caption is still set on the frame the scene lands; the renderer
    // refuses to paint it and the watcher now refuses to record it.
    const after = watcher.rows().length;
    for (let i = 0; i < 5; i++) watcher.see(state);
    expect(watcher.rows().length).toBe(after);

    const closing = watcher.rows().filter((r) => r.kind === 'scene' || r.kind === 'ending');
    expect(closing.length).toBeGreaterThan(0);
    for (const kind of ['scene', 'ending']) {
      expect(closing.filter((r) => r.kind === kind).length).toBeLessThanOrEqual(1);
    }
  });

  it('drops a seat line whose window closed instead of saying it late', () => {
    const state = createRoundState(roundOf({ tapeId: 'bout_say', duration: 40 }));
    state.bossSay = { text: 'Now, while the plate is open.', at: 0, until: 0.2 };
    // The field is clear but the clock has run past the window.
    let guard = 0;
    while (guard++ < 40 && state.t <= 0.3) stepRound(state, NO, MAX_DT);
    expect(state.bossSay).toBeNull();
    expect(state.caption?.text).not.toBe('Now, while the plate is open.');
  });
});

// A phone had no way to fly the ship: RoundInput was two booleans, and a
// synthetic pulse train aimed at a finger oscillates around the target rather
// than settling on it. Both new fields are absent by default, so a caller
// written before them is unchanged.
describe('a steering target and a held control', () => {
  const NONE = { left: false, right: false, fire: false };
  const touchRound = () => roundOf({ tapeId: 'bout_touch', duration: 20 });

  it('honors toX ahead of the buttons and spends the same budget they do', () => {
    const button = createRoundState(touchRound());
    const target = createRoundState(touchRound());
    const start = button.player.x;
    stepRound(button, { ...NONE, right: true }, MAX_DT);
    // The button says left, the target says right: the target wins.
    stepRound(target, { ...NONE, left: true, toX: FIELD.width }, MAX_DT);
    expect(target.player.x).toBeGreaterThan(start);
    expect(target.player.x - start).toBeCloseTo(button.player.x - start, 6);
    expect(button.player.x - start).toBeCloseTo(DEFAULT_PATTERNS.player.speed * MAX_DT, 6);
  });

  it('settles on the target inside the deadband instead of circling it', () => {
    const state = createRoundState(touchRound());
    const to = 100;
    for (let i = 0; i < 200; i++) stepRound(state, { ...NONE, toX: to }, MAX_DT);
    const center = state.player.x + state.player.w / 2;
    expect(Math.abs(center - to)).toBeLessThanOrEqual(DEFAULT_PATTERNS.player.follow);
    // And the lever is a lever, not a literal.
    expect(DEFAULT_PATTERNS.player.follow).toBeGreaterThan(0);
  });

  it('leaves a caller that never steers by target exactly where it was', () => {
    const plain = createRoundState(touchRound());
    const explicit = createRoundState(touchRound());
    advance(plain, { ...NONE, right: true, fire: true }, 1);
    advance(explicit, { ...NONE, right: true, fire: true, autoFire: false }, 1);
    expect(explicit.player.x).toBe(plain.player.x);
    expect(explicit.shots.length).toBe(plain.shots.length);
    expect(explicit.refusals).toBe(plain.refusals);
    // And a target the ship is already sitting on moves nothing at all.
    const held = createRoundState(touchRound());
    const at = held.player.x;
    stepRound(held, { ...NONE, toX: at + held.player.w / 2 }, MAX_DT);
    expect(held.player.x).toBe(at);
  });

  it('fires a held control through the same cooldown and the same cap', () => {
    const held = createRoundState(touchRound());
    const tapped = createRoundState(touchRound());
    advance(held, { ...NONE, autoFire: true }, 1);
    advance(tapped, { ...NONE, fire: true }, 1);
    expect(held.shots.length).toBe(tapped.shots.length);
    expect(held.refusals).toBe(tapped.refusals);
  });
});

// Nothing told a player the column was full, so the Director's own cap read
// as a dropped button: no sound, no picture, and no record of the press.
describe('a press the column swallowed', () => {
  const NONE = { left: false, right: false, fire: false };

  it('records the refusal and holds the flag while the button stays down', () => {
    const state = createRoundState(roundOf({ tapeId: 'bout_cap', duration: 20, tier: 1 }));
    const cap = DEFAULT_PATTERNS.ladder.rungs.find((r) => r.tier === 1)!.shotsInFlight;
    expect(cap).toBeGreaterThan(0);
    // A caught spread puts three shots up a press, which is when the cap
    // bites — and the fan is exactly the moment the player most needs to know
    // the column is full rather than the button broken.
    state.spreadT = 5;
    let guard = 0;
    while (state.refusals === 0 && guard++ < 80) {
      stepRound(state, { ...NONE, fire: true }, MAX_DT);
    }
    expect(state.refusals).toBeGreaterThan(0);
    expect(state.columnFull).toBe(true);
    expect(state.shots.length).toBeGreaterThanOrEqual(cap as number);
    // The flag is the press, not the field: lift the button and it clears.
    stepRound(state, NONE, MAX_DT);
    expect(state.columnFull).toBe(false);
  });

  it('never refuses a press on the rung with no cap', () => {
    const state = createRoundState(roundOf({ tapeId: 'bout_free', duration: 20 }));
    expect(DEFAULT_PATTERNS.ladder.rungs.find((r) => r.tier === 0)!.shotsInFlight).toBeNull();
    state.spreadT = 5;
    advance(state, { ...NONE, fire: true }, 3);
    expect(state.refusals).toBe(0);
    expect(state.columnFull).toBe(false);
  });
});

// A hit that did not kill was invisible and silent, so the one multi-hit hull
// in the game read exactly like a shot fired into empty space.
describe('a hull that took a hit and lived', () => {
  it('reads its hit points from the lever and flashes on a hit it survived', () => {
    const state = hullRound('ledger');
    const target = state.enemies[0]!;
    expect(hpOf(target)).toBe(DEFAULT_PATTERNS.formations.hulls.ledger);
    park(state, target);
    expect(target.hitT).toBeUndefined();
    expect(state.hullHits).toBe(0);

    let guard = 0;
    const hp0 = hpOf(target);
    while (hpOf(target) === hp0 && target.alive && guard++ < 400) {
      stepRound(state, { left: false, right: false, fire: true }, MAX_DT);
    }
    expect(hpOf(target)).toBe(hp0 - 1);
    expect(state.hullHits).toBe(1);
    // The boss's own flash clock: zero on the frame of the hit, running after.
    expect(target.hitT).toBe(0);
    stepRound(state, { left: false, right: false, fire: false }, MAX_DT);
    expect(target.hitT).toBeGreaterThan(0);
  });

  it('leaves a one-shot hull with no flash clock at all', () => {
    const state = hullRound('grid');
    const target = state.enemies[0]!;
    expect(hpOf(target)).toBe(1);
    expect(target.hitT).toBeUndefined();
  });
});

// The blind costs the player the bottom of the field and said nothing in any
// channel: of every event that costs something it was the last with no word,
// and the one that most looks like the renderer breaking.
describe('the veil that lands', () => {
  const NONE = { left: false, right: false, fire: false };

  it('says a word from its own pool on the frame the veil lands', () => {
    const state = createRoundState(roundOf({ tapeId: 'bout_veil', duration: 20 }));
    state.fog = { x: 100, y: state.player.y - 20, w: 60, h: 20, vy: 60, alive: true };
    stepRound(state, NONE, MAX_DT);
    expect(state.blind).toBeGreaterThan(0);
    expect(state.fog).toBeNull();
    expect(state.caption).not.toBeNull();
    expect(state.caption!.kind).toBe('blind');
    expect(DEFAULT_PATTERNS.voice.blind).toContain(state.caption!.text);
    expect(state.caption!.text).not.toMatch(FORBIDDEN_CAPTION);
  });

  it('draws the pool the lead widens, in the register the lamp uses', () => {
    for (const line of DEFAULT_PATTERNS.voice.blind) {
      expect(line).toMatch(/^[ -~]+$/);
      expect(line.length).toBeLessThan(50);
      expect(line).not.toMatch(FORBIDDEN_CAPTION);
    }
    expect(DEFAULT_PATTERNS.voice.blind.length).toBeGreaterThanOrEqual(4);
  });
});
