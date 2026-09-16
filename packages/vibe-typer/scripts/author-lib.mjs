// The pure parts of `scripts/author.mjs`: parsing what a writing model
// returned, gating it, hashing the prompt that asked for it, and picking the
// sample's snippets. Nothing here touches the network, the disk or the clock,
// so `test/author.test.ts` can hold all of it still.
//
// Offline authoring only. Nothing in this file is imported by the game and
// nothing in it runs at play time.
//
// The spelling check is NOT here. `britishHit` lives in
// `packages/vibe-typer/src/spelling.ts` and reaches this file the same way
// `lineFault` does: `author.mjs` bundles the package's barrel with esbuild and
// hands both to `makeGate`. This file is plain ESM so that `node` can run the
// script with no loader, which is exactly why it cannot import the TypeScript
// module itself; injection is what keeps the one list in one place.

import { createHash } from 'node:crypto';

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

/** sha256 of one piece of text, for pinning a voice sheet in a receipt. */
export function textHash(text) {
  return createHash('sha256').update(String(text), 'utf8').digest('hex');
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
 * The candidates in `text`, ignoring a code fence and any prose around it.
 *
 * A preamble can carry a bracket of its own ("Here are the lines [one per
 * piece]:"), so the first bracket is not necessarily the answer. Every bracket
 * is tried in turn and the first balanced span that parses and holds at least
 * one string wins; a value that parses but holds no string at all is the
 * fallback. Throws `Error` with a one-line reason when nothing parses.
 */
export function parseCandidates(text) {
  const body = stripFences(text);
  let sawBracket = false;
  let stringless = null;
  for (let i = 0; i < body.length; i += 1) {
    if (body[i] !== '[' && body[i] !== '{') continue;
    sawBracket = true;
    const end = matchBracket(body, i);
    const slice = end === -1 ? body.slice(i) : body.slice(i, end + 1);
    const value = tryParse(slice);
    if (value === undefined) continue;
    if (holdsString(value)) return value;
    if (stringless === null) stringless = { value };
  }
  if (stringless !== null) return stringless.value;
  if (!sawBracket) throw new Error('no JSON array or object in the answer');
  throw new Error('the JSON in the answer does not parse');
}

/** The value, or `undefined` when the slice is not JSON even after one repair. */
function tryParse(slice) {
  try {
    return JSON.parse(slice);
  } catch {
    // A trailing comma is the usual sin; one repair pass, then give up.
    try {
      return JSON.parse(slice.replace(/,\s*([\]}])/g, '$1'));
    } catch {
      return undefined;
    }
  }
}

/** Whether a parsed value carries any string at all; a bare `[one, two]` does not. */
function holdsString(value) {
  if (typeof value === 'string') return true;
  if (Array.isArray(value)) return value.some(holdsString);
  if (value && typeof value === 'object') return Object.values(value).some(holdsString);
  return false;
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
 *
 * Returns `{ groups, dropped }`. A key with nothing for it gets an empty list
 * and the caller counts that. A line the shaping cannot place — a key nobody
 * asked about, a row past the last key, the remainder of a flat array that is
 * longer than the keys but is not `keys.length * per` — is counted under
 * `surplus` and never vanishes: a silent discard is a line the Director paid
 * for and never saw.
 */
export function groupCandidates(parsed, keys, per) {
  const groups = new Map();
  const dropped = {};
  let surplus = 0;
  for (const k of keys) groups.set(k, []);
  const done = () => {
    if (surplus > 0) dropped.surplus = surplus;
    return { groups, dropped };
  };

  if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') {
    const wanted = new Set(keys);
    for (const k of keys) {
      const v = parsed[k];
      if (Array.isArray(v)) groups.set(k, v.filter(isLine));
      else if (isLine(v)) groups.set(k, [v]);
    }
    for (const [k, v] of Object.entries(parsed)) {
      if (wanted.has(k)) continue;
      surplus += Array.isArray(v) ? v.filter(isLine).length : isLine(v) ? 1 : 0;
    }
    return done();
  }
  if (!Array.isArray(parsed)) return done();

  if (parsed.every((x) => Array.isArray(x))) {
    keys.forEach((k, i) => groups.set(k, (parsed[i] ?? []).filter(isLine)));
    for (const row of parsed.slice(keys.length)) surplus += row.filter(isLine).length;
    return done();
  }

  const flat = parsed.filter(isLine);
  if (flat.length === keys.length * per) {
    keys.forEach((k, i) => groups.set(k, flat.slice(i * per, i * per + per)));
    return done();
  }
  if (flat.length >= keys.length) {
    keys.forEach((k, i) => groups.set(k, [flat[i]]));
    surplus += flat.length - keys.length;
    return done();
  }
  keys.forEach((k, i) => groups.set(k, i < flat.length ? [flat[i]] : []));
  return done();
}

function isLine(x) {
  return typeof x === 'string' && x.trim() !== '';
}

/**
 * Compose the package's own `lineFault` and its own `britishHit` with an
 * optional tighter word cap into one gate. Both come from the bundled package
 * module, so the authoring gate cannot drift from the game's. It returns a
 * reason or null; it never edits.
 */
