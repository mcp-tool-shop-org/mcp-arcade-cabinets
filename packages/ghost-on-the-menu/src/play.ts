// Scripted play-through for `pnpm test:play ghost` (build plan step 3) and
// the fairness band (wave 2 §3). Three bots play every fixture: idle never
// moves or fires; the sweeper chases the nearest hittable sprite and always
// fires; the reader fires only at the sequence tells. None of them reads
// `lie` (the wave-1 sweeper did, and the cross-family review caught it); the
// reader reads order, class and member count from the Round, which is what
// a player can see. The reader is the acceptance bot: winning is a scene.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadTape, TapeError, type Tape } from '@mcp-arcade-cabinets/tape-core';

import { FIELD, type Round, type RoundInput, type RoundState } from './types';
import {
  endlessScoreLines,
  endlessWords,
  runEndless,
  type EndlessRun,
  type EndlessTape,
} from './endless';
import { rungWord } from './patterns';
import { prepassRound } from './prepass';
import { createRoundState, isHittable, stepRound, watchSaid } from './sim';
import { makeTextCtx, renderRound } from './render';

export type BotName = 'idle' | 'sweeper' | 'reader';

/**
 * A seat driven in-process each frame (the cabinet server's scripted
 * model, for `--seat mcp`). It sees the Round and the RoundState the way
 * the shell does; what it may read is bounded by the cabinet's own host.
 */
export interface PlaySeat {
  /**
   * Called in-process each frame. Must return: a hang has no words
   * (the tick cap never runs). A throw is caught and named in the header.
   */
  frame(live: { round: Round; state: RoundState; input: RoundInput }): void;
  /** Lines for the transcript footer. Words and counts; never on screen. */
  summary(): string[];
}

export interface PlayArgs {
  fixture?: string;
  bot?: BotName | string;
  /** Play an endless run over the whole roster instead of one fixture. */
  endless?: boolean;
  /** How many calls the endless runner offers; the lamps usually end it first. Default forty. */
  calls?: number;
  /** The endless draw's seed. Absent takes the clock, as the shell will. */
  seed?: number;
  seat?: PlaySeat;
  tier?: 0 | 1 | 2 | 3;
  /** Lamps kept up so every boss on the tape is met (a seat run, as `pnpm sit`). */
  immortal?: boolean;
  /** The shift's climb, 0..1; the band measures the last call at 1. */
  climb?: number;
  /** Index into shift.json flavors. Absent is picker-alone: no extras. */
  flavorIndex?: number;
}

/**
 * The first condition that made `ok` false, in machine-readable form. `ok`
 * is the AND of five distinct conditions and the reason existed only as
 * English prose inside `text`, so a consumer that got `ok: false` had to
 * re-derive why by string-matching the transcript — which is exactly what
 * the root runner's `whyFailed` does. `ended` is the SIM's reason, not the
 * run's, so it could not tell an overrun from a clean timeout.
 */
export type TranscriptWhy =
  'complete' | 'time' | 'overrun' | 'lamps' | 'seat-threw' | 'leaked' | 'bar' | 'load';

/** What the in-process seat did, counted rather than described. */
export interface SeatReport {
  /** Frames the seat was called on. */
  calls: number;
  /** Frames on which it threw. One throw stops the seat for the round. */
  throws: number;
  /** Frame index of the first throw, or null. */
  brokeAt: number | null;
}

export interface Transcript {
  ok: boolean;
  text: string;
  /**
   * The first reason `ok` is false, and otherwise how the round or the run
   * ended. The prose header stays; it is no longer the only copy.
   */
  why: TranscriptWhy;
  /** Present when a seat was driven. */
  seat?: SeatReport;
  /** Lie ids the bot revealed, in hit order. Never on screen; the CLI prints it. */
  revealed: string[];
  /** Every lie id on the round, so a band test can compare without the fact. */
  lies: string[];
  /** How the round or the run ended: the clock, the last lamp, or an endless run's call cap. */
  ended: 'time' | 'lamps' | 'calls' | null;
  lives: number;
  /** True if any forbidden word or digit reached the screen or the transcript. */
  leaked: boolean;
}

