// The piece tiles: what a shipped snippet is a picture of, and the cut that
// made the pictures.
//
// Two halves. The first is the derivation — it must be total, stable, and
// spread over all eight kinds across the corpus that actually ships, because
// a derivation that quietly collapses to one kind would make every product
// look the same and nothing else would notice. The second is the slicer's
// cell math, fed a synthetic sheet so the expected crops are known exactly
// rather than eyeballed off a generated one.

import { describe, expect, it } from 'vitest';

import { DEFAULT_CORPUS, integrationSnippets, type Snippet } from '@mcp-arcade-cabinets/vibe-typer';

import {
  PIECE_KINDS,
  TOPIC_KINDS,
  namedByTopic,
  pieceKindOf,
  type PieceKind,
} from '../src/typer-tiles';
import {
  GROUND,
  KINDS,
  TILE,
  cutTile,
  decodePng,
  encodePng,
  findCells,
  squareOf,
} from '../scripts/slice-tiles.mjs';

/** The tapes' stack, built the way the shell builds it, so it is covered too. */
const WIRES = integrationSnippets([
  { server: 'ledger', policy: 'open', tools: ['list_rows', 'append_row', 'close_book'] },
  { server: 'courier', policy: 'strict', tools: ['send', 'track'] },
]);

const ALL: Snippet[] = [...DEFAULT_CORPUS.snippets, ...WIRES];

describe('what a piece is a picture of', () => {
  it('gives every shipped snippet one of the eight kinds', () => {
    for (const snippet of ALL) {
      expect(PIECE_KINDS).toContain(pieceKindOf(snippet));
    }
  });

  it('draws all eight kinds over the shipped corpus', () => {
    const seen = new Set<PieceKind>(ALL.map((s) => pieceKindOf(s)));
    expect([...seen].sort()).toEqual([...PIECE_KINDS].sort());
  });

  it('answers the same way every time it is asked', () => {
    for (const snippet of ALL) {
      const once = pieceKindOf(snippet);
      expect(pieceKindOf(snippet)).toBe(once);
      // And from a fresh object with the same id and topics, so nothing is
      // carried on the snippet itself.
      expect(pieceKindOf({ id: snippet.id, topics: [...snippet.topics] })).toBe(once);
    }
  });

  it('takes the first topic the table names, in the order the snippet lists them', () => {
    // `for-loop` is a ring and `print` is a bubble; whichever comes first wins.
    expect(pieceKindOf({ id: 'x', topics: ['for-loop', 'print'] })).toBe('loop');
    expect(pieceKindOf({ id: 'x', topics: ['print', 'for-loop'] })).toBe('message');
    // An unnamed topic is skipped, not fallen back on.
    expect(pieceKindOf({ id: 'x', topics: ['nothing-here', 'for-loop'] })).toBe('loop');
  });

  it('never answers a topic out of the object prototype', () => {
    // `constructor`, `toString` and friends are members of every object, so a
    // plain-object table would answer them even when nothing mapped them. The
    // two the corpus really uses are mapped on purpose; the rest must miss.
    expect(TOPIC_KINDS.get('constructor')).toBe('function');
    expect(TOPIC_KINDS.get('toString')).toBe('message');
    for (const name of ['valueOf', 'hasOwnProperty', '__proto__', 'isPrototypeOf']) {
      expect(TOPIC_KINDS.get(name)).toBeUndefined();
      expect(PIECE_KINDS).toContain(pieceKindOf({ id: 'x', topics: [name] }));
    }
  });

  it('names most of the corpus by topic rather than by the id hash', () => {
    // The table is meant to carry the weight; the hash is the tail. If this
    // ever drops, the table has gone stale against a re-authored corpus.
    const named = DEFAULT_CORPUS.snippets.filter((s) => namedByTopic(s)).length;
    expect(named / DEFAULT_CORPUS.snippets.length).toBeGreaterThan(0.8);
  });

  it('spreads the tapes stack over more than one kind', () => {
    // Every integration snippet carries the topic `integration`, so mapping
    // that topic would draw one picture for the whole stack. It is left out,
    // and the ids hash apart instead.
    expect(TOPIC_KINDS.has('integration')).toBe(false);
    const seen = new Set(WIRES.map((s) => pieceKindOf(s)));
    expect(seen.size).toBeGreaterThan(1);
  });

  it('keeps every table entry pointing at a real kind', () => {
    for (const kind of TOPIC_KINDS.values()) expect(PIECE_KINDS).toContain(kind);
  });
});

