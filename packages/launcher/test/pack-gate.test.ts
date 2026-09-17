// The pack gate, exercised rather than described.
//
// `checkDist` is what `prepack` runs, so it is the last thing between a stale
// or incomplete `dist` and `npm publish`, which cannot be undone after 72
// hours. It halts by writing lines to stderr and calling `process.exit(1)`;
// both are stubbed here so a halt is a throw the case can catch and read.
//
// Every part of the gate is run in both directions and for both cabinets: a
// `dist` that should pass, and the same `dist` with the protected thing moved
// so the halt has to fire and has to name it. A gate nobody has watched go
// red is a gate nobody knows the shape of, and this one only gets to fail
// once — at publish time, on a tarball that is already public.
//
// The case that started the file is the typing cabinet's recorded beds. A
// missing bed is silent at run time by design — the procedural bed keeps the
// bar and the player gets a cabinet that works — which is the right behavior
// there and exactly why it has to be a halt here: a bed left out of the
// tarball would otherwise reach the registry as a stack that quietly never
// plays its music.

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

// The pack script is plain node; `scripts/build.d.mts` declares the surface a
// test may call, so this import is typed rather than `any`.
import {
  BED_MIN_BYTES,
  type Cabinet,
  CABINET_NAMES,
  checkDist,
  GHOST_TRACK_KEYS,
  halt,
  parsePackArgs,
  VIBE_TRACK_KEYS,
} from '../scripts/build.mjs';

/**
 * The seven stacks, read off the gate itself. It was a fourth hand-copy of
 * the same list until the gate exported it: the game can grow an eighth stack
 * and a test that spelled the seven again would still be green while the new
 * bed was left out of the tarball.
 */
const BEDS = VIBE_TRACK_KEYS;

/**
 * The shooter's eight, read off the gate the same way. The shooter's beds were
 * a directory-only requirement until the music pass made each one a
 * two-minute piece; the requirement is per file now, and a gate nobody has
 * watched go red is a gate nobody knows the shape of.
 */
const GHOST_BEDS = GHOST_TRACK_KEYS;

/** Where each cabinet keeps its beds inside `play/`. */
const TRACK_DIR: Record<Cabinet, string[]> = {
  ghost: ['tracks'],
  vibe: ['vibe', 'tracks'],
};

/** The beds each cabinet's package must carry, by key. */
const CABINET_BEDS: Record<Cabinet, string[]> = { ghost: GHOST_BEDS, vibe: BEDS };

// `Cabinet` and the list of cabinets are the pack script's, imported rather
// than re-typed here. The set of cabinets a package can be built for was a
// hand-kept union spelled independently in this file and in the CABINETS
// table, with nothing tying the two together: a third cabinet package added
// to the table without a matching edit here would have left the new
// cabinet's spec untested rather than failing loudly. Now it is a missing
// key in every Record below, which the compiler names, and one more turn of
// every loop.

/** The public directories each cabinet's package carries, as the gate splits them. */
const PUBLIC: Record<Cabinet, string[]> = {
  ghost: ['sprites', 'tracks'],
  vibe: ['keys', 'vibe'],
};

/** What must be in each cabinet's play bundle, and what must not. */
const NEEDLES: Record<Cabinet, string[]> = {
  ghost: ['data-local-seats', '/ollama/api/tags', '/ollama/api/generate', 'Ollama bosses'],
  vibe: ['data-vibe-seat', '/cabinet/endless', '/ollama/api/tags', 'data-vibe-voice'],
};

/** The other cabinet's mark, which must NOT be in this cabinet's bundle. */
const ABSENT: Record<Cabinet, string> = {
  ghost: 'data-vibe-seat',
  vibe: 'Ollama bosses',
};

/** The name each cabinet's stdio server answers `initialize` with. */
const STDIO: Record<Cabinet, string> = {
  ghost: '"ghost-on-the-menu"',
  vibe: '"vibe-typer"',
};

interface Fake {
  cabinet: Cabinet;
  /** Beds not to write, whichever cabinet's beds those are. */
  leaveOut?: string[];
  /** Beds to write as a stub: present, and far under what a bed weighs. */
  thin?: string[];
  /** A needle to leave out of the play bundle. */
  dropNeedle?: string;
  /** A string to write into the play bundle that does not belong to this cabinet. */
  plant?: string;
  /** An extra directory under `play/`. */
  stray?: string;
  /** What to write into `cabinet-stdio.js`; the cabinet's own mark by default. */
  stdio?: string;
  /** Leave `play/assets` out, the way a shell copied without it would. */
  noAssets?: boolean;
}

