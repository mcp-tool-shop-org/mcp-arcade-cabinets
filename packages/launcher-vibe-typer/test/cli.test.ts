import { describe, expect, it } from 'vitest';

import { MCP_EXIT, MCP_LINE, main, parseArgs, version } from '../src/cli';

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
 * `--mcp` is the one place the two packages deliberately part. Ghost hands
 * stdio to its cabinet server; this one has no tools yet, and the point of
 * the test is that it says so and leaves with a code an agent can read,
 * rather than falling through to the browser or pretending to be a server.
 */
describe('--mcp before the cabinet has tools', () => {
  it('names the slice, leaves with 2, and starts nothing', async () => {
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
    expect(process.exitCode).toBe(MCP_EXIT);
    process.exitCode = before;
    expect(wrote.join('')).toContain(MCP_LINE);
    expect(MCP_LINE).toMatch(/slice 4/);
    // Nothing on stdout: an agent that pointed a client here reads stderr.
    expect(stdout).toBe('');
  });
});
