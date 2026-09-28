// Shared launcher utilities, factored from the two cabinet CLIs so a third
// cabinet costs less and the two that exist do not drift.

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { constants as osConstants } from 'node:os';

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

/** The stand-in when a package.json cannot be read. */
export const NO_VERSION = '0.0.0-unknown';

/** The version in the package.json one directory above `dir`. */
export function versionIn(dir: string): string {
  try {
    const raw = readFileSync(path.resolve(dir, '..', 'package.json'), 'utf8');
    const parsed = JSON.parse(raw) as { version?: unknown };
    return typeof parsed.version === 'string' ? parsed.version : NO_VERSION;
  } catch {
    return NO_VERSION;
  }
}

/** What `--version` leaves with. Undefined for a version; 1 for the stand-in. */
export function versionExit(said: string): number | undefined {
  return said === NO_VERSION ? 1 : undefined;
}

// ---------------------------------------------------------------------------
// Node floor
// ---------------------------------------------------------------------------

/** The Node major this package's own `engines` field asks for, or null. */
export function floorIn(dir: string): number | null {
  try {
    const raw = readFileSync(path.resolve(dir, '..', 'package.json'), 'utf8');
    const parsed = JSON.parse(raw) as { engines?: { node?: unknown } };
    const said = parsed.engines?.node;
    const found = typeof said === 'string' ? /(\d+)/.exec(said) : null;
    return found?.[1] ? Number(found[1]) : null;
  } catch {
    return null;
  }
}

/** The major of a Node version string, or null when it is not one. */
export function nodeMajor(said: string): number | null {
  const found = /^v?(\d+)\./.exec(said);
  return found?.[1] ? Number(found[1]) : null;
}

/** The floor read from the package this file is bundled in. */
export const NODE_FLOOR = floorIn(path.dirname(new URL(import.meta.url).pathname)) ?? 22;

/**
 * The halt for a Node older than the floor, or null when the one running is
 * new enough.
 */
export function nodeFloorHalt(said: string, floor: number): string[] | null {
  const major = nodeMajor(said);
  if (major === null || major >= floor) return null;
  return [
    'this cabinet needs a newer Node than the one running it',
    `- expected: Node ${floor} or newer, and this is Node ${said}`,
    '',
    `next: install Node ${floor} or newer (https://nodejs.org), then run`,
    '      npx @mcptoolshop/ghost-on-the-menu again',
  ];
}

// ---------------------------------------------------------------------------
// Browser
// ---------------------------------------------------------------------------

/** Open a URL in the player's default browser, best-effort. */
export function openBrowser(url: string): void {
  const [cmd, args] =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  try {
    const child = spawn(cmd as string, args as string[], { stdio: 'ignore', detached: true });
    child.on('error', () => {
      /* No desktop, or no opener. The url is already printed. */
    });
    child.unref();
  } catch {
    /* Same. */
  }
}

// ---------------------------------------------------------------------------
// Signals
// ---------------------------------------------------------------------------

export interface SignalHost {
  on: (signal: NodeJS.Signals, handler: () => void) => unknown;
  off: (signal: NodeJS.Signals, handler: () => void) => unknown;
}

/** Pass SIGINT and SIGTERM on to the child, and hand back the way to stop. */
export function forwardSignals(
  child: { killed: boolean; kill: (signal: NodeJS.Signals) => void },
  host: SignalHost = process,
): () => void {
  const installed = (['SIGINT', 'SIGTERM'] as const).map((signal) => {
    const handler = () => {
      if (!child.killed) child.kill(signal);
    };
    host.on(signal, handler);
    return [signal, handler] as const;
  });
  return () => {
    for (const [signal, handler] of installed) host.off(signal, handler);
  };
}

/** What the launcher leaves with when the child is done. */
export function exitAfter(code: number | null, signal: NodeJS.Signals | null): number {
  if (!signal) return code ?? 0;
  return 128 + (osConstants.signals[signal] ?? 0);
}
