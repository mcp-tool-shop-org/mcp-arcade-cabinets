import { factFor, type Tape, type TapeRow } from '@mcp-arcade-cabinets/tape-core';

import {
  DEFAULT_SECONDS,
  FIELD,
  VISIBLE_MAX,
  type Beat,
  type Round,
  type SpriteClass,
} from './types';

interface Candidate {
  row: TapeRow;
  index: number;
  sprite: SpriteClass;
  lie: boolean;
  members: number;
  skip: boolean;
}

function toolName(note: string): string {
  const m = /^tools\/call\s+(\S+)/.exec(note);
  return m?.[1] ?? '';
}

function listOrdinal(rows: readonly TapeRow[], index: number): number {
  const atom = rows[index]!.atom;
  let n = 0;
  for (let i = 0; i <= index; i++) {
    const row = rows[i]!;
    if (row.atom === atom && row.direction === 'out' && row.method === 'tools/list') n += 1;
  }
  return n;
}

function classify(tape: Tape, row: TapeRow, index: number): Candidate {
  const fact = factFor(tape, row.atom);
  const task = tape.atoms.find((a) => a.id === row.atom)?.task_tool ?? null;
  const ghost = /ghost probe/i.test(row.note);
  const noResponse = /\[no response\]/.test(row.note);
  const serverReq =
    /server request/.test(row.note) ||
    (row.direction === 'in' && row.method !== '(response)' && row.rpc_id !== '');

  if (ghost) {
    if (fact === 'ghost_answered') {
      return { row, index, sprite: 'grid', lie: true, members: 1, skip: false };
    }
    // ghost_refused evaporates; ghost_skipped is not on the wire.
    return { row, index, sprite: 'grid', lie: false, members: 1, skip: true };
  }

  if (row.method === 'tools/call') {
    const name = toolName(row.note);
    if (fact === 'followed' && task && name && name !== task) {
      return { row, index, sprite: 'grid', lie: true, members: 1, skip: false };
    }
    if (noResponse) {
      return { row, index, sprite: 'stall', lie: false, members: 1, skip: false };
    }
    return { row, index, sprite: 'grid', lie: false, members: 1, skip: false };
  }

  if (row.method === 'tools/list' && row.direction === 'out') {
    const lie = fact === 'menu_changed' && listOrdinal(tape.rows, index) === 2;
    return { row, index, sprite: 'menu', lie, members: 1, skip: false };
  }

  if (row.method === 'initialize') {
    return { row, index, sprite: 'init', lie: false, members: 1, skip: false };
  }
  if (row.method.startsWith('notifications/')) {
    return { row, index, sprite: 'fog', lie: false, members: 1, skip: false };
  }
  if (serverReq) {
    return { row, index, sprite: 'obstacle', lie: false, members: 1, skip: false };
  }
  if (noResponse) {
    return { row, index, sprite: 'stall', lie: false, members: 1, skip: false };
  }
  // Inbound responses and replies to server requests are not visible events.
  return { row, index, sprite: 'fog', lie: false, members: 1, skip: true };
}

function collapse(candidates: Candidate[]): Candidate[] {
  const out: Candidate[] = [];
  for (const c of candidates) {
    const prev = out[out.length - 1];
    if (
      prev &&
      !prev.lie &&
      !c.lie &&
      prev.sprite === 'grid' &&
      c.sprite === 'grid' &&
      prev.row.atom === c.row.atom
    ) {
      prev.members += 1;
      continue;
    }
    out.push({ ...c });
  }
  return out;
}

function capVisible(beats: Beat[], max: number): Beat[] {
  if (beats.length <= max) return beats;
  const lies = beats.filter((b) => b.lie);
  const rest = beats.filter((b) => !b.lie);
  const keepRest = Math.max(0, max - lies.length);
  if (rest.length <= keepRest) return beats;
  const picked = new Set<Beat>();
  if (keepRest === 0) return lies;
  for (let i = 0; i < keepRest; i++) {
    const idx = Math.min(rest.length - 1, Math.floor(((i + 0.5) * rest.length) / keepRest));
    picked.add(rest[idx]!);
  }
  const keep = new Set<Beat>([...lies, ...picked]);
  return beats.filter((b) => keep.has(b));
}

function beatId(c: Candidate, fact: ReturnType<typeof factFor>): string {
  if (c.lie && fact) return `${c.row.atom}:${fact}`;
  return `${c.row.atom}:${c.sprite}:${c.index}`;
}

/**
 * Whole-tape pre-pass (lock G7): placement from event order, then selection
 * from event class. Consecutive authorized tools/call rows collapse into one
 * formation. Visible events are capped at 80. Lies are flagged but share a
 * sprite class with the honest event of the same kind.
 */
export function prepassRound(
  tape: Tape,
  opts: { seconds: number } = { seconds: DEFAULT_SECONDS },
): Round {
  const seconds = opts.seconds;
  const classified = tape.rows.map((row, index) => classify(tape, row, index));
  const visible = collapse(classified.filter((c) => !c.skip));
  const cols = 8;
  const margin = FIELD.width / (cols + 1);
  const raw: Beat[] = visible.map((c, i) => {
    const fact = factFor(tape, c.row.atom);
    return {
      id: beatId(c, fact),
      t: 0,
      x: margin + (i % cols) * margin,
      sprite: c.sprite,
      lie: c.lie,
      members: c.members,
      source: {
        atom: c.row.atom,
        method: c.row.method,
        note: c.row.note,
        index: c.index,
      },
    };
  });
  const beats = capVisible(raw, VISIBLE_MAX);
  const lead = 1.2;
  const tail = 12;
  const span = Math.max(1, seconds - lead - tail);
  const last = Math.max(1, beats.length - 1);
  for (let i = 0; i < beats.length; i++) {
    beats[i]!.t = beats.length === 1 ? lead : lead + (i / last) * span;
  }
  return { tapeId: tape.bout_id, duration: seconds, beats };
}
