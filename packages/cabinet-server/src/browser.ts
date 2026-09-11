// The browser-safe barrel for the shell: the contract, the gate, the
// boundary and the seat machine. Nothing here reads an API key or spawns a
// process; the say seat's drivers (`say.ts`) stay on the node side, behind
// the dev server's `/cabinet/say`.

export { CONTRACT, enumOf, TOOL_NAMES, toolDef } from './contract';
export type { ToolDef, ToolName } from './contract';
export { gateLine, SAY_MAX_WORDS } from './gate';
export type { GateReason } from './gate';
export { DEFAULT_PERSONAS, LEADS } from './personas';
export type { BossKind, Lead, Persona, Personas, VoiceSheet } from './personas';
export { createCabinet, viewLines } from './cabinet';
export type { Cabinet, CabinetHost, SeatView, TapeCard } from './cabinet';
export { hostForRound, seatView, tapeCards } from './host';
export type { HostOpts, Live, VoiceJob } from './host';
export { speakLine, voiceHealth, createVoicer } from './voice';
export type { SpeakAnswer, VoiceOpts, VoiceReceipt, Voicer, VoicerStats } from './voice';
export { askFire, createSeat, sameView, warmUp } from './client';
export type { AskFireOpts, FireAnswer, Seat, SeatStats } from './client';
export { seedLines, seedPool } from './seeds';
