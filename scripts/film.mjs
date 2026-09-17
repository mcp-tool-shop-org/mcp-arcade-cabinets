#!/usr/bin/env node
// `pnpm film [--fixture name] [--bot idle|sweeper|reader] [--tier 0|1|2|3] [--times 3,8,12,20,30,45] [--out dir]`
// Renders frames of a scripted round to PNG through the same renderer the
// shell uses, with rectangles only (no sprites, no text), so a round can be
// looked at without a browser. A development tool: nothing here is a test.
import { deflateSync } from 'node:zlib';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { cliError, die, isMain, parseArgv, runMain } from './lib/cli.mjs';
import { bundleModule } from './lib/bundle.mjs';

const USAGE =
  'usage: pnpm film [--fixture name] [--bot idle|sweeper|reader] [--tier 0|1|2|3] [--times 3,8,12,20,30,45] [--out dir]';
const BOTS = ['idle', 'sweeper', 'reader'];
const FLAGS = new Set(['fixture', 'bot', 'tier', 'times', 'out']);

function tapeRoster() {
  try {
    return readdirSync(path.resolve('fixtures/tapes'))
      .filter((f) => f.endsWith('.tape.json'))
      .map((f) => f.replace(/\.tape\.json$/, ''))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Thirty frames a second for ten minutes of round time. No fixture round is
 * anywhere near that long; the cap is here because the frame loop advances
 * only when the round reaches the next requested time or ends in a scene, so a
 * round that does neither — `--times 99999`, or a `stepRound` regression that
 * stops setting `state.scene` — used to spin forever with no output at all.
 * Every other driver in the repo has one (vibe play.ts MAX_TICKS,
 * test/helpers.ts TICK_CAP).
 */
export const MAX_TICKS = 30 * 60 * 10;

/**
 * `--times 3,8,12`. Seconds of round time, each a finite number and none
 * negative: an empty entry used to parse as zero (`Number('')` is 0, and
 * splitting an empty string yields one empty entry), and a negative one used
 * to name a frame `<fixture>.t0-1.png` because padStart pads the minus sign.
 */
export function parseTimes(src) {
  const raw = String(src).split(',');
  const bad = (why) => cliError(`times must be ${why} (got ${src})`);
  if (raw.length === 0) throw bad('one or more seconds of round time');
  const times = [];
  for (const part of raw) {
    const trimmed = part.trim();
    if (trimmed === '') throw bad('seconds of round time, with no empty entry');
    const n = Number(trimmed);
    if (!Number.isFinite(n)) throw bad('finite numbers');
    if (n < 0) throw bad('zero or more, never negative');
    times.push(n);
  }
  return times;
}

/**
 * The renderer's colors as bytes. Every color the renderer sets is `#rrggbb`
 * or an `rgb()`/`rgba()` triple; anything else is a renderer regression, and it
 * used to come back as magenta — a frame that looks wrong rather than a run
 * that says what broke.
 */
export function hex(c) {
  const m = /^#([0-9a-f]{6})$/i.exec(c);
  if (m)
    return [
      parseInt(m[1].slice(0, 2), 16),
      parseInt(m[1].slice(2, 4), 16),
      parseInt(m[1].slice(4, 6), 16),
      1,
    ];
  const r = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(c);
  if (r) return [Number(r[1]), Number(r[2]), Number(r[3]), r[4] === undefined ? 1 : Number(r[4])];
  throw cliError(`renderer color not understood: ${JSON.stringify(String(c))}`);
}

/**
 * Step the round until every requested time has a frame or the round ends,
 * capped. `step()` advances one frame; `writeFrame(label)` writes one.
 */
export function runFrames({ state, times, step, writeFrame, maxTicks = MAX_TICKS }) {
  let next = 0;
  let frames = 0;
  let ticks = 0;
  while (next < times.length) {
    if (ticks >= maxTicks) {
      throw cliError(
        `the round did not end after ${ticks} frames (t=${Number(state.t).toFixed(1)}; times ${times.join(',')})`,
      );
    }
    ticks += 1;
    const hadScene = Boolean(state.scene);
    step();
    if (state.t >= times[next] && !state.scene) {
      writeFrame(times[next]);
      frames += 1;
      next += 1;
    }
    if (!hadScene && state.scene) {
      writeFrame(times[next] ?? Math.floor(state.t));
      frames += 1;
      break;
    }
    if (state.scene) break;
  }
  return frames;
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
  if (flags.bot !== undefined && !BOTS.includes(flags.bot)) {
    die(`unknown bot ${flags.bot}; use idle, sweeper or reader`);
  }
  if (flags.tier !== undefined) {
    const n = Number(flags.tier);
    if (!Number.isInteger(n) || n < 0 || n > 3) die(`tier must be 0..3 (got ${flags.tier})`);
  }
  const timesSrc = flags.times ?? '3,8,12,20,30,45';
  const times = parseTimes(timesSrc);
  const fixture = flags.fixture ?? 'naive-ndjson';
  const tapeFile = path.resolve('fixtures/tapes', `${fixture}.tape.json`);
  if (!existsSync(tapeFile)) {
    console.error(`unknown fixture ${fixture}; have: ${tapeRoster().join(', ')}`);
    process.exit(2);
  }
  let tapeJson;
  try {
    tapeJson = parseTapeFile(tapeFile, fixture);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(2);
  }
  const botName = flags.bot ?? 'reader';
  const tier = flags.tier === undefined ? undefined : Number(flags.tier);
  const out = path.resolve(flags.out ?? 'film');
  mkdirSync(out, { recursive: true });

  const g = await bundleModule({
    contents:
      "export * from './packages/ghost-on-the-menu/src/index.ts'; export { botFor } from './packages/ghost-on-the-menu/src/play.ts';",
    outDir: out,
    outFile: '.play.bundle.mjs',
    what: 'the cabinet',
  });
  const { loadTape } = await bundleModule({
    entry: path.resolve('packages/tape-core/src/index.ts'),
    outDir: out,
    outFile: '.tape.bundle.mjs',
    what: 'tape-core',
  });

  let tape;
  try {
    tape = loadTape(tapeJson);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`fixture ${fixture}: ${msg}`);
    process.exit(2);
  }
  const round = g.prepassRound(tape, { seconds: 150, tier });
  const state = g.createRoundState(round);
  const input = g.botFor(botName, round);
  const W = g.FIELD.width;
  const H = g.FIELD.height;

  function makeCtx() {
    const px = new Uint8Array(W * H * 3);
    const ctx = {
      fillStyle: '#000000',
      font: '',
      fillRect(x, y, w, h) {
        const [r, gg, b, a] = hex(ctx.fillStyle);
        const x0 = Math.max(0, Math.floor(x));
        const y0 = Math.max(0, Math.floor(y));
        const x1 = Math.min(W, Math.ceil(x + w));
        const y1 = Math.min(H, Math.ceil(y + h));
        for (let yy = y0; yy < y1; yy++) {
          for (let xx = x0; xx < x1; xx++) {
            const i = (yy * W + xx) * 3;
            px[i] = px[i] * (1 - a) + r * a;
            px[i + 1] = px[i + 1] * (1 - a) + gg * a;
            px[i + 2] = px[i + 2] * (1 - a) + b * a;
          }
        }
      },
      fillText(text, x, y) {
        // Text is drawn as a short bar the length of the word, so the frame shows where words sit.
        const [r, gg, b] = hex(ctx.fillStyle);
        const x0 = Math.floor(x);
        const y0 = Math.floor(y) - 8;
        for (let yy = y0; yy < y0 + 8 && yy < H; yy++) {
          for (let xx = x0; xx < Math.min(W, x0 + text.length * 6); xx++) {
            if ((xx + yy) % 3 === 0) continue;
            const i = (yy * W + xx) * 3;
            px[i] = r;
            px[i + 1] = gg;
            px[i + 2] = b;
          }
        }
      },
      px,
    };
    return ctx;
  }

  function crc32(buf) {
    let c;
    const table = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  }
  function png(px) {
    const raw = Buffer.alloc((W * 3 + 1) * H);
    for (let y = 0; y < H; y++) {
      raw[y * (W * 3 + 1)] = 0;
      Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(W, 0);
    ihdr.writeUInt32BE(H, 4);
    ihdr[8] = 8;
    ihdr[9] = 2;
    return Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw)),
      chunk('IEND', Buffer.alloc(0)),
    ]);
  }

  const furniture = [
    fixture,
    `server ${tape.server_name ?? tape.target_kind}`,
    `policy ${tape.agent_policy}`,
  ];

  const DT = 1 / 30;
  const log = [];

  function writeFrame(label) {
    const ctx = makeCtx();
    g.renderRound(ctx, state, { furniture });
    const file = path.resolve(out, `${fixture}.t${String(label).padStart(3, '0')}.png`);
    writeFileSync(file, png(ctx.px));
    const live = state.enemies.filter((e) => e.alive && state.t >= e.tEnter);
    log.push(
      `t=${state.t.toFixed(1)} wave=${state.wave} lives=${state.lives} boss=${state.boss ? `${state.boss.kind}:${state.boss.hp}` : '-'} caption=${state.caption ? `${state.caption.kind}:${state.caption.text}` : '-'} live=${live.map((e) => `${e.sprite[0]}${e.mode[0]}@${e.x.toFixed(0)},${e.y.toFixed(0)}`).join(' ')}`,
    );
  }
  const frames = runFrames({
    state,
    times,
    step: () => g.stepRound(state, input(state), DT),
    writeFrame,
  });
  console.log(
    `tier ${round.tier} duration ${round.duration.toFixed(0)} beats ${round.beats.length}`,
  );
  if (log.length) console.log(log.join('\n'));
  if (frames === 0) {
    console.error(`no frames (round ended at t=${state.t.toFixed(1)}; times ${times.join(',')})`);
    process.exit(2);
  }
  if (frames < times.length) {
    console.log(`${frames} frames of ${times.length} times`);
  }
  console.log(`frames in ${out}`);
}

if (isMain(import.meta.url)) {
  await runMain(main);
}
