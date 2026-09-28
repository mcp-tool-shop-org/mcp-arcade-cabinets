// Headless check mode for both launchers.
// Spawns the MCP server over piped stdio, sends initialize + tools/list,
// and verifies the tools match the expected set.

import { spawn } from 'node:child_process';

const INIT = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'check', version: '0' },
  },
});

const NOTIFIED = JSON.stringify({
  jsonrpc: '2.0',
  method: 'notifications/initialized',
});

const LIST = JSON.stringify({
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/list',
});

const CHECK_TIMEOUT_MS = 15000;

export interface CheckResult {
  ok: boolean;
  found: string[];
  missing: string[];
  extra: string[];
  error?: string;
}

/**
 * Run a headless check on the MCP server at `serverPath`, expecting exactly
 * the named tools. Returns a result object suitable for printing and exiting.
 */
export async function checkMcp(serverPath: string, want: readonly string[]): Promise<CheckResult> {
  const wantSet = new Set(want);
  const lines: string[] = [];

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [serverPath], {
      stdio: ['pipe', 'pipe', 'inherit'],
    });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({ ok: false, found: [], missing: [...want], extra: [], error: 'timed out' });
    }, CHECK_TIMEOUT_MS);

    child.stdout!.setEncoding('utf8');
    child.stdout!.on('data', (chunk: string) => {
      for (const line of chunk.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        lines.push(trimmed);
      }
    });

    child.on('exit', () => {
      clearTimeout(timer);
      const found = new Set<string>();
      for (const raw of lines) {
        let msg: unknown;
        try {
          msg = JSON.parse(raw);
        } catch {
          continue;
        }
        if (!msg || typeof msg !== 'object') continue;
        const tools = (msg as Record<string, unknown>).result;
        if (!Array.isArray(tools)) continue;
        for (const t of tools) {
          if (
            t &&
            typeof t === 'object' &&
            typeof (t as Record<string, unknown>).name === 'string'
          ) {
            found.add((t as Record<string, unknown>).name as string);
          }
        }
      }
      const foundArr = [...found].sort();
      const missing = [...wantSet].filter((n) => !found.has(n)).sort();
      const extra = foundArr.filter((n) => !wantSet.has(n)).sort();
      if (missing.length === 0 && extra.length === 0) {
        resolve({ ok: true, found: foundArr, missing: [], extra: [] });
      } else {
        const parts: string[] = [];
        if (missing.length) parts.push(`missing: ${missing.join(', ')}`);
        if (extra.length) parts.push(`extra: ${extra.join(', ')}`);
        resolve({ ok: false, found: foundArr, missing, extra, error: parts.join('; ') });
      }
    });

    child.on('error', (err: Error) => {
      clearTimeout(timer);
      resolve({ ok: false, found: [], missing: [...want], extra: [], error: err.message });
    });

    child.stdin!.write(`${INIT}\n${NOTIFIED}\n${LIST}\n`);
    child.stdin!.end();
  });
}