/** The transcript may name a bout id; the screen may not carry a digit at all. */
const FORBIDDEN = /\b(nrp|integrity|utility|attack_success|pass|fail)\b|1\.00/i;
const SCREEN_FORBIDDEN =
  /\d|\b(nrp|integrity|utility|attack_success|pass|fail|score|cleared|lie|fact|revealed|followed|held|ghost_answered|ghost_refused|menu_changed|menu_stable)\b/i;
/** The same needles, global, for stripping rather than testing. */
const SCREEN_FORBIDDEN_G = new RegExp(SCREEN_FORBIDDEN.source, 'gi');

const DT = 1 / 30;

/**
 * The sequence tells, from the Round alone (§3 "The tells are in the sequence"):
 * a second grid formation in an atom, a second menu tablet in an atom, and a
 * singleton grid right after its menu. Honest sprites match too; that is the
 * point: the tell is structural, never a label.
 */
export function tellIds(round: Round): Set<string> {
  const tells = new Set<string>();
  const grids = new Map<string, number>();
  const menus = new Map<string, number>();
  let prev: Round['beats'][number] | undefined;
  for (const b of round.beats) {
    const atom = b.source.atom;
    if (b.sprite === 'grid') {
      const seen = grids.get(atom) ?? 0;
      if (seen >= 1) tells.add(b.id);
      if (b.members === 1 && prev && prev.source.atom === atom && prev.sprite === 'menu') {
        tells.add(b.id);
      }
      grids.set(atom, seen + 1);
    } else if (b.sprite === 'menu') {
      const seen = menus.get(atom) ?? 0;
      if (seen >= 1) tells.add(b.id);
      menus.set(atom, seen + 1);
    }
    prev = b;
  }
  return tells;
}

const IDLE: RoundInput = { left: false, right: false, fire: false };

/** Half-width of the lane in front of the ship that counts as a threat, in px. */
const DODGE_LANE = 26;
/** How far above the ship a threat must be to matter, in px. */
const DODGE_REACH = 160;

/**
 * The x where a threat will cross the ship's row, or null if it will not.
 * Reads only positions and velocities: what a player sees.
 */
function crossingX(
  t: { x: number; y: number; w: number; vy: number; vx?: number },
  playerY: number,
): number | null {
  if (t.vy <= 0 || t.y > playerY) return null;
  if (playerY - t.y > DODGE_REACH) return null;
  const dt = (playerY - t.y) / t.vy;
  return t.x + t.w / 2 + (t.vx ?? 0) * dt;
}

/** The x where each incoming shot, diver and hazard will cross the ship's row, within reach. */
function crossings(state: RoundState): number[] {
  const py = state.player.y;
  const lanes: number[] = [];
  for (const s of state.enemyShots) {
    if (s.dead) continue;
    const cx = crossingX(s, py);
    if (cx !== null) lanes.push(cx);
  }
  for (const e of state.enemies) {
    if (!e.alive || e.mode !== 'dive') continue;
    if (e.y < py && py - e.y < DODGE_REACH) lanes.push(e.x + e.w / 2);
  }
  for (const h of state.hazards) {
    if (!h.alive || h.vy <= 0) continue;
    const cx = crossingX(h, py);
    if (cx !== null) lanes.push(cx);
  }
  return lanes;
}

/**
 * Step out of the way; null if the ship stands clear. Under sparse fire the
 * step is away from the nearest threat, as it always was. Under rain (more
 * than one threat in reach) the step is to the nearest x clear of EVERY
 * threat, because stepping out of one lane into the next is how the reader
 * lost its lamps once the formation started to speak (Grok's consult: one
 * dodge for each climate, not one for both). The move carries no fire of
 * its own; the caller keeps the button down when it is aligned.
 */
