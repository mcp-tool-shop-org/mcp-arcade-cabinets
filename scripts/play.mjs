#!/usr/bin/env node
// `pnpm test:play ghost [--fixture name] [--bot idle|sweeper|reader] [--seat mcp] [--tier 0|1|2|3] [--climb 0|1]`
// `pnpm test:play ghost --endless yes [--calls n] [--tier 0|1|2|3] [--seed n] [--bot ...]`
// `pnpm test:play vibe-typer [--tier 0|1|2|3] [--bot idle|perfect|typist:wpm[:rate]] [--seed n] [--stack name] [--level n] [--endless yes]`
// A scripted play-through is the acceptance test for a playable slice. Each
// cabinet registers a `play(args)` that returns a transcript; this runner
// prints it and exits non-zero if the transcript reports a failure. On !ok it
// names the reason on stderr (leaked / missed lies / lamps / overrun / seat threw).
import { existsSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

import { die, isMain, parseArgv, runMain } from './lib/cli.mjs';

const USAGE = `usage: pnpm test:play ghost [--fixture name] [--bot idle|sweeper|reader] [--seat mcp] [--tier 0|1|2|3] [--climb 0|1] [--tapes dir]
       pnpm test:play ghost --endless yes [--calls n] [--tier 0|1|2|3] [--seed n] [--bot idle|sweeper|reader]
       pnpm test:play vibe-typer [--tier 0|1|2|3] [--bot idle|perfect|typist:wpm[:rate]] [--seed n] [--stack name] [--level n] [--endless yes|no]
exit: 0 ok · 1 play-through failed · 2 usage · 3 no build`;

const BOTS = ['idle', 'sweeper', 'reader'];
const FLAGS = new Set([
  'fixture',
  'bot',
  'seat',
  'tier',
  'climb',
  'tapes',
  'seed',
  'stack',
  'level',
  'endless',
  'calls',
]);
const CABINETS = ['ghost', 'vibe-typer'];
/** Vibe Typer's bots: the typist carries its speed and its rate of mistypes. */
const TYPER_BOT = /^(idle|perfect|typist:\d+(\.\d+)?(:\d*\.?\d+)?)$/;
const TYPER_STACKS = ['bash', 'csharp', 'java', 'javascript', 'python', 'sql', 'integration'];
// Copied from play.ts: the screen may not carry a digit or these words.
const SCREEN_FORBIDDEN =
  /\d|\b(nrp|integrity|utility|attack_success|pass|fail|score|cleared|lie|fact|revealed|followed|held|ghost_answered|ghost_refused|menu_changed|menu_stable)\b/i;

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

function listTapeNames(dir) {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.tape.json'))
      .map((f) => f.replace(/\.tape\.json$/, ''));
  } catch {
    return [];
  }
}

/** `--tapes` wins; else `CABINET_TAPES_USER`. Overlay adds to the baked twenty. */
export function overlayDir(flags = {}, env = process.env) {
  if (flags && flags.tapes) return String(flags.tapes);
  return env.CABINET_TAPES_USER ? String(env.CABINET_TAPES_USER) : '';
}

export function tapeRoster(overlay) {
  const names = new Set(listTapeNames(path.resolve('fixtures/tapes')));
  if (overlay) for (const n of listTapeNames(overlay)) names.add(n);
  return [...names].sort();
}

export function resolveTapeFile(name, overlay) {
  if (overlay) {
    const p = path.join(overlay, `${name}.tape.json`);
    if (existsSync(p)) return p;
  }
  const baked = path.resolve('fixtures/tapes', `${name}.tape.json`);
  if (existsSync(baked)) return baked;
  return null;
}

function requireFixture(name, overlay) {
  if (resolveTapeFile(name, overlay)) return;
  console.error(`unknown fixture ${name}; have: ${tapeRoster(overlay).join(', ')}`);
  process.exit(2);
}

