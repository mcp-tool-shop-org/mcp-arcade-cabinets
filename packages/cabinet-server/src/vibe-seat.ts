// The seat's side of the typing cabinet's contract (slice 4). This is not
// the game and nothing here ships in a cabinet: it is the prompt `pnpm sit`
// puts in front of a model so the Director can read what a real client
// writes through `view`, `product`, `ask` and `react` before the push path
// is trusted.
//
// Fact-blind in (G12): the only thing this prompt carries besides itself is
// the text the `view` tool would have returned, which is words about what
// is being built and nothing measured. It throws if a forbidden word
// reaches the finished text, exactly as `endlessPrompt` and `sayPrompt` do,
// so a leak is a halt rather than a line on a transcript nobody re-reads.

import { FORBIDDEN } from './gate';

/** Frozen system prompt for the typing cabinet's seat. Same for every level. */
export const VIBE_SEAT_SYSTEM =
  'You are the user of a coding agent in an arcade cabinet. You cannot write code yourself, ' +
  'you are fond of the agent, and the things you want are absurd and sincere. ' +
  'Call product to name the thing you want built next. ' +
  'Call ask to send one request for it: what you want, the code the agent will type, a title, ' +
  'and up to three short teaching notes, one to a line. ' +
  'What you want is one sentence of at most twelve words, in your own voice, lower case, no ' +
  'exclamation mark, every number spelled out. You do not talk like a developer: you ask for ' +
  'the thing you want, never for a script or a function. Say {product} where the thing being ' +
  'built belongs and the cabinet fills it in. ' +
  'Write the code in the language the view names, at most twelve lines long and eighty columns ' +
  'wide, plain keyboard characters only, no smart quotes and no long dashes, and never name a ' +
  'tool, a model or a company anywhere in it. Write numbers in the code as ordinary digits; ' +
  'only the words you say spell them out. Keep the code as small as the view says the job ' +
  'should feel. Call react to say one line back about the piece that just shipped. ' +
  'Pull the levers; do not answer in prose.';

/**
 * What the seat is shown for one slot: the view the `view` tool returns, and
 * nothing else. A client would have called `view` for exactly this text.
 */
export function vibeSeatPrompt(view: string): string {
  if (FORBIDDEN.test(`${VIBE_SEAT_SYSTEM}\n${view}`)) {
    throw new Error('vibe seat prompt leaked a forbidden word');
  }
  return view;
}
