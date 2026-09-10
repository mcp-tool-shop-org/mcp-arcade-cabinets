/** Decoration / enemy class. Lies share a class with their honest counterpart. */
export type SpriteClass = 'init' | 'menu' | 'grid' | 'fog' | 'obstacle' | 'stall';

export const VISIBLE_MIN = 40;
export const VISIBLE_MAX = 80;
export const DEFAULT_SECONDS = 150;

export const FIELD = { width: 480, height: 360 } as const;

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

export interface Round {
  tapeId: string;
  duration: number;
  beats: Beat[];
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
}

export interface Scene {
  tapeId: string;
  cleared: string[];
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
}
