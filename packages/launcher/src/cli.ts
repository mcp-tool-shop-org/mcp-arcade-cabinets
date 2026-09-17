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
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { constants as osConstants } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  checkSeatUrl,
  createCabinetServer,
  HOST,
  listenFrom,
  listenLines,
  type ServeOpts,
} from './serve';

/**
 * Trouble, in the cabinet's own words, on stderr. Never stdout: under `--mcp`
 * stdout belongs to the transport, and a line of ours on it is a broken
 * session rather than a message.
 */
export function sayTrouble(line: string): void {
  process.stderr.write(`${line}\n`);
}

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
  OLLAMA_URL         the daemon the bosses sit at (default ${DEFAULT_OLLAMA})
  VOICE_URL          the voice worker, when you run one (default ${DEFAULT_VOICE})
  VOICE_TOKEN        the worker's bearer; added server-side, never in the page
  ANTHROPIC_API_KEY  sits the Claude tier of the say seat; never in the page

Environment, --mcp only
  These are the cabinet server's own levers. They do nothing in play mode.
  CABINET_TAPES      with --mcp: a directory of tapes instead of the bundled ones
  CABINET_TAPES_USER with --mcp: more tapes, merged beside the bundled ones
  CABINET_FIXTURE    with --mcp: the tape a fresh round starts on
  CABINET_SEED       with --mcp: a whole number, so a round repeats
  CABINET_TIER       with --mcp: 0-3, how hard the round is
  CABINET_BOT        with --mcp: which pilot flies it; the typing cabinet reads
                     this one, and this cabinet plays its own bot

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

/** The first thing wrong with the two addresses in the environment, or null. */
export function checkSeats(env: NodeJS.ProcessEnv = process.env): string | null {
  return (
    checkSeatUrl('OLLAMA_URL', env.OLLAMA_URL ?? DEFAULT_OLLAMA) ??
    checkSeatUrl('VOICE_URL', env.VOICE_URL ?? DEFAULT_VOICE)
  );
}

/**
 * What the cabinet resolved, said before the first call rather than after it
 * fails. A session that is pointed at the wrong daemon used to look exactly
 * like a session that is pointed at the right one, right up until a seat went
 * quiet. These go to stderr so `--no-open` piping stays clean.
 */
export function seatLines(env: NodeJS.ProcessEnv = process.env): string[] {
  const ollama = env.OLLAMA_URL ?? DEFAULT_OLLAMA;
  const voice = env.VOICE_URL ?? DEFAULT_VOICE;
  const mine = (set: string | undefined) => (set ? '' : ' (the default)');
  return [
    `the bosses sit at ${ollama}${mine(env.OLLAMA_URL)}`,
    `the voice worker is at ${voice}${mine(env.VOICE_URL)}, ${
      env.VOICE_TOKEN ? 'bearer set' : 'no bearer set'
    }`,
    env.ANTHROPIC_API_KEY
      ? 'the Claude tier of the say seat is lit'
      : 'the Claude tier of the say seat is dark: no ANTHROPIC_API_KEY',
  ];
}

/**
 * The version in the package.json one directory above `dir`. Taken as an
 * argument rather than read off `here` so both layouts this file runs in are
 * testable: under `src/` in the repo, and as the bundled `dist/cli.js` in the
 * tarball. Both sit one directory under the package root, and a test proves
 * it rather than the packaged path being taken on trust.
 *
 * Nothing crashes over a version string, so every failure still answers a
 * string — but it answers `0.0.0-unknown` rather than `0.0.0`, because
 * `0.0.0` is a plausible version and a bug report filed against it hides the
 * fact that the install is broken instead of carrying it.
 */
export const NO_VERSION = '0.0.0-unknown';

export function versionIn(dir: string): string {
  try {
    const raw = readFileSync(path.resolve(dir, '..', 'package.json'), 'utf8');
    const parsed = JSON.parse(raw) as { version?: unknown };
    return typeof parsed.version === 'string' ? parsed.version : NO_VERSION;
  } catch {
    return NO_VERSION;
  }
}

/** The published version, for `--version` and the MCP handshake. */
export function version(): string {
  const said = versionIn(here);
  if (said === NO_VERSION) sayTrouble("could not read this package's version");
  return said;
}

/**
 * Where to report a launcher that is broken, read off the package rather than
 * spelled a second time here. Null when even that cannot be read, in which
 * case the messages below simply leave the clause out.
 */
export function bugsIn(dir: string): string | null {
  try {
    const raw = readFileSync(path.resolve(dir, '..', 'package.json'), 'utf8');
    const parsed = JSON.parse(raw) as { bugs?: { url?: unknown } };
    return typeof parsed.bugs?.url === 'string' ? parsed.bugs.url : null;
  } catch {
    return null;
  }
}

/**
 * What to say when a piece of the package is not in the package.
 *
 * This is the one failure a player cannot diagnose: it means an interrupted
 * `npx` download or a corrupt cache, and the old messages were four and six
 * words stating a fact with no verb in it. The pack gate in
 * `scripts/build.mjs` is the shape — every halt there ends with a `next:`
 * line naming the command that fixes it — and the launcher, which is the
 * surface a stranger meets first, had none.
 */
export function missingLines(what: string, expected: string, bugs: string | null): string[] {
  return [
    what,
    `- expected: ${expected}`,
    '',
    'next: npx --yes @mcptoolshop/ghost-on-the-menu@latest, or clear the npx',
    '      cache (npx clear-npx-cache)',
    ...(bugs ? [`      if it happens again: ${bugs}`] : []),
  ];
}

