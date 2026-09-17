import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  integrationFrom,
  parseBot,
  play,
  seedFromTape,
  SCREEN_FORBIDDEN,
  typistBot,
} from '../src/play';
import { loadTape } from '@mcp-arcade-cabinets/tape-core';
import { readFileSync } from 'node:fs';

const ROOT = path.resolve(__dirname, '../../..');
const DIST = path.join(ROOT, 'packages', 'vibe-typer', 'dist', 'play.js');
const TAPES = path.join(ROOT, 'fixtures', 'tapes');

type PlayCli = { typerScreenHit: (text: string) => string | null };

function cli(args: string[], timeout = 60000) {
  return spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'play.mjs'), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
  });
}

async function playCli(): Promise<PlayCli> {
  return (await import(pathToFileURL(path.join(ROOT, 'scripts', 'play.mjs')).href)) as PlayCli;
}

describe('the bots', () => {
  it('reads its own name', () => {
    expect(parseBot(undefined)).toEqual({ name: 'typist:40', wpm: 40, errorRate: 0.03 });
    expect(parseBot('idle')).toEqual({ name: 'idle', wpm: 0, errorRate: 0 });
    expect(parseBot('perfect')).toEqual({ name: 'perfect', wpm: 90, errorRate: 0 });
    expect(parseBot('typist:60:0.02')).toEqual({
      name: 'typist:60:0.02',
      wpm: 60,
      errorRate: 0.02,
    });
    expect(parseBot('sweeper')).toBeNull();
    expect(parseBot('typist:0')).toBeNull();
    expect(parseBot('typist:40:2')).toBeNull();
  });

  it('types at its cadence and no faster', () => {
    const bot = typistBot(60, 0, 1);
    const state = { clock: 0, beat: 'code', target: 'abc', typed: '', errors: [] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const first = bot(state as any);
    expect(first.key).toBe('a');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(bot(state as any)).toEqual({});
    state.clock = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(bot(state as any).key).toBe('a');
  });
});

describe('the play-through', () => {
  it('ships the first level and prints a screen with no digit on it', async () => {
    const out = play({ tier: 0, bot: 'typist:40', seed: 1 });
    expect(out.ok, out.text).toBe(true);
    expect(out.ended).toBe('shipped');
    expect(out.pieces).toBeGreaterThan(0);
    expect(out.valuation).toBeGreaterThan(0);
    const { typerScreenHit } = await playCli();
    expect(typerScreenHit(out.text)).toBeNull();
    const lines = out.text.split('\n');
    expect(lines[0]).toBe('Vibe Typer');
    expect(lines[2]).toBe('level shipped');
    expect(out.text).toMatch(/^valuation: \d+$/m);
  });

  it('fails the run when the bar empties on the gentlest tier', () => {
    const out = play({ tier: 0, bot: 'idle', endless: true, seed: 1 });
    expect(out.ok).toBe(false);
    expect(out.ended).toBe('context');
    expect(out.why).toMatch(/context/);
  });

  it('lets idle be idle on a listed level, and names an unknown bot', () => {
    const unknown = play({ bot: 'sweeper' });
    expect(unknown.ok).toBe(false);
    expect(unknown.text).toMatch(/unknown bot sweeper/);
    expect(unknown.why).toMatch(/idle, perfect or typist/);
  });

  it('plays every tier and both hands of the ladder', () => {
    for (const tier of [0, 1, 2, 3] as const) {
      const out = play({ tier, bot: 'perfect', seed: 3, level: 2 });
      expect(out.ok, `tier ${tier}: ${out.why}`).toBe(true);
      expect(out.leaked).toBe(false);
    }
  });

  it('reads the tapes for the integration stack, and nothing else from them', () => {
    const snippets = integrationFrom(TAPES);
    expect(snippets.length).toBeGreaterThan(0);
    for (const snippet of snippets) {
      expect(snippet.stack).toBe('integration');
      expect(snippet.notes.every((n) => /^(server|policy) /.test(n))).toBe(true);
    }
    const out = play({ tier: 0, bot: 'perfect', seed: 1, stack: 'integration' });
    expect(out.ok, out.why).toBe(true);
    expect(out.text).toMatch(/stack integration/);
  });

  it('takes a tool name off a tape row and never a fact', () => {
    const tape = loadTape(
      JSON.parse(readFileSync(path.join(TAPES, 'naive-ndjson.tape.json'), 'utf8')),
    );
    const seed = seedFromTape(tape);
    expect(seed.server).toBe('mcp-arcade-fixture');
    expect(seed.policy).toBe('naive');
    expect(seed.tools).toContain('echo');
    expect(seed.tools.some((t) => t.includes(' '))).toBe(false);
  });

  it('says so, and reads nothing, when there are no tapes', () => {
    const out = play({ stack: 'integration', tapes: path.join(ROOT, 'no-such-dir') });
    expect(out.ok).toBe(false);
    expect(out.why).toBe('no tapes');
    expect(integrationFrom(path.join(ROOT, 'no-such-dir'))).toEqual([]);
  });

  // The catch used to `continue` on one branch and fall off the end of the
  // block on the other, which are the same thing: a JSON syntax error, an
  // unreadable file and a genuinely malformed tape all looked exactly like a
  // directory with no tapes in it. The integration stack seasons the trigram
  // model, so a tape dropped in silence moves every snippet's value.
  it('halts on a broken fixture and only skips a tape it cannot read', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'vibe-tapes-'));
    try {
      const good = readFileSync(path.join(TAPES, 'naive-ndjson.tape.json'), 'utf8');
      writeFileSync(path.join(dir, 'good.tape.json'), good);
      // A tape this cabinet cannot read: skipped, and the rest still load.
      writeFileSync(path.join(dir, 'wrong.tape.json'), JSON.stringify({ schema: 'not-ours' }));
      expect(integrationFrom(dir).length).toBeGreaterThan(0);

      // A file that is not JSON at all is a broken fixture, not a tape.
      writeFileSync(path.join(dir, 'torn.tape.json'), '{ "schema": ');
      expect(() => integrationFrom(dir)).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('the runner', () => {
  it('scans the screen between the header and the valuation', async () => {
    const { typerScreenHit } = await playCli();
    const clean = [
      'Vibe Typer',
      'level a stack bash tier easy',
      'level shipped',
      'product ducks',
      'valuation: 12',
    ];
    expect(typerScreenHit(clean.join('\n'))).toBeNull();
    const dirty = [...clean];
    dirty.splice(3, 0, 'product 12 ducks');
    expect(typerScreenHit(dirty.join('\n'))).toBe('1');
    expect(SCREEN_FORBIDDEN.test('product 12 ducks')).toBe(true);
  });

  it('runs the cabinet from the command line', () => {
    if (!existsSync(DIST)) return; // `pnpm build` makes it; verify always does
    const ok = cli(['vibe-typer', '--tier', '0', '--bot', 'typist:40']);
    expect(ok.status, ok.stderr).toBe(0);
    expect(ok.stdout).toMatch(/^Vibe Typer$/m);
    expect(ok.stdout).toMatch(/^level shipped$/m);
    expect(ok.stdout).toMatch(/^valuation: \d+$/m);
  });

  it('names a bad bot, a bad stack, a bad flag and an unknown cabinet', () => {
    const bot = cli(['vibe-typer', '--bot', 'sweeper']);
    expect(bot.status).toBe(2);
    expect(bot.stderr).toMatch(/unknown bot sweeper/);

    const stack = cli(['vibe-typer', '--stack', 'cobol']);
    expect(stack.status).toBe(2);
    expect(stack.stderr).toMatch(/unknown stack cobol/);

    const fixture = cli(['vibe-typer', '--fixture', 'naive-ndjson']);
    expect(fixture.status).toBe(2);
    expect(fixture.stderr).toMatch(/takes no --fixture/);

    const cabinet = cli(['house-call']);
    expect(cabinet.status).toBe(2);
    expect(cabinet.stderr).toMatch(/unknown cabinet house-call; use ghost or vibe-typer/);

    const usage = cli(['--help']);
    expect(usage.status).toBe(0);
    expect(usage.stdout).toMatch(/pnpm test:play vibe-typer/);
  });
});
