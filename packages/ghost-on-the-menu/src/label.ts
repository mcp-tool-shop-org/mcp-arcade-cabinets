// Difficulty label for the tape picker. Derived from the header and the
// wire shape only: the derived tier, wave count, boss count, rows per atom,
// and framing. Never a fact, never a lie count, never a digit.

import type { Tape } from '@mcp-arcade-cabinets/tape-core';

import { DEFAULT_PATTERNS, deriveRung, rungWhy, type PatternSet, type Tier } from './patterns';
import { bossKindFor } from './sim';

/** The picker's word per rung. Exhaustive over the tier union on purpose. */
const TIER_LABEL = {
  0: 'fixture',
  1: 'seat',
  2: 'live',
  3: 'hardcore',
} as const satisfies Record<Tier, string>;

export interface TapeLabel {
  /** Short word on the picker, one per rung. */
  label: (typeof TIER_LABEL)[Tier];
  /** Hover text. Words only; no digit, no fact. */
  why: string;
}

const WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
] as const;

function word(n: number): string {
  return WORDS[n] ?? 'many';
}

function hasBoss(atomId: string): boolean {
  return bossKindFor(atomId) !== null;
}

function place(tape: Tape): string {
  const wire = tape.framing === 'content-length' ? 'content-length' : 'ndjson';
  if (tape.target_kind === 'stdio') return 'Live server over stdio';
  if (tape.target_kind === 'docker') {
    if (tape.container?.image_id) return `Live docker over ${wire}`;
    if (tape.seat) return `Seated docker over ${wire}`;
    return `Docker tape over ${wire}`;
  }
  return `Fixture tape over ${wire}`;
}

function density(tape: Tape): string {
  const rpa = tape.rows.length / Math.max(1, tape.atoms.length);
  if (rpa >= 10) return 'dense wire';
  if (rpa >= 8) return 'steady wire';
  return 'sparse wire';
}

export function labelTape(tape: Tape, patterns: PatternSet = DEFAULT_PATTERNS): TapeLabel {
  // Exhaustive over the tier union, not a ternary chain: the old mapping sent
  // BOTH the gentlest rung and the harshest to 'fixture', so a tier-three
  // tape — one lamp, hazards on — was announced on the picker as the easiest
  // thing on the menu. Adding a derive rule that reaches a rung with no word
  // is now a type error rather than a silent mislabel.
  const { tier, onLadder } = deriveRung(tape, patterns.ladder);
  const label = TIER_LABEL[tier];
  const waves = word(tape.atoms.length);
  const bosses = word(tape.atoms.filter((a) => hasBoss(a.id)).length);
  // A target the ladder does not name plays on the bottom rung. The picker
  // says so rather than calling a live server a fixture.
  const ladder = onLadder ? rungWhy(tier, patterns) : 'This target is not on the ladder.';
  const why = `${place(tape)}, ${waves} waves, ${bosses} bosses, ${density(tape)}. ${ladder}`;
  return { label, why };
}
