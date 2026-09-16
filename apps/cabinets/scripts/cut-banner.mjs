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
// `--flatten <n>` is the third knob, and it is a size gate as much as a look
// one. Every prompt in this slice asks for flat colors and no noise, and the
// model obliges to the eye and not to the bytes: the backdrop came back with
// 33,330 distinct colors in what reads as about a dozen, which is grain, and
// grain is what a PNG cannot compress. Median-cutting the palette back down
// to the number of colors the picture actually has takes 1.5 MB to 135 KB and
// removes a miss against the brief at the same time.
//
// Usage: node apps/cabinets/scripts/cut-banner.mjs <in.png> <out.png> <W> <H> [--frame] [--key] [--flatten N]

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

/**
 * Median-cut the picture's palette to at most `colors`, weighted by how much
 * of the picture each color covers, and map every pixel to its box's average.
 *
 * It runs over the histogram rather than over the pixels: a 1280x720 picture
 * is 921,600 pixels and about thirty thousand distinct colors, and the boxes
 * only ever need the second number. Nothing here is random and every sort is
 * stable, so the same picture gives the same palette on any machine.
 */
export function flatten(image, colors) {
  if (!Number.isInteger(colors) || colors < 2) {
    throw new Error('cut-banner: --flatten takes a whole number of colors, two or more');
  }
  const counts = new Map();
  for (let i = 0; i < image.data.length; i += 4) {
    const key = (image.data[i] << 16) | (image.data[i + 1] << 8) | image.data[i + 2];
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const all = [...counts].map(([key, n]) => ({
    r: (key >> 16) & 0xff,
    g: (key >> 8) & 0xff,
    b: key & 0xff,
    n,
  }));
  let boxes = [all];
  while (boxes.length < colors) {
    // Widest box first, and a box with nothing left to split drops out.
    boxes.sort((a, b) => spreadOf(b) - spreadOf(a));
    const big = boxes[0];
    if (!big || big.length < 2 || spreadOf(big) === 0) break;
    boxes.shift();
    const ch = widestOf(big);
    big.sort((a, b) => a[ch] - b[ch] || a.r - b.r || a.g - b.g || a.b - b.b);
    // Split at the weighted median, so a box that is mostly one shade does
    // not hand half its entries to a color nobody can see.
    const total = big.reduce((s, c) => s + c.n, 0);
    let run = 0;
    let cut = 1;
    for (let i = 0; i < big.length - 1; i++) {
      run += big[i].n;
      cut = i + 1;
      if (run * 2 >= total) break;
    }
    boxes.push(big.slice(0, cut), big.slice(cut));
  }
  const table = new Map();
  for (const box of boxes) {
    const weight = box.reduce((s, c) => s + c.n, 0);
    const avg = {
      r: Math.round(box.reduce((s, c) => s + c.r * c.n, 0) / weight),
      g: Math.round(box.reduce((s, c) => s + c.g * c.n, 0) / weight),
      b: Math.round(box.reduce((s, c) => s + c.b * c.n, 0) / weight),
    };
    for (const c of box) table.set((c.r << 16) | (c.g << 8) | c.b, avg);
  }
  const out = Buffer.from(image.data);
  for (let i = 0; i < out.length; i += 4) {
    const hit = table.get((out[i] << 16) | (out[i + 1] << 8) | out[i + 2]);
    if (!hit) continue;
    out[i] = hit.r;
    out[i + 1] = hit.g;
    out[i + 2] = hit.b;
  }
  return { width: image.width, height: image.height, data: out };
}

/** The channel a box covers the widest range of. */
function widestOf(box) {
  let pick = 'r';
  let best = -1;
  for (const ch of ['r', 'g', 'b']) {
    let lo = 255;
    let hi = 0;
    for (const c of box) {
      if (c[ch] < lo) lo = c[ch];
      if (c[ch] > hi) hi = c[ch];
    }
    if (hi - lo > best) {
      best = hi - lo;
      pick = ch;
    }
  }
  return pick;
}

/** How wide that channel's range is. */
function spreadOf(box) {
  const ch = widestOf(box);
  let lo = 255;
  let hi = 0;
  for (const c of box) {
    if (c[ch] < lo) lo = c[ch];
    if (c[ch] > hi) hi = c[ch];
  }
  return hi - lo;
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
 * hunted for. `key` keys the ground away (the ribbon). `flatten` cuts the
 * palette down to that many colors after the resize, which is where the grain
 * a generation carries goes. Either way the finished picture has to carry more
 * than a couple of colors: one that came back as a flat field is a re-roll and
 * never an install, and that is the mechanical half of this script's andon.
 */
export function cutSheet(
  image,
  width,
  height,
  { frame = false, key = false, flatten: n = 0 } = {},
) {
  const box = frame ? frameBox(image) : inkBox(image);
  const rect = fitAspect(box, image, width / height);
  let banner = cutBanner(image, rect, width, height, { key });
  if (n > 0) banner = flatten(banner, n);
  const colors = colorCount(banner);
  if (colors < MIN_COLORS) {
    throw new Error(
      `cut-banner: the cut came back with ${colors} color(s), so there is no drawing on it — re-roll it`,
    );
  }
  return { box, rect, banner };
}

// ——— the runner ——————————————————————————————————————————————————————————

const USAGE =
  'usage: node cut-banner.mjs <in.png> <out.png> <width> <height> [--frame] [--key] [--flatten N]';

/**
 * The `--flatten N` value, or 0 when the flag is absent.
 *
 * It throws rather than falling back, and the reason is what the fallback
 * looked like: a bare `--flatten`, or one followed by anything that is not a
 * whole number, became `NaN`; `NaN > 0` is false; so the flatten was skipped
 * without a word, and a picture five times over its size cap would have gone
 * into the repo looking exactly like one that had been asked for.
 */
export function flattenArg(argv) {
  const at = argv.indexOf('--flatten');
  if (at < 0) return 0;
  const raw = argv[at + 1];
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 2) {
    throw new Error(
      'cut-banner: --flatten takes a whole number of colors, two or more; got ' +
        `${JSON.stringify(raw ?? null)}`,
    );
  }
  return n;
}

async function main(argv) {
  const frame = argv.includes('--frame');
  const key = argv.includes('--key');
  let flat = 0;
  try {
    flat = flattenArg(argv);
  } catch (err) {
    process.stderr.write(`${err.message}
${USAGE}
`);
    process.exitCode = 2;
    return;
  }
  const args = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--flatten');
  const [from, to, w, h] = args;
  const width = Number(w);
  const height = Number(h);
  if (!from || !to || !Number.isInteger(width) || !Number.isInteger(height)) {
    process.stderr.write(`${USAGE}
`);
    process.exitCode = 2;
    return;
  }
  const image = decodePng(await readFile(from));
  const { box, rect, banner } = cutSheet(image, width, height, { frame, key, flatten: flat });
  const png = encodePng(banner);
  await writeFile(to, png);
  process.stdout.write(
    `${path.basename(to)}  ${width}x${height}  ${png.length} B` +
      `  box ${box.x},${box.y} ${box.w}x${box.h}` +
      `  rect ${rect.x},${rect.y} ${rect.w}x${rect.h}` +
      `  colors ${colorCount(banner, Number.MAX_SAFE_INTEGER)}
`,
  );
}

const invokedAs = process.argv[1] ?? '';
if (invokedAs && fileURLToPath(import.meta.url) === path.resolve(invokedAs)) {
  await main(process.argv.slice(2));
}
