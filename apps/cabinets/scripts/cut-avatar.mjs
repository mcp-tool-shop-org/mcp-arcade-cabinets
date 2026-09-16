#!/usr/bin/env node
//
// The avatar cut: one generated picture in, one 128x128 avatar out.
//
// The piece tiles had eight icons to find on a sheet, so `slice-tiles.mjs`
// projects the ink onto two axes and hunts for bands. An avatar sheet holds
// exactly one drawing, so there is nothing to hunt for: the whole of the ink
// IS the subject. This finds that one box, squares it about its own center
// with the same eight per cent margin the tiles use, and area-averages it down
// to 128 with the same loop. The PNG codec, the ink threshold, the margin and
// the square are all `slice-tiles.mjs`'s, imported rather than copied, so the
// two cuts cannot drift apart.
//
// The one deliberate difference is alpha. A tile is drawn over a packed block
// in one of the stack's four colors, so its ground is keyed down to a
// translucent plate. An avatar is drawn on the chat pane, whose background is
// the same near-black (#101018) the picture is drawn on, so keying buys
// nothing and costs bytes: the avatar stays fully opaque and its ground simply
// matches the pane.
//
// Usage: node apps/cabinets/scripts/cut-avatar.mjs <in.png> <out.png>

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { GROUND, decodePng, encodePng, squareOf } from './slice-tiles.mjs';

/** A pixel counts as ink when its brightest channel clears this. Same as the slicer's. */
const INK = 48;
/** A row or column needs this many ink pixels before it counts as part of the subject. */
const MIN_INK = 2;
/** Every avatar is this, exactly. */
export const AVATAR = 128;

/**
 * The one box the whole drawing sits in. Rows and columns with fewer than
 * `MIN_INK` lit pixels are the near-black margin, not the subject; a stray lit
 * pixel in the corner of a generation would otherwise drag the box out to the
 * whole picture.
 *
 * It throws rather than guessing when there is no subject to find. A picture
 * that came back blank, or came back as one flat field with no margin at all,
 * is a re-roll and never a crop.
 */
export function inkBox(image) {
  const { width, height, data } = image;
  const cols = new Array(width).fill(0);
  const rows = new Array(height).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const d = (y * width + x) * 4;
      if (Math.max(data[d], data[d + 1], data[d + 2]) <= INK) continue;
      cols[x] += 1;
      rows[y] += 1;
    }
  }
  const run = (counts) => {
    let lo = -1;
    let hi = -1;
    for (let i = 0; i < counts.length; i++) {
      if (counts[i] < MIN_INK) continue;
      if (lo < 0) lo = i;
      hi = i;
    }
    return [lo, hi];
  };
  const [x0, x1] = run(cols);
  const [y0, y1] = run(rows);
  if (x0 < 0 || y0 < 0) {
    throw new Error(
      'cut-avatar: found no drawing on the ground — nothing clears the ink threshold',
    );
  }
  const box = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  if (box.w >= width && box.h >= height) {
    throw new Error(
      'cut-avatar: the ink fills the whole picture, so there is no subject to square — re-roll it',
    );
  }
  return box;
}

/**
 * The square, area-averaged to 128x128 and fully opaque. Reading outside the
 * picture returns the ground, which is what the chat pane is painted in
 * anyway, so a square that had to be clamped still fades into the pane.
 */
export function cutAvatar(image, square) {
  const out = Buffer.alloc(AVATAR * AVATAR * 4);
  const step = square.w / AVATAR;
  for (let ty = 0; ty < AVATAR; ty++) {
    for (let tx = 0; tx < AVATAR; tx++) {
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
      const d = (ty * AVATAR + tx) * 4;
      out[d] = Math.round(r / n);
      out[d + 1] = Math.round(g / n);
      out[d + 2] = Math.round(b / n);
      out[d + 3] = 255;
    }
  }
  return { width: AVATAR, height: AVATAR, data: out };
}

/** The whole cut, picture to one avatar, with the crop box for the receipt. */
export function cutSheet(image) {
  const box = inkBox(image);
  const square = squareOf(box, image);
  return { box, square, avatar: cutAvatar(image, square) };
}

// ——— the runner ——————————————————————————————————————————————————————————

async function main(argv) {
  const [from, to] = argv;
  if (!from || !to) {
    process.stderr.write('usage: node cut-avatar.mjs <in.png> <out.png>\n');
    process.exitCode = 2;
    return;
  }
  const image = decodePng(await readFile(from));
  const { box, square, avatar } = cutSheet(image);
  await writeFile(to, encodePng(avatar));
  process.stdout.write(
    `${path.basename(to)}  ink ${box.x},${box.y} ${box.w}x${box.h}` +
      `  square ${square.x},${square.y} ${square.w}x${square.w}\n`,
  );
}

const invokedAs = process.argv[1] ?? '';
if (invokedAs && fileURLToPath(import.meta.url) === path.resolve(invokedAs)) {
  await main(process.argv.slice(2));
}
