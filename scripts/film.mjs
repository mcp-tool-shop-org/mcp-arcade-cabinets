#!/usr/bin/env node
// `pnpm film [--fixture name] [--bot reader] [--tier 1] [--times 3,8,12,20,30,45] [--out dir]`
// Renders frames of a scripted round to PNG through the same renderer the
// shell uses, with rectangles only (no sprites, no text), so a round can be
// looked at without a browser. A development tool: nothing here is a test.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const args = {};
const rest = process.argv.slice(2);
for (let i = 0; i < rest.length; i += 2) args[rest[i].replace(/^--/, '')] = rest[i + 1];
const fixture = args.fixture ?? 'naive-ndjson';
const botName = args.bot ?? 'reader';
const tier = args.tier === undefined ? undefined : Number(args.tier);
const times = (args.times ?? '3,8,12,20,30,45').split(',').map(Number);
const out = path.resolve(args.out ?? 'film');

const bundle = await build({
  stdin: {
    contents:
      "export * from './packages/ghost-on-the-menu/src/index.ts'; export { botFor } from './packages/ghost-on-the-menu/src/play.ts';",
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  logLevel: 'warning',
});
const tmp = path.resolve(out, '.play.bundle.mjs');
mkdirSync(out, { recursive: true });
writeFileSync(tmp, bundle.outputFiles[0].text);
const g = await import(pathToFileURL(tmp).href);
const { readFileSync } = await import('node:fs');
const tapeMod = await build({
  entryPoints: [path.resolve('packages/tape-core/src/index.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  logLevel: 'warning',
});
const tmp2 = path.resolve(out, '.tape.bundle.mjs');
writeFileSync(tmp2, tapeMod.outputFiles[0].text);
const { loadTape } = await import(pathToFileURL(tmp2).href);

const tape = loadTape(
  JSON.parse(readFileSync(path.resolve('fixtures/tapes', `${fixture}.tape.json`), 'utf8')),
);
const round = g.prepassRound(tape, { seconds: 150, tier });
const state = g.createRoundState(round);
const input = g.botFor(botName, round);
const W = g.FIELD.width;
const H = g.FIELD.height;

function hex(c) {
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
  return [255, 0, 255, 1];
}

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

const DT = 1 / 30;
let next = 0;
const log = [];
while (next < times.length && !state.scene) {
  g.stepRound(state, input(state), DT);
  if (state.t >= times[next]) {
    const ctx = makeCtx();
    g.renderRound(ctx, state, { furniture: [fixture, 'server x', 'policy y'] });
    const file = path.resolve(out, `${fixture}.t${String(times[next]).padStart(3, '0')}.png`);
    writeFileSync(file, png(ctx.px));
    const live = state.enemies.filter((e) => e.alive && state.t >= e.tEnter);
    log.push(
      `t=${state.t.toFixed(1)} wave=${state.wave} lives=${state.lives} boss=${state.boss ? `${state.boss.kind}:${state.boss.hp}` : '-'} caption=${state.caption ? `${state.caption.kind}:${state.caption.text}` : '-'} live=${live.map((e) => `${e.sprite[0]}${e.mode[0]}@${e.x.toFixed(0)},${e.y.toFixed(0)}`).join(' ')}`,
    );
    next += 1;
  }
}
console.log(`tier ${round.tier} duration ${round.duration.toFixed(0)} beats ${round.beats.length}`);
console.log(log.join('\n'));
console.log(`frames in ${out}`);
