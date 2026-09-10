import {
  attachPatterns,
  attachedPatterns,
  type BossDef,
  type FireRhythm,
  type LadderRung,
  type PathDef,
  type PatternSet,
} from './patterns';
import {
  FIELD,
  PARKING_Y,
  type Boss,
  type Enemy,
  type Round,
  type RoundInput,
  type RoundState,
  type Shot,
  type SpriteClass,
  kindOfAtom,
} from './types';
import { BEAT_GAP } from './prepass';

const PLAYER_SHOT_SPEED = 420;
const SHOT_W = 4;
const SHOT_H = 10;
const HITSTOP = 0.12;
const SHAKE_DECAY = 0.3;
const DIE_POP = 0.15;
const CAPTION_T = 1.5;
const CAUGHT_RISE = 220;
const EXIT_SPEED = 220;
const WAVE_CAPTION_T = 1.5;
const PATH_RATE = 0.35;
const BLIND_BEAT = 0.8;
const SLIT_W = 16;

const labels = new WeakMap<Enemy, string>();
const diveIndex = new WeakMap<Enemy, number>();
const nextDive = new WeakMap<Enemy, number>();
const dives = new WeakMap<Enemy, { phase: 'down' | 'up'; originX: number; originY: number }>();

interface Meta {
  patterns: PatternSet;
  round: Round;
  rung: LadderRung;
  bossPhaseT: number;
  bossFireAt: number;
  bossBaseW: number;
  bossBaseH: number;
  bossOriginX: number;
  bossOriginY: number;
  fogBeats: { t: number; x: number }[];
  bossDeadFor: string | null;
  captionedWave: number;
  waveHold: number;
  emittedGridForWave: boolean;
}

const metaOf = new WeakMap<RoundState, Meta>();

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

function rungOf(patterns: PatternSet, tier: 0 | 1 | 2): LadderRung {
  return patterns.ladder.rungs.find((r) => r.tier === tier) ?? patterns.ladder.rungs[0]!;
}

function pickIndex(seed: number, i: number, n: number): number {
  if (n <= 0) return 0;
  const x = (Math.imul(seed, 1664525) + Math.imul(i + 1, 1013904223)) >>> 0;
  return x % n;
}

function pickPath(
  patterns: PatternSet,
  tier: 0 | 1 | 2,
  sprite: SpriteClass,
  seed: number,
  index: number,
): PathDef {
  const rung = rungOf(patterns, tier);
  const pool = patterns.paths.paths.filter(
    (p) => rung.pools.includes(p.id) && p.classes.includes(sprite) && p.tiers.includes(tier),
  );
  if (pool.length === 0) throw new Error('patterns/ladder.json: pools');
  return pool[pickIndex(seed, index, pool.length)]!;
}

function scalePath(def: PathDef): { x: number; y: number }[] {
  return def.points.map((p) => ({ x: p.x * FIELD.width, y: p.y * FIELD.height }));
}

function along(path: { x: number; y: number }[], t: number): { x: number; y: number } {
  if (path.length === 0) return { x: 0, y: 0 };
  const last = path[path.length - 1]!;
  if (path.length === 1 || t >= 1) return { x: last.x, y: last.y };
  const n = path.length - 1;
  const f = Math.max(0, t) * n;
  const i = Math.min(n - 1, Math.floor(f));
  const u = f - i;
  const a = path[i]!;
  const b = path[i + 1]!;
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}

function formationSize(members: number, patterns: PatternSet): { w: number; h: number } {
  const key = String(Math.min(4, Math.max(1, members))) as '1' | '2' | '3' | '4';
  const layout = patterns.formations.layouts[key];
  let minDx = 0;
  let maxDx = 0;
  let minDy = 0;
  let maxDy = 0;
  for (const o of layout) {
    minDx = Math.min(minDx, o.dx);
    maxDx = Math.max(maxDx, o.dx);
    minDy = Math.min(minDy, o.dy);
    maxDy = Math.max(maxDy, o.dy);
  }
  return { w: 14 + (maxDx - minDx), h: 12 + (maxDy - minDy) };
}

function bossKindFor(atom: string): Boss['kind'] | null {
  if (atom.startsWith('poison.')) return 'whisperer';
  if (atom.startsWith('temporal.')) return 'menu';
  if (atom.startsWith('protocol.')) return 'doorman';
  return null;
}

