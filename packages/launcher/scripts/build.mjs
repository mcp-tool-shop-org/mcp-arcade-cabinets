// Lay the published package out.
//
// The launcher declares no runtime dependencies on purpose: everything it
// needs is bundled or copied in here, so one package ships and
// `tape-core`, `ghost-on-the-menu`, `cabinet-server` and `cabinets` all
// stay private. That is the whole reason this file exists instead of a
// `dependencies` block.
//
// Standards compliance (workflow-standards, the six):
//   PIN_PER_STEP 2 — every input is a path in this file and the bundler is
//     pinned by the lockfile; the same tree produces the same dist.
//   ANDON_AUTHORITY 3 — a missing input halts with the command that makes
//     it, and `verifyLayout` re-checks the result before anyone can pack.
//   NAMED_COMPENSATORS — n/a here: this writes only inside `dist/`, which
//     it clears first. The irreversible step is `npm publish`; its
//     compensators are in `docs/npm-launcher.md`.
//   DECOMPOSE_BY_SECRETS 2 — what changes together (the shell, the server
//     bundle, the tapes) is copied together; the parts that change on
//     different clocks stay separate packages.
//   UNCERTAINTY_GATED_HUMANS — skip: no human checkpoint in a build step.
//   EXTERNAL_VERIFIER 1 — CI runs the published bin, which is a different
//     process than the one that built it, but not a different family.

import { cp, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '..');
const repo = path.resolve(pkg, '..', '..');
const dist = path.join(pkg, 'dist');

/** Copied in verbatim: source on disk, name inside `dist`, how to make it. */
const INPUTS = [
  {
    from: path.join(repo, 'apps', 'cabinets', 'dist'),
    to: path.join(dist, 'play'),
    what: 'the shell',
    next: 'pnpm -F @mcp-arcade-cabinets/cabinets build',
  },
  {
    from: path.join(repo, 'packages', 'cabinet-server', 'dist', 'index.js'),
    to: path.join(dist, 'cabinet-server.js'),
    what: 'the cabinet-server bundle (the say seat)',
    next: 'pnpm -F @mcp-arcade-cabinets/cabinet-server build',
  },
  {
    from: path.join(repo, 'packages', 'cabinet-server', 'dist', 'server.js'),
    to: path.join(dist, 'cabinet-stdio.js'),
    what: 'the stdio cabinet server (--mcp)',
    next: 'pnpm -F @mcp-arcade-cabinets/cabinet-server build',
  },
  {
    from: path.join(repo, 'fixtures', 'tapes'),
    to: path.join(dist, 'tapes'),
    what: 'the tapes',
    next: 'nothing to build; fixtures/tapes is tracked',
  },
];

/** What must exist in `dist` afterwards for the package to work at all. */
const LAYOUT = [
  'cli.js',
  'cabinet-server.js',
  'cabinet-stdio.js',
  path.join('play', 'index.html'),
  path.join('tapes'),
];

function halt(lines) {
  for (const line of lines) process.stderr.write(`${line}\n`);
  process.exit(1);
}

async function present(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const missing = [];
  for (const input of INPUTS) {
    if (!(await present(input.from))) missing.push(input);
  }
  if (missing.length > 0) {
    halt([
      'launcher: inputs missing, nothing was written',
      ...missing.map((m) => `- ${m.what}: ${path.relative(repo, m.from)}`),
      '',
      'next: pnpm build:launcher (from the repo root), or individually:',
      ...[...new Set(missing.map((m) => `  ${m.next}`))],
    ]);
  }

  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  await build({
    entryPoints: [path.join(pkg, 'src', 'cli.ts')],
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    outfile: path.join(dist, 'cli.js'),
    banner: { js: '#!/usr/bin/env node' },
    logLevel: 'warning',
  });

  for (const input of INPUTS) {
    await cp(input.from, input.to, { recursive: true });
  }

  const absent = [];
  for (const rel of LAYOUT) {
    if (!(await present(path.join(dist, rel)))) absent.push(rel);
  }
  if (absent.length > 0) {
    halt([
      'launcher: dist is incomplete after the copy',
      ...absent.map((rel) => `- missing: dist/${rel}`),
      '',
      'next: pnpm build:launcher (from the repo root)',
    ]);
  }

  // stderr, not stdout: this runs as `prepack`, and `npm pack --json`
  // parses npm's stdout. A friendly line there is a JSON syntax error for
  // anything that packs this package in a pipeline.
  process.stderr.write(`launcher: dist ready at ${path.relative(repo, dist)}\n`);
}

main().catch((err) => {
  halt([`launcher: ${err instanceof Error ? err.message : String(err)}`]);
});
