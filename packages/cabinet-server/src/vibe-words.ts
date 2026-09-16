// The typing cabinet's words about a level: which team, which language, how
// hard it should feel, and which of the typist's weak letter pairs are safe
// to say out loud. Fact-blind by construction — there is nothing here but
// a lookup from a stack to a word.
//
// Its own module because both seats need it and they must not need each
// other: the pull path (`endless.ts`) carries a cloud client and a vendor
// SDK, and the push path (`vibe-host.ts`, and through it the typing
// cabinet's stdio server) must not carry either. Measured: folding these
// four back into `endless.ts` puts the shooter's personas and the vendor
// SDK into the typing cabinet's server bundle.

/** How a seat is told which team it is on. A word, never a version. */
export const STACK_WORDS: Record<string, string> = {
  bash: 'shell',
  python: 'python',
  javascript: 'script',
  csharp: 'sharp',
  java: 'java',
  sql: 'tables',
  integration: 'wires',
};

/** What the code must actually be written in. */
export const LANGUAGE_WORDS: Record<string, string> = {
  bash: 'bash',
  python: 'python',
  javascript: 'javascript',
  csharp: 'C sharp',
  java: 'Java',
  sql: 'SQL',
  integration: 'a JSON remote call envelope naming one tool',
};

/** The band, as a feeling. Nothing on a seat's side ever sees a number. */
export function bandWord(band: number): string {
  if (band <= 2) return 'easy';
  if (band <= 4) return 'warm';
  if (band <= 6) return 'hot';
  return 'hotter';
}

/**
 * A weak pair is two characters out of real code, so it can be a digit or a
 * bracket. The digits are dropped rather than thrown on: they are ordinary
 * here, and the throw in each prompt is for a genuine leak in the words.
 */
export function sayablePairs(weak: readonly string[]): string[] {
  return weak.filter(
    (p) => typeof p === 'string' && /^[^\W\d_]{2}$|^[a-z()[\]{}.,:;+=<>*/-]{2}$/i.test(p),
  );
}
