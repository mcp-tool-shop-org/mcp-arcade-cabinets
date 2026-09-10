import { describe, expect, it } from 'vitest';

import { cues, kindOfAtom, snapshot, waveKindAt } from '../src/cues';
import { createRoundState } from '../src/sim';
import type { Round } from '../src/types';

const round: Round = {
  tapeId: 'bout_cues',
  duration: 30,
  beats: [],
  seed: 0,
  tier: 0,
  waveBounds: [
    { atom: 'inspect.tools_list', t0: 0, t1: 4 },
    { atom: 'poison.follow_through', t0: 6, t1: 12 },
    { atom: 'temporal.rug_pull', t0: 14, t1: 20 },
    { atom: 'protocol.unlisted_call', t0: 22, t1: 26 },
  ],
};

describe('waveKindAt', () => {
  it('maps atom prefixes to wave kinds and the gaps to breathers', () => {
    expect(kindOfAtom('poison.follow_through')).toBe('poison');
    expect(kindOfAtom('something.else')).toBe('inspect');
    expect(waveKindAt(round, 1)).toBe('inspect');
    expect(waveKindAt(round, 5)).toBe('breather');
    expect(waveKindAt(round, 7)).toBe('poison');
    expect(waveKindAt(round, 15)).toBe('rug');
    expect(waveKindAt(round, 23)).toBe('unlisted');
    expect(waveKindAt(round, 29)).toBe('breather');
  });
});

describe('cues', () => {
  it('fires nothing on the first frame and the right sound per transition', () => {
    const state = createRoundState(round);
    const a = snapshot(state);
    expect(cues(null, a)).toEqual([]);
    expect(cues(a, a)).toEqual([]);
    expect(cues(a, { ...a, caught: a.caught + 1 })).toEqual(['catch']);
    expect(cues(a, { ...a, dying: a.dying + 1 })).toEqual(['pop']);
    expect(cues(a, { ...a, lives: a.lives - 1 })).toEqual(['lamp']);
    expect(cues(a, { ...a, ended: true })).toEqual(['end']);
    expect(cues({ ...a, phase: 0 }, { ...a, phase: 1 })).toEqual(['phase']);
    expect(cues(a, { ...a, fog: true })).toEqual(['fog']);
    expect(cues({ ...a, cooldown: 0 }, { ...a, cooldown: 0.12 })).toEqual(['fire']);
    expect(cues({ ...a, cooldown: 0.12 }, { ...a, cooldown: 0.05 })).toEqual([]);
  });

  it('orders the catch before everything else in one frame', () => {
    const state = createRoundState(round);
    const a = snapshot(state);
    const out = cues({ ...a, cooldown: 0 }, { ...a, caught: 1, dying: 1, cooldown: 0.12 });
    expect(out).toEqual(['catch', 'pop', 'fire']);
  });
});

describe('wave card cue', () => {
  it('fires once when a wave card appears and not while it stays', () => {
    const state = createRoundState(round);
    const a = snapshot(state);
    state.caption = { text: 'poison', t: 1.5, kind: 'wave' };
    const b = snapshot(state);
    expect(cues(a, b)).toEqual(['wave']);
    expect(cues(b, b)).toEqual([]);
    state.caption = { text: 'tools/call leak', t: 1.5, kind: 'catch' };
    const c = snapshot(state);
    expect(cues(b, c)).toEqual([]);
  });
});

describe('boss and dive cues', () => {
  it('names a boss hit, a boss down and a dive from the snapshot diff', () => {
    const state = createRoundState(round);
    const a = snapshot(state);
    expect(cues({ ...a, bossHitT: 2 }, { ...a, bossHitT: 0 })).toEqual(['bosshit']);
    expect(cues({ ...a, bossHitT: 0 }, { ...a, bossHitT: 0.5 })).toEqual([]);
    expect(cues(a, { ...a, bossKills: a.bossKills + 1, bossHitT: null })).toEqual(['bossdown']);
    expect(cues(a, { ...a, diving: a.diving + 1 })).toEqual(['dive']);
  });
});
