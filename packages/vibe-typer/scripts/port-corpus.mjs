#!/usr/bin/env node
// One-shot, re-runnable port of dev-op-typer's calibration set and topic
// snippets into `patterns/corpus/<stack>.json`. The prototype is read-only:
// this script never writes outside this package.
//
//   node packages/vibe-typer/scripts/port-corpus.mjs [--src <dir>]
//
// Source shapes:
//   <src>/Calibration/<lang>.json  PascalCase: Id Language Difficulty Title Code Topics Explain
//   <src>/Snippets/<lang>.json     camelCase:  id language difficulty title code topics explain
//
// Output shape is `Snippet[]`: { id, stack, band, title, ask?, code, notes, topics }.
// Line endings are normalized to \n, trailing whitespace is stripped per line,
// a trailing blank line is dropped. A snippet whose code carries a tab or a
// non-ASCII character is rejected and named on stderr with the reason; the
// counts print at the end and belong in the slice doc.
//
// The prototype has no `ask`: that field is authored here (slice 3), so this
// script READS the file it is about to overwrite, keys the existing asks by
// snippet id, and carries them back onto the rows it writes. A re-run
// therefore keeps every authored ask and only refreshes what the prototype
// owns. An id that has gone from the prototype takes its ask with it, and the
// count of asks carried prints beside the kept and rejected counts.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_SRC = 'E:/AI/prototypes/packages/dev-op-typer/DevOpTyper/Assets';
const STACKS = ['bash', 'csharp', 'java', 'javascript', 'python', 'sql'];
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '..', 'patterns', 'corpus');

function srcDir(argv) {
  const i = argv.indexOf('--src');
  if (i !== -1 && argv[i + 1]) return argv[i + 1];
  return process.env.VIBE_TYPER_CORPUS_SRC ?? DEFAULT_SRC;
}

/** Normalize one code block: \n endings, no trailing blanks, no trailing newline. */
function normalize(code) {
  const lines = String(code)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/, ''));
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
  return lines.join('\n');
}

/** Why this snippet cannot be typed, or null. */
function rejectReason(code, band) {
  if (code.includes('\t')) return 'tab in code';
  if (/[^\x20-\x7e\n]/.test(code)) return 'non-ascii in code';
  if (code.trim() === '') return 'empty code';
  if (!Number.isInteger(band) || band < 1 || band > 7) return `band out of range (${band})`;
  return null;
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

/**
 * The asks already authored in the file this run is about to overwrite, by
 * snippet id. A file that is not there yet, or is not readable, gives none.
 */
function existingAsks(file) {
  const asks = new Map();
  let rows;
  try {
    rows = readJson(file);
  } catch {
    return asks;
  }
  if (!Array.isArray(rows)) return asks;
  for (const row of rows) {
    if (row && typeof row.id === 'string' && typeof row.ask === 'string' && row.ask !== '') {
      asks.set(row.id, row.ask);
    }
  }
  return asks;
}

function port(src) {
  mkdirSync(OUT, { recursive: true });
  const totals = { kept: 0, rejected: 0, asks: 0 };
  const perStack = [];
  for (const stack of STACKS) {
    const out_file = path.join(OUT, `${stack}.json`);
    const asks = existingAsks(out_file);
    const calibration = readJson(path.join(src, 'Calibration', `${stack}.json`));
    const snippets = readJson(path.join(src, 'Snippets', `${stack}.json`));
    const rows = [
      ...calibration.map((e) => ({
        id: e.Id,
        band: e.Difficulty,
        title: e.Title,
        code: e.Code,
        topics: e.Topics ?? [],
        notes: e.Explain ?? [],
      })),
      ...snippets.map((e) => ({
        id: e.id,
        band: e.difficulty,
        title: e.title,
        code: e.code,
        topics: e.topics ?? [],
        notes: e.explain ?? [],
      })),
    ];
    const out = [];
    const seen = new Set();
    let rejected = 0;
    for (const row of rows) {
      const code = normalize(row.code);
      const why = rejectReason(code, row.band) ?? (seen.has(row.id) ? 'duplicate id' : null);
      if (why) {
        rejected += 1;
        console.error(`reject ${stack}/${row.id}: ${why}`);
        continue;
      }
      seen.add(row.id);
      const ask = asks.get(row.id);
      out.push({
        id: row.id,
        stack,
        band: row.band,
        title: String(row.title).trim(),
        // Authored here, never in the prototype: carried across a re-run.
        ...(ask === undefined ? {} : { ask }),
        code,
        notes: row.notes.map((n) => String(n).trim()).filter((n) => n !== ''),
        topics: row.topics.map((t) => String(t).trim()).filter((t) => t !== ''),
      });
    }
    out.sort((a, b) => a.band - b.band || a.id.localeCompare(b.id));
    writeFileSync(out_file, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
    const bands = {};
    for (const s of out) bands[s.band] = (bands[s.band] ?? 0) + 1;
    const carried = out.filter((s) => s.ask !== undefined).length;
    if (carried < asks.size) {
      console.error(`note ${stack}: ${asks.size - carried} authored asks had no snippet left`);
    }
    perStack.push({ stack, kept: out.length, rejected, carried, bands });
    totals.kept += out.length;
    totals.rejected += rejected;
    totals.asks += carried;
  }
  for (const row of perStack) {
    const bands = Object.keys(row.bands)
      .sort()
      .map((b) => `${b}:${row.bands[b]}`)
      .join(' ');
    console.log(
      `${row.stack} kept ${row.kept} rejected ${row.rejected} asks ${row.carried} bands ${bands}`,
    );
  }
  console.log(`total kept ${totals.kept} rejected ${totals.rejected} asks ${totals.asks}`);
}

port(srcDir(process.argv.slice(2)));
