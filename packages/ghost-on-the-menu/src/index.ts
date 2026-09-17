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
  BossSay,
  DrawContext,
  Drop,
  DropKind,
  Enemy,
  Flavor,
  FlavorRole,
  Hazard,
  Round,
  RoundInput,
  RoundState,
  Scene,
  SpriteClass,
} from './types';
export { prepassRound } from './prepass';
export { bossKindFor, createRoundState, isDecoy, revealOnHit, stepRound } from './sim';
export type { RoundStateOpts } from './sim';
export {
  attachedPatterns,
  burstActive,
  cadenceAt,
  CLIMB_MAX,
  DEFAULT_PATTERNS,
  intensityAt,
  emptyLineBag,
  nextBagLine,
  pickLine,
  readLineBags,
  shuffleOrder,
  voiceWaveKey,
} from './patterns';
export type {
  EndlessCeiling,
  LineBags,
  EndlessClimb,
  EndlessRank,
  EndlessScore,
  EndlessSet,
  ParallelismTier,
  PatternSet,
  PilotLever,
  ShiftSet,
} from './patterns';
export {
  approachAt,
  CALLS_MAX,
  chainWord,
  decodeEndless,
  DEFAULT_DIFFICULTY,
  densityBand,
  encodeEndless,
  endlessPlan,
  ENDLESS_NO_TIER_ZERO,
  endlessScoreLines,
  endlessWords,
  isBreather,
  placeWord,
  rankWord,
  reachAt,
  reachWord,
  runEndless,
  SEED_SPACE,
  widenStep,
} from './endless';
export type {
  DensityBand,
  EndlessCall,
  EndlessCandidate,
  EndlessDecode,
  EndlessLines,
  EndlessOpts,
  EndlessPlanCall,
  EndlessRun,
  EndlessRunOpts,
  EndlessTape,
} from './endless';
export {
  climbAt,
  decodeShift,
  drawShift,
  encodeShift,
  flavorAt,
  flavorTelegraph,
  hashWords,
  lengthWord,
  ordinalWord,
  codeWords,
  rosterCheck,
  rosterFits,
  seededRandom,
  shiftCard,
  valueFromWords,
  wordsFromValue,
} from './shift';
export type { ShiftDecode, ShiftDraw } from './shift';
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
  askNextIntents,
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
  PILOT_INTENTS,
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
export type { PlayArgs, PlaySeat, Transcript } from './play';
