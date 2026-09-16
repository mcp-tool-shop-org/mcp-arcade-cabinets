// The room the field sits in, held to the two things the shell cannot check
// for itself: the picture on disk, and the stylesheet that draws it.
//
// The shell decides whether the room is welcome by asking `matchMedia` for
// the narrow breakpoint, and the stylesheet turns the room off at the same
// breakpoint so a window dragged past it answers with no listener. That is
// two copies of one number, in two languages, and this is where they are held
// together: change the breakpoint in either place and this fails.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { decodePng } from '../scripts/slice-tiles.mjs';
import { NARROW_PX } from '../src/vibe-typer';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(path.join(HERE, '..', 'index.html'), 'utf8');
const FILE = path.join(HERE, '..', 'public', 'vibe', 'field', 'backdrop.png');

/** The `.vibe.vibe-backdrop::before` rule that draws it. */
const RULE = /\.vibe\.vibe-backdrop::before\s*\{([^}]*)\}/g;

describe('the field backdrop', () => {
  it('ships one picture at the size the shell asks for, under the size the brief sets', () => {
    const bytes = readFileSync(FILE);
    const png = decodePng(bytes);
    expect({ width: png.width, height: png.height }).toEqual({ width: 1280, height: 720 });
    expect(bytes.length).toBeLessThan(300_000);
  });

  it('carries no more colors than the flatten left it, because that is the size gate', () => {
    // 1.5 MB of grain came back from the generation in what reads as a dozen
    // flat colors. The cut medians it back down; this is what that bought.
    const png = decodePng(readFileSync(FILE));
    const seen = new Set<number>();
    for (let i = 0; i < png.data.length; i += 4) {
      seen.add((png.data[i]! << 16) | (png.data[i + 1]! << 8) | png.data[i + 2]!);
    }
    expect(seen.size).toBeLessThanOrEqual(32);
  });

  it('is opaque, because it is drawn under an opacity the stylesheet owns', () => {
    const png = decodePng(readFileSync(FILE));
    for (let i = 3; i < png.data.length; i += 4) expect(png.data[i]).toBe(255);
  });

  it('draws the room low and behind everything, so the board stays legible', () => {
    const [rule] = [...CSS.matchAll(RULE)];
    expect(rule, 'the .vibe.vibe-backdrop::before rule').toBeDefined();
    const body = rule![1]!;
    expect(body).toMatch(/opacity:\s*0\.18/);
    expect(body).toMatch(/z-index:\s*-1/);
    expect(body).toMatch(/background-size:\s*cover/);
    expect(body).toMatch(/background-position:\s*center/);
    expect(body).toMatch(/background-image:\s*var\(--vibe-backdrop\)/);
  });

  it('turns the room off at the same width the shell refuses to hang it', () => {
    // The shell's `NARROW_PX` and the stylesheet's breakpoint are one number
    // written twice. This is the only place that can notice them parting.
    const narrow = CSS.slice(CSS.indexOf(`@media (max-width: ${NARROW_PX}px)`));
    expect(narrow, `a @media (max-width: ${NARROW_PX}px) block`).not.toBe(CSS);
    const block = narrow.slice(0, narrow.indexOf('\n      }\n') + 9);
    expect(block).toContain('.vibe.vibe-backdrop::before');
    expect(block).toMatch(/\.vibe\.vibe-backdrop::before\s*\{\s*display:\s*none/);
  });

  it('turns the room off when the player asked for less movement', () => {
    const calm = CSS.slice(CSS.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(calm).not.toBe(CSS);
    const block = calm.slice(0, calm.indexOf('\n      }\n') + 9);
    expect(block).toMatch(/\.vibe\.vibe-backdrop::before\s*\{\s*display:\s*none/);
  });

  it('leaves the panes opaque, so the chat and the editor read exactly as they did', () => {
    // The room is what shows between the panes and around them. If a pane's
    // background ever goes translucent, every contrast number in the slice
    // doc stops being true and this is the test that says so.
    const pane = CSS.slice(CSS.indexOf('.vibe-pane {'));
    expect(pane.slice(0, pane.indexOf('}'))).toMatch(/background:\s*#101018\s*;/);
  });
});
