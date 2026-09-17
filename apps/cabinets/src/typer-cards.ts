// What a milestone is a picture of.
//
// The sim crosses a milestone and pushes its name; the cue turns that name
// into a word on the board (`typer-cues.ts`). Slice 4B gives each of those
// words a painted card behind it, and a card is a file on disk, so the name
// the lever carries has to reach a file name.
//
// One table does that, and one table only. The names live in
// `packages/vibe-typer/patterns/score.json`, where the middle one is
// `series a` with a space in it — a space is not a file name, so the two
// spellings would drift the moment anyone edited either side. Here they are
// pinned to each other, and a test walks the shipped lever and requires every
// milestone in it to have a card, so a fourth milestone added to the JSON
// fails the suite rather than quietly toasting a word with no picture.
//
// Nothing here reads the clock, the seed or the run.

/** The card each milestone name is drawn with, keyed by the lever's own name. */
export const CARD_SLUGS: ReadonlyMap<string, string> = new Map([
  ['seed', 'seed'],
  ['Series A', 'series-a'],
  ['unicorn', 'unicorn'],
]);

/** The ribbon the preview lays over a shipped product, under the same rule. */
export const DEPLOY_SLUG = 'deployed';

/**
 * Every milestone card the cut writes is 480x160, so the preview can size one
 * without waiting to find out how big it is. It lives here rather than in the
 * shell because it is a fact about the files, and a test reads all four of
 * them off disk and holds them to it.
 */
export const CARD_ASPECT = 3;
/** And the ribbon, which is the other shape the preview draws. */
export const RIBBON_ASPECT = 8;

/**
 * The card for a milestone name, or `null` when there is none.
 *
 * A `Map` and not an object: `constructor` and `toString` answer out of
 * `Object.prototype` on a plain object, and a milestone named either of those
 * would come back with a function where a file name should be. That is the
 * bug batch one found in the piece-tile table, and it is not worth finding
 * twice.
 */
export function cardSlugOf(name: string): string | null {
  return CARD_SLUGS.get(name) ?? null;
}
