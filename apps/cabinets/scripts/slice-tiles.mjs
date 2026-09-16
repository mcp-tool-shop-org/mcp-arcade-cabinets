#!/usr/bin/env node
//
// Slice a piece-tile contact sheet into eight 128x128 tiles.
//
// One generation per stack buys a 4x2 contact sheet of the eight piece kinds
// in that stack's palette (slice 4B, batch one). Fifty-six generations would
// have bought the same set one tile at a time and would not have held the
// palette as well, so the cutting happens here, for nothing, and exactly the
// same way every time it runs.
//
// The sheet is found, never assumed: the icons are not on an even grid, so a
// fixed cell rectangle would clip them. Instead the ink is projected onto the
// two axes — rows first, then columns inside each row band — which gives the
// eight bounding boxes whatever margins the model drew. An icon made of
// several parts (a chart's bars, a table's cells) is still one box, because a
// projection does not care whether the parts touch.
//
// Each box is padded to a square, given a margin, and area-averaged down to
// 128x128. The near-black ground is keyed out, so a tile drawn over a packed
// block shows the icon on the block's own color instead of a black square.
//
// No dependency: PNG in and PNG out over node:zlib. Nothing here ships in a
// package; it is a build-side tool and the tiles it writes are what ship.
//
// Usage:
//   node apps/cabinets/scripts/slice-tiles.mjs <sheet.png> <stack> [--out DIR]
//
// The eight kinds come out in the fixed order the prompt asks for, reading the
// top row left to right and then the bottom row left to right.

import { deflateSync, inflateSync } from 'node:zlib';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/** The eight piece kinds, in the order every contact sheet draws them. */
export const KINDS = ['function', 'table', 'button', 'route', 'loop', 'file', 'message', 'chart'];

/** The ground every sheet is drawn on, and the ground a tile keys back to. */
export const GROUND = [0x10, 0x10, 0x18];

/** A pixel counts as ink for the projection when its brightest channel clears this. */
const INK = 48;
/**
 * Alpha ramps from the ground's own alpha to solid between these two values.
 * Exported because the banner cut keys the deploy ribbon's ground with the
 * same two numbers: one key, two callers, so they cannot drift apart.
 */
export const KEY_LO = 34;
export const KEY_HI = 56;
/**
 * The ground is not keyed away to nothing: it is keyed down to a translucent
 * plate. A tile is drawn over a packed block in one of the stack's four
 * colors, and two of those four are lighter than the icon's own fill — an
 * icon on a fully transparent ground disappears on them. Half a plate keeps
 * the block's hue readable through it and gives every icon the same dark
 * surface to sit on, whichever color it landed on.
 */
const GROUND_ALPHA = 128;
/** A row or column band narrower than this is noise, not an icon. */
const MIN_BAND = 24;
/** Ink pixels a row or column needs before it counts as part of a band. */
const MIN_INK = 2;
/** Blank rows or columns that separate two bands. */
const MIN_GAP = 6;
/** Share of the square added all round, so nothing sits on the tile's edge. */
const MARGIN = 0.08;
/** Every tile is this, exactly. */
export const TILE = 128;

// ——— PNG ————————————————————————————————————————————————————————————————

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, tail]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * Decode an 8-bit non-interlaced PNG (grey, RGB, grey+alpha or RGBA) to RGBA.
 * Anything else throws rather than guessing: every sheet this reads comes off
 * one route, and a surprise should stop the run, not be interpolated.
 */
