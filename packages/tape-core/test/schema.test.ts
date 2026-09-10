import { describe, expect, it } from 'vitest';
import { TAPE_SCHEMA_ID } from '../src/index';

describe('tape-core scaffold', () => {
  it('pins the tape schema id the instrument exports', () => {
    expect(TAPE_SCHEMA_ID).toBe('mcp-arcade.tape/v1');
  });
});
