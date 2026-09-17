// @mcp-arcade-cabinets/ghost-on-the-menu — Grok's lane.
//
// Replay arcade shooter. A whole-tape pre-pass fits the round to 2-3 minutes;
// timing from event order first, enemy kind from event class second; bursts
// form one formation; lies reveal on the hit, never pre-labelled; the round
// ends with a scene, not a count. See docs/study-swarm.dispatch.md G7.

export const CABINET = 'ghost-on-the-menu';

// The barrel is the package's only entry point, so a name that is not here is
// reachable only by deep-importing a path the package does not publish — and
// it never reaches an editor tooltip. Every type named by a signature or a
// field the barrel exports belongs here; test/scaffold.test.ts walks them.
export { DEFAULT_SECONDS, FIELD, PARKING_Y, VISIBLE_MAX, VISIBLE_MIN } from './types';
export type {
  Beat,
  Boss,
  BossLinePick,
  BossSay,
  Caption,
  DrawContext,
  Drop,
  DropKind,
  Enemy,
  EnemyMode,
  Flavor,
  FlavorRole,
  FogBank,
  Hazard,
  HazardKind,
  Player,
  Round,
  RoundButton,
  RoundInput,
  RoundState,
  Scene,
  Shot,
  SpriteClass,
  WaveBound,
} from './types';
export { prepassRound } from './prepass';
export type { PrepassOpts } from './types';
export {
  BOSS_QUEUE_MAX,
  bossKindFor,
  createRoundState,
  FIELD_SEP,
  isDecoy,
  MAX_DT,
  pushBossVerbs,
  revealOnHit,
  saidLine,
  stepRound,
  watchSaid,
} from './sim';
export type { RoundStateOpts, SaidRow } from './sim';
export {
  attachedPatterns,
  bagFor,
  burstActive,
  cadenceAt,
  CLIMB_MAX,
  DEFAULT_PATTERNS,
  intensityAt,
  emptyLineBag,
  nextBagLine,
  pickLine,
  deriveRung,
  deriveTier,
  LAMP_CAUSES,
  readLineBags,
  rungWhy,
  rungWord,
  shuffleOrder,
  TIMED_DROP_KINDS,
  voiceWaveKey,
} from './patterns';
export type {
  EndlessCeiling,
  LineBag,
  LineBags,
  EndlessClimb,
  EndlessRank,
  EndlessScore,
  EndlessSet,
  EndWhy,
  LadderRung,
  LampCause,
  ParallelismTier,
  PatternSet,
  PilotLever,
  ShiftSet,
  Tier,
  TimedDropKind,
  VoiceSet,
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
  ENDLESS_NAMELESS_TAPE,
  ENDLESS_NO_TIER_ZERO,
  endlessScoreLines,
  endlessWords,
  beyondWord,
  BREATHER_REACH,
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
  shiftTitle,
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
  COMBAT_FILL,
  fillFor,
  makeTextCtx,
  renderRound,
  REVEALED_FILL,
  SPRITE_FILL,
  SPRITE_KEYS,
  WAVE_FIELD,
} from './render';
export type { CombatClass, FieldKind, Intensity, RenderOpts, SpriteKey } from './render';
export { cues, kindOfAtom, snapshot, waveKindAt } from './cues';
export type { CueSnapshot, WaveKind } from './cues';
export {
  attach,
  bar,
  barSeconds,
  BED_FADE_S,
  BED_LEVEL,
  BED_POOL,
  BURST_RATE,
  DEFAULT_MUSIC,
  END_FADE_S,
  TRACK_KEYS,
  TRACKS,
  sfx,
} from './audio';
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
  restingWhy,
  SEAT_REST_MS,
  stickWord,
  VOICE_SYSTEM,
  voicePrompt,
} from './pilot';
export type { BossView, OllamaOpts, PilotIntent } from './pilot';
export type { AudioOut, BedLookup, MediaBed, MusicPattern, Note, SfxName, TrackKey } from './audio';
// The scripted play-through (`./play`) reads fixtures from disk and is built
// separately into dist/play.js for `pnpm test:play`; it stays off the barrel
// so the browser bundle never pulls node:fs.
export type { PlayArgs, PlaySeat, SeatReport, Transcript, TranscriptWhy } from './play';
