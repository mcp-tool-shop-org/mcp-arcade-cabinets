// Scripted play-through for `pnpm test:play ghost` (build plan step 3) and
// the fairness band (wave 2 §3). Three bots play every fixture: idle never
// moves or fires; the sweeper chases the nearest hittable sprite and always
// fires; the reader fires only at the sequence tells. None of them reads
// `lie` (the wave-1 sweeper did, and the cross-family review caught it); the
// reader reads order, class and member count from the Round, which is what
// a player can see. The reader is the acceptance bot: winning is a scene.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { loadTape, type Tape } from '@mcp-arcade-cabinets/tape-core';

import { DEFAULT_SECONDS, FIELD, type Round, type RoundInput, type RoundState } from './types';
import { prepassRound } from './prepass';
import { createRoundState, isHittable, stepRound } from './sim';
import { makeTextCtx, renderRound } from './render';

export type BotName = 'idle' | 'sweeper' | 'reader';

export interface PlayArgs {
  fixture?: string;
  bot?: BotName | string;
}

export interface Transcript {
  ok: boolean;
  text: string;
  /** Lie ids the bot revealed, in hit order. Never on screen; the CLI prints it. */
  revealed: string[];
  /** Every lie id on the round, so a band test can compare without the fact. */
  lies: string[];
  ended: 'time' | 'lamps' | null;
  lives: number;
  /** True if any forbidden word or digit reached the screen or the transcript. */
  leaked: boolean;
}

/** The transcript may name a bout id; the screen may not carry a digit at all. */
const FORBIDDEN = /\b(nrp|integrity|utility|attack_success|pass|fail)\b|1\.00/i;
const SCREEN_FORBIDDEN =
  /\d|\b(nrp|integrity|utility|attack_success|pass|fail|score|cleared|lie|fact|revealed|followed|held|ghost_answered|ghost_refused|menu_changed|menu_stable)\b/i;

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

/** Step out of the lane of the nearest incoming shot or diver; null if clear. */
function dodge(state: RoundState): RoundInput | null {
  const px = state.player.x + state.player.w / 2;
  const py = state.player.y;
  let threat: number | null = null;
  for (const s of state.enemyShots) {
    if (s.dead) continue;
    const cx = crossingX(s, py);
    if (cx !== null && Math.abs(cx - px) < DODGE_LANE) {
      if (threat === null || Math.abs(cx - px) < Math.abs(threat - px)) threat = cx;
    }
  }
  for (const e of state.enemies) {
    if (!e.alive || e.mode !== 'dive') continue;
    const cx = e.x + e.w / 2;
    if (e.y < py && py - e.y < DODGE_REACH && Math.abs(cx - px) < DODGE_LANE) {
      if (threat === null || Math.abs(cx - px) < Math.abs(threat - px)) threat = cx;
    }
  }
  for (const h of state.hazards) {
    if (!h.alive || h.vy <= 0) continue;
    const cx = crossingX(h, py);
    if (cx !== null && Math.abs(cx - px) < DODGE_LANE) {
      if (threat === null || Math.abs(cx - px) < Math.abs(threat - px)) threat = cx;
    }
  }
  if (threat === null) return null;
  // Away from the threat; a threat dead ahead sends the ship toward the field's centre.
  const away = threat === px ? (px < FIELD.width / 2 ? 1 : -1) : px < threat ? -1 : 1;
  return { left: away < 0, right: away > 0, fire: false };
}

function readerInput(state: RoundState, tells: Set<string>): RoundInput {
  const d = dodge(state);
  if (d) return d;
  const px = state.player.x + state.player.w / 2;
  let target: RoundState['enemies'][number] | undefined;
  for (const e of state.enemies) {
    if (!e.alive || state.t < e.tEnter || e.mode === 'caught' || e.mode === 'dying') continue;
    if (!tells.has(e.id)) continue;
    if (!target || Math.abs(e.x + e.w / 2 - px) < Math.abs(target.x + target.w / 2 - px)) {
      target = e;
    }
  }
  if (!target) return IDLE;
  const dx = target.x + target.w / 2 - px;
  return { left: dx < -3, right: dx > 3, fire: Math.abs(dx) < target.w / 2 + 2 };
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

function botName(raw: string | undefined): BotName {
  if (raw === 'idle' || raw === 'reader' || raw === 'sweeper') return raw;
  if (raw === undefined) return 'reader';
  throw new Error(`unknown bot ${raw}; use idle, sweeper or reader`);
}

export async function play(args: PlayArgs = {}): Promise<Transcript> {
  const fixture = args.fixture ?? 'naive-ndjson';
  const file = path.resolve('fixtures/tapes', `${fixture}.tape.json`);
  const tape = loadTape(JSON.parse(readFileSync(file, 'utf8')));
  return playTape(tape, { fixture, bot: botName(args.bot) });
}

/** Play one loaded tape with one bot to the end. The band test calls this directly. */
export function playTape(
  tape: Tape,
  opts: { fixture: string; bot: BotName; tier?: 0 | 1 | 2 | 3 },
): Transcript {
  const { fixture, bot } = opts;
  const round = prepassRound(tape, { seconds: DEFAULT_SECONDS, tier: opts.tier });
  const state = createRoundState(round);
  const lies = round.beats.filter((b) => b.lie).map((b) => b.id);
  const input = botFor(bot, round);
  // The end scene's furniture: the tape by name, the server, the policy (G10).
  const furniture = [
    fixture,
    `server ${tape.server_name ?? tape.target_kind}`,
    `policy ${tape.agent_policy}`,
  ];

  let leaked = false;
  let lastTexts: string[] = [];
  while (!state.scene) {
    stepRound(state, input(state), DT);
    const ctx = makeTextCtx();
    renderRound(ctx, state, { furniture });
    lastTexts = ctx.texts;
    if (ctx.texts.some((t) => SCREEN_FORBIDDEN.test(t))) leaked = true;
  }

  const revealed = [...state.scene.cleared];
  const header = [
    'Ghost on the Menu',
    `tape ${tape.bout_id} fixture ${fixture} policy ${tape.agent_policy} server ${tape.server_name ?? tape.target_kind} bot ${bot}`,
    'round complete',
  ];
  // The CLI transcript names the revealed lies as a list; the screen never does.
  const footer = [`revealed: ${revealed.join(', ') || 'none'}`];
  const text = [...header, ...lastTexts, ...footer].join('\n');
  if (FORBIDDEN.test(text)) leaked = true;

  const cleared = new Set(revealed);
  const allRevealed = lies.every((id) => cleared.has(id));
  const halfRevealed = revealed.length >= Math.ceil(lies.length / 2);
  // The reader must reveal every lie (the acceptance bar); the sweeper at
  // least half; idle is judged by the band alone. Every bot must not leak.
  const bar = bot === 'reader' ? allRevealed : bot === 'sweeper' ? halfRevealed : true;
  const ok = state.scene !== null && !leaked && bar;
  return { ok, text, revealed, lies, ended: state.ended, lives: state.lives, leaked };
}
