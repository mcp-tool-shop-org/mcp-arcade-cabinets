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
  /** True while the veil is over the lower field, so the blind can be heard. */
  blind: boolean;
  cooldown: number;
  /** True on a frame the cap on shots in the air swallowed a press. */
  columnFull: boolean;
  /** Hits hulls took and lived through, so an absorbed shot can be heard. */
  hullHits: number;
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
    blind: state.blind > 0,
    cooldown: state.fireCooldown,
    columnFull: state.columnFull,
    hullHits: state.hullHits,
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
  // The frame the veil lands, not every blind frame. The bank appearing has
  // had a cue since the start; the blind it drops — the one event that costs
  // the player the bottom of the field — had none in any channel, and it is
  // the event that most looks like the renderer breaking.
  if (next.blind && !prev.blind) out.push('veil');
  if (next.dying > prev.dying) out.push('pop');
  // A hull that took a shot and lived. Distinct from 'pop' and quieter: what
  // died is a different event from what held.
  if (next.hullHits > prev.hullHits) out.push('hullhit');
  if (next.cooldown > prev.cooldown) out.push('fire');
  // The way INTO a full column, not every refused frame: a held button at the
  // cap would otherwise tick once a frame. Quietest thing in the list, and
  // last, because it is the absence of a shot rather than a shot.
  if (next.columnFull && !prev.columnFull) out.push('capped');
  return out;
}
