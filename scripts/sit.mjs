#!/usr/bin/env node
// `pnpm sit [--model a:cloud,b:cloud] [--fixture naive-ndjson] [--tier 1] [--bot sweeper]
//           [--seat mcp|prompt] [--constrain on|off] [--say on|off] [--voice auto|on|off]
//           [--ollama http://127.0.0.1:11434] [--voice-url http://127.0.0.1:7788]
//           [--speed 1] [--lamps keep|lose]`
// Sits a model in the boss seat (and the say seat) on a scripted round, in
// wall-clock time so a Cloud tag's latency counts, and prints what the seat
// did. `--seat mcp` (the default) drives the cabinet server's own tool
// contract in-process, with tool calling and the schema path enabled
// together, and reports per model: verb collapse (share of beats on the
// most common verb), tool suppression (beats where the model answered but
// called no tool), bad verbs, late answers, revoked prefetches, and what
// the say gate refused and how often. `--seat prompt` is the v0.4.0 bare
// prompt path, kept so the old numbers stay reproducible. Nothing here sees
// a fact. A development tool: nothing here is a test, nothing is on screen.
import path from 'node:path';
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const USAGE = `usage: pnpm sit [--model a:cloud,b:cloud] [--fixture name] [--tier 0|1|2|3] [--bot idle|sweeper|reader]
          [--seat mcp|prompt] [--constrain on|off] [--say on|off] [--voice auto|on|off]
          [--ollama http://127.0.0.1:11434] [--voice-url http://127.0.0.1:7788]
          [--speed 1] [--lamps keep|lose] [--tapes dir]`;
const BOTS = ['idle', 'sweeper', 'reader'];
const FLAGS = new Set([
  'model',
  'fixture',
  'tier',
  'bot',
  'seat',
  'constrain',
  'say',
  'voice',
  'ollama',
  'speed',
  'lamps',
  'voice-url',
  'tapes',
]);
/** Same needles as ghost-on-the-menu listPilotModels. Never POST these. */
export const SKIP_MODEL = /embed|nomic|translategemma|jam-ft|grader|aya-expanse|qwen3\.6:latest/i;

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

function listTapeNames(dir) {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.tape.json'))
      .map((f) => f.replace(/\.tape\.json$/, ''));
  } catch {
    return [];
  }
}

/** `--tapes` wins; else `CABINET_TAPES_USER`. Overlay adds to the baked twenty. */
export function overlayDir(flags = {}, env = process.env) {
  if (flags && flags.tapes) return String(flags.tapes);
  return env.CABINET_TAPES_USER ? String(env.CABINET_TAPES_USER) : '';
}

export function tapeRoster(overlay) {
  const names = new Set(listTapeNames(path.resolve('fixtures/tapes')));
  if (overlay) for (const n of listTapeNames(overlay)) names.add(n);
  return [...names].sort();
}

export function resolveTapeFile(name, overlay) {
  if (overlay) {
    const p = path.join(overlay, `${name}.tape.json`);
    if (existsSync(p)) return p;
  }
  const baked = path.resolve('fixtures/tapes', `${name}.tape.json`);
  if (existsSync(baked)) return baked;
  return null;
}

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

/** Scene win (`ended` null) prints `clear`, never the string `null`. */
export function endLabel(ended) {
  return ended == null ? 'clear' : String(ended);
}

/** Whole GATE_FIX parenthetical, not the first word. */
export function gateFromSay(text) {
  const m = /refused it \(([^)]+)\)/.exec(String(text ?? ''));
  return m ? m[1] : 'ok';
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

export function isCloudTag(name) {
  return /:cloud$|-cloud$/.test(String(name ?? ''));
}

/** Cloud tags first. SKIP_MODEL never listed, so it is never POSTed. */
export function sitModels(names) {
  const keep = [...(names ?? [])].filter((n) => String(n).trim() !== '' && !SKIP_MODEL.test(n));
  keep.sort((a, b) => {
    const ac = isCloudTag(a) ? 0 : 1;
    const bc = isCloudTag(b) ? 0 : 1;
    if (ac !== bc) return ac - bc;
    return String(a).localeCompare(String(b));
  });
  return keep;
}

