// Types for the contact-sheet slicer, so the test that pins its cell math can
// be written in TypeScript. The script itself is plain node, on purpose: it
// runs once per art batch from the command line and has no build step.

export interface RgbaImage {
  width: number;
  height: number;
  data: Buffer;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Cut {
  kind: string;
  /** The cell's column and row, `<col>,<row>`, in reading order. */
  cell: string;
  box: Box;
  square: Box;
  tile: RgbaImage;
}

/** The eight piece kinds, in the order every contact sheet draws them. */
export const KINDS: readonly string[];
/** The ground a sheet is drawn on, and the ground a tile keys back to. */
export const GROUND: readonly [number, number, number];
/** Every tile is this, exactly. */
export const TILE: number;
/** Alpha ramps from the ground's own alpha to solid between these two values. */
export const KEY_LO: number;
export const KEY_HI: number;

export function decodePng(buf: Buffer): RgbaImage;
export function encodePng(image: RgbaImage): Buffer;
export function findCells(image: RgbaImage, o?: { cols?: number; rows?: number }): Box[];
export function squareOf(box: Box, image: RgbaImage): Box;
export function cutTile(image: RgbaImage, square: Box): RgbaImage;
export function sliceSheet(image: RgbaImage): Cut[];
