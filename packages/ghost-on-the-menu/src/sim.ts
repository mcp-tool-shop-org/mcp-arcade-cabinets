import {
  FIELD,
  PARKING_Y,
  type Enemy,
  type Round,
  type RoundInput,
  type RoundState,
  type Shot,
  type WaveBound,
} from './types';

const PLAYER_SPEED = 240;
const SHOT_SPEED = 420;
const FIRE_COOLDOWN = 0.12;
const ENEMY_DESCEND = 70;
const PLAYER_W = 16;
const PLAYER_H = 12;
const SHOT_W = 4;
const SHOT_H = 10;
const HITSTOP = 0.12;
const SHAKE_DECAY = 0.3;
const DIE_POP = 0.15;
const CAPTION_T = 1.5;
const CAUGHT_RISE = 220;

const labels = new WeakMap<Enemy, string>();
const waveMeta = new WeakMap<RoundState, WaveBound[]>();

function overlaps(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function sanitizeCaption(note: string, method: string): string {
  const raw = (note.trim() || method).replace(/\d/g, '').replace(/\s+/g, ' ').trim();
  return raw
    .replace(/\b(pass|fail|score)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hittable(state: RoundState, enemy: Enemy): boolean {
  return (
    enemy.alive && state.t >= enemy.tEnter && enemy.mode !== 'caught' && enemy.mode !== 'dying'
  );
}

function syncWave(state: RoundState): void {
  const bounds = waveMeta.get(state) ?? [];
  let w = 0;
  for (let i = 0; i < bounds.length; i++) {
    if (state.t >= bounds[i]!.t0) w = i;
  }
  state.wave = w;
}

function endRound(state: RoundState, why: 'time' | 'lamps'): void {
  state.ended = why;
  state.scene = { tapeId: state.tapeId, cleared: [...state.cleared] };
}

/** Flag a lie only. Sets caught; alive stays true. Honest sprites stay unmarked. */
export function revealOnHit(enemy: Enemy): void {
  if (!enemy.lie) return;
  enemy.revealed = true;
  enemy.mode = 'caught';
  enemy.caughtY = PARKING_Y;
}

export function createRoundState(round: Round): RoundState {
  const enemies: Enemy[] = round.beats.map((beat, i) => {
    const w = 14 + beat.members * 6;
    const h = 12;
    const enemy: Enemy = {
      id: beat.id,
      x: beat.x - w / 2,
      y: -h,
      w,
      h,
      vx: 0,
      vy: ENEMY_DESCEND,
      hoverY: 64 + (i % 4) * 24,
      sprite: beat.sprite,
      lie: beat.lie,
      revealed: false,
      alive: true,
      tEnter: beat.t,
      members: beat.members,
      mode: 'enter',
      pathT: 0,
      path: [],
      caughtY: PARKING_Y,
      fireAt: Number.POSITIVE_INFINITY,
      dieAt: 0,
    };
    labels.set(enemy, sanitizeCaption(beat.source.note, beat.source.method));
    return enemy;
  });
  const state: RoundState = {
    t: 0,
    duration: round.duration,
    tapeId: round.tapeId,
    player: {
      x: FIELD.width / 2 - PLAYER_W / 2,
      y: FIELD.height - 28,
      w: PLAYER_W,
      h: PLAYER_H,
    },
    shots: [],
    enemies,
    fireCooldown: 0,
    cleared: [],
    scene: null,
    hitstop: 0,
    shake: 0,
    lives: 3,
    fog: null,
    blind: 0,
    wave: 0,
    boss: null,
    enemyShots: [],
    caption: null,
    ended: null,
  };
  waveMeta.set(state, round.waveBounds);
  return state;
}

/**
 * Pure-enough stepper: mutates `state` in place and returns it. No score field.
 * A lie is revealed only when a shot hits it; it stays alive as a trophy.
 */
export function stepRound(state: RoundState, input: RoundInput, dt: number): RoundState {
  if (state.scene) return state;

  if (state.hitstop > 0) {
    state.hitstop = Math.max(0, state.hitstop - dt);
    state.shake = Math.max(0, state.shake - dt / SHAKE_DECAY);
    return state;
  }

  state.t += dt;
  state.shake = Math.max(0, state.shake - dt / SHAKE_DECAY);
  if (state.caption) {
    state.caption.t -= dt;
    if (state.caption.t <= 0) state.caption = null;
  }
  syncWave(state);

  if (state.lives <= 0) {
    endRound(state, 'lamps');
    return state;
  }
  if (state.t >= state.duration) {
    state.t = state.duration;
    endRound(state, 'time');
    return state;
  }

  if (input.left && !input.right) state.player.x -= PLAYER_SPEED * dt;
  if (input.right && !input.left) state.player.x += PLAYER_SPEED * dt;
  state.player.x = Math.max(0, Math.min(FIELD.width - state.player.w, state.player.x));

  state.fireCooldown = Math.max(0, state.fireCooldown - dt);
  if (input.fire && state.fireCooldown <= 0) {
    state.shots.push({
      x: state.player.x + state.player.w / 2 - SHOT_W / 2,
      y: state.player.y - SHOT_H,
      w: SHOT_W,
      h: SHOT_H,
      vy: -SHOT_SPEED,
      dead: false,
    });
    state.fireCooldown = FIRE_COOLDOWN;
  }

  for (const shot of state.shots) {
    shot.y += shot.vy * dt;
    if (shot.y + shot.h < 0) shot.dead = true;
  }

  for (const enemy of state.enemies) {
    if (!enemy.alive || state.t < enemy.tEnter) continue;
    if (enemy.mode === 'caught') {
      if (enemy.y > enemy.caughtY) {
        enemy.y = Math.max(enemy.caughtY, enemy.y - CAUGHT_RISE * dt);
      } else if (enemy.y < enemy.caughtY) {
        enemy.y = Math.min(enemy.caughtY, enemy.y + CAUGHT_RISE * dt);
      }
      continue;
    }
    if (enemy.mode === 'dying') {
      if (state.t >= enemy.dieAt) enemy.alive = false;
      continue;
    }
    // Motion is class motion only. `lie` is not consulted here (G7).
    if (enemy.y < enemy.hoverY) {
      enemy.mode = 'enter';
      enemy.y += enemy.vy * dt;
      if (enemy.y > enemy.hoverY) enemy.y = enemy.hoverY;
    } else {
      enemy.mode = 'hover';
      enemy.x += Math.sin(state.t * 1.6 + enemy.x * 0.02) * 36 * dt;
      enemy.x = Math.max(8, Math.min(FIELD.width - enemy.w - 8, enemy.x));
    }
  }

  for (const shot of state.shots) {
    if (shot.dead) continue;
    for (const enemy of state.enemies) {
      if (!hittable(state, enemy)) continue;
      if (!overlaps(shot, enemy)) continue;
      shot.dead = true;
      revealOnHit(enemy);
      if (enemy.lie && enemy.revealed) {
        if (!state.cleared.includes(enemy.id)) state.cleared.push(enemy.id);
        state.hitstop = HITSTOP;
        state.shake = 1;
        const text = labels.get(enemy) || sanitizeCaption('', enemy.sprite);
        state.caption = { text, t: CAPTION_T };
      } else {
        enemy.mode = 'dying';
        enemy.dieAt = state.t + DIE_POP;
      }
      break;
    }
  }

  state.shots = state.shots.filter((s: Shot) => !s.dead);
  return state;
}

export function botInput(state: RoundState): RoundInput {
  const live = state.enemies.filter((e) => hittable(state, e));
  const lies = live.filter((e) => e.lie && !e.revealed);
  const pool = lies.length ? lies : live;
  let target = pool[0];
  const px = state.player.x + state.player.w / 2;
  for (const e of pool) {
    if (!target) {
      target = e;
      continue;
    }
    const closer = Math.abs(e.x + e.w / 2 - px) < Math.abs(target.x + target.w / 2 - px);
    if (closer) target = e;
  }
  if (!target) return { left: false, right: false, fire: true };
  const dx = target.x + target.w / 2 - px;
  return { left: dx < -3, right: dx > 3, fire: true };
}