function hittable(state: RoundState, enemy: Enemy): boolean {
  if (enemy.sprite === 'fog') return false;
  return (
    enemy.alive &&
    state.t >= enemy.tEnter &&
    enemy.mode !== 'caught' &&
    enemy.mode !== 'dying' &&
    enemy.mode !== 'exit'
  );
}

function atomOf(enemy: Enemy): string {
  const i = enemy.id.indexOf(':');
  return i === -1 ? enemy.id : enemy.id.slice(0, i);
}

function endRound(state: RoundState, why: 'time' | 'lamps'): void {
  state.ended = why;
  state.scene = { tapeId: state.tapeId, cleared: [...state.cleared] };
}

function spawnShot(shots: Shot[], cx: number, y: number, vy: number, dx = 0): void {
  shots.push({
    x: cx + dx - SHOT_W / 2,
    y,
    w: SHOT_W,
    h: SHOT_H,
    vy,
    dead: false,
  });
}

function fireSpread(shots: Shot[], cx: number, y: number, rhythm: FireRhythm): void {
  const n = Math.max(1, Math.round(rhythm.burst));
  const span = rhythm.spread * FIELD.width;
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0 : i / (n - 1) - 0.5;
    spawnShot(shots, cx, y, rhythm.speed, u * span);
  }
}

function spawnFog(state: RoundState, x: number, y: number, vy: number): void {
  const w = 48;
  state.fog = {
    x: x - w / 2,
    y,
    w,
    h: 20,
    vy,
    alive: true,
  };
}

/** Flag a lie only. Sets caught; alive stays true. Honest sprites stay unmarked. */
export function revealOnHit(enemy: Enemy): void {
  if (!enemy.lie) return;
  enemy.revealed = true;
  enemy.mode = 'caught';
  enemy.caughtY = PARKING_Y;
}

export function createRoundState(round: Round): RoundState {
  const patterns = attachedPatterns(round);
  attachPatterns(round, patterns);
  const rung = rungOf(patterns, round.tier);
  const player = patterns.player;
  const fogBeats: { t: number; x: number }[] = [];
  const enemies: Enemy[] = [];
  round.beats.forEach((beat, i) => {
    if (beat.sprite === 'fog') {
      fogBeats.push({ t: beat.t, x: beat.x });
      return;
    }
    const box = formationSize(beat.members, patterns);
    const def = pickPath(patterns, round.tier, beat.sprite, round.seed, i);
    const path = scalePath(def);
    const start = path[0] ?? { x: beat.x, y: 0 };
    const hover = path[path.length - 1] ?? { x: beat.x, y: 80 };
    const enemy: Enemy = {
      id: beat.id,
      x: start.x - box.w / 2,
      y: start.y - box.h / 2,
      w: box.w,
      h: box.h,
      vx: 0,
      vy: 0,
      hoverY: hover.y,
      sprite: beat.sprite,
      lie: beat.lie,
      revealed: false,
      alive: true,
      tEnter:
        (beat.sprite === 'grid' || beat.sprite === 'answer') &&
        bossKindFor(beat.source.atom) === 'whisperer' &&
        round.waveBounds.some((b) => b.atom === beat.source.atom)
          ? Number.POSITIVE_INFINITY
          : beat.t,
      members: beat.members,
      mode: 'enter',
      pathT: 0,
      path,
      caughtY: PARKING_Y,
      fireAt: Number.POSITIVE_INFINITY,
      dieAt: 0,
    };
    labels.set(enemy, sanitizeCaption(beat.source.note, beat.source.method));
    diveIndex.set(enemy, i);
    enemies.push(enemy);
  });
  const state: RoundState = {
    t: 0,
    duration: round.duration,
    tapeId: round.tapeId,
    player: {
      x: FIELD.width / 2 - player.hitbox.w / 2,
      y: player.y,
      w: player.hitbox.w,
      h: player.hitbox.h,
    },
    shots: [],
    enemies,
    fireCooldown: 0,
    cleared: [],
    scene: null,
    hitstop: 0,
    shake: 0,
    lives: rung.lamps,
    fog: null,
    blind: 0,
    wave: 0,
    boss: null,
    enemyShots: [],
    caption: null,
    ended: null,
    grace: 0,
    bossKills: 0,
    playerHitT: Number.POSITIVE_INFINITY,
    bossDownT: Number.NEGATIVE_INFINITY,
  };
  const meta: Meta = {
    patterns,
    round,
    rung,
    bossPhaseT: 0,
    bossFireAt: 0,
    bossBaseW: 0,
    bossBaseH: 0,
    bossOriginX: 0,
    bossOriginY: 0,
    fogBeats,
    bossDeadFor: null,
    captionedWave: -1,
    waveHold: 0,
    emittedGridForWave: false,
  };
  metaOf.set(state, meta);
  attachPatterns(state, patterns);
  return state;
}

