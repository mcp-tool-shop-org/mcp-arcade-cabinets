// `npx @mcptoolshop/vibe-typer` — the typing cabinet, served on loopback.
//
// The server is not written here. `createCabinetServer` and the two pure
// modules under it (`allow.ts`, `files.ts`) come from `packages/launcher`
// and esbuild bundles them in, so the two packages cannot drift: a path
// added to one cabinet's allowlist is on the other's in the same edit, and
// the traversal refusal is one implementation with one set of tests behind
// it. What is local to this file is what actually differs between the two
// cabinets — the port, the usage, what `--mcp` does, and which seats the
// server is asked to light.
//
// With `--mcp` this is the typing cabinet's stdio server instead of the
// browser, so a client can sit in the user's chair and send the requests
// the agent types. In that mode stdout belongs to the MCP transport and
// nothing else may be written there.

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { constants as osConstants } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkSeatUrl, createCabinetServer, HOST, listenFrom } from '../../launcher/src/serve';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Laid down by `scripts/build.mjs`, beside this file, inside the package. */
const PLAY_DIR = path.resolve(here, 'play');
const ENDLESS_MODULE = path.resolve(here, 'cabinet-server.js');
const MCP_SERVER = path.resolve(here, 'cabinet-stdio.js');
const TAPES_DIR = path.resolve(here, 'tapes');

const DEFAULT_PORT = 7778;
const DEFAULT_OLLAMA = 'http://127.0.0.1:11434';
const DEFAULT_VOICE = 'http://127.0.0.1:7788';

/** What the arguments asked for. */
export interface Args {
  mode: 'play' | 'mcp' | 'help' | 'version';
  port: number;
  open: boolean;
  /** The argument that made no sense, when the mode is `help` because of it. */
  bad?: string;
}

const USAGE = `vibe-typer — a typing arcade game where you are the coding agent

  npx @mcptoolshop/vibe-typer            play it in your browser
  npx @mcptoolshop/vibe-typer --mcp      run it as an MCP server

Options
  --mcp             speak MCP on stdio instead of opening the game
  --port <n>        port to listen on (default ${DEFAULT_PORT}; takes the next
                    free one when that is busy)
  --no-open         start the server but do not open a browser
  -h, --help        this
  -v, --version     the version

Environment
  OLLAMA_URL        the daemon the endless user sits at (default ${DEFAULT_OLLAMA})
  VOICE_URL         the voice worker, when you run one (default ${DEFAULT_VOICE})
  VOICE_TOKEN       the worker's bearer; added server-side, never in the page
  CABINET_TAPES     with --mcp: a directory of tapes to season the wires
                    stack with, instead of the bundled ones

The server listens on ${HOST} only. The daemon and the voice worker are
reached through a fixed allowlist: the model list, chat and generate, worker
health and stats, speak and its cached takes. Nothing else is proxied.`;

/**
 * Trouble, in the cabinet's own words, on stderr. Never stdout: under `--mcp`
 * stdout belongs to the transport, and a line of ours on it is a broken
 * session rather than a message.
 */
export function sayTrouble(line: string): void {
  process.stderr.write(`${line}\n`);
}

/** The first thing wrong with the two addresses in the environment, or null. */
export function checkSeats(env: NodeJS.ProcessEnv = process.env): string | null {
  return (
    checkSeatUrl('OLLAMA_URL', env.OLLAMA_URL ?? DEFAULT_OLLAMA) ??
    checkSeatUrl('VOICE_URL', env.VOICE_URL ?? DEFAULT_VOICE)
  );
}

/**
 * What the cabinet resolved, said before the first call rather than after it
 * fails. A session pointed at the wrong daemon used to look exactly like one
 * pointed at the right daemon, right up until the user went quiet and the
 * corpus played instead. There is no line about a hosted key here because
 * this cabinet never lights one. These go to stderr so piping stays clean.
 */
