// Scripted play-through for `pnpm test:play house-call` (the acceptance test
// for a playable slice; lock: build plan step 4). Not a screenshot: a bot
// walks a whole run against a fixture tape and the transcript is checked for
// what must and must not appear before the end screen.
//
// Args: --fixture <name> (default task-only-ndjson), --call <outcome> (the
// outcome to call on the poison turn; other turns take the first option),
// --confidence <0.5..1> (default 0.8).

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { loadTape } from '@mcp-arcade-cabinets/tape-core';

import { askForCall, introduce, reveal } from './narrative';
import { commit, isOver, readout, startRun } from './run';
import type { Call, Outcome } from './types';

export interface PlayArgs {
  fixture?: string;
  call?: string;
  confidence?: string | number;
}

export interface Transcript {
  ok: boolean;
  text: string;
  failures: string[];
}

/** Words that may never appear before the end screen. Whole words; case-insensitive. */
const FORBIDDEN_MID_RUN =
  /\b(nrp|integrity|utility|attack_success|pass|fail|score|brier|right|wrong|correct|read it)\b|\d+\.\d+/i;

export async function play(args: PlayArgs = {}): Promise<Transcript> {
  const fixture = args.fixture ?? 'task-only-ndjson';
  const confidence = Number(args.confidence ?? 0.8);
  const file = path.resolve('fixtures/tapes', `${fixture}.tape.json`);
  const tape = loadTape(JSON.parse(readFileSync(file, 'utf8')));

  const lines: string[] = [];
  const failures: string[] = [];
  let run = startRun(tape);
  lines.push(`House Call — ${fixture}`);
  while (!isOver(run)) {
    const turn = run.current!;
    lines.push('');
    lines.push(introduce(turn.party, turn.server, turn.taskTool, turn.atomId));
    lines.push(`Disclosed: ${turn.disclosure.map((r) => r.method).join(', ') || '(nothing yet)'}`);
    lines.push(askForCall(turn.outcomes));
    const wanted = turn.atomId === 'poison.follow_through' && args.call ? args.call : null;
    const outcome = (
      wanted && turn.outcomes.includes(wanted as Outcome) ? wanted : turn.outcomes[0]
    ) as Outcome;
    const call: Call = { outcome, confidence };
    lines.push(`> call ${outcome}, confidence stated`);
    run = commit(run, call);
    const result = run.results[run.results.length - 1]!;
    lines.push(`Reveal: ${result.reveal.map((r) => r.note || r.method).join(' | ')}`);
    lines.push(reveal(result));
  }

  // Everything above is mid-run: no number, no verdict word may appear (G4).
  const midRun = lines.join('\n');
  const leak = midRun.match(FORBIDDEN_MID_RUN);
  if (leak) failures.push(`mid-run text carries a score word or a figure: ${leak[0]!}`);
  if (run.results.length === 0) failures.push('no turns were played');
  if (!run.results.every((r) => r.truth)) failures.push('a turn resolved without a tape fact');

  const out = readout(run);
  lines.push('');
  lines.push('— end of run (numbers on demand) —');
  lines.push(
    `tape ${out.tapeId} · server ${out.server} · policy ${out.policy} · turns ${out.turns}`,
  );
  lines.push(`mean Brier ${out.meanBrier}`);
  for (const b of out.reliability) {
    if (b.n)
      lines.push(
        `  confidence ${b.from}-${b.to}: predicted ${b.predicted}, observed ${b.observed} (n=${b.n})`,
      );
  }
  lines.push(`coverage: ${out.coverageCells.length} cell(s)`);
  for (const c of out.coverageCells) lines.push(`  ${c}`);

  return { ok: failures.length === 0, text: lines.join('\n'), failures };
}
