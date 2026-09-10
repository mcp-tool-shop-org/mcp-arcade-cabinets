import { describe, expect, it } from 'vitest';
import { CABINET } from '../src/index';

describe('house-call scaffold', () => {
  it('exists', () => {
    expect(CABINET).toBe('house-call');
  });
});
