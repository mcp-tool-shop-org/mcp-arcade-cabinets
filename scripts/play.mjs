#!/usr/bin/env node
// `pnpm test:play ghost [--fixture name] [--bot idle|sweeper|reader] [--seat mcp] [--tier 0|1|2|3] [--climb 0|1]`
// A scripted play-through is the acceptance test for a playable slice. Each
// cabinet registers a `play(args)` that returns a transcript; this runner
// prints it and exits non-zero if the transcript reports a failure. On !ok it
// names the reason on stderr (leaked / missed lies / lamps / overrun / seat threw).
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const USAGE = `usage: pnpm test:play ghost [--fixture name] [--bot idle|sweeper|reader] [--seat mcp] [--tier 0|1|2|3] [--climb 0|1]
exit: 0 ok · 1 play-through failed · 2 usage · 3 no build`;

const BOTS = ['idle', 'sweeper', 'reader'];
const FLAGS = new Set(['fixture', 'bot', 'seat', 'tier', 'climb']);
// Copied from play.ts: the screen may not carry a digit or these words.
const SCREEN_FORBIDDEN =
  /\d|\b(nrp|integrity|utility|attack_success|pass|fail|score|cleared|lie|fact|revealed|followed|held|ghost_answered|ghost_refused|menu_changed|menu_stable)\b/i;

function isMain() {
  const entry = process.argv[1];
  if (!entry) return false;
  const self = fileURLToPath(import.meta.url);
  try {
    if (path.resolve(entry).toLowerCase() === self.toLowerCase()) return true;
  } catch {
    /* ignore */
  }
  return path.basename(entry).toLowerCase() === path.basename(self).toLowerCase();
}

function die(msg, code = 2) {
  console.error(msg);
  process.exit(code);
}

function parseArgv(argv, known) {
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
      } else {
        key = a.slice(2);
        const next = argv[i + 1];
        if (next === undefined || String(next).startsWith('-')) {
          die(`missing value for --${key}\n${USAGE}`);
        }
        val = next;
        i += 1;
      }
      if (!known.has(key)) die(`unknown flag --${key}\n${USAGE}`);
      flags[key] = val;
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

function requireBot(name) {
  if (name === undefined) return;
  if (!BOTS.includes(name)) die(`unknown bot ${name}; use idle, sweeper or reader`);
}

function requireTier(raw) {
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 3) die(`tier must be 0..3 (got ${raw})`);
  return n;
}

function requireClimb(raw) {
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 1) die(`climb must be 0 or 1 (got ${raw})`);
  return n;
}

function tapeRoster() {
  try {
    return readdirSync(path.resolve('fixtures/tapes'))
      .filter((f) => f.endsWith('.tape.json'))
      .map((f) => f.replace(/\.tape\.json$/, ''))
      .sort();
  } catch {
    return [];
  }
}

function requireFixture(name) {
  if (existsSync(path.resolve('fixtures/tapes', `${name}.tape.json`))) return;
  console.error(`unknown fixture ${name}; have: ${tapeRoster().join(', ')}`);
  process.exit(2);
}

function screenForbiddenHit(text) {
  const lines = String(text).split('\n');
  const footer = lines.findIndex((l, i) => i >= 3 && l.startsWith('revealed:'));
  const screen = lines.slice(3, footer === -1 ? undefined : footer);
  for (const line of screen) {
    const m = SCREEN_FORBIDDEN.exec(line);
    if (m) return m[0];
  }
  return null;
}

