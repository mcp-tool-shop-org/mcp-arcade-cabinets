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
import {
  admitIntents,
  mountGhost,
  NEXT_TAPE_S,
  newQueueClock,
  queueDue,
  readPrefs,
  withSignal,
  writePrefs,
} from '../src/ghost';

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
    const took = added.filter((h) => ['keydown', 'keyup', 'resize', 'pagehide'].includes(h.type));
    expect(took.map((h) => h.type).sort()).toEqual(['keydown', 'keyup', 'pagehide', 'resize']);
    game.unmount();
    for (const h of took) {
      expect(
        removed.some((r) => r.type === h.type && r.fn === h.fn),
        `${h.type} was taken and never given back`,
      ).toBe(true);
    }
  });

  // The bags went to storage at the scene and on leaving the field, so a
  // reload mid-round heard that round's lines again (Kimi's review of the
  // lines commit). The page's last event on the way out writes them too.
  it('writes the bags on pagehide, so a reload mid-round keeps the walk', () => {
    const game = mount();
    expect(localStorage.getItem('ghost.lines')).toBeNull();
    window.dispatchEvent(new Event('pagehide'));
    const raw = localStorage.getItem('ghost.lines');
    expect(raw).not.toBeNull();
    expect(typeof JSON.parse(raw!)).toBe('object');
    game.unmount();
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

// The Director played the two-minute beds and heard beds that do not start at
// all. The beds are 110-128 s files of about 1.8 MB each; the shell asked for
// all eight, waited on `canplaythrough` — the WHOLE file buffered — and a bare
// 4000 ms deadline wrote down every bed that had not answered as missing. On
// any ordinary connection that is all eight, so the cabinet said `music:
// chiptune` and played the chiptune over beds that were still downloading.
//
// The module holds its beds at module scope and asks for them once, so each
// case here takes a fresh copy of it.
describe('the beds, while they are still arriving', () => {
  /** Every bed element the module asks for, by the file it asked for. */
  function catchBeds(): Map<string, HTMLAudioElement> {
    const made = new Map<string, HTMLAudioElement>();
    const Real = globalThis.Audio;
    class Watched extends Real {
      constructor() {
        super();
        // jsdom loads no media, which is exactly the state under test: an
        // element that has been asked for and has not answered yet.
        const set = (src: string) => {
          const key = /tracks\/(.+)\.mp3$/.exec(src)?.[1];
          if (key) made.set(key, this as unknown as HTMLAudioElement);
        };
        Object.defineProperty(this, 'src', {
          get: () => '',
          set: (v: string) => set(String(v)),
          configurable: true,
        });
      }
    }
    vi.stubGlobal('Audio', Watched);
    return made;
  }

  /** The cabinet's status word, as a player reads it. */
  function chromeWord(): string {
    return root.querySelector('[aria-label="cabinet"]')?.textContent ?? '';
  }

  /** A fresh copy of the module, mounted, with the beds caught. */
  async function mountFresh(): Promise<{
    beds: Map<string, HTMLAudioElement>;
    game: { unmount: () => void };
  }> {
    const beds = catchBeds();
    vi.resetModules();
    const fresh = (await import('../src/ghost')) as typeof import('../src/ghost');
    const entry = TAPES[0]!;
    const game = fresh.mountGhost(root, entry.name, entry.tape, () => undefined);
    return { beds, game };
  }

  it('asks for every bed and says nothing about the music while they load', async () => {
    vi.useFakeTimers();
    try {
      const { beds, game } = await mountFresh();
      expect(beds.size, 'the shell asked for fewer beds than the game has').toBe(8);
      // Well past any deadline, with not one bed answered: they are still on
      // their way, and a bed on its way is not a missing bed.
      vi.advanceTimersByTime(60_000);
      expect(chromeWord()).not.toContain('music: chiptune');
      // A file that answers with an error IS missing, and that is what the
      // word is for.
      beds.get('poison')!.dispatchEvent(new Event('error'));
      expect(chromeWord()).toContain('music: chiptune');
      game.unmount();
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('settles a bed on its metadata, not on the whole file being buffered', async () => {
    vi.useFakeTimers();
    try {
      const { beds, game } = await mountFresh();
      // Every bed knows its own length and can begin. None of them has
      // finished downloading, and none of them ever will here.
      for (const el of beds.values()) el.dispatchEvent(new Event('loadedmetadata'));
      vi.advanceTimersByTime(60_000);
      // A late error on a bed the shell already has changes nothing: it is
      // held, so the cabinet keeps its music.
      beds.get('doorman')!.dispatchEvent(new Event('error'));
      expect(chromeWord()).not.toContain('music: chiptune');
      game.unmount();
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('takes a bed back the moment it arrives, however late that is', async () => {
    vi.useFakeTimers();
    try {
      const { beds, game } = await mountFresh();
      vi.advanceTimersByTime(60_000);
      beds.get('rug')!.dispatchEvent(new Event('error'));
      expect(chromeWord()).toContain('music: chiptune');
      // The deadline settles the chrome and nothing else: the listeners are
      // still on every element, and a bed that answers after it clears its
      // own mark.
      beds.get('rug')!.dispatchEvent(new Event('canplay'));
      expect(chromeWord()).not.toContain('music: chiptune');
      game.unmount();
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
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

describe("the fire seat's own fetch", () => {
  it("keeps the caller's deadline and adds the mount's revoke", () => {
    const budget = new AbortController();
    const mountCtl = new AbortController();
    const composed = withSignal({ method: 'POST', signal: budget.signal }, mountCtl.signal);
    // Whatever else the caller passed is still there.
    expect(composed.method).toBe('POST');
    // The caller's signal is the ask's only deadline — `chatOnce` passes
    // `AbortSignal.timeout(budget.timeoutMs)`. Spread first and overwritten,
    // it was discarded, and a daemon that accepted the connection and then
    // hung left the ask pending for the life of the mount with no timeout
    // word anywhere on the status row.
    budget.abort();
    expect(composed.signal?.aborted, "the caller's deadline still fires").toBe(true);

    // And the mount's own revoke still reaches it: a restart or a leave drops
    // an ask that is still in the air.
    const other = new AbortController();
    const revoke = new AbortController();
    const both = withSignal({ signal: other.signal }, revoke.signal);
    expect(both.signal?.aborted).toBe(false);
    revoke.abort();
    expect(both.signal?.aborted).toBe(true);

    // A caller with no signal of its own gets the mount's, untouched.
    const alone = new AbortController();
    expect(withSignal(undefined, alone.signal).signal).toBe(alone.signal);
  });
});

describe('the prefs this browser keeps', () => {
  it('leaves a key it does not know alone while another is written', () => {
    // A field an older or newer bundle wrote, beside one this build owns.
    localStorage.setItem(
      'ghost.prefs',
      JSON.stringify({ difficulty: 'live', best: 'a run of words' }),
    );
    // Any of the six controls is enough: this is the shake checkbox.
    writePrefs({ shake: 'off' });

    const raw = JSON.parse(localStorage.getItem('ghost.prefs')!) as Record<string, unknown>;
    expect(raw.best, 'a pref this build has never heard of is not this build to erase').toBe(
      'a run of words',
    );
    expect(raw.shake).toBe('off');
    expect(raw.difficulty).toBe('live');
    // The read is still the strict allowlist: the unknown key is kept for
    // whoever wrote it and never handed to the game.
    expect((readPrefs() as Record<string, unknown>).best).toBeUndefined();
    expect(readPrefs().shake).toBe('off');
  });
});

// ——— the sound, and the context under it ——————————————————————————————————
// The score lives as long as the page, so each of these takes a fresh
// instance of the module: a context one case built must not be the context
// the next one finds already there.

/** A fresh instance of the module, whose page-lived score is at nothing. */
async function freshGhost(): Promise<typeof import('../src/ghost')> {
  vi.resetModules();
  return import('../src/ghost');
}

/** Swap in a context class for one case, and put back whatever was there. */
function withAudioContext(klass: unknown, body: () => void | Promise<void>): void | Promise<void> {
  const holder = globalThis as { AudioContext?: unknown };
  const was = holder.AudioContext;
  holder.AudioContext = klass;
  const undo = () => {
    if (was === undefined) delete holder.AudioContext;
    else holder.AudioContext = was;
  };
  try {
    const out = body();
    if (out instanceof Promise) return out.finally(undo);
    undo();
    return out;
  } catch (err) {
    undo();
    throw err;
  }
}

function paramStub() {
  return {
    value: 0,
    setValueAtTime: () => undefined,
    exponentialRampToValueAtTime: () => undefined,
    linearRampToValueAtTime: () => undefined,
    cancelScheduledValues: () => undefined,
  };
}

describe('the context the sound is built on', () => {
  it('plays the round silent when the browser will not build one', async () => {
    const ghost = await freshGhost();
    let built = 0;
    class Refuses {
      constructor() {
        built += 1;
        throw new Error('no audio on this browser');
      }
    }
    await withAudioContext(Refuses, () => {
      const entry = TAPES[0]!;
      // `startAudio` is the mount building the context itself, which is where
      // a throw escaped and took the whole mount down with it rather than
      // costing the sound alone.
      const game = ghost.mountGhost(root, entry.name, entry.tape, () => undefined, undefined, true);
      expect(built).toBe(1);
      const canvas = root.querySelector('canvas')!;
      canvas.dispatchEvent(new MouseEvent('click'));
      expect(built, 'a construction that threw is tried once, not once a gesture').toBe(1);
      const chrome = root.querySelector('span[aria-label="cabinet"]')!;
      expect(chrome.textContent, 'and the row says the sound is gone').toContain('sound');
      game.unmount();
    });
  });

  it('asks a context that is not running to come back, and says so when it will not', async () => {
    const ghost = await freshGhost();
    const made: FakeCtx[] = [];
    class FakeCtx {
      // WebKit's own word for a context an interruption took away. It is not
      // 'suspended', so a test for that state alone never matched it.
      state = 'interrupted';
      currentTime = 0;
      destination = {};
      resumes = 0;
      readonly onState: (() => void)[] = [];
      constructor() {
        made.push(this);
      }
      createGain() {
        return { gain: paramStub(), connect: () => undefined, disconnect: () => undefined };
      }
      createOscillator() {
        return {
          type: 'sine',
          frequency: paramStub(),
          connect: () => undefined,
          disconnect: () => undefined,
          start: () => undefined,
          stop: () => undefined,
        };
      }
      resume() {
        this.resumes += 1;
        return Promise.resolve();
      }
      close() {
        return Promise.resolve();
      }
      addEventListener(type: string, fn: () => void) {
        if (type === 'statechange') this.onState.push(fn);
      }
      removeEventListener() {
        /* the mount gives the listener back; nothing here reads it */
      }
    }
    await withAudioContext(FakeCtx, async () => {
      const entry = TAPES[0]!;
      const game = ghost.mountGhost(root, entry.name, entry.tape, () => undefined, undefined, true);
      const ctx = made[0]!;
      // Ghost's `ensureAudio` only ever constructed the context; it never
      // asked it to run, so a context handed back asleep stayed asleep.
      expect(ctx.resumes).toBe(1);
      await new Promise((done) => setTimeout(done, 0));
      const chrome = root.querySelector('span[aria-label="cabinet"]')!;
      expect(chrome.textContent, 'a refusal is a word, not silence').toContain('asleep');
      // The browser says the state moved, and it is still not running.
      for (const fn of ctx.onState) fn();
      expect(ctx.resumes, 'every state but running is asked again').toBe(2);
      game.unmount();
    });
  });
});

describe('a probe on a machine where nothing is listening', () => {
  it('backs off rather than asking every five seconds for the whole round', async () => {
    vi.useFakeTimers();
    try {
      const game = mount();
      const tags = () => signals.filter((s) => s.url.includes('/ollama/api/tags')).length;
      await vi.advanceTimersByTimeAsync(0);
      expect(tags(), 'the mount looks once').toBe(1);

      // The word is already on the row; what is counted from here is only the
      // re-announcing of a word that has not changed.
      const seat = root.querySelector('span[aria-label="seat"]')!;
      expect(seat.textContent).toBe('seat: no daemon');
      let rewrites = 0;
      const watch = new MutationObserver((records) => {
        rewrites += records.length;
      });
      watch.observe(seat, { childList: true, characterData: true, subtree: true });

      await vi.advanceTimersByTimeAsync(5000);
      expect(tags(), 'the first retry is still five seconds').toBe(2);
      await vi.advanceTimersByTimeAsync(5000);
      expect(tags(), 'the wait doubled, so nothing is asked here').toBe(2);
      await vi.advanceTimersByTimeAsync(5000);
      expect(tags()).toBe(3);

      expect(rewrites, 'a live region is not rewritten with the word it has').toBe(0);
      expect(watch.takeRecords().length).toBe(0);
      watch.disconnect();
      game.unmount();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('the end scene, and where the play goes next', () => {
  it('flows into the next tape by itself once the scene has held, by the path the Next button takes', () => {
    // A frame clock of our own: the mount's loop is driven by hand.
    const frames: FrameRequestCallback[] = [];
    globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    }) as unknown as typeof requestAnimationFrame;
    const onNext = vi.fn();
    const entry = TAPES[0]!;
    const game = mountGhost(root, entry.name, entry.tape, () => undefined, onNext, false, {
      difficulty: 'recorded',
    });
    const nextBtn = [...root.querySelectorAll('button')].find(
      (b) => b.textContent === 'Next tape',
    )!;
    expect(nextBtn.disabled).toBe(true);
    // Run the round out at fifty milliseconds a frame: the scene comes when
    // the tape's clock runs down.
    let now = 0;
    let guard = 0;
    while (nextBtn.disabled && guard++ < 6000) {
      const cb = frames.shift()!;
      now += 50;
      cb(now);
    }
    expect(nextBtn.disabled).toBe(false);
    expect(onNext).not.toHaveBeenCalled();
    // The scene holds: one second in, nothing has moved on.
    const sceneAt = now;
    while (now - sceneAt < 1000) {
      frames.shift()!((now += 50));
    }
    expect(onNext).not.toHaveBeenCalled();
    // Past the hold, the play flows on exactly once and the loop stops asking for frames.
    while (now - sceneAt < NEXT_TAPE_S * 1000 + 100 && frames.length > 0) {
      frames.shift()!((now += 50));
    }
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(frames.length).toBe(0);
    game.unmount();
  });

  it('holds the scene when there is nothing to flow into', () => {
    const frames: FrameRequestCallback[] = [];
    globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    }) as unknown as typeof requestAnimationFrame;
    const entry = TAPES[0]!;
    const game = mountGhost(root, entry.name, entry.tape, () => undefined, undefined, false, {
      difficulty: 'recorded',
    });
    const nextBtn = [...root.querySelectorAll('button')].find(
      (b) => b.textContent === 'Next tape',
    )!;
    let now = 0;
    let guard = 0;
    while (nextBtn.disabled && guard++ < 6000) frames.shift()!((now += 50));
    const sceneAt = now;
    while (now - sceneAt < NEXT_TAPE_S * 1000 * 2) frames.shift()!((now += 50));
    // Still asking for frames: the scene is up and stays.
    expect(frames.length).toBe(1);
    game.unmount();
  });
});
