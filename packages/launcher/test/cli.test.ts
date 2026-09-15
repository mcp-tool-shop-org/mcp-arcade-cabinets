import { describe, expect, it } from 'vitest';

import { parseArgs, version } from '../src/cli';

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
