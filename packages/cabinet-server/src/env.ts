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

/**
 * The image's variable table, as both `--help` texts print it.
 *
 * The rows are the Dockerfile's between its VARIABLES markers, which is the
 * canonical copy: it ships with the image, so it is the one an operator who
 * pulled the image can reach. They cannot be read at run time — the image
 * carries the two bundled servers and the tapes and no Dockerfile — so this
 * is a fourth copy of a table that has already drifted three ways, and
 * `surfaces.test.ts` compares it to the canonical rows line for line, the
 * way it already compares the Catalog listing's copy.
 *
 * It lives beside the readers for the same reason the notes above do: the
 * two cabinets print one table, and two hand-copies is how that stops being
 * true. The leading spaces are the table's own; the help prints the rows as
 * they are written here.
 */
export const VARIABLE_ROWS: readonly string[] = [
  '  CABINET            both     ghost (or unset) is the shooter, vibe is the typist',
  '  CABINET_TAPES      both     where the tapes are (baked at /app/tapes)',
  '  CABINET_TAPES_USER ghost    operator tapes merged beside the baked menu',
  '  CABINET_FIXTURE    ghost    which tape the round plays; the image sets its default on the shooter branch only',
  '  CABINET_TIER       both     zero to three; anything else is a note and the default (one on the shooter, zero on the typing cabinet)',
  '  CABINET_SEED       both     a whole number; anything else is a note',
  '  CABINET_BOT        vibe     the typist at the keyboard, as `typist:<words per minute>`',
  "  VOICE_URL          ghost    the host worker's base; unset or empty (the Catalog default) is silent",
  "  VOICE_TOKEN        ghost    the worker's bearer, when it binds beyond loopback",
];

/**
 * The lever rows a `--help` prints, one to a line: the name, then the words
 * a client's approval prompt shows for it. Derived from the cabinet's own
 * contract rather than written out, so a lever that lands or leaves moves
 * the help with it.
 */
export function leverRows(
  levers: readonly { name: string; title?: string; description: string }[],
): string[] {
  const width = Math.max(...levers.map((d) => d.name.length));
  return levers.map((d) => `  ${d.name.padEnd(width)}  ${d.title ?? d.name}`);
}

/**
 * The line a server writes when a stop signal reaches it. The start already
 * says the cabinet is up; without this the log simply stops, and a container
 * runtime's own stop reads the same as a crash.
 */
export const STOP_NOTE = 'the stop was heard; the cabinet is closed\n';
