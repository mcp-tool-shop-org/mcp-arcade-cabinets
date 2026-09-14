import {
  FIELD,
  type Boss,
  type DrawContext,
  type Enemy,
  type HazardKind,
  type RoundState,
  type SpriteClass,
} from './types';

export const SPRITE_FILL: Record<SpriteClass, string> = {
  init: '#3d5a80',
  ready: '#6a8aaa',
  menu: '#4a7c9b',
  grid: '#5b8c5a',
  answer: '#6a7f9b',
  fog: '#4c4c6a',
  obstacle: '#8a6a3a',
  stall: '#5a5a5a',
  error: '#8a4a4a',
};

export const REVEALED_FILL = '#e8a04a';
const REVEALED_HALO = '#6a4418';
const PLAYER_FILL = '#c8d0dc';
const SHOT_FILL = '#e8e0c8';
const ENEMY_SHOT_FILL = '#d8624a';
const FOG_FILL = 'rgba(76, 76, 106, 0.55)';
const VEIL_FILL = 'rgba(52, 52, 82, 0.88)';
const LAMP_LIT = '#e8c060';
const LAMP_RIM = '#3a3a4a';
const DROP_LAMP_FILL = '#f0d878';
const DROP_SPREAD_FILL = '#7ec8c8';
const BEZEL = '#181822';
const FIELD_FILL = '#101018';
const FURNITURE = '#c8d0dc';
/** Furniture line budget: 16px inset on each side of the 480 field. */
const TEXT_MAX = FIELD.width - 32;

export const BOSS_FILL: Record<Boss['kind'], string> = {
  whisperer: '#5a5a7a',
  menu: '#3a8a8a',
  doorman: '#a08040',
};

/** Pre-hit colour depends only on sprite class, never on `lie`. */
export function fillFor(sprite: SpriteClass, revealed: boolean): string {
  return revealed ? REVEALED_FILL : SPRITE_FILL[sprite];
}

/** Every sprite key the renderer may ask a DrawContext for. Art files carry these names. */
export const SPRITE_KEYS = [
  'player',
  'init',
  'menu',
  'grid',
  'answer',
  'fog',
  'obstacle',
  'stall',
  'error',
  'ready',
  'revealed',
  'hazard-echo',
  'hazard-band',
  'hazard-plate',
  'boss-whisperer',
  'boss-menu-open',
  'boss-menu-slit',
  'boss-doorman-plate-out',
  'boss-doorman-plate-gone',
  'drop-lamp',
  'drop-spread',
] as const;
export type SpriteKey = (typeof SPRITE_KEYS)[number];

/** Menu boss narrower than this draws the slit frame. */
const SLIT_FRAME_W = 40;

/** Cropped PNG sizes; dest rects keep this aspect instead of the sim box. */
const BOSS_NATIVE: Partial<Record<SpriteKey, { w: number; h: number }>> = {
  'boss-whisperer': { w: 108, h: 64 },
  'boss-menu-open': { w: 74, h: 117 },
  'boss-menu-slit': { w: 16, h: 110 },
  'boss-doorman-plate-out': { w: 62, h: 89 },
  'boss-doorman-plate-gone': { w: 51, h: 89 },
};

/** The boss frame is a function of the boss rect and plate the sim set; never of a fact. */
export function bossFrame(b: Boss): SpriteKey {
  switch (b.kind) {
    case 'menu':
      return b.w < SLIT_FRAME_W ? 'boss-menu-slit' : 'boss-menu-open';
    case 'doorman':
      return b.plate ? 'boss-doorman-plate-out' : 'boss-doorman-plate-gone';
    case 'whisperer':
      return 'boss-whisperer';
    default: {
      const _exhaustive: never = b.kind;
      return _exhaustive;
    }
  }
}

/**
 * Three presets, default below the midpoint (W4): hit-feedback preference
 * varies about six-fold and random settings read as excessive nearly half
 * the time, so the game starts calm and the player turns it up.
 */
export type Intensity = 'calm' | 'medium' | 'loud';

export interface RenderOpts {
  intensity?: Intensity;
  /** Shake off is the accessibility line; hitstop and the trophy stay. */
  shake?: boolean;
  /** Lines drawn as furniture on the end scene: tape, server, policy. Nothing else. */
  furniture?: readonly string[];
  /** Wall clock in seconds for the end-scene parade; the round clock is frozen there. */
  clock?: number;
}

const INTENSITY: Record<Intensity, { shake: number; pop: number; halo: number }> = {
  calm: { shake: 3, pop: 6, halo: 2 },
  medium: { shake: 6, pop: 10, halo: 3 },
  loud: { shake: 10, pop: 16, halo: 4 },
};

