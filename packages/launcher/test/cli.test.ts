import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { TOOL_NAMES } from '../../cabinet-server/src/tool-names';
import {
  badArgLines,
  bugsIn,
  checkSeats,
  claudeAsked,
  exitAfter,
  floorIn,
  forwardSignals,
  main,
  mcpIgnored,
  mcpStartLines,
  MCP_TOOLS,
  missingLines,
  movedPortLine,
  NODE_FLOOR,
  nodeFloorHalt,
  nodeMajor,
  NO_VERSION,
  parseArgs,
  sayTrouble,
  seatLines,
  serveOpts,
  version,
  versionExit,
  versionIn,
} from '../src/cli';
import { CABINET_VARS } from '../src/levers';
import { ceilingLine, CLAUDE_CALL_CEILING, DARK } from '../src/serve';

const PKG = path.resolve(__dirname, '..');
const MANIFEST = JSON.parse(readFileSync(path.join(PKG, 'package.json'), 'utf8')) as {
  version: string;
  engines: { node: string };
};
const DECLARED = MANIFEST.version;

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
    for (const bad of [
      '0',
      '65536',
      '-1',
      'eight',
      '80.5',
      '',
      // Forms `Number` takes and the help text does not describe. Left to
      // `Number` these are 8080, 7777 and 1000 — a player who typed one of
      // them gets a port they did not ask for and no word about it.
      '0x1f90',
      ' 7777 ',
      '1e3',
      '+7777',
      '7777.0',
      'Infinity',
    ]) {
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

  // A regex only ever said "some version". What is being published is this
  // package's own version, and a launcher reporting a different one than the
  // tarball it is in is the failure worth catching.
  it('reports the version this package is publishing', () => {
    expect(version()).toBe(DECLARED);
    expect(version()).not.toBe('0.0.0');
  });

  // `version()` resolves package.json one directory above the module, and in
  // the tarball that module is `dist/cli.js`, not `src/cli.ts` — a different
  // path than the one every other case exercises. Every failure in there
  // answers '0.0.0' silently, so the packaged layout is asserted rather than
  // assumed. No build needed: both layouts sit one directory under the root.
  it('resolves the same version from the packaged layout as from the source one', () => {
    expect(versionIn(path.join(PKG, 'src'))).toBe(DECLARED);
    expect(versionIn(path.join(PKG, 'dist'))).toBe(DECLARED);
    // Not `0.0.0`, which is a plausible version: a bug report filed against
    // it hides the broken install instead of carrying it.
    expect(versionIn(path.join(PKG, 'dist', 'deeper'))).toBe('0.0.0-unknown');
    expect(NO_VERSION).toBe('0.0.0-unknown');
  });
});

// ——— the Node the player happens to have ————————————————————————————————————
//
// The package states `>=22` in `engines`, in the README and in a section
// headed as the whole requirement, and nothing checked it at run time. `npx`
// does not refuse on an engine mismatch — it warns and carries on — so a
// player on an older Node reached a megabyte and a half of bundled `cli.js`.
// Every other way this launcher fails to start had been given a sentence and
// a `next:` line, and the one that depends on the player's machine rather
// than on the package arrived as a stack trace and was filed as a game bug.

describe('a Node older than the one this package runs on', () => {
  it('halts in the one shape, with what is running and what is needed', () => {
    const lines = nodeFloorHalt('20.11.1', 22);
    expect(lines).toEqual([
      'this cabinet needs a newer Node than the one running it',
      '- expected: Node 22 or newer, and this is Node 20.11.1',
      '',
      'next: install Node 22 or newer (https://nodejs.org), then run',
      '      npx @mcptoolshop/ghost-on-the-menu again',
    ]);
    // At the floor and above it, nothing is said and nothing is stopped.
    expect(nodeFloorHalt('22.0.0', 22)).toBeNull();
    expect(nodeFloorHalt('24.4.0', 22)).toBeNull();
    // A version we cannot read is not a version we refuse on: the launcher
    // is not the place to guess about an interpreter that answers nothing.
    expect(nodeMajor('20.11.1')).toBe(20);
    expect(nodeMajor('v22.9.0')).toBe(22);
    expect(nodeMajor('not-a-version')).toBeNull();
    expect(nodeFloorHalt('not-a-version', 22)).toBeNull();
  });

  // The guard and the manifest cannot say two things: the floor is read off
  // the package's own `engines` field, and the literal in `cli.ts` is only
  // the fallback for a manifest that will not parse.
  it('reads the floor from the engines field this package publishes', () => {
    expect(MANIFEST.engines.node).toBe('>=22');
    expect(NODE_FLOOR).toBe(22);
    expect(floorIn(path.join(PKG, 'src'))).toBe(22);
    expect(floorIn(path.join(PKG, 'dist'))).toBe(22);
    expect(floorIn(path.join(PKG, 'dist', 'deeper'))).toBeNull();
  });
});

