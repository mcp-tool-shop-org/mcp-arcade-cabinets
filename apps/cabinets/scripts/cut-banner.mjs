#!/usr/bin/env node
//
// The banner cut: one generated picture in, one landscape banner out at an
// exact size.
//
// The piece tiles had eight icons to find on a sheet, so `slice-tiles.mjs`
// projects the ink onto two axes and hunts for bands. An avatar picture holds
// one drawing with air around it, so `cut-avatar.mjs` takes the whole of the
// ink and squares it. A milestone card and the deploy ribbon are the same
// shape of problem with one difference: the answer is a rectangle at a named
// aspect rather than a square, because the shell draws a word over it at a
// size it has already chosen.
//
// Where the drawing sits in the picture is a flag rather than an assumption.
// `--frame` says the drawing fills the picture, which is what a card and a
// ribbon generated at their own aspect both do; without it the ink is hunted
// for, which is what a motif drawn inside a 4:3 frame needs. The rest is
// shared: fit the named aspect around that box, area-average down to the
// named size. The PNG codec, the ground and the ink box are
// `slice-tiles.mjs`'s and `cut-avatar.mjs`'s, imported rather than copied, so
// the three cuts in this repo cannot drift apart.
//
// There is deliberately no eight per cent margin. A portrait is a subject
// with air around it; a banner IS its own edge, and ground padded around a
// card would read as a dark border against the board it is drawn on.
//
// Alpha is the one place the two of them part company again, for the same
// reason batch two's avatars parted company with the tiles: what is
// underneath.
//
//   * A card is drawn behind a word on the board, on nothing but the page,
//     so it is opaque and its own navy is the card.
//   * A ribbon is drawn over the preview, which already has the device frame
//     and the packed blocks on it. An opaque ribbon would punch a band of its
//     own ground straight through that picture, so the ribbon's ground is
//     keyed away with the tiles' own two thresholds and the ribbon floats.
//
// Usage: node apps/cabinets/scripts/cut-banner.mjs <in.png> <out.png> <W> <H> [--frame] [--key]

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { GROUND, KEY_HI, KEY_LO, decodePng, encodePng } from './slice-tiles.mjs';
import { inkBox } from './cut-avatar.mjs';

/** Distinct colors a finished banner must carry before it counts as a drawing. */
const MIN_COLORS = 4;

/** The whole picture, for a card that was drawn corner to corner. */
export function frameBox(image) {
  return { x: 0, y: 0, w: image.width, h: image.height };
}

/**
 * The rectangle the banner is cut from: the box grown or trimmed to the named
 * aspect about its own center, then clamped inside the picture.
 *
 * Growing is preferred, because growing only ever adds ground the model left
 * empty. When the picture has no room to grow — a full-frame card is exactly
 * that case, and it is the normal one — the other axis is trimmed instead,
 * which is the only remaining way to reach the aspect.
 *
 * It throws rather than guessing when neither move fits inside the picture.
 * That is a picture whose drawing cannot be read as a banner at this aspect,
 * and it is a re-roll, never a crop.
 */
export function fitAspect(box, image, aspect) {
  if (!(aspect > 0)) throw new Error('cut-banner: the aspect must be a positive number');
  let w = box.w;
  let h = box.h;
  if (box.w / box.h < aspect) {
    // Too tall for the aspect: widen it if the picture has the width, and
    // otherwise take the height down to match the width there is.
    w = Math.round(box.h * aspect);
    if (w > image.width) {
      w = box.w;
      h = Math.round(box.w / aspect);
    }
  } else {
    h = Math.round(box.w / aspect);
    if (h > image.height) {
      h = box.h;
      w = Math.round(box.h * aspect);
    }
  }
  if (w > image.width || h > image.height || w < 1 || h < 1) {
    throw new Error(
      `cut-banner: no rectangle at aspect ${aspect} around the drawing fits in this ` +
        `${image.width}x${image.height} picture — re-roll it`,
    );
  }
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  let x = Math.round(cx - w / 2);
  let y = Math.round(cy - h / 2);
  x = Math.max(0, Math.min(x, image.width - w));
  y = Math.max(0, Math.min(y, image.height - h));
  return { x, y, w, h };
}

