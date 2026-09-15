// The typing corpus: dev-op-typer's calibration set and topic snippets,
// ported by scripts/port-corpus.mjs, plus the integration stack the tapes
// season at plan time (G30 — headers and rows, never a receipt, never a fact).
//
// The character trigram model is built once over every ported snippet's code
// and cached on the loaded corpus; difficulty.ts reads surprisal off it.

import type { Band, Snippet, Stack } from './types';
import { CORPUS_STACKS } from './patterns';

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

function fail(file: string, key: string): never {
  throw new Error(`patterns/corpus/${file}: ${key}`);
}

function loadStack(raw: unknown, stack: Stack): Snippet[] {
  const file = `${stack}.json`;
  if (!Array.isArray(raw)) fail(file, 'root');
  if (raw.length < 20) fail(file, 'root');
  const ids = new Set<string>();
  return raw.map((row, i) => {
    if (typeof row !== 'object' || row === null) fail(file, String(i));
    const rec = row as Record<string, unknown>;
    const key = (k: string) => `${i}.${k}`;
    const id = rec.id;
    if (typeof id !== 'string' || id.trim() === '' || ids.has(id)) fail(file, key('id'));
    ids.add(id);
    if (rec.stack !== stack) fail(file, key('stack'));
    const band = rec.band;
    if (typeof band !== 'number' || !Number.isInteger(band) || band < 1 || band > 7) {
      fail(file, key('band'));
    }
    const title = rec.title;
    if (typeof title !== 'string' || title.trim() === '') fail(file, key('title'));
    const code = rec.code;
    if (typeof code !== 'string' || code.trim() === '') fail(file, key('code'));
    if (code.includes('\t')) fail(file, key('code'));
    if (code.includes('\r')) fail(file, key('code'));
    if (/[^\x20-\x7e\n]/.test(code)) fail(file, key('code'));
    if (/[ ]$/m.test(code)) fail(file, key('code'));
    const notes = rec.notes;
    if (!Array.isArray(notes) || notes.some((n) => typeof n !== 'string')) fail(file, key('notes'));
    const topics = rec.topics;
    if (!Array.isArray(topics) || topics.some((t) => typeof t !== 'string')) {
      fail(file, key('topics'));
    }
    return {
      id,
      stack,
      band: band as Band,
      title,
      code,
      notes: notes as string[],
      topics: topics as string[],
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

/** How many of a snippet's adjacent pairs are pairs the player fumbles. */
export function weakWeight(snippet: Snippet, weak: Record<string, number>): number {
  let hits = 0;
  const code = snippet.code;
  for (let i = 1; i < code.length; i++) {
    const pair = code.slice(i - 1, i + 1);
    const w = weak[pair];
    if (w !== undefined && w > 0) hits += w;
  }
  return hits;
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
 * Build the integration stack from tape headers and rows: one line per
 * envelope tier per tool name. Names that read as a probe are skipped; a
 * name is a name, never a fact and never a receipt (G30).
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
        out.push({
          id,
          stack: 'integration',
          band,
          title: tool,
          code: envelope(tool, band),
          notes: [`server ${server}`, `policy ${seed.policy}`],
          topics: ['integration', server],
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

export const DEFAULT_CORPUS: Corpus = loadCorpus({
  bash: bashJson,
  csharp: csharpJson,
  java: javaJson,
  javascript: javascriptJson,
  python: pythonJson,
  sql: sqlJson,
});