// ——— the two dead ends a player cannot diagnose ——————————————————————————————
//
// `the shell is missing from this package` and `cabinet server missing from
// this package` were four and six words with no verb in them. They mean an
// interrupted npx download or a corrupt cache, and the pack gate in
// scripts/build.mjs — every halt of which ends with a `next:` line — is the
// shape they should have had all along.

describe('what a broken install is told to do about it', () => {
  it('names what it expected and the command that gets it', () => {
    const lines = missingLines(
      'the shell is missing from this package',
      'dist/play/index.html',
      'https://example.test/issues',
    );
    expect(lines[0]).toBe('the shell is missing from this package');
    expect(lines[1]).toBe('- expected: dist/play/index.html');
    expect(lines.join('\n')).toContain('next: npx --yes @mcptoolshop/ghost-on-the-menu@latest');
    expect(lines.join('\n')).toContain('npx clear-npx-cache');
    expect(lines.join('\n')).toContain('https://example.test/issues');
  });

  it('leaves the report clause out rather than inventing a URL', () => {
    const lines = missingLines('cabinet server missing from this package', 'x', null);
    expect(lines.join('\n')).not.toContain('if it happens again');
  });

  // Read off this package rather than spelled a second time in the message.
  it('reads where to report from the package itself', () => {
    expect(bugsIn(path.join(PKG, 'src'))).toBe(
      'https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/issues',
    );
    expect(bugsIn(path.join(PKG, 'dist', 'deeper'))).toBeNull();
  });

  it('says it in the shell-missing run, with a next line and no stack', async () => {
    const before = process.exitCode;
    let said = '';
    const err = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((chunk: string) => {
      said += String(chunk);
      return true;
    }) as typeof process.stderr.write;
    try {
      // There is no `src/play` in the repo layout, which is the same shape a
      // half-downloaded tarball has.
      await main([]);
    } finally {
      process.stderr.write = err;
    }
    expect(process.exitCode).toBe(1);
    process.exitCode = before;
    expect(said).toContain('the shell is missing from this package');
    expect(said).toContain('- expected: dist/play/index.html');
    expect(said).toContain('next: npx --yes @mcptoolshop/ghost-on-the-menu@latest');
    expect(said).not.toContain('at Object.');
  });

  it('says the same about --mcp, naming the server file', async () => {
    const before = process.exitCode;
    let said = '';
    let stdout = '';
    const err = process.stderr.write.bind(process.stderr);
    const out = process.stdout.write.bind(process.stdout);
    process.stderr.write = ((chunk: string) => {
      said += String(chunk);
      return true;
    }) as typeof process.stderr.write;
    process.stdout.write = ((chunk: string) => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;
    try {
      await main(['--mcp']);
    } finally {
      process.stderr.write = err;
      process.stdout.write = out;
    }
    expect(process.exitCode).toBe(1);
    process.exitCode = before;
    expect(said).toContain('cabinet server missing from this package');
    expect(said).toContain('- expected: dist/cabinet-stdio.js');
    // Under --mcp stdout belongs to the transport.
    expect(stdout).toBe('');
  });
});

// ——— what --mcp says on a healthy start ——————————————————————————————————————
//
// `seatLines` was called only in play mode, so an operator wiring the cabinet
// into an MCP client never learned which daemon the round would reach — the
// very lines that exist because a session pointed at the wrong daemon used to
// look exactly like one pointed at the right one. The tapes default was never
// stated either, so an operator who mounted tapes and misspelled the variable
// saw a server that started cleanly and played somebody else's.

describe('what --mcp says before the first tool call', () => {
  it('names the seats and where the tapes came from', () => {
    expect(mcpStartLines({}, 20)).toEqual([
      'the cabinet server is up on stdio',
      'its tools: fire, say, speak, sfx, view, tapes',
      'the bosses sit at http://127.0.0.1:11434 (the default)',
      'the voice worker is at http://127.0.0.1:7788 (the default), no bearer set',
      'the Claude tier of the say seat is dark: no ANTHROPIC_API_KEY',
      'tapes: the 20 bundled ones (set CABINET_TAPES for your own)',
    ]);
  });

  // An operator whose client lists no tools could not tell from anything the
  // launcher printed whether the right cabinet server had started. The names
  // come off the constant the server dispatches on rather than out of prose,
  // so a seventh tool is one edit there and this line follows it.
  it('names its tools, off the contract rather than out of prose', () => {
    expect(MCP_TOOLS).toBe(TOOL_NAMES.join(', '));
    expect(mcpStartLines({}, 20)[1]).toBe(`its tools: ${TOOL_NAMES.join(', ')}`);
    // The shooter's six, not the typing cabinet's four.
    expect(TOOL_NAMES.length).toBe(6);
  });

  it('names the directory when the operator gave one', () => {
    const lines = mcpStartLines({ CABINET_TAPES: '/tmp/mine' }, 20);
    expect(lines[lines.length - 1]).toBe('tapes: /tmp/mine (from the environment)');
  });

  it('says so rather than claiming tapes it does not have', () => {
    const lines = mcpStartLines({}, null);
    expect(lines[lines.length - 1]).toBe(
      'tapes: none in this package; set CABINET_TAPES to a directory of your own',
    );
  });

  // `--port 7777` in an MCP client config used to read as the port having
  // been honored. Refusing outright would break configs that carry one.
  it('says which play-mode flags it is ignoring', () => {
    expect(mcpIgnored(['--mcp'])).toEqual([]);
    expect(mcpIgnored(['--mcp', '--port', '7777'])).toEqual([
      '--port has no meaning with --mcp; nothing is listening',
    ]);
    expect(mcpIgnored(['--mcp', '--port', '9000', '--no-open'])).toEqual([
      '--port has no meaning with --mcp; nothing is listening',
      '--no-open has no meaning with --mcp; no browser is opened',
    ]);
  });
});

describe('a port the walk had to move off', () => {
  it('puts both numbers in one sentence, and says nothing when it did not move', () => {
    expect(movedPortLine(7777, 7782)).toBe('port 7777 was busy, so this one is on 7782');
    expect(movedPortLine(7777, 7777)).toBeNull();
  });
});

describe('the seats the shooter lights', () => {
  // The endless seat is the typing cabinet's. Left absent it falls back to
  // the say module, and this package would publish a second model-prompting
  // route, handed the player's ANTHROPIC_API_KEY, that nothing on its page
  // ever calls. `serve.test.ts` asserts what this shape does on the wire.
  it('leaves the endless seat dark on purpose, not by omission', () => {
    // `DARK`, not null: null is a bundle this package expected on disk and
    // did not find, which is a broken download and answers 503. A seat this
    // cabinet does not have answers 404 and says so.
    expect(serveOpts({}).endlessModule).toBe(DARK);
  });

  it('takes the daemon and the worker from the environment', () => {
    const opts = serveOpts({
      OLLAMA_URL: 'http://127.0.0.1:1',
      VOICE_URL: 'http://127.0.0.1:2',
      VOICE_TOKEN: 'bearer',
    });
    expect(opts.ollamaUrl).toBe('http://127.0.0.1:1');
    expect(opts.voiceUrl).toBe('http://127.0.0.1:2');
    expect(opts.voiceToken).toBe('bearer');
    const bare = serveOpts({});
    expect(bare.ollamaUrl).toBe('http://127.0.0.1:11434');
    expect(bare.voiceToken).toBeNull();
    expect(bare.anthropicKey).toBeNull();
  });
});

// ——— whose money the boss lines are written with ——————————————————————————————
//
// The launcher used to hand a hosted key straight through whenever it was in
// the environment, and the tier picker takes a key ahead of everything else,
// so a key exported for a coding agent beat the local model the player had
// just picked in the menu and every boss beat went to the paid tier. The
// audience for this package is people who run coding agents, which is exactly
// the population that has that variable exported in every shell.

describe('the hosted tier the run has to ask for', () => {
  it('keeps the key in the launcher until the run says otherwise', () => {
    // Exported, and not asked for: the tier stays dark and the key stays put.
    expect(serveOpts({ ANTHROPIC_API_KEY: 'sk-ant-nobody-asked' }).anthropicKey).toBeNull();
    // Asked for: this is the one shape that hands it over.
    expect(
      serveOpts({ ANTHROPIC_API_KEY: 'sk-ant-nobody-asked', CABINET_SAY_CLAUDE: 'on' })
        .anthropicKey,
    ).toBe('sk-ant-nobody-asked');
    // Asked for with nothing to sit it with is not an error, and is not a
    // key either.
    expect(serveOpts({ CABINET_SAY_CLAUDE: 'on' }).anthropicKey).toBeNull();
  });

  // One word. A variable that guesses at `1`, `yes` and `true` is a variable
  // that will one day guess wrong about `off`.
  it('takes one word for yes and reads everything else as no', () => {
    expect(claudeAsked({ CABINET_SAY_CLAUDE: 'on' })).toBe(true);
    for (const said of ['', 'off', 'ON', '1', 'true', 'yes', 'on ']) {
      expect(claudeAsked({ CABINET_SAY_CLAUDE: said }), said).toBe(false);
    }
    expect(claudeAsked({})).toBe(false);
  });

  it('tells the player which tier writes the lines, what it costs and when it stops', () => {
    const on = seatLines({ ANTHROPIC_API_KEY: 'sk-ant-nobody-asked', CABINET_SAY_CLAUDE: 'on' });
    const said = on.join(' ');
    expect(said).toContain('Claude writes the boss lines');
    expect(said).toContain('costs money');
    expect(said).toContain(`up to ${CLAUDE_CALL_CEILING} of them this run`);
    // A ceiling a player is told about is a number, not a word.
    expect(CLAUDE_CALL_CEILING).toBeGreaterThan(0);
    // And a key sitting in the environment with the tier off says so, rather
    // than reading like a key that was ignored by accident.
    expect(seatLines({ ANTHROPIC_API_KEY: 'sk-ant-nobody-asked' }).join(' ')).toContain(
      'the hosted tier is opt-in (CABINET_SAY_CLAUDE=on)',
    );
    // Asked for with nothing to sit it: named, and the run carries on local.
    expect(seatLines({ CABINET_SAY_CLAUDE: 'on' }).join(' ')).toContain(
      'the local tier writes the boss lines',
    );
  });

  // The ceiling is not a silent stop. When the run has spent it the key is
  // simply no longer handed over — the seat keeps writing, on the local tier
  // — and the run is told once rather than every call.
  it('says so when the run has spent the ceiling, in one line under eighty', () => {
    const line = ceilingLine(CLAUDE_CALL_CEILING);
    expect(line).toContain(String(CLAUDE_CALL_CEILING));
    expect(line).toContain('the local tier takes over');
    expect(line.length).toBeLessThanOrEqual(80);
  });

  // Whatever the tier, the value itself is never printed.
  it('never prints the key in any of the four states', () => {
    for (const env of [
      {},
      { ANTHROPIC_API_KEY: 'sk-ant-nobody-asked' },
      { CABINET_SAY_CLAUDE: 'on' },
      { ANTHROPIC_API_KEY: 'sk-ant-nobody-asked', CABINET_SAY_CLAUDE: 'on' },
    ]) {
      for (const line of seatLines(env)) expect(line).not.toContain('sk-ant-nobody-asked');
    }
  });
});

// ——— what the launcher leaves with when the MCP child is killed ——————————————
//
// The launcher re-raises the child's signal at itself so the MCP host sees a
// kill rather than an exit. That only works if our own forwarding handlers
// are gone first: with them installed the re-raised signal is delivered to
// them, the default terminate action is suppressed, and the launcher leaves
// with 0 — a clean exit reported for a kill.

describe('passing signals to the cabinet server', () => {
  function fakeHost() {
    const on: string[] = [];
    const off: string[] = [];
    const handlers = new Map<string, () => void>();
    return {
      on,
      off,
      handlers,
      host: {
        on(signal: NodeJS.Signals, handler: () => void) {
          on.push(signal);
          handlers.set(signal, handler);
          return undefined;
        },
        off(signal: NodeJS.Signals, handler: () => void) {
          if (handlers.get(signal) === handler) off.push(signal);
          return undefined;
        },
      },
    };
  }

  it('installs both, passes them on, and takes exactly those two off again', () => {
    const fake = fakeHost();
    const killed: string[] = [];
    const child = { killed: false, kill: (s: NodeJS.Signals) => killed.push(s) };
    const stop = forwardSignals(child, fake.host);
    expect(fake.on).toEqual(['SIGINT', 'SIGTERM']);
    fake.handlers.get('SIGINT')?.();
    expect(killed).toEqual(['SIGINT']);
    expect(fake.off).toEqual([]);
    stop();
    expect(fake.off).toEqual(['SIGINT', 'SIGTERM']);
  });

  it('does not kill a child that is already dead', () => {
    const fake = fakeHost();
    const killed: string[] = [];
    const child = { killed: true, kill: (s: NodeJS.Signals) => killed.push(s) };
    forwardSignals(child, fake.host);
    fake.handlers.get('SIGTERM')?.();
    expect(killed).toEqual([]);
  });

  it('leaves with the signal, not with zero and not with a flat one', () => {
    expect(exitAfter(0, null)).toBe(0);
    expect(exitAfter(3, null)).toBe(3);
    expect(exitAfter(null, null)).toBe(0);
    expect(exitAfter(null, 'SIGINT')).toBe(130);
    expect(exitAfter(null, 'SIGTERM')).toBe(143);
    expect(exitAfter(null, 'SIGKILL')).toBe(137);
  });
});

describe('what --help tells a player', () => {
  it('says what the allowlist is', async () => {
    const out = process.stdout.write.bind(process.stdout);
    let stdout = '';
    process.stdout.write = ((chunk: string) => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;
    try {
      await main(['--help']);
    } finally {
      process.stdout.write = out;
    }
    // The levers, their order and the heading that qualifies them are held
    // by the shared block at the foot of this file, against `levers.ts`.
    expect(stdout).toContain('model list, chat and generate');
  });
});

// OLLAMA_URL and VOICE_URL were read straight off the environment with no
// shape at all, and never echoed. A typo started the cabinet clean and turned
// up later as the proxy's `no answer`, which reads exactly like a daemon that
// is not running -- the same misdiagnosis `--port` was fixed for. Both are now
// held to a stated shape, and what was resolved is said before the first call.
describe('what npx says about the seats before the first call', () => {
  function capture(run: () => void): string {
    let said = '';
    const err = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((chunk: string) => {
      said += String(chunk);
      return true;
    }) as typeof process.stderr.write;
    try {
      run();
    } finally {
      process.stderr.write = err;
    }
    return said;
  }

  it('names what it resolved, and whether the bearer and the key are set', () => {
    expect(seatLines({})).toEqual([
      'the bosses sit at http://127.0.0.1:11434 (the default)',
      'the voice worker is at http://127.0.0.1:7788 (the default), no bearer set',
      'the Claude tier of the say seat is dark: no ANTHROPIC_API_KEY',
    ]);
    expect(
      seatLines({
        OLLAMA_URL: 'http://10.0.0.2:11434',
        VOICE_TOKEN: 'bearer',
        ANTHROPIC_API_KEY: 'key',
        CABINET_SAY_CLAUDE: 'on',
      }),
    ).toEqual([
      'the bosses sit at http://10.0.0.2:11434',
      'the voice worker is at http://127.0.0.1:7788 (the default), bearer set',
      'the say seat is on the Claude tier: Claude writes the boss lines and it',
      `costs money, on your ANTHROPIC_API_KEY, up to ${CLAUDE_CALL_CEILING} of them this run`,
    ]);
    // The bearer and the key are reported as set or not set. Neither value
    // is ever printed.
    for (const line of seatLines({ VOICE_TOKEN: 'bearer', ANTHROPIC_API_KEY: 'key' })) {
      expect(line.includes('bearer') && line.includes('no bearer')).toBe(false);
      expect(line.includes('key')).toBe(false);
    }
  });

  it('refuses an address it could never reach, and names which variable', () => {
    expect(checkSeats({})).toBeNull();
    expect(
      checkSeats({ OLLAMA_URL: 'http://127.0.0.1:1', VOICE_URL: 'https://a.test' }),
    ).toBeNull();
    expect(checkSeats({ OLLAMA_URL: 'localhost:11434' })).toBe(
      'OLLAMA_URL wants an http:// or https:// address, got localhost:11434',
    );
    // The likeliest typo is the one `new URL` throws on, and being shown the
    // address you believe you typed is no help; the example is what an
    // address is here.
    expect(checkSeats({ VOICE_URL: 'voice' })).toBe(
      'VOICE_URL is not an address, got voice; it wants a scheme, like http://127.0.0.1:11434',
    );
  });

  it('sends the cabinet trouble to stderr, and hands the server that same way out', () => {
    expect(serveOpts({}).onTrouble).toBe(sayTrouble);
    const said = capture(() => sayTrouble('the daemon at http://127.0.0.1:11434 did not answer'));
    expect(said).toBe(
      'the daemon at http://127.0.0.1:11434 did not answer' + String.fromCharCode(10),
    );
  });

  it('leaves with one and names the variable rather than standing a cabinet up', async () => {
    const before = process.exitCode;
    const had = process.env.OLLAMA_URL;
    process.env.OLLAMA_URL = 'localhost:11434';
    let stdout = '';
    const out = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string) => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;
    let said = '';
    const err = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((chunk: string) => {
      said += String(chunk);
      return true;
    }) as typeof process.stderr.write;
    try {
      await main([]);
    } finally {
      process.stdout.write = out;
      process.stderr.write = err;
      if (had === undefined) delete process.env.OLLAMA_URL;
      else process.env.OLLAMA_URL = had;
    }
    expect(process.exitCode).toBe(1);
    process.exitCode = before;
    expect(said).toContain('OLLAMA_URL wants an http:// or https:// address');
    // The environment is read before the package is: a bad address is the
    // player's to fix, and this run never got as far as looking for a shell.
    expect(said).not.toContain('the shell is missing');
    expect(stdout).toBe('');
  });
});

// ——— the two help texts, held to one shape ——————————————————————————————————
//
// The six levers were listed in three different orders across four surfaces,
// the qualifier was repeated on every row instead of sitting on the heading
// once, the rows carrying a default address ran past eighty columns (which
// wraps a URL, the one thing on the line that must not be broken), and the
// description column stepped by one between blocks. One list, in `levers.ts`,
// is what both help texts are held to now: a seventh lever is one edit there.

describe('the help both cabinets print', () => {
  async function help(): Promise<string> {
    const out = process.stdout.write.bind(process.stdout);
    let stdout = '';
    process.stdout.write = ((chunk: string) => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;
    try {
      await main(['--help']);
    } finally {
      process.stdout.write = out;
    }
    return stdout;
  }

  it('names all six levers, in the one order, under a heading that qualifies them', async () => {
    const stdout = await help();
    const at = CABINET_VARS.map((name) => stdout.indexOf(name));
    for (const [i, pos] of at.entries()) expect(pos, CABINET_VARS[i]).toBeGreaterThan(-1);
    // Both cabinets list them in the same order, so an operator running both
    // can read the two blocks side by side.
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    // The qualifier is on the heading, once. It used to be on every row, and
    // that clause is what pushed the first lever row past eighty columns.
    expect(stdout).toContain('Environment, --mcp only');
    expect(stdout).not.toContain('with --mcp:');
  });

  // The `--mcp` row named the mode and stopped, so the half of this package
  // an operator gets the least help wiring was the half the help said least
  // about. The names come off the contract, so a seventh tool is one edit in
  // `tool-names.ts` and both help texts follow it.
  it('names the tools under --mcp, off the contract rather than out of prose', async () => {
    const stdout = await help();
    expect(stdout).toContain(`its tools: ${TOOL_NAMES.join(', ')}`);
    for (const name of TOOL_NAMES) expect(stdout, name).toContain(name);
    // Under the `--mcp` row, not somewhere else on the page.
    const lines = stdout.split('\n');
    const at = lines.findIndex((l) => l.startsWith('  --mcp '));
    expect(at).toBeGreaterThan(-1);
    expect(lines[at + 1]).toBe(`${' '.repeat(21)}its tools: ${MCP_TOOLS}`);
  });

  // The hosted tier is opt-in, and the variable that turns it on is a row in
  // the same environment block, in the same one column, as the rest.
  it('names the variable that turns the Claude tier on, and what it costs', async () => {
    const stdout = await help();
    expect(stdout).toContain('CABINET_SAY_CLAUDE');
    expect(stdout).toContain('costs money');
    expect(stdout).toContain(String(CLAUDE_CALL_CEILING));
  });

  it('fits eighty columns, except a line that holds an address', async () => {
    for (const line of (await help()).split('\n')) {
      if (line.includes('http')) continue;
      expect(line.length, line).toBeLessThanOrEqual(80);
    }
  });

  it('runs one description column the length of the page', async () => {
    const lines = (await help()).split('\n');
    const rows = lines.filter((l) => /^ {2}(--|-[hv],|[A-Z][A-Z_]+ )/.test(l));
    // Options, Environment and the levers: every row, not just one block.
    expect(rows.length).toBeGreaterThan(10);
    for (const row of rows) {
      expect(row.slice(0, 21).endsWith(' '), row).toBe(true);
      expect(row[21], row).not.toBe(' ');
    }
    // And a wrapped description lands in the same column as the first one.
    for (const line of lines.filter((l) => /^ {19,}\S/.test(l))) {
      expect(line.slice(0, 21), line).toBe(' '.repeat(21));
      expect(line[21], line).not.toBe(' ');
    }
  });

  // The README prints the same rows, and printed different ones: `the usage`
  // where the help says `this`, and a `--port` row that had been re-worded.
  // The fenced Options block is a slice of the help, and this holds it there.
  it('is what the README says it is', async () => {
    const readme = readFileSync(path.join(PKG, 'README.md'), 'utf8');
    const fence = /## Options\s*\n+```\n([\s\S]*?)```/.exec(readme);
    expect(fence, 'the README has a fenced Options block').not.toBeNull();
    const block = (fence?.[1] ?? '').replace(/\n+$/, '');
    expect(block.length).toBeGreaterThan(40);
    expect(await help()).toContain(block);
  });
});

// ——— one mistyped argument ————————————————————————————————————————————————
//
// The whole usage used to go to stderr under the diagnostic: thirty-four
// lines, of which the one that says what went wrong scrolls off a
// twenty-four-line terminal before the prompt comes back. The document is
// what `--help` is for.

describe('what one bad argument is told', () => {
  function capture(): { read: () => { out: string; err: string }; stop: () => void } {
    let out = '';
    let err = '';
    const o = process.stdout.write.bind(process.stdout);
    const e = process.stderr.write.bind(process.stderr);
    process.stdout.write = ((chunk: string) => {
      out += String(chunk);
      return true;
    }) as typeof process.stdout.write;
    process.stderr.write = ((chunk: string) => {
      err += String(chunk);
      return true;
    }) as typeof process.stderr.write;
    return {
      read: () => ({ out, err }),
      stop: () => {
        process.stdout.write = o;
        process.stderr.write = e;
      },
    };
  }

  it('says what was wrong and where the usage is, and not the usage', async () => {
    const before = process.exitCode;
    const cap = capture();
    try {
      await main(['--port', 'abc']);
    } finally {
      cap.stop();
    }
    const { out, err } = cap.read();
    expect(process.exitCode).toBe(1);
    process.exitCode = before;
    const lines = err.trimEnd().split('\n');
    // Three lines, in the shape every other halt in the package takes.
    expect(lines).toEqual([
      '--port wants 1-65535, got abc',
      '',
      'next: npx @mcptoolshop/ghost-on-the-menu --help',
    ]);
    expect(err).not.toContain('Environment');
    expect(out).toBe('');
  });

  it('says the same for an argument it does not know', async () => {
    const before = process.exitCode;
    const cap = capture();
    try {
      await main(['--fullscreen']);
    } finally {
      cap.stop();
    }
    expect(process.exitCode).toBe(1);
    process.exitCode = before;
    expect(cap.read().err).toBe(
      'unknown argument --fullscreen\n\nnext: npx @mcptoolshop/ghost-on-the-menu --help\n',
    );
    expect(badArgLines('x')).toEqual(['x', '', 'next: npx @mcptoolshop/ghost-on-the-menu --help']);
  });
});

// ——— a version that is not a version ————————————————————————————————————————
//
// `--version` announced that it could not read the version and then left with
// 0, so a script or a CI gate recorded a pass and captured a string that is
// not a version. The line on stdout is unchanged: a caller that does not check
// the status still gets something, and one that does gets the truth.

describe('what --version leaves with', () => {
  it('leaves with one when the string is the stand-in, and zero otherwise', () => {
    expect(versionExit(NO_VERSION)).toBe(1);
    expect(versionExit(DECLARED)).toBeUndefined();
  });

  it('still writes a string, and leaves with zero on a good read', async () => {
    const before = process.exitCode;
    const out = process.stdout.write.bind(process.stdout);
    let stdout = '';
    process.stdout.write = ((chunk: string) => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;
    try {
      await main(['--version']);
    } finally {
      process.stdout.write = out;
    }
    expect(stdout).toBe(`${DECLARED}\n`);
    expect(process.exitCode).toBe(before);
  });
});
