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
    const shift = app().querySelector('#shift-tier') as HTMLElement;

    // Nothing is stored yet, and every fixture tape's header derives to the
    // study rung, where the formations neither fire nor dive: opening there
    // reads as a broken game, so a browser that has never played opens on the
    // seat and the Shift row opens with it.
    expect(readPrefs().difficulty).toBeUndefined();
    expect(play.value).toBe('seat');
    // The shift's rung is a line of text, not a second select with `disabled`
    // set: a dead control that Tab skips and whose `title` reached nobody.
    expect(app().querySelector('select[aria-label="shift difficulty"]')).toBeNull();
    expect(shift.textContent).toContain('seat');

    // And it follows the Play row, which is the thing the dead select was
    // trying to say.
    play.value = 'hardcore';
    play.dispatchEvent(new Event('change'));
    expect(shift.textContent).toContain('hardcore');

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
    const shift = app().querySelector('#shift-tier') as HTMLElement;
    expect(play.value).toBe('recorded');
    expect(shift.textContent).toContain('as recorded');
  });
});

// A player who worked their way down the roster came back to the top of it,
// while their rung, their feel, their shake, their seat, their voice and their
// last shift code had all survived the visit.
describe('where the player was on the roster', () => {
  it('remembers the tape they picked and opens there next time', async () => {
    await paint();
    byText('button.tape-name', 'Ghost on the Menu').click();
    const names = [...app().querySelectorAll('button.tape-name')] as HTMLButtonElement[];
    const later = names[names.length - 1]!;
    const chosen = later.textContent ?? '';
    later.click();
    expect(readPrefs().tape).toBe(chosen);

    await paint();
    byText('button.tape-name', 'Ghost on the Menu').click();
    const picked = app().querySelector(
      'ul.tape-list:not(.cabinet-cards) li.tape-row.picked .tape-name',
    );
    expect(picked?.textContent).toBe(chosen);
  });

  it('falls back to the tape the cabinet opens on when the name is not on the roster', async () => {
    writePrefs({ tape: 'a tape that went away' });
    await paint();
    byText('button.tape-name', 'Ghost on the Menu').click();
    const picked = app().querySelector(
      'ul.tape-list:not(.cabinet-cards) li.tape-row.picked .tape-name',
    );
    expect(picked?.textContent).toBe('naive-ndjson');
  });
});

describe('why this tape', () => {
  it('is a button that opens the text, for a touch player as much as anyone', async () => {
    await paint();
    byText('button.tape-name', 'Ghost on the Menu').click();
    const info = app().querySelector('button.tape-info') as HTMLButtonElement;
    const why = app().querySelector('.tape-why') as HTMLElement;
    // It called itself a button before with no handler on it at all: the text
    // was revealed by :hover and :focus, which a touch player cannot perform.
    expect(info.getAttribute('aria-expanded')).toBe('false');
    expect(why.hidden).toBe(true);
    // The text is its sibling, not its child: as a child it was the button's
    // own accessible name.
    expect(info.contains(why)).toBe(false);
    expect(info.getAttribute('aria-controls')).toBe(why.id);
    info.click();
    expect(info.getAttribute('aria-expanded')).toBe('true');
    expect(why.hidden).toBe(false);
    expect((why.textContent ?? '').length).toBeGreaterThan(0);
    info.click();
    expect(why.hidden).toBe(true);
  });
});

describe('the switch at the top', () => {
  it('is a tab list, so the change of cabinet is announced without moving focus', async () => {
    await paint();
    const list = app().querySelector('[role="tablist"]')!;
    const tabs = [...list.querySelectorAll('[role="tab"]')] as HTMLButtonElement[];
    expect(tabs).toHaveLength(2);
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('false');
    tabs[1]!.click();
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('false');
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
    // The panel the tabs control is the page under them.
    expect(tabs[0]!.getAttribute('aria-controls')).toBe('cabinet-body');
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

// ——— the front door ————————————————————————————————————————————————————————
// Stage D. What a first visit sees: the document's first heading used to be a
// cabinet's, below a tab list with no visible name at all, and the page's own
// title appeared nowhere on screen. Under it came three gray paragraphs in a
// row, the third of them ninety words in one block.

describe('what a first visit sees', () => {
  it('names the switch on the page and demotes the cabinet under it', async () => {
    await paint();
    const heads = [...app().querySelectorAll('h1, h2')].map((h) => ({
      tag: h.tagName.toLowerCase(),
      text: h.textContent,
    }));
    // The page is the arcade; a cabinet is a section of it.
    expect(heads[0]).toEqual({ tag: 'h1', text: 'the cabinets' });
    expect(heads.some((h) => h.tag === 'h2' && h.text === 'Ghost on the Menu')).toBe(true);
    expect(heads.some((h) => h.tag === 'h1' && h.text === 'Ghost on the Menu')).toBe(false);
    // And the tab list takes its name from the heading rather than carrying a
    // second one only a reader's software ever hears.
    const tabs = app().querySelector('[role="tablist"]')!;
    expect(tabs.getAttribute('aria-label')).toBeNull();
    expect(tabs.getAttribute('aria-labelledby')).toBe('cabinet-switch');
  });

  it('breaks the intro in two and gives the prose a measure', async () => {
    await paint();
    const prose = [...app().querySelectorAll('p.prose')].map((n) => n.textContent ?? '');
    // Three paragraphs, not two, and the long block is now two of them: the
    // wave and what is hidden in it, then what it costs you.
    expect(prose.length).toBe(3);
    expect(prose[1]).toContain('Every wave is one experiment');
    expect(prose[1]).not.toContain('lamps');
    expect(prose[2]!.startsWith('Hit one and it is yours')).toBe(true);
    expect(prose[2]).toContain('Three lamps');
    // Only the second half moves with the rung.
    const play = app().querySelector('select[aria-label="difficulty"]') as HTMLSelectElement;
    play.value = 'hardcore';
    play.dispatchEvent(new Event('change'));
    const after = [...app().querySelectorAll('p.prose')].map((n) => n.textContent ?? '');
    expect(after[1]).toBe(prose[1]);
    expect(after[2]).toContain('One lamp and falling plates');
  });

  it('says what a shift is in the page, not only on hover', async () => {
    await paint();
    const shift = byText('button', 'Shift') as HTMLButtonElement;
    // A `title` reaches a mouse player and nobody else: no hover on a touch
    // screen, and a reader's software passes it over.
    expect(shift.getAttribute('aria-describedby')).toBe('shift-what');
    const what = app().querySelector('#shift-what')!;
    expect(what.textContent).toBe(shift.title);
    expect(what.className).toBe('offscreen');
    expect(what.textContent).toContain('calls drawn from the roster');
  });
});
