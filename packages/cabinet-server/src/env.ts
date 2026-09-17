// What both cabinets' servers need to read an operator's environment
// honestly. It is a leaf on purpose: `server.ts` and `server-vibe.ts` are
// two entries with a top-level side effect each, so neither may import the
// other, and a second copy of this rule in the other file is exactly the
// kind of hand-copy the two cabinets keep finding out of step.

/** The line ending every note here carries; kept off the literals so they read as sentences. */
const NEWLINE = '\n';

/**
 * A whole number out of an environment variable, or null when it is not one.
 * `CABINET_TIER=abc` and `CABINET_SEED=1.5` are **absent**, not the default:
 * a fallback reached through `NaN` reads afterwards as though the operator
 * asked for the default, which they did not. A leading minus is allowed
 * because the sim folds a seed through `>>> 0` and a negative one is an
 * ordinary seed to it.
 */
export function wholeEnv(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const text = raw.trim();
  if (!/^-?\d+$/.test(text)) return null;
  const n = Number(text);
  return Number.isSafeInteger(n) ? n : null;
}

/** Set, and set to something: an empty variable is the operator saying nothing. */
export function setEnv(raw: string | undefined): raw is string {
  return raw !== undefined && raw.trim() !== '';
}

/**
 * The notes both cabinets say about a value they could not read.
 *
 * Four of the five used to say only what the cabinet would do instead and
 * never what a working value looks like, while the fifth - the voice url,
 * one block away in `server.ts` - carried its own reasoning for doing the
 * opposite: "a line that said only that the value was wrong gave the
 * operator most likely to meet it nothing to change". The shapes were
 * already written down, in the image's own table and the Catalog listing's
 * copy of it, on surfaces the operator reading stderr is not looking at.
 *
 * They live here, beside the readers, because the two cabinets are meant to
 * say the same rule in the same words and two hand-copies is how that stops
 * being true.
 */
export const SEED_NOTE =
  'CABINET_SEED was not understood; it is a whole number, and the cabinet draws its own until it is one' +
  NEWLINE;

/** The tier note, with the range the readers already check against. */
export function tierNote(word: string): string {
  return (
    'CABINET_TIER was not understood; it is zero to three, and the cabinet plays at tier ' +
    word +
    NEWLINE
  );
}

/**
 * The typist note. It used to print the spec string `parseBot` eats - the
 * one operator note in either server carrying a digit, against the rule
 * `server.ts` states as universal, and a second unexplained value handed to
 * an operator who has just been told their own was not understood. The
 * default is said in words and the shape is said as a shape.
 */
export const BOT_NOTE =
  'CABINET_BOT was not understood; it is a name and a pace, written as `typist:<words per minute>`, and the cabinet plays under its house typist' +
  NEWLINE;
