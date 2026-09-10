import type { AtomSlice, Fact, Tape } from './types';

/** Rows grouped per atom, in the tape's atom order. */
export function sliceByAtom(tape: Tape): AtomSlice[] {
  const groups = new Map<string, AtomSlice>();
  for (const atom of tape.atoms) {
    groups.set(atom.id, { atom, rows: [] });
  }
  for (const row of tape.rows) {
    const slice = groups.get(row.atom);
    if (slice) slice.rows.push(row);
  }
  return tape.atoms.map((atom) => groups.get(atom.id)!);
}

export function factFor(tape: Tape, atomId: string): Fact | undefined {
  return tape.facts.find((f) => f.atom_id === atomId)?.fact;
}
