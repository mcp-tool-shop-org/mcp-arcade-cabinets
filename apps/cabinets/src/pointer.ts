// Whether the player is pointing with a finger.
//
// Both cabinets are dressed for a phone — the stylesheet re-pads the shell
// under 640px and collapses the typing board under 1032px — and neither could
// be played on one: Ghost read a window keydown and nothing else, and the
// typing cabinet had no text field anywhere, so a tab stop on a plain section
// raised no soft keyboard. What each cabinet adds for a finger is drawn and
// wired only where a finger is what the player has, so a desktop round is
// byte for byte the round it was.
//
// A query, not a constant: it is read at the moment a mount or a menu needs
// it, so a device that changes its mind (a tablet with a keyboard docked and
// undocked) is answered with what is true now, and a test can stub
// `matchMedia` before the call rather than before the import.

/** True when the player's pointer is a finger rather than a mouse. */
export function coarsePointer(): boolean {
  try {
    return window.matchMedia?.('(pointer: coarse)').matches === true;
  } catch {
    // A browser with no media queries at all is a browser with a mouse.
    return false;
  }
}
