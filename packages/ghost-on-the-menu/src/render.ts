import { FIELD, type DrawContext, type RoundState, type SpriteClass } from './types';

export const SPRITE_FILL: Record<SpriteClass, string> = {
  init: '#3d5a80',
  menu: '#4a7c9b',
  grid: '#5b8c5a',
  fog: '#4c4c6a',
  obstacle: '#8a6a3a',
  stall: '#5a5a5a',
};

export const REVEALED_FILL = '#e8a04a';

/** Pre-hit colour depends only on sprite class, never on `lie`. */
export function fillFor(sprite: SpriteClass, revealed: boolean): string {
  return revealed ? REVEALED_FILL : SPRITE_FILL[sprite];
}

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

/**
 * Rectangles only. No score, no counts, no pass/fail. The end scene names
 * the tape and the lies that were cleared, as a list, not a total.
 */
export function renderRound(ctx: DrawContext, state: RoundState): void {
  ctx.fillStyle = '#101018';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  ctx.fillStyle = '#c8d0dc';
  ctx.fillRect(state.player.x, state.player.y, state.player.w, state.player.h);

  ctx.fillStyle = '#e8e0c8';
  for (const shot of state.shots) {
    ctx.fillRect(shot.x, shot.y, shot.w, shot.h);
  }

  for (const enemy of state.enemies) {
    if (!enemy.alive || state.t < enemy.tEnter) continue;
    ctx.fillStyle = fillFor(enemy.sprite, enemy.revealed);
    ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
  }

  if (state.scene) {
    ctx.fillStyle = '#e8e0d0';
    ctx.font = '14px sans-serif';
    ctx.fillText(`tape ${state.scene.tapeId}`, 16, 28);
    const names = state.scene.cleared.join(', ') || 'none';
    ctx.fillText(`cleared: ${names}`, 16, 50);
  }
}
