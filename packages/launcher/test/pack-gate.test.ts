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
import { checkDist, halt, VIBE_TRACK_KEYS } from '../scripts/build.mjs';

/**
 * The seven stacks, read off the gate itself. It was a fourth hand-copy of
 * the same list until the gate exported it: the game can grow an eighth stack
 * and a test that spelled the seven again would still be green while the new
 * bed was left out of the tarball.
 */
const BEDS = VIBE_TRACK_KEYS;

type Cabinet = 'ghost' | 'vibe';

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
  /** Beds not to write, for the typing cabinet. */
  leaveOut?: string[];
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
  if (cabinet === 'vibe') await mkdir(path.join(play, 'vibe', 'tracks'), { recursive: true });
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
  if (cabinet === 'vibe') {
    for (const key of BEDS) {
      if (fake.leaveOut?.includes(key)) continue;
      await writeFile(path.join(play, 'vibe', 'tracks', `${key}.mp3`), '');
    }
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
    expect(said).toContain(path.join('play', 'vibe', 'tracks', 'sql.mp3'));
    expect(said).toContain('pnpm build:launcher');
    // And only that one: six beds out of seven is the failure a directory
    // check would have waved through, so the message has to be specific.
    for (const key of BEDS.filter((k) => k !== 'sql')) {
      expect(said, key).not.toContain(path.join('tracks', `${key}.mp3`));
    }
  });

  it('halts on every bed when none of them were copied', async () => {
    const pkg = await fakePackage({ cabinet: 'vibe', leaveOut: BEDS });
    const { halted, said } = await runGate(pkg, 'vibe');
    expect(halted).toBe(true);
    for (const key of BEDS) {
      expect(said, key).toContain(path.join('play', 'vibe', 'tracks', `${key}.mp3`));
    }
  });
});

// ——— the needles, in the failing direction ——————————————————————————————————
//
// The needles are how the gate tells a launcher shell from a Pages shell (no
// local seats, so the player would get no daemon) and one cabinet's shell
// from the other's. Neither half was ever watched fire.

describe('the play bundle the gate will accept', () => {
  for (const cabinet of ['ghost', 'vibe'] as const) {
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
  for (const cabinet of ['ghost', 'vibe'] as const) {
    const other = cabinet === 'ghost' ? 'vibe' : 'ghost';

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
    expect(said).toContain(path.join('play', 'sprites'));
  });

  it("halts on the typing cabinet's keys inside the shooter's package", async () => {
    const pkg = await fakePackage({ cabinet: 'ghost', stray: 'keys' });
    const { halted, said } = await runGate(pkg, 'ghost');
    expect(halted).toBe(true);
    expect(said).toContain("is carrying the other cabinet's files");
    expect(said).toContain(path.join('play', 'keys'));
  });

  it('halts on a public directory no cabinet claims, rather than shipping it twice', async () => {
    const pkg = await fakePackage({ cabinet: 'vibe', stray: 'lamps' });
    const { halted, said } = await runGate(pkg, 'vibe');
    expect(halted).toBe(true);
    expect(said).toContain('no cabinet claims');
    expect(said).toContain(path.join('play', 'lamps'));
    expect(said).toContain('CABINETS table');
  });
});

// ——— the shell the gate reads the needles out of ————————————————————————————

describe('a shell copied without the bundle directory', () => {
  it('names the missing directory instead of throwing an ENOENT at prepack', async () => {
    const pkg = await fakePackage({ cabinet: 'vibe', noAssets: true });
    const { halted, said } = await runGate(pkg, 'vibe');
    expect(halted).toBe(true);
    expect(said).toContain(`missing: dist/${path.join('play', 'assets')}`);
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

  it('halts naming the layout it is missing', async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'ghost-pack-'));
    await mkdir(path.join(dir, 'dist'), { recursive: true });
    const { halted, said } = await runGate(dir, 'ghost');
    expect(halted).toBe(true);
    expect(said).toContain('@mcptoolshop/ghost-on-the-menu');
    expect(said).toContain('missing: dist/cli.js');
    expect(said).toContain(`missing: dist/${path.join('play', 'sprites')}`);
    expect(said).toContain(`missing: dist/${path.join('play', 'tracks')}`);
  });
});
