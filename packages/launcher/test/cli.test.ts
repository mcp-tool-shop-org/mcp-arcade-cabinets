import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  exitAfter,
  forwardSignals,
  main,
  parseArgs,
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
