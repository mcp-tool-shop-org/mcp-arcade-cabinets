// @vitest-environment jsdom
//
// Ghost's mount, wired. There was no test file for `src/ghost.ts` at all —
// 1181 lines holding the mount, the teardown, the seats and the restart — and
// both defects fixed in this pass sat in that untested half. jsdom has no
// canvas, no Web Audio and no animation clock, so all three are stubbed: what
// is checked here is the wiring, not the game. The play-through belongs to
// `pnpm test:play ghost`.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TAPES } from '../src/tapes';
import { admitIntents, mountGhost, newQueueClock, queueDue } from '../src/ghost';

/** Enough of a 2d context to draw into and read nothing back. */
function canvasStub(): CanvasRenderingContext2D {
  const noop = () => undefined;
  const target: Record<string, unknown> = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    imageSmoothingEnabled: true,
    canvas: { width: 0, height: 0 },
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

type Handler = { type: string; fn: EventListenerOrEventListenerObject };

let root: HTMLElement;
let added: Handler[];
let removed: Handler[];
/** Every abort signal the mount handed to `fetch`, by the URL it asked for. */
let signals: { url: string; signal: AbortSignal | undefined }[];

beforeEach(() => {
  localStorage.clear();
  root = document.createElement('main');
  document.body.replaceChildren(root);
  added = [];
  removed = [];
  signals = [];
  HTMLCanvasElement.prototype.getContext = vi.fn(() =>
    canvasStub(),
  ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  // jsdom has no media pipeline and says so loudly on every take.
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
  // No animation clock: the frame loop never runs, so nothing here is timing.
  globalThis.requestAnimationFrame = vi.fn(() => 1) as unknown as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = vi.fn() as unknown as typeof cancelAnimationFrame;
  globalThis.fetch = vi.fn((url: string, init?: RequestInit) => {
    signals.push({ url: String(url), signal: init?.signal ?? undefined });
    return Promise.reject(new Error('nothing answers in a test'));
  }) as never;
  const addWas = window.addEventListener.bind(window);
  const removeWas = window.removeEventListener.bind(window);
  vi.spyOn(window, 'addEventListener').mockImplementation(((
    type: string,
    fn: EventListenerOrEventListenerObject,
    opts?: unknown,
  ) => {
    added.push({ type, fn });
    addWas(type as keyof WindowEventMap, fn as EventListener, opts as never);
  }) as never);
  vi.spyOn(window, 'removeEventListener').mockImplementation(((
    type: string,
    fn: EventListenerOrEventListenerObject,
    opts?: unknown,
  ) => {
    removed.push({ type, fn });
    removeWas(type as keyof WindowEventMap, fn as EventListener, opts as never);
  }) as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

/** The first fixture tape, mounted, with nothing held back. */
function mount() {
  const entry = TAPES[0]!;
  return mountGhost(root, entry.name, entry.tape, () => undefined);
}

describe('the mount, taken down', () => {
  it('gives back every window listener it took', () => {
    const game = mount();
    const took = added.filter((h) => ['keydown', 'keyup', 'resize'].includes(h.type));
    expect(took.map((h) => h.type).sort()).toEqual(['keydown', 'keyup', 'resize']);
    game.unmount();
    for (const h of took) {
      expect(
        removed.some((r) => r.type === h.type && r.fn === h.fn),
        `${h.type} was taken and never given back`,
      ).toBe(true);
    }
  });

  it('aborts what it has in flight', () => {
    const game = mount();
    const tags = signals.filter((s) => s.url.includes('/ollama/api/tags'));
    expect(tags.length).toBeGreaterThan(0);
    for (const s of tags) expect(s.signal?.aborted).toBe(false);
    game.unmount();
    for (const s of tags) expect(s.signal?.aborted).toBe(true);
  });
});

describe('a restart, and what belongs to the round', () => {
  it('hands the new round a prefetch clock of its own', () => {
    const game = mount();
    // A round that asked for boss intents late on its own clock, with one
    // still in flight — which is where a restart actually happens (the end
    // scene's click, or a difficulty change mid-round).
    const before = game.debug().queue;
    before.lastAsk = 140;
    before.busy = true;

    const difficulty = root.querySelector('select[aria-label="difficulty"]') as HTMLSelectElement;
    expect(difficulty).not.toBeNull();
    difficulty.value = 'live';
    difficulty.dispatchEvent(new Event('change'));

    const after = game.debug().queue;
    // A fresh round begins at t = 0. Carried over, `lastAsk` sits in its
    // future and the gate stays shut for most of the new round; `busy` left
    // true shuts it outright until an answer that belongs to the old round
    // comes back.
    expect(after).not.toBe(before);
    expect(after.lastAsk).toBe(Number.NEGATIVE_INFINITY);
    expect(after.busy).toBe(false);
    expect(queueDue(after, 0, 8, 2)).toBe(true);
    // The clock it replaced would have refused the same ask.
    expect(queueDue(before, 0, 8, 2)).toBe(false);
    game.unmount();
  });
});

describe('the boss-intent prefetch, on its own', () => {
  it('asks when verbs are short, none is in flight and the wait has passed', () => {
    const clock = newQueueClock();
    expect(queueDue(clock, 0, 8, 2)).toBe(true);
    expect(queueDue(clock, 0, 8, 0), 'nothing is needed').toBe(false);
    clock.lastAsk = 10;
    expect(queueDue(clock, 12, 8, 2), 'the wait has not passed').toBe(false);
    expect(queueDue(clock, 18, 8, 2)).toBe(true);
    clock.busy = true;
    expect(queueDue(clock, 18, 8, 2), 'one is already in flight').toBe(false);
  });

  it('drops verbs drawn for a view that is no longer on the field', () => {
    const roundA = {};
    const roundB = {};
    expect(admitIntents({ left: false, gen: 1, fireGen: 1, asked: roundA, live: roundA })).toBe(
      true,
    );
    // The three ways an answer goes stale. The guard that shipped was `if
    // (left) return` alone, so the last two were queued onto a round the
    // verbs were never drawn for.
    expect(admitIntents({ left: true, gen: 1, fireGen: 1, asked: roundA, live: roundA })).toBe(
      false,
    );
    expect(admitIntents({ left: false, gen: 1, fireGen: 2, asked: roundA, live: roundA })).toBe(
      false,
    );
    expect(admitIntents({ left: false, gen: 1, fireGen: 1, asked: roundA, live: roundB })).toBe(
      false,
    );
  });
});