function syncWave(state: RoundState, meta: Meta): void {
  const bounds = meta.round.waveBounds;
  let w = 0;
  for (let i = 0; i < bounds.length; i++) {
    if (state.t >= bounds[i]!.t0) w = i;
  }
  state.wave = w;
}

function waveCaption(atom: string): string {
  const kind = kindOfAtom(atom);
  return kind === 'breather' ? 'inspect' : kind;
}

function closeWave(state: RoundState, atom: string): void {
  for (const enemy of state.enemies) {
    if (atomOf(enemy) !== atom) continue;
    if (!enemy.alive) continue;
    if (enemy.mode === 'caught') continue;
    if (enemy.mode === 'dying' || enemy.mode === 'exit') continue;
    enemy.mode = 'exit';
    if (enemy.tEnter > state.t) enemy.tEnter = state.t;
  }
}

function openWave(state: RoundState, meta: Meta, wave: number): void {
  if (wave > 0) {
    const prev = meta.round.waveBounds[wave - 1];
    if (prev) closeWave(state, prev.atom);
  }
  const bound = meta.round.waveBounds[wave];
  if (!bound) return;
  state.caption = { text: waveCaption(bound.atom), t: WAVE_CAPTION_T, kind: 'wave' };
  meta.waveHold = WAVE_CAPTION_T;
  meta.emittedGridForWave = false;
  meta.captionedWave = wave;
}

function emitWaveGrids(state: RoundState, meta: Meta): void {
  if (meta.emittedGridForWave) return;
  const bound = meta.round.waveBounds[state.wave];
  const boss = state.boss;
  if (!bound || !boss || !boss.alive) return;
  const cx = boss.x + boss.w / 2;
  const by = boss.y + boss.h;
  const launched = state.enemies.filter(
    (enemy) =>
      (enemy.sprite === 'grid' || enemy.sprite === 'answer') &&
      atomOf(enemy) === bound.atom &&
      enemy.alive &&
      enemy.mode !== 'caught' &&
      enemy.mode !== 'dying',
  );
  launched.sort((a, b) => {
    const ra = a.sprite === 'grid' ? 0 : 1;
    const rb = b.sprite === 'grid' ? 0 : 1;
    if (ra !== rb) return ra - rb;
    return (diveIndex.get(a) ?? 0) - (diveIndex.get(b) ?? 0);
  });
  launched.forEach((enemy, i) => {
    enemy.tEnter = state.t + i * BEAT_GAP;
    enemy.pathT = 0;
    enemy.mode = 'enter';
    if (enemy.sprite === 'grid') {
      enemy.path = [{ x: cx, y: by }, ...enemy.path];
    }
  });
  meta.emittedGridForWave = true;
}

function spawnBoss(state: RoundState, meta: Meta, kind: Boss['kind'], def: BossDef): void {
  const x = FIELD.width / 2 - def.w / 2;
  const y = 24;
  state.boss = {
    kind,
    x,
    y,
    w: def.w,
    h: def.h,
    phase: 0,
    hp: def.hp,
    alive: true,
    plate: null,
    hitT: Number.POSITIVE_INFINITY,
  };
  meta.bossPhaseT = 0;
  meta.bossFireAt =
    state.t + meta.patterns.fire.tiers[String(meta.round.tier) as '0' | '1' | '2'].boss.period;
  meta.bossBaseW = def.w;
  meta.bossBaseH = def.h;
  meta.bossOriginX = x;
  meta.bossOriginY = y;
}

function killBoss(state: RoundState, meta: Meta, atom: string): void {
  if (state.boss) state.boss.alive = false;
  state.boss = null;
  meta.bossDeadFor = atom;
  state.bossKills += 1;
  state.bossDownT = state.t;
}

