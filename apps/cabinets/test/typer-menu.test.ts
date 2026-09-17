// @vitest-environment jsdom
//
// The menu, painted. What is checked here is the shape of the level list —
// one heading a stack in the corpus order, every level under its own stack
// with a difficulty word and no digit — and the endless row's third column,
// which names the seat that will sit or says a written user. The mount is
// stubbed: pressing Play is a pref write and a call, not a game.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_CORPUS,
  DEFAULT_PATTERNS,
  STACKS,
  WEAK_CLEAN,
  corpusDigestOf,
  corpusFingerprint,
  mintRunCode,
} from '@mcp-arcade-cabinets/vibe-typer';

import {
  STACK_WORDS,
  bandWord,
  mountVibeTyper,
  readVibePrefs,
  SEED_MAX,
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

  // A player returning to pick by hand could not see which products they had
  // already built, which is what made the end card's missing next hurt: the
  // menu re-selected the product they had just shipped and said nothing.
  it('marks a product this browser has already built, with a word in the third column', async () => {
    const first = LEVELS.filter((level) => level.stack === stackOrder()[0]!)[0]!;
    writeVibePrefs({ shipped: [first.product] });
    await paint();
    const rows = painted()[0]!.rows;
    expect(rows[0]!.name).toBe(first.product);
    expect(rows[0]!.cells).toEqual([bandWord(first.bandMin, first.bandMax), 'shipped']);
    // Nothing else carries the mark, and the list stays digit-free (G23).
    expect(rows.slice(1).every((r) => r.cells.length === 1)).toBe(true);
    expect(/\d/.test(wrap.querySelector('.vibe-levels')!.textContent ?? '')).toBe(false);
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

// One rule for the settings row: a setting is remembered the moment it is
// chosen. The sound was written from a `change` handler and the type, the
// keyboard and the music only inside `start()`, so a player who set the type
// and then switched cabinets, reloaded or left had lost it — while the
// setting beside it survived.
describe('the settings row', () => {
  it('remembers the type, the keyboard, the sound and the music without pressing Play', async () => {
    await paint();
    const pick = (label: string, value: string) => {
      const el = wrap.querySelector(`select[aria-label="${label}"]`) as HTMLSelectElement;
      el.value = value;
      el.dispatchEvent(new Event('change'));
    };
    pick('type size', 'huge');
    pick('keyboard', 'softtouch');
    pick('sound', 'off');
    pick('music', 'off');
    expect(vi.mocked(mountVibeTyper)).not.toHaveBeenCalled();
    const kept = readVibePrefs();
    expect(kept.font).toBe('huge');
    expect(kept.theme).toBe('softtouch');
    expect(kept.muted).toBe('on');
    expect(kept.music).toBe('off');

    // And the row opens on them next time.
    await paint();
    expect((wrap.querySelector('select[aria-label="type size"]') as HTMLSelectElement).value).toBe(
      'huge',
    );
    expect((wrap.querySelector('select[aria-label="music"]') as HTMLSelectElement).value).toBe(
      'off',
    );
  });
});

describe('the seed box', () => {
  /** Press Play with this in the box, and report the seed the run was given. */
  async function playWith(seed: string): Promise<number> {
    await paint();
    const box = wrap.querySelector('input[aria-label="seed or run code"]') as HTMLInputElement;
    box.value = seed;
    (wrap.querySelector('button.commit') as HTMLButtonElement).click();
    const calls = vi.mocked(mountVibeTyper).mock.calls;
    return calls[calls.length - 1]![1].seed;
  }

  it('plays a run code as the run it names, and refuses one with a typo', async () => {
    await paint();
    const box = wrap.querySelector('input[aria-label="seed or run code"]') as HTMLInputElement;
    const play = wrap.querySelector('button.commit') as HTMLButtonElement;
    // A code minted for an endless run at tier two: the box wins over the
    // menu's own tier and pick, and the code rides to the mount whole.
    const code = mintRunCode({
      seed: 77,
      tier: 2,
      endless: true,
      weak: WEAK_CLEAN,
      corpus: corpusDigestOf(corpusFingerprint(DEFAULT_CORPUS)),
    });
    box.value = code.toLowerCase();
    play.click();
    const calls = vi.mocked(mountVibeTyper).mock.calls;
    const opts = calls[calls.length - 1]![1];
    expect(opts.seed).toBe(77);
    expect(opts.tier).toBe(2);
    expect(opts.endless).toBe(true);
    expect(opts.code).toBe(code.toLowerCase());
    expect(box.value, 'kept whole, not cut to a seed').toBe(code.toLowerCase());
    // One wrong letter is told so under the box, and nothing mounts.
    const before = calls.length;
    box.value = code.slice(0, -1) + (code.endsWith('7') ? '8' : '7');
    play.click();
    expect(vi.mocked(mountVibeTyper).mock.calls.length).toBe(before);
    expect(wrap.querySelector('[aria-label="run code status"]')!.textContent).toBe(
      'that run code has a typo in it',
    );
  });

  it('plays, stores and shows one seed, however long it was typed', async () => {
    const long = 'a-very-long-seed-phrase';
    const played = await playWith(long);
    const kept = readVibePrefs().seed;
    // What is stored is what the box can hold …
    expect(kept).toBe(long.slice(0, SEED_MAX));
    expect(kept!.length).toBe(SEED_MAX);
    // … the box is left showing exactly that …
    expect(
      (wrap.querySelector('input[aria-label="seed or run code"]') as HTMLInputElement).value,
    ).toBe(kept);
    // … and it is the run that was played, so typing the stored seed back on
    // the menu replays it. The full phrase used to be played and its first
    // twelve characters stored, which hash to a different run.
    vi.mocked(mountVibeTyper).mockClear();
    localStorage.clear();
    expect(await playWith(kept!)).toBe(played);
  });

  it('leaves a seed that already fits alone', async () => {
    const short = 'blue-moon';
    const played = await playWith(short);
    expect(readVibePrefs().seed).toBe(short);
    vi.mocked(mountVibeTyper).mockClear();
    localStorage.clear();
    expect(await playWith(short)).toBe(played);
  });
});

describe('the endless entry’s seat', () => {
  it('names the tag the seat will sit, cloud first', async () => {
    stubTags(['qwen2.5:7b-instruct', 'kimi-test:cloud']);
    await paint();
    const seat = () => painted().at(-1)!.rows[0]!.cells[1];
    expect(seat()).toBe('looking for a model on this machine');
    await flush();
    expect(seat()).toBe('the user is kimi-test:cloud');
  });

  it('says a written user when no daemon answers', async () => {
    await paint();
    await flush();
    expect(painted().at(-1)!.rows[0]!.cells[1]).toBe('a written user');
  });

  it('says a written user when this browser turned the seat off, and never looks', async () => {
    writeVibePrefs({ seat: 'off' });
    stubTags(['kimi-test:cloud']);
    await paint();
    // The pref used to be consulted only after the answer came back, so a
    // player who had turned the model user off still paid a request and five
    // seconds of 'looking' on every paint of this menu.
    expect(painted().at(-1)!.rows[0]!.cells[1]).toBe('a written user');
    expect(globalThis.fetch).not.toHaveBeenCalled();
    await flush();
    expect(painted().at(-1)!.rows[0]!.cells[1]).toBe('a written user');
  });

  // Last in the file on purpose: it rebuilds the menu over a `seats` module
  // whose `LOCAL_SEATS` is false — the Pages build — and what it leaves in
  // the module registry would be wrong for anything after it. The switch used
  // to be mocked on `../src/vibe-typer`; it lives in `../src/seats` now,
  // which is the whole point of that move — the menu asks whether a seat
  // exists without importing the typing cabinet.
  it('says a written user where no seat can sit, and never looks', async () => {
    vi.doMock('../src/seats', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../src/seats')>();
      return { ...actual, LOCAL_SEATS: false };
    });
    vi.doMock('../src/vibe-typer', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../src/vibe-typer')>();
      return { ...actual, mountVibeTyper: vi.fn() };
    });
    vi.resetModules();
    const { vibeMenu } = await import('../src/main');
    draw(vibeMenu);
    const endless = painted().at(-1)!;
    expect(endless.head).toBe('every stack');
    expect(endless.rows[0]!.name).toBe('Endless');
    expect(endless.rows[0]!.cells).toEqual(['climbing', 'a written user']);
    await flush();
    expect(painted().at(-1)!.rows[0]!.cells[1]).toBe('a written user');
    expect(globalThis.fetch).not.toHaveBeenCalled();
    vi.doUnmock('../src/vibe-typer');
    vi.doUnmock('../src/seats');
    vi.resetModules();
  });
});
