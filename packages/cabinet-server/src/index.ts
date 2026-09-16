// @mcp-arcade-cabinets/cabinet-server — the cabinet as an MCP server.
//
// The tools are the levers a model pulls to make the game alive: fire, say,
// sfx, plus view and tapes to read. Fact-blind at the boundary (G12): the
// tools reach a `CabinetHost` of words, never the state. The seat proposes;
// the sim disposes (G11). Speech is gated generation (G14). The stdio entry
// is `server.ts`; the shell and `pnpm sit` use the same contract in-process.

export {
  assertCatalogTools,
  CONTRACT,
  enumOf,
  loadContract,
  TOOL_NAMES,
  toolDef,
  VIBE_CONTRACT,
  VIBE_TOOL_NAMES,
  vibeToolDef,
  WHISPER,
} from './contract';
export type {
  AnyToolName,
  ToolAnnotations,
  ToolDef,
  ToolName,
  ToolSchema,
  VibeToolName,
} from './contract';
export {
  DIGIT,
  FORBIDDEN,
  gateLine,
  lineKey,
  NAMES,
  namesRegex,
  normalizeLine,
  SAY_MAX_WORDS,
  VIBE_NAMES,
} from './gate';
export type { GateReason, GateResult } from './gate';
export { DEFAULT_PERSONAS, LEADS, loadPersonas } from './personas';
export type { BossKind, Lead, Persona, Personas, VoiceSheet } from './personas';
export { createCabinet, viewLines } from './cabinet';
export type { Cabinet, CabinetHost, CallRecord, SeatView, TapeCard, ToolResult } from './cabinet';
export { hostForRound, seatView, tapeCards } from './host';
export type { HostOpts, Live, VoiceJob } from './host';
export { speakLine, voiceHealth, createVoicer } from './voice';
export type { SpeakAnswer, SpeakJob, VoiceOpts, VoiceReceipt, Voicer, VoicerStats } from './voice';
export { createVibeVoicer, vibeVoiceLine } from './voice-vibe';
export type {
  VibeBeat,
  VibeLine,
  VibeLineFacts,
  VibeVoiceJob,
  VibeVoicer,
  VibeVoicerOpts,
  VibeVoicerStats,
} from './voice-vibe';
export {
  askFire,
  chatJson,
  chatTools,
  createSeat,
  DEFAULT_KEEP_ALIVE,
  needsLowThinkChat,
  sameView,
  SEAT_SYSTEM,
  seatPrompt,
  VERB_FORMAT,
  WARM_VIEW,
  warmUp,
} from './client';
export type {
  AskFireOpts,
  ChatAnswer,
  ChatOpts,
  FireAnswer,
  Seat,
  SeatOpts,
  SeatStats,
  ToolCall,
} from './client';
export { askSay, askSayFor, CLAUDE_MODEL, SAY_SYSTEM, sayPrompt, sayTier, seedLines } from './say';
export type { SayAnswer, SayCall, SayOpts, SayPrompt, SayTier } from './say';
// The endless seat (G28 as slice 3 amends it): the vibe coder, played by a
// model, for the typing cabinet's endless ladder.
export {
  askEndlessFor,
  ENDLESS_SCHEMA,
  ENDLESS_SYSTEM,
  endlessPrompt,
  parseRequest,
} from './endless';
export type { EndlessAnswer, EndlessPrompt, EndlessRequest, EndlessView } from './endless';
// The typing cabinet's container tools (slice 4): the push path of the same
// seat. Any MCP client plays the user in endless through these four.
export { createVibeCabinet, reactFault, splitNotes, tooLong } from './vibe-cabinet';
export type {
  AskAnswer,
  AskRefusal,
  VibeAsk,
  VibeCabinet,
  VibeCallRecord,
  VibeHost,
  VibeToolResult,
} from './vibe-cabinet';
export {
  isRepeatAsk,
  REACT_WINDOW,
  RECENT_TO_SEAT,
  recentAsks,
  vibeHostFor,
  vibeViewLines,
  WEAK_TO_SEAT,
} from './vibe-host';
export type { VibeLive } from './vibe-host';
export { VIBE_SEAT_SYSTEM, vibeSeatPrompt } from './vibe-seat';
export { bandWord, LANGUAGE_WORDS, sayablePairs, STACK_WORDS } from './vibe-words';
export { seedPool } from './seeds';
export { createScriptedSeat, SCRIPTED_LINES } from './scripted';
export type { ScriptedSeat } from './scripted';
