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
  --reach              print which snippets each mode can actually draw and
                       run nothing else; it needs no runs, so it is quick
  --milestones         print which rungs of the scoreboard ladder each mode
                       and tier crosses, and run nothing else
  --json               print the rows as JSON instead of the table
  --help, -h           this`;

/** Every flag this script takes. Anything else is a halt, not a shrug. */
const VALUE_FLAGS = new Set(['tier', 'bot', 'seeds', 'cap']);
const BARE_FLAGS = new Set(['suggest', 'json', 'reach', 'milestones']);

function die(why) {
  console.error(`${why}\n${USAGE}`);
  process.exit(2);
}

/** The share of the bar a level is tuned to spend, measured off slice one. */
const BAR_BUDGET = 0.93;

/** One line break. The reports below join their rows with it. */
const NEWLINE = String.fromCharCode(10);

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
  const milestones = [];
  while (!state.over && ticks < cap) {
    ticks += 1;
    pkg.stepRun(state, drive(state), pkg.DT);
    for (const e of state.events) {
      if (e.kind === 'compaction') compactions += 1;
      else if (e.kind === 'message' && e.nag === true) nags += 1;
      // Which rungs of the scoreboard ladder this run crossed, in the order
      // it crossed them. `--milestones` is the only reader today.
      else if (e.kind === 'milestone') milestones.push(e.name);
    }
  }
  return {
    seconds: ticks * pkg.DT,
    compactions,
    nags,
    milestones,
    // `state.built` is a window capped at BUILT_CAP; `pieceCount` is the
    // count that never falls off. A listed level never reaches the cap
    // today, so the old reading was right by luck and not by rule.
    pieces: state.pieceCount,
    valuation: state.valuation,
    ended: state.ended ?? (ticks >= cap ? 'overrun' : null),
  };
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

/**
 * The reach report: which of the authored snippets each mode can actually
 * draw.
 *
 * Two hundred and forty-nine snippets are authored, each with its own ask and
 * its own reaction written beside it. The sixteen listed levels pin fifty-six
 * ids between them and their band ranges top out at five to five, so the
 * snippets in bands six and seven appear in no listed level at all and are
 * reachable only through the endless ladder, which starts at band one and
 * climbs one band every two levels — six levels for a clean ninety-word
 * typist and two for a forty-word one, by the fairness band's own bar. The
 * next authoring run should write for bands a player will see, and until
 * this was printed nowhere there was no way to know which those are.
 *
 * It counts what a mode CAN draw, not what one evening does draw, and it
 * needs no runs at all.
 */
const CLIMB = 8;

function share(n, total) {
  return `${Math.round((n / Math.max(1, total)) * 100)} percent`;
}

function listedReach(pkg, corpus) {
  const ids = new Set();
  for (const def of pkg.DEFAULT_PATTERNS.levels.levels) {
    for (const id of def.snippets ?? []) ids.add(id);
    for (const s of pkg.inBand(corpus, def.stack, def.bandMin, def.bandMax)) ids.add(s.id);
  }
  return ids;
}

function endlessReach(pkg, corpus, startBand, levels = CLIMB) {
  const ids = new Set();
  for (let i = 0; i < levels; i += 1) {
    const bands = pkg.endlessBandAt(pkg.DEFAULT_PATTERNS, i, startBand);
    // An endless level draws its stack at random, so every stack is in reach.
    for (const stack of pkg.CORPUS_STACKS) {
      for (const s of pkg.inBand(corpus, stack, bands.bandMin, bands.bandMax)) ids.add(s.id);
    }
  }
  return ids;
}

/**
 * The milestone report: which rungs of the scoreboard's ladder each mode and
 * tier actually crosses.
 *
 * The ladder's named rungs each have a card drawn and shipped for them — seed,
 * Series A, unicorn — and until this was printed nowhere, nothing in the repo
 * said whether any mode reaches the top two at all: the two whole-run prints
 * on record closed at fifty-four and a hundred and seventy-nine against a top
 * rung at eighteen hundred. `test/band.test.ts` holds the bars — the ladder
 * is climbed in order, a rung is never claimed above the valuation that paid
 * for it, and the clean ninety in endless crosses all of it. This is the
 * reading a lead takes to the Director before the ladder, or the question of
 * carrying a run across levels, is decided. Neither is decided here.
 */
function milestoneRows(pkg, integration, { seeds, cap }) {
  const ladder = pkg.DEFAULT_PATTERNS.score.milestones;
  const levels = pkg.DEFAULT_PATTERNS.levels.levels;
  const rows = [
    `the ladder: ${ladder.map((m) => `${m.name} at ${m.at}`).join(' · ')}`,
    '',
    `${pad('mode', 42)} ${pad('rungs crossed', 26)} valuation`,
  ];
  for (const tier of [0, 1, 2, 3]) {
    const bot = tier === 3 ? 'perfect' : DEFAULT_BOT;
    let best = [];
    let top = 0;
    for (const [i] of levels.entries()) {
      for (const seed of seeds) {
        const out = runOne(pkg, integration, { level: i, tier, bot, seed, cap });
        if (out.milestones.length > best.length) best = out.milestones;
        top = Math.max(top, out.valuation);
      }
    }
    rows.push(
      `${pad(`listed · tier ${tier} · ${bot}`, 42)} ${pad(best.join(', ') || 'none', 26)} ` +
        `best level ${Math.round(top)}`,
    );
  }
  for (const bot of [DEFAULT_BOT, 'perfect']) {
    for (const seed of seeds) {
      const state = driveEndless(pkg, integration, { tier: 0, bot, seed, cap });
      const crossed = state.milestones.join(', ') || 'none';
      rows.push(
        `${pad(`endless · tier 0 · ${bot} · seed ${seed}`, 42)} ${pad(crossed, 26)} ` +
          `${Math.round(state.valuation)} over ${state.levelIndex + 1} levels`,
      );
    }
  }
  return rows;
}

/** One endless run to its end, handed back whole. That ladder has no levels. */
function driveEndless(pkg, integration, { tier, bot, seed, cap }) {
  const state = pkg.createRun({ seed, tier, endless: true, integration });
  const drive = pkg.botFor(pkg.parseBot(bot), seed);
  let ticks = 0;
  while (!state.over && ticks < cap) {
    ticks += 1;
    pkg.stepRun(state, drive(state), pkg.DT);
  }
  return state;
}

function reachRows(pkg, corpus) {
  const total = corpus.snippets.length;
  const byBand = new Map();
  for (const s of corpus.snippets) byBand.set(s.band, (byBand.get(s.band) ?? 0) + 1);
  const bandLine = [...byBand.keys()]
    .sort((a, b) => a - b)
    .map((b) => `band ${b}: ${byBand.get(b)}`)
    .join(' · ');
  const rows = [
    `the corpus holds ${total} snippets, the tapes included`,
    bandLine,
    '',
    `${pad('mode', 34)} ${padLeft('ids in reach', 13)}  share of the corpus`,
  ];
  const listed = listedReach(pkg, corpus);
  rows.push(
    `${pad('the sixteen listed levels', 34)} ${padLeft(listed.size, 13)}  ${share(listed.size, total)}`,
  );
  for (let rung = 1; rung <= 7; rung += 1) {
    const ids = endlessReach(pkg, corpus, rung);
    const bands = pkg.endlessBandAt(pkg.DEFAULT_PATTERNS, 0, rung);
    const name = `endless from rung ${rung} (bands ${bands.bandMin}-${bands.bandMax} up)`;
    rows.push(`${pad(name, 34)} ${padLeft(ids.size, 13)}  ${share(ids.size, total)}`);
  }
  const shipped = pkg.DEFAULT_PATTERNS.levels.endless.startBand;
  const everywhere = new Set(listed);
  for (const id of endlessReach(pkg, corpus, shipped)) everywhere.add(id);
  const unseen = corpus.snippets.filter((s) => !everywhere.has(s.id));
  rows.push('');
  rows.push(
    `${unseen.length} snippets sit outside the listed levels AND outside a ladder started at ` +
      `the shipped rung over ${CLIMB} levels`,
  );
  if (unseen.length > 0) {
    const bands = new Map();
    for (const s of unseen) bands.set(s.band, (bands.get(s.band) ?? 0) + 1);
    rows.push(
      `  they are in ${[...bands.keys()]
        .sort((a, b) => a - b)
        .map((b) => `band ${b}: ${bands.get(b)}`)
        .join(' · ')}`,
    );
  }
  return rows;
}

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

  // The reach report runs nothing, so it answers on its own and returns
  // rather than making a lead sit through four tiers of play-throughs to
  // read a count of ids.
  if (flags.reach) {
    const corpus = pkg.withIntegration(pkg.DEFAULT_CORPUS, integration);
    console.log(reachRows(pkg, corpus).join(NEWLINE));
    return;
  }

  // The milestone report drives runs, so it says which: the readings the
  // drains are set from over the listed levels, and the two endless bots the
  // fairness band measures.
  if (flags.milestones) {
    console.log(milestoneRows(pkg, integration, { seeds, cap }).join(NEWLINE));
    return;
  }

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