/**
 * A `dist` that passes every part of the gate: the layout, the seven beds, no
 * stray file from the other cabinet, every needle in the play bundle, the
 * other cabinet's needle absent, and this cabinet's own stdio server.
 */
async function buildFakeDist(pkg: string, fake: Fake): Promise<void> {
  const { cabinet } = fake;
  const dist = path.join(pkg, 'dist');
  const play = path.join(dist, 'play');
  if (!fake.noAssets) await mkdir(path.join(play, 'assets'), { recursive: true });
  for (const dir of PUBLIC[cabinet]) await mkdir(path.join(play, dir), { recursive: true });
  await mkdir(path.join(play, ...TRACK_DIR[cabinet]), { recursive: true });
  if (fake.stray) await mkdir(path.join(play, fake.stray), { recursive: true });
  await mkdir(path.join(dist, 'tapes'), { recursive: true });
  for (const f of ['cli.js', 'cabinet-server.js']) await writeFile(path.join(dist, f), '');
  await writeFile(path.join(dist, 'cabinet-stdio.js'), fake.stdio ?? STDIO[cabinet]);
  await writeFile(path.join(play, 'index.html'), '');
  if (!fake.noAssets) {
    const marks = NEEDLES[cabinet].filter((n) => n !== fake.dropNeedle);
    if (fake.plant) marks.push(fake.plant);
    await writeFile(path.join(play, 'assets', 'index-fake.js'), marks.join('\n'));
  }
  for (const key of CABINET_BEDS[cabinet]) {
    if (fake.leaveOut?.includes(key)) continue;
    // A bed that passes weighs what a bed weighs. The bytes are nothing, but
    // the gate reads the size and a zero-byte file is the failure under test
    // two cases down.
    const body = fake.thin?.includes(key) ? Buffer.alloc(64) : Buffer.alloc(BED_MIN_BYTES);
    await writeFile(path.join(play, ...TRACK_DIR[cabinet], `${key}.mp3`), body);
  }
}

/** Run the gate over a dist and return what it wrote, plus whether it halted. */
async function runGate(pkg: string, cabinet: Cabinet): Promise<{ halted: boolean; said: string }> {
  const lines: string[] = [];
  const wrote = vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
    lines.push(String(chunk));
    return true;
  });
  const exited = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
    throw new Error(`halt ${String(code)}`);
  });
  let halted = false;
  try {
    await checkDist({ cabinet, out: pkg });
  } catch (err) {
    halted = err instanceof Error && err.message.startsWith('halt');
    if (!halted) throw err;
  } finally {
    wrote.mockRestore();
    exited.mockRestore();
  }
  return { halted, said: lines.join('') };
}

let dir: string | null = null;

afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
  dir = null;
});

/** A temp package directory for one case. */
async function fakePackage(fake: Fake): Promise<string> {
  dir = await mkdtemp(path.join(tmpdir(), `${fake.cabinet}-pack-`));
  await buildFakeDist(dir, fake);
  return dir;
}

// The andon itself, which the typing cabinet's wrapper now shares rather
// than letting an unexpected failure out as an unhandled rejection with a raw
// stack — at `prepack`, which is during `npm publish`.
describe('the halt both packages route their failures through', () => {
  it('writes every line and leaves with one', () => {
    const lines: string[] = [];
    const wrote = vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
      lines.push(String(chunk));
      return true;
    });
    const exited = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
      throw new Error(`halt ${String(code)}`);
    });
    try {
      expect(() =>
        halt(['launcher: something went wrong', '', 'next: pnpm build:launcher']),
      ).toThrow('halt 1');
    } finally {
      wrote.mockRestore();
      exited.mockRestore();
    }
    expect(lines.join('')).toContain('launcher: something went wrong');
    expect(lines.join('')).toContain('next: pnpm build:launcher');
  });
});

