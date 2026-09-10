#!/usr/bin/env node
// `pnpm sweep` — every fixture tape at every tier with every bot, one line
// each, and a summary per tier and bot: dead rounds, mean lamps lost, lies
// revealed of lies present. The tier is forced by rewriting the tape header
// the way the band test does; rows and facts are untouched. A development
// tool for tuning the pattern data; the band test is the andon.
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

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
const dir = path.resolve('fixtures/tapes');
const rows = [];
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.tape.json')) continue;
  const tape = loadTape(JSON.parse(readFileSync(path.join(dir, f), 'utf8')));
  const name = f.replace(/\.tape\.json$/, '');
  HEADERS.forEach((hdr, tier) => {
    for (const bot of BOTS) {
      const r = g.playTape({ ...tape, ...hdr }, { fixture: name, bot });
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
for (const r of rows) {
  console.log(
    pad(r.name, 40) +
      pad(r.tier, 5) +
      pad(r.bot, 8) +
      pad(r.lies, 5) +
      pad(r.revealed, 4) +
      pad(r.ended, 6) +
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
