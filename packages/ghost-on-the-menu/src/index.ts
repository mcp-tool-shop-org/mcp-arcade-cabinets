// @mcp-arcade-cabinets/ghost-on-the-menu — Grok's lane.
//
// Replay arcade shooter. A whole-tape pre-pass fits the round to 2-3 minutes;
// timing from event order first, enemy kind from event class second; bursts
// form one formation; lies reveal on the hit, never pre-labelled; the round
// ends with a scene, not a count. See docs/study-swarm.dispatch.md G7.

export const CABINET = 'ghost-on-the-menu';

export { DEFAULT_SECONDS, FIELD, VISIBLE_MAX, VISIBLE_MIN } from './types';
export type {
  Beat,
  DrawContext,
  Enemy,
  Round,
  RoundInput,
  RoundState,
  Scene,
  SpriteClass,
} from './types';
export { prepassRound } from './prepass';
export { createRoundState, revealOnHit, stepRound } from './sim';
export {
  BOSS_FILL,
  bossFrame,
  fillFor,
  makeTextCtx,
  renderRound,
  REVEALED_FILL,
  SPRITE_FILL,
  SPRITE_KEYS,
} from './render';
export type { Intensity, RenderOpts, SpriteKey } from './render';
export { cues, kindOfAtom, snapshot, waveKindAt } from './cues';
export type { CueSnapshot, WaveKind } from './cues';
export { attach, bar, barSeconds, DEFAULT_MUSIC, sfx } from './audio';
export type { AudioOut, MusicPattern, Note, SfxName } from './audio';
// The scripted play-through (`./play`) reads fixtures from disk and is built
// separately into dist/play.js for `pnpm test:play`; it stays off the barrel
// so the browser bundle never pulls node:fs.
export type { PlayArgs, Transcript } from './play';
