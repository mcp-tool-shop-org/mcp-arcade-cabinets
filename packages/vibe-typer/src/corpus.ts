// The typing corpus: dev-op-typer's calibration set and topic snippets,
// ported by scripts/port-corpus.mjs, plus the integration stack the tapes
// season at plan time (G30 — headers and rows, never a receipt, never a fact).
//
// The character trigram model is built once over every ported snippet's code
// and cached on the loaded corpus; difficulty.ts reads surprisal off it.

import type { Band, Snippet, Stack } from './types';
import { CORPUS_STACKS, lineFault } from './patterns';

import bashJson from '../patterns/corpus/bash.json';
import csharpJson from '../patterns/corpus/csharp.json';
import javaJson from '../patterns/corpus/java.json';
import javascriptJson from '../patterns/corpus/javascript.json';
import pythonJson from '../patterns/corpus/python.json';
import sqlJson from '../patterns/corpus/sql.json';

/** Start-of-text sentinel; never a corpus character, so it cannot collide. */
const START = '\u0002';
const ORDER = 3;

export interface NgramModel {
  /** context (two characters) -> next character -> count */
  counts: Map<string, Map<string, number>>;
  totals: Map<string, number>;
  alphabet: number;
}

export interface Corpus {
  snippets: Snippet[];
  byStack: Record<string, Snippet[]>;
  model: NgramModel;
}

/**
 * A halt at load, with the rule in words beside the pointer.
 *
 * The pointer alone was the whole message, and five distinct defects on one
 * row collapsed onto the same string: `patterns/corpus/bash.json:
 * cal-sh-d4-001.code` said nothing about whether the code was empty, had a
 * tab, had a character the field cannot show, or ended in a space. The
 * audience is the lead running `scripts/author.mjs --apply`, holding a
 * pointer into a file they now have to diff to learn which rule fired.
 *
 * `rule` is one short American-English clause, present tense, saying what is
 * wrong — the vocabulary `codegate.reasonText` already uses, borrowed
 * verbatim where the rule is the same one, so the loader and the code gate
 * say the same sentence about the same defect.
 */
function fail(file: string, key: string, rule: string): never {
  throw new Error(`patterns/corpus/${file}: ${key} — ${rule}`);
}

/**
 * Nouns that belong to exactly one story level's premise. An ask that names
 * one is a request only inside that level — "split one bill among five
 * ducks" is the rideshare for ducks and nowhere else — so the loader makes
 * it say which level it is for, and the planner honors that (`askFor`).
 * Without the tag the ask would be drawn into any level of its stack and
 * band, which is how the field got a request about ducks in an app for lost
 * socks. The list is short on purpose: it names the story nouns, not every
 * thing a request might build. The blind line pools have their own, wider
 * rule in test/lines-neutral.test.ts.
 */
export const STORY_NOUNS: readonly string[] = [
  'duck',
  'sandwich',
  'sock',
  'cat',
  'opinion',
  'stroke',
  'toy',
];

const STORY_NOUN = new RegExp(`\\b(${STORY_NOUNS.join('|')})(?:s|es)?\\b`, 'i');

/** True when an ask leans on a story level's premise and must name its level. */
export function askIsBound(ask: string): boolean {
  return STORY_NOUN.test(ask);
}

