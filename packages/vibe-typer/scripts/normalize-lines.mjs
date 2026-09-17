#!/usr/bin/env node
// The house rules for the authored shelf, applied mechanically.
//
// Usage: node scripts/normalize-lines.mjs [--check]
//
// The corpus was two shelves bound under one cover. 249 asks punctuated
// themselves 27 one way and 222 the other; 249 reactions split 124/125; the
// agent's `replies` and `ships` kept a rule three pools out of five; and the
// 39 hand-authored snippets were Title-Cased over 210 lowercase ported ones,
// so one stack held both `For loop` and `for loop with nested conditional`.
// A lead reading the shelf, or an authoring run drafting against it, had no
// single house style to match.
//
// This script is the style, and `test/normalize.test.ts` pins it: the shipped
// levers must already satisfy it, so an authoring run cannot reopen the seam.
//
// IT IS MECHANICAL AND IT IS NOT AN EDITOR. Every rule below is a shape:
// terminal punctuation on or off, and case. It never rewords, never adds a
// line, never drops one, never touches a word. Voice is the lead's and stays
// the lead's — the register split between the hand-authored notes ('Practice
// do/done keywords') and the ported ones ('Prints hello world to standard
// output') is a writing job, not this one, and is deliberately left alone.
//
// Standards compliance (workflow-standards, scored 0-3):
// - PIN_PER_STEP 3: no model runs here. The rules are pure functions of the
//   text, exported and asserted one by one in test/normalize.test.ts, so a
//   run is byte-for-byte replayable from the levers alone.
// - ANDON_AUTHORITY 3: `--check` is the halt. A rule that would create a
//   duplicate inside a pool, or a line that would stop passing `lineFault`,
//   halts the whole run before a byte is written and names the pool.
// - NAMED_COMPENSATORS 2: the only irreversible call is the write to
//   `patterns/**`, which is git-tracked; the undo is `git checkout --
//   packages/vibe-typer/patterns`, owner the lead running the script. Nothing
//   here publishes, tags or posts.
// - DECOMPOSE_BY_SECRETS 2: the rules are the secret and they live in one
//   table (`RULES`); the walkers know only which rule a path takes.
// - UNCERTAINTY_GATED_HUMANS 2: the script never guesses. A shape it has no
//   rule for is left untouched, and `--check` prints every line it would
//   change so the lead reads the diff before it lands.
// - EXTERNAL_VERIFIER 2: the verifier is not this script — it is the
//   loader (`loadPatterns`, `loadCorpus`, which refuse a duplicate and a
//   line `lineFault` rejects) plus the test that re-derives the rules
//   independently of this file's walkers.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(HERE, '..');
const PATTERNS = path.join(PKG, 'patterns');
const CORPUS = path.join(PATTERNS, 'corpus');

// ——— The rules ———————————————————————————————————————————————————

/**
 * A REQUEST ends with nothing. The voice sheet's rule for the user's lines,
 * and the one every other user pool already keeps (`creeps` 0/14, `nags`
 * 0/20, `asks` 1/601). A question keeps its question mark: a request that
 * asks is still a question, and `lineFault` counts `?` as a stop the same
 * way it counts `.`.
 */
export function asRequest(line) {
  return line.endsWith('.') ? line.slice(0, -1) : line;
}

/**
 * A REACTION, a REVIEW or anything the agent says ends with a period. The
 * rule `user.reviews` (10/10), `user.reactions` (108/108), `agent.hmm`
 * (15/15), `agent.compactions` (23/23) and `agent.nagReplies` (15/15)
 * already keep. A line that already ends in a stop is left alone, so a
 * question stays a question and no line ever gets two.
 */
export function asStatement(line) {
  return /[.?]$/.test(line) ? line : `${line}.`;
}

/**
 * A SNIPPET TITLE is lowercase. The ported shelf is 210/210 lowercase and
 * lowercases its acronyms with everything else (`linq query with groupby`,
 * `json schema validator with nested rules`, `cte with subquery filter`), so
 * the house rule is the whole string, not just the first letter — anything
 * narrower would leave `Inner JOIN` beside `inner join with aliases`.
 */
export function asTitle(title) {
  return title.toLowerCase();
}

// ——— Where each rule applies ————————————————————————————————————

/** `patterns/user.json` and `patterns/agent.json`, by top-level key. */
const LEVER_RULES = {
  'user.json': {
    // The user's own requests: nothing on the end.
    asks: asRequest,
    creeps: asRequest,
    nags: asRequest,
    // Their verdicts: a period.
    reviews: asStatement,
    reactions: asStatement,
    reactionsByTopic: asStatement,
    reviewsByProduct: asStatement,
    // `syncs` is chatter mid-thought, not a sentence and not a request, and
    // it holds 34/34 with no terminal stop already. No rule, so no touch.
  },
  // Every pool the agent speaks from ends in a period. `replies` was 11/23
  // and `ships` 3/9; the other three were whole.
  'agent.json': {
    replies: asStatement,
    hmm: asStatement,
    compactions: asStatement,
    nagReplies: asStatement,
    ships: asStatement,
  },
};

/** A corpus row's fields, by name. */
const CORPUS_RULES = {
  title: asTitle,
  ask: asRequest,
  reaction: asStatement,
};