/** Honest pop length; matches the sim's DIE_POP without importing it. */
const DIE_POP = 0.15;
/** Seconds the boss reads white after a hit. */
const BOSS_FLASH = 0.08;
const BOSS_FLASH_FILL = 'rgba(255, 255, 255, 0.75)';
/** Seconds the boss-down burst lasts. */
const BOSS_BURST = 0.6;
const BOSS_BURST_FILL = '#e8e0c8';
const BEZEL_H = 14;

export function makeTextCtx(): DrawContext & { texts: string[] } {
  const texts: string[] = [];
  return {
    texts,
    fillStyle: '#000000',
    font: '14px sans-serif',
    fillRect() {},
    fillText(text: string) {
      texts.push(text);
    },
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Monospace ~0.6em; wrap then mark a cut with an ellipsis. Words only. */
function fitLines(text: string, fontPx: number, maxLines = 2): string[] {
  const col = Math.max(1, Math.floor(TEXT_MAX / (fontPx * 0.6)));
  if (text.length <= col) return [text];
  const lines: string[] = [];
  let rest = text;
  while (rest.length > 0 && lines.length < maxLines) {
    if (rest.length <= col) {
      lines.push(rest);
      break;
    }
    const last = lines.length === maxLines - 1;
    if (last) {
      lines.push(rest.slice(0, Math.max(1, col - 1)) + '…');
      break;
    }
    let cut = rest.lastIndexOf(' ', col);
    if (cut < col / 3) cut = col;
    lines.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  return lines;
}

function paintLines(
  ctx: DrawContext,
  text: string,
  x: number,
  y: number,
  fontPx: number,
  step: number,
  maxLines = 2,
): number {
  const lines = fitLines(text, fontPx, maxLines);
  for (const line of lines) {
    ctx.fillText(line, x, y);
    y += step;
  }
  return y;
}

/**
 * Dest rect at the PNG aspect, centered on the sim body (or body+plate).
 * dest-width of a plate-out frame spans the plate rect so the plate is not
 * squashed into the coat.
 */
function bossSpriteRect(b: Boss): { x: number; y: number; w: number; h: number } {
  const native = BOSS_NATIVE[bossFrame(b)];
  let sw = b.w;
  const sh = b.h;
  const sx = b.x;
  const sy = b.y;
  if (b.plate) {
    sw = Math.max(b.w, b.plate.x + b.plate.w - b.x);
  }
  if (!native) return { x: sx, y: sy, w: sw, h: sh };
  const destW = Math.max(sw, native.w * (sh / native.h));
  const destH = Math.max(sh, native.h * (sw / native.w));
  return {
    x: Math.round(sx + (sw - destW) / 2),
    y: Math.round(sy + (sh - destH) / 2),
    w: Math.round(destW),
    h: Math.round(destH),
  };
}

type Rect = (x: number, y: number, w: number, h: number) => void;
type Sprite = (key: SpriteKey, x: number, y: number, w: number, h: number) => boolean;

/** Members draw as segments so a burst reads as a formation; a singleton is one block. */
function drawFormation(rect: Rect, sprite: Sprite, enemy: Enemy): void {
  const n = Math.max(1, enemy.members);
  const gap = n > 1 ? 2 : 0;
  const bw = (enemy.w - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    const x = enemy.x + i * (bw + gap);
    if (!sprite(enemy.sprite, x, enemy.y, bw, enemy.h)) rect(x, enemy.y, bw, enemy.h);
  }
}

/** Four fragments flying outward and shrinking; small on purpose (W2). */
function drawPop(
  ctx: DrawContext,
  rect: (x: number, y: number, w: number, h: number) => void,
  enemy: Enemy,
  t: number,
  spread: number,
): void {
  const k = clamp01((enemy.dieAt - t) / DIE_POP);
  const d = (1 - k) * spread;
  const fw = Math.max(1, (enemy.w / 2) * k);
  const fh = Math.max(1, (enemy.h / 2) * k);
  const cx = enemy.x + enemy.w / 2;
  const cy = enemy.y + enemy.h / 2;
  ctx.fillStyle = fillFor(enemy.sprite, false);
  rect(cx - fw - d, cy - fh - d, fw, fh);
  rect(cx + d, cy - fh - d, fw, fh);
  rect(cx - fw - d, cy + d, fw, fh);
  rect(cx + d, cy + d, fw, fh);
}

/**
 * The renderer draws the state and adds nothing the sim did not decide.
 * No score, no counts, no pass/fail, no digits. Lamps are rectangles (lit
 * fill, unlit hollow rim). The end scene is the frozen field with the
 * trophies at the parking line, the escaped lies in their honest paint, and
 * the tape's name as furniture.
 */
export function renderRound(ctx: DrawContext, state: RoundState, opts: RenderOpts = {}): void {
  const level = INTENSITY[opts.intensity ?? 'calm'];
  const shakeOn = opts.shake ?? true;
  const s = shakeOn ? state.shake : 0;
  // Deterministic offset from the shake value itself, so the field jitters
  // during hitstop (when the clock is frozen) and settles as shake decays.
  const ox = s * level.shake * Math.sin(s * 53.7);
  const oy = s * level.shake * Math.cos(s * 31.1);
  const rect: Rect = (x, y, w, h) => ctx.fillRect(x + ox, y + oy, w, h);
  // Sprites are optional: a context without them, or without the file, gets the rectangle.
  const sprite: Sprite = (key, x, y, w, h) =>
    ctx.drawSprite ? ctx.drawSprite(key, x + ox, y + oy, w, h) : false;

  ctx.fillStyle = FIELD_FILL;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  if (state.fog && state.fog.alive) {
    const f = state.fog;
    if (!sprite('fog', f.x, f.y, f.w, f.h)) {
      ctx.fillStyle = FOG_FILL;
      rect(f.x, f.y, f.w, f.h);
    }
  }

  let bossPaintBottom = 0;
  if (state.boss && state.boss.alive) {
    const b = state.boss;
    const dest = bossSpriteRect(b);
    const drew = sprite(bossFrame(b), dest.x, dest.y, dest.w, dest.h);
    if (!drew) {
      ctx.fillStyle = BOSS_FILL[b.kind];
      rect(b.x, b.y, b.w, b.h);
      // A darker band so a boss reads as a wall, not a large grid sprite.
      ctx.fillStyle = FIELD_FILL;
      const band = Math.max(2, Math.floor(b.h / 5));
      if (b.w > 8 && b.h > band * 3) rect(b.x + 4, b.y + b.h - band * 2, b.w - 8, band);
      // The plate is part of the Doorman's sprite frame; as a rectangle it is drawn here.
      if (b.plate) {
        ctx.fillStyle = BOSS_FILL[b.kind];
        rect(b.plate.x, b.plate.y, b.plate.w, b.plate.h);
      }
    }
    bossPaintBottom = drew ? dest.y + dest.h : b.y + b.h;
    // A player shot that lands flashes the boss white for a few frames; the
    // flash is the same whatever the wave's fact, because every boss takes hits.
    if (b.hitT < BOSS_FLASH) {
      ctx.fillStyle = BOSS_FLASH_FILL;
      rect(b.x, b.y, b.w, b.h);
    }
  }

  // A boss that has just gone down bursts: an expanding ring of blocks at
  // the top of the field for a moment. Bigger than an honest pop, smaller
  // than the catch, and the same for every boss (W2, W7).
  const sinceDown = state.t - state.bossDownT;
  if (sinceDown >= 0 && sinceDown < BOSS_BURST) {
    const k = sinceDown / BOSS_BURST;
    const r = 20 + 90 * k;
    const size = Math.max(2, 10 * (1 - k));
    const cx = FIELD.width / 2;
    const cy = 44;
    ctx.fillStyle = BOSS_BURST_FILL;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      rect(cx + Math.cos(a) * r - size / 2, cy + Math.sin(a) * r * 0.6 - size / 2, size, size);
    }
  }

  for (const enemy of state.enemies) {
    if (!enemy.alive || state.t < enemy.tEnter) continue;
    if (enemy.mode === 'dying') {
      drawPop(ctx, rect, enemy, state.t, level.pop);
      continue;
    }
    if (enemy.mode === 'caught') {
      const bob = opts.clock !== undefined && state.scene ? Math.sin(opts.clock * 2 + enemy.x) : 0;
      const h = level.halo;
      ctx.fillStyle = REVEALED_HALO;
      rect(enemy.x - h, enemy.y - h + bob, enemy.w + h * 2, enemy.h + h * 2);
      if (!sprite('revealed', enemy.x, enemy.y + bob, enemy.w, enemy.h)) {
        ctx.fillStyle = REVEALED_FILL;
        rect(enemy.x, enemy.y + bob, enemy.w, enemy.h);
      }
      continue;
    }
    // A revealed lie is always in `caught` and drawn above; this path is pre-hit.
    ctx.fillStyle = fillFor(enemy.sprite, false);
    drawFormation(rect, sprite, enemy);
  }

  ctx.fillStyle = ENEMY_SHOT_FILL;
  for (const shot of state.enemyShots) {
    if (shot.dead) continue;
    rect(shot.x, shot.y, shot.w, shot.h);
  }

  ctx.fillStyle = SHOT_FILL;
  for (const shot of state.shots) {
    rect(shot.x, shot.y, shot.w, shot.h);
  }

  const HAZARD_FILL: Record<HazardKind, string> = {
    echo: '#7a7a9a',
    band: '#3a8a8a',
    plate: '#a08040',
  };
  for (const h of state.hazards) {
    if (!h.alive) continue;
    const key = `hazard-${h.kind}` satisfies SpriteKey;
    if (!sprite(key, h.x, h.y, h.w, h.h)) {
      ctx.fillStyle = HAZARD_FILL[h.kind];
      rect(h.x, h.y, h.w, h.h);
    }
  }

  for (const drop of state.drops) {
    if (!drop.alive) continue;
    const key = drop.kind === 'lamp' ? 'drop-lamp' : 'drop-spread';
    if (!sprite(key, drop.x, drop.y, drop.w, drop.h)) {
      ctx.fillStyle = drop.kind === 'lamp' ? DROP_LAMP_FILL : DROP_SPREAD_FILL;
      rect(drop.x, drop.y, drop.w, drop.h);
    }
  }

  // While grace runs after a lamp is lost the ship blinks, ten times a second.
  const p = state.player;
  const blinkOff = state.grace > 0 && Math.floor(state.playerHitT * 10) % 2 === 1;
  if (!blinkOff && !sprite('player', p.x, p.y, p.w, p.h)) {
    ctx.fillStyle = PLAYER_FILL;
    rect(p.x, p.y, p.w, p.h);
  }

  if (state.blind > 0) {
    ctx.fillStyle = VEIL_FILL;
    const top = Math.floor((FIELD.height * 2) / 3);
    ctx.fillRect(0, top, FIELD.width, FIELD.height - top);
  }

  // A caption still live when the round ends is not drawn: the end scene
  // names the tape, the server and the policy and nothing more (G10).
  if (state.caption && !state.scene) {
    if (state.caption.kind === 'wave' || state.caption.kind === 'aside') {
      ctx.fillStyle = FURNITURE;
      // Sit below the live boss (painted dest, or the sim body) so the card
      // is not written across the Whisperer/Menu/Doorman; otherwise the top band.
      let y = bossPaintBottom > 0 ? bossPaintBottom + 16 : 40;
      if (state.caption.kind === 'wave') {
        ctx.font = '16px monospace';
        y = paintLines(ctx, state.caption.text, 16, y, 16, 18, 1);
        if (state.caption.line) {
          ctx.font = '14px monospace';
          paintLines(ctx, state.caption.line, 16, y, 14, 16, 2);
        }
      } else {
        ctx.font = '14px monospace';
        paintLines(ctx, state.caption.text, 16, y, 14, 16, 2);
      }
    } else {
      // The catch: the wire fact in the reveal's amber, low on the field.
      ctx.fillStyle = REVEALED_FILL;
      ctx.font = '14px monospace';
      paintLines(ctx, state.caption.text, 16, FIELD.height - BEZEL_H - 30, 14, 16, 2);
    }
  }

  // The bezel does not shake: lamps are furniture, never a digit. Unlit
  // sockets are a hollow 8×6 with a grey rim so three holes stay visible.
  ctx.fillStyle = BEZEL;
  ctx.fillRect(0, FIELD.height - BEZEL_H, FIELD.width, BEZEL_H);
  const slots = Math.max(1, state.maxLives);
  for (let i = 0; i < slots; i++) {
    const lx = 12 + i * 14;
    const ly = FIELD.height - BEZEL_H + 4;
    if (i < state.lives) {
      ctx.fillStyle = LAMP_LIT;
      ctx.fillRect(lx, ly, 8, 6);
    } else {
      ctx.fillStyle = LAMP_RIM;
      ctx.fillRect(lx, ly, 8, 6);
      ctx.fillStyle = FIELD_FILL;
      ctx.fillRect(lx + 1, ly + 1, 6, 4);
    }
  }

  if (state.scene) {
    // Furniture only: a voice line, then the tape by name, the server, the
    // policy. The bout id is hex and never goes on the canvas.
    ctx.fillStyle = FURNITURE;
    ctx.font = '14px monospace';
    let y = 46;
    if (state.scene.line) {
      y = paintLines(ctx, state.scene.line, 16, y, 14, 18, 2);
    }
    for (const line of opts.furniture ?? []) {
      y = paintLines(ctx, line, 16, y, 14, 16, 2);
    }
  }
}
