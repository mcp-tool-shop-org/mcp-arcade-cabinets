// @mcp-arcade-cabinets/house-call — Claude's lane.
//
// Turn-based. Each atom is a turn; the player states a call and a confidence
// before the reveal; the reveal is the tape's wire fact. Score is a proper
// scoring rule on the confidence; coverage is a separate axis; numbers are
// withheld until the end of a run. See docs/study-swarm.dispatch.md G2-G6.

export const CABINET = 'house-call';

export type { Call, Fact, Outcome, Tape, TapeAtom, TapeRow, TurnOutcomes } from './types';
export {
  brier,
  clampConfidence,
  implied,
  meanBrier,
  reliability,
  MIN_CONFIDENCE,
  MAX_CONFIDENCE,
} from './score';
export type { ReliabilityBin } from './score';
export {
  TURN_ATOMS,
  commitTurn,
  coverageKey,
  factFor,
  partyMember,
  rowsFor,
  setupTurn,
  splitRows,
  turnOutcomes,
} from './turn';
export type { PartyMember, TurnResult, TurnSetup } from './turn';
export {
  FACT_SENTENCE,
  OUTCOME_LABEL,
  askForCall,
  confidenceWord,
  introduce,
  reveal,
} from './narrative';
export { commit, isOver, nextTurn, readout, startRun } from './run';
export type { Readout, RunState } from './run';
export { nextTape, tier, unlockedTier } from './director';
export type { CampaignEntry, History } from './director';
