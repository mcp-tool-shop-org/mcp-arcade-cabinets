#!/usr/bin/env node
// `pnpm transcript vibe-typer [--tier 0|1|2|3] [--seed n] [--level n] [--endless yes|no]
//                             [--bot idle|perfect|typist:wpm[:rate]] [--stack name] [--all-levels]`
// `pnpm transcript ghost --fixture name [--bot idle|sweeper|reader] [--tier 0|1|2|3] [--climb 0|1]`
// `pnpm transcript ghost --endless yes [--calls n] [--tier 0|1|2|3] [--seed n] [--bot ...]`
//
// The whole chat of a run, as one command, so the Director can read what a
// cabinet actually says without playing it in a browser or reading a diff of
// the pools. `pnpm test:play` prints four tail lines and a valuation; this
// prints every line: who said it, whether it was a check-in, the beat it
// landed on and the level it landed in, and then the toasts the board would
// have flashed. The Ghost side is the same idea for a cabinet with no chat:
// every caption, aside, boss and scene line with its round time.
//
// It bundles the workspace sources the way `film` does, so it reads the
// sources on disk and needs no `pnpm build`. A development tool: nothing here
// is a test, and nothing here writes to the repo but the throwaway bundle.
import path from 'node:path';

import { cliError, die, isMain, parseArgv, readJsonFile, runMain } from './lib/cli.mjs';
import { bundleModule } from './lib/bundle.mjs';
import { overlayDir, resolveTapeFile, tapeRoster } from './play.mjs';

const USAGE = `usage: pnpm transcript vibe-typer [--tier 0|1|2|3] [--seed n] [--level n] [--endless yes|no]
                                  [--bot idle|perfect|typist:wpm[:rate]] [--stack name] [--all-levels] [--tapes dir]
       pnpm transcript ghost --fixture name [--bot idle|sweeper|reader] [--tier 0|1|2|3] [--climb 0|1] [--tapes dir]
       pnpm transcript ghost --endless yes [--calls n] [--tier 0|1|2|3] [--seed n] [--bot idle|sweeper|reader]
       pnpm transcript --self-check
exit: 0 ok · 1 nothing to read, or a leak · 2 usage`;

const CABINETS = ['ghost', 'vibe-typer'];
const GHOST_BOTS = ['idle', 'sweeper', 'reader'];
const STACKS = ['bash', 'csharp', 'java', 'javascript', 'python', 'sql', 'integration'];
const FLAGS = new Set([
  'fixture',
  'bot',
  'tier',
  'climb',
  'seed',
  'level',
  'endless',
  'calls',
  'stack',
  'tapes',
  'all-levels',
  'self-check',
]);
const BOOLEANS = new Set(['all-levels', 'self-check']);

// Copied from play.mjs: a chat line, like a screen line, may carry none of
// these. The runner reads what it printed, so a pool that leaked is named here
// rather than read past.
const SCREEN_FORBIDDEN =
  /\d|\b(nrp|integrity|utility|attack_success|pass|fail|score|cleared|lie|fact|revealed|followed|held|ghost_answered|ghost_refused|menu_changed|menu_stable)\b/i;

const VIBE_DT = 1 / 60;
/** Forty minutes of a level at the vibe frame; the same cap play.ts uses. */
const VIBE_MAX_TICKS = 60 * 60 * 40;
const GHOST_DT = 1 / 30;
/** Ten minutes of round time at the ghost frame. No tape is near that long. */
const GHOST_MAX_TICKS = 30 * 60 * 10;
const OUT_DIR = 'film';

function requireInt(raw, name, min, max) {
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max)
    die(`${name} must be ${min}..${max} (got ${raw})`);
  return n;
}

function requireYesNo(raw, name) {
  if (raw === undefined) return undefined;
  if (raw === 'yes' || raw === 'true') return true;
  if (raw === 'no' || raw === 'false') return false;
  die(`${name} must be yes or no (got ${raw})`);
}

const clock = (t) => `t${String(Number(t).toFixed(1)).padStart(7)}`;

/** One chat line as a row: the level, the clock, the beat, who, check-in, words. */
export function chatRow({ level, at, beat, who, line, nag }) {
  return [
    `lvl ${String(level).padStart(2)}`,
    clock(at),
    String(beat ?? '-').padEnd(10),
    String(who).padEnd(5),
    nag ? 'check-in' : '        ',
    line,
  ].join('  ');
}

/** One toast row: the clock and the words the board would have flashed. */
export function toastRow({ at, what }) {
  return `${clock(at)}  ${what}`;
}

/** Every forbidden word in a set of lines, as `line: word` rows. */
export function leaksIn(lines) {
  const out = [];
  for (const line of lines) {
    const m = SCREEN_FORBIDDEN.exec(String(line));
    if (m) out.push(`${m[0]} in "${line}"`);
  }
  return out;
}

