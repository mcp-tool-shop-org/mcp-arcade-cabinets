// Types for the banner cut, so the test that pins its aspect math can be
// written in TypeScript. The script itself is plain node, on purpose: it runs
// once per art batch from the command line and has no build step.

import type { Box, RgbaImage } from './slice-tiles.mjs';

export function frameBox(image: RgbaImage): Box;
export function fitAspect(box: Box, image: RgbaImage, aspect: number): Box;
export function cutBanner(
  image: RgbaImage,
  rect: Box,
  width: number,
  height: number,
  options?: { key?: boolean },
): RgbaImage;
export function colorCount(image: RgbaImage, cap?: number): number;
export function cutSheet(
  image: RgbaImage,
  width: number,
  height: number,
  options?: { frame?: boolean; key?: boolean },
): { box: Box; rect: Box; banner: RgbaImage };