export function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(SIGNATURE)) throw new Error('not a PNG');
  let at = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  const idat = [];
  while (at < buf.length) {
    const length = buf.readUInt32BE(at);
    const type = buf.toString('ascii', at + 4, at + 8);
    const data = buf.subarray(at + 8, at + 8 + length);
    at += 12 + length;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const depth = data[8];
      const colorType = data[9];
      if (depth !== 8) throw new Error(`unsupported bit depth ${depth}`);
      if (data[12] !== 0) throw new Error('interlaced PNGs are not read here');
      channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
      if (!channels) throw new Error(`unsupported color type ${colorType}`);
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }
  if (width === 0 || height === 0) throw new Error('no IHDR');
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(width * height * 4);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? line[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      if (filter === 1) line[i] = (line[i] + a) & 0xff;
      else if (filter === 2) line[i] = (line[i] + b) & 0xff;
      else if (filter === 3) line[i] = (line[i] + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) line[i] = (line[i] + paeth(a, b, c)) & 0xff;
      else if (filter !== 0) throw new Error(`unknown filter ${filter}`);
    }
    for (let x = 0; x < width; x++) {
      const s = x * channels;
      const d = (y * width + x) * 4;
      if (channels === 1) {
        out[d] = out[d + 1] = out[d + 2] = line[s];
        out[d + 3] = 255;
      } else if (channels === 2) {
        out[d] = out[d + 1] = out[d + 2] = line[s];
        out[d + 3] = line[s + 1];
      } else {
        out[d] = line[s];
        out[d + 1] = line[s + 1];
        out[d + 2] = line[s + 2];
        out[d + 3] = channels === 4 ? line[s + 3] : 255;
      }
    }
    prev = line;
  }
  return { width, height, data: out };
}

/** Encode RGBA to an 8-bit RGBA PNG. Filter 0 everywhere: flat art deflates well. */
export function encodePng({ width, height, data }) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ——— the cut ————————————————————————————————————————————————————————————

/** Runs of consecutive `true` in `on`, at least `minRun` long, split by `minGap` off. */
function bands(on, minRun, minGap) {
  const out = [];
  let start = -1;
  let off = 0;
  for (let i = 0; i < on.length; i++) {
    if (on[i]) {
      if (start < 0) start = i - off > 0 ? i : i;
      off = 0;
    } else if (start >= 0) {
      off += 1;
      if (off >= minGap) {
        const end = i - off + 1;
        if (end - start >= minRun) out.push([start, end]);
        start = -1;
        off = 0;
      }
    }
  }
  if (start >= 0) {
    const end = on.length - off;
    if (end - start >= minRun) out.push([start, end]);
  }
  return out;
}

/**
 * The eight boxes of a 4x2 contact sheet, in reading order. Throws when the
 * sheet is not a clean 4x2 — a sheet that has to be guessed at is a re-roll,
 * not a crop (the andon rule for this batch).
 */
export function findCells(image, { cols = 4, rows = 2 } = {}) {
  const { width, height, data } = image;
  const ink = (x, y) => {
    const d = (y * width + x) * 4;
    return Math.max(data[d], data[d + 1], data[d + 2]) > INK;
  };
  const rowOn = new Array(height).fill(false);
  for (let y = 0; y < height; y++) {
    let n = 0;
    for (let x = 0; x < width && n < MIN_INK; x++) if (ink(x, y)) n += 1;
    rowOn[y] = n >= MIN_INK;
  }
  const rowBands = bands(rowOn, MIN_BAND, MIN_GAP);
  if (rowBands.length !== rows) {
    throw new Error(`expected ${rows} rows of icons, found ${rowBands.length}`);
  }
  const out = [];
  for (const [y0, y1] of rowBands) {
    const colOn = new Array(width).fill(false);
    for (let x = 0; x < width; x++) {
      let n = 0;
      for (let y = y0; y < y1 && n < MIN_INK; y++) if (ink(x, y)) n += 1;
      colOn[x] = n >= MIN_INK;
    }
    const colBands = bands(colOn, MIN_BAND, MIN_GAP);
    if (colBands.length !== cols) {
      throw new Error(`expected ${cols} icons in a row, found ${colBands.length}`);
    }
    for (const [x0, x1] of colBands) {
      // The row band is the whole row's extent; tighten it to this icon.
      let top = y1;
      let bottom = y0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          if (!ink(x, y)) continue;
          if (y < top) top = y;
          if (y > bottom) bottom = y;
          break;
        }
      }
      out.push({ x: x0, y: top, w: x1 - x0, h: bottom - top + 1 });
    }
  }
  return out;
}