function loadStack(raw: unknown, stack: Stack): Snippet[] {
  const file = `${stack}.json`;
  if (!Array.isArray(raw)) fail(file, 'root', 'a corpus file is a list of snippets');
  if (raw.length < 20) fail(file, 'root', 'a stack carries at least 20 snippets');
  const ids = new Set<string>();
  return raw.map((row, i) => {
    if (typeof row !== 'object' || row === null) fail(file, String(i), 'a snippet is an object');
    const rec = row as Record<string, unknown>;
    const key = (k: string) => `${i}.${k}`;
    const id = rec.id;
    if (typeof id !== 'string' || id.trim() === '' || ids.has(id)) {
      fail(file, key('id'), 'an id is a non-empty string and no two snippets share one');
    }
    ids.add(id);
    if (rec.stack !== stack) fail(file, key('stack'), `a snippet in this file says it is ${stack}`);
    const band = rec.band;
    if (typeof band !== 'number' || !Number.isInteger(band) || band < 1 || band > 7) {
      fail(file, key('band'), 'a band is a whole number from 1 to 7');
    }
    const title = rec.title;
    if (typeof title !== 'string' || title.trim() === '') {
      fail(file, key('title'), 'a title is a non-empty string');
    }
    const code = rec.code;
    if (typeof code !== 'string') fail(file, key('code'), 'code is a string');
    if (code.trim() === '') fail(file, key('code'), 'there is no code in it');
    if (code.includes('\t') || code.includes('\r')) {
      fail(
        file,
        key('code'),
        'the code has a tab or a carriage return in it; spaces and newlines only',
      );
    }
    if (/[^\x20-\x7e\n]/.test(code)) {
      fail(file, key('code'), 'the code has a character the field cannot show; plain ascii only');
    }
    if (/[ ]$/m.test(code)) fail(file, key('code'), 'a code line ends in a space');
    const notes = rec.notes;
    if (!Array.isArray(notes) || notes.some((n) => typeof n !== 'string')) {
      fail(file, key('notes'), 'notes are a list of strings');
    }
    const topics = rec.topics;
    if (!Array.isArray(topics) || topics.some((t) => typeof t !== 'string')) {
      fail(file, key('topics'), 'topics are a list of strings');
    }
    // The snippet's own ask, when it has one (slice 3): the user's words for
    // the job this code does. It goes through the same gate as every authored
    // line, with `{product}` read as the one word it is, and it may not carry
    // `{title}` — a snippet that describes itself has no use for its title.
    // The level a bound ask belongs to. A non-empty string or nothing; the
    // loader cannot check it against levels.json (that file's loader lives
    // next door and does not import this one), so a test holds the ids.
    const boundTo = rec.for;
    if (boundTo !== undefined && (typeof boundTo !== 'string' || boundTo.trim() === '')) {
      fail(file, key('for'), 'a level binding is a non-empty level id');
    }
    const ask = rec.ask;
    if (ask !== undefined) {
      if (typeof ask !== 'string') fail(file, key('ask'), 'an ask is a string');
      if (ask.includes('{title}')) {
        fail(file, key('ask'), 'an ask cannot carry a {title} hole; nothing ever fills one');
      }
      const askFault = lineFault(ask);
      if (askFault !== null)
        fail(file, key('ask'), `the ask cannot be said on the field: ${askFault}`);
      // An ask that names a story noun is a request only inside the story
      // that supplies it. Say which one, or the ask is a halt — the same
      // shape as the `{title}` refusal above it.
      if (askIsBound(ask) && boundTo === undefined) {
        fail(file, key('ask'), 'the ask names a story noun, so it says which level it is for');
      }
    }
    // The snippet's own reaction: the line the user says when this piece
    // ships. The same gate as the ask one row up, verbatim — a string, no
    // `{title}`, the chat's own line scan, and a reaction that leans on a
    // story level's premise must say which level through the SAME `for`.
    // Mirroring rather than widening is the point: nonsense cannot reach the
    // disk on the reaction row that could not reach it on the ask row.
    const reaction = rec.reaction;
    if (reaction !== undefined) {
      if (typeof reaction !== 'string') fail(file, key('reaction'), 'a reaction is a string');
      if (reaction.includes('{title}')) {
        fail(
          file,
          key('reaction'),
          'a reaction cannot carry a {title} hole; nothing ever fills one',
        );
      }
      const reactionFault = lineFault(reaction);
      if (reactionFault !== null) {
        fail(file, key('reaction'), `the reaction cannot be said on the field: ${reactionFault}`);
      }
      if (askIsBound(reaction) && boundTo === undefined) {
        fail(
          file,
          key('reaction'),
          'the reaction names a story noun, so it says which level it is for',
        );
      }
    }
    // The creep this snippet carries in its own words: the extra line and
    // the "oh also" that describes it, written together. Without one the
    // creep beat is two unrelated draws — a row lifted out of some other
    // snippet in the band and an ask drawn blind from the pool — so the
    // follow-up request and the code the player types about it are about
    // nothing in particular. The ask goes through the gate every authored
    // line goes through, verbatim as the ask row above; the line goes
    // through the code rules the `code` row goes through, because it IS a
    // code line the player will type.
    const creepRaw = rec.creep;
    let creep: { line: string; ask: string } | undefined;
    if (creepRaw !== undefined) {
      if (typeof creepRaw !== 'object' || creepRaw === null || Array.isArray(creepRaw)) {
        fail(file, key('creep'), 'a creep is an object with a line and an ask');
      }
      const creepRec = creepRaw as Record<string, unknown>;
      const line = creepRec.line;
      if (typeof line !== 'string' || line.trim() === '') {
        fail(file, key('creep.line'), 'a creep line is a non-empty string');
      }
      if (/[^\x20-\x7e]/.test(line as string)) {
        fail(
          file,
          key('creep.line'),
          'the code has a character the field cannot show; plain ascii only',
        );
      }
      const creepAsk = creepRec.ask;
      if (typeof creepAsk !== 'string') fail(file, key('creep.ask'), 'a creep ask is a string');
      if ((creepAsk as string).includes('{title}')) {
        fail(file, key('creep.ask'), 'an ask cannot carry a {title} hole; nothing ever fills one');
      }
      const creepFault = lineFault(creepAsk as string);
      if (creepFault !== null) {
        fail(file, key('creep.ask'), `the ask cannot be said on the field: ${creepFault}`);
      }
      if (askIsBound(creepAsk as string) && boundTo === undefined) {
        fail(
          file,
          key('creep.ask'),
          'the ask names a story noun, so it says which level it is for',
        );
      }
      creep = { line: line as string, ask: creepAsk as string };
    }
    return {
      id,
      stack,
      band: band as Band,
      title,
      code,
      notes: notes as string[],
      topics: topics as string[],
      ...(typeof ask === 'string' ? { ask } : {}),
      ...(typeof reaction === 'string' ? { reaction } : {}),
      ...(creep === undefined ? {} : { creep }),
      ...(typeof boundTo === 'string' ? { for: boundTo } : {}),
    };
  });
}

