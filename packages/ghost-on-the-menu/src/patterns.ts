import type { SpriteClass, WaveKind } from './types';

import bossesJson from '../patterns/bosses.json';
import dropsJson from '../patterns/drops.json';
import fireJson from '../patterns/fire.json';
import formationsJson from '../patterns/formations.json';
import ladderJson from '../patterns/ladder.json';
import pathsJson from '../patterns/paths.json';
import playerJson from '../patterns/player.json';
import voiceJson from '../patterns/voice.json';
import wavesJson from '../patterns/waves.json';

const SPRITE_CLASSES: readonly SpriteClass[] = [
  'init',
  'menu',
  'grid',
  'answer',
  'fog',
  'obstacle',
  'stall',
];
/** Classes that spawn as enemies. Fog becomes a FogBank, never a path. */
const SPAWN_CLASSES: readonly SpriteClass[] = [
  'init',
  'menu',
  'grid',
  'answer',
  'obstacle',
  'stall',
];

const PHASE_FORBIDDEN = new Set(['lie', 'fact', 'revealed', 'followed']);
const BOSS_KINDS = ['whisperer', 'menu', 'doorman'] as const;
const TIER_KEYS = ['0', '1', '2'] as const;
const WAVE_VOICE_KEYS = ['inspect', 'poison', 'rug', 'unlisted'] as const;
const DROP_KINDS = ['lamp', 'spread'] as const;
const VOICE_FORBIDDEN =
  /\d|\b(lie|fact|revealed|followed|held|score|pass|fail|nrp|integrity|utility|cleared|ghost)\b/i;
const MIN_VOICE_LINES = 4;

export interface PathPoint {
  x: number;
  y: number;
}

export interface PathDef {
  id: string;
  classes: SpriteClass[];
  tiers: number[];
  points: PathPoint[];
}

export interface Offset {
  dx: number;
  dy: number;
}

export interface FireRhythm {
  period: number;
  burst: number;
  spread: number;
  speed: number;
}

export interface BossRhythm extends FireRhythm {
  aim: boolean;
}

export interface DiveRhythm {
  period: number;
  speed: number;
  depth: number;
}

export interface FireTier {
  formation: FireRhythm | null;
  boss: BossRhythm;
  dive: DiveRhythm | null;
}

/**
 * A boss phase. Shots land only when `motion` is not `slit` or `hold`
 * (Menu squash-to-dodge, Doorman guard). Every kind has at least one
 * vulnerable phase.
 */
export interface BossPhase {
  duration: number;
  motion: string;
  fire: string;
  cue: string;
}

export interface BossDef {
  w: number;
  h: number;
  hp: number;
  /** Fire-period multiplier when hp is below half. In (0, 1]. */
  rage: number;
  phases: BossPhase[];
}

export interface DeriveRule {
  target_kind?: string;
  image?: boolean;
  seat?: boolean;
  live?: boolean;
  tier: 0 | 1 | 2;
}

export interface LadderRung {
  tier: 0 | 1 | 2;
  pools: string[];
  bossFires: boolean;
  formationFires: boolean;
  speed: number;
  fog: number;
  lamps: number;
}

export interface WaveTier {
  breather: number;
  beatsPerGroup: number;
  rest: number;
  density: number;
  /** Seconds after the last wave for the last boss to be fought. */
  tail: number;
}

export type SpriteBox = { w: number; h: number };

export type DropKind = (typeof DROP_KINDS)[number];
export type DropFrom = 'boss' | 'formation';

export interface DropSpec {
  from: DropFrom;
  fall: number;
  drift: number;
  box: SpriteBox;
  /** Seconds of spread fire; only on the spread kind. */
  duration: number;
}

export type VoiceWaveKey = (typeof WAVE_VOICE_KEYS)[number];
export type VoiceBossKey = (typeof BOSS_KINDS)[number];

