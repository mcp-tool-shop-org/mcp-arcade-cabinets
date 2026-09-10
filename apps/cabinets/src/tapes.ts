// Every fixture tape, bundled at build time. Tapes never carry a score or a
// verdict; `loadTape` refuses any that do, so the shell cannot leak what it
// was never given. `facts[]` is in the bundle: it is the CLI answer key, the
// same one `test:play` reads, and the page never puts it on screen, in the
// URL or on a data attribute.

import { loadTape, type Tape } from '@mcp-arcade-cabinets/tape-core';

const files = import.meta.glob('../../../fixtures/tapes/*.tape.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

export interface TapeEntry {
  name: string;
  tape: Tape;
}

export const TAPES: TapeEntry[] = Object.entries(files)
  .map(([path, json]) => ({
    name: path.replace(/^.*\//, '').replace(/\.tape\.json$/, ''),
    tape: loadTape(json),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));
