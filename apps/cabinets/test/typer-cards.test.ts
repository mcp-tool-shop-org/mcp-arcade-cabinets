// The milestone-to-card table, walked against the shipped lever.
//
// The whole point of the table is that the name the sim pushes and the file
// the shell fetches cannot drift apart. `series a` has a space in it and the
// file is `series-a.png`; nothing but this table holds those two together, so
// this is where a fourth milestone added to `score.json` fails the suite
// instead of quietly toasting a word with no picture.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { DEFAULT_PATTERNS } from '@mcp-arcade-cabinets/vibe-typer';

import { decodePng } from '../scripts/slice-tiles.mjs';
import {
  CARD_ASPECT,
  CARD_SLUGS,
  DEPLOY_SLUG,
  RIBBON_ASPECT,
  cardSlugOf,
} from '../src/typer-cards';

const CARDS = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'vibe',
  'cards',
);

function shape(slug: string): { width: number; height: number } {
  const png = decodePng(readFileSync(path.join(CARDS, `${slug}.png`)));
  return { width: png.width, height: png.height };
}

describe('the milestone cards', () => {
  it('has a card for every milestone the shipped lever names', () => {
    const names = DEFAULT_PATTERNS.score.milestones.map((m) => m.name);
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) expect(cardSlugOf(name)).not.toBeNull();
  });

  it('names no card the lever does not ask for', () => {
    const names = new Set(DEFAULT_PATTERNS.score.milestones.map((m) => m.name));
    for (const name of CARD_SLUGS.keys()) expect(names.has(name)).toBe(true);
  });

  it('turns every name into something that can be a file name', () => {
    for (const slug of [...CARD_SLUGS.values(), DEPLOY_SLUG]) {
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('gives each milestone its own card', () => {
    expect(new Set(CARD_SLUGS.values()).size).toBe(CARD_SLUGS.size);
  });

  it('does not answer a name out of the prototype', () => {
    // A plain object hands back a function for these four and the shell would
    // ask for `/vibe/cards/function Object().png`. The table is a `Map`, which
    // is the fix batch one made for the same bug in the piece-tile table.
    for (const name of ['constructor', 'toString', 'hasOwnProperty', '__proto__']) {
      expect(cardSlugOf(name)).toBeNull();
    }
  });

  it('keeps the deploy ribbon out of the milestone table', () => {
    // `deployed` is not a milestone — it is the preview's own ribbon — so it
    // must not be reachable as one, or a milestone named `deployed` would
    // draw the ribbon on the board.
    expect(cardSlugOf(DEPLOY_SLUG)).toBeNull();
  });

  it('ships a file for every card the table names, at the aspect the shell assumes', () => {
    // The preview sizes a card from `CARD_ASPECT` rather than from the
    // picture, so the picture has to be that shape. This reads the installed
    // files off disk and holds all four of them to it; a re-cut at another
    // size fails here rather than drawing a squashed card.
    for (const slug of CARD_SLUGS.values()) {
      const { width, height } = shape(slug);
      expect(width / height, slug).toBe(CARD_ASPECT);
      expect({ slug, width, height }).toEqual({ slug, width: 480, height: 160 });
    }
    const ribbon = shape(DEPLOY_SLUG);
    expect(ribbon.width / ribbon.height).toBe(RIBBON_ASPECT);
    expect(ribbon).toEqual({ width: 640, height: 80 });
  });
});
