import { describe, expect, it } from 'vitest';

import { main, parseArgs, version } from '../src/cli';

describe('the vibe-typer launcher arguments', () => {
  it('plays in the browser when asked for nothing, on its own port', () => {
    expect(parseArgs([])).toEqual({ mode: 'play', port: 7778, open: true });
  });

  it('takes a port and holds the browser back', () => {
    expect(parseArgs(['--port', '8080'])).toEqual({ mode: 'play', port: 8080, open: true });
    expect(parseArgs(['--no-open']).open).toBe(false);
  });

  it('says what was wrong with a port rather than picking one', () => {
    for (const bad of ['0', '65536', '-1', 'eight', '80.5', '']) {
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

  it('reports the published version, not a placeholder', () => {
    expect(version()).toMatch(/^\d+\.\d+\.\d+/);
    expect(version()).not.toBe('0.0.0');
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
    // Nothing on stdout: under --mcp it belongs to the MCP transport.
    expect(stdout).toBe('');
  });

  it('is a mode of its own, not a fallback to the game', () => {
    expect(parseArgs(['--mcp']).mode).toBe('mcp');
    expect(parseArgs(['--mcp', '--no-open']).mode).toBe('mcp');
  });
});
