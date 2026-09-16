// The pack gate, exercised rather than described.
//
// `checkDist` is what `prepack` runs, so it is the last thing between a stale
// or incomplete `dist` and `npm publish`, which cannot be undone after 72
// hours. It halts by writing lines to stderr and calling `process.exit(1)`;
// both are stubbed here so a halt is a throw the case can catch and read.
//
// The case that matters is the typing cabinet's recorded beds. A missing bed
// is silent at run time by design — the procedural bed keeps the bar and the
// player gets a cabinet that works — which is the right behavior there and
// exactly why it has to be a halt here: a bed left out of the tarball would
// otherwise reach the registry as a stack that quietly never plays its music.

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

// The pack script is plain node; `scripts/build.d.mts` declares the surface a
// test may call, so this import is typed rather than `any`.
import { checkDist } from '../scripts/build.mjs';

/** The seven stacks, as `VIBE_TRACK_KEYS` in apps/cabinets/src/typer-audio.ts. */
const BEDS = ['bash', 'csharp', 'java', 'javascript', 'python', 'sql', 'integration'];

/**
 * A `dist` that passes every part of the gate: the layout, the seven beds, no
 * stray file from the other cabinet, every needle in the play bundle and the
 * other cabinet's needle absent.
 */
async function buildFakeDist(pkg: string, leaveOut: string[] = []): Promise<void> {
  const dist = path.join(pkg, 'dist');
  const play = path.join(dist, 'play');
  await mkdir(path.join(play, 'assets'), { recursive: true });
  await mkdir(path.join(play, 'keys'), { recursive: true });
  await mkdir(path.join(play, 'vibe', 'tracks'), { recursive: true });
  await mkdir(path.join(dist, 'tapes'), { recursive: true });
  for (const f of ['cli.js', 'cabinet-server.js', 'cabinet-stdio.js']) {
    await writeFile(path.join(dist, f), '');
  }
  await writeFile(path.join(play, 'index.html'), '');
  // The needles the vibe package's shell must carry, and none of Ghost's.
  await writeFile(
    path.join(play, 'assets', 'index-fake.js'),
    ['data-vibe-seat', '/cabinet/endless', '/ollama/api/tags', 'data-vibe-voice'].join('\n'),
  );
  for (const key of BEDS) {
    if (leaveOut.includes(key)) continue;
    await writeFile(path.join(play, 'vibe', 'tracks', `${key}.mp3`), '');
  }
}

/** Run the gate over a dist and return what it wrote, plus whether it halted. */
async function runGate(pkg: string): Promise<{ halted: boolean; said: string }> {
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
    await checkDist({ cabinet: 'vibe', out: pkg });
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

describe('the pack gate over the typing cabinet', () => {
  it('passes a dist that carries all seven beds', async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'vibe-pack-'));
    await buildFakeDist(dir);
    const { halted, said } = await runGate(dir);
    expect(said).toBe('');
    expect(halted).toBe(false);
  });

  it('halts naming the bed that is missing, and says how to get it', async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'vibe-pack-'));
    await buildFakeDist(dir, ['sql']);
    const { halted, said } = await runGate(dir);
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
    dir = await mkdtemp(path.join(tmpdir(), 'vibe-pack-'));
    await buildFakeDist(dir, BEDS);
    const { halted, said } = await runGate(dir);
    expect(halted).toBe(true);
    for (const key of BEDS) {
      expect(said, key).toContain(path.join('play', 'vibe', 'tracks', `${key}.mp3`));
    }
  });
});
