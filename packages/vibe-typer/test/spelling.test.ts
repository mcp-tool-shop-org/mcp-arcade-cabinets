// American English on every surface a player or reader sees (the Director's
// decision of 2026-09-15, after playing v0.9.0: British spellings had shipped
// in a level name). This test is the gate that keeps them out.
//
// It scans three places, and names the file, the key path and the word on a
// hit: every string in every lever; every snippet's title, notes and topics;
// and the shell's own source for the cabinet. Snippet `code` is out of scope —
// it is the text the player types, quoted from the corpus, and a string
// literal inside it is the code's business, not the product's voice.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { BRITISH, britishHit } from '../src/spelling';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(HERE, '..');
const PATTERNS = path.join(PKG, 'patterns');
const CORPUS = path.join(PATTERNS, 'corpus');
const SHELL = path.resolve(PKG, '..', '..', 'apps', 'cabinets', 'src');
const ROOT = path.resolve(PKG, '..', '..');
/**
 * The typing cabinet's MCP contract and its catalog mirror. A tool
 * description is read by every client that lists this cabinet, which makes
 * it as reader-facing as a level name (slice 4).
 */
const CONTRACTS = ['packages/cabinet-server/tools.vibe.json', 'catalog/tools.vibe.json'] as const;

/** Every hit as `<file>: <key path> — <word>`, so the failure says where. */
function hits(): string[] {
  const found: string[] = [];
  const note = (file: string, key: string, text: string) => {
    const hit = britishHit(text);
    if (hit) found.push(`${file}: ${key} — ${hit}`);
  };

  // Every string in every lever, walked to the leaf.
  const walk = (file: string, key: string, value: unknown): void => {
    if (typeof value === 'string') note(file, key, value);
    else if (Array.isArray(value)) value.forEach((item, i) => walk(file, `${key}[${i}]`, item));
    else if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        walk(file, key === '' ? k : `${key}.${k}`, v);
      }
    }
  };
  for (const name of readdirSync(PATTERNS)) {
    if (!name.endsWith('.json')) continue;
    walk(`patterns/${name}`, '', JSON.parse(readFileSync(path.join(PATTERNS, name), 'utf8')));
  }

  // The typing cabinet's tool contract, walked the same way as a lever.
  for (const file of CONTRACTS) {
    walk(file, '', JSON.parse(readFileSync(path.join(ROOT, file), 'utf8')));
  }

  // The corpus, titles and prose only. `code` is the typed target.
  for (const name of readdirSync(CORPUS)) {
    if (!name.endsWith('.json')) continue;
    const file = `patterns/corpus/${name}`;
    const rows = JSON.parse(readFileSync(path.join(CORPUS, name), 'utf8')) as {
      id: string;
      title: string;
      notes?: string[];
      topics?: string[];
    }[];
    for (const row of rows) {
      note(file, `${row.id}.title`, row.title);
      (row.notes ?? []).forEach((n, i) => note(file, `${row.id}.notes[${i}]`, n));
      (row.topics ?? []).forEach((n, i) => note(file, `${row.id}.topics[${i}]`, n));
    }
  }

  // The shell, whole files for the cabinet's own modules; a comment is ours to
  // fix too. `main.ts` is shared with Ghost, so only the Vibe Typer region of
  // it is scanned and Ghost's spellings are left where they are.
  for (const name of ['vibe-typer.ts', 'typer-cues.ts', 'typer-audio.ts', 'typer-keys.ts']) {
    const text = readFileSync(path.join(SHELL, name), 'utf8');
    text.split('\n').forEach((line, i) => note(`apps/cabinets/src/${name}`, `line ${i + 1}`, line));
  }
  // The page carries the field's CSS and static strings; it is scanned whole
  // (the review's second change). A hit in Ghost's half is ours to fix too.
  const page = readFileSync(path.join(SHELL, '..', 'index.html'), 'utf8');
  page.split('\n').forEach((line, i) => note('apps/cabinets/index.html', `line ${i + 1}`, line));
  const main = readFileSync(path.join(SHELL, 'main.ts'), 'utf8').split('\n');
  const start = main.findIndex((line) => line.includes('// ——— Vibe Typer'));
  expect(start, 'main.ts still marks where Vibe Typer starts').toBeGreaterThan(0);
  main.slice(start).forEach((line, i) => {
    note('apps/cabinets/src/main.ts', `line ${start + i + 1}`, line);
  });

  return found;
}

describe('American English', () => {
  it('has no British spelling on any surface', () => {
    expect(hits()).toEqual([]);
  });

  it('flags the British form and lets the American one through', () => {
    expect(britishHit('can the colours be more expensive looking')).toContain('colours');
    expect(britishHit('can the colors be more expensive looking')).toBeNull();
    expect(britishHit('a loyalty programme for the coffee machine')).toContain('programme');
    expect(britishHit('a loyalty program for the coffee machine')).toBeNull();
    expect(britishHit('can we parallelise it')).toContain('parallelise');
    expect(britishHit('the packer runs with no parallelism')).toBeNull();
    expect(britishHit('run the analyse step')).toContain('analyse');
    expect(britishHit('the analysis says it is fine')).toBeNull();
    expect(britishHit('the data analyses show')).toBeNull();
    expect(britishHit('an optimised query')).toContain('optimised');
    expect(britishHit('she is optimistic about it')).toBeNull();
    expect(britishHit('centre the block')).toContain('centre');
    expect(britishHit('center the block')).toBeNull();
  });

  it('gives every entry an American word and a pattern that only matches British', () => {
    for (const entry of BRITISH) {
      expect(entry.word, 'the American form is written out').not.toBe('');
      expect(entry.re.test(entry.word), `${entry.word} is not its own hit`).toBe(false);
      expect(entry.re.flags, `${entry.word} is case-insensitive`).toContain('i');
      expect(entry.re.global, `${entry.word} is not a sticky global`).toBe(false);
    }
  });
});