/**
 * The rectangle, area-averaged to `width` x `height`.
 *
 * `key` keys the ground away to nothing, ramping to solid over the tiles' own
 * two thresholds; without it every pixel is opaque. Reading outside the
 * picture returns the ground either way, which is the near-black the preview
 * canvas is painted in, so a rectangle that had to be clamped still ends in
 * the dark rather than in a stripe of nothing.
 */
export function cutBanner(image, rect, width, height, { key = false } = {}) {
  const out = Buffer.alloc(width * height * 4);
  const stepX = rect.w / width;
  const stepY = rect.h / height;
  for (let ty = 0; ty < height; ty++) {
    for (let tx = 0; tx < width; tx++) {
      const sx0 = Math.floor(rect.x + tx * stepX);
      const sy0 = Math.floor(rect.y + ty * stepY);
      const sx1 = Math.max(sx0 + 1, Math.floor(rect.x + (tx + 1) * stepX));
      const sy1 = Math.max(sy0 + 1, Math.floor(rect.y + (ty + 1) * stepY));
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
      const d = (ty * width + tx) * 4;
      out[d] = r;
      out[d + 1] = g;
      out[d + 2] = b;
      if (!key) {
        out[d + 3] = 255;
        continue;
      }
      const lit = Math.max(r, g, b);
      out[d + 3] = Math.round(255 * Math.max(0, Math.min(1, (lit - KEY_LO) / (KEY_HI - KEY_LO))));
    }
  }
  return { width, height, data: out };
}

/** How many distinct colors a finished banner carries. Stops counting at `cap`. */
export function colorCount(image, cap = MIN_COLORS) {
  const seen = new Set();
  for (let i = 0; i < image.data.length; i += 4) {
    seen.add((image.data[i] << 16) | (image.data[i + 1] << 8) | image.data[i + 2]);
    if (seen.size >= cap) return seen.size;
  }
  return seen.size;
}

/**
 * The whole cut, picture to one banner, with the boxes for the receipt.
 *
 * `frame` says the drawing fills the picture (a card); without it the ink is
 * hunted for. `key` keys the ground away (the ribbon). Either way the
 * finished banner has to carry more than a couple of colors: a card that came
 * back as one flat field is a re-roll and never an install, and that is the
 * mechanical half of this script's andon.
 */
export function cutSheet(image, width, height, { frame = false, key = false } = {}) {
  const box = frame ? frameBox(image) : inkBox(image);
  const rect = fitAspect(box, image, width / height);
  const banner = cutBanner(image, rect, width, height, { key });
  const colors = colorCount(banner);
  if (colors < MIN_COLORS) {
    throw new Error(
      `cut-banner: the cut came back with ${colors} color(s), so there is no drawing on it — re-roll it`,
    );
  }
  return { box, rect, banner };
}

// ——— the runner ——————————————————————————————————————————————————————————

async function main(argv) {
  const frame = argv.includes('--frame');
  const key = argv.includes('--key');
  const args = argv.filter((a) => !a.startsWith('--'));
  const [from, to, w, h] = args;
  const width = Number(w);
  const height = Number(h);
  if (!from || !to || !Number.isInteger(width) || !Number.isInteger(height)) {
    process.stderr.write(
      'usage: node cut-banner.mjs <in.png> <out.png> <width> <height> [--frame]\n',
    );
    process.exitCode = 2;
    return;
  }
  const image = decodePng(await readFile(from));
  const { box, rect, banner } = cutSheet(image, width, height, { frame, key });
  const png = encodePng(banner);
  await writeFile(to, png);
  process.stdout.write(
    `${path.basename(to)}  ${width}x${height}  ${png.length} B` +
      `  box ${box.x},${box.y} ${box.w}x${box.h}` +
      `  rect ${rect.x},${rect.y} ${rect.w}x${rect.h}\n`,
  );
}

const invokedAs = process.argv[1] ?? '';
if (invokedAs && fileURLToPath(import.meta.url) === path.resolve(invokedAs)) {
  await main(process.argv.slice(2));
}
