// Scripted play-through for `pnpm test:play ghost` (build plan step 3).
// A bot sweeps and shoots for the round's duration. Winning is a scene.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { loadTape } from '@mcp-arcade-cabinets/tape-core';

import { DEFAULT_SECONDS } from './types';
import { prepassRound } from './prepass';
import { botInput, createRoundState, stepRound } from './sim';
import { makeTextCtx, renderRound } from './render';

export interface PlayArgs {
  fixture?: string;
}

export interface Transcript {
  ok: boolean;
  text: string;
}

const FORBIDDEN = /\b(nrp|integrity|utility|attack_success|pass|fail)\b|1\.00/i;

const DT = 1 / 30;

export async function play(args: PlayArgs = {}): Promise<Transcript> {
  const fixture = args.fixture ?? 'naive-ndjson';
  const file = path.resolve('fixtures/tapes', `${fixture}.tape.json`);
  const tape = loadTape(JSON.parse(readFileSync(file, 'utf8')));
  const round = prepassRound(tape, { seconds: DEFAULT_SECONDS });
  const state = createRoundState(round);
  const lieIds = round.beats.filter((b) => b.lie).map((b) => b.id);

  let leaked = false;
  let lastTexts: string[] = [];
  while (!state.scene) {
    stepRound(state, botInput(state), DT);
    const ctx = makeTextCtx();
    renderRound(ctx, state);
    lastTexts = ctx.texts;
    if (ctx.texts.some((t) => FORBIDDEN.test(t))) leaked = true;
  }

  const header = [
    'Ghost on the Menu',
    `tape ${tape.bout_id} fixture ${fixture} policy ${tape.agent_policy} server ${tape.server_name ?? tape.target_kind}`,
    'round complete',
  ];
  const text = [...header, ...lastTexts].join('\n');
  if (FORBIDDEN.test(text)) leaked = true;

  const cleared = new Set(state.scene.cleared);
  const allRevealed = lieIds.every((id) => cleared.has(id));
  const ok = state.scene !== null && allRevealed && !leaked;
  return { ok, text };
}