/**
 * Both cabinets print a fixed three-line header (the cabinet's name, its
 * furniture line, the end word) and then the screen, closed by a marker line.
 * The header carries the tape id and the fixture name, so it is furniture and
 * not screen: it is asserted, never scanned.
 */
const HEADER_LINES = 3;
const GHOST_FOOTER = 'revealed:';
const TYPER_FOOTER = 'valuation:';

/**
 * Slice the screen out of a transcript and scan it. The offsets above are
 * assumptions, so they are checked: a transcript with no marker line is one
 * that was cut short, and the honest answer there is that the screen cannot be
 * inspected — NOT to widen the window to the end of the text, which is what
 * the old `slice(3, -1 ? undefined : footer)` quietly did in exactly the case
 * the gate is most needed.
 */
export function inspectScreen(text, marker) {
  const lines = String(text).split('\n');
  if (lines.length <= HEADER_LINES) {
    return {
      ok: false,
      why: `cannot inspect the screen: the transcript is ${lines.length} lines, shorter than its own header`,
      hit: null,
      screen: [],
    };
  }
  const footer = lines.findIndex((l, i) => i >= HEADER_LINES && l.startsWith(marker));
  if (footer === -1) {
    return {
      ok: false,
      why: `cannot inspect the screen: the transcript has no ${marker} line, so where the screen ends is unknown`,
      hit: null,
      screen: [],
    };
  }
  const screen = lines.slice(HEADER_LINES, footer);
  for (const line of screen) {
    const m = SCREEN_FORBIDDEN.exec(line);
    if (m) return { ok: true, why: '', hit: m[0], screen };
  }
  return { ok: true, why: '', hit: null, screen };
}

function screenForbiddenHit(text) {
  return inspectScreen(text, GHOST_FOOTER).hit;
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
  // An endless run that hit its call cap ended as it should, like a round that ran its clock out.
  if (
    !t.leaked &&
    bar &&
    (t.ended === 'time' || t.ended === 'calls') &&
    !/\bseat threw\b/.test(t.text ?? '')
  ) {
    reasons.push('overrun');
  }
  return reasons.join('; ') || 'round failed';
}

/**
 * Print the transcript; on !ok, FAILED instead of round complete, why on
 * stderr. Returns the exit code.
 *
 * The runner scans the printed transcript itself and fails on a hit even when
 * the cabinet said ok — the external-verifier property the Vibe Typer path has
 * had from the start. The cabinet's own detector reads `ctx.texts`; this one
 * reads what a player would actually see printed, and the two are not the same
 * artifact. A transcript whose shape cannot be inspected is a failure too: a
 * gate that cannot see is not a gate that passed.
 */
export function reportPlay(t, bot = 'reader') {
  let text = t.text ?? '';
  const seen = inspectScreen(text, GHOST_FOOTER);
  if (!t.ok || !seen.ok || seen.hit) {
    text = text.replace(/^round complete$/m, 'FAILED');
    console.log(text);
    console.error(!t.ok ? whyFailed(t, bot) : seen.hit ? `leaked (${seen.hit})` : seen.why);
    return 1;
  }
  console.log(text);
  return 0;
}

/**
 * Vibe Typer's screen is the lines between the three-line header and the
 * `valuation:` footer. The valuation is allowed on the board (G23); nothing
 * else on that screen may carry a digit or a barred word.
 */
export function typerScreenHit(text) {
  return inspectScreen(text, TYPER_FOOTER).hit;
}

function requireCount(raw, name) {
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) die(`${name} must be a whole number (got ${raw})`);
  return n;
}

function requireYesNo(raw, name) {
  if (raw === undefined) return undefined;
  if (raw === 'yes' || raw === 'true') return true;
  if (raw === 'no' || raw === 'false') return false;
  die(`${name} must be yes or no (got ${raw})`);
}