describe('the pack gate over the typing cabinet', () => {
  it('passes a dist that carries all seven beds', async () => {
    const pkg = await fakePackage({ cabinet: 'vibe' });
    const { halted, said } = await runGate(pkg, 'vibe');
    expect(said).toBe('');
    expect(halted).toBe(false);
  });

  it('halts naming the bed that is missing, and says how to get it', async () => {
    const pkg = await fakePackage({ cabinet: 'vibe', leaveOut: ['sql'] });
    const { halted, said } = await runGate(pkg, 'vibe');
    expect(halted).toBe(true);
    expect(said).toContain('@mcptoolshop/vibe-typer');
    expect(said).toContain('play/vibe/tracks/sql.mp3');
    expect(said).toContain('pnpm build:launcher');
    // And only that one: six beds out of seven is the failure a directory
    // check would have waved through, so the message has to be specific.
    for (const key of BEDS.filter((k) => k !== 'sql')) {
      expect(said, key).not.toContain(`tracks/${key}.mp3`);
    }
  });

  // Presence was the whole check until the beds became two-minute pieces. A
  // truncated or placeholder copy is present, passes, and reaches the registry
  // as a stack whose music is a fraction of a second.
  it('halts naming a bed that is there and is far too small to be one', async () => {
    const pkg = await fakePackage({ cabinet: 'vibe', thin: ['java'] });
    const { halted, said } = await runGate(pkg, 'vibe');
    expect(halted).toBe(true);
    expect(said).toContain('@mcptoolshop/vibe-typer');
    expect(said).toContain('play/vibe/tracks/java.mp3');
    expect(said).toContain('too small');
    for (const key of BEDS.filter((k) => k !== 'java')) {
      expect(said, key).not.toContain(`tracks/${key}.mp3`);
    }
  });

  it('halts on every bed when none of them were copied', async () => {
    const pkg = await fakePackage({ cabinet: 'vibe', leaveOut: BEDS });
    const { halted, said } = await runGate(pkg, 'vibe');
    expect(halted).toBe(true);
    for (const key of BEDS) {
      expect(said, key).toContain(`play/vibe/tracks/${key}.mp3`);
    }
  });
});

// ——— the needles, in the failing direction ——————————————————————————————————
//
// The needles are how the gate tells a launcher shell from a Pages shell (no
// local seats, so the player would get no daemon) and one cabinet's shell
// from the other's. Neither half was ever watched fire.

describe('the play bundle the gate will accept', () => {
  for (const cabinet of CABINET_NAMES) {
    it(`halts naming the ${cabinet} mark that was stripped out`, async () => {
      const dropNeedle = NEEDLES[cabinet][0]!;
      const pkg = await fakePackage({ cabinet, dropNeedle });
      const { halted, said } = await runGate(pkg, cabinet);
      expect(halted).toBe(true);
      expect(said).toContain(`not a ${cabinet} launcher shell`);
      expect(said).toContain('mount mark');
      expect(said).toContain(`VITE_CABINET=${cabinet}`);
    });

    it(`halts when the ${cabinet} bundle still carries the other cabinet`, async () => {
      const pkg = await fakePackage({ cabinet, plant: ABSENT[cabinet] });
      const { halted, said } = await runGate(pkg, cabinet);
      expect(halted).toBe(true);
      expect(said).toContain('is carrying the other cabinet');
      expect(said).toContain('still in the bundle');
    });
  }
});

// ——— the stdio server, which nothing checked the identity of ————————————————
//
// `layoutOf` asks whether `cabinet-stdio.js` is there. Nothing asked whose it
// was, and the play shell is the only half of the package the marker gate
// looked at — so a crossed mapping would publish the other cabinet's `--mcp`
// server under this name and pass every gate on the way.

describe("the stdio server a package's --mcp hands stdio to", () => {
  for (const cabinet of CABINET_NAMES) {
    const other = CABINET_NAMES.find((name) => name !== cabinet)!;

    // A crossed STDIO_BUNDLES mapping puts the other cabinet's server here
    // whole, so what the gate sees is its own mark gone.
    it(`halts when the ${cabinet} package carries the ${other} stdio server`, async () => {
      const pkg = await fakePackage({ cabinet, stdio: STDIO[other] });
      const { halted, said } = await runGate(pkg, cabinet);
      expect(halted).toBe(true);
      expect(said).toContain(`--mcp server is not the ${cabinet} one`);
      expect(said).toContain('STDIO_BUNDLES');
    });

    // And a build that put both servers in one file: this cabinet's `--mcp`
    // would answer with the other cabinet's levers as well as its own.
    it(`halts when the ${cabinet} stdio server carries the ${other} one too`, async () => {
      const pkg = await fakePackage({ cabinet, stdio: `${STDIO[cabinet]}\n${STDIO[other]}` });
      const { halted, said } = await runGate(pkg, cabinet);
      expect(halted).toBe(true);
      expect(said).toContain(`--mcp server is the ${other} cabinet's`);
      expect(said).toContain('in the bundle');
    });

    it(`halts when the ${cabinet} package's stdio server is nobody's`, async () => {
      const pkg = await fakePackage({ cabinet, stdio: 'export const nothing = 1;' });
      const { halted, said } = await runGate(pkg, cabinet);
      expect(halted).toBe(true);
      expect(said).toContain(`--mcp server is not the ${cabinet} one`);
    });
  }
});