export function nextVerbLine(prefetchAdmitted, thisBeatAsked) {
  return `next-verb: ${Number(prefetchAdmitted) || 0} prefetch-admitted / ${Number(thisBeatAsked) || 0} this-beat-asked`;
}

export function timeoutToScriptLine(timeout, asked) {
  void asked;
  return `timeout-to-script: ${Number(timeout) || 0} of asked`;
}

export function cloudLine(listed) {
  const names = Array.isArray(listed) ? listed : [];
  if (names.length === 0) {
    return 'cloud: listed Cloud tags first, SKIP_MODEL never POSTed, empty roster is no-seat';
  }
  return 'cloud: listed Cloud tags first, SKIP_MODEL never POSTed';
}

export function skipSentence(name) {
  return `${name} is SKIP_MODEL, never POSTed`;
}

export function emptyRosterSentence() {
  return 'empty roster is no-seat';
}

/**
 * Which cabinet is being sat, and the argv with that flag taken out. Read
 * before anything else, because the typing cabinet's own flags are not this
 * file's flags and `parseArgv` halts on a flag it does not know. Ghost is
 * the default and its path below is unchanged, byte for byte.
 */
export function readCabinet(argv) {
  const rest = [];
  let cabinet = 'ghost';
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--cabinet') {
      cabinet = argv[i + 1] ?? '';
      i += 1;
      continue;
    }
    if (a.startsWith('--cabinet=')) {
      cabinet = a.slice('--cabinet='.length);
      continue;
    }
    rest.push(a);
  }
  return { cabinet, rest };
}