function toastsFrom(events, at) {
  const rows = [];
  for (const event of events) {
    if (event.kind === 'milestone') rows.push({ at, what: `milestone ${event.name}` });
    else if (event.kind === 'copilot')
      rows.push({ at, what: `copilot ${event.on ? 'on' : 'off'}` });
    else if (event.kind === 'compaction') rows.push({ at, what: 'compaction' });
    else if (event.kind === 'creep') rows.push({ at, what: 'scope creep' });
    else if (event.kind === 'sync') rows.push({ at, what: `sync ${event.on ? 'on' : 'off'}` });
    else if (event.kind === 'ship')
      rows.push({ at, what: event.nearMiss ? 'shipped (near miss)' : 'shipped' });
    else if (event.kind === 'over') rows.push({ at, what: `over: ${event.how}` });
  }
  return rows;
}

async function vibeModule() {
  return bundleModule({
    contents: [
      "export { createRun, stepRun } from './packages/vibe-typer/src/sim.ts';",
      "export { DEFAULT_PATTERNS } from './packages/vibe-typer/src/patterns.ts';",
      "export { botFor, integrationFrom, parseBot } from './packages/vibe-typer/src/play.ts';",
    ].join('\n'),
    outDir: path.resolve(OUT_DIR),
    outFile: '.transcript.vibe.mjs',
    what: 'the typing cabinet',
  });
}

/** One level, printed line by line. Returns its rows, toasts and leaks. */
function runVibeLevel(m, opts) {
  const spec = m.parseBot(opts.bot);
  if (!spec) throw cliError(`unknown bot ${opts.bot}; use idle, perfect or typist:wpm`);
  const create = {
    seed: opts.seed,
    tier: opts.tier,
    endless: opts.endless,
    levelIndex: opts.level,
    ...(opts.stack ? { stack: opts.stack } : {}),
  };
  if (opts.integration.length > 0) create.integration = opts.integration;
  let state;
  try {
    state = m.createRun(create);
  } catch (err) {
    throw cliError(err instanceof Error ? err.message : String(err), 1);
  }
  const bot = m.botFor(spec, opts.seed);
  const rows = [];
  const toasts = [];
  const lines = [];
  let ticks = 0;
  const take = (from) => {
    for (let i = from; i < state.chat.length; i += 1) {
      const c = state.chat[i];
      lines.push(c.line);
      rows.push(
        chatRow({
          level: state.levelIndex + 1,
          at: c.at,
          // The beat the run is in as the line lands; a line is written during
          // the step, so this is read after it.
          beat: state.beat,
          who: c.who,
          line: c.line,
          nag: c.nag === true,
        }),
      );
    }
  };
  take(0);
  while (!state.over) {
    if (ticks >= VIBE_MAX_TICKS) {
      throw cliError(
        `the level did not end after ${ticks} frames (clock ${state.clock.toFixed(1)})`,
        1,
      );
    }
    ticks += 1;
    const before = state.chat.length;
    m.stepRun(state, bot(state), VIBE_DT);
    take(before);
    toasts.push(...toastsFrom(state.events, state.clock));
  }
  return { state, rows, toasts, leaks: leaksIn(lines), spec };
}

async function vibe(flags, selfCheck) {
  const m = await vibeModule();
  const tier = requireInt(flags.tier, 'tier', 0, 3) ?? 0;
  const seed = requireInt(flags.seed, 'seed', 0, Number.MAX_SAFE_INTEGER) ?? 1;
  const endless = requireYesNo(flags.endless, 'endless') ?? false;
  const stack = flags.stack;
  if (stack !== undefined && !STACKS.includes(stack)) {
    die(`unknown stack ${stack}; have: ${STACKS.join(', ')}`);
  }
  const listed = m.DEFAULT_PATTERNS.levels.levels;
  const levels = flags['all-levels']
    ? listed.map((_, i) => i)
    : [requireInt(flags.level, 'level', 0, Math.max(0, listed.length - 1)) ?? 0];
  const tapes = flags.tapes ? String(flags.tapes) : path.resolve('fixtures/tapes');
  const integration = m.integrationFrom(tapes);
  const bot = selfCheck ? 'typist:90' : (flags.bot ?? 'typist:40');

  let printed = 0;
  let leaked = 0;
  for (const level of levels) {
    const run = runVibeLevel(m, { tier, seed, endless, stack, level, bot, integration });
    const plan = run.state.plan;
    console.log(
      `level ${plan.id} · ${plan.stack} · tier ${tier} · bot ${run.spec.name} · seed ${seed} · endless ${endless ? 'yes' : 'no'}`,
    );
    console.log(`product ${plan.product}`);
    for (const row of run.rows) console.log(row);
    if (run.toasts.length > 0) {
      console.log('toasts:');
      for (const t of run.toasts) console.log(`  ${toastRow(t)}`);
    }
    console.log(
      `end: ${run.state.ended ?? 'level shipped'} · valuation ${Math.round(run.state.valuation)} ${m.DEFAULT_PATTERNS.cabinet.words.valuationUnit} · pieces ${run.state.built.length}`,
    );
    for (const leak of run.leaks) console.error(`leak: ${leak}`);
    printed += run.rows.length;
    leaked += run.leaks.length;
    if (levels.length > 1) console.log('');
  }
  if (printed === 0) {
    console.error('nothing was said: the run wrote no chat lines');
    return 1;
  }
  if (leaked > 0) {
    console.error(`${leaked} line(s) carried a word the screen may not`);
    return 1;
  }
  if (selfCheck) console.log(`self-check: ${printed} lines, no leak`);
  return 0;
}

