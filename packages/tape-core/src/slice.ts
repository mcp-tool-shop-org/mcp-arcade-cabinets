import { TapeError, type AtomSlice, type Fact, type Tape } from './types';

/** Rows grouped per atom, in the tape's atom order. */
export function sliceByAtom(tape: Tape): AtomSlice[] {
  const groups = new Map<string, AtomSlice>();
  for (const atom of tape.atoms) {
    if (groups.has(atom.id)) throw new TapeError(`duplicate atom id "${atom.id}"`);
    groups.set(atom.id, { atom, rows: [] });
  }
  for (const row of tape.rows) {
    const slice = groups.get(row.atom);
    if (!slice) throw new TapeError(`row.atom "${row.atom}" is not in atoms`);
    slice.rows.push(row);
  }
  return tape.atoms.map((atom) => groups.get(atom.id)!);
}

export function factFor(tape: Tape, atomId: string): Fact | undefined {
  let found: Fact | undefined;
  for (const f of tape.facts) {
    if (f.atom_id !== atomId) continue;
    if (found !== undefined) throw new TapeError(`duplicate fact.atom_id "${atomId}"`);
    found = f.fact;
  }
  return found;
}