/** One Vibe Typer play-through. Returns the exit code. */
async function playTyper(flags) {
  if (flags.bot !== undefined && !TYPER_BOT.test(flags.bot)) {
    die(`unknown bot ${flags.bot}; use idle, perfect or typist:wpm`);
  }
  if (flags.stack !== undefined && !TYPER_STACKS.includes(flags.stack)) {
    die(`unknown stack ${flags.stack}; have: ${TYPER_STACKS.join(', ')}`);
  }
  if (
    flags.fixture !== undefined ||
    flags.seat !== undefined ||
    flags.climb !== undefined ||
    flags.calls !== undefined
  ) {
    die(`vibe-typer takes no --fixture, --seat, --climb or --calls\n${USAGE}`);
  }
  const args = {};
  const tier = requireTier(flags.tier);
  if (tier !== undefined) args.tier = tier;
  if (flags.bot !== undefined) args.bot = flags.bot;
  const seed = requireCount(flags.seed, 'seed');
  if (seed !== undefined) args.seed = seed;
  const level = requireCount(flags.level, 'level');
  if (level !== undefined) args.level = level;
  if (flags.stack !== undefined) args.stack = flags.stack;
  const endless = requireYesNo(flags.endless, 'endless');
  if (endless !== undefined) args.endless = endless;
  if (flags.tapes !== undefined) args.tapes = String(flags.tapes);
  const file = path.resolve('packages/vibe-typer/dist/play.js');
  const mod = await import(pathToFileURL(file).href).catch(() => null);
  if (!mod || typeof mod.play !== 'function') {
    console.error(
      'no play-through for vibe-typer: build it first (packages/vibe-typer/dist/play.js must export play(args))',
    );
    process.exit(3);
  }
  let transcript;
  try {
    transcript = await mod.play(args);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
  const seen = inspectScreen(transcript.text ?? '', TYPER_FOOTER);
  if (!transcript.ok || !seen.ok || seen.hit) {
    console.log(String(transcript.text ?? '').replace(/^level shipped$/m, 'FAILED'));
    console.error(
      !transcript.ok
        ? transcript.why || 'play-through failed'
        : seen.hit
          ? `leaked (${seen.hit})`
          : seen.why,
    );
    return 1;
  }
  console.log(transcript.text);
  return 0;
}

async function main() {
  const { positional, flags } = parseArgv(process.argv.slice(2), FLAGS, { usage: USAGE });
  if (flags.help) {
    console.log(USAGE);
    process.exit(0);
  }
  const cabinet = positional[0];
  if (!cabinet) die(USAGE);
  if (positional.length > 1) die(`unknown argument ${positional[1]}\n${USAGE}`);
  if (!CABINETS.includes(cabinet)) {
    die(`unknown cabinet ${cabinet}; use ${CABINETS.join(' or ')}\n${USAGE}`);
  }
  if (cabinet === 'vibe-typer') process.exit(await playTyper(flags));

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
  // Endless plays the whole roster as one run, so it takes no fixture and no
  // climb of its own: the climb is the run's, out of `endless.json`.
  const endless = requireYesNo(flags.endless, 'endless');
  if (endless) {
    if (flags.fixture !== undefined || flags.climb !== undefined || flags.seat !== undefined) {
      die(`--endless takes no --fixture, --climb or --seat\n${USAGE}`);
    }
    args.endless = true;
    const calls = requireCount(flags.calls, 'calls');
    if (calls !== undefined) args.calls = calls;
    const seed = requireCount(flags.seed, 'seed');
    if (seed !== undefined) args.seed = seed;
  } else if (flags.calls !== undefined || flags.seed !== undefined) {
    die(`--calls and --seed need --endless yes\n${USAGE}`);
  }

  const overlay = overlayDir(flags);
  if (!endless) requireFixture(flags.fixture ?? 'naive-ndjson', overlay);

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

if (isMain(import.meta.url)) {
  await runMain(main);
}
