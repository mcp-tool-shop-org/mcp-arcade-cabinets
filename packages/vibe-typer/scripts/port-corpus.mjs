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
// Output shape is `Snippet[]`: { id, stack, band, title, code, notes, topics }.
// Line endings are normalised to \n, trailing whitespace is stripped per line,
// a trailing blank line is dropped. A snippet whose code carries a tab or a
// non-ASCII character is rejected and named on stderr with the reason; the
// counts print at the end and belong in the slice doc.
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

/** Normalise one code block: \n endings, no trailing blanks, no trailing newline. */
function normalise(code) {
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

function port(src) {
  mkdirSync(OUT, { recursive: true });
  const totals = { kept: 0, rejected: 0 };
  const perStack = [];
  for (const stack of STACKS) {
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
      const code = normalise(row.code);
      const why = rejectReason(code, row.band) ?? (seen.has(row.id) ? 'duplicate id' : null);
      if (why) {
        rejected += 1;
        console.error(`reject ${stack}/${row.id}: ${why}`);
        continue;
      }
      seen.add(row.id);
      out.push({
        id: row.id,
        stack,
        band: row.band,
        title: String(row.title).trim(),
        code,
        notes: row.notes.map((n) => String(n).trim()).filter((n) => n !== ''),
        topics: row.topics.map((t) => String(t).trim()).filter((t) => t !== ''),
      });
    }
    out.sort((a, b) => a.band - b.band || a.id.localeCompare(b.id));
    writeFileSync(path.join(OUT, `${stack}.json`), `${JSON.stringify(out, null, 2)}\n`, 'utf8');
    const bands = {};
    for (const s of out) bands[s.band] = (bands[s.band] ?? 0) + 1;
    perStack.push({ stack, kept: out.length, rejected, bands });
    totals.kept += out.length;
    totals.rejected += rejected;
  }
  for (const row of perStack) {
    const bands = Object.keys(row.bands)
      .sort()
      .map((b) => `${b}:${row.bands[b]}`)
      .join(' ');
    console.log(`${row.stack} kept ${row.kept} rejected ${row.rejected} bands ${bands}`);
  }
  console.log(`total kept ${totals.kept} rejected ${totals.rejected}`);
}

port(srcDir(process.argv.slice(2)));
