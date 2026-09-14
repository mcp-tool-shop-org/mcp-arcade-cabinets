#!/usr/bin/env node
// `pnpm sweep [--climb 0|1]` — every fixture tape at every tier with every bot, one line
// each, and a summary per tier and bot: dead rounds, mean lamps lost, lies
// revealed of lies present. The tier is forced by rewriting the tape header
// the way the band test does; rows and facts are untouched. A development
// tool for tuning the pattern data; the band test is the andon.
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const USAGE = 'usage: pnpm sweep [--climb 0|1]';
const FLAGS = new Set(['climb']);

function isMain() {
  const entry = process.argv[1];
  if (!entry) return false;
  const self = fileURLToPath(import.meta.url);
  try {
    if (path.resolve(entry).toLowerCase() === self.toLowerCase()) return true;
  } catch {
    /* ignore */
  }
  return path.basename(entry).toLowerCase() === path.basename(self).toLowerCase();
}

function die(msg, code = 2) {
  console.error(msg);
  process.exit(code);
}

function parseArgv(argv, known) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      flags.help = true;
      continue;
    }
    if (a.startsWith('--')) {
      let key;
      let val;
      const eq = a.indexOf('=');
      if (eq !== -1) {
        key = a.slice(2, eq);
        val = a.slice(eq + 1);
      } else {
        key = a.slice(2);
        const next = argv[i + 1];
        if (next === undefined || String(next).startsWith('-')) {
          die(`missing value for --${key}\n${USAGE}`);
        }
        val = next;
        i += 1;
      }
      if (!known.has(key)) die(`unknown flag --${key}\n${USAGE}`);
      flags[key] = val;
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

/** Scene win (`ended` null) prints `clear`, never the string `null`. */
export function endLabel(ended) {
  return ended == null ? 'clear' : String(ended);
}

async function main() {
  const { positional, flags } = parseArgv(process.argv.slice(2), FLAGS);
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
  async function bundle(contents, file) {
    const r = await build({
      stdin: { contents, resolveDir: process.cwd(), loader: 'ts' },
      bundle: true,
      platform: 'node',
      format: 'esm',
      write: false,
      logLevel: 'warning',
    });
    const p = path.resolve(out, file);
    writeFileSync(p, r.outputFiles[0].text);
    return import(pathToFileURL(p).href);
  }
  const g = await bundle(
    "export { playTape } from './packages/ghost-on-the-menu/src/play.ts';",
    '.sweep.play.mjs',
  );
  const { loadTape } = await bundle(
    "export { loadTape } from './packages/tape-core/src/index.ts';",
    '.sweep.tape.mjs',
  );

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
    const tape = loadTape(JSON.parse(readFileSync(path.join(dir, f), 'utf8')));
    const name = f.replace(/\.tape\.json$/, '');
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
  console.log('\ntier/bot    tapes dead  lamps  revealed');
  for (const [k, a] of agg) {
    console.log(
      pad(k, 12) +
        pad(a.n, 6) +
        pad(a.dead, 6) +
        pad((a.lamps / a.n).toFixed(2), 7) +
        `${a.rev}/${a.lies}`,
    );
  }
}

if (isMain()) {
  await main();
}
