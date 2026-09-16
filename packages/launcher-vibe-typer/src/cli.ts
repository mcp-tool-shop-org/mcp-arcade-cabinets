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

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createCabinetServer, HOST, listenFrom } from '../../launcher/src/serve';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Laid down by `scripts/build.mjs`, beside this file, inside the package. */
const PLAY_DIR = path.resolve(here, 'play');
const ENDLESS_MODULE = path.resolve(here, 'cabinet-server.js');

const DEFAULT_PORT = 7778;
const DEFAULT_OLLAMA = 'http://127.0.0.1:11434';

/** What the arguments asked for. */
export interface Args {
  mode: 'play' | 'mcp' | 'help' | 'version';
  port: number;
  open: boolean;
  /** The argument that made no sense, when the mode is `help` because of it. */
  bad?: string;
}

/**
 * What `--mcp` says. The cabinet's own tools — `product`, `ask`, `react` —
 * are slice 4, and no server for them is bundled here. Saying so and
 * leaving is better than a flag that quietly plays the game instead: an
 * agent that pointed a client at this would otherwise get a browser.
 */
export const MCP_LINE = "vibe-typer has no MCP server yet; the cabinet's tools ship with slice 4.";
/** Not 1. An agent reading exit codes can tell "not built yet" from "it broke". */
export const MCP_EXIT = 2;

const USAGE = `vibe-typer — a typing arcade game where you are the coding agent

  npx @mcptoolshop/vibe-typer            play it in your browser

Options
  --port <n>        port to listen on (default ${DEFAULT_PORT}; takes the next
                    free one when that is busy)
  --no-open         start the server but do not open a browser
  -h, --help        this
  -v, --version     the version

Environment
  OLLAMA_URL        the daemon the endless user sits at (default ${DEFAULT_OLLAMA})

The server listens on ${HOST} only. The daemon is reached through a fixed
allowlist: the model list and chat. Nothing else is proxied.`;

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
      const port = Number(raw);
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

/** The published version, for `--version`. */
export function version(): string {
  try {
    const raw = readFileSync(path.resolve(here, '..', 'package.json'), 'utf8');
    const parsed = JSON.parse(raw) as { version?: unknown };
    return typeof parsed.version === 'string' ? parsed.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
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

/** Stand the shell up and open it. */
async function runPlay(args: Args): Promise<void> {
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
    // No voice worker: nothing on this cabinet's page calls `/voice`, so the
    // prefix is not proxied at all rather than stood up for no caller.
    voiceUrl: null,
    voiceToken: null,
    // Local only, and that is what the page promises. The menu names the
    // seat from the daemon's own tag list, so a hidden Claude tier would
    // put a name on screen that did not write the line — and would spend a
    // player's key on a game that never asked for one.
    anthropicKey: null,
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
    process.stderr.write(`${MCP_LINE}\n`);
    process.exitCode = MCP_EXIT;
    return;
  }
  await runPlay(args);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  void main(process.argv.slice(2));
}
