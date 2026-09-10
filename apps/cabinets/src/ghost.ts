// Ghost on the Menu in the browser. One canvas, requestAnimationFrame, three
// keys. Sprites by class until hit; one reveal look on hit. No HUD: no score,
// no remaining, no combo, no timer digits (G7, G8). When the round is over
// the field freezes and the tape's name is drawn as furniture; cleared lies
// sit revealed, escaped lies sit as whatever class they wore. Click restarts
// the same tape.

import {
  createRoundState,
  FIELD,
  prepassRound,
  renderRound,
  stepRound,
  type DrawContext,
  type RoundInput,
  type RoundState,
} from '@mcp-arcade-cabinets/ghost-on-the-menu';
import type { Tape } from '@mcp-arcade-cabinets/tape-core';

export function mountGhost(root: HTMLElement, name: string, tape: Tape, onExit: () => void) {
  root.replaceChildren();
  const wrap = document.createElement('section');
  wrap.className = 'column';
  const canvas = document.createElement('canvas');
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;
  canvas.className = 'field';
  canvas.tabIndex = 0;
  const hint = document.createElement('p');
  hint.className = 'muted';
  hint.textContent = 'Left, right, space. Click the field to restart the same tape.';
  const back = document.createElement('button');
  back.textContent = 'Back to the cabinets';
  wrap.append(canvas, hint, back);
  root.append(wrap);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  // The renderer draws through a narrow DrawContext; the canvas fill type is
  // wider (gradients, patterns), so adapt rather than widen the contract.
  const draw: DrawContext = {
    get fillStyle() {
      return String(ctx.fillStyle);
    },
    set fillStyle(v: string) {
      ctx.fillStyle = v;
    },
    get font() {
      return ctx.font;
    },
    set font(v: string) {
      ctx.font = v;
    },
    fillRect: (x, y, w, h) => ctx.fillRect(x, y, w, h),
    fillText: (t, x, y) => ctx.fillText(t, x, y),
  };

  const input: RoundInput = { left: false, right: false, fire: false };
  const keys: Record<string, keyof RoundInput> = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    a: 'left',
    d: 'right',
    ' ': 'fire',
  };
  const onKey = (down: boolean) => (e: KeyboardEvent) => {
    const k = keys[e.key];
    if (!k) return;
    input[k] = down;
    e.preventDefault();
  };
  const keyDown = onKey(true);
  const keyUp = onKey(false);
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);

  let state: RoundState = createRoundState(prepassRound(tape));
  let last = performance.now();
  let raf = 0;

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    state = stepRound(state, input, dt);
    renderRound(draw, state);
    if (state.scene) {
      // Furniture, not a readout: a frame and the tape's name in words.
      ctx.fillStyle = '#8a6a3a';
      ctx.fillRect(0, 0, FIELD.width, 4);
      ctx.fillRect(0, FIELD.height - 4, FIELD.width, 4);
      ctx.fillStyle = '#c8d0dc';
      ctx.font = '12px monospace';
      ctx.fillText(name, 16, FIELD.height - 14);
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  canvas.addEventListener('click', () => {
    canvas.focus();
    if (state.scene) state = createRoundState(prepassRound(tape));
  });
  back.addEventListener('click', () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
    onExit();
  });
  canvas.focus();
}
