#!/usr/bin/env node
// `pnpm sit --cabinet vibe-typer [--seat pull|mcp] [--model a:cloud,b:cloud]
//           [--levels 3] [--tier 0] [--bot perfect] [--seed 1]
//           [--ollama http://127.0.0.1:11434]`
//
// Sits a model in the endless user's chair (G28 as the slice-3 kickoff
// amends it) and measures what it writes.
//
// Two seats, the same chair. `--seat pull` is the path the shell drives:
// one JSON answer per slot through `askEndlessFor`, gated by the caller.
// `--seat mcp` is slice 4's push path: the model is given the typing
// cabinet's four levers and pulls them itself, and every call is dispatched
// to a real cabinet over the same run. The numbers printed are the same
// numbers either way, plus what only the push path can miss — a model that
// answered in prose and called nothing, and a call by a name off the menu.
//
// Either way: for each level the seat is asked, one slot at a time and in
// wall-clock time so a cloud tag's latency counts, for a request — the ask,
// the code, a title, notes, and a product when the level is new. Every
// answer goes through the same code gate the shell runs, a refusal is
// re-asked, and the accepted ones are fed to the sim the way the shell feeds
// them. Then a typist plays the run.
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

const USAGE = `usage: pnpm sit --cabinet vibe-typer [--seat pull|mcp] [--model a:cloud,b:cloud]
          [--levels 3] [--tier 0|1|2|3] [--bot perfect|typist:wpm[:rate]] [--seed n]
          [--ollama http://127.0.0.1:11434] [--samples 10]`;

const FLAGS = new Set([
  'cabinet',
  'seat',
  'model',
  'levels',
  'tier',
  'bot',
  'seed',
  'ollama',
  'samples',
]);

/** The two seats. `pull` is slice 3's path and stays the default, unchanged. */
const SEATS = new Set(['pull', 'mcp']);