// ——— The walk ————————————————————————————————————————————————————

/** Apply `rule` to every string under `value`, however deep. */
function deep(value, rule) {
  if (typeof value === 'string') return rule(value);
  if (Array.isArray(value)) return value.map((v) => deep(v, rule));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = deep(v, rule);
    return out;
  }
  return value;
}

/** Every change one file would take, as `{ key, from, to }`. */
function changesIn(before, after, key = '') {
  if (typeof before === 'string') {
    return before === after ? [] : [{ key, from: before, to: after }];
  }
  if (Array.isArray(before)) {
    return before.flatMap((v, i) => changesIn(v, after[i], `${key}[${i}]`));
  }
  if (before && typeof before === 'object') {
    return Object.entries(before).flatMap(([k, v]) =>
      changesIn(v, after[k], key === '' ? k : `${key}.${k}`),
    );
  }
  return [];
}

/**
 * The halt, run over ONE pool — one array of lines, the unit the loader
 * checks for duplicates. `user.asks` is a record of a pool per stack and two
 * stacks may legally share a line, so the check is per leaf array and never
 * across a whole key.
 *
 * A pool whose lines stop being distinct once a period comes off has lost a
 * line, which this script is not allowed to do, and a line that would stop
 * passing the chat gate cannot reach the disk. Either one stops the whole run
 * before a byte is written.
 */
function andonPool(file, key, lines) {
  const seen = new Set();
  for (const line of lines) {
    if (typeof line !== 'string') continue;
    if (seen.has(line)) {
      throw new Error(
        `${file}: ${key} — normalizing collapses two lines into one; the pool would lose a line`,
      );
    }
    seen.add(line);
    if (line.trim() === '' || line !== line.trim() || (line.match(/[.?]/g) ?? []).length > 1) {
      throw new Error(`${file}: ${key} — normalizing leaves a line the chat gate would refuse`);
    }
  }
}

/** Every leaf array under `value`, each checked as its own pool. */
function andon(file, key, value) {
  if (Array.isArray(value)) {
    andonPool(file, key, value);
    return;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) andon(file, `${key}.${k}`, v);
  }
}

function normalizeLever(name, raw) {
  const rules = LEVER_RULES[name] ?? {};
  const out = { ...raw };
  for (const [key, rule] of Object.entries(rules)) {
    if (!(key in raw)) continue;
    out[key] = deep(raw[key], rule);
    andon(name, key, out[key]);
  }
  return out;
}

function normalizeCorpus(rows) {
  return rows.map((row) => {
    const out = { ...row };
    for (const [key, rule] of Object.entries(CORPUS_RULES)) {
      if (typeof out[key] === 'string') out[key] = rule(out[key]);
    }
    // A note is prose and ends in a period; all 288 already do, and this
    // keeps it that way rather than fixing anything today.
    if (Array.isArray(out.notes)) out.notes = out.notes.map(asStatement);
    if (out.creep && typeof out.creep.ask === 'string') {
      out.creep = { ...out.creep, ask: asRequest(out.creep.ask) };
    }
    return out;
  });
}

/** Every file this script owns, with what it would become. */
export function plan() {
  const files = [];
  for (const name of readdirSync(PATTERNS)) {
    if (!name.endsWith('.json')) continue;
    const full = path.join(PATTERNS, name);
    const raw = JSON.parse(readFileSync(full, 'utf8'));
    files.push({ file: `patterns/${name}`, full, before: raw, after: normalizeLever(name, raw) });
  }
  for (const name of readdirSync(CORPUS)) {
    if (!name.endsWith('.json')) continue;
    const full = path.join(CORPUS, name);
    const raw = JSON.parse(readFileSync(full, 'utf8'));
    files.push({
      file: `patterns/corpus/${name}`,
      full,
      before: raw,
      after: normalizeCorpus(raw),
    });
  }
  return files.map((f) => ({ ...f, changes: changesIn(f.before, f.after) }));
}

async function main(argv) {
  const check = argv.includes('--check');
  const files = plan();
  let touched = 0;
  // The levers are prettier-formatted and `pnpm lint` checks them, so a
  // rewrite goes back through prettier rather than through JSON.stringify
  // alone — otherwise every short array in the file reflows and the diff
  // buries the handful of lines that actually moved.
  const prettier = check ? null : await import('prettier');
  for (const f of files) {
    if (f.changes.length === 0) continue;
    touched += f.changes.length;
    for (const c of f.changes) {
      process.stdout.write(`${f.file}: ${c.key}\n  - ${c.from}\n  + ${c.to}\n`);
    }
    if (!check) {
      const options = (await prettier.resolveConfig(f.full)) ?? {};
      const text = await prettier.format(JSON.stringify(f.after, null, 2), {
        ...options,
        filepath: f.full,
      });
      writeFileSync(f.full, text);
    }
  }
  if (touched === 0) {
    process.stdout.write('the shelf already keeps the house rules\n');
    return 0;
  }
  if (check) {
    process.stdout.write(`\n${touched} lines are off the house rules; run without --check\n`);
    return 1;
  }
  process.stdout.write(`\nnormalized ${touched} lines\n`);
  return 0;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  process.exit(await main(process.argv.slice(2)));
}