function dodge(state: RoundState): RoundInput | null {
  const px = state.player.x + state.player.w / 2;
  const lanes = crossings(state);
  const near = lanes.filter((cx) => Math.abs(cx - px) < DODGE_LANE);
  if (near.length === 0) return null;
  if (lanes.length > 1) {
    const clear = (x: number) => lanes.every((cx) => Math.abs(cx - x) >= DODGE_LANE);
    const half = state.player.w / 2;
    for (let step = 8; step <= FIELD.width; step += 8) {
      const left = px - step;
      const right = px + step;
      const leftOk = left >= half && clear(left);
      const rightOk = right <= FIELD.width - half && clear(right);
      if (leftOk && rightOk) {
        const toward = px < FIELD.width / 2 ? 1 : -1;
        return { left: toward < 0, right: toward > 0, fire: false };
      }
      if (leftOk) return { left: true, right: false, fire: false };
      if (rightOk) return { left: false, right: true, fire: false };
    }
  }
  let threat = near[0]!;
  for (const cx of near) if (Math.abs(cx - px) < Math.abs(threat - px)) threat = cx;
  // Away from the threat; a threat dead ahead sends the ship toward the field's centre.
  const away = threat === px ? (px < FIELD.width / 2 ? 1 : -1) : px < threat ? -1 : 1;
  return { left: away < 0, right: away > 0, fire: false };
}

function readerInput(state: RoundState, tells: Set<string>): RoundInput {
  const px = state.player.x + state.player.w / 2;
  let target: RoundState['enemies'][number] | undefined;
  for (const e of state.enemies) {
    if (!e.alive || state.t < e.tEnter || e.mode === 'caught' || e.mode === 'dying') continue;
    if (!tells.has(e.id)) continue;
    if (!target || Math.abs(e.x + e.w / 2 - px) < Math.abs(target.x + target.w / 2 - px)) {
      target = e;
    }
  }
  const aligned = target !== undefined && Math.abs(target.x + target.w / 2 - px) < target.w / 2 + 2;
  const d = dodge(state);
  // A person does not drop the button to sidestep: the reader keeps firing
  // through a dodge while it is under its tell.
  if (d) return { ...d, fire: aligned };
  if (!target) return IDLE;
  const tx = target.x + target.w / 2;
  const dx = tx - px;
  // After a dodge, do not walk straight back onto a crossing: hold where it
  // is clear until the lane under the tell is clear too.
  if (Math.abs(dx) > 3 && crossings(state).some((cx) => Math.abs(cx - tx) < DODGE_LANE)) {
    return IDLE;
  }
  return { left: dx < -3, right: dx > 3, fire: aligned };
}

/** The dumb player: nearest hittable sprite, always firing. Never reads `lie`. */
function sweeperInput(state: RoundState): RoundInput {
  const px = state.player.x + state.player.w / 2;
  const py = state.player.y;
  // Catch a drop that is already crossing this lane; do not chase across the field.
  for (const d of state.drops) {
    if (!d.alive) continue;
    const cx = d.x + d.w / 2;
    if (Math.abs(cx - px) >= DODGE_LANE) continue;
    if (d.y > py + 8 || py - d.y > DODGE_REACH) continue;
    const dx = cx - px;
    return { left: dx < -3, right: dx > 3, fire: true };
  }
  let target: RoundState['enemies'][number] | undefined;
  const threat = state.enemies.filter(
    (e) =>
      isHittable(state, e) &&
      !e.id.startsWith('para:') &&
      (e.sprite === 'grid' || e.sprite === 'menu'),
  );
  const pool = threat.length > 0 ? threat : state.enemies.filter((e) => isHittable(state, e));
  for (const e of pool) {
    if (!target || Math.abs(e.x + e.w / 2 - px) < Math.abs(target.x + target.w / 2 - px)) {
      target = e;
    }
  }
  if (!target) return { left: false, right: false, fire: true };
  const dx = target.x + target.w / 2 - px;
  return { left: dx < -3, right: dx > 3, fire: true };
}

export function botFor(name: BotName, round: Round): (state: RoundState) => RoundInput {
  if (name === 'idle') return () => IDLE;
  if (name === 'reader') {
    const tells = tellIds(round);
    return (state) => readerInput(state, tells);
  }
  return sweeperInput;
}

function parseBot(raw: string | undefined): BotName | null {
  if (raw === 'idle' || raw === 'reader' || raw === 'sweeper') return raw;
  if (raw === undefined) return 'reader';
  return null;
}

function errCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err && typeof err.code === 'string') {
    return err.code;
  }
  return '';
}

