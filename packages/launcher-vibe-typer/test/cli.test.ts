import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  bugsIn,
  checkSeats,
  exitAfter,
  forwardSignals,
  main,
  mcpIgnored,
  mcpStartLines,
  missingLines,
  movedPortLine,
  NO_VERSION,
  parseArgs,
  sayTrouble,
  seatLines,
  version,
  versionIn,
} from '../src/cli';

const PKG = path.resolve(__dirname, '..');
const DECLARED = (
  JSON.parse(readFileSync(path.join(PKG, 'package.json'), 'utf8')) as {
    version: string;
  }
).version;

describe('the vibe-typer launcher arguments', () => {
  it('plays in the browser when asked for nothing, on its own port', () => {
    expect(parseArgs([])).toEqual({ mode: 'play', port: 7778, open: true });
  });

  it('takes a port and holds the browser back', () => {
    expect(parseArgs(['--port', '8080'])).toEqual({ mode: 'play', port: 8080, open: true });
    expect(parseArgs(['--no-open']).open).toBe(false);
  });

  it('says what was wrong with a port rather than picking one', () => {
    for (const bad of [
      '0',
      '65536',
      '-1',
      'eight',
      '80.5',
      '',
      // Forms `Number` takes and the help text does not describe. Left to
      // `Number` these are 8080, 7778's neighbor and 1000 — a player who
      // typed one gets a port they did not ask for and no word about it.
      '0x1f90',
      ' 7778 ',
      '1e3',
      '+7778',
      '7778.0',
      'Infinity',
    ]) {
      const args = parseArgs(['--port', bad]);
      expect(args.mode, bad).toBe('help');
      expect(args.bad, bad).toMatch(/--port wants 1-65535/);
    }
    const missing = parseArgs(['--port']);
    expect(missing.mode).toBe('help');
    expect(missing.bad).toMatch(/\(nothing\)/);
  });

  it('names an unknown argument instead of ignoring it', () => {
    const args = parseArgs(['--fullscreen']);
    expect(args.mode).toBe('help');
    expect(args.bad).toBe('unknown argument --fullscreen');
  });

  it('answers help and version before anything else on the line', () => {
    expect(parseArgs(['--mcp', '--help']).mode).toBe('help');
    expect(parseArgs(['--help']).bad).toBeUndefined();
    expect(parseArgs(['-h']).mode).toBe('help');
    expect(parseArgs(['--mcp', '--version']).mode).toBe('version');
    expect(parseArgs(['-v']).mode).toBe('version');
  });

  it('names the voice worker and its bearer in the help', async () => {
    const out = process.stdout.write.bind(process.stdout);
    let stdout = '';
    process.stdout.write = ((chunk: string) => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;
    try {
      await main(['--help']);
    } finally {
      process.stdout.write = out;
    }
    expect(stdout).toContain('VOICE_URL');
    expect(stdout).toContain('VOICE_TOKEN');
    expect(stdout).toContain('OLLAMA_URL');
    // The worker's default port, so a player knows which one `pnpm voice` is.
    expect(stdout).toContain('7788');
    // CABINET_TAPES is read in --mcp and does nothing in play mode; the
    // README says so and the help used to list it as a plain variable.
    expect(stdout).toContain('CABINET_TAPES      with --mcp:');
    // The allowlist is shared with the shooter and passes generate, which
    // this text used to leave out — and it is the one verb that writes a
    // completion on the player's daemon.
    expect(stdout).toContain('model list, chat and generate');
  });

  // A regex only ever said "some version". What is being published is this
  // package's own version, and a launcher reporting a different one than the
  // tarball it is in is the failure worth catching.
  it('reports the version this package is publishing', () => {
    expect(version()).toBe(DECLARED);
    expect(version()).not.toBe('0.0.0');
  });

  // `version()` resolves package.json one directory above the module, and in
  // the tarball that module is `dist/cli.js`, not `src/cli.ts` — a different
  // path than the one every other case exercises. Every failure in there
  // answers '0.0.0' silently, so the packaged layout is asserted rather than
  // assumed. No build needed: both layouts sit one directory under the root.
  it('resolves the same version from the packaged layout as from the source one', () => {
    expect(versionIn(path.join(PKG, 'src'))).toBe(DECLARED);
    expect(versionIn(path.join(PKG, 'dist'))).toBe(DECLARED);
    // Not `0.0.0`, which is a plausible version: a bug report filed against
    // it hides the broken install instead of carrying it.
    expect(versionIn(path.join(PKG, 'dist', 'deeper'))).toBe('0.0.0-unknown');
    expect(NO_VERSION).toBe('0.0.0-unknown');
  });

  it('names what the --mcp server actually reads, not one of the six', async () => {
    const out = process.stdout.write.bind(process.stdout);
    let stdout = '';
    process.stdout.write = ((chunk: string) => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;
    try {
      await main(['--help']);
    } finally {
      process.stdout.write = out;
    }
    for (const name of [
      'CABINET_TAPES',
      'CABINET_TAPES_USER',
      'CABINET_FIXTURE',
      'CABINET_SEED',
      'CABINET_TIER',
      'CABINET_BOT',
    ]) {
      expect(stdout, name).toContain(name);
    }
    // The two this cabinet's server answers with a note rather than a lever.
    expect(stdout).toContain('CABINET_FIXTURE    with --mcp: the shooter reads this one');
  });
});

// ——— the two dead ends a player cannot diagnose ——————————————————————————————

describe('what a broken install is told to do about it', () => {
  it('names what it expected and the command that gets it', () => {
    const lines = missingLines(
      'the shell is missing from this package',
      'dist/play/index.html',
      'https://example.test/issues',
    );
    expect(lines[0]).toBe('the shell is missing from this package');
    expect(lines[1]).toBe('- expected: dist/play/index.html');
    expect(lines.join('\n')).toContain('next: npx --yes @mcptoolshop/vibe-typer@latest');
    expect(lines.join('\n')).toContain('npx clear-npx-cache');
    expect(lines.join('\n')).toContain('https://example.test/issues');
  });

  it('reads where to report from the package itself', () => {
    expect(bugsIn(path.join(PKG, 'src'))).toBe(
      'https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/issues',
    );
    expect(bugsIn(path.join(PKG, 'dist', 'deeper'))).toBeNull();
  });
});

// ——— what --mcp says on a healthy start ——————————————————————————————————————

describe('what --mcp says before the first tool call', () => {
  it('names the seats and where the tapes came from', () => {
    expect(mcpStartLines({}, 20)).toEqual([
      'the cabinet server is up on stdio',
      'the user sits at http://127.0.0.1:11434 (the default)',
      'the voice worker is at http://127.0.0.1:7788 (the default), no bearer set',
      'tapes: the 20 bundled ones season the wires stack (set CABINET_TAPES for your own)',
    ]);
  });

  it('names the directory when the operator gave one', () => {
    const lines = mcpStartLines({ CABINET_TAPES: '/tmp/mine' }, 20);
    expect(lines[lines.length - 1]).toBe(
      'tapes: /tmp/mine (from the environment), seasoning the wires stack',
    );
  });

  it('says which play-mode flags it is ignoring', () => {
    expect(mcpIgnored(['--mcp'])).toEqual([]);
    expect(mcpIgnored(['--mcp', '--port', '7778', '--no-open'])).toEqual([
      '--port has no meaning with --mcp; nothing is listening',
      '--no-open has no meaning with --mcp; no browser is opened',
    ]);
  });
});

describe('a port the walk had to move off', () => {
  it('puts both numbers in one sentence, and says nothing when it did not move', () => {
    expect(movedPortLine(7778, 7783)).toBe('port 7778 was busy, so this one is on 7783');
    expect(movedPortLine(7778, 7778)).toBeNull();
  });
});

// ——— what the launcher leaves with when the MCP child is killed ——————————————
//
// The same pair the shooter's launcher carries, and they change together. The
// launcher re-raises the child's signal at itself so the MCP host sees a kill
// rather than an exit; that only works if our own forwarding handlers are
// gone first, or the re-raised signal is delivered to them, the default
// terminate action is suppressed, and the launcher leaves with 0.

describe('passing signals to the cabinet server', () => {
  it('installs both, passes them on, and takes exactly those two off again', () => {
    const on: string[] = [];
    const off: string[] = [];
    const handlers = new Map<string, () => void>();
    const host = {
      on(signal: NodeJS.Signals, handler: () => void) {
        on.push(signal);
        handlers.set(signal, handler);
        return undefined;
      },
      off(signal: NodeJS.Signals, handler: () => void) {
        if (handlers.get(signal) === handler) off.push(signal);
        return undefined;
      },
    };
    const killed: string[] = [];
    const stop = forwardSignals({ killed: false, kill: (s) => killed.push(s) }, host);
    expect(on).toEqual(['SIGINT', 'SIGTERM']);
    handlers.get('SIGTERM')?.();
    expect(killed).toEqual(['SIGTERM']);
    stop();
    expect(off).toEqual(['SIGINT', 'SIGTERM']);
  });

  it('leaves with the signal, not with zero and not with a flat one', () => {
    expect(exitAfter(0, null)).toBe(0);
    expect(exitAfter(3, null)).toBe(3);
    expect(exitAfter(null, 'SIGINT')).toBe(130);
    expect(exitAfter(null, 'SIGTERM')).toBe(143);
    expect(exitAfter(null, 'SIGKILL')).toBe(137);
  });
});

/**
 * `--mcp` hands stdio to this cabinet's own server since slice 4 — the four
 * levers `view`, `product`, `ask` and `react`, not the shooter's six. Here
 * the packed server is not on disk, so what the test can assert is the half
 * that belongs to this file: it says the server is missing and leaves with
 * one, rather than falling through to the browser. That the built bin lists
 * exactly four tools over stdio is CI's tarball-and-smoke job, and the
 * server's own test drives it end to end.
 */
describe('--mcp with no packed server beside it', () => {
  it('says so, leaves with one, and never opens a browser', async () => {
    const wrote: string[] = [];
    const err = process.stderr.write.bind(process.stderr);
    const out = process.stdout.write.bind(process.stdout);
    process.stderr.write = ((chunk: string) => {
      wrote.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;
    let stdout = '';
    process.stdout.write = ((chunk: string) => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;
    const before = process.exitCode;
    try {
      await main(['--mcp']);
    } finally {
      process.stderr.write = err;
      process.stdout.write = out;
    }
    expect(process.exitCode).toBe(1);
    process.exitCode = before;
    expect(wrote.join('')).toContain('cabinet server missing from this package');
    // And what to do about it, in the pack gate's shape.
    expect(wrote.join('')).toContain('- expected: dist/cabinet-stdio.js');
    expect(wrote.join('')).toContain('next: npx --yes @mcptoolshop/vibe-typer@latest');
    // Nothing on stdout: under --mcp it belongs to the MCP transport.
    expect(stdout).toBe('');
  });

  it('is a mode of its own, not a fallback to the game', () => {
    expect(parseArgs(['--mcp']).mode).toBe('mcp');
    expect(parseArgs(['--mcp', '--no-open']).mode).toBe('mcp');
  });
});

// The same two unchecked, unechoed environment variables the shooter had.
// This cabinet has no hosted tier, so there is no line about a key here: the
// user seat is local, and that is what the page promises.
describe('what npx says about the seats before the first call', () => {
  it('names what it resolved, and whether the bearer is set', () => {
    expect(seatLines({})).toEqual([
      'the user sits at http://127.0.0.1:11434 (the default)',
      'the voice worker is at http://127.0.0.1:7788 (the default), no bearer set',
    ]);
    expect(seatLines({ OLLAMA_URL: 'http://10.0.0.2:11434', VOICE_TOKEN: 'bearer' })).toEqual([
      'the user sits at http://10.0.0.2:11434',
      'the voice worker is at http://127.0.0.1:7788 (the default), bearer set',
    ]);
    // No hosted key is reported, because this cabinet never lights one.
    for (const line of seatLines({ ANTHROPIC_API_KEY: 'key' })) {
      expect(line.toLowerCase().includes('claude')).toBe(false);
      expect(line.includes('key')).toBe(false);
    }
  });

  it('refuses an address it could never reach, and names which variable', () => {
    expect(checkSeats({})).toBeNull();
    expect(checkSeats({ OLLAMA_URL: 'localhost:11434' })).toBe(
      'OLLAMA_URL wants an http:// or https:// address, got localhost:11434',
    );
    expect(checkSeats({ VOICE_URL: 'voice' })).toBe(
      'VOICE_URL is not an address, got voice; it wants a scheme, like http://127.0.0.1:11434',
    );
  });

  it('sends the cabinet trouble to stderr', () => {
    let said = '';
    const err = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((chunk: string) => {
      said += String(chunk);
      return true;
    }) as typeof process.stderr.write;
    try {
      sayTrouble('the voice worker at http://127.0.0.1:7788 did not answer');
    } finally {
      process.stderr.write = err;
    }
    expect(said).toBe(
      'the voice worker at http://127.0.0.1:7788 did not answer' + String.fromCharCode(10),
    );
  });

  it('leaves with one and names the variable rather than standing a cabinet up', async () => {
    const before = process.exitCode;
    const had = process.env.VOICE_URL;
    process.env.VOICE_URL = 'voice';
    let stdout = '';
    const out = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string) => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;
    let said = '';
    const err = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((chunk: string) => {
      said += String(chunk);
      return true;
    }) as typeof process.stderr.write;
    try {
      await main([]);
    } finally {
      process.stdout.write = out;
      process.stderr.write = err;
      if (had === undefined) delete process.env.VOICE_URL;
      else process.env.VOICE_URL = had;
    }
    expect(process.exitCode).toBe(1);
    process.exitCode = before;
    expect(said).toContain('VOICE_URL is not an address, got voice');
    expect(said).not.toContain('the shell is missing');
    expect(stdout).toBe('');
  });
});