export function seatLines(env: NodeJS.ProcessEnv = process.env): string[] {
  const ollama = env.OLLAMA_URL ?? DEFAULT_OLLAMA;
  const voice = env.VOICE_URL ?? DEFAULT_VOICE;
  const mine = (set: string | undefined) => (set ? '' : ' (the default)');
  return [
    `the user sits at ${ollama}${mine(env.OLLAMA_URL)}`,
    `the voice worker is at ${voice}${mine(env.VOICE_URL)}, ${
      env.VOICE_TOKEN ? 'bearer set' : 'no bearer set'
    }`,
  ];
}

/** Read the arguments. Pure, so the table of cases is a test. */
export function parseArgs(argv: readonly string[]): Args {
  const out: Args = { mode: 'play', port: DEFAULT_PORT, open: true };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--mcp') out.mode = 'mcp';
    else if (arg === '-h' || arg === '--help') return { ...out, mode: 'help' };
    else if (arg === '-v' || arg === '--version') return { ...out, mode: 'version' };
    else if (arg === '--no-open') out.open = false;
    else if (arg === '--port') {
      const raw = argv[i + 1];
      i += 1;
      // Decimal digits and nothing else, because `Number` takes forms the
      // help text does not describe and silently means something by them:
      // `0x1f90` is 8080, ` 7777 ` is 7777, `1e3` is 1000.
      const port = /^\d+$/.test(raw ?? '') ? Number(raw) : NaN;
      if (!Number.isInteger(port) || port < 1 || port > 65_535) {
        return { ...out, mode: 'help', bad: `--port wants 1-65535, got ${raw ?? '(nothing)'}` };
      }
      out.port = port;
    } else if (arg !== undefined) {
      return { ...out, mode: 'help', bad: `unknown argument ${arg}` };
    }
  }
  return out;
}

/**
 * The version in the package.json one directory above `dir`. Taken as an
 * argument rather than read off `here` so both layouts this file runs in are
 * testable: under `src/` in the repo, and as the bundled `dist/cli.js` in the
 * tarball. Both sit one directory under the package root, and a test proves
 * it rather than the packaged path being taken on trust — the failure is
 * silent by construction, since every failure here answers `0.0.0`.
 */
