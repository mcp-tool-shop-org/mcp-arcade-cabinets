import { describe, expect, it } from 'vitest';
import { CABINET } from '../src/index';

describe('ghost scaffold', () => {
  it('exists', () => {
    expect(CABINET).toBe('ghost-on-the-menu');
  });
});
