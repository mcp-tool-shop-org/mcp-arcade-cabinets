// @mcp-arcade-cabinets/vibe-typer — the sim behind the typing cabinet.
//
// You are the agent. Your user is a vibe coder whose asks are absurd and who
// likes you. You type the code, the thing gets built, the valuation rolls up.
// The chassis is Ghost's (headless sim, JSON levers validated at load, seeded
// determinism, bots and a band); the game is new. Lock G23-G30 in
// docs/vibe-typer.dispatch.md.
//
// This barrel is what the shell (slice 2) consumes. It never imports node:,
// so the browser bundle stays clean; the play-through lives in ./play.

export const CABINET = 'vibe-typer';

export type {
  Band,
  Beat,
  BuiltPiece,
  ChatLine,
  Creep,
  Event,
  LevelPlan,
  Request,
  RunInput,
  RunState,
  Snippet,
  Stack,
  Tier,
} from './types';

export {
  BEATS,
  DEFAULT_PATTERNS,
  lineFault,
  lineTier,
  loadPatterns,
  tierContext,
  CORPUS_STACKS,
  FORM_FORBIDDEN,
  MODEL_FORBIDDEN,
  STACKS,
  VOICE_FORBIDDEN,
} from './patterns';

// American English on every player- and reader-facing surface. The test and
// an offline authoring script read the same list.
export { BRITISH, britishHit } from './spelling';
export type { BritishWord } from './spelling';
export type {
  AgentSet,
  CabinetSet,
  ContextSet,
  ContextTier,
  DifficultySet,
  EndlessDef,
  HypeStep,
  KeyPos,
  LevelDef,
  LevelsSet,
  Milestone,
  Patterns,
  ProductsSet,
  ScoreSet,
  TierLines,
  UserSet,
} from './patterns';

export {
  buildModel,
  codeLines,
  DEFAULT_CORPUS,
  inBand,
  integrationSnippets,
  loadCorpus,
  surprisal,
  weakWeight,
  withIntegration,
} from './corpus';
export type { Corpus, IntegrationSeed, NgramModel } from './corpus';

export { travel, travelCost, value, valueOf, valueParts } from './difficulty';
export type { ValueParts } from './difficulty';

export {
  copilotReady,
  hypeFor,
  hypeLadder,
  milestoneCrossed,
  pay,
  pitchFor,
  PITCH_CAP,
} from './score';

export {
  burn,
  clamp,
  drain,
  EMPTY,
  FULL,
  isNearMiss,
  NEAR_MISS,
  rateAt,
  refill,
  spend,
} from './context';

export { askFor, fill, LinePicker, safeTitle } from './lines';
export type { PickerOpts } from './lines';

export { endlessBandAt, endlessPeek, levelDefAt, levelSeedFor, planLevel } from './level';
export type { PlanOpts } from './level';

// The code gate (G28 as slice 3 amends it): the mechanical half of what
// stands between a seated model's request and the field. The other half is
// `lineFault`, exported above.
export {
  balanced,
  bandRange,
  BARRED_IN_CODE,
  gateCode,
  LANGUAGE_HINTS,
  MAX_COLS,
  MAX_LINES,
  MAX_NOTES,
  MAX_PRODUCT_WORDS,
  VALUE_TOLERANCE,
} from './codegate';
export type {
  BandRange,
  CodeGateCtx,
  CodeGateReason,
  CodeGateResult,
  SeatRequest,
} from './codegate';

export {
  agentNameOf,
  codeOf,
  corpusOf,
  createRun,
  feedRequests,
  leversOf,
  NAG_SALT,
  nextSeed,
  planOf,
  stepRun,
  suppliedAsks,
  suppliedCount,
  syncOf,
} from './sim';
export type { CreateRunOpts } from './sim';

export { hashString, mixSeed, seededRandom, shuffleOrder, weightedPick } from './seed';

// The scripted play-through (`./play`) reads tapes from disk and is built
// separately into dist/play.js for `pnpm test:play`; it stays off the barrel
// so the browser bundle never pulls node:fs.
export type { Bot, BotSpec, PlayArgs, Transcript } from './play';