export interface VoiceSet {
  wave: Record<VoiceWaveKey, string[]>;
  boss: Record<VoiceBossKey, string[]>;
  end: string[];
}

export interface PatternSet {
  paths: { paths: PathDef[] };
  formations: {
    layouts: Record<'1' | '2' | '3' | '4', Offset[]>;
    sprites: Record<(typeof SPAWN_CLASSES)[number], SpriteBox>;
  };
  fire: { tiers: Record<'0' | '1' | '2', FireTier> };
  bosses: Record<(typeof BOSS_KINDS)[number], BossDef>;
  ladder: { derive: DeriveRule[]; rungs: LadderRung[] };
  waves: { tiers: Record<'0' | '1' | '2', WaveTier> };
  player: {
    speed: number;
    cooldown: number;
    hitbox: { w: number; h: number };
    y: number;
    grace: number;
  };
  drops: Record<DropKind, DropSpec>;
  voice: VoiceSet;
}

export interface TapeHeader {
  target_kind: string;
  seat: { model: string | null; template_sha256: string | null } | null;
  container: { image_id: string | null; name_prefix: string | null } | null;
}

function fail(file: string, key: string): never {
  throw new Error(`patterns/${file}: ${key}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function req(obj: Record<string, unknown>, file: string, key: string): unknown {
  if (!Object.prototype.hasOwnProperty.call(obj, key)) fail(file, key);
  return obj[key];
}

function asString(value: unknown, file: string, key: string): string {
  if (typeof value !== 'string') fail(file, key);
  return value;
}

function asNumber(value: unknown, file: string, key: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(file, key);
  return value;
}

function asBoolean(value: unknown, file: string, key: string): boolean {
  if (typeof value !== 'boolean') fail(file, key);
  return value;
}

function asArray(value: unknown, file: string, key: string): unknown[] {
  if (!Array.isArray(value)) fail(file, key);
  return value;
}

function asRecord(value: unknown, file: string, key: string): Record<string, unknown> {
  if (!isRecord(value)) fail(file, key);
  return value;
}

function asUnit(value: unknown, file: string, key: string): number {
  const n = asNumber(value, file, key);
  if (n < 0 || n > 1) fail(file, key);
  return n;
}

function asSpriteClass(value: unknown, file: string, key: string): SpriteClass {
  const s = asString(value, file, key);
  if (!(SPRITE_CLASSES as readonly string[]).includes(s)) fail(file, key);
  return s as SpriteClass;
}

function asTier(value: unknown, file: string, key: string): 0 | 1 | 2 {
  const n = asNumber(value, file, key);
  if (n !== 0 && n !== 1 && n !== 2) fail(file, key);
  return n;
}

function loadRhythm(value: unknown, file: string, key: string): FireRhythm {
  const obj = asRecord(value, file, key);
  return {
    period: asNumber(req(obj, file, 'period'), file, 'period'),
    burst: asNumber(req(obj, file, 'burst'), file, 'burst'),
    spread: asNumber(req(obj, file, 'spread'), file, 'spread'),
    speed: asNumber(req(obj, file, 'speed'), file, 'speed'),
  };
}

function loadBossRhythm(
  value: unknown,
  file: string,
  key: string,
  tierKey: '0' | '1' | '2',
): BossRhythm {
  const obj = asRecord(value, file, key);
  const aim = asBoolean(req(obj, file, 'aim'), file, 'aim');
  if (tierKey === '0' && aim) fail(file, 'aim');
  if (tierKey !== '0' && !aim) fail(file, 'aim');
  return { ...loadRhythm(value, file, key), aim };
}

function loadPaths(raw: unknown): PatternSet['paths'] {
  const file = 'paths.json';
  const obj = asRecord(raw, file, 'paths');
  const list = asArray(req(obj, file, 'paths'), file, 'paths');
  const paths: PathDef[] = list.map((item) => {
    const p = asRecord(item, file, 'paths');
    const id = asString(req(p, file, 'id'), file, 'id');
    const classes = asArray(req(p, file, 'classes'), file, 'classes').map((c) =>
      asSpriteClass(c, file, 'classes'),
    );
    if (classes.length === 0) fail(file, 'classes');
    const tiers = asArray(req(p, file, 'tiers'), file, 'tiers').map((t) =>
      asTier(t, file, 'tiers'),
    );
    if (tiers.length === 0) fail(file, 'tiers');
    const pointsRaw = asArray(req(p, file, 'points'), file, 'points');
    if (pointsRaw.length < 3) fail(file, 'points');
    const points = pointsRaw.map((pt) => {
      const rec = asRecord(pt, file, 'points');
      return {
        x: asUnit(req(rec, file, 'x'), file, 'x'),
        y: asUnit(req(rec, file, 'y'), file, 'y'),
      };
    });
    return { id, classes, tiers, points };
  });
  return { paths };
}

function loadFormations(raw: unknown): PatternSet['formations'] {
  const file = 'formations.json';
  const obj = asRecord(raw, file, 'layouts');
  const layoutsRaw = asRecord(req(obj, file, 'layouts'), file, 'layouts');
  const layouts = {} as PatternSet['formations']['layouts'];
  for (const key of ['1', '2', '3', '4'] as const) {
    const list = asArray(req(layoutsRaw, file, key), file, key);
    const n = Number(key);
    if (list.length !== n) fail(file, key);
    layouts[key] = list.map((item) => {
      const rec = asRecord(item, file, key);
      return {
        dx: asNumber(req(rec, file, 'dx'), file, 'dx'),
        dy: asNumber(req(rec, file, 'dy'), file, 'dy'),
      };
    });
  }
  const spritesRaw = asRecord(req(obj, file, 'sprites'), file, 'sprites');
  const sprites = {} as PatternSet['formations']['sprites'];
  for (const cls of SPAWN_CLASSES) {
    const rec = asRecord(req(spritesRaw, file, cls), file, cls);
    const w = asNumber(req(rec, file, 'w'), file, 'w');
    const h = asNumber(req(rec, file, 'h'), file, 'h');
    if (!(w > 0 && h > 0)) fail(file, cls);
    sprites[cls] = { w, h };
  }
  return { layouts, sprites };
}

function loadFire(raw: unknown): PatternSet['fire'] {
  const file = 'fire.json';
  const obj = asRecord(raw, file, 'tiers');
  const tiersRaw = asRecord(req(obj, file, 'tiers'), file, 'tiers');
  const tiers = {} as PatternSet['fire']['tiers'];
  for (const key of TIER_KEYS) {
    const rec = asRecord(req(tiersRaw, file, key), file, key);
    const formationRaw = req(rec, file, 'formation');
    const formation = formationRaw === null ? null : loadRhythm(formationRaw, file, 'formation');
    if (key === '0' && formation !== null) fail(file, 'formation');
    const diveRaw = req(rec, file, 'dive');
    let dive: DiveRhythm | null = null;
    if (diveRaw === null) {
      if (key !== '0') fail(file, 'dive');
    } else {
      if (key === '0') fail(file, 'dive');
      const d = asRecord(diveRaw, file, 'dive');
      const depth = asNumber(req(d, file, 'depth'), file, 'depth');
      if (depth < 0 || depth > 1) fail(file, 'depth');
      dive = {
        period: asNumber(req(d, file, 'period'), file, 'period'),
        speed: asNumber(req(d, file, 'speed'), file, 'speed'),
        depth,
      };
    }
    tiers[key] = {
      formation,
      boss: loadBossRhythm(req(rec, file, 'boss'), file, 'boss', key),
      dive,
    };
  }
  return { tiers };
}

function loadBosses(raw: unknown): PatternSet['bosses'] {
  const file = 'bosses.json';
  const obj = asRecord(raw, file, 'whisperer');
  const bosses = {} as PatternSet['bosses'];
  for (const kind of BOSS_KINDS) {
    const rec = asRecord(req(obj, file, kind), file, kind);
    const phasesRaw = asArray(req(rec, file, 'phases'), file, 'phases');
    if (phasesRaw.length < 2) fail(file, 'phases');
    const phases = phasesRaw.map((item) => {
      const p = asRecord(item, file, 'phases');
      for (const key of Object.keys(p)) {
        if (PHASE_FORBIDDEN.has(key)) fail(file, key);
      }
      return {
        duration: asNumber(req(p, file, 'duration'), file, 'duration'),
        motion: asString(req(p, file, 'motion'), file, 'motion'),
        fire: asString(req(p, file, 'fire'), file, 'fire'),
        cue: asString(req(p, file, 'cue'), file, 'cue'),
      };
    });
    const rage = asNumber(req(rec, file, 'rage'), file, 'rage');
    if (!(rage > 0 && rage <= 1)) fail(file, 'rage');
    bosses[kind] = {
      w: asNumber(req(rec, file, 'w'), file, 'w'),
      h: asNumber(req(rec, file, 'h'), file, 'h'),
      hp: asNumber(req(rec, file, 'hp'), file, 'hp'),
      rage,
      phases,
    };
  }
  return bosses;
}

function loadLadder(raw: unknown, pathIds: Set<string>): PatternSet['ladder'] {
  const file = 'ladder.json';
  const obj = asRecord(raw, file, 'derive');
  const derive = asArray(req(obj, file, 'derive'), file, 'derive').map((item) => {
    const rec = asRecord(item, file, 'derive');
    const rule: DeriveRule = { tier: asTier(req(rec, file, 'tier'), file, 'tier') };
    if (Object.prototype.hasOwnProperty.call(rec, 'target_kind')) {
      rule.target_kind = asString(rec.target_kind, file, 'target_kind');
    }
    if (Object.prototype.hasOwnProperty.call(rec, 'image')) {
      rule.image = asBoolean(rec.image, file, 'image');
    }
    if (Object.prototype.hasOwnProperty.call(rec, 'seat')) {
      rule.seat = asBoolean(rec.seat, file, 'seat');
    }
    if (Object.prototype.hasOwnProperty.call(rec, 'live')) {
      rule.live = asBoolean(rec.live, file, 'live');
    }
    return rule;
  });
  if (derive.length === 0) fail(file, 'derive');
  const rungs = asArray(req(obj, file, 'rungs'), file, 'rungs').map((item) => {
    const rec = asRecord(item, file, 'rungs');
    return {
      tier: asTier(req(rec, file, 'tier'), file, 'tier'),
      pools: asArray(req(rec, file, 'pools'), file, 'pools').map((p) => asString(p, file, 'pools')),
      bossFires: asBoolean(req(rec, file, 'bossFires'), file, 'bossFires'),
      formationFires: asBoolean(req(rec, file, 'formationFires'), file, 'formationFires'),
      speed: asNumber(req(rec, file, 'speed'), file, 'speed'),
      fog: asNumber(req(rec, file, 'fog'), file, 'fog'),
      lamps: asNumber(req(rec, file, 'lamps'), file, 'lamps'),
    };
  });
  const seen = new Set(rungs.map((r) => r.tier));
  if (!seen.has(0) || !seen.has(1) || !seen.has(2)) fail(file, 'rungs');
  for (const rung of rungs) {
    for (const id of rung.pools) {
      if (!pathIds.has(id)) fail(file, 'pools');
    }
  }
  return { derive, rungs };
}

function loadWaves(raw: unknown): PatternSet['waves'] {
  const file = 'waves.json';
  const obj = asRecord(raw, file, 'tiers');
  const tiersRaw = asRecord(req(obj, file, 'tiers'), file, 'tiers');
  const tiers = {} as PatternSet['waves']['tiers'];
  for (const key of TIER_KEYS) {
    const rec = asRecord(req(tiersRaw, file, key), file, key);
    tiers[key] = {
      breather: asNumber(req(rec, file, 'breather'), file, 'breather'),
      beatsPerGroup: asNumber(req(rec, file, 'beatsPerGroup'), file, 'beatsPerGroup'),
      rest: asNumber(req(rec, file, 'rest'), file, 'rest'),
      density: asNumber(req(rec, file, 'density'), file, 'density'),
      tail: asNumber(req(rec, file, 'tail'), file, 'tail'),
    };
  }
  return { tiers };
}

function loadPlayer(raw: unknown): PatternSet['player'] {
  const file = 'player.json';
  const obj = asRecord(raw, file, 'speed');
  const hitbox = asRecord(req(obj, file, 'hitbox'), file, 'hitbox');
  return {
    speed: asNumber(req(obj, file, 'speed'), file, 'speed'),
    cooldown: asNumber(req(obj, file, 'cooldown'), file, 'cooldown'),
    hitbox: {
      w: asNumber(req(hitbox, file, 'w'), file, 'w'),
      h: asNumber(req(hitbox, file, 'h'), file, 'h'),
    },
    y: asNumber(req(obj, file, 'y'), file, 'y'),
    grace: asNumber(req(obj, file, 'grace'), file, 'grace'),
  };
}

function loadDropSpec(raw: unknown, file: string, kind: DropKind): DropSpec {
  const rec = asRecord(raw, file, kind);
  for (const key of Object.keys(rec)) {
    if (PHASE_FORBIDDEN.has(key)) fail(file, key);
  }
  const from = asString(req(rec, file, 'from'), file, 'from');
  if (kind === 'lamp' && from !== 'boss') fail(file, 'from');
  if (kind === 'spread' && from !== 'formation') fail(file, 'from');
  const box = asRecord(req(rec, file, 'box'), file, 'box');
  const w = asNumber(req(box, file, 'w'), file, 'w');
  const h = asNumber(req(box, file, 'h'), file, 'h');
  if (!(w > 0 && h > 0)) fail(file, kind);
  const fall = asNumber(req(rec, file, 'fall'), file, 'fall');
  const drift = asNumber(req(rec, file, 'drift'), file, 'drift');
  if (!(fall > 0)) fail(file, 'fall');
  if (!(drift >= 0)) fail(file, 'drift');
  let duration = 0;
  if (Object.prototype.hasOwnProperty.call(rec, 'duration')) {
    duration = asNumber(rec.duration, file, 'duration');
  }
  if (kind === 'spread') {
    if (!(duration > 0)) fail(file, 'duration');
  } else if (duration !== 0) {
    fail(file, 'duration');
  }
  return { from: from as DropFrom, fall, drift, box: { w, h }, duration };
}

function loadDrops(raw: unknown): PatternSet['drops'] {
  const file = 'drops.json';
  const obj = asRecord(raw, file, 'lamp');
  const drops = {} as PatternSet['drops'];
  for (const kind of DROP_KINDS) {
    drops[kind] = loadDropSpec(req(obj, file, kind), file, kind);
  }
  return drops;
}

function loadLines(raw: unknown, file: string, key: string): string[] {
  const list = asArray(raw, file, key).map((item, i) => asString(item, file, `${key}.${i}`));
  if (list.length < MIN_VOICE_LINES) fail(file, key);
  for (const line of list) {
    if (line.trim() === '' || VOICE_FORBIDDEN.test(line)) fail(file, key);
  }
  return list;
}

function loadVoice(raw: unknown): VoiceSet {
  const file = 'voice.json';
  const obj = asRecord(raw, file, 'wave');
  const waveRaw = asRecord(req(obj, file, 'wave'), file, 'wave');
  const wave = {} as VoiceSet['wave'];
  for (const key of WAVE_VOICE_KEYS) {
    wave[key] = loadLines(req(waveRaw, file, key), file, key);
  }
  const bossRaw = asRecord(req(obj, file, 'boss'), file, 'boss');
  const boss = {} as VoiceSet['boss'];
  for (const key of BOSS_KINDS) {
    boss[key] = loadLines(req(bossRaw, file, key), file, key);
  }
  return { wave, boss, end: loadLines(req(obj, file, 'end'), file, 'end') };
}

/** Pick a line by seed and salt. Same seed and salt, same line; never reads a fact. */
export function pickLine(lines: readonly string[], seed: number, salt: number): string {
  if (lines.length === 0) return '';
  const x = (Math.imul(seed, 1664525) + Math.imul(salt + 1, 1013904223)) >>> 0;
  return lines[x % lines.length]!;
}

/** Wave voice key for an atom kind. Breath and unknowns share inspect's lines. */
export function voiceWaveKey(kind: WaveKind): VoiceWaveKey {
  if (kind === 'poison' || kind === 'rug' || kind === 'unlisted') return kind;
  return 'inspect';
}

const FILES = [
  'paths',
  'formations',
  'fire',
  'bosses',
  'ladder',
  'waves',
  'player',
  'drops',
  'voice',
] as const;

/** Validate every pattern file. Message is `patterns/<file>: <key>` for the first bad key. */
export function loadPatterns(raw: unknown): PatternSet {
  const obj = isRecord(raw) ? raw : fail('paths.json', 'paths');
  for (const name of FILES) {
    if (!Object.prototype.hasOwnProperty.call(obj, name)) fail(`${name}.json`, name);
  }
  const paths = loadPaths(obj.paths);
  const ladder = loadLadder(obj.ladder, new Set(paths.paths.map((p) => p.id)));
  for (const rung of ladder.rungs) {
    for (const cls of SPAWN_CLASSES) {
      const covered = paths.paths.some(
        (p) => rung.pools.includes(p.id) && p.classes.includes(cls) && p.tiers.includes(rung.tier),
      );
      if (!covered) fail('ladder.json', 'pools');
    }
  }
  return {
    paths,
    formations: loadFormations(obj.formations),
    fire: loadFire(obj.fire),
    bosses: loadBosses(obj.bosses),
    ladder,
    waves: loadWaves(obj.waves),
    player: loadPlayer(obj.player),
    drops: loadDrops(obj.drops),
    voice: loadVoice(obj.voice),
  };
}

const attached = new WeakMap<object, PatternSet>();

export function attachPatterns(host: object, set: PatternSet): void {
  attached.set(host, set);
}

export function attachedPatterns(host: object): PatternSet {
  return attached.get(host) ?? DEFAULT_PATTERNS;
}

/**
 * First matching derive rule wins.
 * stdio → 2; docker with image_id → 2 even if seated; seat on a non-live
 * target → 1; fixture, or docker without image and without seat → 0.
 */
export function deriveTier(header: TapeHeader, ladder: PatternSet['ladder']): 0 | 1 | 2 {
  const kind = header.target_kind;
  const image = Boolean(header.container?.image_id);
  const seated = header.seat !== null;
  const live = kind === 'stdio' || (kind === 'docker' && image);
  for (const rule of ladder.derive) {
    if (rule.target_kind !== undefined && rule.target_kind !== kind) continue;
    if (rule.image !== undefined && rule.image !== image) continue;
    if (rule.seat !== undefined && rule.seat !== seated) continue;
    if (rule.live !== undefined && rule.live !== live) continue;
    return rule.tier;
  }
  return 0;
}

export const DEFAULT_PATTERNS: PatternSet = loadPatterns({
  paths: pathsJson,
  formations: formationsJson,
  fire: fireJson,
  bosses: bossesJson,
  ladder: ladderJson,
  waves: wavesJson,
  player: playerJson,
  drops: dropsJson,
  voice: voiceJson,
});
