import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  checkSeats,
  exitAfter,
  forwardSignals,
  main,
  parseArgs,
  sayTrouble,
  seatLines,
  serveOpts,
  version,
  versionIn,
} from '../src/cli';

const PKG = path.resolve(__dirname, '..');
const DECLARED = (
  JSON.parse(readFileSync(path.join(PKG, 'package.json'), 'utf8')) as {
    version: string;
  }
).version;

describe('the launcher arguments', () => {
  it('plays in the browser when asked for nothing', () => {
    expect(parseArgs([])).toEqual({ mode: 'play', port: 7777, open: true });
  });

  it('speaks MCP on --mcp', () => {
    expect(parseArgs(['--mcp']).mode).toBe('mcp');
  });

  it('takes a port and holds the browser back', () => {
    expect(parseArgs(['--port', '8080'])).toEqual({ mode: 'play', port: 8080, open: true });
    expect(parseArgs(['--no-open']).open).toBe(false);
    expect(parseArgs(['--port', '9000', '--no-open', '--mcp'])).toEqual({
      mode: 'mcp',
      port: 9000,
      open: false,
    });
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
      // `Number` these are 8080, 7777 and 1000 — a player who typed one of
      // them gets a port they did not ask for and no word about it.
      '0x1f90',
      ' 7777 ',
      '1e3',
      '+7777',
      '7777.0',
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
    expect(versionIn(path.join(PKG, 'dist', 'deeper'))).toBe('0.0.0');
  });
});

describe('the seats the shooter lights', () => {
  // The endless seat is the typing cabinet's. Left absent it falls back to
  // the say module, and this package would publish a second model-prompting
  // route, handed the player's ANTHROPIC_API_KEY, that nothing on its page
  // ever calls. `serve.test.ts` asserts what this shape does on the wire.
  it('leaves the endless seat dark on purpose, not by omission', () => {
    expect(serveOpts({}).endlessModule).toBeNull();
  });

  it('takes the daemon, the worker and the key from the environment', () => {
    const opts = serveOpts({
      OLLAMA_URL: 'http://127.0.0.1:1',
      VOICE_URL: 'http://127.0.0.1:2',
      VOICE_TOKEN: 'bearer',
      ANTHROPIC_API_KEY: 'key',
    });
    expect(opts.ollamaUrl).toBe('http://127.0.0.1:1');
    expect(opts.voiceUrl).toBe('http://127.0.0.1:2');
    expect(opts.voiceToken).toBe('bearer');
    expect(opts.anthropicKey).toBe('key');
    const bare = serveOpts({});
    expect(bare.ollamaUrl).toBe('http://127.0.0.1:11434');
    expect(bare.voiceToken).toBeNull();
    expect(bare.anthropicKey).toBeNull();
  });
});

// ——— what the launcher leaves with when the MCP child is killed ——————————————
//
// The launcher re-raises the child's signal at itself so the MCP host sees a
// kill rather than an exit. That only works if our own forwarding handlers
// are gone first: with them installed the re-raised signal is delivered to
// them, the default terminate action is suppressed, and the launcher leaves
// with 0 — a clean exit reported for a kill.

describe('passing signals to the cabinet server', () => {
  function fakeHost() {
    const on: string[] = [];
    const off: string[] = [];
    const handlers = new Map<string, () => void>();
    return {
      on,
      off,
      handlers,
      host: {
        on(signal: NodeJS.Signals, handler: () => void) {
          on.push(signal);
          handlers.set(signal, handler);
          return undefined;
        },
        off(signal: NodeJS.Signals, handler: () => void) {
          if (handlers.get(signal) === handler) off.push(signal);
          return undefined;
        },
      },
    };
  }

  it('installs both, passes them on, and takes exactly those two off again', () => {
    const fake = fakeHost();
    const killed: string[] = [];
    const child = { killed: false, kill: (s: NodeJS.Signals) => killed.push(s) };
    const stop = forwardSignals(child, fake.host);
    expect(fake.on).toEqual(['SIGINT', 'SIGTERM']);
    fake.handlers.get('SIGINT')?.();
    expect(killed).toEqual(['SIGINT']);
    expect(fake.off).toEqual([]);
    stop();
    expect(fake.off).toEqual(['SIGINT', 'SIGTERM']);
  });

  it('does not kill a child that is already dead', () => {
    const fake = fakeHost();
    const killed: string[] = [];
    const child = { killed: true, kill: (s: NodeJS.Signals) => killed.push(s) };
    forwardSignals(child, fake.host);
    fake.handlers.get('SIGTERM')?.();
    expect(killed).toEqual([]);
  });

  it('leaves with the signal, not with zero and not with a flat one', () => {
    expect(exitAfter(0, null)).toBe(0);
    expect(exitAfter(3, null)).toBe(3);
    expect(exitAfter(null, null)).toBe(0);
    expect(exitAfter(null, 'SIGINT')).toBe(130);
    expect(exitAfter(null, 'SIGTERM')).toBe(143);
    expect(exitAfter(null, 'SIGKILL')).toBe(137);
  });
});