function stepBoss(state: RoundState, meta: Meta, dt: number): void {
  if (meta.waveHold > 0) {
    state.boss = null;
    return;
  }
  const bound = meta.round.waveBounds[state.wave];
  const kind = bound ? bossKindFor(bound.atom) : null;
  if (!bound || state.t >= bound.t1) {
    if (bound && meta.bossDeadFor === bound.atom) meta.bossDeadFor = null;
    state.boss = null;
    return;
  }
  if (!kind || state.t < bound.t0) {
    state.boss = null;
    return;
  }
  if (meta.bossDeadFor === bound.atom) {
    state.boss = null;
    return;
  }
  const def = meta.patterns.bosses[kind];
  if (!state.boss || state.boss.kind !== kind || !state.boss.alive) {
    spawnBoss(state, meta, kind, def);
    if (kind === 'whisperer') emitWaveGrids(state, meta);
  }
  const boss = state.boss;
  if (!boss || !boss.alive) return;
  if (boss.hp <= 0) {
    killBoss(state, meta, bound.atom);
    return;
  }
  const phase = def.phases[boss.phase] ?? def.phases[0]!;
  meta.bossPhaseT += dt;
  if (meta.bossPhaseT >= phase.duration) {
    meta.bossPhaseT -= phase.duration;
    boss.phase = (boss.phase + 1) % def.phases.length;
  }
  const p = def.phases[boss.phase] ?? phase;
  const u = Math.min(1, meta.bossPhaseT / Math.max(0.01, p.duration));
  if (p.motion === 'pulse') {
    boss.h = meta.bossBaseH * (1 + 0.12 * Math.sin(state.t * 4));
    boss.w = meta.bossBaseW;
    boss.x = meta.bossOriginX;
  } else if (p.motion === 'drift' || p.motion === 'drift-column') {
    boss.w = meta.bossBaseW;
    boss.h = meta.bossBaseH;
    boss.x = meta.bossOriginX + Math.sin(state.t * 0.7) * 70;
  } else if (p.motion === 'squash') {
    boss.w = meta.bossBaseW + (SLIT_W - meta.bossBaseW) * u;
    boss.h = meta.bossBaseH;
    boss.x = meta.bossOriginX + (meta.bossBaseW - boss.w) / 2;
  } else if (p.motion === 'slit') {
    boss.w = SLIT_W + (meta.bossBaseW - SLIT_W) * u;
    boss.h = meta.bossBaseH;
    boss.x = meta.bossOriginX + (meta.bossBaseW - boss.w) / 2;
  } else {
    boss.w = meta.bossBaseW;
    boss.h = meta.bossBaseH;
    boss.x = meta.bossOriginX;
  }
  boss.y = meta.bossOriginY;

  if (!meta.rung.bossFires) return;
  const rhythm = meta.patterns.fire.tiers[String(meta.round.tier) as '0' | '1' | '2'].boss;
  if (state.t < meta.bossFireAt) return;
  const raging = boss.hp < def.hp / 2;
  meta.bossFireAt = state.t + rhythm.period * (raging ? def.rage : 1);
  const cx = boss.x + boss.w / 2;
  const by = boss.y + boss.h;
  if (p.cue === 'emit-grid') emitWaveGrids(state, meta);
  if (p.fire === 'drop-fog') {
    spawnFog(state, cx, by, 40 * meta.rung.fog);
  } else if (p.fire === 'spread') {
    fireSpread(state.enemyShots, cx, by, rhythm);
  } else if (p.fire === 'column') {
    spawnShot(state.enemyShots, cx, by, rhythm.speed);
  } else if (p.fire === 'plate-out') {
    boss.plate = { x: boss.x + boss.w, y: boss.y + boss.h / 4, w: 28, h: 10 };
  } else if (p.fire === 'plate-back') {
    boss.plate = null;
  }
}

function stepFogBeats(state: RoundState, meta: Meta): void {
  for (const fb of meta.fogBeats) {
    if (fb.t >= 0 && state.t >= fb.t) {
      if (!state.fog || !state.fog.alive) spawnFog(state, fb.x, 8, 50 * meta.rung.fog);
      fb.t = -1;
    }
  }
}

function stepFog(state: RoundState, dt: number): void {
  const fog = state.fog;
  if (!fog || !fog.alive) return;
  fog.y += fog.vy * dt;
  if (fog.y + fog.h >= state.player.y) {
    state.blind = BLIND_BEAT;
    fog.alive = false;
    state.fog = null;
  }
  if (fog.y > FIELD.height) {
    fog.alive = false;
    state.fog = null;
  }
}

