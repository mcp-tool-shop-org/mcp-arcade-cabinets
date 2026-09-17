// The surfaces that describe this package and are not the package: the
// Catalog listing's prose, the image header, the image label, and the four
// hand-copies of the screen needle.
//
// `assertCatalogTools` compares the flat tools array — name, description,
// inputSchema — and never sees a sentence. So three hand-written statements
// of the tool set sat outside every gate, and the moment a seventh lever
// lands the public listing, the image header and the image label all
// describe a cabinet that no longer exists with nothing going red. Same
// class for the screen needle: a test carrying its own copy of the gate can
// only ever assert against itself.
//
// The technique is the repo's own (patterns.test.ts pins a constant by
// reading another package's source and comparing the literal). It was simply
// never applied here.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { SCREEN_FORBIDDEN } from '@mcp-arcade-cabinets/ghost-on-the-menu/src/types';
import { SCREEN_FORBIDDEN as VIBE_SCREEN } from '@mcp-arcade-cabinets/vibe-typer/src/play';

import { TOOL_NAMES, VIBE_TOOL_NAMES } from '../src/tool-names';

const ROOT = path.resolve(__dirname, '../../..');
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');

/** Counts as this repo writes them: nothing operator-facing carries a digit. */
const COUNT_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
] as const;

function countWord(n: number): string {
  const word = COUNT_WORDS[n];
  if (word === undefined) throw new Error(`no word for a set of ${n} levers`);
  return word;
}

/** Comment markers and line wraps out; one flat string to match sentences in. */
function flatten(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/^\s*#\s?/, ''))
    .join(' ')
    .replace(/\s+/g, ' ');
}

function matchAll(text: string, re: RegExp): string[] {
  return [...text.matchAll(re)].map((m) => m[1]!);
}

describe('the hand-written statements of the tool set', () => {
  it("the Catalog listing's prose names the count and every lever the shooter carries", () => {
    const yaml = read('catalog/server.yaml');
    const flat = flatten(yaml);

    const stated = matchAll(flat, /\bThe (\w+) tools are the levers\b/g);
    expect(
      stated,
      'catalog/server.yaml no longer states the tool set the way this gate reads it',
    ).toHaveLength(1);
    expect(stated[0]).toBe(countWord(TOOL_NAMES.length));

    // The sentence that follows the count lists them; every lever has to be
    // in it, and a lever the shooter does not carry may not be.
    const listing = flat.slice(flat.indexOf('The ' + stated[0] + ' tools are the levers'));
    for (const name of TOOL_NAMES) {
      expect(listing, `catalog/server.yaml does not name ${name}`).toMatch(
        new RegExp(`\\b${name}\\b`),
      );
    }

    // Any other count of tools in this file is a statement nothing gates.
    const every = matchAll(flat, /\b(\w+) tools(?![.\w])/g);
    expect(every, 'a statement of the tool set in catalog/server.yaml that nothing checks').toEqual(
      stated,
    );
  });

  it("the image header and the image label state each cabinet's own count", () => {
    const flat = flatten(read('Dockerfile'));

    const ghost = matchAll(flat, /Ghost on the Menu \((\w+) tools\b/g);
    const vibe = matchAll(flat, /Vibe Typer \((\w+) tools\b/g);
    expect(ghost.length, "the Dockerfile no longer states the shooter's tool set").toBeGreaterThan(
      0,
    );
    expect(
      vibe.length,
      "the Dockerfile no longer states the typing cabinet's tool set",
    ).toBeGreaterThan(0);
    for (const word of ghost) expect(word).toBe(countWord(TOOL_NAMES.length));
    for (const word of vibe) expect(word).toBe(countWord(VIBE_TOOL_NAMES.length));

    // Both the header comment and the OCI label say it, and this is what
    // holds them to saying it in the one shape this gate can read.
    expect(ghost.length, 'the header and the label must both name the shooter').toBeGreaterThan(1);
    expect(
      vibe.length,
      'the header and the label must both name the typing cabinet',
    ).toBeGreaterThan(1);

    const every = matchAll(flat, /\b(\w+) tools(?![.\w])/g);
    expect(
      [...every].sort(),
      'a statement of the tool set in the Dockerfile that nothing checks',
    ).toEqual([...ghost, ...vibe].sort());
  });

  /**
   * The pin rule, enforced rather than remembered.
   *
   * `catalog/server.yaml` pins the commit whose bundled server.js the
   * registry CI builds, and esbuild inlines src/ — so a later src change is
   * a pin bump even when Dockerfile bytes do not move. The only thing
   * holding that was a comment and a coordinator step; ci.yml requires
   * ancestry, which a stale pin satisfies.
   *
   * It is gated on CABINET_PIN_GATE because the pin is bumped to the landing
   * SHA *after* a wave lands, so src/ is expected to sit ahead of it during
   * ordinary work and a hard gate here would be red by design mid-run. The
   * release path sets the variable; see the note in the summary about wiring
   * it into release.yml, which is another domain's file.
   */
  it.runIf(process.env.CABINET_PIN_GATE === 'on')(
    'the listing pin is an ancestor of HEAD and no older than the newest src commit',
    () => {
      const yaml = read('catalog/server.yaml');
      const pin = /^\s*commit:\s*([0-9a-f]{40})\s*$/m.exec(yaml)?.[1];
      expect(pin, 'catalog/server.yaml carries no source.commit').toBeDefined();

      const git = (args: string[]) =>
        execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();

      expect(() => git(['merge-base', '--is-ancestor', pin!, 'HEAD'])).not.toThrow();

      const newestSrc = git([
        'log',
        '-1',
        '--format=%H',
        'HEAD',
        '--',
        'packages/cabinet-server/src',
      ]);
      expect(newestSrc, 'no commit touching the cabinet server source').not.toBe('');
      // The pin is fresh when the newest src commit is at or behind it.
      expect(
        () => git(['merge-base', '--is-ancestor', newestSrc, pin!]),
        'src has moved past the listing pin; bump source.commit to the landing SHA',
      ).not.toThrow();
    },
  );
});

describe('the screen needle', () => {
  /** The one the sim, the renderer and the shift card all strip against. */
  const CANON = SCREEN_FORBIDDEN.source;

  /** Pull `const SCREEN_FORBIDDEN = /.../flags;` out of a file, or fail loudly. */
  function literalIn(rel: string): string {
    const text = read(rel);
    const m = /SCREEN_FORBIDDEN\s*=\s*\/((?:[^\\/\n]|\\.)+)\/[a-z]*\s*;/.exec(text);
    if (!m) throw new Error(`${rel}: no SCREEN_FORBIDDEN literal found to compare`);
    return m[1]!;
  }

  it('every hand-copy of it is the same set of needles', () => {
    // Two of these are TypeScript and export the constant; two are plain
    // node and cannot import it, so they get the reading treatment instead.
    expect(VIBE_SCREEN.source, 'packages/vibe-typer/src/play.ts').toBe(CANON);
    for (const rel of [
      'packages/ghost-on-the-menu/src/play.ts',
      'packages/vibe-typer/src/play.ts',
      'scripts/play.mjs',
      'scripts/transcript.mjs',
    ]) {
      expect(literalIn(rel), rel).toBe(CANON);
    }
  });

  it('the extraction fails loudly rather than passing on nothing', () => {
    expect(() => literalIn('packages/cabinet-server/src/tool-names.ts')).toThrow(
      /no SCREEN_FORBIDDEN literal found/,
    );
  });
});
