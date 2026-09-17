#!/usr/bin/env node
// `node packages/vibe-typer/scripts/sweep-levels.mjs --help`
//
// USAGE below is the one statement of what this script takes. There used to
// be three — this comment, `USAGE`, and whatever `main` happened to read off
// `flags` — and all three disagreed: a lead running `--help` never learned
// `--cap` existed, one reading the header never learned `--json` did, and
// `--capp 100` was accepted in silence and ignored.
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

/** Ticks a single run may take before it is called an overrun. */
const DEFAULT_CAP = 60 * 60 * 90;
/** The seeds a sweep averages over when the caller names none. */
const DEFAULT_SEEDS = '1,2,3';
/** The bot the drains were set with. */
const DEFAULT_BOT = 'typist:40:0.03';

const USAGE = `usage: node packages/vibe-typer/scripts/sweep-levels.mjs [flags]

  --tier 0|1|2|3|all   the tier to sweep; default all, which runs the four
                       readings the drains are set from
  --bot <spec>         idle, perfect or typist:wpm[:rate]; default ${DEFAULT_BOT}
                       (ignored when --tier is all, which pins its own bots)
  --seeds 1,2,3        the seeds every level is run at; default ${DEFAULT_SEEDS}
  --cap <ticks>        ticks one run may take before it is called an overrun;
                       default ${DEFAULT_CAP}
  --suggest            also print the drain each level would want
  --json               print the rows as JSON instead of the table
  --help, -h           this`;

/** Every flag this script takes. Anything else is a halt, not a shrug. */
const VALUE_FLAGS = new Set(['tier', 'bot', 'seeds', 'cap']);
const BARE_FLAGS = new Set(['suggest', 'json']);

function die(why) {
  console.error(`${why}\n${USAGE}`);
  process.exit(2);
}

/** The share of the bar a level is tuned to spend, measured off slice one. */
const BAR_BUDGET = 0.93;

function parseArgv(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') return { help: true };
    if (!a.startsWith('--')) die(`unexpected argument ${a}`);
    const key = a.slice(2);
    if (BARE_FLAGS.has(key)) {
      flags[key] = true;
      continue;
    }
    // An unknown flag is a halt. `--capp 100` used to be taken and ignored,
    // so a lead who mistyped the cap read a sweep at the default and never
    // knew — on the tool the Director's drains are set from.
    if (!VALUE_FLAGS.has(key)) die(`unknown flag --${key}`);
    const next = argv[i + 1];
    if (next === undefined || String(next).startsWith('--')) die(`missing value for --${key}`);
    flags[key] = next;
    i += 1;
  }
  return flags;
}

/**
 * The flags, checked. The sibling runner `scripts/transcript.mjs` refuses an
 * out-of-range tier cleanly and this one passed `--tier 9` through
 * `Number()` into `createRun`; the two now say the same thing.
 */
function readFlags(flags) {
  if (flags.tier !== undefined && flags.tier !== 'all') {
    const tier = Number(flags.tier);
    if (!Number.isInteger(tier) || tier < 0 || tier > 3) {
      die(`tier must be 0..3 or all (got ${flags.tier})`);
    }
  }
  const seeds = String(flags.seeds ?? DEFAULT_SEEDS)
    .split(',')
    .map((x) => Number(x.trim()));
  if (seeds.length === 0 || seeds.some((n) => !Number.isFinite(n))) {
    die(`seeds must be whole numbers, comma separated (got ${flags.seeds})`);
  }
  const cap = Number(flags.cap ?? DEFAULT_CAP);
  if (!Number.isInteger(cap) || cap < 1)
    die(`cap must be a whole number of ticks (got ${flags.cap})`);
  return { seeds, cap };
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
    // `state.built` is a window capped at BUILT_CAP; `pieceCount` is the
    // count that never falls off. A listed level never reaches the cap
    // today, so the old reading was right by luck and not by rule.
    pieces: state.pieceCount,
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
  const { seeds, cap } = readFlags(flags);
  const pkg = await loadPackage();
  const integration = pkg.integrationFrom(path.resolve(ROOT, 'fixtures/tapes'));
  const levels = pkg.DEFAULT_PATTERNS.levels.levels;

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
      : [{ tier: Number(flags.tier), bot: String(flags.bot ?? DEFAULT_BOT) }];

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

  // Three aggregations used to sit in one row with the header saying which
  // for none of them: a reader comparing `comp 6` with `secs 210` was
  // comparing a three-seed total against a one-seed average. `~` is a mean
  // over the seeds, `+` is a sum over them, and a bare column is per seed.
  const header = [
    pad('lvl', 4),
    pad('id', 21),
    pad('stack', 12),
    pad('band', 6),
    padLeft('tier', 5),
    padLeft('drain/s', 8),
    padLeft('secs~', 6),
    padLeft('comp+', 6),
    padLeft('pieces+', 8),
    padLeft('val~', 6),
    pad('nags', 10),
    'ends',
  ].join(' ');
  console.log(header);
  console.log('-'.repeat(header.length));
  console.log(
    `~ mean over ${seeds.length} seed${seeds.length === 1 ? '' : 's'} (${seeds.join(', ')}); ` +
      '+ sum over them; nags and ends are one entry per seed. ' +
      'drain/s is the share of the context bar per second; secs~ is seconds; ' +
      'val~ is the valuation.',
  );
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
        padLeft(r.compactions, 6),
        padLeft(r.pieces, 8),
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
