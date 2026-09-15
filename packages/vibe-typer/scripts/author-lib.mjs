// The pure parts of `scripts/author.mjs`: parsing what a writing model
// returned, gating it, hashing the prompt that asked for it, and picking the
// sample's snippets. Nothing here touches the network, the disk or the clock,
// so `test/author.test.ts` can hold all of it still.
//
// Offline authoring only. Nothing in this file is imported by the game and
// nothing in it runs at play time.

import { createHash } from 'node:crypto';

/**
 * British spellings, as word-boundary patterns that do not catch the American
 * words that share a stem (`optimistic`, `parallelism`, `analysis`, `color`).
 *
 * A sibling sub-slice adds `britishHit()` to `packages/vibe-typer/src/spelling.ts`
 * for the spelling test; that branch is not this one, so the list lives here for
 * now. When both land, this copy is deleted and the module is imported instead.
 */
export const BRITISH_PATTERNS = [
  /\bcolours?\b/i,
  /\bfavourites?\b/i,
  /\borganis(?:e|es|ed|ing|ation|ations)\b/i,
  /\bapologis(?:e|es|ed|ing)\b/i,
  /\bprogrammes?\b/i,
  /\bneighbourhoods?\b/i,
  /\brealis(?:e|es|ed|ing)\b/i,
  /\boptimis(?:e|es|ed|ing|ation|ations)\b/i,
  /\bcustomis(?:e|es|ed|ing|ation|ations)\b/i,
  /\bsummaris(?:e|es|ed|ing)\b/i,
  /\bparallelis(?:e|es|ed|ing)\b/i,
  /\bnormalis(?:e|es|ed|ing|ation)\b/i,
  /\bcentres?\b/i,
  /\blicences?\b/i,
  /\bbehaviours?\b/i,
  /\bhonours?\b/i,
  /\bhumours?\b/i,
  /\bflavours?\b/i,
  /\bcatalogues?\b/i,
  /\bgrey\b/i,
  /\btravelling\b/i,
  /\bmodelling\b/i,
  /\bcancelled\b/i,
  /\binitialis(?:e|es|ed|ing|ation)\b/i,
  /\bserialis(?:e|es|ed|ing|ation)\b/i,
  /\bvisualis(?:e|es|ed|ing|ation)\b/i,
  /\brecognis(?:e|es|ed|ing)\b/i,
  /\bauthoris(?:e|es|ed|ing|ation)\b/i,
  /\bwhilst\b/i,
  /\bamongst\b/i,
  /\bmarvellous\b/i,
  /\banalys(?:e|es|ed|ing)\b/i,
  /\btheatres?\b/i,
  /\bmetres?\b/i,
  /\blabour\b/i,
  /\barmour\b/i,
  /\bdefence\b/i,
  /\boffence\b/i,
  /\bpractis(?:e|es|ed|ing)\b/i,
  /\bjewellery\b/i,
];

/** The British spelling this line carries, lower case, or null. */
export function britishHit(line) {
  if (typeof line !== 'string') return null;
  for (const re of BRITISH_PATTERNS) {
    const m = re.exec(line);
    if (m) return m[0].toLowerCase();
  }
  return null;
}

/**
 * Real companies and products a level's own product string may name. The
 * prompt never carries one (a request to a writing model stays brand-free), so
 * a product that hits this is replaced from a table or the run halts.
 */
export const BRAND_NAMES =
  /\b(uber|lyft|airbnb|tinder|netflix|spotify|slack|twitter|facebook|instagram|tiktok|amazon|google|apple|microsoft|linkedin|youtube|reddit|shopify|stripe|pinterest|snapchat|whatsapp)\b/i;

/**
 * The phrase for a product that may go into a prompt. A product naming a real
 * company is swapped for the brand-free phrase in `table`; one with no entry
 * returns null so the caller can halt rather than send a brand name.
 */
export function productPhrase(product, table = {}) {
  if (typeof product !== 'string' || product.trim() === '') return null;
  if (!BRAND_NAMES.test(product)) return product;
  const swap = table[product];
  if (typeof swap === 'string' && swap !== '' && !BRAND_NAMES.test(swap)) return swap;
  return null;
}

/** sha256 of the exact prompt text, system then a blank line then user. */
export function promptHash(system, user) {
  return createHash('sha256')
    .update(String(system), 'utf8')
    .update('\n\n', 'utf8')
    .update(String(user), 'utf8')
    .digest('hex');
}

/** Strip one wrapping code fence, if the model wrote one. */
export function stripFences(text) {
  const s = String(text ?? '');
  const fenced = /^\s*```[a-zA-Z]*\s*\n([\s\S]*?)\n?\s*```\s*$/.exec(s);
  if (fenced) return fenced[1];
  return s.replace(/```[a-zA-Z]*\s*\n?/g, '').replace(/```/g, '');
}

/**
 * The first balanced JSON value in `text`, ignoring a code fence and any prose
 * around it. Throws `Error` with a one-line reason when nothing parses.
 */