/** Build the trigram counts over every code block, in the order given. */
export function buildModel(texts: readonly string[]): NgramModel {
  const counts = new Map<string, Map<string, number>>();
  const totals = new Map<string, number>();
  const alphabet = new Set<string>();
  for (const text of texts) {
    const padded = START.repeat(ORDER - 1) + text;
    for (let i = ORDER - 1; i < padded.length; i++) {
      const ctx = padded.slice(i - (ORDER - 1), i);
      const ch = padded[i]!;
      alphabet.add(ch);
      let row = counts.get(ctx);
      if (!row) {
        row = new Map<string, number>();
        counts.set(ctx, row);
      }
      row.set(ch, (row.get(ch) ?? 0) + 1);
      totals.set(ctx, (totals.get(ctx) ?? 0) + 1);
    }
  }
  return { counts, totals, alphabet: alphabet.size };
}

/**
 * Surprisal of a text in bits under the model, add-one smoothed. An unseen
 * context costs the uniform rate, so a strange line is expensive and not
 * infinite.
 */
export function surprisal(model: NgramModel, text: string): number {
  const v = model.alphabet + 1;
  const padded = START.repeat(ORDER - 1) + text;
  let bits = 0;
  for (let i = ORDER - 1; i < padded.length; i++) {
    const ctx = padded.slice(i - (ORDER - 1), i);
    const ch = padded[i]!;
    const seen = model.counts.get(ctx)?.get(ch) ?? 0;
    const total = model.totals.get(ctx) ?? 0;
    bits += -Math.log2((seen + 1) / (total + v));
  }
  return bits;
}

/** Every code line of a snippet, in typing order. Blank lines never ship. */
export function codeLines(snippet: Snippet): string[] {
  return snippet.code.split('\n').filter((line) => line.trim() !== '');
}

export function loadCorpus(raw: Record<string, unknown>): Corpus {
  const byStack: Record<string, Snippet[]> = {};
  const snippets: Snippet[] = [];
  for (const stack of CORPUS_STACKS) {
    const list = loadStack(raw[stack], stack);
    byStack[stack] = list;
    snippets.push(...list);
  }
  const model = buildModel(snippets.map((s) => s.code));
  return { snippets, byStack, model };
}

/** Snippets of a stack inside a band range, in corpus order. */
export function inBand(corpus: Corpus, stack: Stack, min: Band, max: Band): Snippet[] {
  const list = corpus.byStack[stack] ?? [];
  return list.filter((s) => s.band >= min && s.band <= max);
}

/**
 * How much one snippet's weight may grow from the player's weak pairs. // Director
 *
 * The sum runs over every occurrence of a weak pair in the code, so a long
 * snippet full of one fumbled pair could reach a weight tens of times the
 * pool's, the planner converged on the same handful, and a practice bias
 * turned into repetition. The bias is a lean, not a lock.
 */
export const WEAK_SNIPPET_CAP = 24;

/**
 * How many of a snippet's adjacent pairs are pairs the player fumbles,
 * capped so no one snippet can run away from the pool.
 */
export function weakWeight(snippet: Snippet, weak: Record<string, number>): number {
  let hits = 0;
  const code = snippet.code;
  for (let i = 1; i < code.length; i++) {
    const pair = code.slice(i - 1, i + 1);
    const w = weak[pair];
    if (w !== undefined && w > 0) hits += w;
    if (hits >= WEAK_SNIPPET_CAP) return WEAK_SNIPPET_CAP;
  }
  return hits;
}

