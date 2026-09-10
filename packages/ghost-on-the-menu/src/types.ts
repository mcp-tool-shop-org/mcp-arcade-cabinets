import type { PatternSet } from './patterns';

/** Decoration / enemy class. Lies share a class with their honest counterpart. */
export type SpriteClass = 'init' | 'menu' | 'grid' | 'answer' | 'fog' | 'obstacle' | 'stall';

export type EnemyMode = 'enter' | 'hover' | 'dive' | 'caught' | 'dying' | 'exit';

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
  tier: 0 | 1 | 2;
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
  alive: boolean;
  plate: { x: number; y: number; w: number; h: number } | null;
}

export interface Scene {
  tapeId: string;
  cleared: string[];
}

export interface Caption {
  text: string;
  t: number;
  /** Wave card vs catch. Optional so older callers still typecheck. */
  kind?: 'wave' | 'catch';
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
  fog: FogBank | null;
  blind: number;
  wave: number;
  boss: Boss | null;
  enemyShots: Shot[];
  caption: Caption | null;
  ended: 'time' | 'lamps' | null;
  /** Seconds of post-hit invulnerability. One burst must not take three lamps. */
  grace: number;
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
}
