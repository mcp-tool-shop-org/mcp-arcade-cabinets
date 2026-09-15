// @vitest-environment jsdom
//
// The mount, played. jsdom has no canvas and no Web Audio, so both are
// stubbed: the point of this test is the field's wiring — a keystroke
// reaching the sim, the chat and the editor following it, no digit on the
// chat pane (G23), and a clean unmount.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_CORPUS,
  DEFAULT_PATTERNS,
  createRun,
  endlessPeek,
  gateCode,
  planOf,
  VALUE_TOLERANCE,
} from '@mcp-arcade-cabinets/vibe-typer';

import { DEFAULT_MUSIC, isMusicMode } from '../src/typer-audio';
import {
  FONT_SIZES,
  mountVibeTyper,
  readVibePrefs,
  writeVibePrefs,
  type VibeMount,
} from '../src/vibe-typer';

const STEP = 1 / 60;

/** Enough of a 2d context to draw into and read nothing back. */
function canvasStub(): CanvasRenderingContext2D {
  const noop = () => undefined;
  const target: Record<string, unknown> = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
  };
  return new Proxy(target, {
    get(obj, prop: string) {
      if (prop in obj) return obj[prop];
      return noop;
    },
    set(obj, prop: string, value) {
      obj[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

/** Enough of an AudioContext to build the engine over and hear nothing. */
class FakeAudioContext {
  currentTime = 0;
  sampleRate = 44100;
  state = 'running';
  destination = {};
  private param() {
    return {
      value: 0,
      setValueAtTime: () => undefined,
      exponentialRampToValueAtTime: () => undefined,
      linearRampToValueAtTime: () => undefined,
      cancelScheduledValues: () => undefined,
    };
  }
  createGain() {
    return { gain: this.param(), connect: () => undefined, disconnect: () => undefined };
  }
  createOscillator() {
    return {
      type: 'sine',
      frequency: this.param(),
      connect: () => undefined,
      start: () => undefined,
      stop: () => undefined,
    };
  }
  createBufferSource() {
    return {
      buffer: null,
      playbackRate: this.param(),
      connect: () => undefined,
      start: () => undefined,
      stop: () => undefined,
    };
  }
  createBiquadFilter() {
    return { type: 'bandpass', frequency: this.param(), Q: this.param(), connect: () => undefined };
  }
  createBuffer(_channels: number, frames: number) {
    const data = new Float32Array(frames);
    return { duration: frames / this.sampleRate, getChannelData: () => data };
  }
  decodeAudioData() {
    return Promise.reject(new Error('no decoder here'));
  }
  resume() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
}

function press(key: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

function run(mount: VibeMount, steps: number): void {
  for (let i = 0; i < steps; i++) mount.tick(STEP);
}

let mount: VibeMount | null = null;
let root: HTMLElement;

beforeEach(() => {
  localStorage.clear();
  root = document.createElement('main');
  document.body.replaceChildren(root);
  HTMLCanvasElement.prototype.getContext = vi.fn(() =>
    canvasStub(),
  ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  (globalThis as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
  globalThis.fetch = vi.fn(() => Promise.reject(new Error('no samples in a test'))) as never;
});

afterEach(() => {
  mount?.unmount();
  mount = null;
});

describe('the field, mounted', () => {
  it('takes a typed reply and moves on to the code', () => {
    const expected = planOf(createRun({ seed: 1, tier: 0, endless: false, levelIndex: 0 }));
    const reply = expected.requests[0]!.reply;
    mount = mountVibeTyper(root, {
      tier: 0,
      endless: false,
      levelIndex: 0,
      seed: 1,
      agentName: 'Claudette',
      theme: 'mechanical',
      integration: [],
      onExit: () => undefined,
      startAudio: false,
    });
    // The ask is already in the chat; one step turns the reply into a target.
    const chat = root.querySelector('.vibe-chat')!;
    expect(chat.textContent ?? '').not.toBe('');
    run(mount, 1);
    expect(root.querySelector('.vibe-beat')!.textContent).toBe('your reply');

    for (const ch of reply) {
      press(ch);
      run(mount, 1);
    }
    press('Enter');
    run(mount, 2);

    // The reply landed in the chat as the agent's, and the code is in hand.
    run(mount, 60);
    expect(chat.textContent).toContain(reply.slice(0, 8));
    expect(root.querySelector('.vibe-beat')!.textContent).toBe('the code');
    expect(root.querySelector('.vibe-code .vibe-live')).not.toBeNull();
  });

  it('keeps a digit off the chat pane', () => {
    mount = mountVibeTyper(root, {
      tier: 0,
      endless: false,
      levelIndex: 0,
      seed: 1,
      agentName: 'Claudette',
      theme: 'mechanical',
      integration: [],
      onExit: () => undefined,
      startAudio: false,
    });
    const state = createRun({ seed: 1, tier: 0, endless: false, levelIndex: 0 });
    const reply = planOf(state).requests[0]!.reply;
    run(mount, 1);
    for (const ch of reply) {
      press(ch);
      run(mount, 1);
    }
    press('Enter');
    run(mount, 120);
    const chat = root.querySelector('.vibe-chat')!;
    expect(chat.textContent ?? '').not.toBe('');
    expect(/\d/.test(chat.textContent ?? '')).toBe(false);
    // The agent's name is in the header, and the header is words too.
    expect(root.querySelector('.vibe-chat .vibe-head')!.textContent).toContain('Claudette');
  });

  it('shows the scoreboard and nothing that counts the typist', () => {
    mount = mountVibeTyper(root, {
      tier: 0,
      endless: false,
      levelIndex: 0,
      seed: 1,
      agentName: 'Claudette',
      theme: 'mechanical',
      integration: [],
      onExit: () => undefined,
      startAudio: false,
    });
    run(mount, 30);
    const board = root.querySelector('.vibe-board')!.textContent ?? '';
    expect(board).toContain('valuation');
    expect(board).toContain('vibes');
    expect(board).toContain('streak');
    expect(board).toContain('context');
    const field = root.textContent ?? '';
    for (const barred of ['accuracy', 'words a minute', 'wpm', 'errors', 'mistakes']) {
      expect(field.toLowerCase(), barred).not.toContain(barred);
    }
  });

  it('takes the type size from the options and the beat word from the levers', () => {
    mount = mountVibeTyper(root, {
      tier: 0,
      endless: false,
      levelIndex: 0,
      seed: 1,
      agentName: 'Claudette',
      theme: 'mechanical',
      font: 'huge',
      integration: [],
      onExit: () => undefined,
      startAudio: false,
    });
    const field = root.querySelector('.vibe') as HTMLElement;
    expect(field.style.getPropertyValue('--vibe-font')).toBe(FONT_SIZES.huge);

    // The beat word is the lever's, never a constant in the shell.
    const beats = DEFAULT_PATTERNS.cabinet.words.beats;
    expect(root.querySelector('.vibe-beat')!.textContent).toBe(beats.request);
    run(mount, 1);
    expect(root.querySelector('.vibe-beat')!.textContent).toBe(beats.reply);
  });

  it('hands the music setting to the engine', () => {
    mount = mountVibeTyper(root, {
      tier: 0,
      endless: false,
      levelIndex: 0,
      seed: 1,
      agentName: 'Claudette',
      theme: 'mechanical',
      music: 'off',
      integration: [],
      onExit: () => undefined,
      startAudio: true,
    });
    run(mount, 30);
    expect(mount.debug().music).toBe('off');
  });

  it('takes the calm bed when nobody has said otherwise', () => {
    mount = mountVibeTyper(root, {
      tier: 0,
      endless: false,
      levelIndex: 0,
      seed: 1,
      agentName: 'Claudette',
      theme: 'mechanical',
      integration: [],
      onExit: () => undefined,
      startAudio: true,
    });
    run(mount, 30);
    expect(DEFAULT_MUSIC).toBe('soft');
    expect(mount.debug().music).toBe(DEFAULT_MUSIC);
  });

  it('keeps the music choice the menu wrote under vibe.prefs', () => {
    // The menu writes the select's value with the rest of the patch; a mount
    // that is given no music reads it back from here.
    writeVibePrefs({ music: 'on' });
    expect(readVibePrefs().music).toBe('on');
    mount = mountVibeTyper(root, {
      tier: 0,
      endless: false,
      levelIndex: 0,
      seed: 1,
      agentName: 'Claudette',
      theme: 'mechanical',
      integration: [],
      onExit: () => undefined,
      startAudio: true,
    });
    run(mount, 30);
    expect(mount.debug().music).toBe('on');

    // A word that is not a mode is not a mode: the stored pref is dropped.
    localStorage.setItem('vibe.prefs', JSON.stringify({ music: 'loud' }));
    expect(readVibePrefs().music).toBeUndefined();
    expect(isMusicMode('loud')).toBe(false);
  });

  it('stops listening when it is unmounted', () => {
    mount = mountVibeTyper(root, {
      tier: 0,
      endless: false,
      levelIndex: 0,
      seed: 1,
      agentName: 'Claudette',
      theme: 'mechanical',
      integration: [],
      onExit: () => undefined,
      startAudio: false,
    });
    run(mount, 1);
    const live = root.querySelector('.vibe-live')!.textContent ?? '';
    press('a');
    run(mount, 2);
    const typedOnce = root.querySelector('.vibe-live')!.textContent ?? '';
    expect(typedOnce).not.toBe(live);
    mount.unmount();
    const frozen = root.innerHTML;
    press('b');
    press('c');
    expect(root.innerHTML).toBe(frozen);
    // A tick after the unmount is a no-op too, so a stray frame cannot play on.
    mount.tick(STEP);
    expect(root.innerHTML).toBe(frozen);
    mount = null;
  });

  it('leaves on a held Escape and not on a tap', () => {
    let left = 0;
    mount = mountVibeTyper(root, {
      tier: 0,
      endless: false,
      levelIndex: 0,
      seed: 1,
      agentName: 'Claudette',
      theme: 'mechanical',
      integration: [],
      onExit: () => {
        left += 1;
      },
      startAudio: false,
    });
    press('Escape');
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' }));
    run(mount, 60);
    expect(left).toBe(0);
    // Held: the clock moves past the hold and the field lets go.
    press('Escape');
    const later = performance.now() + 1000;
    const spy = vi.spyOn(performance, 'now').mockReturnValue(later);
    try {
      mount.tick(STEP);
      expect(left).toBe(1);
    } finally {
      spy.mockRestore();
    }
    mount = null;
  });
});

// ——— the endless seat (G28 as slice 3 amends it) ——————————————————————————
//
// The shell prefetches the next level's requests from the node-side seat
// while the current one is typed. What is measured here is the wiring: a
// gated answer reaches the run's buffer, a refused one does not, and the
// field is never told either way (G17, G23).

const SEED = 11;

/** The stack and band the endless ladder will draw for the level after the first. */
function nextLevel() {
  return endlessPeek({ set: DEFAULT_PATTERNS, seed: SEED, tier: 0, levelIndex: 1 });
}

/** A real corpus snippet the gate is happy with for that level. */
function goodCode(): string {
  const def = nextLevel();
  for (const snippet of DEFAULT_CORPUS.byStack[def.stack] ?? []) {
    if (snippet.band < def.bandMin || snippet.band > def.bandMax) continue;
    const r = gateCode(
      { ask: 'can you make it do the thing', code: snippet.code, title: 'a thing', notes: [] },
      {
        stack: def.stack,
        bandMin: def.bandMin,
        bandMax: def.bandMax,
        corpus: DEFAULT_CORPUS,
        set: DEFAULT_PATTERNS.difficulty,
        tolerance: VALUE_TOLERANCE,
      },
    );
    if (r.ok) return snippet.code;
  }
  throw new Error('no corpus snippet for the next endless level');
}

function flush(times = 6): Promise<void> {
  let p = Promise.resolve();
  for (let i = 0; i < times; i++) p = p.then(() => new Promise<void>((r) => setTimeout(r, 0)));
  return p;
}

/** A daemon with one tag, and a seat that answers with `request`. */
function stubSeat(request: unknown) {
  const posted: unknown[] = [];
  globalThis.fetch = vi.fn((url: string, init?: { body?: string }) => {
    if (String(url).includes('/ollama/api/tags')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ models: [{ name: 'kimi-test:cloud' }] }),
      } as Response);
    }
    if (String(url).includes('/cabinet/endless')) {
      posted.push(JSON.parse(init?.body ?? '{}'));
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ request, model: 'kimi-test:cloud', tier: 'cloud', ms: 1 }),
      } as Response);
    }
    return Promise.reject(new Error('no samples in a test'));
  }) as never;
  return posted;
}

