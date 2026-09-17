// @vitest-environment jsdom
//
// Ghost's half of the menu, painted. It had no test of any kind: the shift
// draw, the call card's digit strip and the code that replays a shift were
// all unexercised, while every equivalent on the typing side had a test. No
// game is started here: Take the call is never pressed, so nothing mounts.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { decodeShift } from '@mcp-arcade-cabinets/ghost-on-the-menu';

import { readPrefs, writePrefs } from '../src/ghost';
import { TAPES } from '../src/tapes';

const ROSTER = TAPES.map((t) => t.name);

function app(): HTMLElement {
  return document.getElementById('app')!;
}

/**
 * The page, from its own bootstrap: `#app` exists before the import, so the
 * module's own last line paints the menu. The registry is reset first, since
 * the bootstrap runs once per instance of the module.
 */
async function paint(): Promise<void> {
  vi.resetModules();
  document.body.replaceChildren();
  const main = document.createElement('main');
  main.id = 'app';
  document.body.append(main);
  await import('../src/main');
}

function byText(selector: string, text: string): HTMLElement {
  const found = [...app().querySelectorAll(selector)].find((n) => n.textContent === text);
  if (!found) throw new Error(`no ${selector} reading ${text}`);
  return found as HTMLElement;
}

beforeEach(() => {
  localStorage.clear();
  globalThis.fetch = vi.fn(() => Promise.reject(new Error('no daemon here'))) as never;
});

afterEach(() => {
  document.body.replaceChildren();
});

describe('the rung a fresh browser plays at', () => {
  it('opens on the seat, and the recorded rung says what it is', async () => {
    await paint();
    byText('button.tape-name', 'Ghost on the Menu').click();
    const play = app().querySelector('select[aria-label="difficulty"]') as HTMLSelectElement;
    const shift = app().querySelector('select[aria-label="shift difficulty"]') as HTMLSelectElement;

    // Nothing is stored yet, and every fixture tape's header derives to the
    // study rung, where the formations neither fire nor dive: opening there
    // reads as a broken game, so a browser that has never played opens on the
    // seat and the Shift row opens with it.
    expect(readPrefs().difficulty).toBeUndefined();
    expect(play.value).toBe('seat');
    expect(shift.value).toBe('seat');

    // The study rung is still a choice, and its label says what choosing it
    // means rather than leaving the player to find out by playing it.
    const recorded = [...play.options].find((o) => o.value === 'recorded');
    expect(recorded).toBeTruthy();
    expect(recorded!.textContent).toContain('as recorded');
    expect(recorded!.textContent).toContain('nothing fires');
  });

  it('plays what this browser last chose, default or not', async () => {
    writePrefs({ difficulty: 'recorded' });
    await paint();
    byText('button.tape-name', 'Ghost on the Menu').click();
    const play = app().querySelector('select[aria-label="difficulty"]') as HTMLSelectElement;
    const shift = app().querySelector('select[aria-label="shift difficulty"]') as HTMLSelectElement;
    expect(play.value).toBe('recorded');
    expect(shift.value).toBe('recorded');
  });
});

describe('the call card between calls', () => {
  it('opens a shift, strips every digit off the card and stores a code that replays it', async () => {
    await paint();
    byText('button.tape-name', 'Ghost on the Menu').click();
    byText('button.commit', 'Shift').click();

    const card = app().querySelector('.call-card')!;
    const lines = [...card.querySelectorAll('li.tape-row')].map((li) => li.textContent ?? '');
    expect(lines.length).toBeGreaterThan(1);
    // G8, G10: the card is header words, and a tape name or a header value
    // carrying a digit is stripped rather than printed.
    expect(/\d/.test(lines.join(' '))).toBe(false);
    expect(ROSTER).toContain(lines[0]);

    // The code is on the card and in this browser's prefs, and it decodes
    // back to the four calls this shift drew, in order.
    const code = readPrefs().shiftCode;
    expect(code).toBeTruthy();
    expect(app().textContent).toContain(`shift ${code}`);
    const read = decodeShift(ROSTER, code!);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.draw.names).toHaveLength(4);
    expect(read.draw.names[0]).toBe(lines[0]);
    for (const name of read.draw.names) expect(ROSTER).toContain(name);
  });

  it('replays a shift from its code, and says so when the code is not one', async () => {
    await paint();
    byText('button.tape-name', 'Ghost on the Menu').click();
    const box = app().querySelector('#shift-code') as HTMLInputElement;
    const status = app().querySelector('#shift-code-status') as HTMLElement;

    box.value = 'not a shift code at all';
    box.dispatchEvent(new Event('input'));
    byText('button', 'Replay').click();
    expect(status.textContent).not.toBe('');
    expect(box.getAttribute('aria-invalid')).toBe('true');
    expect(app().querySelector('.call-card')).toBeNull();

    // A real one takes the page to the first call of the same four. The way
    // back to the menu is the card's own button, and the code the shift wrote
    // is waiting in the box there.
    byText('button.commit', 'Shift').click();
    const code = readPrefs().shiftCode!;
    const first = app().querySelector('.call-card li.tape-row')!.textContent;
    byText('button', 'Back to the cabinets').click();
    const again = app().querySelector('#shift-code') as HTMLInputElement;
    expect(again.value).toBe(code);
    again.dispatchEvent(new Event('input'));
    byText('button', 'Replay').click();
    expect(app().querySelector('.call-card li.tape-row')!.textContent).toBe(first);
  });
});