export function versionIn(dir: string): string {
  try {
    const raw = readFileSync(path.resolve(dir, '..', 'package.json'), 'utf8');
    const parsed = JSON.parse(raw) as { version?: unknown };
    return typeof parsed.version === 'string' ? parsed.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/** The published version, for `--version`. */
export function version(): string {
  return versionIn(here);
}

/** Ask the desktop to open a url. Never blocks, never fails the run. */
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

/** Enough of `process` for the signal forwarding to be driven by a test. */
export interface SignalHost {
  on: (signal: NodeJS.Signals, handler: () => void) => unknown;
  off: (signal: NodeJS.Signals, handler: () => void) => unknown;
}

/**
 * Pass SIGINT and SIGTERM on to the child, and hand back the way to stop
 * doing that. Spelled here as well as in the shooter's launcher because the
 * two packages share a server and not a CLI; the two copies change together.
 *
 * Taking the handlers off again is the load-bearing half. When the child dies
 * of a signal we re-raise it at ourselves so the MCP host sees the cabinet
 * server killed rather than exited; with these listeners still installed, the
 * re-raised signal is delivered to our own handler instead, the default
 * terminate action is suppressed, and the launcher leaves with 0 — telling
 * the host a clean exit for a kill.
 */
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

/**
 * What the launcher leaves with when the child is done. A signal death is
 * `128 + the signal number`, the shell's own convention, which is what we
 * would exit with anyway once the re-raise below takes effect — and is the
 * whole answer on Windows, where there is no signal to re-raise and the old
 * code terminated with 1 no matter which signal it had been.
 */
export function exitAfter(code: number | null, signal: NodeJS.Signals | null): number {
  if (!signal) return code ?? 0;
  return 128 + (osConstants.signals[signal] ?? 0);
}

/** Hand stdio to the cabinet server and live exactly as long as it does. */
function runMcp(): void {
  if (!existsSync(MCP_SERVER)) {
    process.stderr.write('cabinet server missing from this package\n');
    process.exitCode = 1;
    return;
  }
  const env = { ...process.env };
  // The bundled tapes live in the package; the repo layout the server
  // resolves by default is not there. An explicit CABINET_TAPES wins.
  if (!env.CABINET_TAPES && existsSync(TAPES_DIR)) env.CABINET_TAPES = TAPES_DIR;
  const child = spawn(process.execPath, [MCP_SERVER], { stdio: 'inherit', env });
  const stopForwarding = forwardSignals(child);
  child.on('error', (err: Error) => {
    stopForwarding();
    process.stderr.write(`cabinet server did not start: ${err.message}\n`);
    process.exitCode = 1;
  });
  child.on('exit', (code, signal) => {
    stopForwarding();
    process.exitCode = exitAfter(code, signal);
    // Now that our own handler is gone the default action takes effect, and
    // whoever started us sees a signal death rather than an exit status.
    if (signal && process.platform !== 'win32') process.kill(process.pid, signal);
  });
}

/** Stand the shell up and open it. */
async function runPlay(args: Args): Promise<void> {
  // The environment is read before the package is, because a bad address is
  // the player's to fix and a missing shell is ours.
  const bad = checkSeats();
  if (bad) {
    process.stderr.write(`${bad}\n`);
    process.exitCode = 1;
    return;
  }
  if (!existsSync(PLAY_DIR)) {
    process.stderr.write('the shell is missing from this package\n');
    process.exitCode = 1;
    return;
  }
  const server = createCabinetServer({
    playDir: PLAY_DIR,
    // The say seat is the shooter's grammar — the boss's line over a wave —
    // and this cabinet has no bosses, so `/cabinet/say` is not lit. The
    // endless seat is named separately and points at the same bundle.
    sayModule: null,
    endlessModule: existsSync(ENDLESS_MODULE) ? ENDLESS_MODULE : null,
    ollamaUrl: process.env.OLLAMA_URL ?? DEFAULT_OLLAMA,
    // The voice worker, lit since slice 4C: the user says their own asks,
    // check-ins and reactions, and the page reaches the worker here. It was
    // null at 0.10.0 because nothing on this cabinet's page called `/voice`;
    // now the Voice checkbox does, and a proxy with no caller has become a
    // caller with no proxy. The allowlist is the shooter's, shared, and the
    // bearer is added on this side so the page never holds it.
    voiceUrl: process.env.VOICE_URL ?? DEFAULT_VOICE,
    voiceToken: process.env.VOICE_TOKEN ?? null,
    // Local only, and that is what the page promises. The menu names the
    // seat from the daemon's own tag list, so a hidden Claude tier would
    // put a name on screen that did not write the line — and would spend a
    // player's key on a game that never asked for one.
    anthropicKey: null,
    onTrouble: sayTrouble,
  });
  let port: number;
  try {
    port = await listenFrom(server, args.port);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`could not listen on ${args.port}: ${msg}\n`);
    process.exitCode = 1;
    return;
  }
  const url = `http://${HOST}:${port}/`;
  process.stdout.write(`Vibe Typer is at ${url}\n`);
  process.stdout.write('Ctrl-C closes the cabinet.\n');
  for (const line of seatLines()) sayTrouble(line);
  if (args.open) openBrowser(url);
  const close = () => {
    server.close(() => process.exit(0));
    // A held-open keep-alive socket must not outlast the Ctrl-C.
    setTimeout(() => process.exit(0), 500).unref();
  };
  process.on('SIGINT', close);
  process.on('SIGTERM', close);
}

/** The entry. Exported so a test can drive it without a subprocess. */
export async function main(argv: readonly string[]): Promise<void> {
  const args = parseArgs(argv);
  if (args.mode === 'version') {
    process.stdout.write(`${version()}\n`);
    return;
  }
  if (args.mode === 'help') {
    if (args.bad) {
      process.stderr.write(`${args.bad}\n\n${USAGE}\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`${USAGE}\n`);
    return;
  }
  if (args.mode === 'mcp') {
    runMcp();
    return;
  }
  await runPlay(args);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  void main(process.argv.slice(2));
}