/** Requests per level the ladder asks for; the levers own the real number. */
const DEFAULT_LEVELS = 3;
/** Asks for one slot before that slot goes to the corpus, as the shell does. */
const TRIES = 2;
/** Turns a client gets per slot on the push path before the slot is given up. */
const TURNS = 4;
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
  const seatKind = args.seat ?? 'pull';
  if (!SEATS.has(seatKind)) die(`seat must be pull or mcp (got ${args.seat})`);
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
  // ONE bundle for both packages, not two. The sim keeps a run's buffer in a
  // WeakMap beside the state rather than on it, so two bundles are two
  // WeakMaps: the cabinet's `feedRequests` would look up a state that was
  // made by the other copy, find nothing, and drop every request without a
  // word. Measured on the push path before this was one bundle: six
  // accepted requests, none of them played. Bundling both entries together
  // makes esbuild share the module, and the pull path is unchanged by it —
  // same functions, same numbers.
  const mod = await bundle(
    "export * as vt from './packages/vibe-typer/src/index.ts';\n" +
      "export * as play from './packages/vibe-typer/src/play.ts';\n" +
      "export * as cs from './packages/cabinet-server/src/index.ts';",
    `.sit.${process.pid}.mjs`,
  );
  const vt = { ...mod.vt, botFor: mod.play.botFor, parseBot: mod.play.parseBot, DT: mod.play.DT };
  const cs = mod.cs;

  const parsedBot = vt.parseBot(botSpec);
  if (!parsedBot) die(`unknown bot ${botSpec}; use perfect, idle or typist:wpm[:rate]`);

  for (const model of models) {
    await (seatKind === 'mcp' ? sitMcp(model) : sit(model));
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

  // --- the push path: the model pulls the cabinet's four levers ------------
  //
  // The same chair, driven the other way. The model is given `view`,
  // `product`, `ask` and `react` as tools and, per slot, the text the `view`
  // tool would have returned. Every call it makes is dispatched to a real
  // cabinet over the run being played, so the gates are the shipped gates
  // and the answers are the shipped words. There is no fallback to the pull
  // path here on purpose — a model that answers in prose and pulls nothing
  // is a finding, and papering over it would hide the thing this
  // measurement exists to see.
  //
  // A slot is a few turns, not one. Measured with one: both cloud tags
  // spend their single turn naming a product and never reach `ask`, which is
  // what a client with no memory of its own last call would do. A real
  // client sees what the cabinet answered and goes on, so each turn after
  // the first carries what this slot has pulled so far and what it said.
  async function sitMcp(model) {
    const live = { state: vt.createRun({ seed, tier, endless: true }), seed };
    const { state } = live;
    const bot = vt.botFor(parsedBot, seed);
    const host = cs.vibeHostFor(() => live);
    const cabinet = cs.createVibeCabinet(host);
    const tools = cs.VIBE_CONTRACT;
    const latency = [];
    const refusals = {};
    const byName = {};
    let asked = 0;
    let accepted = 0;
    let suppressed = 0;
    let badNames = 0;
    let transport = '';

    /**
     * One turn: the view (and what this slot has pulled so far) in, whatever
     * levers the model pulls out. Returns true once a request is queued,
     * which ends the slot. A refusal does not end it: the reason word goes
     * back with the rest of the slot's history and the client may correct
     * itself, which is the push path's answer to the pull path's one re-ask.
     */
    async function turn(done) {
      asked += 1;
      const view = cs.vibeSeatPrompt(host.view());
      const user =
        done.length === 0
          ? view
          : `${view}\n\nwhat you have already pulled for this request:\n${done
              .map((line) => `- ${line}`)
              .join('\n')}\n\nnow send the request itself with ask.`;
      let answer;
      try {
        answer = await cs.chatTools(
          { url: `${ollama}/api/chat`, model },
          cs.VIBE_SEAT_SYSTEM,
          user,
          tools,
          // The same room the pull path gives a whole snippet: seven hundred
          // tokens and twenty seconds. The boss seat's three-and-eight is
          // for one verb and times a slow tag out before it writes a line.
          { num_predict: 700, timeoutMs: 20_000 },
        );
      } catch (err) {
        transport = err instanceof Error ? err.message : String(err);
        refusals['no answer'] = (refusals['no answer'] ?? 0) + 1;
        return true;
      }
      latency.push(answer.ms);
      if (answer.calls.length === 0) {
        suppressed += 1;
        refusals['answered in words'] = (refusals['answered in words'] ?? 0) + 1;
        return true;
      }
      let tried = false;
      for (const call of answer.calls) {
        byName[call.name] = (byName[call.name] ?? 0) + 1;
        let r;
        try {
          r = cabinet.call(call.name, call.arguments);
        } catch {
          // A name that was never on the menu. The cabinet throws; the MCP
          // server answers a protocol error. Counted, never followed.
          badNames += 1;
          done.push(`${call.name}, which is not a lever on this cabinet`);
          continue;
        }
        const said = r.content[0]?.text ?? '';
        done.push(`${call.name}, and the cabinet said: ${said}`);
        const why = /refused it \(([^)]+)\)/.exec(said);
        if (call.name === 'ask') {
          if (/queued/.test(said)) {
            accepted += 1;
            tried = true;
          } else {
            const reason = why ? why[1] : /full/.test(said) ? 'the level is full' : 'bad shape';
            refusals[reason] = (refusals[reason] ?? 0) + 1;
          }
        } else if (why) {
          const key = `${call.name}: ${why[1]}`;
          refusals[key] = (refusals[key] ?? 0) + 1;
        }
      }
      return tried;
    }

    /** Fill the next level's buffer, a slot at a time, then play the level. */
    async function fill(levelIndex) {
      const def = vt.endlessPeek({ set: vt.leversOf(state), seed, tier, levelIndex });
      for (let slot = 0; slot < def.requests; slot += 1) {
        if (vt.suppliedCount(state) >= def.requests) break;
        const done = [];
        for (let go = 0; go < TURNS && !(await turn(done)); go += 1);
      }
    }

    function play() {
      const at = state.levelIndex;
      let guard = 0;
      while (!state.over && state.levelIndex === at && guard < 400000) {
        vt.stepRun(state, bot(state), vt.DT);
        guard += 1;
      }
    }

    console.log('');
    console.log(`Vibe Typer, the container tools: ${model}`);
    for (let i = 0; i < levels && !state.over; i += 1) {
      await fill(state.levelIndex + 1);
      play();
    }

    const ms = spread(latency);
    console.log(`sat: ${model} (the four levers)`);
    console.log(`asks: ${asked}`);
    console.log(`accepted: ${accepted}`);
    console.log(`refused by the gate: ${reasonLine(refusals)}`);
    console.log(`answered in prose and pulled nothing: ${suppressed}`);
    console.log(`called a name off the menu: ${badNames}`);
    console.log(`latency per turn: min ${ms.min} ms, middle ${ms.mid} ms, most ${ms.max} ms`);
    console.log(`tool calls by name: ${reasonLine(byName)}`);
    if (transport) console.log(`last transport word: ${transport}`);
    console.log('');
    for (const [i, snippet] of host.accepted.slice(0, samples).entries()) {
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