describe('what --help tells a player', () => {
  it('says which mode reads the tapes directory, and what the allowlist is', async () => {
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
    // CABINET_TAPES is read in --mcp and does nothing in play mode; the
    // READMEs say so and the help used to list it as a plain variable.
    expect(stdout).toContain('CABINET_TAPES     with --mcp:');
    expect(stdout).toContain('model list, chat and generate');
  });
});

// OLLAMA_URL and VOICE_URL were read straight off the environment with no
// shape at all, and never echoed. A typo started the cabinet clean and turned
// up later as the proxy's `no answer`, which reads exactly like a daemon that
// is not running -- the same misdiagnosis `--port` was fixed for. Both are now
// held to a stated shape, and what was resolved is said before the first call.
describe('what npx says about the seats before the first call', () => {
  function capture(run: () => void): string {
    let said = '';
    const err = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((chunk: string) => {
      said += String(chunk);
      return true;
    }) as typeof process.stderr.write;
    try {
      run();
    } finally {
      process.stderr.write = err;
    }
    return said;
  }

  it('names what it resolved, and whether the bearer and the key are set', () => {
    expect(seatLines({})).toEqual([
      'the bosses sit at http://127.0.0.1:11434 (the default)',
      'the voice worker is at http://127.0.0.1:7788 (the default), no bearer set',
      'the Claude tier of the say seat is dark: no ANTHROPIC_API_KEY',
    ]);
    expect(
      seatLines({
        OLLAMA_URL: 'http://10.0.0.2:11434',
        VOICE_TOKEN: 'bearer',
        ANTHROPIC_API_KEY: 'key',
      }),
    ).toEqual([
      'the bosses sit at http://10.0.0.2:11434',
      'the voice worker is at http://127.0.0.1:7788 (the default), bearer set',
      'the Claude tier of the say seat is lit',
    ]);
    // The bearer and the key are reported as set or not set. Neither value
    // is ever printed.
    for (const line of seatLines({ VOICE_TOKEN: 'bearer', ANTHROPIC_API_KEY: 'key' })) {
      expect(line.includes('bearer') && line.includes('no bearer')).toBe(false);
      expect(line.includes('key')).toBe(false);
    }
  });

  it('refuses an address it could never reach, and names which variable', () => {
    expect(checkSeats({})).toBeNull();
    expect(
      checkSeats({ OLLAMA_URL: 'http://127.0.0.1:1', VOICE_URL: 'https://a.test' }),
    ).toBeNull();
    expect(checkSeats({ OLLAMA_URL: 'localhost:11434' })).toBe(
      'OLLAMA_URL wants an http:// or https:// address, got localhost:11434',
    );
    expect(checkSeats({ VOICE_URL: 'voice' })).toBe('VOICE_URL is not an address, got voice');
  });

  it('sends the cabinet trouble to stderr, and hands the server that same way out', () => {
    expect(serveOpts({}).onTrouble).toBe(sayTrouble);
    const said = capture(() => sayTrouble('the daemon at http://127.0.0.1:11434 did not answer'));
    expect(said).toBe(
      'the daemon at http://127.0.0.1:11434 did not answer' + String.fromCharCode(10),
    );
  });

  it('leaves with one and names the variable rather than standing a cabinet up', async () => {
    const before = process.exitCode;
    const had = process.env.OLLAMA_URL;
    process.env.OLLAMA_URL = 'localhost:11434';
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
      if (had === undefined) delete process.env.OLLAMA_URL;
      else process.env.OLLAMA_URL = had;
    }
    expect(process.exitCode).toBe(1);
    process.exitCode = before;
    expect(said).toContain('OLLAMA_URL wants an http:// or https:// address');
    // The environment is read before the package is: a bad address is the
    // player's to fix, and this run never got as far as looking for a shell.
    expect(said).not.toContain('the shell is missing');
    expect(stdout).toBe('');
  });
});
