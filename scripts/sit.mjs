#!/usr/bin/env node
// `pnpm sit [--model a:cloud,b:cloud] [--fixture naive-ndjson] [--tier 1] [--bot sweeper]
//           [--seat mcp|prompt] [--constrain on|off] [--say on|off] [--voice auto|on|off]
//           [--ollama http://127.0.0.1:11434] [--speed 1] [--lamps keep|lose]`
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
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const args = {};
const rest = process.argv.slice(2);
for (let i = 0; i < rest.length; i += 2) args[rest[i].replace(/^--/, '')] = rest[i + 1];
const fixture = args.fixture ?? 'naive-ndjson';
const botName = args.bot ?? 'sweeper';
const tier = args.tier === undefined ? 1 : Number(args.tier);
const models = String(args.model ?? 'gpt-oss:120b-cloud')
  .split(',')
  .map((m) => m.trim());
const ollama = (args.ollama ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
const speed = Number(args.speed ?? 1);
const seatKind = args.seat ?? 'mcp';
const constrain = (args.constrain ?? 'on') !== 'off';
const sayOn = (args.say ?? 'on') !== 'off';
const voiceArg = args.voice ?? 'auto';
const voiceUrl = (args['voice-url'] ?? 'http://127.0.0.1:7788').replace(/\/$/, '');
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
const cs = await bundle(
  "export * from './packages/cabinet-server/src/index.ts';",
  `.sit.${process.pid}.cabinet.mjs`,
);
const { loadTape } = await bundle(
  "export { loadTape } from './packages/tape-core/src/index.ts';",
  `.sit.${process.pid}.tape.mjs`,
);

const tape = loadTape(
  JSON.parse(readFileSync(path.resolve('fixtures/tapes', `${fixture}.tape.json`), 'utf8')),
);
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
    `round ended by ${state.ended} after ${state.t.toFixed(0)}s of round, ${wall}s of wall`,
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
  const seat = cs.createSeat({
    ask: async (view) => {
      const t0 = Date.now();
      const askedAt = state.t;
      const a = await cs.askFire(view, fireOpts);
      beats.push({ t: askedAt, ms: Date.now() - t0, view, answer: a });
      return a;
    },
    admit: (verb) => {
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
        const m = /refused it \((\w+)\)/.exec(r.content[0].text);
        rec.gate = m ? m[1] : 'ok';
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
    `round ended by ${state.ended} after ${state.t.toFixed(0)}s of round, ${wall}s of wall`,
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
    const sp = a.intent ? spent.find((s) => s.intent === a.intent && s.t >= b.t && !s.used) : null;
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
