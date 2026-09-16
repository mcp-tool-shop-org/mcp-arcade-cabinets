// Types for the avatar cut, so the test that pins its box math can be written
// in TypeScript. The script itself is plain node, on purpose: it runs once per
// art batch from the command line and has no build step.

import type { Box, RgbaImage } from './slice-tiles.mjs';

/** Every avatar is this, exactly. */
export const AVATAR: number;

export function inkBox(image: RgbaImage): Box;
export function cutAvatar(image: RgbaImage, square: Box): RgbaImage;
export function cutSheet(image: RgbaImage): { box: Box; square: Box; avatar: RgbaImage };