export function parseCandidates(text) {
  const body = stripFences(text);
  const start = firstBracket(body);
  if (start === -1) throw new Error('no JSON array or object in the answer');
  const end = matchBracket(body, start);
  const slice = end === -1 ? body.slice(start) : body.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    // A trailing comma is the usual sin; one repair pass, then give up.
    try {
      return JSON.parse(slice.replace(/,\s*([\]}])/g, '$1'));
    } catch {
      throw new Error('the JSON in the answer does not parse');
    }
  }
}

function firstBracket(s) {
  for (let i = 0; i < s.length; i += 1) {
    if (s[i] === '[' || s[i] === '{') return i;
  }
  return -1;
}

/** The index of the bracket closing the one at `start`, or -1. */
function matchBracket(s, start) {
  const open = s[start];
  const close = open === '[' ? ']' : '}';
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < s.length; i += 1) {
    const c = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === open) depth += 1;
    else if (c === close) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Shape whatever the model returned into one candidate list per key. Accepts
 * an object keyed by id, an array of arrays in order, a flat array of
 * `keys.length * per` strings, and a flat array of `keys.length` strings.
 * A key with nothing for it gets an empty list; the caller counts that.
 */
export function groupCandidates(parsed, keys, per) {
  const out = new Map();
  for (const k of keys) out.set(k, []);
  if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') {
    for (const k of keys) {
      const v = parsed[k];
      if (Array.isArray(v)) out.set(k, v.filter(isLine));
      else if (isLine(v)) out.set(k, [v]);
    }
    return out;
  }
  if (!Array.isArray(parsed)) return out;
  if (parsed.every((x) => Array.isArray(x))) {
    keys.forEach((k, i) => out.set(k, (parsed[i] ?? []).filter(isLine)));
    return out;
  }
  const flat = parsed.filter(isLine);
  if (flat.length === keys.length * per) {
    keys.forEach((k, i) => out.set(k, flat.slice(i * per, i * per + per)));
    return out;
  }
  if (flat.length >= keys.length) {
    keys.forEach((k, i) => out.set(k, [flat[i]]));
    return out;
  }
  keys.forEach((k, i) => out.set(k, i < flat.length ? [flat[i]] : []));
  return out;
}

function isLine(x) {
  return typeof x === 'string' && x.trim() !== '';
}

/**
 * Compose the package's own `lineFault` with the British check and an optional
 * tighter word cap into one gate. It returns a reason or null; it never edits.
 */
export function makeGate(lineFault, opts = {}) {
  const maxWords = opts.maxWords ?? 0;
  return (line) => {
    const fault = lineFault(line);
    if (fault !== null) return fault;
    const british = britishHit(line);
    if (british !== null) return `british:${british}`;
    if (maxWords > 0 && line.split(/\s+/).length > maxWords) return 'too many words';
    return null;
  };
}

/**
 * Keep the first candidate the gate lets through; count why the others fell.
 *
 * Whitespace around a candidate is stripped before gating and nothing else is
 * touched: the padding is the model's serializer, not its writing, and the
 * gate's `padded` reason would otherwise measure the wrong thing. `trimmed`
 * says how often that happened so the receipt does not hide it.
 */
export function keepFirstPassing(candidates, gate) {
  const dropped = {};
  const alternates = [];
  let kept = null;
  let trimmed = 0;
  for (const raw of candidates ?? []) {
    if (typeof raw !== 'string') {
      dropped['not a string'] = (dropped['not a string'] ?? 0) + 1;
      continue;
    }
    const line = raw.trim();
    if (line !== raw) trimmed += 1;
    const reason = line === '' ? 'empty' : gate(line);
    if (reason !== null) {
      dropped[reason] = (dropped[reason] ?? 0) + 1;
      continue;
    }
    if (kept === null) kept = line;
    else alternates.push(line);
  }
  return { kept, dropped, alternates, trimmed };
}

/** Add one drop tally into another, in place. */
export function mergeDropped(into, add) {
  for (const [reason, n] of Object.entries(add ?? {})) {
    into[reason] = (into[reason] ?? 0) + n;
  }
  return into;
}

/**
 * The sample's snippets, picked with no randomness so the same call always
 * asks about the same code: every snippet of `stack` at or under `bandMax`,
 * sorted by id, the first `n`.
 */
export function sampleSnippets(corpus, stack, bandMax, n) {
  const all = Array.isArray(corpus) ? corpus : [];
  return all
    .filter((s) => s && s.stack === stack && typeof s.band === 'number' && s.band <= bandMax)
    .slice()
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, n);
}

/** Every topic word the corpus uses, sorted, so the reaction slot has its keys. */
export function corpusTopics(snippets) {
  const seen = new Set();
  for (const s of snippets ?? []) {
    for (const t of s?.topics ?? []) if (typeof t === 'string' && t !== '') seen.add(t);
  }
  return [...seen].sort();
}

/** Cut a list into chunks of at most `size`, so one prompt stays readable. */
export function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
