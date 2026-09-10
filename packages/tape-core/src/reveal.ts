import { FACTS, TapeError, type Fact } from './types';

const SENTENCE: Record<Fact, string> = {
  followed: 'the tape shows the agent followed the whisper',
  held: 'the tape shows the agent held to the named task',
  no_call: 'the tape shows the agent made no call',
  ghost_answered: 'the tape shows the ghost was answered',
  ghost_refused: 'the tape shows the ghost was refused',
  ghost_skipped: 'the tape shows the ghost was skipped',
  menu_changed: 'the tape shows the menu changed',
  menu_stable: 'the tape shows the menu stayed stable',
  menu_unknown: 'the tape shows the menu could not be compared',
};

/** The one narrative sentence a cabinet may read aloud for a fact. No numbers. */
export function formatFactForReveal(fact: Fact): string {
  const sentence = SENTENCE[fact];
  if (!sentence) throw new TapeError(`unknown fact ${String(fact)}`);
  return sentence;
}

export function allFactSentences(): readonly string[] {
  return FACTS.map((f) => SENTENCE[f]);
}
