import { describe, expect, it } from 'vitest';

import { LEAVE_HOLD_MS, readKey, type KeyLike } from '../src/typer-keys';

function key(k: string, extra: Partial<KeyLike> = {}): KeyLike {
  return { key: k, ...extra };
}

describe('a keydown, as a move', () => {
  it('reads a single printable character as a key', () => {
    expect(readKey(key('a'))).toEqual({ kind: 'input', input: { key: 'a' }, prevent: false });
    expect(readKey(key('Z'))).toEqual({ kind: 'input', input: { key: 'Z' }, prevent: false });
    expect(readKey(key('{'))).toEqual({ kind: 'input', input: { key: '{' }, prevent: false });
    expect(readKey(key('"'))).toEqual({ kind: 'input', input: { key: '"' }, prevent: false });
  });

  it('keeps the page still under the space bar', () => {
    expect(readKey(key(' '))).toEqual({ kind: 'input', input: { key: ' ' }, prevent: true });
  });

  it('reads the three keys that are not characters', () => {
    expect(readKey(key('Backspace'))).toEqual({
      kind: 'input',
      input: { backspace: true },
      prevent: true,
    });
    expect(readKey(key('Enter'))).toEqual({
      kind: 'input',
      input: { enter: true },
      prevent: true,
    });
    expect(readKey(key('Tab'))).toEqual({ kind: 'input', input: { tab: true }, prevent: true });
  });

  it('reads Escape as leaving, and holds it', () => {
    expect(readKey(key('Escape'))).toEqual({ kind: 'leave', prevent: false });
    expect(LEAVE_HOLD_MS).toBeGreaterThan(0);
  });

  it('ignores a shortcut on any modifier', () => {
    for (const mod of ['ctrlKey', 'metaKey', 'altKey'] as const) {
      expect(readKey(key('a', { [mod]: true }))).toEqual({ kind: 'ignore', prevent: false });
      expect(readKey(key('Enter', { [mod]: true }))).toEqual({ kind: 'ignore', prevent: false });
      expect(readKey(key('Escape', { [mod]: true }))).toEqual({ kind: 'ignore', prevent: false });
    }
  });

  it('keeps shift, because a capital arrives on it', () => {
    expect(readKey(key('A', { shiftKey: true }))).toEqual({
      kind: 'input',
      input: { key: 'A' },
      prevent: false,
    });
  });

  it('ignores a keystroke an input method is still composing', () => {
    expect(readKey(key('a', { isComposing: true }))).toEqual({ kind: 'ignore', prevent: false });
    expect(readKey(key('Enter', { isComposing: true }))).toEqual({
      kind: 'ignore',
      prevent: false,
    });
  });

  it('ignores everything else the keyboard has', () => {
    for (const k of ['ArrowLeft', 'F5', 'Shift', 'Control', 'Alt', 'CapsLock', 'Dead', 'Home']) {
      expect(readKey(key(k)), k).toEqual({ kind: 'ignore', prevent: false });
    }
  });

  it('takes a repeat as a keystroke, because a held key types', () => {
    expect(readKey(key('a', { repeat: true }))).toEqual({
      kind: 'input',
      input: { key: 'a' },
      prevent: false,
    });
  });
});
