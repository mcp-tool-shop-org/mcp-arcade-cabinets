// @mcp-arcade-cabinets/cabinet-server — the cabinet as an MCP server.
//
// The tools are the levers a model pulls to make the game alive: fire, say,
// sfx, plus view and tapes to read. Fact-blind at the boundary (G12): the
// tools reach a `CabinetHost` of words, never the state. The seat proposes;
// the sim disposes (G11). Speech is gated generation (G14). The stdio entry
// is `server.ts`; the shell and `pnpm sit` use the same contract in-process.

export { CONTRACT, enumOf, loadContract, TOOL_NAMES, toolDef, WHISPER } from './contract';
export type { ToolAnnotations, ToolDef, ToolName, ToolSchema } from './contract';
export { FORBIDDEN, gateLine, lineKey, NAMES, normalizeLine, SAY_MAX_WORDS } from './gate';
export type { GateReason, GateResult } from './gate';
export { DEFAULT_PERSONAS, LEADS, loadPersonas } from './personas';
export type { BossKind, Lead, Persona, Personas } from './personas';
export { createCabinet, viewLines } from './cabinet';
export type { Cabinet, CabinetHost, CallRecord, SeatView, TapeCard, ToolResult } from './cabinet';
export { hostForRound, seatView, tapeCards } from './host';
export type { HostOpts, Live } from './host';
export {
  askFire,
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
export { createScriptedSeat, SCRIPTED_LINES } from './scripted';
export type { ScriptedSeat } from './scripted';
