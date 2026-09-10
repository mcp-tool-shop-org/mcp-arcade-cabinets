// Presentation cues over the sim state: which wave kind is playing, and
// which sound fires between two frames. This module reads the Round and the
// RoundState and never the tape's facts; the shell feeds its output to
// `audio.ts`. Kept out of the sim so the sim stays one function (§5).

import type { SfxName } from './audio';
import type { Round, RoundState } from './types';

export type WaveKind = 'inspect' | 'poison' | 'rug' | 'unlisted' | 'breather';

/** Atom id prefix → wave kind. Unknown atoms play as inspect. */
export function kindOfAtom(atom: string): WaveKind {
  if (atom.startsWith('poison.')) return 'poison';
  if (atom.startsWith('temporal.')) return 'rug';
  if (atom.startsWith('protocol.')) return 'unlisted';
  return 'inspect';
}

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
}

export function snapshot(state: RoundState): CueSnapshot {
  let caught = 0;
  let dying = 0;
  for (const e of state.enemies) {
    if (e.mode === 'caught') caught += 1;
    else if (e.mode === 'dying') dying += 1;
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
  };
}

/** Sounds to fire on the transition prev → next. Order: the loud one first. */
export function cues(prev: CueSnapshot | null, next: CueSnapshot): SfxName[] {
  if (!prev) return [];
  const out: SfxName[] = [];
  if (next.caught > prev.caught) out.push('catch');
  if (next.lives < prev.lives) out.push('lamp');
  if (next.ended && !prev.ended) out.push('end');
  if (next.waveCard && !prev.waveCard) out.push('wave');
  if (next.phase !== null && prev.phase !== null && next.phase !== prev.phase) out.push('phase');
  if (next.fog && !prev.fog) out.push('fog');
  if (next.dying > prev.dying) out.push('pop');
  if (next.cooldown > prev.cooldown) out.push('fire');
  return out;
}
