// The one argument parser, named exit and entrypoint check every runner under
// `scripts/` shares. Each runner used to carry its own copy, which is how
// `voice.mjs` ended up the only one that accepted an unknown flag.
//
// Two rules hold here. A runner never prints a stack: every failure leaves as
// one named line through `die` or through `runMain`'s boundary. And a runner
// only runs itself: `isMain` compares resolved paths, never bare basenames, so
// a process whose entrypoint merely shares a filename cannot call into one of
// these modules and exit the host.
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** One line on stderr and out. The default code 2 is "you asked for it wrong". */
export function die(msg, code = 2) {
  console.error(msg);
  process.exit(code);
}

/** An error that carries the exit code the boundary should use. Never a stack. */
export function cliError(message, code = 2) {
  const err = new Error(message);
  err.exitCode = code;
  return err;
}

/** Print an error as the one line `die` would, honoring `exitCode` when it has one. */
export function exitFromError(err, fallback = 1) {
  const msg = err instanceof Error ? err.message : String(err);
  const code =
    err && typeof err === 'object' && Number.isInteger(err.exitCode) ? err.exitCode : fallback;
  die(msg, code);
}

/**
 * The top-level boundary. `await runMain(main)` instead of `await main()`, so a
 * throw anywhere inside — a failed bundle, an unwritable output directory, a
 * capped loop — leaves as a named line rather than an unhandled rejection with
 * a stack (Gate B).
 */
export async function runMain(main) {
  try {
    await main();
  } catch (err) {
    exitFromError(err);
  }
}

/**
 * True only when this module IS the process entrypoint. The resolved path is
 * the test; realpath is tried second so a runner reached through a link still
 * runs. There is deliberately no basename fallback: `main()` calls
 * `process.exit`, so any other process with an entrypoint of the same name
 * would have been exited by an ordinary `import` of this module.
 */
export function isMain(moduleUrl, argv1 = process.argv[1]) {
  if (!argv1) return false;
  const self = fileURLToPath(moduleUrl);
  const same = (a, b) => a.toLowerCase() === b.toLowerCase();
  let entry;
  try {
    entry = path.resolve(argv1);
  } catch {
    return false;
  }
  if (same(entry, self)) return true;
  try {
    return same(realpathSync(entry), realpathSync(self));
  } catch {
    return false;
  }
}

/**
 * `--flag value`, `--flag=value` and `--help`. An unknown flag is an exit-2
 * usage error in every runner. `booleans` names the flags that take no value.
 */
export function parseArgv(argv, known, opts = {}) {
  const usage = opts.usage ? `\n${opts.usage}` : '';
  const booleans = opts.booleans ?? new Set();
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      flags.help = true;
      continue;
    }
    if (a.startsWith('--')) {
      let key;
      let val;
      const eq = a.indexOf('=');
      if (eq !== -1) {
        key = a.slice(2, eq);
        val = a.slice(eq + 1);
        if (!known.has(key)) die(`unknown flag --${key}${usage}`);
        if (booleans.has(key)) die(`--${key} takes no value${usage}`);
      } else {
        key = a.slice(2);
        if (!known.has(key)) die(`unknown flag --${key}${usage}`);
        if (booleans.has(key)) {
          flags[key] = true;
          continue;
        }
        const next = argv[i + 1];
        if (next === undefined || String(next).startsWith('-')) {
          die(`missing value for --${key}${usage}`);
        }
        val = next;
        i += 1;
      }
      flags[key] = val;
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

/** A whole number in range, or a named exit-2 error. */
export function requireInt(raw, name, min, max) {
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) {
    die(`${name} must be ${min}..${max} (got ${raw})`);
  }
  return n;
}

/** The launchers' own port rule, so one bad port reads the same everywhere. */
export function requirePort(raw, flag = '--port') {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    die(`${flag} wants 1-65535, got ${raw === undefined || raw === '' ? '(nothing)' : raw}`);
  }
  return n;
}

/** Read a JSON file, naming what it was on both failures. Never a stack. */
export function readJsonFile(file, what = file) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    throw cliError(`${what}: unreadable (${file})`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw cliError(`${what}: bad json (${file})`);
  }
}
