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
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { constants as osConstants } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The closed tool list this cabinet's stdio server answers `tools/list` with.
// Reached by path into the leaf both servers already import, the way this
// file reaches the shooter's server module: the package barrel is the whole
// MCP server, and a help text does not need it bundled in to print four
// words.
import { VIBE_TOOL_NAMES } from '../../cabinet-server/src/tool-names';
import {
  checkSeatUrl,
  createCabinetServer,
  DARK,
  HOST,
  listenFrom,
  listenLines,
  seatHaltLines,
} from '../../launcher/src/serve';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Laid down by `scripts/build.mjs`, beside this file, inside the package. */
const PLAY_DIR = path.resolve(here, 'play');
const ENDLESS_MODULE = path.resolve(here, 'cabinet-server.js');
const MCP_SERVER = path.resolve(here, 'cabinet-stdio.js');
const TAPES_DIR = path.resolve(here, 'tapes');

const DEFAULT_PORT = 7778;
const DEFAULT_OLLAMA = 'http://127.0.0.1:11434';
const DEFAULT_VOICE = 'http://127.0.0.1:7788';

/**
 * The levers `--mcp` hands a client, in the contract's own order, written out
 * once here and printed by both the help and the start line.
 *
 * This cabinet's server shipped a slice after the shooter's and was the one
 * an operator got the least help wiring: an MCP client showing no tools left
 * nothing printed anywhere to say whether the right cabinet server had even
 * started. Four names off the same constant the server dispatches on, so a
 * fifth tool is one edit in `tool-names.ts`.
 */
export const MCP_TOOLS = VIBE_TOOL_NAMES.join(', ');

/** What the arguments asked for. */
export interface Args {
  mode: 'play' | 'mcp' | 'help' | 'version';
  port: number;
  open: boolean;
  /** The argument that made no sense, when the mode is `help` because of it. */
  bad?: string;
}

/**
 * The whole help, for `--help` and for nothing else. The same sections in the
 * same order as the shooter's, one description column the length of the page,
 * no line past eighty columns unless it holds an address, and the six levers
 * in the order `levers.ts` names.
 */
const USAGE = `vibe-typer — a typing arcade game where you are the coding agent

  npx @mcptoolshop/vibe-typer            play it in your browser
  npx @mcptoolshop/vibe-typer --mcp      run it as an MCP server

Options
  --mcp              speak MCP on stdio instead of opening the game
                     its tools: ${MCP_TOOLS}
  --port <n>         port to listen on (default ${DEFAULT_PORT}; takes the next
                     free one when that is busy)
  --no-open          start the server but do not open a browser
  -h, --help         this
  -v, --version      the version

Environment
  OLLAMA_URL         the daemon the endless user sits at
                     (default ${DEFAULT_OLLAMA})
  VOICE_URL          the voice worker, when you run one
                     (default ${DEFAULT_VOICE})
  VOICE_TOKEN        the worker's bearer; added server-side, never in the page

Environment, --mcp only
  These are the cabinet server's own levers. They do nothing in play mode.
  CABINET_TAPES      a directory of tapes to season the wires stack with,
                     instead of the bundled ones
  CABINET_SEED       a whole number, so a stack repeats
  CABINET_TIER       0-3, how hard the stack is
  CABINET_BOT        which agent types it
  CABINET_TAPES_USER the shooter reads this one; this cabinet plays the tapes
                     it was given
  CABINET_FIXTURE    the shooter reads this one; this cabinet has no tape menu

The server listens on ${HOST} only. The daemon and the voice worker are
reached through a fixed allowlist: the model list, chat and generate, worker
health and stats, speak and its cached takes. Nothing else is proxied.`;

/**
 * What one mistyped argument is told. The whole usage used to go to stderr
 * under the diagnostic, so on a twenty-four-line terminal the one line that
 * says what went wrong had scrolled off before the prompt came back. The
 * shooter's launcher carries the same shape and they change together.
 */
export function badArgLines(bad: string): string[] {
  return [bad, '', 'next: npx @mcptoolshop/vibe-typer --help'];
}

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

/** The published version, for `--version`. */
export function version(): string {
  const said = versionIn(here);
  if (said === NO_VERSION) sayTrouble("could not read this package's version");
  return said;
}

/**
 * What `--version` leaves with. Undefined for a version; 1 for the word that
 * stands in for one, so `npx ... --version` in a script or a CI gate stops
 * recording a pass over a string that is not a version. Pure, so the two
 * cases are a test.
 */
