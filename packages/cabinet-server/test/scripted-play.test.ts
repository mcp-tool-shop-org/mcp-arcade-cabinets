// F-61d48d92: the scripted MCP seat through play(). Lives here because
// createScriptedSeat is this package; ghost-on-the-menu must not import it.

import { describe, expect, it } from 'vitest';

import { play } from '../../ghost-on-the-menu/src/play';
import { SCREEN_FORBIDDEN } from '../../ghost-on-the-menu/src/types';

import { createScriptedSeat } from '../src/scripted';

// The product's own needle, not a copy of it. This file used to carry its
// own literal, and a test that carries its own copy of the gate can only
// ever assert against itself: a needle added to the product and not to this
// file would leave the scripted-seat gate silently weaker than the one the
// game runs. Built fresh and non-global because the exported constant is
// `g`-flagged and `.test` on a global regex keeps its place between calls —
// the same treatment ghost's own endless test gives it.
const SCREEN = new RegExp(SCREEN_FORBIDDEN.source, 'i');

describe('scripted MCP seat through play()', () => {
  it('refuses a digit line and a repeat', async () => {
    const seat = createScriptedSeat();
    let extras = false;
    const inner = seat.frame.bind(seat);
    seat.frame = (live) => {
      inner(live);
      if (extras || !live.state.boss?.alive || live.state.scene) return;
      extras = true;
      seat.cabinet.call('say', { text: 'Nobody listed me and here I am.', lead: 'beat' });
      seat.cabinet.call('say', { text: 'Nobody listed me and here I am.', lead: 'beat' });
      seat.cabinet.call('say', { text: 'I have 3 items.', lead: 'short' });
    };
    const out = await play({
      fixture: 'naive-ndjson',
      seat,
      bot: 'sweeper',
      immortal: true,
      tier: 1,
    });
    expect(out.leaked).toBe(false);
    expect(out.text).toMatch(/refused/);
    expect(out.text).toMatch(/digit/);
    expect(out.text).toMatch(/repeat/);
    for (const line of out.text.split('\n')) {
      if (line.startsWith('seat view:')) expect(line).not.toMatch(SCREEN);
    }
  });
});
