// The code gate (G28 as the slice-3 kickoff amends it). In endless a seated
// model writes the request the player types: the ask, the code, the title,
// the notes, and the product when the level is new. This is the mechanical
// gate that stands between that answer and the field.
//
// It accepts or it refuses. It never fixes a snippet, never trims a note,
// never rewrites a line. A refusal is silent on the field: the caller
// re-asks once and then falls back to the authored pool and the corpus
// (G11, G13 — the sim never waits).
//
// The chat gate is the existing one: `lineFault` from patterns.ts, the same
// scan every authored line passes. This module adds only what a line gate
// cannot know: that the text is code, in the right language, worth roughly
// what a corpus snippet of that band is worth (G24).
//
// Pure. No node:, no clock, no state: the same candidate and the same
// context always give the same verdict.

import { askIsBound, type Corpus } from './corpus';
import { value as valueOf } from './difficulty';
import { lineFault, MODEL_FORBIDDEN, type DifficultySet } from './patterns';
import { hashString } from './seed';
import { britishHit } from './spelling';
import type { Band, Snippet, Stack } from './types';

// The bounds the Director owns. // Director
/** Non-empty code lines a seated request may carry. */
export const MAX_LINES = 12;
/** Columns a code line may reach. */
export const MAX_COLS = 80;
/** Teaching notes a request may carry. */
export const MAX_NOTES = 3;
/** Words the product may run to. */
export const MAX_PRODUCT_WORDS = 8;
/**
 * How far outside the band's own corpus range a seated snippet's value may
 * sit. The band is the game's ground (G24): a request worth twice what the
 * band pays would break the climb, and one worth a tenth would be a gift.
 */
export const VALUE_TOLERANCE = 0.15;
/**
 * The widest tolerance a caller may hand `gateCode`. The field is above: a
 * tolerance of one or more makes the low edge zero or negative, so nothing
 * can ever be refused as under-band, and a negative one inverts the window
 * and refuses almost everything. Either is a caller bug rather than a wider
 * gate, and this module is the one thing standing between a model's answer
 * and the field, so it says so instead of quietly widening.
 */
export const MAX_TOLERANCE = 0.5;

/** What a seat sends back for one request. Nothing here has been gated yet. */
export interface SeatRequest {
  /** A new product, when the seat was told the level is new. */
  product?: string;
  ask: string;
  code: string;
  title: string;
  notes: string[];
}

/** Why a candidate cannot play. One reason, the first one found. */
export type CodeGateReason =
  | 'empty'
  | 'not-ascii'
  | 'tab'
  | 'too-many-lines'
  | 'too-wide'
  | 'unbalanced'
  | 'wrong-language'
  | 'barred-word'
  | 'names-a-model'
  | 'value-out-of-band'
  | 'bad-ask'
  | 'bad-title'
  | 'bad-notes'
  | 'bad-product';

export interface CodeGateCtx {
  stack: Stack;
  bandMin: Band;
  bandMax: Band;
  corpus: Corpus;
  set: DifficultySet;
  tolerance: number;
  /** The id the accepted snippet carries. Derived from the code when absent. */
  id?: string;
}

export type CodeGateResult =
  | { ok: true; snippet: Snippet; product?: string }
  | { ok: false; reason: CodeGateReason; detail?: string };

/**
 * The barred words, without the digit branch. VOICE_FORBIDDEN refuses any
 * digit, which is right for a chat line and wrong for code: an index, a
 * port and a column number are all digits and all ordinary. The words
 * themselves still cannot appear anywhere in a seated snippet, comments
 * included, and the inflections FORM_FORBIDDEN added go with them — a seat
 * that may not write `score` may not write `scores` either. Kept in step
 * with both lists in patterns.ts by a test.
 */
export const BARRED_IN_CODE =
  /\b(lie|lies|lied|fact|facts|revealed|followed|held|score|scores|scored|scoring|pass|passes|passed|fail|fails|failed|failing|nrp|integrity|utility|cleared|ghost|ghosts)\b/i;

/**
 * Anything that is not plain, printable ASCII or a newline. The tab and the
 * carriage return are left out on purpose: they are refused one check later
 * under their own reason, because `tab` is the more useful thing to say
 * about them than `not-ascii`.
 */
