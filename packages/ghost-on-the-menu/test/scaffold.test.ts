import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';
import { CABINET } from '../src/index';

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
