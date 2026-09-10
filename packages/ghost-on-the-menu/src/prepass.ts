import { factFor, type Tape, type TapeRow } from '@mcp-arcade-cabinets/tape-core';

import { attachPatterns, DEFAULT_PATTERNS, deriveTier, type WaveTier } from './patterns';
import {
  DEFAULT_SECONDS,
  FIELD,
  VISIBLE_MAX,
  type Beat,
  type PrepassOpts,
  type Round,
  type SpriteClass,
  type WaveBound,
} from './types';

interface Candidate {
  row: TapeRow;
  index: number;
  sprite: SpriteClass;
  lie: boolean;
  members: number;
  skip: boolean;
}

export const BEAT_GAP = 0.8;
/** Seconds per beat at density 1. Tier 2 packs the same beats into a shorter round. */
const DENSITY_BASE = 2;

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
  if (row.method === 'notifications/initialized') {
    return { row, index, sprite: 'ready', lie: false, members: 1, skip: false };
  }
  if (
    row.direction === 'in' &&
    (row.method === 'error' || /isError|jsonrpc error|\berror\b/i.test(row.note))
  ) {
    return { row, index, sprite: 'error', lie: false, members: 1, skip: false };
  }
  if (row.method === 'notifications/message') {
    return { row, index, sprite: 'fog', lie: false, members: 1, skip: false };
  }
  if (serverReq) {
    return { row, index, sprite: 'obstacle', lie: false, members: 1, skip: false };
  }
  if (noResponse) {
    return { row, index, sprite: 'stall', lie: false, members: 1, skip: false };
  }
  if (row.direction === 'in' && row.method === '(response)' && row.rpc_id !== '') {
    const call = tape.rows.some(
      (r) =>
        r.atom === row.atom &&
        r.direction === 'out' &&
        r.method === 'tools/call' &&
        r.rpc_id === row.rpc_id,
    );
    if (call) {
      return { row, index, sprite: 'answer', lie: false, members: 1, skip: false };
    }
  }
  // Other inbound responses (initialize, tools/list) and replies stay skipped.
  return { row, index, sprite: 'fog', lie: false, members: 1, skip: true };
}

function lastGridRun(out: Candidate[]): Candidate | undefined {
  for (let i = out.length - 1; i >= 0; i--) {
    const prev = out[i]!;
    if (prev.sprite === 'answer') continue;
    if (prev.sprite === 'grid' && !prev.lie) return prev;
    return undefined;
  }
  return undefined;
}

