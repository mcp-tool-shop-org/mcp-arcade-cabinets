import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';
import {
  BED_FADE_S,
  BED_LEVEL,
  BED_POOL,
  BURST_RATE,
  CABINET,
  COMBAT_FILL,
  END_FADE_S,
  PARKING_Y,
  WAVE_FIELD,
} from '../src/index';
import type {
  Boss,
  Caption,
  FieldKind,
  FogBank,
  HazardKind,
  Player,
  PrepassOpts,
  Shot,
  WaveBound,
} from '../src/index';

// The old assertion compared CABINET to its own literal and could not fail
// for any reason a reader would care about. CABINET is the cabinet's name,
// and the package is named after it: pinning them together catches a rename
// that lands in one place and not the other.
describe('ghost scaffold', () => {
  it('names the cabinet the way the package does', () => {
    const pkg = JSON.parse(readFileSync(path.resolve(__dirname, '../package.json'), 'utf8')) as {
      name: string;
    };
    expect(pkg.name.split('/').pop()).toBe(CABINET);
  });
});

// The barrel is the only entry point the package publishes, and it was a
// hand-kept subset: `bossFrame(b: Boss)` was exported while `Boss` was not,
// `RoundState` while five of its field types were not, and the bed constants
// the audio module's own doc hands the shell were reachable only by
// deep-importing a path that is not published. A shell author could not name
// what the library hands them, and none of it reached an editor tooltip.
describe('the barrel names what its signatures name', () => {
  it('exports the types its exported signatures and fields are written in', () => {
    // These annotations are the assertion: a type missing from the barrel is
    // a compile error in this file, which is where the omission belongs.
    const boss: Boss | null = null;
    const caption: Caption | null = null;
    const player: Player | null = null;
    const shot: Shot | null = null;
    const fog: FogBank | null = null;
    const hazard: HazardKind | null = null;
    const bound: WaveBound | null = null;
    const opts: PrepassOpts = {};
    const field: FieldKind = 'breather';
    expect([boss, caption, player, shot, fog, hazard, bound]).toEqual(Array(7).fill(null));
    expect(opts).toEqual({});
    expect(field).toBe('breather');
  });

  it('exports the constants a shell needs to match the field it is painting', () => {
    expect(WAVE_FIELD.breather).toMatch(/^#[0-9a-f]{6}$/i);
    expect(Object.keys(COMBAT_FILL).length).toBeGreaterThan(0);
    expect(PARKING_Y).toBeGreaterThan(0);
    // The audio module's doc hands the shell the job of drawing the next bed
    // from BED_POOL, with these levels and fades.
    expect(BED_POOL.length).toBeGreaterThan(0);
    for (const n of [BED_LEVEL, BED_FADE_S, BURST_RATE, END_FADE_S]) {
      expect(typeof n).toBe('number');
      expect(n).toBeGreaterThan(0);
    }
  });
});
