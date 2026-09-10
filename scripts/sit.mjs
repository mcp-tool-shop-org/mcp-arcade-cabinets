#!/usr/bin/env node
// `pnpm sit [--model gpt-oss:120b-cloud] [--fixture naive-ndjson] [--tier 1] [--bot sweeper]
//           [--url http://127.0.0.1:11434/api/generate] [--speed 1] [--lamps keep|lose]`
// Sits an Ollama model in the boss seat and the voice seat on a scripted
// round, in wall-clock time so a Cloud tag's latency counts, and prints what
// the seat did: the verb per beat and what the sim made of it, the line each
// boss picked, the retries, the fallbacks. The same frozen prompts the shell
// sends; nothing here sees a fact. A development tool: nothing here is a
// test, and nothing here is on screen.
import path from 'node:path';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const args = {};
const rest = process.argv.slice(2);
for (let i = 0; i < rest.length; i += 2) args[rest[i].replace(/^--/, '')] = rest[i + 1];
const fixture = args.fixture ?? 'naive-ndjson';
const botName = args.bot ?? 'sweeper';
const tier = args.tier === undefined ? 1 : Number(args.tier);
const model = args.model ?? 'gpt-oss:120b-cloud';
const url = args.url ?? 'http://127.0.0.1:11434/api/generate';
const speed = Number(args.speed ?? 1);
// `keep` tops the lamps up every frame so every boss on the tape is sat;
// `lose` lets the bot die the way a player would.
const lamps = args.lamps ?? 'keep';

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
  "export * from './packages/ghost-on-the-menu/src/index.ts'; export { botFor } from './packages/ghost-on-the-menu/src/play.ts';",
  `.sit.${process.pid}.ghost.mjs`,
);
const { loadTape } = await bundle(
  "export { loadTape } from './packages/tape-core/src/index.ts';",
  `.sit.${process.pid}.tape.mjs`,
);

const tape = loadTape(
  JSON.parse(readFileSync(path.resolve('fixtures/tapes', `${fixture}.tape.json`), 'utf8')),
);
const round = g.prepassRound(tape, { seconds: g.DEFAULT_SECONDS, tier });
const state = g.createRoundState(round);
const bot = g.botFor(botName, round);
const patterns = g.attachedPatterns(round);
const opts = { url, model };

const DT = 1 / 30;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const beats = [];
const lines = [];
const asked = new Set();
let pending = null;
let fallbacks = 0;

function askLines() {
  for (const wave of [state.wave, state.wave + 1]) {
    if (asked.has(wave)) continue;
    const bound = round.waveBounds[wave];
    if (!bound) continue;
    const kind = g.bossKindFor(bound.atom);
    if (!kind) continue;
    asked.add(wave);
    const t0 = Date.now();
    g.askOllamaLine(kind, patterns.voice.boss[kind], opts)
      .then((index) => {
        lines.push({ wave, kind, index, ms: Date.now() - t0, at: state.t });
        if (index !== null) state.bossLine = { wave, kind, index };
      })
      .catch((err) => {
        lines.push({ wave, kind, index: null, ms: Date.now() - t0, at: state.t, err: String(err) });
      });
  }
}

function askBoss(input) {
  const boss = state.boss;
  const view = {
    kind: boss.kind,
    hp: g.hpWord(boss.hp, boss.maxHp),
    column: g.columnWord(state.player.x, g.FIELD.width),
    stick: g.stickWord(input),
    motion: boss.motion,
  };
  const t0 = Date.now();
  const askedAt = state.t;
  pending = g
    .askOllama(view, opts)
    .then((intent) => {
      if (!state.boss || !state.boss.alive) return;
      state.bossIntent = intent;
      if (intent === 'script') fallbacks += 1;
      beats.push({
        t: askedAt,
        ms: Date.now() - t0,
        view,
        intent,
        origin: state.boss.x,
        low: g.needsLowThink(model),
      });
    })
    .catch((err) => {
      fallbacks += 1;
      beats.push({ t: askedAt, ms: Date.now() - t0, view, intent: `error ${err.message}` });
    })
    .finally(() => {
      pending = null;
    });
}

const spentAt = [];
console.log(
  `sit ${model} on ${fixture} tier ${round.tier} bot ${botName} speed ${speed} lamps ${lamps}`,
);
const wall0 = Date.now();
while (!state.scene) {
  const input = bot(state);
  if (lamps === 'keep') state.lives = state.maxLives;
  const had = state.bossIntent;
  const bossBefore = state.boss ? { x: state.boss.x, shots: state.enemyShots.length } : null;
  g.stepRound(state, input, DT);
  askLines();
  if (had !== null && state.bossIntent === null && bossBefore && state.boss) {
    // The sim spent the verb this frame: record what it became.
    const added = state.enemyShots.length - bossBefore.shots;
    spentAt.push({ t: state.t, intent: had, added, lean: bossBefore.x, fog: state.fog !== null });
  }
  if (state.boss && state.boss.alive && !pending && state.bossIntent === null) askBoss(input);
  await sleep((DT * 1000) / speed);
}
const wall = ((Date.now() - wall0) / 1000).toFixed(0);

const pad = (s, n) => String(s).padEnd(n);
console.log(
  `\nround ended by ${state.ended} after ${state.t.toFixed(0)}s of round, ${wall}s of wall`,
);
console.log('\nvoice seat (the line each boss said, picked from its own set in voice.json)');
for (const l of lines) {
  const line = l.index === null ? '(seed line)' : patterns.voice.boss[l.kind][l.index];
  console.log(
    `  wave ${l.wave} ${pad(l.kind, 10)} ${pad(l.ms + 'ms', 8)} ${line}${l.err ? ' ' + l.err : ''}`,
  );
}
console.log('\nboss seat (asked at round t, answered after ms, the verb, what the sim made of it)');
const byKind = new Map();
for (const b of beats) {
  const spent = spentAt.find((s) => s.intent === b.intent && s.t >= b.t && !s.used);
  if (spent) spent.used = true;
  const made = spent
    ? `${spent.added} shot${spent.added === 1 ? '' : 's'}${spent.fog ? ', fog' : ''}, boss x ${spent.lean.toFixed(0)}`
    : '(not spent: boss gone or round over)';
  console.log(
    `  ${pad(b.t.toFixed(1) + 's', 7)} ${pad(b.view.kind, 10)} ${pad(b.view.hp, 5)} ship ${pad(b.view.column, 7)} stick ${pad(b.view.stick, 6)} motion ${pad(b.view.motion, 13)} ${pad(b.ms + 'ms', 7)} ${pad(b.intent, 8)} ${made}`,
  );
  const k = byKind.get(b.view.kind) ?? new Map();
  k.set(b.intent, (k.get(b.intent) ?? 0) + 1);
  byKind.set(b.view.kind, k);
}
console.log('\nverbs per boss');
for (const [kind, verbs] of byKind) {
  console.log(`  ${pad(kind, 10)} ${[...verbs].map(([v, n]) => `${v} ${n}`).join(', ')}`);
}
const ms = beats.map((b) => b.ms);
const mean = ms.length ? (ms.reduce((a, b) => a + b, 0) / ms.length).toFixed(0) : '-';
console.log(
  `\n${beats.length} beats asked, ${fallbacks} scripted fallbacks, mean ${mean}ms, low-think ${g.needsLowThink(model) ? 'yes' : 'no'}`,
);