/** The square the tile is cut from: the box centered, padded out, clamped in. */
export function squareOf(box, image) {
  const side = Math.round(Math.max(box.w, box.h) * (1 + MARGIN * 2));
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  let x = Math.round(cx - side / 2);
  let y = Math.round(cy - side / 2);
  x = Math.max(0, Math.min(x, image.width - side));
  y = Math.max(0, Math.min(y, image.height - side));
  return { x, y, w: side, h: side };
}

/**
 * One tile: the square, area-averaged to 128x128, with the ground keyed out so
 * the icon can sit on a packed block's own color. Reading outside the picture
 * returns the ground, which is what the shell clears to anyway.
 */
export function cutTile(image, square) {
  const out = Buffer.alloc(TILE * TILE * 4);
  const step = square.w / TILE;
  for (let ty = 0; ty < TILE; ty++) {
    for (let tx = 0; tx < TILE; tx++) {
      const sx0 = Math.floor(square.x + tx * step);
      const sy0 = Math.floor(square.y + ty * step);
      const sx1 = Math.max(sx0 + 1, Math.floor(square.x + (tx + 1) * step));
      const sy1 = Math.max(sy0 + 1, Math.floor(square.y + (ty + 1) * step));
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          n += 1;
          if (sx < 0 || sy < 0 || sx >= image.width || sy >= image.height) {
            r += GROUND[0];
            g += GROUND[1];
            b += GROUND[2];
            continue;
          }
          const d = (sy * image.width + sx) * 4;
          r += image.data[d];
          g += image.data[d + 1];
          b += image.data[d + 2];
        }
      }
      r = Math.round(r / n);
      g = Math.round(g / n);
      b = Math.round(b / n);
      const key = Math.max(r, g, b);
      const t = Math.max(0, Math.min(1, (key - KEY_LO) / (KEY_HI - KEY_LO)));
      const alpha = Math.round(GROUND_ALPHA + (255 - GROUND_ALPHA) * t);
      const d = (ty * TILE + tx) * 4;
      out[d] = r;
      out[d + 1] = g;
      out[d + 2] = b;
      out[d + 3] = alpha;
    }
  }
  return { width: TILE, height: TILE, data: out };
}

/** The whole cut, sheet to eight tiles, with the crop boxes for the receipt. */
export function sliceSheet(image) {
  return findCells(image).map((box, i) => ({
    kind: KINDS[i],
    cell: `${i % 4},${Math.floor(i / 4)}`,
    box,
    square: squareOf(box, image),
    tile: cutTile(image, squareOf(box, image)),
  }));
}

// ——— the runner ——————————————————————————————————————————————————————————

function main(argv) {
  const args = argv.filter((a) => !a.startsWith('--'));
  const outAt = argv.indexOf('--out');
  const sheet = args[0];
  const stack = args[1];
  if (!sheet || !stack) {
    process.stderr.write('usage: slice-tiles.mjs <sheet.png> <stack> [--out DIR]\n');
    process.exit(2);
  }
  const root = resolve(
    dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
    '..',
  );
  const out = outAt >= 0 ? resolve(argv[outAt + 1]) : join(root, 'public', 'vibe', 'tiles', stack);
  const image = decodePng(readFileSync(sheet));
  const cuts = sliceSheet(image);
  mkdirSync(out, { recursive: true });
  const rows = [];
  for (const cut of cuts) {
    const file = join(out, `${cut.kind}.png`);
    const png = encodePng(cut.tile);
    writeFileSync(file, png);
    rows.push({
      stack,
      kind: cut.kind,
      cell: cut.cell,
      box: `${cut.box.x},${cut.box.y} ${cut.box.w}x${cut.box.h}`,
      square: `${cut.square.x},${cut.square.y} ${cut.square.w}x${cut.square.w}`,
      bytes: png.length,
    });
  }
  process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
}

const invokedAs = process.argv[1] ?? '';
if (invokedAs.endsWith('slice-tiles.mjs')) main(process.argv.slice(2));
