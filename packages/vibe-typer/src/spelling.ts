// American English on every surface a player or reader sees (the Director's
// decision of 2026-09-15). This module is the word list and nothing else: the
// test scans the levers, the corpus titles and notes, and the shell's own
// source with it, and a later authoring script rejects a drafted line with it.
//
// Each entry matches the British form only. `colour` is a hit and `color` is
// not; `parallelise` is a hit and `parallelism` is not; `analyse` is a hit and
// `analysis` is not. A pattern that cannot separate the two does not belong
// here — a false hit on a real word is worse than a missed spelling, because
// it teaches everyone to skip the test.
//
// The list is not a dialect police for the code the player types. Snippet
// `code` is the typed target, quoted from the corpus, and is out of scope.

export interface BritishWord {
  /** The American form, for the message the test prints. */
  word: string;
  /** Matches the British form only, case-insensitive. */
  re: RegExp;
}

export const BRITISH: readonly BritishWord[] = [
  // -our
  { word: 'color', re: /\bcolour\w*/i },
  { word: 'behavior', re: /\bbehaviour\w*/i },
  { word: 'favorite', re: /\bfavourite\w*/i },
  { word: 'flavor', re: /\bflavour\w*/i },
  { word: 'honor', re: /\bhonour\w*/i },
  { word: 'humor', re: /\bhumour\w*/i },
  { word: 'labor', re: /\blabour\w*/i },
  { word: 'armor', re: /\barmour\w*/i },
  { word: 'neighborhood', re: /\bneighbour\w*/i },
  // -ise / -isation
  { word: 'organize', re: /\borganis(e|es|ed|ing|ation|ations)\b/i },
  { word: 'apologize', re: /\bapologis(e|es|ed|ing)\b/i },
  { word: 'realize', re: /\brealis(e|es|ed|ing|ation)\b/i },
  { word: 'optimize', re: /\boptimis(e|es|ed|ing|ation|ations)\b/i },
  { word: 'customize', re: /\bcustomis(e|es|ed|ing|ation)\b/i },
  { word: 'summarize', re: /\bsummaris(e|es|ed|ing)\b/i },
  { word: 'parallelize', re: /\bparallelis(e|es|ed|ing|ation)\b/i },
  { word: 'normalize', re: /\bnormalis(e|es|ed|ing|ation)\b/i },
  { word: 'initialize', re: /\binitialis(e|es|ed|ing|ation)\b/i },
  { word: 'serialize', re: /\bserialis(e|es|ed|ing|ation)\b/i },
  { word: 'visualize', re: /\bvisualis(e|es|ed|ing|ation)\b/i },
  { word: 'recognize', re: /\brecognis(e|es|ed|ing|able)\b/i },
  { word: 'authorize', re: /\bauthoris(e|es|ed|ing|ation)\b/i },
  { word: 'contextualize', re: /\bcontextualis(e|es|ed|ing|ation)\b/i },
  { word: 'analyze', re: /\banalys(e|ed|ing)\b/i },
  // -re
  { word: 'center', re: /\bcentres?\b|\bcentred\b/i },
  { word: 'theater', re: /\btheatres?\b/i },
  { word: 'meter', re: /\bmetres?\b/i },
  // -ce / -se
  { word: 'license', re: /\blicences?\b/i },
  { word: 'defense', re: /\bdefences?\b/i },
  { word: 'offense', re: /\boffences?\b/i },
  { word: 'practice', re: /\bpractis(e|es|ed|ing)\b/i },
  // doubled consonants
  { word: 'canceled', re: /\bcancell(ed|ing)\b/i },
  { word: 'traveling', re: /\btravell(ed|ing|er|ers)\b/i },
  { word: 'modeling', re: /\bmodell(ed|ing)\b/i },
  { word: 'marvelous', re: /\bmarvellous\b/i },
  { word: 'jewelry', re: /\bjeweller(y|ies)\b/i },
  { word: 'fulfill', re: /\bfulfil\b|\bfulfils\b/i },
  { word: 'enroll', re: /\benrol\b|\benrols\b/i },
  // the rest
  { word: 'program', re: /\bprogrammes?\b/i },
  { word: 'catalog', re: /\bcatalogues?\b/i },
  { word: 'gray', re: /\bgrey(s|ish)?\b/i },
  { word: 'while', re: /\bwhilst\b/i },
  { word: 'among', re: /\bamongst\b/i },
  { word: 'tire', re: /\btyres?\b/i },
  { word: 'curb', re: /\bkerbs?\b/i },
  { word: 'aluminum', re: /\baluminium\b/i },
  { word: 'mold', re: /\bmoulds?\b|\bmoulded\b/i },
  { word: 'plow', re: /\bploughs?\b|\bploughed\b/i },
  { word: 'skeptic', re: /\bsceptics?\b|\bsceptical\b/i },
  { word: 'check', re: /\bcheques?\b/i },
];

/**
 * The first British spelling in `text`, as it was written, or null. The
 * message the caller prints is `<hit> (write <word>)`.
 */
export function britishHit(text: string): string | null {
  for (const entry of BRITISH) {
    const found = entry.re.exec(text);
    if (found) return `${found[0]} (write ${entry.word})`;
  }
  return null;
}