async function main() {
  const { cabinet, rest: argvRest } = readCabinet(process.argv.slice(2));
  if (cabinet === 'vibe-typer') {
    const m = await import('./sit-vibe.mjs');
    await m.main(argvRest);
    return;
  }
  if (cabinet !== 'ghost') die(`unknown cabinet ${cabinet}; use ghost or vibe-typer`);
  const { positional, flags: args } = parseArgv(argvRest, FLAGS);
  if (args.help) {
    console.log(USAGE);
    process.exit(0);
  }
  if (positional.length > 0) die(`unknown argument ${positional[0]}\n${USAGE}`);
  if (args.bot !== undefined && !BOTS.includes(args.bot)) {
    die(`unknown bot ${args.bot}; use idle, sweeper or reader`);
  }
  if (args.tier !== undefined) {
    const n = Number(args.tier);
    if (!Number.isInteger(n) || n < 0 || n > 3) die(`tier must be 0..3 (got ${args.tier})`);
  }
  const seatKind = args.seat ?? 'mcp';
  if (seatKind !== 'mcp' && seatKind !== 'prompt') {
    die(`unknown seat ${seatKind}; use prompt or mcp`);
  }
  const lamps = args.lamps ?? 'keep';
  if (lamps !== 'keep' && lamps !== 'lose') {
    die(`unknown lamps ${lamps}; use keep or lose`);
  }
  const voiceArg = args.voice ?? 'auto';
  if (voiceArg !== 'auto' && voiceArg !== 'on' && voiceArg !== 'off') {
    die(`unknown voice ${voiceArg}; use auto, on or off`);
  }
  const constrainRaw = args.constrain ?? 'on';
  if (constrainRaw !== 'on' && constrainRaw !== 'off') {
    die(`unknown constrain ${constrainRaw}; use on or off`);
  }
  const sayRaw = args.say ?? 'on';
  if (sayRaw !== 'on' && sayRaw !== 'off') {
    die(`unknown say ${sayRaw}; use on or off`);
  }
  const speed = Number(args.speed ?? 1);
  if (!Number.isFinite(speed) || speed <= 0) {
    die(`speed must be a positive number (got ${args.speed})`);
  }
  const rawModels = String(args.model ?? 'gpt-oss:120b-cloud')
    .split(',')
    .map((m) => m.trim())
    .filter((m) => m !== '');
  for (const m of rawModels) {
    if (SKIP_MODEL.test(m)) console.log(skipSentence(m));
  }
  const models = sitModels(rawModels);
  console.log(cloudLine(models));
  if (models.length === 0) {
    console.log(emptyRosterSentence());
    process.exit(0);
  }
  const overlay = overlayDir(args);
  const fixture = args.fixture ?? 'naive-ndjson';
  const tapeFile = resolveTapeFile(fixture, overlay);
  if (!tapeFile) {
    console.error(`unknown fixture ${fixture}; have: ${tapeRoster(overlay).join(', ')}`);
    process.exit(2);
  }
  let tapeJson;
  try {
    tapeJson = parseTapeFile(tapeFile, fixture);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(2);
  }
  const botName = args.bot ?? 'sweeper';
  const tier = args.tier === undefined ? 1 : Number(args.tier);
  const ollama = (args.ollama ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
  const constrain = constrainRaw !== 'off';
  const sayOn = sayRaw !== 'off';
  const voiceUrl = (args['voice-url'] ?? 'http://127.0.0.1:7788').replace(/\/$/, '');

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
  const cs = await bundle(
    "export * from './packages/cabinet-server/src/index.ts';",
    `.sit.${process.pid}.cabinet.mjs`,
  );
  const { loadTape } = await bundle(
    "export { loadTape } from './packages/tape-core/src/index.ts';",
    `.sit.${process.pid}.tape.mjs`,
  );

  let tape;
  try {
    tape = loadTape(tapeJson);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`fixture ${fixture}: ${msg}`);
    process.exit(2);
  }
  const DT = 1 / 30;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pad = (s, n) => String(s).padEnd(n);
  const pct = (a, b) => (b > 0 ? ((100 * a) / b).toFixed(0) + '%' : '-');

  function fresh() {
    const round = g.prepassRound(tape, { seconds: g.DEFAULT_SECONDS, tier });
    const state = g.createRoundState(round);
    return { round, state, bot: g.botFor(botName, round), patterns: g.attachedPatterns(round) };
  }

  // --- the v0.4.0 bare-prompt path, unchanged -------------------------------
  async function sitPrompt(model) {
    const { round, state, bot, patterns } = fresh();
    const opts = { url: `${ollama}/api/generate`, model };
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
            lines.push({ wave, kind, index, ms: Date.now() - t0 });
            if (index !== null) state.bossLine = { wave, kind, index };
          })
          .catch((err) =>
            lines.push({ wave, kind, index: null, ms: Date.now() - t0, err: String(err) }),
          );
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
          beats.push({ t: askedAt, ms: Date.now() - t0, view, intent });
        })
        .catch((err) => {
          fallbacks += 1;
          beats.push({ t: askedAt, ms: Date.now() - t0, view, intent: `error ${err.message}` });
        })
        .finally(() => {
          pending = null;
        });
    }
    console.log(
      `\nsit ${model} on ${fixture} tier ${round.tier} bot ${botName} seat prompt lamps ${lamps}`,
    );
    const wall0 = Date.now();
    while (!state.scene) {
      const input = bot(state);
      if (lamps === 'keep') state.lives = state.maxLives;
      g.stepRound(state, input, DT);
      askLines();
      if (state.boss && state.boss.alive && !pending && state.bossIntent === null) askBoss(input);
      await sleep((DT * 1000) / speed);
    }
    const wall = ((Date.now() - wall0) / 1000).toFixed(0);
    console.log(
      `round ended by ${endLabel(state.ended)} after ${state.t.toFixed(0)}s of round, ${wall}s of wall`,
    );
    for (const l of lines) {
      const line = l.index === null ? '(seed line)' : patterns.voice.boss[l.kind][l.index];
      console.log(
        `  voice wave ${l.wave} ${pad(l.kind, 10)} ${pad(l.ms + 'ms', 8)} ${line}${l.err ? ' ' + l.err : ''}`,
      );
    }
    for (const b of beats) {
      console.log(
        `  ${pad(b.t.toFixed(1) + 's', 7)} ${pad(b.view.kind, 10)} ${pad(b.view.hp, 5)} ship ${pad(b.view.column, 7)} stick ${pad(b.view.stick, 6)} motion ${pad(b.view.motion, 13)} ${pad(b.ms + 'ms', 7)} ${b.intent}`,
      );
    }
    const ms = beats.map((b) => b.ms);
    const mean = ms.length ? (ms.reduce((a, b) => a + b, 0) / ms.length).toFixed(0) : '-';
    console.log(
      `${beats.length} beats asked, ${fallbacks} scripted fallbacks, mean ${mean}ms, low-think ${g.needsLowThink(model) ? 'yes' : 'no'}`,
    );
  }

  // --- the seat over the cabinet's tool contract ---------------------------
  async function sitMcp(model) {
    const { round, state, bot, patterns } = fresh();
    const live = { round, state, input: { left: false, right: false, fire: false } };
    // The voice (G15): the worker speaks and receipts each line one beat
    // ahead; here nothing plays, the voicer only records when it would have.
    const health = voiceArg === 'off' ? null : await cs.voiceHealth({ url: voiceUrl });
    const voiceOn = voiceArg === 'on' || (voiceArg === 'auto' && health !== null);
    const takes = [];
    let spokenSpawn = '';
    const voicer = cs.createVoicer({
      speak: async (job) => {
        const a = await cs.speakLine(job, { url: voiceUrl });
        takes.push({ job, a, at: state.t });
        return a;
      },
      play: (url, job) => {
        const t = takes.find((x) => x.job === job);
        if (t) t.playedAt = state.t;
      },
      captionSeconds: 2.4,
    });
    const host = cs.hostForRound(() => live, {
      ...(voiceOn ? { voice: (job) => voicer.job(job) } : {}),
    });
    const cabinet = cs.createCabinet(host);
    const fireOpts = { url: `${ollama}/api/chat`, model, constrain };
    const beats = [];
    const nextVerb = { prefetchAdmitted: 0, thisBeatAsked: 0 };
    let askWasPrefetch = false;
    const seat = cs.createSeat({
      ask: async (view) => {
        askWasPrefetch = state.bossIntent !== null;
        if (!askWasPrefetch) nextVerb.thisBeatAsked += 1;
        const t0 = Date.now();
        const askedAt = state.t;
        const a = await cs.askFire(view, fireOpts);
        beats.push({ t: askedAt, ms: Date.now() - t0, view, answer: a });
        return a;
      },
      admit: (verb) => {
        if (askWasPrefetch) nextVerb.prefetchAdmitted += 1;
        cabinet.call('fire', { verb });
      },
      beatSeconds: patterns.fire.tiers[String(round.tier)].boss.period,
    });
    const says = [];
    let sayBusy = false;
    let sayKey = '';
    let sayAt = Number.NEGATIVE_INFINITY;
    let sayCount = 0;
    const sayOpts = {
      anthropicKey: process.env.ANTHROPIC_API_KEY ?? null,
      ollamaUrl: `${ollama}/api/chat`,
      models: [model],
    };
    function askSay(view) {
      sayBusy = true;
      const t0 = Date.now();
      const rec = {
        wave: state.wave,
        kind: view.kind,
        tier: '-',
        ms: 0,
        line: null,
        gate: null,
        err: null,
      };
      says.push(rec);
      cs.askSayFor(view, host.recent(), sayCount, sayOpts)
        .then((a) => {
          rec.ms = Date.now() - t0;
          rec.tier = a.tier;
          if (!state.boss || !state.boss.alive) {
            rec.gate = 'boss gone';
            return;
          }
          if (!a.call) {
            rec.gate = a.suppressed ? 'suppressed' : 'no call';
            return;
          }
          rec.line = a.call.text;
          rec.lead = a.call.lead;
          const r = cabinet.call('say', a.call);
          rec.gate = gateFromSay(r.content[0].text);
          if (voiceOn) cabinet.call('speak', {});
        })
        .catch((err) => {
          rec.ms = Date.now() - t0;
          rec.err = String(err.message ?? err);
        })
        .finally(() => {
          sayBusy = false;
        });
    }

    console.log(
      `\nsit ${model} on ${fixture} tier ${round.tier} bot ${botName} seat mcp constrain ${constrain ? 'on' : 'off'} say ${sayOn ? 'on' : 'off'} voice ${voiceOn ? `on (${health ? health.engine : 'forced'})` : 'off'} lamps ${lamps}`,
    );
    const w0 = Date.now();
    const warm = await cs.warmUp(fireOpts).catch((err) => ({ error: String(err.message ?? err) }));
    console.log(
      `warm-up ${Date.now() - w0}ms: ${warm.error ? warm.error : warm.intent ? `fire ${warm.intent}` : warm.badCall ? 'bad verb' : warm.suppressed ? 'suppressed' : 'no call'}${warm.low ? ' (low think)' : ''}`,
    );
    const wall0 = Date.now();
    const spent = [];
    while (!state.scene) {
      const input = bot(state);
      live.input.left = input.left;
      live.input.right = input.right;
      live.input.fire = input.fire;
      if (lamps === 'keep') state.lives = state.maxLives;
      const had = state.bossIntent;
      const before = state.boss ? { x: state.boss.x, shots: state.enemyShots.length } : null;
      g.stepRound(state, live.input, DT);
      if (had !== null && state.bossIntent === null && before && state.boss) {
        spent.push({
          t: state.t,
          intent: had,
          added: state.enemyShots.length - before.shots,
          x: before.x,
          fog: state.fog !== null,
        });
      }
      const v = cs.seatView(live);
      seat.tick(v, state.t, state.bossIntent !== null);
      if (sayOn && v.kind !== null && !sayBusy) {
        const key = `${state.wave}:${v.kind}`;
        if (key !== sayKey || state.t - sayAt >= cs.DEFAULT_PERSONAS.cadence) {
          sayKey = key;
          sayAt = state.t;
          sayCount += 1;
          askSay(v);
        }
      }
      host.takeSfx();
      if (voiceOn && state.boss && state.boss.alive) {
        const spawnKey = `${state.wave}:${state.boss.kind}`;
        if (spawnKey !== spokenSpawn && state.caption?.kind === 'wave' && state.caption.line) {
          spokenSpawn = spawnKey;
          voicer.job({
            text: state.caption.line,
            kind: state.boss.kind,
            voice: cs.DEFAULT_PERSONAS.boss[state.boss.kind].voice,
            maxGap: cs.DEFAULT_PERSONAS.voice.maxGap,
            at: state.t,
          });
        }
      }
      voicer.tick(
        state.t,
        state.caption
          ? {
              kind: state.caption.kind ?? 'wave',
              text: state.caption.text,
              ...(state.caption.line ? { line: state.caption.line } : {}),
            }
          : null,
        !state.boss && g.waveKindAt(round, state.t) === 'breather',
        state.scene !== null,
      );
      await sleep((DT * 1000) / speed);
    }
    const wall = ((Date.now() - wall0) / 1000).toFixed(0);
    console.log(
      `round ended by ${endLabel(state.ended)} after ${state.t.toFixed(0)}s of round, ${wall}s of wall`,
    );

    console.log(
      '\nfire seat (asked at round t, answered after ms, what it called, what the sim made of it)',
    );
    for (const b of beats) {
      const a = b.answer;
      const called = a.intent
        ? `fire ${a.intent}`
        : a.badCall
          ? 'fire off the menu'
          : a.suppressed
            ? 'no tool (answered)'
            : 'no tool';
      const sp = a.intent
        ? spent.find((s) => s.intent === a.intent && s.t >= b.t && !s.used)
        : null;
      if (sp) sp.used = true;
      const made = sp
        ? `${sp.added} shot${sp.added === 1 ? '' : 's'}${sp.fog ? ', fog' : ''}, boss x ${sp.x.toFixed(0)}`
        : '';
      console.log(
        `  ${pad(b.t.toFixed(1) + 's', 7)} ${pad(b.view.wave, 9)} ${pad(b.view.kind, 10)} ${pad(b.view.hp, 5)} ship ${pad(b.view.column, 7)} stick ${pad(b.view.stick, 6)} motion ${pad(b.view.motion, 13)} ${pad(b.ms + 'ms', 7)} ${pad(called, 20)} ${made}`,
      );
    }
    const st = seat.stats();
    const verbs = Object.entries(st.byVerb).sort((a, b) => b[1] - a[1]);
    const top = verbs[0] ?? ['-', 0];
    const ms = beats.map((b) => b.ms);
    const mean = ms.length ? (ms.reduce((a, b) => a + b, 0) / ms.length).toFixed(0) : '-';
    const sorted = [...ms].sort((a, b) => a - b);
    const p90 = sorted.length ? sorted[Math.floor(0.9 * (sorted.length - 1))] : '-';
    console.log(
      `\n${st.asked} beats asked: ${st.admitted} admitted, ${st.scripted} scripted (${st.suppressed} suppressed, ${st.badCalls} bad verb, ${st.errors} errors), ${st.revoked} revoked, ${st.late} late; mean ${mean}ms, p90 ${p90}ms, low-think ${cs.needsLowThinkChat(model) ? 'yes' : 'no'}`,
    );
    console.log(nextVerbLine(nextVerb.prefetchAdmitted, nextVerb.thisBeatAsked));
    console.log(timeoutToScriptLine(st.timeout ?? 0, st.asked));
    console.log(`verbs: ${verbs.map(([v, n]) => `${v} ${n}`).join(', ') || 'none'}`);
    console.log(
      `verb collapse: ${pct(top[1], st.admitted)} of admitted beats on ${top[0]} (${top[1]}/${st.admitted}); ${pct(top[1], st.asked)} of asked`,
    );
    console.log(
      `tool suppression: ${pct(st.suppressed, st.asked)} of asked beats (${st.suppressed}/${st.asked}); bad verb ${pct(st.badCalls, st.asked)}`,
    );

    if (sayOn) {
      console.log('\nsay seat (per ask: wave, kind, tier, ms, the line, the gate)');
      for (const r of says) {
        console.log(
          `  wave ${r.wave} ${pad(r.kind, 10)} ${pad(r.tier, 7)} ${pad(r.ms + 'ms', 8)} ${r.err ? 'error ' + r.err : r.line === null ? r.gate : `${JSON.stringify(r.line)} lead ${r.lead} -> ${r.gate === 'ok' ? 'gate ok' : 'refused: ' + r.gate + ', own line'}`}`,
        );
      }
      const called = says.filter((r) => r.line !== null).length;
      const ok = says.filter((r) => r.gate === 'ok').length;
      const refused = says.filter(
        (r) => r.line !== null && r.gate !== 'ok' && r.gate !== 'boss gone',
      );
      const by = new Map();
      for (const r of refused) by.set(r.gate, (by.get(r.gate) ?? 0) + 1);
      const sup = says.filter((r) => r.gate === 'suppressed').length;
      const errs = says.filter((r) => r.err).length;
      const sms = says.filter((r) => r.ms).map((r) => r.ms);
      const smean = sms.length ? (sms.reduce((a, b) => a + b, 0) / sms.length).toFixed(0) : '-';
      console.log(
        `${says.length} asked: ${called} called say, ${ok} gate ok, ${refused.length} refused${refused.length ? ' (' + [...by].map(([k, n]) => `${k} ${n}`).join(', ') + ')' : ''}, ${sup} suppressed, ${errs} errors; mean ${smean}ms; gate rejection ${pct(refused.length, called)} of called`,
      );
    }
    if (voiceOn) {
      console.log('\nvoice (per take: kind, ms to receipt, the receipt, when it played)');
      for (const t of takes) {
        const r = t.a.receipt;
        const when =
          t.playedAt === undefined
            ? 'not played'
            : t.playedAt - t.job.at < 2.4
              ? `on the beat (+${(t.playedAt - t.job.at).toFixed(1)}s)`
              : `in the breather (+${(t.playedAt - t.job.at).toFixed(1)}s)`;
        console.log(
          `  ${pad(t.job.kind, 10)} ${pad(t.a.ms + 'ms', 8)} ${pad(t.a.status, 15)} ${r ? `${r.cached ? 'cached' : `tts ${r.tts_s}s asr ${r.asr_s}s`} ${r.checks.filter((c) => c.ok).length}/${r.checks.length} checks` : ''} ${when}${r && !r.ok ? ' heard: ' + JSON.stringify(r.heard) : ''}`,
        );
      }
      const vs = voicer.stats();
      console.log(
        `${vs.asked} lines to voice: ${vs.voiced} receipted ok (${vs.cached} cached), ${vs.receiptFailed} receipt failed, ${vs.noWorker} no worker; played ${vs.playedOnBeat} on the beat, ${vs.playedInBreather} in the breather, ${vs.dropped} dropped; mean ${vs.asked ? (vs.msSum / vs.asked).toFixed(0) : '-'}ms to receipt`,
      );
    }
  }

  for (const model of models) {
    if (seatKind === 'prompt') await sitPrompt(model);
    else await sitMcp(model);
  }
}

if (isMain()) {
  await main();
}
