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
  BossLinePick,
  DrawContext,
  Drop,
  DropKind,
  Enemy,
  Hazard,
  Round,
  RoundInput,
  RoundState,
  Scene,
  SpriteClass,
} from './types';
export { prepassRound } from './prepass';
export { bossKindFor, createRoundState, isDecoy, revealOnHit, stepRound } from './sim';
export {
  attachedPatterns,
  burstActive,
  DEFAULT_PATTERNS,
  pickLine,
  voiceWaveKey,
} from './patterns';
export type { ParallelismTier, PatternSet } from './patterns';
export { labelTape } from './label';
export type { TapeLabel } from './label';
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
export { attach, bar, barSeconds, DEFAULT_MUSIC, TRACK_KEYS, TRACKS, sfx } from './audio';
export {
  askOllama,
  askOllamaLine,
  columnWord,
  defaultPilotModel,
  hpWord,
  isCloudModel,
  listPilotModels,
  needsLowThink,
  parseIntent,
  parseLetter,
  PILOT_SYSTEM,
  pilotPrompt,
  stickWord,
  VOICE_SYSTEM,
  voicePrompt,
} from './pilot';
export type { BossView, OllamaOpts, PilotIntent } from './pilot';
export type { AudioOut, BedLookup, MediaBed, MusicPattern, Note, SfxName, TrackKey } from './audio';
// The scripted play-through (`./play`) reads fixtures from disk and is built
// separately into dist/play.js for `pnpm test:play`; it stays off the barrel
// so the browser bundle never pulls node:fs.
export type { PlayArgs, Transcript } from './play';
