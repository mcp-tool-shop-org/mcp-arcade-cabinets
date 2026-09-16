#!/usr/bin/env node
// `node packages/vibe-typer/scripts/sweep-levels.mjs [--tier 0] [--bot typist:40:0.03]
//                                                    [--seeds 1,2,3] [--suggest]`
//
// The level sweep: how long every listed level takes, how many compactions it
// costs and how many check-ins land, at a bot and a tier over a few seeds. It
// is the development tool the drains are set from; `test/band.test.ts` is the
// andon. A sibling of Ghost's `scripts/sweep.mjs`, and like it, it bundles the
// package in process with esbuild rather than asking for a build first.
//
// `--suggest` prints the drain each level would want if its bar is to cover
// the same share of the level that the eight levels of slice one covered:
// `drainPerSec x seconds` held at about 0.93 across them, which is the rule
// "the bar covers about 1.6 requests at forty words a minute" as a number you
// can measure. A level already inside the band keeps the number it has.

import path from 'node:path';
import os from 'node:os';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(HERE, '..');
const ROOT = path.resolve(PKG, '..', '..');

const USAGE = `usage: node packages/vibe-typer/scripts/sweep-levels.mjs
         [--tier 0|1|2|3|all] [--bot <spec>] [--seeds 1,2,3] [--suggest] [--json]`;

/** The share of the bar a level is tuned to spend, measured off slice one. */
const BAR_BUDGET = 0.93;

function parseArgv(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') return { help: true };
    if (a === '--suggest' || a === '--json') {
      flags[a.slice(2)] = true;
      continue;
    }
    if (!a.startsWith('--')) {
      console.error(`unexpected argument ${a}\n${USAGE}`);
      process.exit(2);
    }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || String(next).startsWith('--')) {
      console.error(`missing value for --${key}\n${USAGE}`);
      process.exit(2);
    }
    flags[key] = next;
    i += 1;
  }
  return flags;
}

async function loadPackage() {
  const dir = path.join(os.tmpdir(), `vibe-sweep-${process.pid}`);
  mkdirSync(dir, { recursive: true });
  const entry = [
    "export * from './packages/vibe-typer/src/index.ts';",
    "export { DT, botFor, parseBot, integrationFrom } from './packages/vibe-typer/src/play.ts';",
    '',
  ].join('\n');
  const r = await build({
    stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' },
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    logLevel: 'warning',
    external: ['node:fs', 'node:path'],
  });
  const out = path.join(dir, 'pkg.mjs');
  writeFileSync(out, r.outputFiles[0].text);
  const mod = await import(pathToFileURL(out).href);
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // A left-over temp file is not worth a halt.
  }
  return mod;
}

/** One run to its end: the seconds it took, and what it cost. */
function runOne(pkg, integration, { level, tier, bot, seed, cap }) {
  const state = pkg.createRun({ seed, tier, endless: false, levelIndex: level, integration });
  const spec = pkg.parseBot(bot);
  const drive = pkg.botFor(spec, seed);
  let ticks = 0;
  let compactions = 0;
  let nags = 0;
  while (!state.over && ticks < cap) {
    ticks += 1;
    pkg.stepRun(state, drive(state), pkg.DT);
    for (const e of state.events) {
      if (e.kind === 'compaction') compactions += 1;
      else if (e.kind === 'message' && e.nag === true) nags += 1;
    }
  }
  return {
    seconds: ticks * pkg.DT,
    compactions,
    nags,
    pieces: state.built.length,
    valuation: state.valuation,
    ended: state.ended ?? (ticks >= cap ? 'overrun' : null),
  };
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

function pad(s, n) {
  const t = String(s);
  return t.length >= n ? t : t + ' '.repeat(n - t.length);
}

function padLeft(s, n) {
  const t = String(s);
  return t.length >= n ? t : ' '.repeat(n - t.length) + t;
}

async function main() {
  const flags = parseArgv(process.argv.slice(2));
  if (flags.help) {
    console.log(USAGE);
    return;
  }
  const pkg = await loadPackage();
  const integration = pkg.integrationFrom(path.resolve(ROOT, 'fixtures/tapes'));
  const levels = pkg.DEFAULT_PATTERNS.levels.levels;
  const seeds = String(flags.seeds ?? '1,2,3')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
  const cap = Number(flags.cap ?? 60 * 60 * 90);
  // The four readings the drains are set from: the forty-word typist at the
  // three gentler tiers, and the clean ninety at hardcore.
  const runs =
    flags.tier === undefined || flags.tier === 'all'
      ? [
          { tier: 0, bot: 'typist:40:0.03' },
          { tier: 1, bot: 'typist:40:0.03' },
          { tier: 2, bot: 'typist:40:0.03' },
          { tier: 3, bot: 'perfect' },
        ]
      : [{ tier: Number(flags.tier), bot: String(flags.bot ?? 'typist:40:0.03') }];

  const rows = [];
  for (const { tier, bot } of runs) {
    for (const [i, def] of levels.entries()) {
      const out = seeds.map((seed) => runOne(pkg, integration, { level: i, tier, bot, seed, cap }));
      rows.push({
        level: i,
        id: def.id,
        stack: def.stack,
        band: `${def.bandMin}-${def.bandMax}`,
        tier,
        bot,
        drainPerSec: def.drainPerSec,
        seconds: Math.round(mean(out.map((r) => r.seconds))),
        compactions: out.reduce((a, r) => a + r.compactions, 0),
        nags: out.map((r) => r.nags),
        pieces: out.reduce((a, r) => a + r.pieces, 0),
        valuation: Math.round(mean(out.map((r) => r.valuation))),
        ends: out.map((r) => r.ended).join(','),
      });
    }
  }

  if (flags.json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  const header = [
    pad('lvl', 4),
    pad('id', 21),
    pad('stack', 12),
    pad('band', 6),
    padLeft('tier', 5),
    padLeft('drain', 8),
    padLeft('secs', 6),
    padLeft('comp', 5),
    padLeft('pieces', 7),
    padLeft('val', 6),
    pad('nags', 10),
    'ends',
  ].join(' ');
  console.log(header);
  console.log('-'.repeat(header.length));
  for (const r of rows) {
    console.log(
      [
        pad(r.level, 4),
        pad(r.id, 21),
        pad(r.stack, 12),
        pad(r.band, 6),
        padLeft(r.tier, 5),
        padLeft(r.drainPerSec, 8),
        padLeft(r.seconds, 6),
        padLeft(r.compactions, 5),
        padLeft(r.pieces, 7),
        padLeft(r.valuation, 6),
        pad(r.nags.join(','), 10),
        r.ends,
      ].join(' '),
    );
  }

  if (flags.suggest) {
    console.log('');
    console.log('suggested drains, from the tier zero reading:');
    for (const r of rows.filter((x) => x.tier === 0)) {
      const want = BAR_BUDGET / Math.max(1, r.seconds);
      const held = r.drainPerSec * r.seconds;
      console.log(
        [
          pad(r.level, 4),
          pad(r.id, 21),
          padLeft(`have ${r.drainPerSec}`, 16),
          padLeft(`want ${want.toFixed(5)}`, 16),
          padLeft(`budget ${held.toFixed(3)}`, 16),
        ].join(' '),
      );
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(2);
});