/**
 * Load failure: names the fixture, never a home path or a raw ENOENT — and
 * runs its own text through the same strip and the same scan every other
 * transcript path runs. `leaked: false` used to be asserted here rather than
 * measured, and the refusal path is exactly where an unreviewed string
 * reaches a reader: a loader message that quoted the forbidden word it had
 * just refused arrived on a player-facing line, reported clean.
 */
function loadFail(fixture: string, reason: string): Transcript {
  const text = `fixture ${fixture}: ${reason}`
    .replace(SCREEN_FORBIDDEN_G, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const leaked = SCREEN_FORBIDDEN.test(text) || FORBIDDEN.test(text);
  return {
    ok: false,
    text,
    why: 'load',
    revealed: [],
    lies: [],
    ended: null,
    lives: 0,
    leaked,
  };
}

/**
 * The tapes that ship with the repo, resolved from THIS module rather than
 * from the process cwd. Both fixture paths used to be cwd-relative and then
 * reported the relative literal as though it were the repo's, so running
 * from the package directory made every fixture in the repo 'missing under
 * fixtures/tapes' and sent the reader to look for a file sitting exactly
 * where they thought it was. Same trap the typing cabinet's play.ts was
 * fixed for; this is the shooter's copy.
 */
const TAPES_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../fixtures/tapes',
);
/**
 * What a failure calls that directory. The resolved path is absolute and a
 * transcript never carries a home path, so the message names the directory
 * as the repo holds it and says whose it is — the old text read as though it
 * were relative to wherever the reader happened to be standing.
 */
const TAPES_LABEL = "the repo's fixtures/tapes";

/** Every tape on disk, by name. The endless roster; a load failure names the file. */
export function loadRoster(dir = TAPES_DIR): EndlessTape[] {
  const root = path.resolve(dir);
  const out: EndlessTape[] = [];
  for (const f of readdirSync(root).sort()) {
    if (!f.endsWith('.tape.json')) continue;
    const name = f.replace(/\.tape\.json$/, '');
    out.push({ name, tape: loadTape(JSON.parse(readFileSync(path.join(root, f), 'utf8'))) });
  }
  return out;
}

/**
 * The endless run as a transcript, in the shape `pnpm test:play` reads: three
 * header lines, then the screen (the run in words, no digit anywhere), then
 * the `revealed:` marker and the footer. The score's digits live in that
 * footer on purpose — the closing scene may carry the run's number (G35) but
 * a screen line may not carry a digit at all (G7), and the runner scans
 * exactly what sits between the header and the marker.
 */
export function endlessTranscript(run: EndlessRun, bot: BotName): Transcript {
  const words = endlessWords(run);
  const catches = run.calls.reduce((s, c) => s + c.catches, 0);
  const bosses = run.calls.reduce((s, c) => s + c.bosses, 0);
  const header = [
    'Ghost on the Menu',
    // The rung's own word, not a tier index: the difficulty is the one axis
    // this surface was otherwise word-only about, and the rank word the
    // footer prints means a different scale on every rung.
    `endless rung ${rungWord(run.difficulty)} bot ${bot} seed ${run.seed} calls ${run.calls.length}`,
    run.ended === 'lamps' ? 'run ended: lamps' : 'run ended: calls',
  ];
  const footer = [`revealed: ${catches} caught, ${bosses} put down`, ...endlessScoreLines(run)];
  const leaked = words.some((t) => SCREEN_FORBIDDEN.test(t));
  const text = [...header, ...words, ...footer].join('\n');
  const dirty = leaked || FORBIDDEN.test(text);
  return {
    ok: !dirty && run.calls.length > 0,
    text,
    why: dirty
      ? 'leaked'
      : run.calls.length === 0
        ? 'bar'
        : run.ended === 'lamps'
          ? 'lamps'
          : 'complete',
    revealed: [],
    lies: [],
    ended: run.ended === 'lamps' ? 'lamps' : 'calls',
    lives: run.lamps,
    leaked,
  };
}