function mountEndless(): VibeMount {
  return mountVibeTyper(root, {
    tier: 0,
    endless: true,
    seed: SEED,
    agentName: 'Claudette',
    theme: 'mechanical',
    integration: [],
    onExit: () => undefined,
    startAudio: false,
  });
}

describe('the endless seat, mounted', () => {
  it('feeds a gated request into the run and tells the field nothing', async () => {
    const posted = stubSeat({
      ask: 'can you make {product} remember all of my plants',
      code: goodCode(),
      title: 'a list of plants',
      notes: ['it walks the list once'],
      product: 'a diary for houseplants',
    });
    mount = mountEndless();
    await flush();
    run(mount, 2);
    await flush();
    const seen = mount.debug();
    expect(seen.asked).toBeGreaterThan(0);
    expect(seen.accepted).toBeGreaterThan(0);
    expect(seen.supplied).toBeGreaterThan(0);
    expect(seen.refused).toBe(0);
    // Fact-blind in (G12): the product, the language and the band as
    // numbers the route bounds, and nothing else at all.
    const view = (posted[0] as { view: Record<string, unknown> }).view;
    expect(Object.keys(view).sort()).toEqual([
      'bandMax',
      'bandMin',
      'newLevel',
      'product',
      'recent',
      'stack',
      'weak',
    ]);
    expect(view.stack).toBe(nextLevel().stack);
    expect(view.newLevel).toBe(true);
    // The seat's name is in the controls row and nowhere near the field.
    const controls = root.querySelector('[data-vibe-seat]')!;
    expect(controls).not.toBeNull();
    expect(controls.textContent).toContain('Model user');
    expect(root.querySelector('.vibe-chat')!.textContent).not.toContain('kimi');
    expect(root.querySelector('.vibe-board')!.textContent).not.toContain('kimi');
  });

  it('drops a request the gate refuses and plays on', async () => {
    stubSeat({
      ask: 'can you make {product} remember all of my plants',
      code: 'SELECT * FROM plants;',
      title: 'a list of plants',
      notes: [],
      product: 'a diary for houseplants',
    });
    mount = mountEndless();
    await flush();
    run(mount, 2);
    await flush();
    const seen = mount.debug();
    expect(seen.asked).toBeGreaterThan(0);
    expect(seen.accepted).toBe(0);
    expect(seen.supplied).toBe(0);
    expect(seen.refused).toBeGreaterThan(0);
    // Nothing about the refusal reaches the player.
    expect(root.querySelector('.vibe-chat')!.textContent).not.toContain('refused');
  });

  it('never sits at all in a listed level', async () => {
    stubSeat({ ask: 'x', code: 'y', title: 'z', notes: [] });
    mount = mountVibeTyper(root, {
      tier: 0,
      endless: false,
      levelIndex: 0,
      seed: SEED,
      agentName: 'Claudette',
      theme: 'mechanical',
      integration: [],
      onExit: () => undefined,
      startAudio: false,
    });
    await flush();
    run(mount, 4);
    await flush();
    // No engine was built here (`startAudio` is false and no key was pressed),
    // so the bed reports nothing at all.
    expect(mount.debug()).toEqual({
      supplied: 0,
      asked: 0,
      accepted: 0,
      refused: 0,
      music: null,
    });
    expect(root.querySelector('[data-vibe-seat]')).toBeNull();
  });
});
