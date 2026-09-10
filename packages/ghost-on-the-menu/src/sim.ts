import {
  FIELD,
  type Enemy,
  type Round,
  type RoundInput,
  type RoundState,
  type Shot,
} from './types';

const PLAYER_SPEED = 240;
const SHOT_SPEED = 420;
const FIRE_COOLDOWN = 0.12;
const ENEMY_DESCEND = 70;
const PLAYER_W = 16;
const PLAYER_H = 12;
const SHOT_W = 4;
const SHOT_H = 10;

function overlaps(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Flag a lie only. Honest sprites stay unmarked. */
export function revealOnHit(enemy: Enemy): void {
  if (enemy.lie) enemy.revealed = true;
}

export function createRoundState(round: Round): RoundState {
  const enemies: Enemy[] = round.beats.map((beat, i) => {
    const w = 14 + beat.members * 6;
    const h = 12;
    return {
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
    };
  });
  return {
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
  };
}

/**
 * Pure-enough stepper: mutates `state` in place and returns it. No score field.
 * A lie is revealed only when a shot hits it.
 */
export function stepRound(state: RoundState, input: RoundInput, dt: number): RoundState {
  if (state.scene) return state;

  state.t += dt;
  if (state.t >= state.duration) {
    state.t = state.duration;
    state.scene = { tapeId: state.tapeId, cleared: [...state.cleared] };
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
    if (enemy.y < enemy.hoverY) {
      enemy.y += enemy.vy * dt;
      if (enemy.y > enemy.hoverY) enemy.y = enemy.hoverY;
    } else {
      enemy.x += Math.sin(state.t * 1.6 + enemy.x * 0.02) * 36 * dt;
      enemy.x = Math.max(8, Math.min(FIELD.width - enemy.w - 8, enemy.x));
    }
  }

  for (const shot of state.shots) {
    if (shot.dead) continue;
    for (const enemy of state.enemies) {
      if (!enemy.alive || state.t < enemy.tEnter) continue;
      if (!overlaps(shot, enemy)) continue;
      revealOnHit(enemy);
      enemy.alive = false;
      shot.dead = true;
      if (enemy.lie && enemy.revealed && !state.cleared.includes(enemy.id)) {
        state.cleared.push(enemy.id);
      }
      break;
    }
  }

  state.shots = state.shots.filter((s: Shot) => !s.dead);
  return state;
}

export function botInput(state: RoundState): RoundInput {
  const live = state.enemies.filter((e) => e.alive && state.t >= e.tEnter);
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
