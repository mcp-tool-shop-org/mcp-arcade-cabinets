// @mcp-arcade-cabinets/cabinet-server — the cabinet as an MCP server.
//
// The tools are the levers a model pulls to make the game alive: fire, say,
// speak, sfx, plus view and tapes to read. Fact-blind at the boundary (G12):
// the tools reach a `CabinetHost` of words, never the state. The seat
// proposes; the sim disposes (G11). Speech is gated generation (G14). The
// stdio entry is `server.ts`; the shell and `pnpm sit` use the same contract
// in-process.
//
// What this entry is for: it is what a consumer reads in editor tooltips, so
// every table that turns an internal verdict into the words a client reads
// belongs in it, and so does the options type of every exported factory. It
// used to be an arbitrary subset - `vibeHostFor` was exported and
// `VibeHostOpts` was not, so a caller could call the function and could not
// name its options type, while `HostOpts`, its shooter twin, was right
// there. Nothing here is deliberately package-private; a deep import into
// `src/` is not the intended way to reach a rule other code must agree with.

export {
  assertCatalogTools,
  CONTRACT,
  enumOf,
  loadContract,
  MAX_TEXT_LENGTH,
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
export { UNPRINTABLE } from './gate';
// The name the call log gives a lever this cabinet does not carry.
export { NO_LEVER } from './tool-names';
// The words every proposing lever answers with while a round or a run has
// stopped moving, and the extra line `view` prints there. Both cabinets say
// them, so a consumer that reads a tool answer needs them too.
export {
  createStepFaults,
  guardStep,
  isStuck,
  STEP_FAULT_LINE,
  STUCK_ANSWER,
  STUCK_FAULTS,
  STUCK_VIEW_LINE,
} from './step-guard';
export type { StepFaults } from './step-guard';
// What the two voicers say about a take, in the one table both of them read.
export { BAD_PAYLOAD, noWorkerWords, receiptWords, refusedWords, VOICE_WORDS } from './voice-words';
export { DEFAULT_PERSONAS, LEADS, loadPersonas } from './personas';
export type { BossKind, Lead, Persona, Personas, VoiceSheet } from './personas';
// The shooter's presentation vocabulary: the words a refused line, an end
// scene and a stuck round reach a client as.
export { createCabinet, GATE_FIX, SCENE_ANSWERS, SCENE_VIEW_LINE, viewLines } from './cabinet';
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
  ENDLESS_TOOL_DESCRIPTION,
  ENDLESS_TOOL_NAME,
  endlessPrompt,
  parseRequest,
} from './endless';
export type { EndlessAnswer, EndlessPrompt, EndlessRequest, EndlessView } from './endless';
// The typing cabinet's container tools (slice 4): the push path of the same
// seat. Any MCP client plays the user in endless through these four.
// The typing cabinet's, for the same reason.
export {
  createVibeCabinet,
  reactFault,
  sayDetail,
  sayReason,
  splitNotes,
  tooLong,
  VIBE_ASK_FIX,
} from './vibe-cabinet';
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
  askHandle,
  HANDLE_WORDS,
  isRepeatAsk,
  REACT_WINDOW,
  RECENT_TO_SEAT,
  recentAsks,
  requestFor,
  vibeHostFor,
  vibeViewLines,
  WEAK_TO_SEAT,
} from './vibe-host';
export type { VibeHostOpts, VibeLive } from './vibe-host';
export { VIBE_SEAT_SYSTEM, vibeSeatPrompt } from './vibe-seat';
export { bandWord, LANGUAGE_WORDS, sayablePairs, STACK_WORDS } from './vibe-words';
export { seedPool } from './seeds';
export { createScriptedSeat, SCRIPTED_LINES } from './scripted';
export type { ScriptedSeat } from './scripted';