// ——— the files that should not be in this tarball ———————————————————————————

describe('what a package carries that is not its own', () => {
  it("halts on the shooter's sprites inside the typing cabinet's package", async () => {
    const pkg = await fakePackage({ cabinet: 'vibe', stray: 'sprites' });
    const { halted, said } = await runGate(pkg, 'vibe');
    expect(halted).toBe(true);
    expect(said).toContain("is carrying the other cabinet's files");
    expect(said).toContain('play/sprites');
  });

  it("halts on the typing cabinet's keys inside the shooter's package", async () => {
    const pkg = await fakePackage({ cabinet: 'ghost', stray: 'keys' });
    const { halted, said } = await runGate(pkg, 'ghost');
    expect(halted).toBe(true);
    expect(said).toContain("is carrying the other cabinet's files");
    expect(said).toContain('play/keys');
  });

  it('halts on a public directory no cabinet claims, rather than shipping it twice', async () => {
    const pkg = await fakePackage({ cabinet: 'vibe', stray: 'lamps' });
    const { halted, said } = await runGate(pkg, 'vibe');
    expect(halted).toBe(true);
    expect(said).toContain('no cabinet claims');
    expect(said).toContain('play/lamps');
    expect(said).toContain('CABINETS table');
  });
});

// ——— the shell the gate reads the needles out of ————————————————————————————

describe('a shell copied without the bundle directory', () => {
  it('names the missing directory instead of throwing an ENOENT at prepack', async () => {
    const pkg = await fakePackage({ cabinet: 'vibe', noAssets: true });
    const { halted, said } = await runGate(pkg, 'vibe');
    expect(halted).toBe(true);
    expect(said).toContain('expected: dist/play/assets');
    expect(said).toContain('pnpm build:launcher');
    expect(said).not.toContain('ENOENT');
  });
});

// ——— the shooter's own spec, which no test used to reach ————————————————————

