// A keydown, read as one move. Pure: no DOM, no state, no audio — the mount
// feeds it events and queues what comes back, one keystroke per sim step.
//
// The rules, from the slice-2 brief: a single printable character with no
// Ctrl, Meta or Alt is a key; Backspace, Enter and Tab are themselves;
// Escape leaves (held, so a stray tap does nothing); everything else, and
// anything mid-composition, is ignored. An IME is composing whole words the
// player did not type character by character, so those never reach the sim.

import type { RunInput } from '@mcp-arcade-cabinets/vibe-typer';

/** Enough of a KeyboardEvent to read. The test builds these by hand. */
export interface KeyLike {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  isComposing?: boolean;
  repeat?: boolean;
}

export type KeyRead =
  /** A move for the sim; `prevent` is true where the browser would do its own thing. */
  | { kind: 'input'; input: RunInput; prevent: boolean }
  /** Escape: the mount holds it, and leaves when the hold is long enough. */
  | { kind: 'leave'; prevent: boolean }
  | { kind: 'ignore'; prevent: false };

const IGNORE: KeyRead = { kind: 'ignore', prevent: false };

function input(value: RunInput, prevent: boolean): KeyRead {
  return { kind: 'input', input: value, prevent };
}

/** One keydown, as a move. Modifiers and composition are not moves. */
export function readKey(event: KeyLike): KeyRead {
  if (event.isComposing === true) return IGNORE;
  if (event.ctrlKey === true || event.metaKey === true || event.altKey === true) return IGNORE;
  switch (event.key) {
    case 'Escape':
      return { kind: 'leave', prevent: false };
    case 'Backspace':
      return input({ backspace: true }, true);
    case 'Enter':
      return input({ enter: true }, true);
    case 'Tab':
      return input({ tab: true }, true);
    default:
      break;
  }
  // Shift is how a capital arrives, so it is never a modifier here.
  if (event.key.length === 1) return input({ key: event.key }, event.key === ' ');
  return IGNORE;
}

/** How long Escape is held before the field lets go. Milliseconds. */
export const LEAVE_HOLD_MS = 300;