function maybeStartDive(state: RoundState, meta: Meta | undefined, enemy: Enemy): void {
  if (!meta) return;
  if (enemy.sprite !== 'grid') return;
  const spec = meta.patterns.fire.tiers[String(meta.round.tier) as '0' | '1' | '2'].dive;
  if (!spec) return;
  let at = nextDive.get(enemy);
  if (at === undefined) {
    const idx = diveIndex.get(enemy) ?? 0;
    const off = (pickIndex(meta.round.seed, idx, 1000) / 1000) * spec.period;
    at = state.t + off;
    nextDive.set(enemy, at);
  }
  if (state.t < at) return;
  enemy.mode = 'dive';
  dives.set(enemy, { phase: 'down', originX: enemy.x, originY: enemy.y });
}

function stepDive(state: RoundState, meta: Meta | undefined, enemy: Enemy, dt: number): void {
  const spec = meta?.patterns.fire.tiers[String(meta.round.tier) as '0' | '1' | '2'].dive;
  const d = dives.get(enemy);
  if (!spec || !d) {
    enemy.mode = 'hover';
    return;
  }
  const destX = d.phase === 'down' ? state.player.x + state.player.w / 2 - enemy.w / 2 : d.originX;
  const destY = d.phase === 'down' ? spec.depth * FIELD.height : d.originY;
  const dx = destX - enemy.x;
  const dy = destY - enemy.y;
  const dist = Math.hypot(dx, dy);
  const step = spec.speed * dt;
  if (dist <= step) {
    enemy.x = destX;
    enemy.y = destY;
    if (d.phase === 'down') {
      d.phase = 'up';
    } else {
      enemy.mode = 'hover';
      dives.delete(enemy);
      nextDive.set(enemy, state.t + spec.period);
    }
  } else {
    enemy.x += (dx / dist) * step;
    enemy.y += (dy / dist) * step;
  }
}

function takeLamp(state: RoundState, grace: number): void {
  if (state.grace > 0) return;
  state.lives -= 1;
  state.grace = grace;
  state.playerHitT = 0;
}

function stepFormationFire(state: RoundState, meta: Meta, enemy: Enemy): void {
  if (!meta.rung.formationFires) return;
  const rhythm = meta.patterns.fire.tiers[String(meta.round.tier) as '0' | '1' | '2'].formation;
  if (!rhythm) return;
  if (enemy.mode !== 'hover') return;
  if (enemy.fireAt === Number.POSITIVE_INFINITY) enemy.fireAt = state.t + rhythm.period;
  if (state.t < enemy.fireAt) return;
  enemy.fireAt = state.t + rhythm.period;
  fireSpread(state.enemyShots, enemy.x + enemy.w / 2, enemy.y + enemy.h, rhythm);
}

/**
 * Pure-enough stepper: mutates `state` in place and returns it. No score field.
 * A lie is revealed only when a shot hits it; it stays alive as a trophy.
 */