/**
 * An endless run, printed call by call. The cabinet builds the rows (the
 * header words, the flavor, the climb step in words, the tell, every caption
 * and aside, the score lines); this runner loads the roster and prints them,
 * then reads back what it printed the way every other runner here does.
 */
async function ghostEndless(flags, g, loadTape, overlay) {
  const botName = flags.bot ?? 'reader';
  if (!GHOST_BOTS.includes(botName)) die(`unknown bot ${botName}; use ${GHOST_BOTS.join(', ')}`);
  const tier = requireInt(flags.tier, 'tier', 0, 3) ?? g.DEFAULT_DIFFICULTY;
  // The cabinet refuses the gentlest rung by name; say so as usage rather
  // than letting the refusal arrive as a stack.
  if (tier === 0) die(g.ENDLESS_NO_TIER_ZERO);
  const calls = requireInt(flags.calls, 'calls', 1, g.CALLS_MAX) ?? 12;
  const seed = requireInt(flags.seed, 'seed', 0, Number.MAX_SAFE_INTEGER) ?? 1;
  const roster = [];
  for (const name of tapeRoster(overlay)) {
    const file = resolveTapeFile(name, overlay);
    if (!file) continue;
    const json = readJsonFile(file, `fixture ${name}`);
    try {
      roster.push({ name, tape: loadTape(json) });
    } catch (err) {
      throw cliError(`fixture ${name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (roster.length === 0) {
    console.error('nothing to read: no tapes under fixtures/tapes');
    return 1;
  }
  const run = g.runEndless(roster, {
    seed,
    tier,
    calls,
    bot: (round) => g.botFor(botName, round),
  });
  console.log(
    `endless · tier ${tier} · bot ${botName} · seed ${seed} · calls ${run.calls.length} · ended ${run.ended}`,
  );
  const rows = g.endlessWords(run);
  for (const row of rows) console.log(row);
  for (const line of g.endlessScoreLines(run)) console.log(line);
  if (rows.length === 0) {
    console.error('nothing was said: the run printed no call');
    return 1;
  }
  const leaks = leaksIn(rows);
  for (const leak of leaks) console.error(`leak: ${leak}`);
  return leaks.length > 0 ? 1 : 0;
}

async function ghost(flags) {
  const overlay = overlayDir(flags);
  const fixture = flags.fixture ?? 'naive-ndjson';
  const endless = requireYesNo(flags.endless, 'endless');
  const tapeFile = resolveTapeFile(fixture, overlay);
  if (!tapeFile && !endless) {
    console.error(`unknown fixture ${fixture}; have: ${tapeRoster(overlay).join(', ')}`);
    return 2;
  }
  const botName = flags.bot ?? 'reader';
  if (!GHOST_BOTS.includes(botName)) die(`unknown bot ${botName}; use ${GHOST_BOTS.join(', ')}`);
  const tier = requireInt(flags.tier, 'tier', 0, 3);
  const climb = requireInt(flags.climb, 'climb', 0, 1) ?? 0;
  const out = path.resolve(OUT_DIR);
  const g = await bundleModule({
    contents: [
      "export * from './packages/ghost-on-the-menu/src/index.ts';",
      "export { botFor } from './packages/ghost-on-the-menu/src/play.ts';",
    ].join('\n'),
    outDir: out,
    outFile: '.transcript.ghost.mjs',
    what: 'the cabinet',
  });
  const { loadTape } = await bundleModule({
    entry: path.resolve('packages/tape-core/src/index.ts'),
    outDir: out,
    outFile: '.transcript.tape.mjs',
    what: 'tape-core',
  });
  if (requireYesNo(flags.endless, 'endless')) {
    return ghostEndless(flags, g, loadTape, overlay);
  }
  const json = readJsonFile(tapeFile, `fixture ${fixture}`);
  let tape;
  try {
    tape = loadTape(json);
  } catch (err) {
    throw cliError(`fixture ${fixture}: ${err instanceof Error ? err.message : String(err)}`);
  }
  // The same round `pnpm test:play ghost` plays: no `seconds` override, so
  // what is read here is what the acceptance play-through sees.
  const round = g.prepassRound(tape, { climb, ...(tier === undefined ? {} : { tier }) });
  const state = g.createRoundState(round);
  const maxTicks = Math.min(
    GHOST_MAX_TICKS,
    Math.ceil((Number.isFinite(state.duration) ? state.duration : 0) / GHOST_DT) + 360,
  );
  const input = g.botFor(botName, round);
  console.log(
    `tape ${tape.bout_id} · fixture ${fixture} · policy ${tape.agent_policy} · server ${tape.server_name ?? tape.target_kind} · bot ${botName} · tier ${round.tier} · climb ${round.climb}`,
  );
  const rows = [];
  const said = [];
  let lastCaption = '';
  let lastBoss = '';
  let ticks = 0;
  let overrun = false;
  while (!state.scene) {
    if (ticks >= maxTicks) {
      overrun = true;
      break;
    }
    ticks += 1;
    g.stepRound(state, input(state), GHOST_DT);
    const boss = state.boss && state.boss.alive ? state.boss.kind : '';
    if (boss !== lastBoss) {
      if (boss !== '') rows.push(`${clock(state.t)}  boss        ${boss} takes the field`);
      lastBoss = boss;
    }
    const cap = state.caption;
    // A caption's `t` is its own countdown, so it changes every frame: the card
    // is identified by what it says, not by how long it has left. A card that
    // clears and comes back with the same words is a new card and prints again.
    const key = cap ? `${cap.kind ?? 'wave'}|${cap.text}|${cap.line ?? ''}` : '';
    if (key !== lastCaption) {
      if (cap) {
        said.push(cap.text);
        if (cap.line) said.push(cap.line);
        rows.push(
          `${clock(state.t)}  ${String(cap.kind ?? 'wave').padEnd(10)}  ${cap.text}${cap.line ? ` — ${cap.line}` : ''}`,
        );
      }
      lastCaption = key;
    }
  }
  if (state.scene && state.scene.line) {
    said.push(state.scene.line);
    rows.push(`${clock(state.t)}  scene       ${state.scene.line}`);
  }
  for (const row of rows) console.log(row);
  console.log(
    `end: ${overrun ? 'time (overrun)' : (state.ended ?? 'clear')} · lamps ${state.lives} of ${state.maxLives}`,
  );
  if (rows.length === 0) {
    console.error('nothing was said: the round printed no caption, aside, boss or scene line');
    return 1;
  }
  const leaks = leaksIn(said);
  for (const leak of leaks) console.error(`leak: ${leak}`);
  return leaks.length > 0 ? 1 : 0;
}

async function main() {
  const { positional, flags } = parseArgv(process.argv.slice(2), FLAGS, {
    usage: USAGE,
    booleans: BOOLEANS,
  });
  if (flags.help) {
    console.log(USAGE);
    process.exit(0);
  }
  const selfCheck = flags['self-check'] === true;
  const cabinet = positional[0] ?? (selfCheck ? 'vibe-typer' : undefined);
  if (!cabinet) die(USAGE);
  if (positional.length > 1) die(`unknown argument ${positional[1]}\n${USAGE}`);
  if (!CABINETS.includes(cabinet)) {
    die(`unknown cabinet ${cabinet}; use ${CABINETS.join(' or ')}\n${USAGE}`);
  }
  if (cabinet === 'ghost') {
    if (flags['all-levels'] || flags.level !== undefined) {
      die(`ghost takes no --all-levels or --level\n${USAGE}`);
    }
    if (flags.seed !== undefined && flags.endless === undefined) {
      die(`ghost takes --seed only with --endless yes\n${USAGE}`);
    }
    if (flags.calls !== undefined && flags.endless === undefined) {
      die(`ghost takes --calls only with --endless yes\n${USAGE}`);
    }
    if (selfCheck) die(`--self-check runs the typing cabinet; drop the cabinet name\n${USAGE}`);
    process.exit(await ghost(flags));
  }
  if (flags.fixture !== undefined || flags.climb !== undefined || flags.calls !== undefined) {
    die(`vibe-typer takes no --fixture, --climb or --calls\n${USAGE}`);
  }
  // The self-check is one short level at the gentlest tier with the fast
  // typist: it asserts the runner still prints something and that what it
  // printed is clean. It is the acceptance test for this runner.
  process.exit(
    await vibe(selfCheck ? { ...flags, tier: '0', level: '0', seed: '1' } : flags, selfCheck),
  );
}

if (isMain(import.meta.url)) {
  await runMain(main);
}