/** Say a whole message, a line at a time, in the cabinet's one voice. */
function sayAll(lines: readonly string[]): void {
  for (const line of lines) sayTrouble(line);
}

/**
 * What to say when the walk took a port the player did not ask for, or null
 * when it took the one they did. `--help` documents the walk, but the run is
 * where a player who scripted `--port 8080` or bookmarked 7777 finds out, and
 * the two numbers were never in the same sentence.
 */
export function movedPortLine(asked: number, got: number): string | null {
  return asked === got ? null : `port ${asked} was busy, so this one is on ${got}`;
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
 * doing that.
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

/** How many tapes are bundled in this package, or null when there are none. */
function bundledTapes(): number | null {
  try {
    const names = readdirSync(TAPES_DIR).filter((name) => name.endsWith('.tape.json'));
    return names.length > 0 ? names.length : null;
  } catch {
    return null;
  }
}

/**
 * What `--mcp` resolved, said before the first tool call.
 *
 * `seatLines` was called only in play mode, so an operator wiring the cabinet
 * into an MCP client never learned which daemon or voice worker the round
 * would reach, nor whether VOICE_TOKEN had been picked up — the very lines
 * that exist because a session pointed at the wrong daemon used to look
 * exactly like a session pointed at the right one. The tapes line is here for
 * the same reason: the launcher quietly points the child at the bundled tapes
 * when CABINET_TAPES is unset, which is the right default and was never
 * stated, so an operator who mounted tapes and misspelled the variable saw a
 * server that started cleanly and played somebody else's tapes.
 *
 * All of it on stderr: under `--mcp` stdout belongs to the transport.
 */
export function mcpStartLines(
  env: NodeJS.ProcessEnv = process.env,
  tapes = bundledTapes(),
): string[] {
  const chosen = env.CABINET_TAPES;
  return [
    'the cabinet server is up on stdio',
    ...seatLines(env),
    chosen
      ? `tapes: ${chosen} (from the environment)`
      : tapes === null
        ? 'tapes: none in this package; set CABINET_TAPES to a directory of your own'
        : `tapes: the ${tapes} bundled ones (set CABINET_TAPES for your own)`,
  ];
}

/**
 * The play-mode flags `--mcp` accepts and then does nothing with. Refusing
 * them outright would break MCP client configs that already carry one;
 * silence about an argument that was ignored is the thing to end, because it
 * reads exactly like the port having been honored.
 */
export function mcpIgnored(argv: readonly string[]): string[] {
  const lines: string[] = [];
  if (argv.includes('--port')) lines.push('--port has no meaning with --mcp; nothing is listening');
  if (argv.includes('--no-open')) {
    lines.push('--no-open has no meaning with --mcp; no browser is opened');
  }
  return lines;
}

/** Hand stdio to the cabinet server and live exactly as long as it does. */
function runMcp(argv: readonly string[]): void {
  if (!existsSync(MCP_SERVER)) {
    sayAll(
      missingLines(
        'cabinet server missing from this package',
        'dist/cabinet-stdio.js',
        bugsIn(here),
      ),
    );
    process.exitCode = 1;
    return;
  }
  const env = { ...process.env };
  // The bundled tapes live in the package; the repo layout the server
  // resolves by default is not there. An explicit CABINET_TAPES wins.
  if (!env.CABINET_TAPES && existsSync(TAPES_DIR)) env.CABINET_TAPES = TAPES_DIR;
  sayAll(mcpIgnored(argv));
  sayAll(mcpStartLines(process.env));
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

/**
 * The shape this cabinet stands its shell up in. Exported so which seats it
 * lights is a test rather than a reading of `runPlay`.
 */
export function serveOpts(env: NodeJS.ProcessEnv = process.env): ServeOpts {
  return {
    playDir: PLAY_DIR,
    sayModule: existsSync(SAY_MODULE) ? SAY_MODULE : null,
    // Only the seats this cabinet uses are lit. The endless seat is the
    // typing cabinet's — it writes the request a player types — and the
    // shooter has nothing that calls it. Left absent, `endlessModule` falls
    // back to the say module and this package would publish a second
    // model-prompting route, handed the player's ANTHROPIC_API_KEY, that
    // nothing on its page will ever ask for. The typing cabinet passes
    // `sayModule: null` for the mirror-image reason.
    endlessModule: null,
    ollamaUrl: env.OLLAMA_URL ?? DEFAULT_OLLAMA,
    voiceUrl: env.VOICE_URL ?? DEFAULT_VOICE,
    voiceToken: env.VOICE_TOKEN ?? null,
    anthropicKey: env.ANTHROPIC_API_KEY ?? null,
    onTrouble: sayTrouble,
  };
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
    sayAll(
      missingLines('the shell is missing from this package', 'dist/play/index.html', bugsIn(here)),
    );
    process.exitCode = 1;
    return;
  }
  const server = createCabinetServer(serveOpts());
  let port: number;
  try {
    port = await listenFrom(server, args.port);
  } catch (err: unknown) {
    sayAll(listenLines(err, args.port));
    process.exitCode = 1;
    return;
  }
  // The walk is documented in --help, but the run is where a player who
  // scripted --port 8080 or bookmarked 7777 finds out. Said on stderr, beside
  // the seat lines and for their reason: stdout stays the two lines a pipe
  // reads.
  const moved = movedPortLine(args.port, port);
  if (moved) sayTrouble(moved);
  const url = `http://${HOST}:${port}/`;
  process.stdout.write(`Ghost on the Menu is at ${url}\n`);
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
    runMcp(argv);
    return;
  }
  await runPlay(args);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  void main(process.argv.slice(2));
}
