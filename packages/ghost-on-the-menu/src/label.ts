// Difficulty label for the tape picker. Derived from the header and the
// wire shape only: the derived tier, wave count, boss count, rows per atom,
// and framing. Never a fact, never a lie count, never a digit.

import type { Tape } from '@mcp-arcade-cabinets/tape-core';

import { DEFAULT_PATTERNS, deriveTier, type PatternSet } from './patterns';
import { kindOfAtom } from './types';

export interface TapeLabel {
  /** Short word on the picker: fixture, seat, or live. */
  label: 'fixture' | 'seat' | 'live';
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
  const kind = kindOfAtom(atomId);
  return kind === 'poison' || kind === 'rug' || kind === 'unlisted';
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
  const tier = deriveTier(tape, patterns.ladder);
  const label: TapeLabel['label'] = tier === 2 ? 'live' : tier === 1 ? 'seat' : 'fixture';
  const waves = word(tape.atoms.length);
  const bosses = word(tape.atoms.filter((a) => hasBoss(a.id)).length);
  const why = `${place(tape)}, ${waves} waves, ${bosses} bosses, ${density(tape)}.`;
  return { label, why };
}