export function makeGate(lineFault, britishHit, opts = {}) {
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
 * The candidate is gated exactly as it was written. A padded line is a drop
 * with the gate's own `padded` reason, like any other: stripping the
 * whitespace first would be the script editing a line into passing, which it
 * is forbidden to do.
 */
export function keepFirstPassing(candidates, gate) {
  const dropped = {};
  const alternates = [];
  let kept = null;
  for (const line of candidates ?? []) {
    if (typeof line !== 'string') {
      dropped['not a string'] = (dropped['not a string'] ?? 0) + 1;
      continue;
    }
    const reason = line === '' ? 'empty' : gate(line);
    if (reason !== null) {
      dropped[reason] = (dropped[reason] ?? 0) + 1;
      continue;
    }
    if (kept === null) kept = line;
    else alternates.push(line);
  }
  return { kept, dropped, alternates };
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

/**
 * Cut a list into as few chunks of at most `size` as it needs, and make them
 * the same length rather than filling each one before starting the next.
 *
 * Fifty-two items at a chunk of forty is two calls either way; `chunk` makes
 * them forty and twelve, and the call of twelve writes a thinner batch from a
 * thinner brief. Two calls of twenty-six ask the same question twice.
 */
export function chunkEven(list, size) {
  const n = list.length;
  if (n === 0) return [];
  const parts = Math.max(1, Math.ceil(n / Math.max(1, size)));
  const each = Math.floor(n / parts);
  let extra = n % parts;
  const out = [];
  let i = 0;
  for (let p = 0; p < parts; p += 1) {
    const take = each + (extra > 0 ? 1 : 0);
    if (extra > 0) extra -= 1;
    out.push(list.slice(i, i + take));
    i += take;
  }
  return out;
}

/**
 * Run `fn` over `items` with at most `limit` of them in flight, and return the
 * results **in the order of `items`**, never in the order they finished. The
 * order is the whole point: a slot writes its lines into the lever in key
 * order, so a call that answered faster may never overtake a slower one and
 * change what the file holds. `limit` of one is a plain sequential walk.
 */
export async function mapLimit(items, limit, fn) {
  const list = [...items];
  const out = new Array(list.length);
  const width = Math.max(1, Math.min(Math.floor(limit) || 1, Math.max(1, list.length)));
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next;
      next += 1;
      if (i >= list.length) return;
      out[i] = await fn(list[i], i);
    }
  }
  await Promise.all(Array.from({ length: width }, worker));
  return out;
}

// ---------------------------------------------------------------------------
// The command line
// ---------------------------------------------------------------------------

/**
 * The one error the script throws on its way out. It lives here rather than in
 * `author.mjs` so the argument parsing below can throw it and a test can catch
 * it without the script's `main()` running.
 */
export class Fail extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * The command line: positional words, flags that take a value, and flags that
 * are their own answer.
 *
 * A name is checked against the two sets **before** its value is taken. That
 * order is the fix part five carries: `--nope` at the end of the line used to
 * die saying it was missing a value, which named the wrong defect and sent the
 * reader looking for a value that was never going to help. An unknown flag is
 * an unknown flag wherever it sits, and the answer is the usage.
 */
export function parseArgv(argv, { valued, bare, usage }) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = String(argv[i]);
    if (a === '--help' || a === '-h') {
      flags.help = true;
      continue;
    }
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      const key = eq === -1 ? a.slice(2) : a.slice(2, eq);
      if (bare.has(key)) {
        if (eq !== -1) throw new Fail('bad flag', `--${key} takes no value\n${usage}`);
        flags[key] = true;
        continue;
      }
      if (!valued.has(key)) throw new Fail('bad flag', `unknown flag --${key}\n${usage}`);
      let val;
      if (eq !== -1) {
        val = a.slice(eq + 1);
      } else {
        const next = argv[i + 1];
        if (next === undefined || String(next).startsWith('--')) {
          throw new Fail('bad flag', `missing value for --${key}\n${usage}`);
        }
        val = String(next);
        i += 1;
      }
      flags[key] = val;
      continue;
    }
    if (a.startsWith('-') && a !== '-') {
      throw new Fail('bad flag', `unknown flag ${a}\n${usage}`);
    }
    positional.push(a);
  }
  return { positional, flags };
}

/**
 * One flag that has to be a number. `Number('four')` is `NaN` and `NaN` walks
 * quietly into a chunk size, a width, a temperature and a timeout, where it
 * turns into a call that asks for nothing or waits forever. `Number.isFinite`
 * is the check, and the reason line names the flag and what it was handed.
 */
function numberFlag(key, raw, fallback) {
  if (raw === undefined || raw === null) return fallback;
  const text = String(raw).trim();
  const n = text === '' ? Number.NaN : Number(text);
  if (!Number.isFinite(n)) {
    throw new Fail('bad flag', `--${key} wants a number, not "${raw}"`);
  }
  return n;
}

/**
 * The flags `run` and `edit` share, with every number checked. `spare` is null
 * when the flag was not given, so the caller can pick the default that suits
 * the pass it is making — re-voicing writes a pool a few lines over its floor,
 * topping one up adds nothing unless it is asked to.
 */
export function runOpts(flags, defaults) {
  return {
    temperature: numberFlag('temperature', flags.temperature, defaults.temperature),
    timeoutMs: numberFlag('timeout', flags.timeout, defaults.timeoutMs),
    ollama: flags.ollama ?? defaults.ollama,
    concurrency: Math.max(1, numberFlag('concurrency', flags.concurrency, defaults.concurrency)),
    chunk: Math.max(1, numberFlag('chunk', flags.chunk, defaults.chunk)),
    spare: flags.spare === undefined ? null : Math.max(0, numberFlag('spare', flags.spare, 0)),
    pools: poolFilter(flags.pool),
    poolsNamed: flags.pool !== undefined,
  };
}

/**
 * `--pool` as a matcher over the dotted pool names. A name matches exactly, or
 * as the head of a longer one — `--pool agent` takes every `agent.*` pool and
 * `--pool user.syncs` takes one. No flag at all matches everything, which is
 * what every run before part five did.
 */
export function poolFilter(raw) {
  if (raw === undefined || raw === null) return () => true;
  const wanted = String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
  if (wanted.length === 0) return () => true;
  return (name) => wanted.some((w) => name === w || String(name).startsWith(`${w}.`));
}
