// The shared runner library: the entrypoint check, the parser and the named
// reads every script under scripts/ leans on. These are the traps the amend
// wave closed, so each case here fails against the code as it stood.
import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import { cliError, isMain, parseArgv, readJsonFile, requirePort } from '../lib/cli.mjs';

const SCRIPTS = fileURLToPath(new URL('..', import.meta.url));
const selfUrl = pathToFileURL(path.join(SCRIPTS, 'play.mjs')).href;

/** `die` exits; the tests that drive it hold process.exit and stderr. */
function holdExit(run) {
  const codes = [];
  const errs = [];
  const exit = vi.spyOn(process, 'exit').mockImplementation((code) => {
    codes.push(code);
    throw new Error('exited');
  });
  const err = vi.spyOn(console, 'error').mockImplementation((msg) => errs.push(String(msg)));
  try {
    run();
  } catch (e) {
    if (!(e instanceof Error) || e.message !== 'exited') throw e;
  } finally {
    exit.mockRestore();
    err.mockRestore();
  }
  return { codes, stderr: errs.join('\n') };
}

describe('isMain is the resolved path, never the basename (F-34cd4137)', () => {
  it('is true only for this module as the entrypoint', () => {
    expect(isMain(selfUrl, path.join(SCRIPTS, 'play.mjs'))).toBe(true);
    expect(isMain(selfUrl, path.join(SCRIPTS, 'play.MJS'))).toBe(true);
  });

  it('a different process that happens to be named play.mjs does not run this module', () => {
    // main() calls process.exit on every path, so the old basename fallback
    // meant any host whose entrypoint shared a filename got exited by an
    // ordinary import. The six exported helpers are meant to be importable.
    const elsewhere = path.join(os.tmpdir(), 'some-other-tool', 'play.mjs');
    expect(isMain(selfUrl, elsewhere)).toBe(false);
    expect(isMain(selfUrl, path.join(SCRIPTS, 'film.mjs'))).toBe(false);
    expect(isMain(selfUrl, undefined)).toBe(false);
  });

  it('every runner asks the shared check, so none carries its own basename fallback', async () => {
    const { readFileSync, readdirSync } = await import('node:fs');
    const runners = readdirSync(SCRIPTS).filter((f) => f.endsWith('.mjs'));
    expect(runners.length).toBeGreaterThanOrEqual(6);
    for (const file of runners) {
      const src = readFileSync(path.join(SCRIPTS, file), 'utf8');
      expect(src, file).toMatch(/isMain\(import\.meta\.url\)/);
      expect(src, file).not.toMatch(/path\.basename\(entry\)/);
      expect(src, file).not.toMatch(/path\.basename\(process\.argv\[1\]\)/);
      // The boundary: a throw leaves as one named line, never a stack (Gate B).
      expect(src, file).toMatch(/runMain\(/);
    }
  });
});

describe('parseArgv is the one parser (F-df9afb08)', () => {
  it('takes --flag value, --flag=value and booleans', () => {
    const known = new Set(['port', 'check']);
    const booleans = new Set(['check']);
    const a = parseArgv(['--port', '7788', '--check'], known, { booleans });
    expect(a.flags).toEqual({ port: '7788', check: true });
    const b = parseArgv(['--port=7789'], known, { booleans });
    expect(b.flags).toEqual({ port: '7789' });
    const c = parseArgv(['ghost', '--help'], known, { booleans });
    expect(c.positional).toEqual(['ghost']);
    expect(c.flags.help).toBe(true);
  });

  it('an unknown flag is exit 2 with the usage, not a silent default', () => {
    const { codes, stderr } = holdExit(() =>
      parseArgv(['--por', '7788'], new Set(['port']), { usage: 'usage: pnpm voice' }),
    );
    expect(codes[0]).toBe(2);
    expect(stderr).toMatch(/unknown flag --por/);
    expect(stderr).toMatch(/usage: pnpm voice/);
  });

  it('a value given to a boolean flag is refused rather than swallowed', () => {
    const { codes, stderr } = holdExit(() =>
      parseArgv(['--check=yes'], new Set(['check']), { booleans: new Set(['check']) }),
    );
    expect(codes[0]).toBe(2);
    expect(stderr).toMatch(/--check takes no value/);
  });
});

describe('requirePort speaks the launchers own sentence (F-df9afb08)', () => {
  it('takes 1-65535 and names anything else', () => {
    expect(requirePort('7788')).toBe(7788);
    for (const bad of ['abc', '0', '70000', '', undefined]) {
      const { codes, stderr } = holdExit(() => requirePort(bad));
      expect(codes[0], String(bad)).toBe(2);
      expect(stderr, String(bad)).toMatch(/--port wants 1-65535, got /);
    }
  });
});

describe('readJsonFile names the file, never a stack (F-df9afb08)', () => {
  it('a missing file and a bad file both name what they were', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'cli-json-'));
    const bad = path.join(dir, 'personas.json');
    writeFileSync(bad, '{"boss":');
    expect(() => readJsonFile(path.join(dir, 'gone.json'), 'the personas')).toThrow(
      /the personas: unreadable/,
    );
    expect(() => readJsonFile(bad, 'the personas')).toThrow(/the personas: bad json/);
    try {
      readJsonFile(bad, 'the personas');
    } catch (err) {
      expect(String(err)).not.toMatch(/SyntaxError/);
      expect(err.exitCode).toBe(2);
    }
  });

  it('cliError carries its exit code', () => {
    expect(cliError('nope').exitCode).toBe(2);
    expect(cliError('nope', 1).exitCode).toBe(1);
  });
});
