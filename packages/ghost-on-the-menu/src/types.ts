import type { PatternSet } from './patterns';

/** Decoration / enemy class. Lies share a class with their honest counterpart. */
export type SpriteClass =
  'init' | 'ready' | 'menu' | 'grid' | 'answer' | 'fog' | 'obstacle' | 'stall' | 'error';

export type EnemyMode = 'enter' | 'hover' | 'dive' | 'caught' | 'dying' | 'exit';

export type WaveKind = 'inspect' | 'poison' | 'rug' | 'unlisted' | 'breather';

/** Atom id prefix → wave kind. Unknown atoms play as inspect. */
export function kindOfAtom(atom: string): WaveKind {
  if (atom.startsWith('poison.')) return 'poison';
  if (atom.startsWith('temporal.')) return 'rug';
  if (atom.startsWith('protocol.')) return 'unlisted';
  return 'inspect';
}

export const VISIBLE_MIN = 40;
export const VISIBLE_MAX = 80;
export const DEFAULT_SECONDS = 150;

export const FIELD = { width: 480, height: 360 } as const;

/** Parking line for caught lies (trophies keep their x). */
export const PARKING_Y = 20;

export interface BeatSource {
  atom: string;
  method: string;
  note: string;
  index: number;
}

export interface Beat {
  id: string;
  t: number;
  x: number;
  sprite: SpriteClass;
  lie: boolean;
  members: number;
  source: BeatSource;
}

export interface WaveBound {
  atom: string;
  t0: number;
  t1: number;
}

export interface Round {
  tapeId: string;
  duration: number;
  beats: Beat[];
  seed: number;
  waveBounds: WaveBound[];
  tier: 0 | 1 | 2 | 3;
  /** How far up a shift's climb this round sits, 0 alone, 1 on the last call. Absent is 0. */
  climb?: number;
}

export interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Shot {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  dead: boolean;
}

export interface Enemy {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  hoverY: number;
  sprite: SpriteClass;
  lie: boolean;
  revealed: boolean;
  alive: boolean;
  tEnter: number;
  members: number;
  mode: EnemyMode;
  pathT: number;
  path: { x: number; y: number }[];
  caughtY: number;
  fireAt: number;
  dieAt: number;
}

export interface FogBank {
  x: number;
  y: number;
  w: number;
  h: number;
  vy: number;
  alive: boolean;
}

export interface Boss {
  kind: 'whisperer' | 'menu' | 'doorman';
  x: number;
  y: number;
  w: number;
  h: number;
  phase: number;
  hp: number;
  /** Starting hp from bosses.json, so a seat can name health as a word. */
  maxHp: number;
  /** The current phase's motion word from bosses.json. Data, never a fact. */
  motion: string;
  alive: boolean;
  plate: { x: number; y: number; w: number; h: number } | null;
  /** Seconds since the last player shot hit this boss. Infinity before any hit. */
  hitT: number;
}

/**
 * A seat's pick of the line a boss says when it spawns: an index into that
 * kind's lines in voice.json, for one wave. Consumed at spawn; the seed's
 * pick stays when it is absent or does not match.
 */
export interface BossLinePick {
  wave: number;
  kind: Boss['kind'];
  index: number;
}

/**
 * A seat's line for the boss to say, already through the say gate: the
 * words and the round time it may land. The sim shows it as an aside once
 * the field is clear of a wave card and drops it if the boss is gone.
 * Never derived from a fact.
 */
export interface BossSay {
  text: string;
  at: number;
}

export interface Scene {
  tapeId: string;
  cleared: string[];
  /** Furniture line above the tape/server/policy. Never a fact. */
  line?: string;
}

export interface Caption {
  text: string;
  t: number;
  /** Wave card vs catch. Optional so older callers still typecheck. */
  kind?: 'wave' | 'catch' | 'aside';
  /** Furniture line under the wave word. Never a fact. */
  line?: string;
}

export type DropKind = 'lamp' | 'spread';

export interface Drop {
  kind: DropKind;
  x: number;
  y: number;
  w: number;
  h: number;
  alive: boolean;
}

export interface RoundState {
  t: number;
  duration: number;
  tapeId: string;
  player: Player;
  shots: Shot[];
  enemies: Enemy[];
  fireCooldown: number;
  /** Lie ids revealed by a hit. Drawn only via `scene` at the end. */
  cleared: string[];
  scene: Scene | null;
  hitstop: number;
  shake: number;
  lives: number;
  /** Starting lamps for this rung. Bezel length. Never a score. */
  maxLives: number;
  fog: FogBank | null;
  blind: number;
  wave: number;
  boss: Boss | null;
  enemyShots: Shot[];
  caption: Caption | null;
  ended: 'time' | 'lamps' | null;
  /** Seconds of post-hit invulnerability. One burst must not take three lamps. */
  grace: number;
  /** Bosses killed this round. For cues and tests; never drawn as a digit. */
  bossKills: number;
  /** Seconds since the player last lost a lamp. Infinity before any hit. */
  playerHitT: number;
  /** Round time of the last boss kill. NEGATIVE_INFINITY before any. */
  bossDownT: number;
  /** Drops falling toward the ship. Class motion, never fact motion. */
  drops: Drop[];
  /** Seconds of spread fire remaining. */
  spreadT: number;
  /** Drops caught this round. For cues; never drawn as a digit. */
  dropCatches: number;
  /** Boss-emitted hazards. Class motion, never fact motion. */
  hazards: Hazard[];
  /** Optional Ollama (or test) boss fire verb. Never derived from a fact. */
  bossIntent: string | null;
  /** Optional Ollama (or test) pick of the boss's spawn line. Never derived from a fact. */
  bossLine: BossLinePick | null;
  /** Optional seat-written, gate-passed line for the boss. Never derived from a fact. */
  bossSay: BossSay | null;
  /**
   * True while a seed-scheduled parallelism burst is on. Extra honest
   * decoys and a hotter soundtrack; never a fact.
   */
  parallelism: boolean;
}

export type HazardKind = 'echo' | 'band' | 'plate';

export interface Hazard {
  kind: HazardKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  alive: boolean;
}

export interface RoundInput {
  left: boolean;
  right: boolean;
  fire: boolean;
}

export interface DrawContext {
  fillStyle: string;
  font: string;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number): void;
  /**
   * Draw the named sprite into the rect and return true, or return false
   * (or be absent) so the renderer falls back to the rectangle. The key is a
   * sprite class, `player`, `revealed`, or a boss frame; never anything
   * derived from `lie`.
   */
  drawSprite?(key: string, x: number, y: number, w: number, h: number): boolean;
}

export interface PrepassOpts {
  seconds: number;
  seed?: number;
  patterns?: PatternSet;
  /** Override derived tier so a fixture tape can play at live or hardcore. */
  tier?: 0 | 1 | 2 | 3 | undefined;
  /** The shift's climb for this call, 0..1; the parallelism levers read it. */
  climb?: number;
}
