// The banner cut, fed synthetic pictures so every expected box is known by
// construction rather than eyeballed off a generated one.
//
// The cut has one job neither of the other two has: it has to reach an exact
// rectangle at a named aspect, because the shell draws a word over it at a
// size it has already chosen. Everything below is about the three ways that
// goes wrong — the aspect fitted the wrong way round, a ground keyed when it
// should be solid or solid when it should be keyed, and a picture with
// nothing on it being cut into something rather than refused.

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  colorCount,
  cutBanner,
  cutSheet,
  fitAspect,
  flatten,
  flattenArg,
  frameBox,
} from '../scripts/cut-banner.mjs';
import { GROUND, KEY_HI, decodePng, encodePng } from '../scripts/slice-tiles.mjs';

/** A card comes back at its own aspect; a motif inside a 4:3 frame does not. */
const CARD = { w: 1440, h: 480 };
const FRAME = { w: 1024, h: 768 };
/** Where the synthetic band sits inside the 4:3 frame, and what it is drawn in. */
const BAND = { x: 100, y: 300, w: 824, h: 120 };
const TONE = 180;

function blank(width: number, height: number): { width: number; height: number; data: Buffer } {
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = GROUND[0];
    data[i * 4 + 1] = GROUND[1];
    data[i * 4 + 2] = GROUND[2];
    data[i * 4 + 3] = 255;
  }
  return { width, height, data };
}

function fill(
  image: { width: number; data: Buffer },
  box: { x: number; y: number; w: number; h: number },
  tone: number,
): void {
  for (let y = box.y; y < box.y + box.h; y++) {
    for (let x = box.x; x < box.x + box.w; x++) {
      const d = (y * image.width + x) * 4;
      image.data[d] = tone;
      image.data[d + 1] = tone >> 1;
      image.data[d + 2] = tone >> 2;
    }
  }
}

/**
 * A card: the whole picture is the drawing, with a motif in its left third.
 * Four tones, because a card IS a drawing — the cut refuses anything flatter
 * than that, and a two-tone synthetic would be testing against the refusal.
 */
function card(): { width: number; height: number; data: Buffer } {
  const image = blank(CARD.w, CARD.h);
  fill(image, { x: 0, y: 0, w: CARD.w, h: CARD.h }, 64);
  fill(image, { x: 60, y: 60, w: 360, h: 360 }, TONE);
  fill(image, { x: 120, y: 120, w: 240, h: 240 }, 220);
  fill(image, { x: 180, y: 180, w: 120, h: 120 }, 140);
  return image;
}

/** A ribbon drawn as a band inside a 4:3 frame, with ground above and below. */
function band(): { width: number; height: number; data: Buffer } {
  const image = blank(FRAME.w, FRAME.h);
  fill(image, BAND, TONE);
  return image;
}

function alphaAt(image: { width: number; data: Buffer }, x: number, y: number): number {
  return image.data[(y * image.width + x) * 4 + 3]!;
}

/** A small picture with grain on it, the way a generation comes back. */
function grainy(): { width: number; height: number; data: Buffer } {
  const w = 96;
  const h = 96;
  const data = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    // Three independent deterministic wobbles, so the picture carries
    // hundreds of near-identical colors around three tones — which is what
    // grain is, and what a flat illustration is not.
    const base = i % 3 === 0 ? 30 : i % 3 === 1 ? 120 : 200;
    data[i * 4] = base + ((i * 7919) % 17);
    data[i * 4 + 1] = base + ((i * 104729) % 19);
    data[i * 4 + 2] = base + ((i * 1299709) % 23);
    data[i * 4 + 3] = 255;
  }
  return { width: w, height: h, data };
}

