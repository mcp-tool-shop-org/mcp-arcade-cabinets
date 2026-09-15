// @vitest-environment jsdom
//
// The menu, painted. What is checked here is the shape of the level list —
// one heading a stack in the corpus order, every level under its own stack
// with a difficulty word and no digit — and the endless row's third column,
// which names the seat that will sit or says the authored user. The mount is
// stubbed: pressing Play is a pref write and a call, not a game.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_PATTERNS, STACKS } from '@mcp-arcade-cabinets/vibe-typer';

import {
  STACK_WORDS,
  bandWord,
  mountVibeTyper,
  readVibePrefs,
  writeVibePrefs,
} from '../src/vibe-typer';

vi.mock('../src/vibe-typer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/vibe-typer')>();
  return {
    ...actual,
    mountVibeTyper: vi.fn(() => ({
      unmount: () => undefined,
      tick: () => undefined,
      debug: () => ({ supplied: 0, asked: 0, accepted: 0, refused: 0, music: null }),
    })),
  };
});

const LEVELS = DEFAULT_PATTERNS.levels.levels;

/** The stacks with a listed level, in the order the menu must print them. */
function stackOrder(): string[] {
  return STACKS.filter((stack) => LEVELS.some((level) => level.stack === stack));
}

function flush(times = 6): Promise<void> {
  let p = Promise.resolve();
  for (let i = 0; i < times; i++) p = p.then(() => new Promise<void>((r) => setTimeout(r, 0)));
  return p;
}

/** A daemon with these tags, and nothing else reachable. */
function stubTags(names: string[]): void {
  globalThis.fetch = vi.fn((url: string) => {
    if (String(url).includes('/ollama/api/tags')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ models: names.map((name) => ({ name })) }),
      } as Response);
    }
    return Promise.reject(new Error('nothing else answers here'));
  }) as never;
}

let wrap: HTMLElement;

function draw(vibeMenu: (into: HTMLElement) => void): HTMLElement {
  wrap = document.createElement('section');
  wrap.className = 'column';
  document.body.replaceChildren(wrap);
  vibeMenu(wrap);
  return wrap;
}

async function paint(): Promise<HTMLElement> {
  const { vibeMenu } = await import('../src/main');
  return draw(vibeMenu);
}

/** The heading and its rows, in the order they were painted. */
function painted(): { head: string; rows: { name: string; cells: string[] }[] }[] {
  const out: { head: string; rows: { name: string; cells: string[] }[] }[] = [];
  const groups = wrap.querySelector('.vibe-levels')!;
  for (const node of [...groups.children]) {
    if (node.classList.contains('vibe-group')) {
      out.push({ head: node.textContent ?? '', rows: [] });
      continue;
    }
    const group = out[out.length - 1]!;
    for (const li of [...node.querySelectorAll('li.tape-row')]) {
      group.rows.push({
        name: li.querySelector('.tape-name')!.textContent ?? '',
        cells: [...li.querySelectorAll('.tape-diff')].map((c) => c.textContent ?? ''),
      });
    }
  }
  return out;
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(mountVibeTyper).mockClear();
  globalThis.fetch = vi.fn(() => Promise.reject(new Error('no daemon here'))) as never;
});

// The modules are NOT reset between these: `main` and the mocked
// `vibe-typer` have to stay one instance, or the mount spy the test holds is
// not the one the menu calls. The one test that needs a differently-built
// module resets them itself, and runs last for that reason.
afterEach(() => {
  document.body.replaceChildren();
});

describe('the level list, by stack', () => {
  it('gives every stack with a level one heading, in the corpus order', async () => {
    await paint();
    const groups = painted();
    expect(groups.map((g) => g.head)).toEqual([
      ...stackOrder().map((stack) => STACK_WORDS[stack] ?? stack),
      'every stack',
    ]);
  });

  it('puts every level under its own stack, in the levers’ order, with its difficulty word', async () => {
    await paint();
    const groups = painted();
    stackOrder().forEach((stack, i) => {
      const want = LEVELS.filter((level) => level.stack === stack);
      const got = groups[i]!;
      expect(got.rows.map((r) => r.name)).toEqual(want.map((level) => level.product));
      expect(got.rows.map((r) => r.cells[0])).toEqual(
        want.map((level) => bandWord(level.bandMin, level.bandMax)),
      );
      // The stack is the heading's job now; a row says the product and the
      // difficulty word and stops there.
      expect(got.rows.every((r) => r.cells.length === 1)).toBe(true);
    });
    // Every listed level is on the menu, and none of them twice.
    expect(groups.slice(0, -1).reduce((n, g) => n + g.rows.length, 0)).toBe(LEVELS.length);
  });

  it('keeps digits off the list, headings and all (G23)', async () => {
    await paint();
    expect(/\d/.test(wrap.querySelector('.vibe-levels')!.textContent ?? '')).toBe(false);
  });

  it('persists the index of a level picked in the second group', async () => {
    await paint();
    const second = stackOrder()[1]!;
    const want = LEVELS.findIndex((level) => level.stack === second);
    expect(want).toBeGreaterThan(0);

    const lists = [...wrap.querySelectorAll('.vibe-levels ul.tape-list')];
    const row = lists[1]!.querySelector('.tape-name') as HTMLButtonElement;
    expect(row.textContent).toBe(LEVELS[want]!.product);
    row.click();
    (wrap.querySelector('button.commit') as HTMLButtonElement).click();

    expect(readVibePrefs().level).toBe(want);
    expect(readVibePrefs().endless).toBe('off');
    const opts = vi.mocked(mountVibeTyper).mock.calls[0]![1];
    expect(opts.levelIndex).toBe(want);
    expect(opts.endless).toBe(false);
  });
});

describe('the endless entry’s seat', () => {
  it('names the tag the seat will sit, cloud first', async () => {
    stubTags(['qwen2.5:7b-instruct', 'kimi-test:cloud']);
    await paint();
    const seat = () => painted().at(-1)!.rows[0]!.cells[1];
    expect(seat()).toBe('looking for a daemon');
    await flush();
    expect(seat()).toBe('the user is kimi-test:cloud');
  });

  it('says the authored user when no daemon answers', async () => {
    await paint();
    await flush();
    expect(painted().at(-1)!.rows[0]!.cells[1]).toBe('the authored user');
  });

  it('says the authored user when this browser turned the seat off', async () => {
    writeVibePrefs({ seat: 'off' });
    stubTags(['kimi-test:cloud']);
    await paint();
    await flush();
    expect(painted().at(-1)!.rows[0]!.cells[1]).toBe('the authored user');
  });

  // Last in the file on purpose: it rebuilds the menu over a `vibe-typer`
  // whose `LOCAL_SEATS` is false — the Pages build — and what it leaves in
  // the module registry would be wrong for anything after it.
  it('says the authored user where no seat can sit, and never looks', async () => {
    vi.doMock('../src/vibe-typer', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../src/vibe-typer')>();
      return { ...actual, LOCAL_SEATS: false, mountVibeTyper: vi.fn() };
    });
    vi.resetModules();
    const { vibeMenu } = await import('../src/main');
    draw(vibeMenu);
    const endless = painted().at(-1)!;
    expect(endless.head).toBe('every stack');
    expect(endless.rows[0]!.name).toBe('Endless');
    expect(endless.rows[0]!.cells).toEqual(['climbing', 'the authored user']);
    await flush();
    expect(painted().at(-1)!.rows[0]!.cells[1]).toBe('the authored user');
    expect(globalThis.fetch).not.toHaveBeenCalled();
    vi.doUnmock('../src/vibe-typer');
    vi.resetModules();
  });
});
