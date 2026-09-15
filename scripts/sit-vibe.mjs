#!/usr/bin/env node
// `pnpm sit --cabinet vibe-typer [--model a:cloud,b:cloud] [--levels 3] [--tier 0]
//           [--bot perfect] [--seed 1] [--ollama http://127.0.0.1:11434]`
//
// Sits a model in the endless user's chair (G28 as the slice-3 kickoff
// amends it) and measures what it writes. For each level the seat is asked,
// one slot at a time and in wall-clock time so a cloud tag's latency counts,
// for a request: the ask, the code, a title, notes, and a product when the
// level is new. Every answer goes through the same code gate the shell runs,
// a refusal is re-asked once, and the accepted ones are fed to the sim the
// way the shell feeds them. Then a perfect typist plays the run.
//
// What it prints: which model and tier sat, how many asks were made, how
// many were accepted, the refusals by gate reason, the latency per request,
// ten sampled asks with their code for the Director to read, and the run's
// own summary.
//
// A development tool. Nothing here is a test, nothing here is on screen, and
// nothing here writes to the repo.
import path from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const USAGE = `usage: pnpm sit --cabinet vibe-typer [--model a:cloud,b:cloud] [--levels 3]
          [--tier 0|1|2|3] [--bot perfect|typist:wpm[:rate]] [--seed n]
          [--ollama http://127.0.0.1:11434] [--samples 10]`;

const FLAGS = new Set(['cabinet', 'model', 'levels', 'tier', 'bot', 'seed', 'ollama', 'samples']);

/** Requests per level the ladder asks for; the levers own the real number. */
const DEFAULT_LEVELS = 3;
/** Asks for one slot before that slot goes to the corpus, as the shell does. */
const TRIES = 2;
/** Asks the seat is shown so it does not repeat itself. */
const RECENT = 3;
/** Weak pairs the seat is told about. */
const WEAK = 8;

function die(msg, code = 2) {
  console.error(msg);
  process.exit(code);
}

function parseArgv(argv) {
  const flags = {};
  const positional = [];
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
        if (next === undefined || String(next).startsWith('-'))
          die(`missing value for --${key}\n${USAGE}`);
        val = next;
        i += 1;
      }
      if (!FLAGS.has(key)) die(`unknown flag --${key}\n${USAGE}`);
      flags[key] = val;
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

/** min / median / max of a list of milliseconds, in whole milliseconds. */
export function spread(list) {
  if (list.length === 0) return { min: 0, mid: 0, max: 0 };
  const sorted = [...list].sort((a, b) => a - b);
  const mid = sorted[Math.floor((sorted.length - 1) / 2)];
  return {
    min: Math.round(sorted[0]),
    mid: Math.round(mid),
    max: Math.round(sorted[sorted.length - 1]),
  };
}

/** Refusal reasons as one line, commonest first. Empty is `none`. */
export function reasonLine(counts) {
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (rows.length === 0) return 'none';
  return rows.map(([reason, n]) => `${reason} ${n}`).join(', ');
}

