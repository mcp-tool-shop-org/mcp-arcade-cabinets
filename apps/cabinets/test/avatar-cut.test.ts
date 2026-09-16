// The avatar cut, fed a synthetic picture so the expected box is known by
// construction rather than eyeballed off a generated one.
//
// The cut has one job the tile slicer does not: it has to decide what the
// subject IS, on a picture where the model chose the framing. Everything
// below is about the two ways that goes wrong — a stray lit pixel dragging
// the box out to the whole picture, and a picture with no subject at all
// being cropped into something rather than refused.

import { describe, expect, it } from 'vitest';

import { AVATAR, cutAvatar, cutSheet, inkBox } from '../scripts/cut-avatar.mjs';
import { GROUND, decodePng, encodePng, squareOf } from '../scripts/slice-tiles.mjs';

const W = 1024;
const H = 768;
/** Where the synthetic subject sits, and what it is drawn in. */
const SUBJECT = { x: 300, y: 100, w: 400, h: 500 };
const TONE = 180;

/** A picture the size a sheet comes back at: one bright block on the ground. */
function picture(): { width: number; height: number; data: Buffer } {
  const data = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    data[i * 4] = GROUND[0];
    data[i * 4 + 1] = GROUND[1];
    data[i * 4 + 2] = GROUND[2];
    data[i * 4 + 3] = 255;
  }
  for (let y = SUBJECT.y; y < SUBJECT.y + SUBJECT.h; y++) {
    for (let x = SUBJECT.x; x < SUBJECT.x + SUBJECT.w; x++) {
      const d = (y * W + x) * 4;
      data[d] = TONE;
      data[d + 1] = TONE;
      data[d + 2] = TONE;
    }
  }
  return { width: W, height: H, data };
}

function lit(image: { width: number; data: Buffer }, x: number, y: number): void {
  const d = (y * image.width + x) * 4;
  image.data[d] = 255;
  image.data[d + 1] = 255;
  image.data[d + 2] = 255;
}

describe('the avatar cut', () => {
  it('finds the one box the whole drawing sits in', () => {
    expect(inkBox(picture())).toEqual(SUBJECT);
  });

  it('ignores a stray lit pixel in the corner', () => {
    // One pixel is one row and one column, and neither clears the two-pixel
    // floor. Without that floor a single speck would drag the box out to the
    // whole picture and the cut would be a letterbox of the subject.
    const image = picture();
    lit(image, 4, 4);
    lit(image, W - 5, H - 5);
    expect(inkBox(image)).toEqual(SUBJECT);
  });

  it('pads the box to a square around its own center, inside the picture', () => {
    const image = picture();
    const box = inkBox(image);
    const square = squareOf(box, image);
    expect(square.w).toBe(square.h);
    expect(square.w).toBeGreaterThanOrEqual(Math.max(box.w, box.h));
    expect(square.x).toBeLessThanOrEqual(box.x);
    expect(square.y).toBeLessThanOrEqual(box.y);
    expect(square.x + square.w).toBeGreaterThanOrEqual(box.x + box.w);
    expect(square.y + square.h).toBeGreaterThanOrEqual(box.y + box.h);
    expect(square.x).toBeGreaterThanOrEqual(0);
    expect(square.y).toBeGreaterThanOrEqual(0);
    expect(square.x + square.w).toBeLessThanOrEqual(image.width);
    expect(square.y + square.h).toBeLessThanOrEqual(image.height);
  });

  it('writes a 128x128 avatar that is opaque all the way out to its ground', () => {
    // The tiles key their ground down to a translucent plate because they are
    // drawn over a colored block. An avatar sits on the chat pane, which is
    // the same near-black the picture is drawn on, so it stays solid.
    const { avatar } = cutSheet(picture());
    expect(avatar.width).toBe(AVATAR);
    expect(avatar.height).toBe(AVATAR);
    for (let i = 3; i < avatar.data.length; i += 4) {
      expect(avatar.data[i]).toBe(255);
    }
    const middle = ((AVATAR / 2) * AVATAR + AVATAR / 2) * 4;
    expect(avatar.data[middle]).toBe(TONE);
    // A corner of the square is margin, so it is the ground the pane paints.
    // All three channels, not two: `#101018` has a distinct green, and
    // checking only red and blue would pass on a ground that had drifted.
    expect(avatar.data[0]).toBe(GROUND[0]);
    expect(avatar.data[1]).toBe(GROUND[1]);
    expect(avatar.data[2]).toBe(GROUND[2]);
  });

  it('cuts the same avatar every time it is run', () => {
    const a = cutSheet(picture());
    const b = cutSheet(picture());
    expect(a.box).toEqual(b.box);
    expect(a.square).toEqual(b.square);
    expect(a.avatar.data.equals(b.avatar.data)).toBe(true);
  });

  it('round-trips the avatar it writes', () => {
    const { avatar } = cutSheet(picture());
    const back = decodePng(encodePng(avatar));
    expect(back.width).toBe(AVATAR);
    expect(back.height).toBe(AVATAR);
    expect(back.data.equals(avatar.data)).toBe(true);
  });

  it('refuses a picture with no drawing on it', () => {
    const image = picture();
    for (let i = 0; i < W * H; i++) {
      image.data[i * 4] = GROUND[0];
      image.data[i * 4 + 1] = GROUND[1];
      image.data[i * 4 + 2] = GROUND[2];
    }
    expect(() => inkBox(image)).toThrow(/no drawing/);
  });

  it('refuses a picture whose ink fills the frame, because there is no subject', () => {
    const image = picture();
    for (let i = 0; i < W * H; i++) {
      image.data[i * 4] = TONE;
      image.data[i * 4 + 1] = TONE;
      image.data[i * 4 + 2] = TONE;
    }
    expect(() => inkBox(image)).toThrow(/re-roll/);
  });

  it('keeps the whole subject inside the avatar it cuts', () => {
    // The subject is taller than it is wide, which is the shape a portrait
    // comes back in; the square has to grow on the axis the subject is short
    // on and never crop the axis it is long on.
    const image = picture();
    const { square, avatar } = cutSheet(image);
    expect(square.y).toBeLessThan(SUBJECT.y);
    expect(square.y + square.h).toBeGreaterThan(SUBJECT.y + SUBJECT.h);
    // And on the other axis too, or a crop that shaved a shoulder off the
    // left or the right would pass this.
    expect(square.x).toBeLessThan(SUBJECT.x);
    expect(square.x + square.w).toBeGreaterThan(SUBJECT.x + SUBJECT.w);
    // Top-middle of the avatar is above the subject, so it is ground.
    const top = (2 * AVATAR + AVATAR / 2) * 4;
    expect(avatar.data[top]).toBe(GROUND[0]);
    expect(cutAvatar(image, square).data.equals(avatar.data)).toBe(true);
  });
});
