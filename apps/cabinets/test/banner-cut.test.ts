// The banner cut, fed synthetic pictures so every expected box is known by
// construction rather than eyeballed off a generated one.
//
// The cut has one job neither of the other two has: it has to reach an exact
// rectangle at a named aspect, because the shell draws a word over it at a
// size it has already chosen. Everything below is about the three ways that
// goes wrong — the aspect fitted the wrong way round, a ground keyed when it
// should be solid or solid when it should be keyed, and a picture with
// nothing on it being cut into something rather than refused.

import { describe, expect, it } from 'vitest';

import { colorCount, cutBanner, cutSheet, fitAspect, frameBox } from '../scripts/cut-banner.mjs';
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

  it('counts colors up to its cap and no further', () => {
    const flat = cutBanner(blank(CARD.w, CARD.h), frameBox(blank(CARD.w, CARD.h)), 16, 16);
    expect(colorCount(flat)).toBe(1);
    expect(colorCount(cutSheet(card(), 480, 160, { frame: true }).banner, 4)).toBe(4);
  });
});
