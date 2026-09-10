// Scripted play-through for `pnpm test:play ghost` (build plan step 3) and
// the fairness band (wave 2 §3). Three bots play every fixture: idle never
// moves or fires, the sweeper is today's bot, the reader fires only at the
// sequence tells. None of them reads `lie`; the reader reads order, class and
// member count from the Round, which is what a player can see.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { loadTape, type Tape } from '@mcp-arcade-cabinets/tape-core';

import { DEFAULT_SECONDS, type Round, type RoundInput, type RoundState } from './types';
import { prepassRound } from './prepass';
import { botInput, createRoundState, stepRound } from './sim';
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
}

const FORBIDDEN = /\b(nrp|integrity|utility|attack_success|pass|fail)\b|1\.00/i;

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
  if (!target) return IDLE;
  const dx = target.x + target.w / 2 - px;
  return { left: dx < -3, right: dx > 3, fire: Math.abs(dx) < target.w / 2 + 2 };
}

export function botFor(name: BotName, round: Round): (state: RoundState) => RoundInput {
  if (name === 'idle') return () => IDLE;
  if (name === 'reader') {
    const tells = tellIds(round);
    return (state) => readerInput(state, tells);
  }
  return botInput;
}

function botName(raw: string | undefined): BotName {
  if (raw === 'idle' || raw === 'reader' || raw === 'sweeper') return raw;
  if (raw === undefined) return 'sweeper';
  throw new Error(`unknown bot ${raw}; use idle, sweeper or reader`);
}

export async function play(args: PlayArgs = {}): Promise<Transcript> {
  const fixture = args.fixture ?? 'naive-ndjson';
  const file = path.resolve('fixtures/tapes', `${fixture}.tape.json`);
  const tape = loadTape(JSON.parse(readFileSync(file, 'utf8')));
  return playTape(tape, { fixture, bot: botName(args.bot) });
}

/** Play one loaded tape with one bot to the end. The band test calls this directly. */
export function playTape(tape: Tape, opts: { fixture: string; bot: BotName }): Transcript {
  const { fixture, bot } = opts;
  const round = prepassRound(tape, { seconds: DEFAULT_SECONDS });
  const state = createRoundState(round);
  const lies = round.beats.filter((b) => b.lie).map((b) => b.id);
  const input = botFor(bot, round);
  const furniture = [
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
    if (ctx.texts.some((t) => FORBIDDEN.test(t))) leaked = true;
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
  // The sweeper's bar is unchanged: every lie revealed. Idle and the reader
  // are judged by the band test, not here; for them `ok` is only "no leak".
  const ok = state.scene !== null && !leaked && (bot === 'sweeper' ? allRevealed : true);
  return { ok, text, revealed, lies, ended: state.ended, lives: state.lives };
}
