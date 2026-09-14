// F-61d48d92: the scripted MCP seat through play(). Lives here because
// createScriptedSeat is this package; ghost-on-the-menu must not import it.

import { describe, expect, it } from 'vitest';

import { play } from '../../ghost-on-the-menu/src/play';

import { createScriptedSeat } from '../src/scripted';

const SCREEN_FORBIDDEN =
  /\d|\b(nrp|integrity|utility|attack_success|pass|fail|score|cleared|lie|fact|revealed|followed|held|ghost_answered|ghost_refused|menu_changed|menu_stable)\b/i;

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
      if (line.startsWith('seat view:')) expect(line).not.toMatch(SCREEN_FORBIDDEN);
    }
  });
});