export async function play(args: PlayArgs = {}): Promise<Transcript> {
  if (args.endless) {
    const bot = parseBot(args.bot);
    if (bot === null) {
      return loadFail('endless', `unknown bot ${args.bot}; use idle, sweeper or reader`);
    }
    let roster: EndlessTape[];
    try {
      roster = loadRoster();
    } catch {
      return loadFail('endless', `the roster under ${TAPES_LABEL} is unreadable`);
    }
    if (roster.length === 0) return loadFail('endless', `no tapes under ${TAPES_LABEL}`);
    let run;
    try {
      run = runEndless(roster, {
        seed: args.seed ?? Date.now(),
        bot: (round) => botFor(bot, round),
        ...(args.tier !== undefined ? { tier: args.tier } : {}),
        // A cap, not a bar: the lamps end a run long before it, and a run
        // that outlives the cap is one the caller asked to stop.
        calls: args.calls ?? 40,
      });
    } catch (err) {
      // The cabinet's refusals already name themselves `endless: …`, so the
      // fixture prefix would say the word twice.
      const why = err instanceof Error ? err.message : 'the run refused';
      return loadFail('endless', why.replace(/^endless: /, ''));
    }
    return endlessTranscript(run, bot);
  }
  const fixture = args.fixture ?? 'naive-ndjson';
  if (fixture.trim() === '' || /[\\/]/.test(fixture) || fixture.includes('\0')) {
    return loadFail(fixture, 'invalid name: no slashes');
  }
  const file = path.resolve(TAPES_DIR, `${fixture}.tape.json`);
  let raw: string;
  try {
    raw = readFileSync(file, 'utf8');
  } catch (err) {
    return loadFail(
      fixture,
      errCode(err) === 'ENOENT'
        ? `missing under ${TAPES_LABEL}`
        : `unreadable under ${TAPES_LABEL}`,
    );
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return loadFail(fixture, 'bad json');
  }
  let tape: Tape;
  try {
    tape = loadTape(json);
  } catch (err) {
    const reason = err instanceof TapeError ? err.message : 'bad tape';
    return loadFail(fixture, reason);
  }
  const bot = parseBot(args.bot);
  if (bot === null) {
    return loadFail(fixture, `unknown bot ${args.bot}; use idle, sweeper or reader`);
  }
  return playTape(tape, {
    fixture,
    bot,
    ...(args.tier !== undefined ? { tier: args.tier } : {}),
    ...(args.seat ? { seat: args.seat } : {}),
    ...(args.immortal ? { immortal: true } : {}),
    ...(args.climb !== undefined ? { climb: args.climb } : {}),
    ...(args.flavorIndex !== undefined ? { flavorIndex: args.flavorIndex } : {}),
  });
}