export function versionExit(said: string): number | undefined {
  return said === NO_VERSION ? 1 : undefined;
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
 * The Node major this package's own `engines` field asks for, or null when
 * the manifest cannot be read — the same broken install `missingLines` is
 * for. Taken as a directory for the reason `versionIn` is: both layouts this
 * file runs in sit one directory under the package root.
 */
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

/**
 * The oldest Node this launcher runs on, read off the manifest so the guard
 * and the published `engines` field cannot say two different things. The 22
 * is only what a package whose manifest will not parse falls back to, and a
 * test holds that literal to the field.
 */
export const NODE_FLOOR = floorIn(here) ?? 22;

/** The major of a Node version string, or null when it is not one. */
export function nodeMajor(said: string): number | null {
  const found = /^v?(\d+)\./.exec(said);
  return found?.[1] ? Number(found[1]) : null;
}

/**
 * The halt for a Node older than the floor, or null when the one running is
 * new enough. The shooter's launcher carries the same guard and they change
 * together. Pure, so the table of cases is a test rather than a subprocess on
 * an interpreter this machine does not have.
 *
 * `npx` does not refuse on an engine mismatch: it warns and carries on, so
 * the player reached a megabyte and a half of bundled `cli.js` and whatever
 * it did in there. Every other way this launcher fails to start says a
 * sentence and a `next:` line; the one failure that belongs to the player's
 * machine rather than to the package arrived as a stack trace and was filed
 * as a game bug. A version we cannot read is not a version we refuse on.
 */
export function nodeFloorHalt(said: string, floor: number): string[] | null {
  const major = nodeMajor(said);
  if (major === null || major >= floor) return null;
  return [
    'this cabinet needs a newer Node than the one running it',
    `- expected: Node ${floor} or newer, and this is Node ${said}`,
    '',
    `next: install Node ${floor} or newer (https://nodejs.org), then run`,
    '      npx @mcptoolshop/vibe-typer again',
  ];
}

/**
 * What to say when a piece of the package is not in the package. The
 * shooter's launcher carries the same shape and they change together.
 *
 * This is the one failure a player cannot diagnose: it means an interrupted
 * `npx` download or a corrupt cache, and the old messages were four and six
 * words stating a fact with no verb in it. The pack gate in
 * `packages/launcher/scripts/build.mjs` is the model — every halt there ends
 * with a `next:` line naming the command that fixes it.
 */
export function missingLines(what: string, expected: string, bugs: string | null): string[] {
  return [
    what,
    `- expected: ${expected}`,
    '',
    'next: npx --yes @mcptoolshop/vibe-typer@latest, or clear the npx',
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
 * where a player who scripted `--port 8080` or bookmarked 7778 finds out, and
 * the two numbers were never in the same sentence.
 */
export function movedPortLine(asked: number, got: number): string | null {
  return asked === got ? null : `port ${asked} was busy, so this one is on ${got}`;
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
 * `seatLines` was called only in play mode, so an operator wiring this
 * cabinet into an MCP client never learned which daemon or voice worker the
 * session would reach, nor whether VOICE_TOKEN had been picked up. The tapes
 * line is here for the same reason: the launcher quietly points the child at
 * the bundled tapes when CABINET_TAPES is unset, which is the right default
 * and was never stated, so an operator who mounted tapes and misspelled the
 * variable saw a server that started cleanly and seasoned the wires stack
 * with somebody else's.
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
    // Named here as well as in the help because this is the line an operator
    // whose client lists no tools actually has in front of them, and it used
    // to name the seats and the tapes and stop.
    `its tools: ${MCP_TOOLS}`,
    ...seatLines(env),
    chosen
      ? `tapes: ${chosen} (from the environment), seasoning the wires stack`
      : tapes === null
        ? 'tapes: none in this package; set CABINET_TAPES to a directory of your own'
        : `tapes: the ${tapes} bundled ones season the wires stack (set CABINET_TAPES for your own)`,
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

/** Stand the shell up and open it. */
async function runPlay(args: Args): Promise<void> {
  // The environment is read before the package is, because a bad address is
  // the player's to fix and a missing shell is ours.
  const bad = checkSeats();
  if (bad) {
    sayAll(seatHaltLines(bad));
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
  const server = createCabinetServer({
    playDir: PLAY_DIR,
    // The say seat is the shooter's grammar — the boss's line over a wave —
    // and this cabinet has no bosses, so `/cabinet/say` is not lit. The
    // endless seat is named separately and points at the same bundle.
    // `DARK` rather than null: null means a bundle this package expected on
    // disk and did not find, and a seat that is dark by design is not a
    // broken download. The two used to answer the same 503.
    sayModule: DARK,
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
    sayAll(listenLines(err, args.port));
    process.exitCode = 1;
    return;
  }
  // The walk is documented in --help, but the run is where a player who
  // scripted --port 8080 or bookmarked 7778 finds out. Said on stderr, beside
  // the seat lines and for their reason: stdout stays the two lines a pipe
  // reads.
  const moved = movedPortLine(args.port, port);
  if (moved) sayTrouble(moved);
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
  // Before the arguments, because an interpreter too old to run this file is
  // too old to run `--help` on it either.
  const old = nodeFloorHalt(process.versions.node, NODE_FLOOR);
  if (old) {
    sayAll(old);
    process.exitCode = 1;
    return;
  }
  const args = parseArgs(argv);
  if (args.mode === 'version') {
    const said = version();
    // A caller that does not check the status still gets a string; one that
    // does gets the truth. `npx ... --version` in a script or a CI gate used
    // to record a pass while capturing something that is not a version.
    const leaves = versionExit(said);
    if (leaves !== undefined) process.exitCode = leaves;
    process.stdout.write(`${said}\n`);
    return;
  }
  if (args.mode === 'help') {
    if (args.bad) {
      sayAll(badArgLines(args.bad));
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