/**
 * A short, stable name for exactly this corpus.
 *
 * `withIntegration` rebuilds the character trigram model over the seasoned
 * corpus, so every snippet's surprisal — and therefore its value, the
 * valuation, the milestones and any comparison against this browser's own
 * past (G8, G23) — depends on which tape files happen to be on disk. The
 * same bash level scores differently on a rig with fixtures than on Pages
 * without them, which makes a stored best from one corpus a meaningless
 * comparison for a run on another. A caller that keeps a best stores this
 * beside it and compares only within the same fingerprint.
 */
export function corpusFingerprint(corpus: Corpus): string {
  let h = 2166136261;
  for (const snippet of corpus.snippets) {
    for (let i = 0; i < snippet.id.length; i++) {
      h ^= snippet.id.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= snippet.code.length;
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/** A tape's header and its tool names, the only thing the cabinet reads (G30). */
export interface IntegrationSeed {
  server: string;
  policy: string;
  tools: string[];
}

const TOOL_OK = /^[a-z][a-z0-9_.]{1,40}$/i;

function envelope(tool: string, band: 1 | 3 | 5): string {
  if (band === 1) return tool;
  if (band === 3) return `{"method": "tools/call", "name": "${tool}"}`;
  return `{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "${tool}"}}`;
}

/**
 * The user's ask for an integration snippet, written from the tool the code
 * actually calls (the coordinator's proofread after 0.11.0: the template
 * pool this stack fell back to was a list of wire-this-to-that lines with no
 * relation to the code, and it read as nonsense on the field). Null when the
 * tool's name cannot be said on the field (a digit, a barred word), in which
 * case the template pool plays as before.
 */
export function integrationAsk(tool: string, band: 1 | 3 | 5): string | null {
  const ask =
    band === 1
      ? `get {product} to call ${tool} and show me what it says`
      : band === 3
        ? `make {product} send ${tool} a proper request this time`
        : `wire {product} to ${tool} with the whole envelope, every field`;
  return lineFault(ask.split('{product}').join('it')) === null ? ask : null;
}

/**
 * Build the integration stack from tape headers and rows: one line per
 * envelope tier per tool name. Names that read as a probe are skipped; a
 * name is a name, never a fact and never a receipt (G30).
 *
 * These snippets carry no `reaction`: they are minted at play time from
 * whatever tapes are on disk, and nobody proofreads a line written here. The
 * generic reviews answer their ships, permanently and by design — not as a
 * transition waiting for an authoring run.
 */
export function integrationSnippets(seeds: readonly IntegrationSeed[]): Snippet[] {
  const out: Snippet[] = [];
  const seen = new Set<string>();
  for (const seed of seeds) {
    const server = seed.server.trim();
    if (server === '') continue;
    for (const raw of seed.tools) {
      const tool = raw.trim();
      if (!TOOL_OK.test(tool) || tool.includes('unlisted')) continue;
      for (const band of [1, 3, 5] as const) {
        const id = `int-${server}-${tool}-${band}`;
        if (seen.has(id)) continue;
        seen.add(id);
        const ask = integrationAsk(tool, band);
        out.push({
          id,
          stack: 'integration',
          band,
          title: tool,
          code: envelope(tool, band),
          notes: [`server ${server}`, `policy ${seed.policy}`],
          topics: ['integration', server],
          ...(ask === null ? {} : { ask }),
        });
      }
    }
  }
  out.sort((a, b) => a.band - b.band || a.id.localeCompare(b.id));
  return out;
}

/** A corpus with the integration stack seasoned in. The base corpus is untouched. */
export function withIntegration(corpus: Corpus, snippets: readonly Snippet[]): Corpus {
  if (snippets.length === 0) return corpus;
  // The model is rebuilt over the seasoned corpus so an integration snippet is
  // valued by a model that has seen its envelopes (the review's second change).
  const all = [...corpus.snippets, ...snippets];
  return {
    snippets: all,
    byStack: { ...corpus.byStack, integration: [...snippets] },
    model: buildModel(all.map((x) => x.code)),
  };
}

// The annotation is what lets a Ghost-only bundle drop this. `loadCorpus`
// can throw, so a bundler must assume the call matters and keeps it — and
// with it every corpus file, a fifth of a megabyte of snippets, inside a
// package named for the other cabinet. Marking it pure says the only thing
// this call does is produce a value: when nothing reads `DEFAULT_CORPUS`,
// the call and the six JSON imports go. Where something does read it — the
// typing cabinet, every test, the play-through — it runs exactly as before
// and still halts on a bad lever.
export const DEFAULT_CORPUS: Corpus = /* #__PURE__ */ loadCorpus({
  bash: bashJson,
  csharp: csharpJson,
  java: javaJson,
  javascript: javascriptJson,
  python: pythonJson,
  sql: sqlJson,
});