/** One-line why for a failed play-through. Names leaked / bar / lamps / overrun / seat. */
export function whyFailed(t, bot = 'reader') {
  if (t.text && String(t.text).startsWith('fixture ')) return t.text;
  const reasons = [];
  if (t.leaked) {
    const hit = screenForbiddenHit(t.text ?? '');
    reasons.push(hit ? `leaked (${hit})` : 'leaked');
  }
  const revealed = t.revealed ?? [];
  const lies = t.lies ?? [];
  const missed = lies.filter((id) => !revealed.includes(id));
  if (bot === 'reader' && missed.length > 0) {
    reasons.push(`reader missed ${missed.join(', ')} (${revealed.length}/${lies.length})`);
  } else if (bot === 'sweeper') {
    const half = Math.ceil(lies.length / 2);
    if (revealed.length < half) {
      reasons.push(`sweeper under half (${revealed.length}/${lies.length})`);
    }
  }
  if (t.ended === 'lamps') reasons.push('ended=lamps');
  if (/\bseat threw\b/.test(t.text ?? '')) reasons.push('seat threw');
  const half = Math.ceil(lies.length / 2);
  const bar =
    bot === 'reader' ? missed.length === 0 : bot === 'sweeper' ? revealed.length >= half : true;
  if (!t.leaked && bar && t.ended === 'time' && !/\bseat threw\b/.test(t.text ?? '')) {
    reasons.push('overrun');
  }
  return reasons.join('; ') || 'round failed';
}

/** Print the transcript; on !ok, FAILED instead of round complete, why on stderr. Returns exit code. */
export function reportPlay(t, bot = 'reader') {
  let text = t.text ?? '';
  if (!t.ok) {
    text = text.replace(/^round complete$/m, 'FAILED');
    console.log(text);
    console.error(whyFailed(t, bot));
    return 1;
  }
  console.log(text);
  return 0;
}

async function main() {
  const { positional, flags } = parseArgv(process.argv.slice(2), FLAGS);
  if (flags.help) {
    console.log(USAGE);
    process.exit(0);
  }
  const cabinet = positional[0];
  if (!cabinet) die(USAGE);
  if (positional.length > 1) die(`unknown argument ${positional[1]}\n${USAGE}`);
  if (cabinet !== 'ghost') die(`unknown cabinet ${cabinet}; use ghost\n${USAGE}`);

  requireBot(flags.bot);
  const args = {};
  if (flags.fixture !== undefined) args.fixture = flags.fixture;
  if (flags.bot !== undefined) args.bot = flags.bot;
  const tier = requireTier(flags.tier);
  if (tier !== undefined) args.tier = tier;
  const climb = requireClimb(flags.climb);
  if (climb !== undefined) args.climb = climb;
  if (flags.seat !== undefined && flags.seat !== 'mcp') {
    die(`unknown seat ${flags.seat}; use mcp`);
  }

  const pkg = 'ghost-on-the-menu';
  const mod = await import(pathToFileURL(path.resolve(`packages/${pkg}/dist/play.js`)).href).catch(
    () => null,
  );
  if (!mod || typeof mod.play !== 'function') {
    console.error(
      `no play-through for ${pkg}: build it first (packages/${pkg}/dist/play.js must export play(args))`,
    );
    process.exit(3);
  }
  if (flags.seat === 'mcp') {
    // The cabinet server driven in-process: its scripted model pulls the
    // levers each frame on tier 1 with the sweeper as an immortal ship, so
    // every boss on the tape is met (as `pnpm sit` does).
    const cs = await import(
      pathToFileURL(path.resolve('packages/cabinet-server/dist/index.js')).href
    ).catch(() => null);
    if (!cs || typeof cs.createScriptedSeat !== 'function') {
      console.error('no cabinet server: build it first (packages/cabinet-server/dist/index.js)');
      process.exit(3);
    }
    args.seat = cs.createScriptedSeat();
    if (args.tier === undefined || Number.isNaN(args.tier)) args.tier = 1;
    args.bot = args.bot ?? 'sweeper';
    args.immortal = true;
  }
  requireFixture(args.fixture ?? 'naive-ndjson');
  let transcript;
  try {
    transcript = await mod.play(args);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/^unknown bot /.test(msg)) {
      console.error(msg);
      process.exit(2);
    }
    console.error(msg);
    process.exit(1);
  }
  process.exit(reportPlay(transcript, args.bot ?? 'reader'));
}

if (isMain()) {
  await main();
}
