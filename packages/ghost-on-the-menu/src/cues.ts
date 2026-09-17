// Presentation cues over the sim state: which wave kind is playing, and
// which sound fires between two frames. This module reads the Round and the
// RoundState and never the tape's facts; the shell feeds its output to
// `audio.ts`. Kept out of the sim so the sim stays one function (§5).

import type { SfxName } from './audio';
import { kindOfAtom, type DropKind, type Round, type RoundState, type WaveKind } from './types';

export { kindOfAtom, type WaveKind };

/** The wave kind at round time `t`; the gaps between wave bounds are breathers. */
export function waveKindAt(round: Round, t: number): WaveKind {
  for (const b of round.waveBounds) {
    if (t >= b.t0 && t < b.t1) return kindOfAtom(b.atom);
  }
  return 'breather';
}

export interface CueSnapshot {
  caught: number;
  dying: number;
  lives: number;
  ended: boolean;
  phase: number | null;
  fog: boolean;
  cooldown: number;
  /** True while a wave card is on screen. */
  waveCard: boolean;
  /** Seconds since the boss was last hit, or null with no boss. */
  bossHitT: number | null;
  bossKills: number;
  diving: number;
  dropCatches: number;
  /** The same catches by kind, so a cue can name what was caught. */
  drops: Record<DropKind, number>;
  parallelism: boolean;
}

/** The kinds in a fixed order, so one frame's catches fire in one order. */
const DROP_KINDS: readonly DropKind[] = ['lamp', 'spread', 'rapid', 'pierce'];

export function snapshot(state: RoundState): CueSnapshot {
  let caught = 0;
  let dying = 0;
  let diving = 0;
  for (const e of state.enemies) {
    if (e.mode === 'caught') caught += 1;
    else if (e.mode === 'dying') dying += 1;
    else if (e.mode === 'dive') diving += 1;
  }
  return {
    caught,
    dying,
    lives: state.lives,
    ended: state.scene !== null,
    phase: state.boss && state.boss.alive ? state.boss.phase : null,
    fog: state.fog !== null && state.fog.alive,
    cooldown: state.fireCooldown,
    waveCard: state.caption !== null && state.caption.kind === 'wave',
    bossHitT: state.boss && state.boss.alive ? state.boss.hitT : null,
    bossKills: state.bossKills,
    diving,
    dropCatches: state.dropCatches,
    drops: { ...state.dropCatchesByKind },
    parallelism: state.parallelism,
  };
}

/** Sounds to fire on the transition prev → next. Order: the loud one first. */
export function cues(prev: CueSnapshot | null, next: CueSnapshot): SfxName[] {
  if (!prev) return [];
  const out: SfxName[] = [];
  if (next.caught > prev.caught) out.push('catch');
  // The cue is chosen by the KIND that was caught, not by the lamp pool
  // rising. Keying on the pool meant a lamp caught at a full pool — the
  // ordinary case, where the pickup changes nothing — sounded exactly like a
  // spread, which is the one pickup that was given its own sound on purpose;
  // and the three timed powers shared one ding although the field gives each
  // its own fill and its own bezel socket. 'lamp' is the LOSS sound, so it is
  // never reused for a gain.
  let named = false;
  for (const kind of DROP_KINDS) {
    if (next.drops[kind] <= prev.drops[kind]) continue;
    named = true;
    if (kind === 'lamp') out.push(next.lives > prev.lives ? 'lampback' : 'lampfull');
    else if (kind === 'spread') out.push('drop-spread');
    else if (kind === 'rapid') out.push('drop-rapid');
    else out.push('drop-pierce');
  }
  // A pool that rose with no lamp caught, or a catch a caller counted without
  // naming its kind: the old cues, so no pickup is ever silent.
  if (!named) {
    if (next.lives > prev.lives) out.push('lampback');
    else if (next.dropCatches > prev.dropCatches) out.push('drop');
  }
  if (next.lives < prev.lives) out.push('lamp');
  if (next.ended && !prev.ended) out.push('end');
  if (next.waveCard && !prev.waveCard) out.push('wave');
  if (next.bossKills > prev.bossKills) out.push('bossdown');
  else if (next.bossHitT !== null && prev.bossHitT !== null && next.bossHitT < prev.bossHitT) {
    out.push('bosshit');
  }
  if (next.diving > prev.diving) out.push('dive');
  if (next.parallelism && !prev.parallelism) out.push('burst');
  if (next.phase !== null && prev.phase !== null && next.phase !== prev.phase) out.push('phase');
  if (next.fog && !prev.fog) out.push('fog');
  if (next.dying > prev.dying) out.push('pop');
  if (next.cooldown > prev.cooldown) out.push('fire');
  return out;
}