describe('the pack gate over the shooter', () => {
  it('passes a dist built for the shooter', async () => {
    const pkg = await fakePackage({ cabinet: 'ghost' });
    const { halted, said } = await runGate(pkg, 'ghost');
    expect(said).toBe('');
    expect(halted).toBe(false);
  });

  it('halts naming the bed that is missing, and only that one', async () => {
    // The shooter's beds are 110-128 s pieces since the music pass. A bed left
    // out of the tarball is silent at run time by design — the chiptune keeps
    // the round — so the tarball is the only place it can be caught, and this
    // is the halt that catches it.
    const pkg = await fakePackage({ cabinet: 'ghost', leaveOut: ['doorman'] });
    const { halted, said } = await runGate(pkg, 'ghost');
    expect(halted).toBe(true);
    expect(said).toContain('@mcptoolshop/ghost-on-the-menu');
    expect(said).toContain('play/tracks/doorman.mp3');
    expect(said).toContain('pnpm build:launcher');
    for (const key of GHOST_BEDS.filter((k) => k !== 'doorman')) {
      expect(said, key).not.toContain(`tracks/${key}.mp3`);
    }
  });

  it('halts on every bed when none of them were copied', async () => {
    const pkg = await fakePackage({ cabinet: 'ghost', leaveOut: GHOST_BEDS });
    const { halted, said } = await runGate(pkg, 'ghost');
    expect(halted).toBe(true);
    for (const key of GHOST_BEDS) {
      expect(said, key).toContain(`play/tracks/${key}.mp3`);
    }
  });

  it('halts naming a bed that is there and is far too small to be one', async () => {
    const pkg = await fakePackage({ cabinet: 'ghost', thin: ['whisperer'] });
    const { halted, said } = await runGate(pkg, 'ghost');
    expect(halted).toBe(true);
    expect(said).toContain('@mcptoolshop/ghost-on-the-menu');
    expect(said).toContain('play/tracks/whisperer.mp3');
    expect(said).toContain('too small');
    // The floor is under the lightest bed the cabinet ships (1.69 MB) and
    // over anything a truncated write leaves behind.
    expect(BED_MIN_BYTES).toBeLessThan(1.69 * 1024 * 1024);
  });

  it('halts naming the layout it is missing', async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'ghost-pack-'));
    await mkdir(path.join(dir, 'dist'), { recursive: true });
    const { halted, said } = await runGate(dir, 'ghost');
    expect(halted).toBe(true);
    expect(said).toContain('@mcptoolshop/ghost-on-the-menu');
    expect(said).toContain('expected: dist/cli.js');
    expect(said).toContain('expected: dist/play/sprites');
    expect(said).toContain('expected: dist/play/tracks');
  });

  // `dist/${rel}` spelled a forward slash and then handed the rest of the
  // path to `path.join`, so a Windows halt read `dist/play\tracks` -- two
  // separators in one path, in the one message a publisher reads under
  // pressure. The gate names one bullet label and one separator now.
  it('spells every path in one separator, whatever the platform', async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'ghost-pack-'));
    await mkdir(path.join(dir, 'dist'), { recursive: true });
    const { halted, said } = await runGate(dir, 'ghost');
    expect(halted).toBe(true);
    expect(said).not.toContain('\\');
    // And one word for the relation, not `missing:` here and `expected:` in
    // the launcher for the same thing.
    expect(said).not.toContain('missing: ');
  });
});

// ——— the arguments, at the one irreversible step ————————————————————————————
//
// `prepack` runs during `npm publish`. A flag this script does not understand
// must stop the publish rather than pick the more dangerous of two behaviors,
// and a flag that takes a value must be given one: `--out` with nothing after
// it used to mean the cabinet's own package directory, which is the real
// package, after the `rm -rf` of it.

describe('the arguments the pack script will act on', () => {
  it('reads the ordinary lines both packages run', () => {
    expect(parsePackArgs(['--cabinet', 'ghost'])).toEqual({ cabinet: 'ghost', check: false });
    expect(parsePackArgs(['--cabinet', 'vibe', '--check'])).toEqual({
      cabinet: 'vibe',
      check: true,
    });
    expect(parsePackArgs(['--cabinet', 'vibe', '--out', 'somewhere'])).toEqual({
      cabinet: 'vibe',
      check: false,
      out: 'somewhere',
    });
  });

  it('halts on a flag it was given nothing for, rather than taking the package', () => {
    expect(parsePackArgs(['--cabinet', 'ghost', '--out'])).toEqual({
      bad: '--out wants a directory',
    });
    // And does not swallow the next flag as a directory name.
    expect(parsePackArgs(['--out', '--check'])).toEqual({ bad: '--out wants a directory' });
    expect(parsePackArgs(['--cabinet'])).toEqual({
      bad: `--cabinet wants ${CABINET_NAMES.join(' or ')}`,
    });
    expect(parsePackArgs(['--cabinet', '--check'])).toEqual({
      bad: `--cabinet wants ${CABINET_NAMES.join(' or ')}`,
    });
  });

  it('halts on a cabinet it does not have, naming the ones it does', () => {
    const args = parsePackArgs(['--cabinet', 'house-call']);
    expect(args.bad).toContain('house-call');
    for (const name of CABINET_NAMES) expect(args.bad, name).toContain(name);
  });

  // The typing cabinet's wrapper routes through this, so a typo in its own
  // prepack script (`--chekc`, `-check`) stops the publish instead of
  // silently rebuilding dist from whichever cabinet's shell is on disk.
  it('halts on a mistyped --check rather than rebuilding at publish time', () => {
    for (const typo of ['--chekc', '-check', '--Check']) {
      expect(parsePackArgs(['--cabinet', 'vibe', typo]), typo).toEqual({
        bad: `unknown argument ${typo}`,
      });
    }
    // The shape the wrapper hands over when it is given nothing.
    expect(parsePackArgs(['--cabinet', 'vibe'])).toEqual({ cabinet: 'vibe', check: false });
  });
});