/** Play one loaded tape with one bot to the end. The band test calls this directly. */
export function playTape(
  tape: Tape,
  opts: {
    fixture: string;
    bot: BotName;
    tier?: 0 | 1 | 2 | 3;
    seat?: PlaySeat;
    immortal?: boolean;
    climb?: number;
    flavorIndex?: number;
  },
): Transcript {
  const { fixture, bot, seat } = opts;
  const round = prepassRound(tape, {
    tier: opts.tier,
    climb: opts.climb ?? 0,
    ...(opts.flavorIndex !== undefined ? { flavorIndex: opts.flavorIndex } : {}),
  });
  const state = createRoundState(round);
  const lies = round.beats.filter((b) => b.lie).map((b) => b.id);
  const input = botFor(bot, round);
  // The end scene's furniture: the tape by name, the server, the policy (G10).
  const furniture = [
    fixture,
    `server ${tape.server_name ?? tape.target_kind}`,
    `policy ${tape.agent_policy}`,
  ];

  // renderRound now strips the furniture itself, so the canvas can no longer
  // carry a needle. The transcript still names a caller that handed the
  // play-through dirty furniture: that is a defect in the caller, not in the
  // renderer, and the scripted run is where it gets reported.
  let leaked = furniture.some((t) => SCREEN_FORBIDDEN.test(t));
  let lastTexts: string[] = [];
  // What the round SAID, in order, as the endless runner has always captured
  // it. The frame loop kept only the last frame's rendered text, so every
  // wave card, catch word, aside and boss line was rendered, scanned for
  // leaks and then thrown away — and what the agent says is the whole
  // content of the humanization work. One capture now, shared with playCall.
  const watcher = watchSaid();
  const live = { round, state, input: { left: false, right: false, fire: false } };
  const maxTicks = Math.ceil((Number.isFinite(state.duration) ? state.duration : 0) / DT) + 360;
  let ticks = 0;
  let overrun = false;
  let seatBroke = false;
  let seatCalls = 0;
  let seatThrows = 0;
  let seatBrokeAt: number | null = null;
  const seatNotes: string[] = [];
  while (!state.scene) {
    if (ticks >= maxTicks) {
      overrun = true;
      state.ended = 'time';
      state.scene = { tapeId: state.tapeId, cleared: [...state.cleared] };
      break;
    }
    ticks += 1;
    const next = input(state);
    live.input.left = next.left;
    live.input.right = next.right;
    live.input.fire = next.fire;
    if (opts.immortal) state.lives = state.maxLives;
    stepRound(state, live.input, DT);
    const sceneAfterStep = state.scene;
    const endedAfterStep = state.ended;
    if (seat && !seatBroke) {
      seatCalls += 1;
      try {
        // frame is sync; a hang never returns, so this transcript stays silent.
        seat.frame(live);
      } catch {
        seatBroke = true;
        seatThrows += 1;
        seatBrokeAt = ticks;
        seatNotes.push('seat threw');
      }
    }
    if (sceneAfterStep && !state.scene) {
      state.scene = sceneAfterStep;
      if (endedAfterStep && !state.ended) state.ended = endedAfterStep;
    }
    watcher.see(state);
    const ctx = makeTextCtx();
    renderRound(ctx, state, { furniture });
    lastTexts = ctx.texts;
    if (ctx.texts.some((t) => SCREEN_FORBIDDEN.test(t))) leaked = true;
  }
  watcher.see(state);
  const said = watcher.rows().map((r) => `  ${r.kind} · ${r.text}`);
  // The said rows sit between the header and the `revealed:` marker, where
  // the runner's screen scan already looks, exactly as endlessTranscript
  // places the run's words.
  if (said.some((t) => SCREEN_FORBIDDEN.test(t))) leaked = true;

  const revealed = [...(state.scene?.cleared ?? state.cleared)];
  // Name the end. A throw, overrun, or lamps-out is not 'round complete'.
  // A hung sync frame has no words: this line is never reached.
  const endName = seatBroke
    ? 'seat threw; scripted beat kept'
    : overrun
      ? 'round ended: time'
      : state.ended === 'lamps'
        ? 'round ended: lamps'
        : 'round complete';
  const header = [
    'Ghost on the Menu',
    `tape ${tape.bout_id} fixture ${fixture} policy ${tape.agent_policy} server ${tape.server_name ?? tape.target_kind} bot ${bot}`,
    endName,
  ];
  let summary: string[] = [];
  if (seat) {
    try {
      summary = seat.summary();
    } catch {
      if (!seatBroke) seatNotes.push('seat threw');
    }
  }
  // The CLI transcript names the revealed lies as a list; the screen never does.
  const footer = [`revealed: ${revealed.join(', ') || 'none'}`, ...summary, ...seatNotes];
  const text = [...header, ...said, ...lastTexts, ...footer].join('\n');
  if (FORBIDDEN.test(text)) leaked = true;

  const cleared = new Set(revealed);
  const allRevealed = lies.every((id) => cleared.has(id));
  const halfRevealed = revealed.length >= Math.ceil(lies.length / 2);
  // The reader must reveal every lie (the acceptance bar); the sweeper at
  // least half; idle is judged by the band alone. Every bot must not leak.
  const bar = bot === 'reader' ? allRevealed : bot === 'sweeper' ? halfRevealed : true;
  const ok = state.scene !== null && !leaked && bar && !overrun && !seatBroke;
  // The FIRST reason ok is false, in the order the conditions are checked.
  const why: TranscriptWhy = seatBroke
    ? 'seat-threw'
    : overrun
      ? 'overrun'
      : leaked
        ? 'leaked'
        : !bar
          ? 'bar'
          : state.ended === 'lamps'
            ? 'lamps'
            : state.ended === 'time'
              ? 'time'
              : 'complete';
  return {
    ok,
    text,
    why,
    ...(seat ? { seat: { calls: seatCalls, throws: seatThrows, brokeAt: seatBrokeAt } } : {}),
    revealed,
    lies,
    ended: state.ended,
    lives: state.lives,
    leaked,
  };
}
