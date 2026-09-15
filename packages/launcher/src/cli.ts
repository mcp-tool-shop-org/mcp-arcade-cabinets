// `npx @mcptoolshop/ghost-on-the-menu` — the cabinet, two ways.
//
// With no arguments it stands the shell up on loopback and opens it: the
// same game as GitHub Pages, except this one can reach the player's own
// Ollama daemon and voice worker, which Pages cannot.
//
// With `--mcp` it is the stdio cabinet server instead, so an agent can pull
// the levers itself. In that mode stdout belongs to the MCP transport and
// nothing else may be written there — every word this file prints under
// `--mcp` goes to stderr.

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createCabinetServer, HOST, listenFrom } from './serve';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Laid down by `scripts/build.mjs`, beside this file, inside the package. */
const PLAY_DIR = path.resolve(here, 'play');
const SAY_MODULE = path.resolve(here, 'cabinet-server.js');
const MCP_SERVER = path.resolve(here, 'cabinet-stdio.js');
const TAPES_DIR = path.resolve(here, 'tapes');

const DEFAULT_PORT = 7777;
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

const USAGE = `ghost-on-the-menu — an arcade shooter where you are the agent

  npx @mcptoolshop/ghost-on-the-menu            play it in your browser
  npx @mcptoolshop/ghost-on-the-menu --mcp      run it as an MCP server

Options
  --mcp             speak MCP on stdio instead of opening the game
  --port <n>        port to listen on (default ${DEFAULT_PORT}; takes the next
                    free one when that is busy)
  --no-open         start the server but do not open a browser
  -h, --help        this
  -v, --version     the version

Environment
  OLLAMA_URL        the daemon the bosses sit at (default ${DEFAULT_OLLAMA})
  VOICE_URL         the voice worker, when you run one (default ${DEFAULT_VOICE})
  VOICE_TOKEN       the worker's bearer; added server-side, never in the page
  ANTHROPIC_API_KEY sits the Claude tier of the say seat; never in the page
  CABINET_TAPES     a directory of tapes to play instead of the bundled ones

The server listens on ${HOST} only. Ollama and the voice worker are reached
through a fixed allowlist: model list, chat and generate, worker health and
stats, speak and its cached takes. Nothing else is proxied.`;

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

/** The published version, for `--version` and the MCP handshake. */
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
  const forward = (signal: NodeJS.Signals) => {
    process.on(signal, () => {
      if (!child.killed) child.kill(signal);
    });
  };
  forward('SIGINT');
  forward('SIGTERM');
  child.on('error', (err: Error) => {
    process.stderr.write(`cabinet server did not start: ${err.message}\n`);
    process.exitCode = 1;
  });
  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exitCode = code ?? 0;
  });
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
    sayModule: existsSync(SAY_MODULE) ? SAY_MODULE : null,
    ollamaUrl: process.env.OLLAMA_URL ?? DEFAULT_OLLAMA,
    voiceUrl: process.env.VOICE_URL ?? DEFAULT_VOICE,
    voiceToken: process.env.VOICE_TOKEN ?? null,
    anthropicKey: process.env.ANTHROPIC_API_KEY ?? null,
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
  process.stdout.write(`Ghost on the Menu is at ${url}\n`);
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
    runMcp();
    return;
  }
  await runPlay(args);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  void main(process.argv.slice(2));
}