function collapse(candidates: Candidate[]): Candidate[] {
  const out: Candidate[] = [];
  for (const c of candidates) {
    if (c.sprite === 'grid' && !c.lie) {
      const prev = lastGridRun(out);
      if (prev && prev.row.atom === c.row.atom) {
        prev.members += 1;
        continue;
      }
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

function groupSizes(n: number, group: number): number[] {
  const g = Math.max(1, Math.round(group));
  const sizes: number[] = [];
  let left = n;
  while (left > 0) {
    if (left > g) {
      sizes.push(g);
      left -= g;
    } else {
      sizes.push(left);
      left = 0;
    }
  }
  return sizes;
}

function protocolRank(sprite: Beat['sprite']): number {
  if (sprite === 'init') return 0;
  if (sprite === 'ready') return 1;
  if (sprite === 'menu') return 2;
  if (sprite === 'grid') return 3;
  if (sprite === 'answer') return 4;
  if (sprite === 'error') return 5;
  return 6;
}

/** Handshake, then menu, then calls, then the rest. Stable within a class. */
function stageProtocol(beats: Beat[]): Beat[] {
  const copy = beats.slice();
  copy.sort((a, b) => protocolRank(a.sprite) - protocolRank(b.sprite));
  return copy;
}

function placeRhythm(beats: Beat[], atoms: readonly { id: string }[], wave: WaveTier): WaveBound[] {
  const byAtom = new Map<string, Beat[]>();
  for (const a of atoms) byAtom.set(a.id, []);
  for (const b of beats) {
    const list = byAtom.get(b.source.atom);
    if (list) list.push(b);
    else byAtom.set(b.source.atom, [b]);
  }
  const waves = atoms
    .map((a) => ({ atom: a.id, beats: byAtom.get(a.id) ?? [] }))
    .filter((w) => w.beats.length > 0);

  const bounds: WaveBound[] = [];
  let t = 0;
  for (let w = 0; w < waves.length; w++) {
    const pack = waves[w]!;
    const staged = stageProtocol(pack.beats);
    for (let i = 0; i < staged.length; i++) pack.beats[i] = staged[i]!;
    const t0 = t;
    const sizes = groupSizes(pack.beats.length, wave.beatsPerGroup);
    let idx = 0;
    for (let g = 0; g < sizes.length; g++) {
      const size = sizes[g]!;
      for (let k = 0; k < size; k++) {
        pack.beats[idx]!.t = t;
        idx += 1;
        if (k < size - 1) t += BEAT_GAP;
      }
      if (g < sizes.length - 1) t += wave.rest;
    }
    let t1 = t + BEAT_GAP;
    t1 = uniquifyClassTimes(pack.beats, t1, BEAT_GAP);
    bounds.push({ atom: pack.atom, t0, t1 });
    t = t1;
    if (w < waves.length - 1) t += wave.breather;
  }
  return bounds;
}

/** Same class in one wave never shares a t; later beats shift forward. */
function uniquifyClassTimes(pack: Beat[], t1: number, gap: number): number {
  const byClass = new Map<string, Beat[]>();
  for (const b of pack) {
    const list = byClass.get(b.sprite) ?? [];
    list.push(b);
    byClass.set(b.sprite, list);
  }
  for (const list of byClass.values()) {
    list.sort((a, b) => a.t - b.t || a.source.index - b.source.index);
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1]!;
      const cur = list[i]!;
      if (cur.t <= prev.t) cur.t = prev.t + gap;
    }
  }
  let maxT = 0;
  for (const b of pack) if (b.t > maxT) maxT = b.t;
  return Math.max(t1, maxT + gap);
}

function fitSpan(
  beats: Beat[],
  bounds: WaveBound[],
  duration: number,
  tail: number,
  min: number,
  max: number,
): number {
  if (bounds.length === 0) return duration;
  const lastT1 = bounds[bounds.length - 1]!.t1;
  const room = duration - tail;
  if (lastT1 > 0 && lastT1 < room) {
    const scale = room / lastT1;
    for (const b of beats) b.t *= scale;
    for (const w of bounds) {
      w.t0 *= scale;
      w.t1 *= scale;
    }
    return duration;
  }
  const need = lastT1 + tail;
  if (need > duration) return clamp(need, min, max);
  return duration;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Stable seed from the tape header and every wire row. Independent of facts. */
export function seedFromTape(tape: Tape): number {
  const parts = [tape.bout_id];
  for (const r of tape.rows) {
    parts.push(`${r.atom}|${r.direction}|${r.method}|${r.note}`);
  }
  return hashString(parts.join('\n'));
}

function columnX(seed: number, i: number, cols: number, margin: number): number {
  const slot = (((seed >>> 0) + Math.imul(i + 1, 2654435761)) >>> 0) % cols;
  const jit = (((seed >>> 3) + Math.imul(i + 3, 1597334677)) >>> 0) % 1000;
  const jitter = (jit / 1000 - 0.5) * margin * 0.5;
  const x = margin + slot * margin + jitter;
  return Math.max(margin * 0.5, Math.min(FIELD.width - margin * 0.5, x));
}

/**
 * Whole-tape pre-pass (lock G7, wave 2): placement from event order, then
 * selection from event class. Consecutive authorized tools/call rows collapse
 * into one formation. Visible events are capped at 80. Duration is
 * clamp((base / density) × beats, 45, 120). One wave per atom, staged in
 * protocol order (init, menu, grids, answers, rest) with rhythm groups from waves.json.
 * Density is unused in group/rest/breather placement.
 */
export function prepassRound(tape: Tape, opts: PrepassOpts = { seconds: DEFAULT_SECONDS }): Round {
  const seed = opts.seed ?? seedFromTape(tape);
  const patterns = opts.patterns ?? DEFAULT_PATTERNS;
  const tier = opts.tier ?? deriveTier(tape, patterns.ladder);
  const classified = tape.rows.map((row, index) => classify(tape, row, index));
  const visible = collapse(classified.filter((c) => !c.skip));
  const cols = 8;
  const margin = FIELD.width / (cols + 1);
  const raw: Beat[] = visible.map((c, i) => {
    const fact = factFor(tape, c.row.atom);
    return {
      id: beatId(c, fact),
      t: 0,
      x: columnX(seed, i, cols, margin),
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
  const wave = patterns.waves.tiers[String(tier) as '0' | '1' | '2' | '3'];
  const waveBounds = placeRhythm(beats, tape.atoms, wave);
  let duration = clamp(
    (beats.length * DENSITY_BASE) / Math.max(0.05, wave.density),
    wave.min,
    wave.max,
  );
  duration = fitSpan(beats, waveBounds, duration, wave.tail, wave.min, wave.max);
  const round: Round = { tapeId: tape.bout_id, duration, beats, seed, waveBounds, tier };
  attachPatterns(round, patterns);
  return round;
}
