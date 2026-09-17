#!/usr/bin/env node
// `pnpm sweep [--climb 0|1]` — every fixture tape at every tier with every bot, one line
// each, and a summary per tier and bot: dead rounds, mean lamps lost, lies
// revealed of lies present. The tier is forced by rewriting the tape header
// the way the band test does; rows and facts are untouched. A development
// tool for tuning the pattern data; the band test is the andon.
import { readdirSync, readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

import { die, isMain, parseArgv, runMain } from './lib/cli.mjs';
import { bundleModule } from './lib/bundle.mjs';

const USAGE = 'usage: pnpm sweep [--climb 0|1]';
const FLAGS = new Set(['climb']);

/** Scene win (`ended` null) prints `clear`, never the string `null`. */
export function endLabel(ended) {
  return ended == null ? 'clear' : String(ended);
}

/** Parse a tape file; throw a named `fixture …: bad json` (never a stack). */
export function parseTapeFile(file, name) {
  let raw;
  try {
    raw = readFileSync(file, 'utf8');
  } catch {
    throw new Error(`fixture ${name}: unreadable`);
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`fixture ${name}: bad json`);
  }
}

async function main() {
  const { positional, flags } = parseArgv(process.argv.slice(2), FLAGS, { usage: USAGE });
  if (flags.help) {
    console.log(USAGE);
    process.exit(0);
  }
  if (positional.length > 0) die(`unknown argument ${positional[0]}\n${USAGE}`);
  let climb = 0;
  if (flags.climb !== undefined) {
    const n = Number(flags.climb);
    if (!Number.isInteger(n) || n < 0 || n > 1) die(`climb must be 0 or 1 (got ${flags.climb})`);
    climb = n;
  }

  const out = path.resolve('film');
  mkdirSync(out, { recursive: true });
  const g = await bundleModule({
    contents: "export { playTape } from './packages/ghost-on-the-menu/src/play.ts';",
    outDir: out,
    outFile: '.sweep.play.mjs',
    what: 'the cabinet',
  });
  const { loadTape } = await bundleModule({
    contents: "export { loadTape } from './packages/tape-core/src/index.ts';",
    outDir: out,
    outFile: '.sweep.tape.mjs',
    what: 'tape-core',
  });

  const HEADERS = [
    { target_kind: 'fixture', container: null, seat: null },
    {
      target_kind: 'docker',
      container: { image_id: null, name_prefix: null },
      seat: { model: 'sweep', template_sha256: null },
    },
    { target_kind: 'stdio', container: null, seat: null },
  ];
  const BOTS = ['idle', 'sweeper', 'reader'];
  if (climb > 0) console.log(`climb ${climb}`);
  const dir = path.resolve('fixtures/tapes');
  let files = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.tape.json'));
  } catch {
    files = [];
  }
  if (files.length === 0) {
    console.error('no tapes under fixtures/tapes');
    process.exit(2);
  }
  const rows = [];
  for (const f of files) {
    const name = f.replace(/\.tape\.json$/, '');
    let json;
    try {
      json = parseTapeFile(path.join(dir, f), name);
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(2);
    }
    let tape;
    try {
      tape = loadTape(json);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`fixture ${name}: ${msg}`);
      process.exit(2);
    }
    HEADERS.forEach((hdr, tier) => {
      for (const bot of BOTS) {
        const r = g.playTape({ ...tape, ...hdr }, { fixture: name, bot, climb });
        rows.push({
          name,
          tier,
          bot,
          lies: r.lies.length,
          revealed: r.revealed.length,
          ended: r.ended,
          lives: r.lives,
        });
      }
    });
  }
  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad('fixture', 40) + 'tier bot     lies rev end   lives');
  console.log('end: time | lamps | clear');
  for (const r of rows) {
    console.log(
      pad(r.name, 40) +
        pad(r.tier, 5) +
        pad(r.bot, 8) +
        pad(r.lies, 5) +
        pad(r.revealed, 4) +
        pad(endLabel(r.ended), 6) +
        r.lives,
    );
  }
  const agg = new Map();
  for (const r of rows) {
    const k = `${r.tier}/${r.bot}`;
    const a = agg.get(k) ?? { n: 0, lamps: 0, dead: 0, rev: 0, lies: 0 };
    a.n += 1;
    a.lamps += 3 - r.lives;
    a.dead += r.ended === 'lamps' ? 1 : 0;
    a.rev += r.revealed;
    a.lies += r.lies;
    agg.set(k, a);
  }
  console.log('\ntier/bot    tapes dead  mean lost  revealed');
  console.log('lamps: mean lamps lost of 3; revealed: found/present');
  for (const [k, a] of agg) {
    console.log(
      pad(k, 12) +
        pad(a.n, 6) +
        pad(a.dead, 6) +
        pad((a.lamps / a.n).toFixed(2), 10) +
        `${a.rev}/${a.lies}`,
    );
  }
}

if (isMain(import.meta.url)) {
  await runMain(main);
}