export async function main(argv) {
  const { flags: args, positional } = parseArgv(argv);
  if (args.help) {
    console.log(USAGE);
    return;
  }
  if (positional.length > 0) die(`unknown argument ${positional[0]}\n${USAGE}`);
  const tier = args.tier === undefined ? 0 : Number(args.tier);
  if (!Number.isInteger(tier) || tier < 0 || tier > 3) die(`tier must be 0..3 (got ${args.tier})`);
  const levels = args.levels === undefined ? DEFAULT_LEVELS : Number(args.levels);
  if (!Number.isInteger(levels) || levels < 1)
    die(`levels must be a whole number (got ${args.levels})`);
  const samples = args.samples === undefined ? 10 : Number(args.samples);
  if (!Number.isInteger(samples) || samples < 0) die(`samples must be a whole number`);
  const seed = args.seed === undefined ? 1 : Number(args.seed);
  if (!Number.isFinite(seed)) die(`seed must be a number (got ${args.seed})`);
  const botSpec = args.bot ?? 'perfect';
  const ollama = (args.ollama ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
  const models = String(args.model ?? 'qwen3-coder:480b-cloud')
    .split(',')
    .map((m) => m.trim())
    .filter((m) => m !== '');
  if (models.length === 0) {
    console.log('no model named, nothing to sit');
    return;
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
  const vt = await bundle(
    "export * from './packages/vibe-typer/src/index.ts'; export { botFor, parseBot, DT } from './packages/vibe-typer/src/play.ts';",
    `.sit.${process.pid}.vibe.mjs`,
  );
  const cs = await bundle(
    "export * from './packages/cabinet-server/src/index.ts';",
    `.sit.${process.pid}.cabinet.mjs`,
  );

  const parsedBot = vt.parseBot(botSpec);
  if (!parsedBot) die(`unknown bot ${botSpec}; use perfect, idle or typist:wpm[:rate]`);

  for (const model of models) {
    await sit(model);
  }

  async function sit(model) {
    const state = vt.createRun({ seed, tier, endless: true });
    const corpus = vt.corpusOf(state);
    const levers = vt.leversOf(state);
    const bot = vt.botFor(parsedBot, seed);
    const latency = [];
    const refusals = {};
    const accepted = [];
    let asked = 0;
    let tiersSeen = '';
    let modelSeen = '';
    let transport = '';

    /** One ask for one slot, gated. Returns the snippet or null. */
    async function askOne(def, view) {
      asked += 1;
      let answer;
      try {
        answer = await cs.askEndlessFor(view, {
          anthropicKey: process.env.ANTHROPIC_API_KEY ?? null,
          ollamaUrl: `${ollama}/api/chat`,
          models: [model],
        });
      } catch (err) {
        transport = err instanceof Error ? err.message : String(err);
        refusals['no answer'] = (refusals['no answer'] ?? 0) + 1;
        return null;
      }
      latency.push(answer.ms);
      tiersSeen = answer.tier;
      modelSeen = answer.model;
      if (!answer.request) {
        const why = answer.suppressed ? 'answered in words' : 'no request';
        refusals[why] = (refusals[why] ?? 0) + 1;
        return null;
      }
      const gated = vt.gateCode(answer.request, {
        stack: def.stack,
        bandMin: def.bandMin,
        bandMax: def.bandMax,
        corpus,
        set: levers.difficulty,
        tolerance: vt.VALUE_TOLERANCE,
      });
      if (!gated.ok) {
        const why = gated.detail ? `${gated.reason} (${gated.detail})` : gated.reason;
        refusals[why] = (refusals[why] ?? 0) + 1;
        return null;
      }
      return gated;
    }

    /** Fill the buffer for one level, one slot at a time, re-asking once. */
    async function fill(levelIndex) {
      const def = vt.endlessPeek({ set: levers, seed, tier, levelIndex });
      let product;
      for (let slot = 0; slot < def.requests; slot += 1) {
        const have = vt.suppliedCount(state);
        let got = null;
        for (let go = 0; go < TRIES && !got; go += 1) {
          got = await askOne(def, {
            product: vt.planOf(state).product,
            stack: def.stack,
            bandMin: def.bandMin,
            bandMax: def.bandMax,
            recent: [
              ...vt.suppliedAsks(state),
              ...state.chat.filter((line) => line.who === 'user').map((line) => line.line),
            ].slice(-RECENT),
            weak: Object.entries(state.weakBigrams)
              .filter(([, n]) => n > 0)
              .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
              .slice(0, WEAK)
              .map(([pair]) => pair),
            newLevel: have === 0 && slot === 0,
          });
        }
        if (!got) continue;
        if (got.product && product === undefined) product = got.product;
        accepted.push(got.snippet);
        vt.feedRequests(state, [got.snippet], product);
      }
    }

    /** Play until the level in hand is finished, or the run ends. */
    function play() {
      const at = state.levelIndex;
      let guard = 0;
      while (!state.over && state.levelIndex === at && guard < 400000) {
        vt.stepRun(state, bot(state), vt.DT);
        guard += 1;
      }
    }

    console.log('');
    console.log(`Vibe Typer, the endless seat: ${model}`);
    for (let i = 0; i < levels && !state.over; i += 1) {
      await fill(state.levelIndex + 1);
      play();
    }

    const ms = spread(latency);
    console.log(`sat: ${modelSeen || model} (${tiersSeen || 'no seat'})`);
    console.log(`asks: ${asked}`);
    console.log(`accepted: ${accepted.length}`);
    console.log(`refused by the gate: ${reasonLine(refusals)}`);
    console.log(`latency per request: min ${ms.min} ms, middle ${ms.mid} ms, most ${ms.max} ms`);
    if (transport) console.log(`last transport word: ${transport}`);
    console.log('');
    const shown = accepted.slice(0, samples);
    for (const [i, snippet] of shown.entries()) {
      console.log(`--- sample ${i + 1} (${snippet.stack}, band ${snippet.band}) ---`);
      console.log(`ask:   ${snippet.ask ?? ''}`);
      console.log(`title: ${snippet.title}`);
      for (const line of snippet.code.split('\n')) console.log(`  ${line}`);
      if (snippet.notes.length > 0) console.log(`notes: ${snippet.notes.join(' / ')}`);
      console.log('');
    }
    const seated = state.used.filter((id) => String(id).startsWith('seat-')).length;
    console.log(`the run: ${state.ended ?? 'still going, the levels asked for are done'}`);
    console.log(`levels: ${state.levelIndex + 1}`);
    console.log(`valuation: ${Math.round(state.valuation)}`);
    console.log(`pieces: ${state.built.length}`);
    console.log(`requests the seat wrote and the run played: ${seated} of ${state.used.length}`);
  }
}

if (process.argv[1] && path.basename(process.argv[1]).toLowerCase() === 'sit-vibe.mjs') {
  await main(process.argv.slice(2));
}