const NOT_ASCII = /[^\x20-\x7e\n\t\r]/;

/**
 * What a line of each language must and must not look like. A cheap table,
 * not a parser: it catches a model that answered in the wrong language,
 * which is the failure that actually happens, and lets through anything
 * that reads like the right one.
 *
 * `needs` is every-of, `must` is any-of, `mustNot` is none-of. Two neighbors
 * overlap on purpose - `public class Thing {` is both Java and C sharp - so
 * each names the other's give-away in `mustNot` and the ordinary cases
 * separate. Measured against the shipped corpus: every snippet of a stack
 * matches its own row, and the rows that could confuse two stacks were the
 * bare declarations (`bool active = true;`), which is why the keyword lists
 * carry the primitive type names too.
 */
export interface LanguageHint {
  /** Every one of these must match. */
  needs?: RegExp[];
  /** At least one of these must match. */
  must: RegExp[];
  /** None of these may match. */
  mustNot: RegExp[];
}

export const LANGUAGE_HINTS: Record<Stack, LanguageHint> = {
  bash: {
    must: [
      /(^|\n)\s*(echo|export|read|cd|mkdir|cat|grep|sed|awk|for|while|case|if \[|source|local)\b/,
      /\$\{?\w/,
      /\|/,
      /(^|\n)#!\//,
    ],
    mustNot: [/\bconsole\.log\b/, /\bSystem\.out\b/, /(^|\n)\s*def \w+\(/],
  },
  csharp: {
    needs: [/;/],
    must: [
      /\b(var|using|namespace|public|private|protected|static|class|new|string|int|bool|double|float|long|decimal|char|object|void|Console)\b/,
    ],
    mustNot: [/\bSystem\.out\b/, /(^|\n)\s*def \w+\(/, /\bconsole\.log\b/, /(^|\n)\s*echo /],
  },
  java: {
    needs: [/;/],
    must: [
      /\b(var|public|private|protected|static|final|class|void|String|int|boolean|double|float|long|char|new|System|import java)\b/,
    ],
    mustNot: [
      /\bConsole\.(Write|WriteLine)\b/,
      /(^|\n)\s*def \w+\(/,
      /\bconsole\.log\b/,
      /(^|\n)\s*echo /,
    ],
  },
  javascript: {
    must: [
      /\b(const|let|var|function|return|import|export|class|await|async|new)\b/,
      /=>/,
      /\bconsole\./,
    ],
    mustNot: [/(^|\n)\s*(def |elif |print\()/, /\bSystem\.out\b/, /(^|\n)\s*(SELECT|INSERT) /i],
  },
  python: {
    must: [
      /(^|\n)\s*(def |class |import |from |for |if |while |with |try|except|return |print\(|@)/,
      /(^|\n)\s*\w+\s*=/,
    ],
    mustNot: [/;\s*$/m, /\)\s*\{\s*$/m, /\bconsole\.log\b/, /\bSystem\.out\b/],
  },
  sql: {
    must: [
      /\b(select|create|insert|update|delete|from|where|join|alter|drop|with|group by|order by)\b/i,
    ],
    mustNot: [/(^|\n)\s*(def |function |const |echo )/, /\bconsole\.log\b/],
  },
  // The integration stack is a tool name or a JSON-RPC envelope around one
  // (G30): the corpus builds exactly those three shapes, so the seat is
  // held to them too.
  integration: {
    must: [/tools\/call/, /"method"\s*:/, /^\s*\{/m, /^[a-z][a-z0-9_.]{1,40}$/im],
    mustNot: [/(^|\n)\s*(def |function |const |echo |SELECT )/i],
  },
};

/** Where a comment starts, per language. Everything after it is not scanned. */
const COMMENT_MARKS: Record<Stack, readonly string[]> = {
  bash: ['#'],
  csharp: ['//'],
  java: ['//'],
  javascript: ['//'],
  python: ['#'],
  sql: ['--'],
  integration: [],
};

const OPENERS: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

/**
 * Brackets balance over the whole snippet; quotes balance inside one line.
 * A backslash escapes the next character inside a string, and a comment
 * ends the scan for its line, so an apostrophe in a comment is not a quote.
 * Cheap on purpose: a shape it cannot read is refused, never guessed at.
 */
export function balanced(code: string, stack: Stack): boolean {
  const marks = COMMENT_MARKS[stack];
  const open: string[] = [];
  for (const line of code.split('\n')) {
    let quote = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (quote !== '') {
        if (ch === '\\') {
          i += 1;
          continue;
        }
        if (ch === quote) quote = '';
        continue;
      }
      if (marks.some((m) => line.startsWith(m, i))) break;
      if (ch === '"' || ch === "'" || ch === '`') {
        quote = ch;
        continue;
      }
      if (ch === '(' || ch === '[' || ch === '{') open.push(ch);
      else if (ch === ')' || ch === ']' || ch === '}') {
        if (open.pop() !== OPENERS[ch]) return false;
      }
    }
    if (quote !== '') return false;
  }
  return open.length === 0;
}

export interface BandRange {
  min: number;
  max: number;
}

const rangeCache = new WeakMap<Corpus, Map<string, BandRange | null>>();

/**
 * What a request of this band is worth in this stack, by the same formula
 * the score pays on (G24): the least and the most any corpus snippet of
 * that stack inside the range is worth. Null when the corpus has nothing
 * there, and a null range refuses every candidate rather than guessing a
 * ceiling.
 *
 * Scoped to the stack because the stacks are not comparable: a Java method
 * and a shell line of the same band differ by more than the tolerance, so
 * a corpus-wide range would be too wide to gate anything.
 */
export function bandRange(
  corpus: Corpus,
  set: DifficultySet,
  stack: Stack,
  bandMin: Band,
  bandMax: Band,
): BandRange | null {
  let byKey = rangeCache.get(corpus);
  if (!byKey) {
    byKey = new Map();
    rangeCache.set(corpus, byKey);
  }
  const key = `${stack}:${bandMin}:${bandMax}`;
  const hit = byKey.get(key);
  if (hit !== undefined) return hit;
  let min = Infinity;
  let max = -Infinity;
  for (const snippet of corpus.byStack[stack] ?? []) {
    if (snippet.band < bandMin || snippet.band > bandMax) continue;
    const v = valueOf(snippet, corpus.model, set);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max >= min ? { min, max } : null;
  byKey.set(key, range);
  return range;
}

function refuse(reason: CodeGateReason, detail?: string): CodeGateResult {
  return detail === undefined ? { ok: false, reason } : { ok: false, reason, detail };
}

/** Trailing whitespace off every line, trailing blank lines off the block. */
function tidy(code: string): string {
  return code
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n+$/, '')
    .replace(/^\n+/, '');
}

function words(line: string): number {
  return line.trim().split(/\s+/).length;
}

/**
 * The chat is typed and read in plain ASCII, so a line is too. Measured on a
 * live seat: a note came back with a non-breaking hyphen in it, which
 * `lineFault` has no opinion about and the editor cannot render.
 */
const TEXT_NOT_ASCII = /[^\x20-\x7e]/;

/**
 * The chat gate plus the spelling rule. A seated model writes in whatever
 * English it was raised on; the field is American (sub-slice A), and the
 * levers are tested for it, so the seat's lines are held to the same word
 * list here (the review's third change). The reason is the spelling hit.
 */
function textFault(line: string): string | null {
  const fault = lineFault(line);
  if (fault !== null) return fault;
  const british = britishHit(line);
  return british === null ? null : `spelling: ${british}`;
}

/**
 * Why this product name cannot be the next level's, or null. The same three
 * checks in the same order the gate's last step applies, lifted out so the
 * container's `product` tool (slice 4) runs the one implementation rather
 * than a second copy that could drift from it.
 *
 * The reason is safe to say out loud: it is a rule, never the offending
 * text, and it never carries a digit. A spelling hit names the word it
 * found, so a caller that shows a reason to a model maps that one.
 */
export function productFault(product: string): string | null {
  if (TEXT_NOT_ASCII.test(product)) return 'not ascii';
  const fault = textFault(product);
  if (fault !== null) return fault;
  if (words(product) > MAX_PRODUCT_WORDS) return 'too many words';
  return null;
}

function shapeOf(candidate: unknown): SeatRequest | null {
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) return null;
  const o = candidate as Record<string, unknown>;
  if (typeof o.ask !== 'string' || typeof o.code !== 'string' || typeof o.title !== 'string') {
    return null;
  }
  if (!Array.isArray(o.notes) || o.notes.some((n) => typeof n !== 'string')) return null;
  if (o.product !== undefined && typeof o.product !== 'string') return null;
  const out: SeatRequest = {
    ask: o.ask,
    code: o.code,
    title: o.title,
    notes: o.notes as string[],
  };
  if (typeof o.product === 'string' && o.product.trim() !== '') out.product = o.product;
  return out;
}

/**
 * Gate one seated request. The order is fixed and the first failure wins,
 * so a refusal reason is always the cheapest true thing to say about the
 * candidate: shape, then the characters, then the shape of the code, then
 * the language, then the words, then the value, then the chat lines.
 */
export function gateCode(candidate: unknown, ctx: CodeGateCtx): CodeGateResult {
  if (
    typeof ctx.tolerance !== 'number' ||
    !Number.isFinite(ctx.tolerance) ||
    ctx.tolerance < 0 ||
    ctx.tolerance > MAX_TOLERANCE
  ) {
    throw new Error('gateCode: tolerance is outside the band the gate may widen to');
  }
  const seat = shapeOf(candidate);
  if (!seat) return refuse('empty', 'shape');
  const code = tidy(seat.code);
  if (code.trim() === '') return refuse('empty', 'code');
  if (NOT_ASCII.test(code)) return refuse('not-ascii');
  if (code.includes('\t') || code.includes('\r')) return refuse('tab');
  const lines = code.split('\n');
  const live = lines.filter((line) => line.trim() !== '');
  // The bound goes beside the measurement. A seat, or the operator reading a
  // container refusal, cannot correct the next attempt from a number with no
  // limit next to it — and this gate is the one mechanical thing standing
  // between a model's answer and the field, so its one surface may as well
  // say what it wants.
  if (live.length > MAX_LINES) return refuse('too-many-lines', `${live.length} of ${MAX_LINES}`);
  for (const line of lines) {
    if (line.length > MAX_COLS) return refuse('too-wide', `${line.length} of ${MAX_COLS}`);
  }
  if (!balanced(code, ctx.stack)) return refuse('unbalanced');
  const hints = LANGUAGE_HINTS[ctx.stack];
  if ((hints.needs ?? []).some((re) => !re.test(code))) {
    return refuse('wrong-language', 'missing what the language always has');
  }
  if (!hints.must.some((re) => re.test(code))) {
    return refuse('wrong-language', `nothing reads like ${ctx.stack}`);
  }
  if (hints.mustNot.some((re) => re.test(code)))
    return refuse('wrong-language', 'another language');
  if (BARRED_IN_CODE.test(code)) return refuse('barred-word');
  if (MODEL_FORBIDDEN.test(code)) return refuse('names-a-model');

  const snippet: Snippet = {
    id: ctx.id ?? `seat-${hashString(code).toString(36)}`,
    stack: ctx.stack,
    band: ctx.bandMin,
    title: seat.title,
    code,
    notes: seat.notes,
    topics: [],
    ask: seat.ask,
  };
  const range = bandRange(ctx.corpus, ctx.set, ctx.stack, ctx.bandMin, ctx.bandMax);
  if (!range) return refuse('value-out-of-band', 'no band in the corpus');
  const v = valueOf(snippet, ctx.corpus.model, ctx.set);
  // Every comparison with NaN is false, so a value that is not a number would
  // sail through the range test (the review's second change).
  if (!Number.isFinite(v)) return refuse('value-out-of-band', 'not a number');
  const low = range.min * (1 - ctx.tolerance);
  const high = range.max * (1 + ctx.tolerance);
  if (v < low || v > high) {
    return refuse(
      'value-out-of-band',
      v < low ? "worth less than the band's floor" : "worth more than the band's ceiling",
    );
  }

  // The chat gate, the existing one. `{product}` is the one hole the ask
  // may keep, because the level fills it; `{title}` cannot, because a
  // seated snippet's title is the seat's own and the ask already knows it.
  const askText = seat.ask.split('{product}').join('the product');
  if (seat.ask.includes('{title}')) return refuse('bad-ask', 'title hole');
  // Measured on a live seat: a model told it may use a placeholder in braces
  // writes the product itself in braces instead, and the braces then land on
  // the field because nothing fills them. Only the exact hole is a hole.
  if (/[{}]/.test(askText)) return refuse('bad-ask', 'stray brace');
  // The other door into the same field. `loadStack` refuses an authored ask
  // that names a story level's noun without saying which level it is for,
  // and `askFor` drops a bound ask outside its level — but a seated snippet
  // carries no `for` (it is written for the level in hand and minted below
  // without one), so a seat could put "reverse the line of waiting ducks"
  // into an app for lost socks: the defect the corpus closed, on the path
  // nobody proofreads. A seat writes for the level in hand, so the answer
  // here is to refuse rather than to bind.
  if (askIsBound(askText)) return refuse('bad-ask', 'story noun');
  // `lineFault` refuses a non-ASCII line too, since sub-slice B part two;
  // these run first only so the reason is the specific one rather than
  // whichever word rule the line also happens to break.
  if (TEXT_NOT_ASCII.test(seat.ask)) return refuse('bad-ask', 'not ascii');
  const askFault = textFault(askText);
  if (askFault !== null) return refuse('bad-ask', askFault);
  if (TEXT_NOT_ASCII.test(seat.title)) return refuse('bad-title', 'not ascii');
  const titleFault = textFault(seat.title);
  if (titleFault !== null) return refuse('bad-title', titleFault);
  if (seat.notes.length > MAX_NOTES) return refuse('bad-notes', 'too many');
  for (const note of seat.notes) {
    if (TEXT_NOT_ASCII.test(note)) return refuse('bad-notes', 'not ascii');
    const fault = textFault(note);
    if (fault !== null) return refuse('bad-notes', fault);
  }
  if (seat.product !== undefined) {
    const fault = productFault(seat.product);
    if (fault !== null) return refuse('bad-product', fault);
    return { ok: true, snippet, product: seat.product };
  }
  return { ok: true, snippet };
}

/**
 * One American-English sentence for a refusal, with the bound named.
 *
 * The reason is a machine word and the detail is a measurement, which is
 * right for a log and useless to the seat, the sit runner or the operator
 * reading a container refusal — each of whom was inventing its own phrasing
 * for the same verdict. This is the one rendering, so every surface says the
 * same thing. Digits are allowed here: a gate reason is not the screen.
 *
 * An accepted candidate has nothing to say, and says so.
 */
export function reasonText(result: CodeGateResult): string {
  if (result.ok) return 'the request is good';
  const detail = result.detail === undefined ? '' : ` (${result.detail})`;
  switch (result.reason) {
    case 'empty':
      return 'there is no code in it';
    case 'not-ascii':
      return 'the code has a character the field cannot show; plain ascii only';
    case 'tab':
      return 'the code has a tab or a carriage return in it; spaces and newlines only';
    case 'too-many-lines':
      return `the code runs to more than ${MAX_LINES} lines${detail}`;
    case 'too-wide':
      return `a line is wider than ${MAX_COLS} columns${detail}`;
    case 'unbalanced':
      return 'a bracket or a quote in the code is never closed';
    case 'wrong-language':
      return `the code does not read like the language this level is in${detail}`;
    case 'barred-word':
      return 'the code uses a word the cabinet never says';
    case 'names-a-model':
      return 'the code names a model by name';
    case 'value-out-of-band':
      return `the request is outside the band, which the gate may widen by ${VALUE_TOLERANCE} at most${detail}`;
    case 'bad-ask':
      return `the ask cannot be said on the field${detail}`;
    case 'bad-title':
      return `the title cannot be said on the field${detail}`;
    case 'bad-notes':
      return `a note cannot be said on the field, and there may be ${MAX_NOTES} at most${detail}`;
    case 'bad-product':
      return `the product cannot be said on the field, and it may run to ${MAX_PRODUCT_WORDS} words at most${detail}`;
  }
}
