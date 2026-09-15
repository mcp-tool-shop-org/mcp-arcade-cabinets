// @vitest-environment jsdom
//
// The mount, played. jsdom has no canvas and no Web Audio, so both are
// stubbed: the point of this test is the field's wiring — a keystroke
// reaching the sim, the chat and the editor following it, no digit on the
// chat pane (G23), and a clean unmount.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createRun, planOf } from '@mcp-arcade-cabinets/vibe-typer';

import { mountVibeTyper, type VibeMount } from '../src/vibe-typer';

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
