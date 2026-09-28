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

// The closed tool list this cabinet's stdio server answers `tools/list` with.
// Reached by path into the leaf both servers already import rather than
// through the package barrel: the barrel is the whole MCP server, and a help
// text does not need the Anthropic SDK, zod and two contract loaders bundled
// into `dist/cli.js` to print six words.
import { TOOL_NAMES } from '../../cabinet-server/src/tool-names';

import { checkMcp } from './check';
import {
  exitAfter,
  forwardSignals,
  NODE_FLOOR,
  nodeFloorHalt,
  nodeMajor,
  NO_VERSION,
  openBrowser,
  type SignalHost,
  versionExit,
  versionIn,
} from './core';
import {
  CLAUDE_CALL_CEILING,
  checkSeatUrl,
  createCabinetServer,
  DARK,
  HOST,
  listenFrom,
  listenLines,
  seatHaltLines,
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

/**
 * The levers `--mcp` hands a client, in the contract's own order, written out
 * once here and printed by both the help and the start line.
 *
 * An operator whose client shows no tools had nothing printed to tell them
 * whether the right cabinet server even started: the help named the mode and
 * stopped, and the start line named the seats and the tapes. Typing the six
 * names into two pieces of prose would have made a seventh tool a three-place
 * edit, so the list comes off the same constant the server dispatches on.
 */
export const MCP_TOOLS = TOOL_NAMES.join(', ');

/** What the arguments asked for. */
export interface Args {
  mode: 'play' | 'mcp' | 'check' | 'help' | 'version';
  port: number;
  open: boolean;
  /** The argument that made no sense, when the mode is `help` because of it. */
  bad?: string;
}

/**
 * The whole help, for `--help` and for nothing else.
 *
 * One column the length of the page: every description starts at the same
 * place, no line passes eighty columns unless it holds an address that must
 * not be broken, and the `--mcp only` heading carries the qualifier once
 * rather than every row repeating it. The six levers are in the order
 * `levers.ts` names, which is the typing cabinet's order too.
 */
const USAGE = `ghost-on-the-menu — an arcade shooter where you are the agent

  npx @mcptoolshop/ghost-on-the-menu            play it in your browser
  npx @mcptoolshop/ghost-on-the-menu --mcp      run it as an MCP server
  npx @mcptoolshop/ghost-on-the-menu --check     list tools and exit

Options
  --mcp              speak MCP on stdio instead of opening the game
                     its tools: ${MCP_TOOLS}
  --check            list tools and exit (no browser needed)
  --port <n>         port to listen on (default ${DEFAULT_PORT}; takes the next
                     free one when that is busy)
  --no-open          start the server but do not open a browser
  -h, --help         this
  -v, --version      the version

Environment
  OLLAMA_URL         the daemon the bosses sit at
                     (default ${DEFAULT_OLLAMA})
  VOICE_URL          the voice worker, when you run one
                     (default ${DEFAULT_VOICE})
  VOICE_TOKEN        the worker's bearer; added server-side, never in the page
  ANTHROPIC_API_KEY  the Claude tier's key; never in the page, and never spent
                     unless CABINET_SAY_CLAUDE turns that tier on
  CABINET_SAY_CLAUDE on hands the boss lines to Claude, on that key, which
                     costs money; ${CLAUDE_CALL_CEILING} lines a run, then the local tier

Environment, --mcp only
  These are the cabinet server's own levers. They do nothing in play mode.
  CABINET_TAPES      a directory of tapes instead of the bundled ones
  CABINET_SEED       a whole number, so a round repeats
  CABINET_TIER       0-3, how hard the round is
  CABINET_BOT        which pilot flies it; the typing cabinet reads this one,
                     and this cabinet plays its own bot
  CABINET_TAPES_USER more tapes, merged beside the bundled ones
  CABINET_FIXTURE    the tape a fresh round starts on

The server listens on ${HOST} only. Ollama and the voice worker are reached
through a fixed allowlist: model list, chat and generate, worker health and
stats, speak and its cached takes. Nothing else is proxied.`;

/**
 * What one mistyped argument is told. The whole usage used to go to stderr
 * under the diagnostic — thirty-four lines, of which the one that says what
 * went wrong has scrolled off a twenty-four-line terminal before the prompt
 * comes back. The document is what `--help` is for; this is the halt shape
 * every other failure in the package takes.
 */
export function badArgLines(bad: string): string[] {
  return [bad, '', 'next: npx @mcptoolshop/ghost-on-the-menu --help'];
}

/** Read the arguments. Pure, so the table of cases is a test. */
export function parseArgs(argv: readonly string[]): Args {
  const out: Args = { mode: 'play', port: DEFAULT_PORT, open: true };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--mcp') out.mode = 'mcp';
    else if (arg === '--check') out.mode = 'check';
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
 * The word that turns the hosted tier on, and nothing else does.
 *
 * The audience for this package is people who run coding agents, which is
 * exactly the population that has ANTHROPIC_API_KEY exported in every shell.
 * A key that happens to be in the environment is not a request to spend it on
 * an arcade game, so finding one is no longer the decision: the run has to
 * say so. One word, because a variable that guesses at `1`, `yes` and `true`
 * is a variable that will one day guess wrong about `off`.
 */
export function claudeAsked(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.CABINET_SAY_CLAUDE === 'on';
}

/**
 * What the cabinet resolved, said before the first call rather than after it
 * fails. A session that is pointed at the wrong daemon used to look exactly
 * like a session that is pointed at the right one, right up until a seat went
 * quiet. These go to stderr so `--no-open` piping stays clean.
 *
 * The hosted tier gets a sentence rather than a light. `the Claude tier of
 * the say seat is lit` was true and told a player nothing they could act on:
 * not that a paid model rather than the one named in their menu would write
 * the boss lines, not that their own key would pay for it, and not that the
 * run stops after a stated number of them. A key sitting in the environment
 * with the tier off now says that too, because silence there reads like a
 * key that was ignored by accident.
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
    ...claudeLines(env),
  ];
}

/**
 * The two-line sentence about the hosted tier, or the one line about why it
 * is dark. Separate from `seatLines` so the four states are a table in the
 * test rather than a nest of conditionals in a template.
 */
export function claudeLines(env: NodeJS.ProcessEnv = process.env): string[] {
  if (!claudeAsked(env)) {
    return env.ANTHROPIC_API_KEY
      ? [
          'the Claude tier of the say seat is dark: ANTHROPIC_API_KEY is set,',
          'but the hosted tier is opt-in (CABINET_SAY_CLAUDE=on)',
        ]
      : ['the Claude tier of the say seat is dark: no ANTHROPIC_API_KEY'];
  }
  if (!env.ANTHROPIC_API_KEY) {
    return [
      'the Claude tier was asked for and there is no ANTHROPIC_API_KEY to',
      'sit it, so the local tier writes the boss lines',
    ];
  }
  return [
    'the say seat is on the Claude tier: Claude writes the boss lines and it',
    `costs money, on your ANTHROPIC_API_KEY, up to ${CLAUDE_CALL_CEILING} of them this run`,
  ];
}


function bundledTapes(): number | null {
  try {
    const names = readdirSync(TAPES_DIR).filter((name) => name.endsWith('.tape.json'));
    return names.length > 0 ? names.length : null;
  } catch {
    return null;
  }
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
 * when it took the one they did.
 */
export function movedPortLine(asked: number, got: number): string | null {
  return asked === got ? null : `port ${asked} was busy, so this one is on ${got}`;
}

/** The published version, for `--version` and the MCP handshake. */
export function version(): string {
  const said = versionIn(here);
  if (said === NO_VERSION) sayTrouble("could not read this package's version");
  return said;
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
    // Named here as well as in the help because this is the line an operator
    // whose client lists no tools actually has in front of them, and it used
    // to name the seats and the tapes and stop.
    `its tools: ${MCP_TOOLS}`,
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

/** Verify the MCP server lists the expected tools and exit. */
async function runCheck(): Promise<void> {
  if (!existsSync(MCP_SERVER)) {
    sayAll(
      missingLines('cabinet server missing from this package', 'dist/cabinet-stdio.js', bugsIn(here)),
    );
    process.exitCode = 1;
    return;
  }
  const result = await checkMcp(MCP_SERVER, TOOL_NAMES);
  if (result.ok) {
    process.stdout.write(`tools/list: ${result.found.join(',')}\n`);
    process.stdout.write('check passed\n');
  } else {
    process.stderr.write(`check failed: ${result.error ?? 'unexpected tools'}\n`);
    process.stderr.write(`found: ${result.found.join(',') || '(none)'}\n`);
    process.exitCode = 1;
  }
}

/**
 * The shape this cabinet stands its shell up in. Exported so which seats it
 * lights is a test rather than a reading of `runPlay`.
 */
export function serveOpts(env: NodeJS.ProcessEnv = process.env): ServeOpts {
  return {
    playDir: PLAY_DIR,
    sayModule: existsSync(SAY_MODULE) ? SAY_MODULE : null,
    endlessModule: DARK,
    ollamaUrl: env.OLLAMA_URL ?? DEFAULT_OLLAMA,
    voiceUrl: env.VOICE_URL ?? DEFAULT_VOICE,
    voiceToken: env.VOICE_TOKEN ?? null,
    anthropicKey: claudeAsked(env) ? (env.ANTHROPIC_API_KEY ?? null) : null,
    onTrouble: sayTrouble,
    version: version(),
  };
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
  if (args.mode === 'check') {
    await runCheck();
    return;
  }
  await runPlay(args);
}

export {
  exitAfter,
  floorIn,
  forwardSignals,
  NODE_FLOOR,
  nodeFloorHalt,
  nodeMajor,
  NO_VERSION,
  openBrowser,
  type SignalHost,
  versionExit,
  versionIn,
} from './core';

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  void main(process.argv.slice(2));
}