// ——— the cut ————————————————————————————————————————————————————————————

const EIGHT = [
  [40, 30, 60, 60],
  [140, 20, 80, 80],
  [260, 40, 40, 40],
  [340, 25, 70, 70],
  [30, 160, 90, 50],
  [150, 150, 60, 90],
  [250, 170, 70, 70],
  [350, 180, 50, 50],
] as const;

/** A synthetic 1024x512 sheet: eight bright squares on the ground, 4x2. */
function sheet(): { width: number; height: number; data: Buffer } {
  const width = 1024;
  const height = 512;
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = GROUND[0];
    data[i * 4 + 1] = GROUND[1];
    data[i * 4 + 2] = GROUND[2];
    data[i * 4 + 3] = 255;
  }
  EIGHT.forEach(([x, y, w, h], i) => {
    // Each square gets its own bright value, so a mixed-up crop is visible.
    const tone = 120 + i * 15;
    for (let py = y * 2; py < (y + h) * 2; py++) {
      for (let px = x * 2; px < (x + w) * 2; px++) {
        const d = (py * width + px) * 4;
        data[d] = tone;
        data[d + 1] = tone;
        data[d + 2] = tone;
        data[d + 3] = 255;
      }
    }
  });
  return { width, height, data };
}

describe('the slicer', () => {
  it('finds the eight cells of a 4x2 sheet, in reading order', () => {
    const boxes = findCells(sheet());
    expect(boxes).toHaveLength(8);
    EIGHT.forEach(([x, y, w, h], i) => {
      expect(boxes[i]).toEqual({ x: x * 2, y: y * 2, w: w * 2, h: h * 2 });
    });
  });

  it('cuts the same boxes every time it is run', () => {
    expect(findCells(sheet())).toEqual(findCells(sheet()));
  });

  it('pads each box to a square around its own center', () => {
    const image = sheet();
    for (const box of findCells(image)) {
      const square = squareOf(box, image);
      expect(square.w).toBe(square.h);
      expect(square.w).toBeGreaterThanOrEqual(Math.max(box.w, box.h));
      expect(square.x).toBeLessThanOrEqual(box.x);
      expect(square.y).toBeLessThanOrEqual(box.y);
      expect(square.x + square.w).toBeGreaterThanOrEqual(box.x + box.w);
      expect(square.y + square.h).toBeGreaterThanOrEqual(box.y + box.h);
    }
  });

  it('writes a 128x128 tile whose ground is a translucent plate', () => {
    const image = sheet();
    const box = findCells(image)[0]!;
    const tile = cutTile(image, squareOf(box, image));
    expect(tile.width).toBe(TILE);
    expect(tile.height).toBe(TILE);
    // A corner of the square is ground, so it keeps the plate's alpha; the
    // middle is the icon, so it is solid.
    expect(tile.data[3]).toBeLessThan(255);
    expect(tile.data[3]).toBeGreaterThan(0);
    const middle = ((TILE / 2) * TILE + TILE / 2) * 4;
    expect(tile.data[middle + 3]).toBe(255);
  });

  it('refuses a sheet that is not a clean four by two', () => {
    const image = sheet();
    // Blank the whole top row: two rows of icons become one.
    for (let y = 0; y < 260; y++) {
      for (let x = 0; x < image.width; x++) {
        const d = (y * image.width + x) * 4;
        image.data[d] = GROUND[0];
        image.data[d + 1] = GROUND[1];
        image.data[d + 2] = GROUND[2];
      }
    }
    expect(() => findCells(image)).toThrow(/expected 2 rows/);
  });

  it('round-trips its own PNG', () => {
    const image = sheet();
    const back = decodePng(encodePng(image));
    expect(back.width).toBe(image.width);
    expect(back.height).toBe(image.height);
    expect(back.data.equals(image.data)).toBe(true);
  });

  it('names the eight kinds the shell asks for', () => {
    expect(KINDS).toEqual([...PIECE_KINDS]);
  });
});