describe('the banner cut', () => {
  it('takes the whole picture when the drawing fills it', () => {
    expect(frameBox(card())).toEqual({ x: 0, y: 0, w: CARD.w, h: CARD.h });
  });

  it('leaves a box that is already at the aspect exactly where it is', () => {
    const image = card();
    // 1440x480 is 3:1 to the pixel, so the fit has nothing to do and must not
    // shave a row off in the rounding.
    expect(fitAspect(frameBox(image), image, 3)).toEqual({ x: 0, y: 0, w: 1440, h: 480 });
  });

  it('trims the long axis when the picture has no room to grow the short one', () => {
    // A full 4:3 frame cannot get wider, so 3:1 is reached by taking height
    // off, centered.
    const image = blank(FRAME.w, FRAME.h);
    // 1024 / 3 rounds to 341, and 384 - 341 / 2 rounds to 214, so the band
    // sits one pixel below the exact middle. That is the rounding and it is
    // pinned here rather than left to drift.
    expect(fitAspect(frameBox(image), image, 3)).toEqual({ x: 0, y: 214, w: 1024, h: 341 });
  });

  it('grows the short axis when the picture has the room', () => {
    // The band is 824x120, so 8:1 wants 960 wide — which fits in 1024 — and
    // the rectangle stays centered on the band rather than on the frame.
    const image = band();
    const rect = fitAspect(BAND, image, 8);
    expect(rect.w).toBe(960);
    expect(rect.h).toBe(120);
    expect(rect.x + rect.w / 2).toBe(BAND.x + BAND.w / 2);
    expect(rect.y).toBe(BAND.y);
  });

  it('keeps the whole band inside the rectangle it cuts, on both axes', () => {
    const image = band();
    const rect = fitAspect(BAND, image, 8);
    expect(rect.x).toBeLessThanOrEqual(BAND.x);
    expect(rect.x + rect.w).toBeGreaterThanOrEqual(BAND.x + BAND.w);
    expect(rect.y).toBeLessThanOrEqual(BAND.y);
    expect(rect.y + rect.h).toBeGreaterThanOrEqual(BAND.y + BAND.h);
  });

  it('clamps a rectangle that would run off the edge back inside the picture', () => {
    const image = band();
    // A band hard against the left edge: 8:1 wants to grow either side of it,
    // and half of that growth is off the picture.
    const edge = { x: 0, y: 300, w: 824, h: 120 };
    const rect = fitAspect(edge, image, 8);
    expect(rect.x).toBe(0);
    expect(rect.x + rect.w).toBeLessThanOrEqual(image.width);
  });

  it('refuses an aspect that is not a positive number', () => {
    const image = card();
    expect(() => fitAspect(frameBox(image), image, 0)).toThrow(/positive number/);
    expect(() => fitAspect(frameBox(image), image, Number.NaN)).toThrow(/positive number/);
  });

  it('writes a banner at exactly the size it was asked for, opaque by default', () => {
    const { banner } = cutSheet(card(), 480, 160, { frame: true });
    expect(banner.width).toBe(480);
    expect(banner.height).toBe(160);
    // Every pixel, read off the decoded buffer rather than trusted to the
    // encoder: a card is drawn on the page and its own ground is the card.
    for (let i = 3; i < banner.data.length; i += 4) expect(banner.data[i]).toBe(255);
  });

  it('keys the ground away and leaves the drawing solid when asked to', () => {
    const image = band();
    const rect = fitAspect(BAND, image, 8);
    const banner = cutBanner(image, rect, 640, 80, { key: true });
    // The ground is `GROUND`, whose brightest channel is under the low
    // threshold, so it keys to nothing; the band is well over the high one.
    expect(Math.max(...GROUND)).toBeLessThan(KEY_HI);
    expect(alphaAt(banner, 4, 4)).toBe(0);
    expect(alphaAt(banner, 320, 40)).toBe(255);
  });

  it('gives the same banner twice, because nothing in the cut is random', () => {
    const image = card();
    const a = cutSheet(image, 480, 160, { frame: true }).banner;
    const b = cutSheet(image, 480, 160, { frame: true }).banner;
    expect(Buffer.compare(a.data, b.data)).toBe(0);
  });

  it('round-trips through the shared PNG codec', () => {
    const { banner } = cutSheet(card(), 480, 160, { frame: true });
    const back = decodePng(encodePng(banner));
    expect(back.width).toBe(banner.width);
    expect(back.height).toBe(banner.height);
    expect(Buffer.compare(back.data, banner.data)).toBe(0);
  });

  it('refuses a picture that came back as one flat field', () => {
    // Nothing was drawn. That is a re-roll, not a card with a word over it,
    // and it is the mechanical half of the andon: the glyph check and the eye
    // are the other half.
    expect(() => cutSheet(blank(CARD.w, CARD.h), 480, 160, { frame: true })).toThrow(
      /no drawing on it/,
    );
  });

  it('cuts the palette down to the count it is given', () => {
    // The backdrop came back with 33,330 distinct colors in a picture that
    // reads as a dozen, which is grain, and grain is what a PNG cannot
    // compress. This is the pass that takes it back to flat.
    const noisy = grainy();
    expect(colorCount(noisy, Number.MAX_SAFE_INTEGER)).toBeGreaterThan(200);
    const flat = flatten(noisy, 8);
    expect(colorCount(flat, Number.MAX_SAFE_INTEGER)).toBeLessThanOrEqual(8);
    expect(flat.width).toBe(noisy.width);
    expect(flat.height).toBe(noisy.height);
  });

  it('gives the same palette twice, because the median cut takes no seed', () => {
    const noisy = grainy();
    const a = flatten(noisy, 8);
    const b = flatten(noisy, 8);
    expect(Buffer.compare(a.data, b.data)).toBe(0);
  });

  it('leaves alpha alone when it flattens', () => {
    // The flatten is a palette pass and nothing else: a keyed ribbon that went
    // through it would otherwise come back with its ground solid.
    const noisy = grainy();
    for (let i = 3; i < noisy.data.length; i += 4) noisy.data[i] = i % 8 === 3 ? 0 : 255;
    const flat = flatten(noisy, 8);
    for (let i = 3; i < flat.data.length; i += 4) expect(flat.data[i]).toBe(noisy.data[i]);
  });

  it('refuses a color count that is not a whole number of at least two', () => {
    const noisy = grainy();
    expect(() => flatten(noisy, 1)).toThrow(/two or more/);
    expect(() => flatten(noisy, 2.5)).toThrow(/two or more/);
  });

  it('keeps the colors that cover the picture, not the ones that do not', () => {
    // Nine tenths of this picture is one dark tone and one tenth is a bright
    // one. A cut that split by extent rather than by coverage would spend its
    // palette on the tenth; both have to survive at two colors.
    const w = 64;
    const h = 64;
    const data = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      const bright = i % 10 === 0;
      data[i * 4] = bright ? 240 : 20;
      data[i * 4 + 1] = bright ? 200 : 24;
      data[i * 4 + 2] = bright ? 80 : 36;
      data[i * 4 + 3] = 255;
    }
    const flat = flatten({ width: w, height: h, data }, 2);
    const seen = new Set<number>();
    for (let i = 0; i < flat.data.length; i += 4) {
      seen.add((flat.data[i]! << 16) | (flat.data[i + 1]! << 8) | flat.data[i + 2]!);
    }
    expect(seen.size).toBe(2);
    const tones = [...seen].map((k) => (k >> 16) & 0xff).sort((a, b) => a - b);
    expect(tones[0]).toBeLessThan(64);
    expect(tones[1]).toBeGreaterThan(192);
  });

  it('reads --flatten off the command line, or answers that there is none', () => {
    expect(flattenArg(['in.png', 'out.png', '480', '160', '--frame'])).toBe(0);
    expect(flattenArg(['in.png', 'out.png', '--flatten', '32'])).toBe(32);
    expect(flattenArg(['--flatten', '2', '--frame'])).toBe(2);
  });

  it('refuses a --flatten with nothing usable after it, rather than skipping it', () => {
    // This is the whole point of the check. `Number(undefined)` is `NaN`,
    // `NaN > 0` is false, and the flatten used to be skipped without a word —
    // which on this batch's picture is the difference between 137 KB and 1.5 MB
    // going into the repo, with nothing on the terminal to say so.
    expect(() => flattenArg(['in.png', 'out.png', '--flatten'])).toThrow(/two or more/);
    expect(() => flattenArg(['--flatten', 'lots'])).toThrow(/two or more/);
    expect(() => flattenArg(['--flatten', '--frame'])).toThrow(/two or more/);
    expect(() => flattenArg(['--flatten', '1'])).toThrow(/two or more/);
    expect(() => flattenArg(['--flatten', '2.5'])).toThrow(/two or more/);
    expect(() => flattenArg(['--flatten', '-4'])).toThrow(/two or more/);
  });

  it('leaves the command line non-zero and prints the usage when it refuses', () => {
    // The throw above is the library's; this is what a person at a terminal
    // sees, and it is checked by running the script rather than by reading it.
    const script = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
      'scripts',
      'cut-banner.mjs',
    );
    const run = spawnSync(
      process.execPath,
      [script, 'no-such-file.png', 'out.png', '1280', '720', '--frame', '--flatten'],
      { encoding: 'utf8' },
    );
    expect(run.status).not.toBe(0);
    expect(run.stderr).toMatch(/two or more/);
    expect(run.stderr).toContain('--flatten N');
    // It refused before it went looking for the file, so the message is about
    // the flag and not about a missing picture.
    expect(run.stderr).not.toMatch(/ENOENT/);
  });

  it('counts colors up to its cap and no further', () => {
    const flat = cutBanner(blank(CARD.w, CARD.h), frameBox(blank(CARD.w, CARD.h)), 16, 16);
    expect(colorCount(flat)).toBe(1);
    expect(colorCount(cutSheet(card(), 480, 160, { frame: true }).banner, 4)).toBe(4);
  });
});
