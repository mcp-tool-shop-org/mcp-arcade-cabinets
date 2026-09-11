import {
  attachedPatterns,
  attachPatterns,
  burstActive,
  copiesAt,
  intensityAt,
  pickLine,
  voiceWaveKey,
  type BossDef,
  type DropKind,
  type FireRhythm,
  type LadderRung,
  type ParallelismTier,
  type PathDef,
  type PatternSet,
} from './patterns';
import {
  FIELD,
  PARKING_Y,
  type Boss,
  type Drop,
  type Enemy,
  type Hazard,
  type HazardKind,
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
/** Seconds a seat's line stays on the field. */
const SAY_CAPTION_T = 2.4;
const PATH_RATE = 0.35;
const BLIND_BEAT = 0.8;
const SLIT_W = 16;
/** Pixels per second a boss slides toward the ship for a pilot column. */
const LEAN_SPEED = 90;

const labels = new WeakMap<Enemy, string>();
const diveIndex = new WeakMap<Enemy, number>();
const nextDive = new WeakMap<Enemy, number>();
const dives = new WeakMap<
  Enemy,
  { phase: 'down' | 'up'; originX: number; originY: number; commitX: number | null }
>();

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
  asideAt: number;
  /** Round time until which a pilot `hold` keeps the boss still. */
  bossHoldUntil: number;
  /** Pixels the boss has slid toward the ship for a pending pilot `column`. */
  bossLean: number;
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

function rungOf(patterns: PatternSet, tier: 0 | 1 | 2 | 3): LadderRung {
  return patterns.ladder.rungs.find((r) => r.tier === tier) ?? patterns.ladder.rungs[0]!;
}

function fireKey(tier: 0 | 1 | 2 | 3): '0' | '1' | '2' | '3' {
  return String(tier) as '0' | '1' | '2' | '3';
}

function waveEscalate(meta: Meta, wave: number): number {
  const spec = meta.patterns.waves.tiers[fireKey(meta.round.tier)];
  return Math.pow(spec.escalate, Math.max(0, wave));
}

function paraSpec(meta: Meta): ParallelismTier {
  return meta.patterns.parallelism.tiers[fireKey(meta.round.tier)];
}

function fireScale(state: RoundState, meta: Meta): number {
  const spec = paraSpec(meta);
  const hot = state.parallelism
    ? 1 / intensityAt(spec, state.wave, meta.round.waveBounds.length)
    : 1;
  return waveEscalate(meta, state.wave) * hot;
}

/** Extra copies spawned for a burst. Always honest; never a tape beat. */
export function isDecoy(enemy: Enemy): boolean {
  return enemy.id.startsWith('para:');
}

function pickIndex(seed: number, i: number, n: number): number {
  if (n <= 0) return 0;
  const x = (Math.imul(seed, 1664525) + Math.imul(i + 1, 1013904223)) >>> 0;
  return x % n;
}

function pickPath(
  patterns: PatternSet,
  tier: 0 | 1 | 2 | 3,
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

function spriteBox(sprite: SpriteClass, patterns: PatternSet): { w: number; h: number } {
  if (sprite === 'fog') return { w: 24, h: 16 };
  return patterns.formations.sprites[sprite];
}

function formationSize(
  members: number,
  sprite: SpriteClass,
  patterns: PatternSet,
): { w: number; h: number } {
  const base = spriteBox(sprite, patterns);
  if (sprite !== 'grid') return { w: base.w, h: base.h };
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
  return { w: base.w + (maxDx - minDx), h: base.h + (maxDy - minDy) };
}

const HOVER_STRIDE = 40;
const hoverHome = new WeakMap<Enemy, number>();

function wrapX(x: number, w: number): number {
  const lo = 8;
  const hi = FIELD.width - w - 8;
  const span = hi - lo;
  if (span <= 0) return lo;
  let t = (x - lo) % span;
  if (t < 0) t += span;
  return lo + t;
}

/** Lateral hover offset from class-rank k. Never reads lie. */
function hoverShift(k: number, seed: number, idx: number): number {
  const mag = Math.ceil(k / 2) * HOVER_STRIDE;
  const sign = k % 2 === 0 ? 1 : -1;
  const flip = pickIndex(seed, idx, 2) === 0 ? 1 : -1;
  return mag * sign * flip;
}

function classRank(round: Round): Map<string, number> {
  const rank = new Map<string, number>();
  const waves = round.waveBounds.length ? round.waveBounds.map((w) => w.atom) : [];
  const atoms = waves.length ? waves : [...new Set(round.beats.map((b) => b.source.atom))];
  for (const atom of atoms) {
    const pack = round.beats.filter((b) => b.source.atom === atom && b.sprite !== 'fog');
    const byClass = new Map<string, typeof pack>();
    for (const b of pack) {
      const list = byClass.get(b.sprite) ?? [];
      list.push(b);
      byClass.set(b.sprite, list);
    }
    for (const list of byClass.values()) {
      list.sort((a, b) => a.source.index - b.source.index);
      list.forEach((b, k) => rank.set(`${atom}:${b.source.index}:${b.sprite}`, k));
    }
  }
  return rank;
}

/** The boss a wave's atom brings. Atom kind only; never a fact. */
export function bossKindFor(atom: string): Boss['kind'] | null {
  if (atom.startsWith('poison.')) return 'whisperer';
  if (atom.startsWith('temporal.')) return 'menu';
  if (atom.startsWith('protocol.')) return 'doorman';
  return null;
}

function hittable(state: RoundState, enemy: Enemy): boolean {
  if (enemy.sprite === 'fog') return false;
  if (isDecoy(enemy)) {
    const meta = metaOf.get(state);
    if (!meta || !paraSpec(meta).decoysFire) return false;
  }
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

function endRound(state: RoundState, why: 'time' | 'lamps', meta?: Meta): void {
  state.ended = why;
  const line = meta ? pickLine(meta.patterns.voice.end, meta.round.seed, 99) : undefined;
  state.scene = line
    ? { tapeId: state.tapeId, cleared: [...state.cleared], line }
    : { tapeId: state.tapeId, cleared: [...state.cleared] };
}

function spawnShot(shots: Shot[], cx: number, y: number, vy: number, dx = 0, vx = 0): void {
  shots.push({
    x: cx + dx - SHOT_W / 2,
    y,
    w: SHOT_W,
    h: SHOT_H,
    vx,
    vy,
    dead: false,
  });
}

function fireSpread(shots: Shot[], cx: number, y: number, rhythm: FireRhythm): void {
  const n = Math.max(1, Math.round(rhythm.burst));
  const span = rhythm.spread * FIELD.width;
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0 : i / (n - 1) - 0.5;
    spawnShot(shots, cx, y, rhythm.speed, u * span, 0);
  }
}

function fireAimed(
  shots: Shot[],
  cx: number,
  y: number,
  rhythm: FireRhythm,
  player: { x: number; y: number; w: number; h: number },
): void {
  const px = player.x + player.w / 2;
  const py = player.y + player.h / 2;
  const base = Math.atan2(py - y, px - cx);
  const n = Math.max(1, Math.round(rhythm.burst));
  const fan = rhythm.spread;
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0 : i / (n - 1) - 0.5;
    const ang = base + u * 2 * fan;
    spawnShot(shots, cx, y, rhythm.speed * Math.sin(ang), 0, rhythm.speed * Math.cos(ang));
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
  const ranks = classRank(round);
  round.beats.forEach((beat, i) => {
    if (beat.sprite === 'fog') {
      fogBeats.push({ t: beat.t, x: beat.x });
      return;
    }
    const box = formationSize(beat.members, beat.sprite, patterns);
    const def = pickPath(patterns, round.tier, beat.sprite, round.seed, i);
    const path = scalePath(def);
    const k = ranks.get(`${beat.source.atom}:${beat.source.index}:${beat.sprite}`) ?? 0;
    const last = path[path.length - 1];
    if (last) last.x = wrapX(last.x + hoverShift(k, round.seed, beat.source.index), box.w);
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
    maxLives: rung.lamps,
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
    drops: [],
    spreadT: 0,
    dropCatches: 0,
    hazards: [],
    bossIntent: null,
    bossLine: null,
    bossSay: null,
    parallelism: false,
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
    asideAt: 6,
    bossHoldUntil: 0,
    bossLean: 0,
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
  const kind = voiceWaveKey(kindOfAtom(bound.atom));
  state.caption = {
    text: waveCaption(bound.atom),
    t: WAVE_CAPTION_T,
    kind: 'wave',
    line: pickLine(meta.patterns.voice.wave[kind], meta.round.seed, 17 + wave),
  };
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
    maxHp: def.hp,
    motion: def.phases[0]?.motion ?? '',
    alive: true,
    plate: null,
    hitT: Number.POSITIVE_INFINITY,
  };
  meta.bossPhaseT = 0;
  meta.bossHoldUntil = 0;
  meta.bossLean = 0;
  meta.bossFireAt =
    state.t +
    meta.patterns.fire.tiers[fireKey(meta.round.tier)].boss.period * fireScale(state, meta);
  meta.bossBaseW = def.w;
  meta.bossBaseH = def.h;
  meta.bossOriginX = x;
  meta.bossOriginY = y;
  const bound = meta.round.waveBounds[state.wave];
  const word = bound ? waveCaption(bound.atom) : kind;
  const salt = 41 + kind.length + state.wave * 3;
  const lines = meta.patterns.voice.boss[kind];
  // A seat may have picked the line for this wave and kind from the same
  // closed set the seed picks from. Anything else keeps the seed's pick.
  const pick = state.bossLine;
  state.bossLine = null;
  const seated =
    pick && pick.wave === state.wave && pick.kind === kind ? lines[pick.index] : undefined;
  state.caption = {
    text: word,
    t: WAVE_CAPTION_T,
    kind: 'wave',
    line: seated ?? pickLine(lines, meta.round.seed, salt),
  };
}

function spawnDrop(state: RoundState, meta: Meta, kind: DropKind, cx: number, cy: number): void {
  const spec = meta.patterns.drops[kind];
  const drop: Drop = {
    kind,
    x: cx - spec.box.w / 2,
    y: cy - spec.box.h / 2,
    w: spec.box.w,
    h: spec.box.h,
    alive: true,
  };
  state.drops.push(drop);
}

function killBoss(state: RoundState, meta: Meta, atom: string): void {
  if (state.boss) {
    spawnDrop(
      state,
      meta,
      'lamp',
      state.boss.x + state.boss.w / 2,
      state.boss.y + state.boss.h / 2,
    );
    state.boss.alive = false;
  }
  state.boss = null;
  meta.bossDeadFor = atom;
  state.bossKills += 1;
  state.bossDownT = state.t;
}

function spawnHazard(
  state: RoundState,
  kind: HazardKind,
  cx: number,
  cy: number,
  vx: number,
  vy: number,
): void {
  const box =
    kind === 'band' ? { w: 72, h: 8 } : kind === 'plate' ? { w: 28, h: 10 } : { w: 16, h: 16 };
  const h: Hazard = {
    kind,
    x: cx - box.w / 2,
    y: cy,
    w: box.w,
    h: box.h,
    vx,
    vy,
    alive: true,
  };
  state.hazards.push(h);
}

function stepHazards(
  state: RoundState,
  meta: Meta | undefined,
  dt: number,
  fallbackGrace: number,
): void {
  const grace = meta?.rung.grace ?? fallbackGrace;
  for (const h of state.hazards) {
    if (!h.alive) continue;
    h.x += h.vx * dt;
    h.y += h.vy * dt;
    if (h.y > FIELD.height || h.x + h.w < 0 || h.x > FIELD.width) {
      h.alive = false;
      continue;
    }
    if (state.grace > 0) continue;
    if (overlaps(h, state.player)) {
      h.alive = false;
      takeLamp(state, grace);
    }
  }
  state.hazards = state.hazards.filter((h) => h.alive);
}

function maybeAside(state: RoundState, meta: Meta): void {
  if (state.caption) return;
  if (state.t < meta.asideAt) return;
  const bound = meta.round.waveBounds[state.wave];
  const kind = bound ? voiceWaveKey(kindOfAtom(bound.atom)) : 'inspect';
  const lines = meta.patterns.voice.aside[kind];
  if (!lines || lines.length === 0) return;
  state.caption = {
    text: pickLine(lines, meta.round.seed, Math.floor(state.t * 10) + state.wave * 13),
    t: 2.2,
    kind: 'aside',
  };
  meta.asideAt = state.t + 7;
}

function spawnFormationDrop(state: RoundState, meta: Meta | undefined, enemy: Enemy): void {
  if (!meta) return;
  if (enemy.sprite !== 'grid') return;
  if (isDecoy(enemy)) return;
  spawnDrop(state, meta, 'spread', enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
}

function spawnDecoys(state: RoundState, meta: Meta, spec: ParallelismTier): void {
  const copies = copiesAt(spec, state.wave, meta.round.waveBounds.length);
  if (copies <= 1) return;
  const extras = copies - 1;
  const hosts = state.enemies.filter(
    (e) =>
      e.alive &&
      !isDecoy(e) &&
      e.mode === 'hover' &&
      (e.sprite === 'grid' || e.sprite === 'menu' || e.sprite === 'answer'),
  );
  const born: Enemy[] = [];
  for (const host of hosts) {
    for (let i = 0; i < extras; i++) {
      const box = spriteBox(host.sprite, meta.patterns);
      const decoy: Enemy = {
        id: `para:${host.id}:${i}`,
        x: wrapX(host.x + (i + 1) * 28, box.w),
        y: host.y,
        w: box.w,
        h: box.h,
        vx: 0,
        vy: 0,
        hoverY: host.hoverY,
        sprite: host.sprite,
        lie: false,
        revealed: false,
        alive: true,
        tEnter: state.t,
        members: 1,
        mode: 'hover',
        pathT: 1,
        path: [],
        caughtY: PARKING_Y,
        fireAt: Number.POSITIVE_INFINITY,
        dieAt: 0,
      };
      hoverHome.set(decoy, decoy.x);
      born.push(decoy);
    }
  }
  if (born.length > 0) state.enemies.push(...born);
}

function despawnDecoys(state: RoundState): void {
  for (const e of state.enemies) {
    if (!isDecoy(e)) continue;
    if (!e.alive) continue;
    if (e.mode === 'caught' || e.mode === 'dying') continue;
    e.mode = 'exit';
  }
}

function stepParallelism(state: RoundState, meta: Meta): void {
  const spec = paraSpec(meta);
  const on = burstActive(state.t, state.wave, meta.round.waveBounds, meta.round.seed, spec);
  if (on && !state.parallelism) {
    spawnDecoys(state, meta, spec);
  } else if (!on && state.parallelism) {
    despawnDecoys(state);
  }
  state.parallelism = on;
}

function stepDrops(state: RoundState, meta: Meta | undefined, dt: number): void {
  if (!meta) return;
  for (const drop of state.drops) {
    if (!drop.alive) continue;
    const spec = meta.patterns.drops[drop.kind];
    if (spec.drift > 0) {
      const targetX = state.player.x + state.player.w / 2 - drop.w / 2;
      const dx = targetX - drop.x;
      const step = spec.drift * dt;
      drop.x += Math.abs(dx) <= step ? dx : Math.sign(dx) * step;
    }
    drop.y += spec.fall * dt;
    if (drop.y > FIELD.height) {
      drop.alive = false;
      continue;
    }
    if (!overlaps(drop, state.player)) continue;
    drop.alive = false;
    state.dropCatches += 1;
    if (drop.kind === 'lamp') {
      state.lives = Math.min(meta.rung.lamps, state.lives + 1);
    } else {
      state.spreadT = spec.duration;
    }
  }
  state.drops = state.drops.filter((d) => d.alive);
}

/**
 * A seat's gate-passed line lands as an aside once its time has come and no
 * wave card is up. The sim disposes: a line whose boss is gone is dropped.
 * Reads the clock and the seat's words, never a fact.
 */
function landSay(state: RoundState): void {
  const say = state.bossSay;
  if (!say) return;
  if (state.t < say.at) return;
  // A wave card or a catch keeps the field; a seed aside gives way.
  if (state.caption && state.caption.kind !== 'aside') return;
  state.caption = { text: say.text, t: SAY_CAPTION_T, kind: 'aside' };
  state.bossSay = null;
}

function stepBoss(state: RoundState, meta: Meta, dt: number): void {
  if (!state.boss || !state.boss.alive) state.bossSay = null;
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
  landSay(state);
  const phase = def.phases[boss.phase] ?? def.phases[0]!;
  meta.bossPhaseT += dt;
  if (meta.bossPhaseT >= phase.duration) {
    meta.bossPhaseT -= phase.duration;
    boss.phase = (boss.phase + 1) % def.phases.length;
  }
  const p = def.phases[boss.phase] ?? phase;
  boss.motion = p.motion;
  const u = Math.min(1, meta.bossPhaseT / Math.max(0.01, p.duration));
  const rhythm = meta.patterns.fire.tiers[fireKey(meta.round.tier)].boss;
  // A pilot `hold` keeps the boss exactly where it was until its next beat.
  // A pending pilot `column` slides it toward the ship, up to the lever's
  // reach; otherwise the slide eases back. Both read the player and the
  // seat's verb, never a fact.
  const held = state.t < meta.bossHoldUntil;
  const leanTarget =
    state.bossIntent === 'column'
      ? Math.max(
          -rhythm.pilot.lean,
          Math.min(
            rhythm.pilot.lean,
            state.player.x + state.player.w / 2 - (meta.bossOriginX + meta.bossBaseW / 2),
          ),
        )
      : 0;
  if (!held) {
    const step = LEAN_SPEED * dt;
    const d = leanTarget - meta.bossLean;
    meta.bossLean += Math.abs(d) <= step ? d : Math.sign(d) * step;
  }
  if (held) {
    /* the rect stays as the last beat left it */
  } else if (p.motion === 'pulse') {
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
  if (!held) {
    boss.x = Math.max(0, Math.min(FIELD.width - boss.w, boss.x + meta.bossLean));
    boss.y = meta.bossOriginY;
  }

  if (!meta.rung.bossFires) return;
  if (state.t < meta.bossFireAt) return;
  const raging = meta.rung.rageStart || boss.hp < def.hp / 2;
  const wait = rhythm.period * (raging ? def.rage : 1) * fireScale(state, meta);
  meta.bossFireAt = state.t + wait;
  const cx = boss.x + boss.w / 2;
  const by = boss.y + boss.h;
  const intent = state.bossIntent;
  if (intent) state.bossIntent = null;
  const seated = intent !== null && intent !== 'script';
  const fire = seated ? intent : p.fire;
  if (p.cue === 'emit-grid' || fire === 'emit-grid') emitWaveGrids(state, meta);
  if (fire === 'drop-fog' || fire === 'fog') {
    spawnFog(state, cx, by, 40 * meta.rung.fog);
  } else if (seated && fire === 'spread') {
    // A pilot spread is a fan the ship has to weave, not a tracked shot.
    fireSpread(state.enemyShots, cx, by, {
      ...rhythm,
      burst: rhythm.pilot.fan,
      spread: rhythm.pilot.spread,
    });
  } else if (seated && fire === 'column') {
    // A pilot column comes from wherever the lean carried the boss, at the ship.
    if (rhythm.aim) fireAimed(state.enemyShots, cx, by, rhythm, state.player);
    else spawnShot(state.enemyShots, cx, by, rhythm.speed);
  } else if (fire === 'spread' || fire === 'column') {
    if (rhythm.aim) fireAimed(state.enemyShots, cx, by, rhythm, state.player);
    else if (fire === 'spread') fireSpread(state.enemyShots, cx, by, rhythm);
    else spawnShot(state.enemyShots, cx, by, rhythm.speed);
  } else if (fire === 'plate-out' || fire === 'plate') {
    boss.plate = { x: boss.x + boss.w, y: boss.y + boss.h / 4, w: 28, h: 10 };
    if (meta.rung.hazards) spawnHazard(state, 'plate', cx, by, 80, 140);
  } else if (fire === 'plate-back' || fire === 'hold') {
    boss.plate = null;
    // A pilot hold is a held breath: no shot this beat, and the boss stays put.
    if (seated) meta.bossHoldUntil = state.t + wait;
  }
  if (meta.rung.hazards) {
    if (boss.kind === 'whisperer' && p.motion === 'pulse') {
      spawnHazard(state, 'echo', cx, by, 0, 75);
    }
    if (boss.kind === 'menu' && p.motion === 'squash') spawnHazard(state, 'band', cx, by, 0, 90);
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
  const spec = meta.patterns.fire.tiers[fireKey(meta.round.tier)].dive;
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
  dives.set(enemy, {
    phase: 'down',
    originX: hoverHome.get(enemy) ?? enemy.x,
    originY: enemy.hoverY - enemy.h / 2,
    commitX: null,
  });
}

function stepDive(state: RoundState, meta: Meta | undefined, enemy: Enemy, dt: number): void {
  const spec = meta?.patterns.fire.tiers[fireKey(meta.round.tier)].dive;
  const d = dives.get(enemy);
  if (!spec || !d) {
    enemy.mode = 'hover';
    return;
  }
  const destY = d.phase === 'down' ? spec.depth * FIELD.height : d.originY;
  if (d.phase === 'down' && d.commitX === null) {
    const half = Math.abs(destY - d.originY) * 0.5;
    if (Math.abs(enemy.y - d.originY) >= half) {
      d.commitX = state.player.x + state.player.w / 2 - enemy.w / 2;
    }
  }
  const destX =
    d.phase === 'up' ? d.originX : (d.commitX ?? state.player.x + state.player.w / 2 - enemy.w / 2);
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
  if (enemy.sprite !== 'grid' && enemy.sprite !== 'menu') return;
  if (isDecoy(enemy) && !paraSpec(meta).decoysFire) return;
  const rhythm = meta.patterns.fire.tiers[fireKey(meta.round.tier)].formation;
  if (!rhythm) return;
  if (enemy.mode !== 'hover') return;
  const period = rhythm.period * fireScale(state, meta);
  if (enemy.fireAt === Number.POSITIVE_INFINITY) enemy.fireAt = state.t + period;
  if (state.t < enemy.fireAt) return;
  enemy.fireAt = state.t + period;
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
  state.spreadT = Math.max(0, state.spreadT - dt);
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
    maybeAside(state, meta);
    stepParallelism(state, meta);
  }

  if (state.lives <= 0) {
    endRound(state, 'lamps', meta);
    return state;
  }
  if (state.t >= state.duration) {
    state.t = state.duration;
    endRound(state, 'time', meta);
    return state;
  }

  if (input.left && !input.right) state.player.x -= player.speed * dt;
  if (input.right && !input.left) state.player.x += player.speed * dt;
  state.player.x = Math.max(0, Math.min(FIELD.width - state.player.w, state.player.x));

  state.fireCooldown = Math.max(0, state.fireCooldown - dt);
  if (input.fire && state.fireCooldown <= 0) {
    const cx = state.player.x + state.player.w / 2;
    const y = state.player.y - SHOT_H;
    if (state.spreadT > 0) {
      spawnShot(state.shots, cx, y, -PLAYER_SHOT_SPEED, -12, -90);
      spawnShot(state.shots, cx, y, -PLAYER_SHOT_SPEED);
      spawnShot(state.shots, cx, y, -PLAYER_SHOT_SPEED, 12, 90);
    } else {
      spawnShot(state.shots, cx, y, -PLAYER_SHOT_SPEED);
    }
    state.fireCooldown = player.cooldown;
  }

  for (const shot of state.shots) {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    if (shot.y + shot.h < 0 || shot.x + shot.w < 0 || shot.x > FIELD.width) shot.dead = true;
  }
  for (const shot of state.enemyShots) {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    if (
      shot.y > FIELD.height ||
      shot.y + shot.h < 0 ||
      shot.x + shot.w < 0 ||
      shot.x > FIELD.width
    ) {
      shot.dead = true;
    }
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
      if (enemy.pathT >= 1) {
        enemy.mode = 'hover';
        hoverHome.set(enemy, enemy.x);
      }
    } else {
      enemy.mode = 'hover';
      let home = hoverHome.get(enemy);
      if (home === undefined) {
        home = enemy.x;
        hoverHome.set(enemy, home);
      }
      enemy.x = wrapX(home + Math.sin(state.t * 1.6 + home * 0.02) * 6, enemy.w);
      maybeStartDive(state, meta, enemy);
    }
    if (meta) stepFormationFire(state, meta, enemy);
  }

  if (meta) {
    stepFogBeats(state, meta);
    stepBoss(state, meta, dt);
  }
  stepFog(state, dt);
  stepDrops(state, meta, dt);

  for (const enemy of state.enemies) {
    if (enemy.mode !== 'dive' || !enemy.alive) continue;
    if (overlaps(enemy, state.player)) takeLamp(state, meta?.rung.grace ?? player.grace);
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
      spawnFormationDrop(state, meta, enemy);
      break;
    }
  }

  for (const shot of state.enemyShots) {
    if (shot.dead) continue;
    if (state.grace > 0) continue;
    if (!overlaps(shot, state.player)) continue;
    shot.dead = true;
    takeLamp(state, meta?.rung.grace ?? player.grace);
  }

  stepHazards(state, meta, dt, player.grace);

  state.shots = state.shots.filter((s: Shot) => !s.dead);
  state.enemyShots = state.enemyShots.filter((s: Shot) => !s.dead);
  return state;
}

/** Can a player shot hit this enemy now? Exported for the bots; reads no fact. */
export function isHittable(state: RoundState, enemy: Enemy): boolean {
  return hittable(state, enemy);
}