export function stepRound(state: RoundState, input: RoundInput, dt: number): RoundState {
  if (state.scene) return state;
  const meta = metaOf.get(state);
  const patterns = meta?.patterns ?? attachedPatterns(state);
  const player = patterns.player;

  if (state.hitstop > 0) {
    state.hitstop = Math.max(0, state.hitstop - dt);
    state.shake = Math.max(0, state.shake - dt / SHAKE_DECAY);
    return state;
  }

  state.t += dt;
  state.shake = Math.max(0, state.shake - dt / SHAKE_DECAY);
  state.grace = Math.max(0, state.grace - dt);
  if (state.boss && state.boss.alive && state.boss.hitT !== Number.POSITIVE_INFINITY) {
    state.boss.hitT += dt;
  }
  if (state.playerHitT !== Number.POSITIVE_INFINITY) state.playerHitT += dt;
  if (state.blind > 0) state.blind = Math.max(0, state.blind - dt);
  if (state.caption) {
    state.caption.t -= dt;
    if (state.caption.t <= 0) state.caption = null;
  }
  if (meta) {
    const prevWave = state.wave;
    syncWave(state, meta);
    if (meta.round.waveBounds.length > 0 && state.wave !== meta.captionedWave) {
      if (meta.captionedWave >= 0 && state.wave !== prevWave) {
        /* closeWave runs inside openWave */
      }
      openWave(state, meta, state.wave);
    }
    meta.waveHold = Math.max(0, meta.waveHold - dt);
  }

  if (state.lives <= 0) {
    endRound(state, 'lamps');
    return state;
  }
  if (state.t >= state.duration) {
    state.t = state.duration;
    endRound(state, 'time');
    return state;
  }

  if (input.left && !input.right) state.player.x -= player.speed * dt;
  if (input.right && !input.left) state.player.x += player.speed * dt;
  state.player.x = Math.max(0, Math.min(FIELD.width - state.player.w, state.player.x));

  state.fireCooldown = Math.max(0, state.fireCooldown - dt);
  if (input.fire && state.fireCooldown <= 0) {
    spawnShot(
      state.shots,
      state.player.x + state.player.w / 2,
      state.player.y - SHOT_H,
      -PLAYER_SHOT_SPEED,
    );
    state.fireCooldown = player.cooldown;
  }

  for (const shot of state.shots) {
    shot.y += shot.vy * dt;
    if (shot.y + shot.h < 0) shot.dead = true;
  }
  for (const shot of state.enemyShots) {
    shot.y += shot.vy * dt;
    if (shot.y > FIELD.height) shot.dead = true;
  }

  const speed = meta?.rung.speed ?? 1;
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
    if (enemy.mode === 'exit') {
      enemy.y -= EXIT_SPEED * speed * dt;
      if (enemy.y + enemy.h < 0) enemy.alive = false;
      continue;
    }
    // Motion is class motion only. `lie` is not consulted here (G7).
    if (enemy.mode === 'dive') {
      stepDive(state, meta, enemy, dt);
      continue;
    }
    if (enemy.path.length > 0 && enemy.pathT < 1) {
      enemy.mode = 'enter';
      enemy.pathT = Math.min(1, enemy.pathT + dt * PATH_RATE * speed);
      const p = along(enemy.path, enemy.pathT);
      enemy.x = p.x - enemy.w / 2;
      enemy.y = p.y - enemy.h / 2;
      if (enemy.pathT >= 1) enemy.mode = 'hover';
    } else {
      enemy.mode = 'hover';
      enemy.x += Math.sin(state.t * 1.6 + enemy.x * 0.02) * 36 * dt;
      enemy.x = Math.max(8, Math.min(FIELD.width - enemy.w - 8, enemy.x));
      maybeStartDive(state, meta, enemy);
    }
    if (meta) stepFormationFire(state, meta, enemy);
  }

  if (meta) {
    stepFogBeats(state, meta);
    stepBoss(state, meta, dt);
  }
  stepFog(state, dt);

  for (const enemy of state.enemies) {
    if (enemy.mode !== 'dive' || !enemy.alive) continue;
    if (overlaps(enemy, state.player)) takeLamp(state, player.grace);
  }

  const boss = state.boss;
  for (const shot of state.shots) {
    if (shot.dead) continue;
    if (boss && boss.alive && overlaps(shot, boss)) {
      shot.dead = true;
      // Shots land only when motion is not slit or hold (Menu dodge, Doorman guard).
      const motion = meta ? (meta.patterns.bosses[boss.kind].phases[boss.phase]?.motion ?? '') : '';
      const guarded = motion === 'slit' || motion === 'hold';
      if (!guarded) {
        boss.hitT = 0;
        boss.hp -= 1;
        if (boss.hp <= 0) {
          const atom = meta?.round.waveBounds[state.wave]?.atom ?? '';
          if (meta) killBoss(state, meta, atom);
          else {
            boss.alive = false;
            state.boss = null;
          }
        }
      }
      continue;
    }
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
        state.caption = { text, t: CAPTION_T, kind: 'catch' };
      } else {
        enemy.mode = 'dying';
        enemy.dieAt = state.t + DIE_POP;
      }
      break;
    }
  }

  for (const shot of state.enemyShots) {
    if (shot.dead) continue;
    if (state.grace > 0) continue;
    if (!overlaps(shot, state.player)) continue;
    shot.dead = true;
    takeLamp(state, player.grace);
  }

  state.shots = state.shots.filter((s: Shot) => !s.dead);
  state.enemyShots = state.enemyShots.filter((s: Shot) => !s.dead);
  return state;
}

/** Can a player shot hit this enemy now? Exported for the bots; reads no fact. */
export function isHittable(state: RoundState, enemy: Enemy): boolean {
  return hittable(state, enemy);
}
