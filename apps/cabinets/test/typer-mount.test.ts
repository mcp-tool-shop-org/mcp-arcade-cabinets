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

import { DIGIT, NAMES } from '@mcp-arcade-cabinets/cabinet-server/src/browser';

import { CARD_ASPECT } from '../src/typer-cards';
import { DEFAULT_MUSIC, isMusicMode } from '../src/typer-audio';
import {
  CARD_W,
  FONT_SIZES,
  PREVIEW_H,
  PREVIEW_W,
  STACK_WORDS,
  menuLevelOrder,
  mountVibeTyper,
  nextLevelIndex,
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

interface Drawn {
  w: number;
  h: number;
  x: number;
  y: number;
}

/**
 * The same stub, with a note of every method the field called on it, and —
 * when a second list is handed in — the geometry of every `drawImage`. The
 * preview draws several pictures at several sizes, so the width is what says
 * which one a call was.
 */
function recordingCanvas(calls: string[], drawn?: Drawn[]): CanvasRenderingContext2D {
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
      return (...args: unknown[]) => {
        calls.push(prop);
        if (prop === 'drawImage' && drawn && args.length >= 5) {
          drawn.push({
            x: Number(args[1]),
            y: Number(args[2]),
            w: Number(args[3]),
            h: Number(args[4]),
          });
        }
        return args.length === 0 ? undefined : undefined;
      };
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

/** The reading time the sim takes, off the levers rather than out of a test. */
const PACE = DEFAULT_PATTERNS.levels.pace;

/**
 * Step the field past that reading time. A transitional beat — the ask, the
 * creep, the ship, a compaction — holds for `pace.beatHold` seconds of frame
 * time and swallows every key pressed while it does, and a line said on that
 * frame is not shown until `pace.chatGap` after the line before it. A test
 * that stepped one frame and then read the next beat word, the next target
 * or the chat off the page was reading the field mid-hold.
 */
function settle(m: VibeMount, beats = 1): void {
  run(m, Math.ceil((beats * (PACE.beatHold + PACE.chatGap)) / STEP) + 2);
}

/** The editor draws a space as this, so the page hands one back rather than ' '. */
const NBSP = String.fromCharCode(0xa0);

/** The target the editor is showing, read off the page rather than the sim. */
function liveTarget(): string {
  const live = root.querySelector('.vibe-live');
  if (!live) return '';
  return (
    [...live.children]
      .filter((node) => !node.classList.contains('vibe-caret'))
      .map((node) => node.textContent ?? '')
      .join('')
      // The editor draws a space as a non-breaking one so a run of them keeps
      // its width; the key the sim wants back is the ordinary space.
      .split(NBSP)
      .join(' ')
  );
}

/**
 * Play whole lines, whatever the field puts up, until the board toasts a
 * milestone. Reading the target off the page rather than out of the plan is
 * what lets this walk past a creep or a check-in without knowing they came.
 */
function playToMilestone(m: VibeMount, cap = 4000): string {
  const toast = root.querySelector('.vibe-toast') as HTMLElement;
  let target = '';
  for (let i = 0; i < cap; i++) {
    if ((toast.textContent ?? '') !== '') return toast.textContent ?? '';
    const next = liveTarget();
    if (next === '' || next === target) {
      m.tick(STEP);
      continue;
    }
    target = next;
    for (const ch of next) {
      press(ch);
      m.tick(STEP);
    }
    press('Enter');
    m.tick(STEP);
    m.tick(STEP);
  }
  return toast.textContent ?? '';
}

/**
 * Play whole lines, whatever the field puts up, until `done()` says so or the
 * cap runs out. The same walk `playToStandup` takes, with the end left open:
 * a meeting, a completion offered, a new level.
 */
function playUntil(m: VibeMount, done: () => boolean, cap = 6000): boolean {
  let target = '';
  for (let i = 0; i < cap; i++) {
    if (done()) return true;
    const next = liveTarget();
    if (next === '' || next === target) {
      m.tick(STEP);
      continue;
    }
    target = next;
    for (const ch of next) {
      press(ch);
      m.tick(STEP);
    }
    press('Enter');
    m.tick(STEP);
    m.tick(STEP);
  }
  return done();
}

/** One keydown, on whatever is under focus, reported back so the test can read it. */
function keyOn(target: EventTarget, key: string): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  target.dispatchEvent(e);
  return e;
}

/** A listed level, mounted. The options every test below starts from. */
function mountLevel(levelIndex = 0, seed = 1): VibeMount {
  return mountVibeTyper(root, {
    tier: 0,
    endless: false,
    levelIndex,
    seed,
    agentName: 'Sprocket',
    theme: 'mechanical',
    integration: [],
    onExit: () => undefined,
    startAudio: false,
  });
}

/** Play whole lines until the level ends and the standup is up. */
function playToStandup(m: VibeMount, cap = 4000): boolean {
  let target = '';
  for (let i = 0; i < cap; i++) {
    if (root.querySelector('.vibe-standup')) return true;
    const next = liveTarget();
    if (next === '' || next === target) {
      m.tick(STEP);
      continue;
    }
    target = next;
    for (const ch of next) {
      press(ch);
      m.tick(STEP);
    }
    press('Enter');
    m.tick(STEP);
    m.tick(STEP);
  }
  return false;
}

/**
 * Make every `Image` the field builds report itself loaded the moment its
 * `src` is set. It stays a real `HTMLImageElement`, so the two faces still
 * append to the chat header as elements.
 */
function loadingImages(): { restore: () => void; made: HTMLImageElement[] } {
  const proto = Image.prototype as unknown as object;
  const was = Object.getOwnPropertyDescriptor(proto, 'src');
  const made: HTMLImageElement[] = [];
  Object.defineProperty(proto, 'src', {
    configurable: true,
    get(this: HTMLImageElement) {
      return this.getAttribute('src') ?? '';
    },
    set(this: HTMLImageElement, value: string) {
      this.setAttribute('src', value);
      made.push(this);
      this.dispatchEvent(new Event('load'));
    },
  });
  return {
    made,
    restore: () => {
      if (was) Object.defineProperty(proto, 'src', was);
      else delete (proto as Record<string, unknown>).src;
    },
  };
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
      agentName: 'Sprocket',
      theme: 'mechanical',
      integration: [],
      onExit: () => undefined,
      startAudio: false,
    });
    // The ask is already in the chat; one step turns the reply into a target.
    const chat = root.querySelector('.vibe-chat')!;
    expect(chat.textContent ?? '').not.toBe('');
    // The ask is held for the player to read it before the reply is typeable.
    settle(mount);
    expect(root.querySelector('.vibe-beat-word')!.textContent).toBe('your reply');

    for (const ch of reply) {
      press(ch);
      run(mount, 1);
    }
    press('Enter');
    run(mount, 2);

    // The reply landed in the chat as the agent's, and the code is in hand.
    run(mount, 60);
    expect(chat.textContent).toContain(reply.slice(0, 8));
    expect(root.querySelector('.vibe-beat-word')!.textContent).toBe('the code');
    expect(root.querySelector('.vibe-code .vibe-live')).not.toBeNull();
  });

  // A keyboard-only player who touched any control could never type again:
  // the keys are read off a window listener and dropped whenever a control
  // has them, and the mount made no focusable element at all — so 'Sound on'
  // swallowed every letter after it and the game read as frozen, with no word
  // anywhere. A mouse player recovered by accident, clicking a pane.
  describe('the field, and where the keys go', () => {
    it('gives the letters back to the editor after a control is used', () => {
      const expected = planOf(createRun({ seed: 1, tier: 0, endless: false, levelIndex: 0 }));
      const reply = expected.requests[0]!.reply;
      mount = mountLevel();
      const editor = root.querySelector('.vibe-editor') as HTMLElement;
      // The field is focusable, and has the keys from the first frame.
      expect(editor.tabIndex).toBe(0);
      expect(document.activeElement).toBe(editor);
      settle(mount);

      const sound = [...root.querySelectorAll('button')].find((b) =>
        (b.textContent ?? '').startsWith('sound:'),
      )!;
      sound.focus();
      sound.click();
      expect(document.activeElement, 'the button is done with').toBe(editor);

      // And the very next letter lands, which is the whole point.
      const first = reply[0]!;
      press(first);
      run(mount, 1);
      expect(liveTarget()).toBe(reply);
      expect(root.querySelector('.vibe-live .ok')?.textContent).toBe(first);
    });

    it('says the state of the sound in the menu selects own words', () => {
      mount = mountLevel();
      const sound = [...root.querySelectorAll('button')].find((b) =>
        (b.textContent ?? '').startsWith('sound:'),
      )!;
      // 'Sound on' beside 'Exit full screen' read as two different promises,
      // and clicking the one that said 'Sound on' turned the sound off.
      expect(sound.textContent).toBe('sound: on');
      sound.click();
      expect(sound.textContent).toBe('sound: off');
    });
  });

  it('keeps a digit off the chat pane', () => {
    mount = mountVibeTyper(root, {
      tier: 0,
      endless: false,
      levelIndex: 0,
      seed: 1,
      agentName: 'Sprocket',
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
    // The agent's name heads the editor, its own pane, and the header is words too.
    expect(root.querySelector('.vibe-editor .vibe-head')!.textContent).toContain('Sprocket');
  });

  // The chat is the cabinet's whole narrative and it was a plain list with no
  // name and nothing announced: a reader was told the milestone word and
  // never told what their user had asked for. The list itself cannot be live
  // — the lines type themselves in character by character — so a finished
  // line is announced once, whole.
  it('announces a chat line when it has finished typing itself, and not before', () => {
    mount = mountLevel();
    const said = root.querySelector('[aria-label="the chat"]')!;
    expect(said.getAttribute('aria-live')).toBe('polite');
    expect(root.querySelector('.vibe-lines')!.getAttribute('aria-label')).not.toBeNull();
    // The opening ask is in the list and is still being typed in.
    const first = root.querySelector('.vibe-lines li')!;
    mount.tick(STEP);
    expect(said.textContent, 'nothing is said part-way through a line').toBe('');
    run(mount, 240);
    const full = first.textContent ?? '';
    expect(full.length).toBeGreaterThan(0);
    expect(said.textContent).toBe(full);
  });

  it('puts the user in the chat header and the agent on the editor, and leaves the words alone', () => {
    mount = mountVibeTyper(root, {
      tier: 0,
      endless: false,
      levelIndex: 0,
      seed: 1,
      agentName: 'Sprocket',
      theme: 'mechanical',
      integration: [],
      onExit: () => undefined,
      startAudio: false,
    });
    const state = createRun({ seed: 1, tier: 0, endless: false, levelIndex: 0 });
    const chatHead = root.querySelector('.vibe-chat .vibe-head') as HTMLElement;
    const editorHead = root.querySelector('.vibe-editor .vibe-head') as HTMLElement;
    // The chat is the user's pane: the product, which is theirs, and never
    // their name. The editor is the agent's pane, where the player types: the
    // agent's name and the beat word.
    expect(chatHead.textContent).toBe(planOf(state).product);
    expect(editorHead.textContent).toBe(
      `Sprocket · ${DEFAULT_PATTERNS.cabinet.words.beats.request}`,
    );

    const userFaces = [...chatHead.querySelectorAll('img')];
    const agentFaces = [...editorHead.querySelectorAll('img')];
    expect(userFaces).toHaveLength(1);
    expect(agentFaces).toHaveLength(1);
    // Off the build's own base, so a Pages build under /<repo>/play/ asks for
    // the right files and a package build asks relatively.
    const base = import.meta.env.BASE_URL;
    expect(userFaces[0]!.getAttribute('src')).toBe(`${base}vibe/avatars/user.png`);
    expect(agentFaces[0]!.getAttribute('src')).toBe(`${base}vibe/avatars/agent.png`);
    for (const face of [...userFaces, ...agentFaces]) {
      // Decoration: the words beside them carry the meaning.
      expect(face.getAttribute('alt')).toBe('');
      expect(face.decoding).toBe('async');
    }
    // Each face comes first in its own header, against the words it belongs to.
    expect(chatHead.firstElementChild).toBe(userFaces[0]);
    expect(userFaces[0]!.nextElementSibling!.textContent).toBe(planOf(state).product);
    expect(editorHead.firstElementChild).toBe(agentFaces[0]);
    expect(agentFaces[0]!.nextElementSibling!.textContent).toBe('Sprocket');
  });

  it('takes a face that will not load out of the header and leaves no box', () => {
    mount = mountVibeTyper(root, {
      tier: 0,
      endless: false,
      levelIndex: 0,
      seed: 1,
      agentName: 'Sprocket',
      theme: 'mechanical',
      integration: [],
      onExit: () => undefined,
      startAudio: false,
    });
    const chatHead = root.querySelector('.vibe-chat .vibe-head') as HTMLElement;
    const editorHead = root.querySelector('.vibe-editor .vibe-head') as HTMLElement;
    const chatWords = chatHead.textContent;
    const editorWords = editorHead.textContent;
    const userFace = chatHead.querySelector('img')!;
    const agentFace = editorHead.querySelector('img')!;

    // The user's face fails: the agent's stays, and nothing about the words moves.
    userFace.dispatchEvent(new Event('error'));
    expect(chatHead.querySelectorAll('img')).toHaveLength(0);
    expect(editorHead.querySelector('img')).toBe(agentFace);
    expect(chatHead.textContent).toBe(chatWords);

    // Both fail: each header is exactly the spans it would have been without
    // the faces at all — no empty element left standing in for a picture
    // that never arrived.
    agentFace.dispatchEvent(new Event('error'));
    expect(editorHead.querySelectorAll('img')).toHaveLength(0);
    expect(chatHead.textContent).toBe(chatWords);
    expect(editorHead.textContent).toBe(editorWords);
    expect([...chatHead.children].map((node) => node.tagName)).toEqual(['SPAN']);
    expect([...editorHead.children].map((node) => node.tagName)).toEqual(['SPAN', 'SPAN', 'SPAN']);
  });

  it('draws the milestone card over the preview and leaves the toast a plain word', () => {
    // jsdom hands an `Image` no file, so nothing would ever load and the
    // preview would always take the word-only path. This subclass is a real
    // `HTMLImageElement` — it still appends to the header like one — whose
    // `src` setter fires `load`, which is the one thing a browser does here
    // and jsdom does not.
    const calls: string[] = [];
    const drawn: Drawn[] = [];
    HTMLCanvasElement.prototype.getContext = vi.fn(() =>
      recordingCanvas(calls, drawn),
    ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    const loading = loadingImages();
    try {
      mount = mountVibeTyper(root, {
        tier: 0,
        endless: true,
        seed: 1,
        agentName: 'Sprocket',
        theme: 'mechanical',
        integration: [],
        onExit: () => undefined,
        startAudio: false,
      });
      const toast = root.querySelector('.vibe-toast') as HTMLElement;
      const word = playToMilestone(mount);
      // The board's toast is a status line and nothing else: the lever's own
      // milestone name, as text, in the live region, with no picture on it.
      expect(DEFAULT_PATTERNS.score.milestones.map((m) => m.name)).toContain(word);
      expect(toast.textContent).toBe(word);
      expect(toast.style.backgroundImage).toBe('');
      expect(toast.classList.contains('carded')).toBe(false);
      expect(toast.querySelector('img')).toBeNull();
      expect(toast.getAttribute('role')).toBe('status');
      expect(toast.getAttribute('aria-live')).toBe('polite');

      // And the card is on the preview, at the width the Director set, at the
      // aspect the cut writes, centered on both axes.
      const card = drawn.filter((d) => d.w === CARD_W);
      expect(card.length).toBeGreaterThan(0);
      const one = card[0]!;
      expect(one.h).toBeCloseTo(CARD_W / CARD_ASPECT, 5);
      expect(one.x).toBeCloseTo((PREVIEW_W - CARD_W) / 2, 5);
      expect(one.y).toBeCloseTo((PREVIEW_H - CARD_W / CARD_ASPECT) / 2, 5);
      // The word is drawn over it too, so the picture never has to carry it.
      expect(calls).toContain('fillText');

      // Both go together when the toast's own clock runs out: the word is
      // cleared and the card stops being drawn on the same frame, because
      // they share one clock.
      run(mount, Math.ceil(2.5 / STEP));
      expect(toast.textContent).toBe('');
      const after = drawn.length;
      run(mount, 10);
      expect(drawn.slice(after).filter((d) => d.w === CARD_W)).toHaveLength(0);

      // A picture that resolves after the field has gone changes nothing.
      // Four files are asked for the moment the field is built, so a player
      // who leaves before they land would otherwise have a handler writing
      // into a Map that belongs to a field nobody is looking at. The handlers
      // take the mount's own `left` flag, the same guard the voice's probes
      // take.
      //
      // The `error` half is what this fires, and deliberately: the `load`
      // half already ran during the play, so re-firing it would write the
      // same four entries back and prove nothing. An unguarded `error` would
      // empty the Map, so this is the assertion that fails if the guard goes.
      const late = loading.made.filter((img) =>
        (img.getAttribute('src') ?? '').includes('vibe/cards/'),
      );
      expect(late).toHaveLength(4);
      expect(mount.debug().cards).toBe(4);
      const frozen = root.innerHTML;
      const drewBefore = drawn.length;
      mount.unmount();
      for (const img of late) img.dispatchEvent(new Event('error'));
      mount.tick(STEP);
      expect(mount.debug().cards).toBe(4);
      expect(root.innerHTML).toBe(frozen);
      expect(drawn.length).toBe(drewBefore);
      mount = null;
    } finally {
      loading.restore();
    }
  });

  it('shows the milestone word alone when no card ever loads', () => {
    // The fallback rule, on the path jsdom takes by itself: no file arrives,
    // so the preview draws no card and the word does the whole job. This is
    // the field exactly as it was before this batch.
    const calls: string[] = [];
    const drawn: Drawn[] = [];
    HTMLCanvasElement.prototype.getContext = vi.fn(() =>
      recordingCanvas(calls, drawn),
    ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    mount = mountVibeTyper(root, {
      tier: 0,
      endless: true,
      seed: 1,
      agentName: 'Sprocket',
      theme: 'mechanical',
      integration: [],
      onExit: () => undefined,
      startAudio: false,
    });
    const toast = root.querySelector('.vibe-toast') as HTMLElement;
    const word = playToMilestone(mount);
    expect(DEFAULT_PATTERNS.score.milestones.map((m) => m.name)).toContain(word);
    expect(toast.textContent).toBe(word);
    expect(toast.style.backgroundImage).toBe('');
    expect(toast.classList.contains('carded')).toBe(false);
    expect(drawn).toHaveLength(0);
    expect(calls).not.toContain('drawImage');
  });

  it('lays the deploy band down as the flat bar, because no ribbon loads here', () => {
    // The ribbon is drawn with `drawImage` and the flat bar with `fillRect`
    // plus `fillText`. jsdom loads no file, so the preview must take the bar
    // path — the same fallback rule the tiles and the faces follow, on the
    // one piece of the field that was already drawn before this batch.
    const calls: string[] = [];
    HTMLCanvasElement.prototype.getContext = vi.fn(() =>
      recordingCanvas(calls),
    ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    mount = mountVibeTyper(root, {
      tier: 0,
      endless: false,
      levelIndex: 0,
      seed: 1,
      agentName: 'Sprocket',
      theme: 'mechanical',
      integration: [],
      onExit: () => undefined,
      startAudio: false,
    });
    // Play the level out. It ships, which is what puts the deploy band down.
    expect(playToStandup(mount)).toBe(true);
    expect(standupLines()[1]).toBe('the level shipped');
    expect(calls).toContain('fillRect');
    expect(calls).toContain('fillText');
    expect(calls).not.toContain('drawImage');
  });

  it('shows the scoreboard and nothing that counts the typist', () => {
    mount = mountVibeTyper(root, {
      tier: 0,
      endless: false,
      levelIndex: 0,
      seed: 1,
      agentName: 'Sprocket',
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
      agentName: 'Sprocket',
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
    expect(root.querySelector('.vibe-beat-word')!.textContent).toBe(beats.request);
    settle(mount);
    expect(root.querySelector('.vibe-beat-word')!.textContent).toBe(beats.reply);
  });

  it('hands the music setting to the engine', () => {
    mount = mountVibeTyper(root, {
      tier: 0,
      endless: false,
      levelIndex: 0,
      seed: 1,
      agentName: 'Sprocket',
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
      agentName: 'Sprocket',
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
      agentName: 'Sprocket',
      theme: 'mechanical',
      integration: [],
      onExit: () => undefined,
      startAudio: true,
    });
    run(mount, 30);
    expect(mount.debug().music).toBe('on');
    // And no recording has the level: jsdom hands out a media element that
    // never loads anything, so no bed ever says it is ready and the mode
    // falls back to its own bar — the same path a Pages build without
    // `vibe/tracks/` takes, and the reason nothing here waits on a file.
    expect(mount.debug().track).toBeNull();

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
      agentName: 'Sprocket',
      theme: 'mechanical',
      integration: [],
      onExit: () => undefined,
      startAudio: false,
    });
    settle(mount);
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

  it('ships a piece and draws it as a block, because no tile ever loads here', () => {
    // jsdom hands an `Image` no file, so the tile Map stays empty and the
    // packer takes the path it has always taken: one `fillRect` per piece in
    // the stack's color, and no `drawImage` anywhere. The kind each piece
    // carries is derived whether or not a picture arrives (typer-tiles.test
    // covers the derivation itself); this is the fallback rule holding.
    const calls: string[] = [];
    HTMLCanvasElement.prototype.getContext = vi.fn(() =>
      recordingCanvas(calls),
    ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    const plan = planOf(createRun({ seed: 1, tier: 0, endless: false, levelIndex: 0 }));
    const request = plan.requests[0]!;
    mount = mountVibeTyper(root, {
      tier: 0,
      endless: false,
      levelIndex: 0,
      seed: 1,
      agentName: 'Sprocket',
      theme: 'mechanical',
      integration: [],
      onExit: () => undefined,
      startAudio: false,
    });
    settle(mount);
    const type = (line: string) => {
      for (const ch of line) {
        press(ch);
        run(mount!, 1);
      }
      press('Enter');
      run(mount!, 2);
    };
    type(request.reply);
    run(mount, 10);
    for (const line of request.snippet.code.split('\n')) type(line);
    // The ship is held too, and the piece is only paid for on the far side.
    // The frame that ships says more than one line at once, and the sim
    // spaces them by `pace.chatGap`: each is in the list in its order and
    // stays hidden with nothing in it until its own turn comes. Reading
    // the words off the pane on the frame they were said read nothing.
    const said = () => [...root.querySelectorAll('.vibe-lines li')] as HTMLElement[];
    const waiting = said().filter((li) => li.hidden);
    expect(waiting.length).toBeGreaterThan(0);
    for (const li of waiting) expect(li.textContent).toBe('');
    settle(mount);
    for (const li of waiting) {
      expect(li.hidden).toBe(false);
      expect(li.textContent).not.toBe('');
    }

    // The request was paid for, so a piece is in the preview.
    const valuation = root.querySelector('.vibe-valuation .vibe-num')!.textContent ?? '0';
    expect(Number(valuation)).toBeGreaterThan(0);
    expect(calls).toContain('fillRect');
    expect(calls).not.toContain('drawImage');
  });

  it('leaves on a held Escape and not on a tap', () => {
    let left = 0;
    mount = mountVibeTyper(root, {
      tier: 0,
      endless: false,
      levelIndex: 0,
      seed: 1,
      agentName: 'Sprocket',
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

// ——— the standup ——————————————————————————————————————————————————————————
//
// The end card names the product and the stack it was built on, and carries
// the level's premise under it. Nobody types here: the run is left alone
// until the context runs out, which is the cheapest way to the card.

/** Let the clock run until the standup is up. Returns false if it never came. */
function toStandup(m: VibeMount, cap = 6000): boolean {
  for (let i = 0; i < cap; i++) {
    m.tick(0.5);
    if (root.querySelector('.vibe-standup')) return true;
  }
  return false;
}

/** The standup's quiet lines, in the order they were laid down. */
function standupLines(): string[] {
  return [...root.querySelectorAll('.vibe-standup p.muted')].map((p) => p.textContent ?? '');
}

describe('the standup', () => {
  // Hardcore, because it is the one listed tier where an empty bar is the
  // end rather than a compaction: below it, a run that nobody types into
  // refills forever and never reaches a card.
  it('names the product and its stack, and carries the level’s premise', () => {
    const plan = planOf(createRun({ seed: 1, tier: 3, endless: false, levelIndex: 0 }));
    expect(plan.story).not.toBe('');
    mount = mountVibeTyper(root, {
      tier: 3,
      endless: false,
      levelIndex: 0,
      seed: 1,
      agentName: 'Sprocket',
      theme: 'mechanical',
      integration: [],
      onExit: () => undefined,
      startAudio: false,
    });
    expect(toStandup(mount)).toBe(true);
    expect(root.querySelector('.vibe-standup h1')!.textContent).toBe(
      `${plan.product} · ${STACK_WORDS[plan.stack]}`,
    );
    // The premise sits directly under the heading, before how the run ended.
    expect(standupLines()[0]).toBe(plan.story);
    expect(standupLines()[1]).toBe('the context ran out');
  });

  it('shows no premise in endless, because nobody wrote one', () => {
    const plan = planOf(createRun({ seed: 1, tier: 0, endless: true }));
    expect(plan.story).toBe('');
    mount = mountVibeTyper(root, {
      tier: 0,
      endless: true,
      seed: 1,
      agentName: 'Sprocket',
      theme: 'mechanical',
      integration: [],
      onExit: () => undefined,
      startAudio: false,
    });
    expect(toStandup(mount)).toBe(true);
    expect(root.querySelector('.vibe-standup h1')!.textContent).toContain(
      ` · ${STACK_WORDS[plan.stack]}`,
    );
    expect(standupLines()[0]).toBe('the context ran out');
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
    agentName: 'Sprocket',
    theme: 'mechanical',
    integration: [],
    onExit: () => undefined,
    startAudio: false,
  });
}

// ——— the voice ————————————————————————————————————————————————————————————
//
// The worker is faked: this is the shell's half of G15 — the checkbox, the
// pref, which lines are handed over and what the chrome says. The timing rule
// itself is `packages/cabinet-server/test/voice-vibe.test.ts`, and the Pages
// half (no VITE_LOCAL_SEATS, so the box and its mark are dropped by dead-code
// elimination) is the pack's marker gate in `packages/launcher/scripts/build.mjs`,
// because a mount test runs in dev where `LOCAL_SEATS` is always true.

interface SpokenJob {
  text: string;
  kind: string;
  line: string;
  voice: { preset: string; rate: number; loudness: number };
  maxGap: number;
}

/** A worker that is up and receipts everything it is handed. */
function fakeWorker() {
  const jobs: SpokenJob[] = [];
  const played: string[] = [];
  return {
    jobs,
    played,
    opts: {
      health: () => Promise.resolve({ engine: 'a test' }),
      speak: (job: SpokenJob) => {
        jobs.push(job);
        return Promise.resolve({
          status: 'voiced' as const,
          ms: 10,
          receipt: {
            id: 'abc',
            ok: true,
            text: job.text,
            heard: job.text,
            duration_s: 1,
            tts_s: 0.3,
            asr_s: 0.2,
            cached: false,
            checks: [],
            url: '/audio/abc.wav',
          },
        });
      },
      play: (_url: string, job: SpokenJob) => played.push(job.text),
    },
  };
}

function mountWithVoice(worker?: ReturnType<typeof fakeWorker>): VibeMount {
  return mountVibeTyper(root, {
    tier: 0,
    endless: false,
    levelIndex: 0,
    seed: 1,
    agentName: 'Sprocket',
    theme: 'mechanical',
    integration: [],
    onExit: () => undefined,
    startAudio: false,
    ...(worker ? { voice: worker.opts as never } : {}),
  });
}

function voiceBox(): HTMLInputElement {
  const label = [...root.querySelectorAll('label')].find(
    (l) => (l.textContent ?? '').trim() === 'Voice',
  );
  return label!.querySelector('input') as HTMLInputElement;
}

describe('the voice on the user lines, mounted', () => {
  it('is off and cannot be turned on until a worker answers', async () => {
    mount = mountVibeTyper(root, {
      tier: 0,
      endless: false,
      levelIndex: 0,
      seed: 1,
      agentName: 'Sprocket',
      theme: 'mechanical',
      integration: [],
      onExit: () => undefined,
      startAudio: false,
      voice: { health: () => Promise.resolve(null) },
    });
    const box = voiceBox();
    expect(box.checked).toBe(false);
    expect(box.disabled).toBe(true);
    await flush();
    expect(box.disabled).toBe(true);
    // Said in the cabinet's own words: no player runs `pnpm`.
    expect(root.textContent).toContain('the local voice is not running');
    // And a grayed box says why it is gray, where a `title` on a disabled
    // input says it to nobody.
    const why = root.querySelector('#vibe-why-voice') as HTMLElement;
    expect(why.hidden).toBe(false);
    // Two descriptions, both of them reaching the box: what the feature is —
    // which used to be a `title` and so reached a mouse player and nobody
    // else — and why it is currently gray. `aria-describedby` is a list, and
    // the second description used to overwrite the first.
    expect(box.getAttribute('aria-describedby')).toBe('vibe-what-voice vibe-why-voice');
    const what = root.querySelector('#vibe-what-voice') as HTMLElement;
    expect(what.textContent).toBe(box.closest('label')!.title);
    expect(what.className).toBe('offscreen');
    // And the box, what it is and why it is gray sit in one group, so the
    // wrapping controls row can never put the explanation on a line of its
    // own away from the control it explains.
    expect(why.closest('.seat-group')).toBe(what.closest('.seat-group'));
    expect(box.closest('.seat-group')).toBe(what.closest('.seat-group'));
    // The reason is beside the label, never inside it: what is inside the
    // label is the checkbox's own name.
    expect((box.closest('label')?.textContent ?? '').trim()).toBe('Voice');
    // The mount mark the pack greps for.
    expect(root.querySelector('[data-vibe-voice]')).not.toBeNull();
  });

  it('comes on by itself when the pref says so and the worker is up', async () => {
    writeVibePrefs({ voice: 'on' });
    const worker = fakeWorker();
    mount = mountWithVoice(worker);
    await flush();
    expect(voiceBox().checked).toBe(true);
    // The status is words beside it, whichever one the run has reached.
    expect(root.textContent).toContain('voice');
  });

  it('speaks the ask with the lever delivery, and never the agent', async () => {
    writeVibePrefs({ voice: 'on' });
    const worker = fakeWorker();
    mount = mountWithVoice(worker);
    await flush();
    run(mount, 2);
    await flush();
    expect(worker.jobs.length).toBe(1);
    const job = worker.jobs[0]!;
    expect(job.kind).toBe('user');
    expect(job.line).toBe('ask');
    expect(job.voice).toEqual(DEFAULT_PATTERNS.cabinet.voice.user);
    expect(job.maxGap).toBe(DEFAULT_PATTERNS.cabinet.voice.maxGap);
    // The words are the user's own ask, off the chat.
    const state = createRun({ seed: 1, tier: 0, endless: false, levelIndex: 0 });
    expect(job.text).toBe(state.chat[0]!.line);

    // The agent answers all through the reply and the code, and none of it
    // is spoken: the player types those.
    const reply = planOf(state).requests[0]!.reply;
    for (const ch of reply) {
      press(ch);
      run(mount, 1);
    }
    press('Enter');
    run(mount, 120);
    await flush();
    expect(worker.jobs.every((j) => j.kind === 'user')).toBe(true);
    expect(worker.jobs.some((j) => j.text === reply)).toBe(false);
  });

  it('hands the worker nothing at all when the box is off', async () => {
    writeVibePrefs({ voice: 'off' });
    const worker = fakeWorker();
    mount = mountWithVoice(worker);
    await flush();
    run(mount, 120);
    await flush();
    expect(voiceBox().checked).toBe(false);
    expect(root.textContent).toContain('voice ready');
    expect(worker.jobs).toEqual([]);
    expect(worker.played).toEqual([]);
  });

  it('remembers the box under vibe.prefs', async () => {
    const worker = fakeWorker();
    mount = mountWithVoice(worker);
    await flush();
    const box = voiceBox();
    box.checked = true;
    box.dispatchEvent(new Event('change'));
    expect(readVibePrefs().voice).toBe('on');
    expect(root.textContent).toContain('voice on');
    box.checked = false;
    box.dispatchEvent(new Event('change'));
    expect(readVibePrefs().voice).toBe('off');
    expect(root.textContent).toContain('voice off');
  });

  it('plays a receipted take and says so in words, naming nothing', async () => {
    writeVibePrefs({ voice: 'on' });
    const worker = fakeWorker();
    mount = mountWithVoice(worker);
    await flush();
    run(mount, 2);
    await flush();
    run(mount, 2);
    expect(worker.played.length).toBe(1);
    const shown = root.textContent ?? '';
    expect(shown).toContain('voice');
    // The claim is "naming nothing", so the assertion is the cabinet's own
    // rule and not a list of five words a reviewer thought of: `NAMES`
    // covers every engine, vendor, model and seat word the say gate refuses
    // (G17), and `DIGIT` is the same class the field is held to (G23).
    // `VIBE_NAMES` is deliberately not the one used here: it adds the typing
    // cabinet's four lever names, and `the ask` is a beat word on this field.
    expect(NAMES.test(shown), `a name reached the page: ${shown}`).toBe(false);
    expect(DIGIT.test(root.querySelector('.vibe-chat')!.textContent ?? '')).toBe(false);
    // The preset is a lever's value, not a word in any list, so it is named
    // here as well: nothing on the page may say which voice is speaking.
    expect(shown.toLowerCase()).not.toContain(
      DEFAULT_PATTERNS.cabinet.voice.user.preset.toLowerCase(),
    );
  });
});

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

  // Once the box was checked the tags probe stopped re-arming, and
  // `markSeatDown` was reachable from nowhere else — so a daemon that died
  // mid-run left the seat marked up forever, the row settled on the phrase it
  // uses for the corpus, and the player had nothing to act on.
  it('says the seat is gone when nothing answers, rather than naming the fallback', async () => {
    let answering = true;
    globalThis.fetch = vi.fn((url: string) => {
      if (String(url).includes('/ollama/api/tags')) {
        if (!answering) return Promise.reject(new Error('the daemon went away'));
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ models: [{ name: 'kimi-test:cloud' }] }),
        } as Response);
      }
      if (String(url).includes('/cabinet/endless')) {
        if (!answering) return Promise.reject(new Error('the daemon went away'));
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ request: null, model: 'kimi-test:cloud' }),
        } as Response);
      }
      return Promise.reject(new Error('no samples in a test'));
    }) as never;
    mount = mountEndless();
    await flush();
    const seat = root.querySelector('[aria-label="the user"]')!;
    const seatLabel = [...root.querySelectorAll('label')].find(
      (l) => (l.textContent ?? '').trim() === 'Model user',
    )!;
    const box = seatLabel.querySelector('input') as HTMLInputElement;
    expect(box.checked).toBe(true);

    answering = false;
    // Two asks with nothing at all behind them is a machine that has gone.
    // An ask comes at a request beat, and a beat now holds for its readable
    // moment, so each turn settles a beat rather than stepping two frames.
    for (let i = 0; i < 8; i++) {
      settle(mount);
      await flush();
    }
    expect(seat.textContent).toBe('seat: no model on this machine');
    expect(box.checked, 'and the box stops claiming a seat it does not have').toBe(false);
    expect(box.disabled).toBe(true);
    expect((root.querySelector('#vibe-why-seat') as HTMLElement).hidden).toBe(false);
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
      agentName: 'Sprocket',
      theme: 'mechanical',
      integration: [],
      onExit: () => undefined,
      startAudio: false,
    });
    await flush();
    run(mount, 4);
    await flush();
    // No engine was built here (`startAudio` is false and no key was pressed),
    // so the bed reports nothing at all — neither its mode nor a recording.
    expect(mount.debug()).toEqual({
      supplied: 0,
      asked: 0,
      accepted: 0,
      refused: 0,
      music: null,
      // jsdom hands an `Image` no file, so the card preload has nothing.
      cards: 0,
      track: null,
      level: 0,
      product: planOf(createRun({ seed: SEED, tier: 0, endless: false, levelIndex: 0 })).product,
      // Nothing has moved yet, and this browser asked for no less of it.
      motion: { calm: false, shake: 0, flash: 0, specks: 0 },
    });
    expect(root.querySelector('[data-vibe-seat]')).toBeNull();
  });
});

// ——— the keys the field does not own ———————————————————————————————————————
//
// The window listener is the field's, not the page's. It used to cancel Tab,
// Enter and Space for every target and on every frame of the run, which meant
// focus could not leave the field (a keyboard trap, WCAG 2.1.2) and the two
// buttons under it — and the standup's — could not be pressed from the
// keyboard at all (2.1.1).

describe('the keys the field does not own', () => {
  it('leaves Tab to the browser when no completion is offered', () => {
    mount = mountLevel();
    run(mount, 1);
    expect((root.querySelector('.vibe-tab') as HTMLElement).hidden).toBe(true);
    expect(keyOn(window, 'Tab').defaultPrevented).toBe(false);
  });

  it('takes Tab once a completion is on screen', () => {
    mount = mountLevel();
    const chip = () => root.querySelector('.vibe-tab') as HTMLElement;
    expect(playUntil(mount, () => chip().hidden === false)).toBe(true);
    expect(keyOn(window, 'Tab').defaultPrevented).toBe(true);
  });

  it('leaves Enter and Space to the button they are pressed on', () => {
    mount = mountLevel();
    run(mount, 1);
    const buttons = [...root.querySelectorAll('button')];
    expect(buttons.map((b) => b.textContent)).toContain('Back to the cabinets');
    for (const button of buttons) {
      for (const key of ['Enter', ' ']) {
        expect(keyOn(button, key).defaultPrevented, `${button.textContent} · ${key}`).toBe(false);
      }
    }
  });

  it('gives the keyboard back at the standup', () => {
    mount = mountLevel();
    expect(playUntil(mount, () => root.querySelector('.vibe-standup') !== null)).toBe(true);
    // Nothing is typing any more: no key is taken and none is canceled.
    for (const key of ['Enter', ' ', 'Tab']) {
      expect(keyOn(window, key).defaultPrevented, key).toBe(false);
    }
    const buttons = [...root.querySelectorAll('.vibe-standup button')];
    // The row grew two ways forward (the same product again, the next one)
    // beside the way out and the retro; none of the four may swallow a key.
    expect(buttons.map((b) => b.textContent)).toEqual([
      'Build this again',
      'The next product',
      'Back to the cabinets',
      'Retro',
    ]);
    for (const button of buttons) {
      for (const key of ['Enter', ' ']) {
        expect(keyOn(button, key).defaultPrevented, `${button.textContent} · ${key}`).toBe(false);
      }
    }
  });
});

// ——— the hint under the field —————————————————————————————————————————————

describe('the hint under the field', () => {
  it('names what the player can see, and never the sibling cabinet', () => {
    mount = mountLevel();
    run(mount, 1);
    const hint = [...root.querySelectorAll('p.muted')].map((p) => p.textContent).join(' ');
    expect(hint).toContain('Tab takes the rest when the faded text appears');
    // "the ghost" is the shooter next to this cabinet on the menu, and this
    // cabinet takes its chassis and never its grammar. The word is nowhere on
    // the field: not the hint, not the chat, not the board.
    expect(/ghost/i.test(root.textContent ?? '')).toBe(false);
  });
});

// ——— a quick sync, read as a meeting ———————————————————————————————————————

describe('a quick sync, in the chat', () => {
  const SYNC_WORD = DEFAULT_PATTERNS.cabinet.words.beats.sync;

  /** The first listed level whose plan draws a meeting, at this seed and tier. */
  function levelWithSync(): number {
    for (let i = 0; i < DEFAULT_PATTERNS.levels.levels.length; i++) {
      const plan = planOf(createRun({ seed: 1, tier: 0, endless: false, levelIndex: i }));
      if (plan.syncAt !== undefined) return i;
    }
    throw new Error('no listed level draws a meeting at this seed');
  }

  it('brackets the meeting and paints its lines apart from the replies', () => {
    mount = mountLevel(levelWithSync());
    const chat = root.querySelector('.vibe-chat')!;
    const marks = () => [...chat.querySelectorAll('.vibe-mark')].map((n) => n.textContent);
    expect(playUntil(mount, () => chat.querySelector('li.vibe-sync') !== null)).toBe(true);
    // The room opens before the first line of it.
    expect(marks()[0]).toBe(`${SYNC_WORD} starts`);
    const said = [...chat.querySelectorAll('li.vibe-sync')];
    expect(said.length).toBeGreaterThan(0);
    // A meeting line is the agent's voice but not one of its ordinary
    // replies, which is the whole point: the class differs.
    for (const li of said) {
      expect(li.classList.contains('vibe-agent')).toBe(true);
      expect(li.classList.contains('vibe-nag')).toBe(false);
    }
    const ordinary = [...chat.querySelectorAll('li.vibe-agent')].filter(
      (li) => !li.classList.contains('vibe-sync'),
    );
    expect(ordinary.length).toBeGreaterThan(0);
    // And it closes: the last line of a meeting is said and the meeting shut
    // inside one step, so the closing row is the half a beat word cannot do.
    expect(playUntil(mount, () => marks().includes(`${SYNC_WORD} ends`))).toBe(true);
    expect(marks().filter((m) => m === `${SYNC_WORD} starts`)).toHaveLength(1);
    // Still not a digit in the pane (G23).
    expect(/\d/.test(chat.textContent ?? '')).toBe(false);
  });
});

// ——— less movement, when the system asks for it ————————————————————————————

describe('less movement, when the system asks for it', () => {
  /** This browser's answer to the reduced-motion query, for one test. */
  function stubMotion(reduce: boolean): () => void {
    const was = window.matchMedia;
    window.matchMedia = ((query: string) =>
      ({
        matches: reduce && query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList) as unknown as typeof window.matchMedia;
    return () => {
      window.matchMedia = was;
    };
  }

  /** Send one line wrong, which is what the editor's jolt is cued off. */
  function sendBadLine(m: VibeMount): void {
    settle(m);
    const target = liveTarget();
    expect(target).not.toBe('');
    press(target[0] === 'x' ? 'q' : 'x');
    run(m, 1);
    press('Enter');
    run(m, 2);
  }

  const paid = () =>
    Number(root.querySelector('.vibe-valuation .vibe-num')?.textContent ?? '0') > 0;

  it('shakes the editor and throws the confetti when nothing was asked for', () => {
    const restore = stubMotion(false);
    try {
      mount = mountLevel();
      expect(mount.debug().motion.calm).toBe(false);
      sendBadLine(mount);
      expect(mount.debug().motion.shake).toBeGreaterThan(0);
      const m = mount;
      // The burst is thrown on a ship and falls out of the air a second or
      // so later, so the play stops on the frame it appears.
      expect(playUntil(m, () => m.debug().motion.specks > 0)).toBe(true);
    } finally {
      restore();
    }
  });

  it('drops the shake, the white and the confetti when it was', () => {
    const restore = stubMotion(true);
    try {
      mount = mountLevel();
      expect(mount.debug().motion.calm).toBe(true);
      sendBadLine(mount);
      // The pane does not move, and the transform is never written.
      expect(mount.debug().motion.shake).toBe(0);
      expect((root.querySelector('.vibe-editor') as HTMLElement).style.transform).toBe('');
      expect(playUntil(mount, paid)).toBe(true);
      // The ship still lands; the field just does not flash or burst.
      expect(mount.debug().motion.specks).toBe(0);
      expect(mount.debug().motion.flash).toBe(0);
      expect((root.querySelector('.vibe-editor') as HTMLElement).style.transform).toBe('');
    } finally {
      restore();
    }
  });
});

// ——— the level, under an endless run ———————————————————————————————————————

describe('the product, in endless', () => {
  it('moves the chat header and the preview label onto the new level', () => {
    mount = mountVibeTyper(root, {
      tier: 0,
      endless: true,
      seed: 1,
      agentName: 'Sprocket',
      theme: 'mechanical',
      integration: [],
      onExit: () => undefined,
      startAudio: false,
    });
    const who = () => root.querySelector('.vibe-chat .vibe-who')?.textContent;
    const label = () => root.querySelector('canvas.vibe-preview')?.getAttribute('aria-label');
    const first = mount.debug().product;
    expect(mount.debug().level).toBe(0);
    expect(who()).toBe(first);
    expect(label()).toBe(`the product as it is built: ${first}`);

    const m = mount;
    expect(playUntil(m, () => m.debug().level > 0, 12000)).toBe(true);
    const second = m.debug().product;
    // Two levels, two products: the header and the label follow the level
    // rather than staying on the one the run opened with.
    expect(second).not.toBe(first);
    expect(who()).toBe(second);
    expect(label()).toBe(`the product as it is built: ${second}`);
  });
});

// ——— the context the sound is built on ————————————————————————————————————

/** Enough of a context to be built and to refuse to be wired. */
class BrokenAudioContext {
  static built = 0;
  static closed = 0;
  currentTime = 0;
  sampleRate = 44100;
  state = 'running';
  destination = {};
  constructor() {
    BrokenAudioContext.built += 1;
  }
  createGain(): never {
    throw new Error('this context has no gain to give');
  }
  close() {
    BrokenAudioContext.closed += 1;
    return Promise.resolve();
  }
  resume() {
    return Promise.resolve();
  }
  addEventListener() {
    /* nothing is listening to a context that never got wired */
  }
  removeEventListener() {
    /* the same */
  }
}

/** The same fake context, handed back asleep, counting what asks it to run. */
class AsleepAudioContext extends FakeAudioContext {
  static made: AsleepAudioContext[] = [];
  // WebKit's word for a context an interruption took away: not 'suspended',
  // so a guard written for that state alone never matched it.
  override state = 'interrupted';
  resumes = 0;
  readonly onState: (() => void)[] = [];
  constructor() {
    super();
    AsleepAudioContext.made.push(this);
  }
  override resume() {
    this.resumes += 1;
    return Promise.resolve();
  }
  addEventListener(type: string, fn: () => void) {
    if (type === 'statechange') this.onState.push(fn);
  }
  removeEventListener() {
    /* the mount gives it back; nothing here reads that */
  }
}

/** Make every `Image` the field builds report itself broken on `src`. */
function brokenImages(): { restore: () => void } {
  const proto = Image.prototype as unknown as object;
  const was = Object.getOwnPropertyDescriptor(proto, 'src');
  Object.defineProperty(proto, 'src', {
    configurable: true,
    get(this: HTMLImageElement) {
      return this.getAttribute('src') ?? '';
    },
    set(this: HTMLImageElement, value: string) {
      this.setAttribute('src', value);
      this.dispatchEvent(new Event('error'));
    },
  });
  return {
    restore: () => {
      if (was) Object.defineProperty(proto, 'src', was);
      else delete (proto as Record<string, unknown>).src;
    },
  };
}

function mountWithSound(): VibeMount {
  return mountVibeTyper(root, {
    tier: 0,
    endless: false,
    levelIndex: 0,
    seed: 1,
    agentName: 'Sprocket',
    theme: 'mechanical',
    integration: [],
    onExit: () => undefined,
    startAudio: true,
  });
}

function chromeWords(): string {
  return root.querySelector('span[aria-label="cabinet"]')?.textContent ?? '';
}

describe('the context the sound is built on', () => {
  it('closes one it could not wire, and does not build another a gesture', () => {
    BrokenAudioContext.built = 0;
    BrokenAudioContext.closed = 0;
    (globalThis as unknown as { AudioContext: unknown }).AudioContext = BrokenAudioContext;
    mount = mountWithSound();
    expect(BrokenAudioContext.built).toBe(1);
    // Built inline as an argument, a context whose wiring threw was
    // unreachable and never closed — and the guard, back at null, let the
    // next gesture build another. A page may hold only a few.
    expect(BrokenAudioContext.closed, 'the context it could not use is closed').toBe(1);
    expect(mount.debug().music, 'and the run plays with no engine at all').toBeNull();

    root.querySelector('.vibe')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(BrokenAudioContext.built, 'a construction that threw is tried once').toBe(1);
    expect(chromeWords(), 'the row says the sound is gone').toContain('sound');
  });

  it('asks a context that is not running to come back, and takes its listeners down', async () => {
    AsleepAudioContext.made = [];
    (globalThis as unknown as { AudioContext: unknown }).AudioContext = AsleepAudioContext;
    const taken: string[] = [];
    const given: string[] = [];
    const addWas = document.addEventListener.bind(document);
    const removeWas = document.removeEventListener.bind(document);
    vi.spyOn(document, 'addEventListener').mockImplementation(((type: string, fn: never) => {
      taken.push(type);
      addWas(type as keyof DocumentEventMap, fn);
    }) as never);
    vi.spyOn(document, 'removeEventListener').mockImplementation(((type: string, fn: never) => {
      given.push(type);
      removeWas(type as keyof DocumentEventMap, fn);
    }) as never);
    try {
      mount = mountWithSound();
      const ctx = AsleepAudioContext.made[0]!;
      // `resume()` was called once, from inside a guard that returns early for
      // good once the engine exists — and only for 'suspended', which this
      // state is not.
      expect(ctx.resumes).toBe(1);
      await new Promise((done) => setTimeout(done, 0));
      expect(chromeWords(), 'a refusal is a word, not silence').toContain('asleep');

      // The browser says the state moved and it is still not running.
      for (const fn of ctx.onState) fn();
      expect(ctx.resumes).toBe(2);

      // The tab going away and coming back is the other moment it is asked.
      expect(taken).toContain('visibilitychange');
      mount.unmount();
      mount = null;
      expect(given, 'the mount gives the listener back').toContain('visibilitychange');
    } finally {
      vi.restoreAllMocks();
    }
  });
});

describe("the cabinet's own files", () => {
  it('says the frames are gone rather than drawing blocks in silence', () => {
    const images = brokenImages();
    try {
      mount = mountLevel();
      // Ghost carries 'art: using blocks' for exactly this; the typing
      // cabinet carried nothing at all.
      expect(chromeWords()).toContain('art');
      expect(chromeWords()).toContain('blocks');
      // Words, and no digit anywhere near them (G23).
      expect(/\d/.test(chromeWords())).toBe(false);
    } finally {
      images.restore();
    }
  });
});

describe('the prefs the typing cabinet keeps', () => {
  it('leaves a key it does not know alone while another is written', () => {
    localStorage.setItem('vibe.prefs', JSON.stringify({ tier: 2, best: 'a run of words' }));
    writeVibePrefs({ muted: 'on' });
    const raw = JSON.parse(localStorage.getItem('vibe.prefs')!) as Record<string, unknown>;
    expect(raw.best, 'a pref this build has never heard of is not this build to erase').toBe(
      'a run of words',
    );
    expect(raw.muted).toBe('on');
    expect(raw.tier).toBe(2);
    // The read is still the strict allowlist.
    expect((readVibePrefs() as Record<string, unknown>).best).toBeUndefined();
    expect(readVibePrefs().muted).toBe('on');
  });
});

// ——— the board, read rather than seen ——————————————————————————————————————
// Stage D. The two graphical readouts on the board carried no value a reader's
// software could get at, and one of them hid its own.

describe('the board a reader gets', () => {
  it('gives the context bar a role and a value that moves', () => {
    const m = mountLevel();
    mount = m;
    const bar = root.querySelector('.vibe-bar')!;
    expect(bar.getAttribute('role')).toBe('progressbar');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
    // The levers' own word for the bar, not a word this file invented.
    expect(bar.getAttribute('aria-label')).toBe(DEFAULT_PATTERNS.cabinet.words.context);
    const fill = root.querySelector('.vibe-bar-fill') as HTMLElement;
    // The bar's value is whatever the bar drew, from the first frame on.
    const reads = () => String(Math.round(parseFloat(fill.style.width)));
    expect(bar.getAttribute('aria-valuenow')).toBe(reads());
    const before = parseFloat(fill.style.width);
    for (let i = 0; i < 400; i++) m.tick(0.5);
    expect(parseFloat(fill.style.width)).toBeLessThan(before);
    // Whatever the bar drew, the value says the same thing.
    expect(bar.getAttribute('aria-valuenow')).toBe(reads());
  });

  it('puts the streak in words and marks the bullets decoration', () => {
    const m = mountLevel();
    mount = m;
    const dots = root.querySelector('.vibe-dots')!;
    // An aria-label on a generic span either replaces the bullets or is
    // dropped; either way the count did not reach the player.
    expect(dots.getAttribute('aria-label')).toBeNull();
    expect(dots.getAttribute('aria-hidden')).toBe('true');
    const said = root.querySelector('.vibe-streak .offscreen')!;
    m.tick(STEP);
    expect(said.textContent).toContain('none');
    // A word, never a digit (G23).
    expect(/\d/.test(said.textContent ?? '')).toBe(false);
  });
});

// ——— one grammar for a mounted cabinet ————————————————————————————————————
// Stage D. Field, controls row, status row, hint, the way out — Ghost's order,
// which this cabinet reversed by putting the exit second in its controls row
// and its status words in the row beside it.

describe('the chrome under the panes', () => {
  it('puts the way out last and the status words in a row of their own', () => {
    mount = mountLevel();
    const wrap = root.querySelector('section.vibe')!;
    const order = [...wrap.children].map((n) => {
      const node = n as HTMLElement;
      return node.className || node.tagName.toLowerCase();
    });
    expect(order).toEqual(['vibe-board', 'vibe-panes', 'row', 'row', 'muted', 'button']);
    const exit = wrap.lastElementChild as HTMLButtonElement;
    expect(exit.textContent).toBe('Back to the cabinets');
    // The sound toggle is alone among the buttons of the controls row; the
    // exit is no longer one control away from the toggle reached for most.
    const controls = wrap.children[2] as HTMLElement;
    expect([...controls.querySelectorAll('button')].map((b) => b.textContent)).toEqual([
      'sound: on',
    ]);
    // The status words — the voice, the cabinet's own files — in their own row.
    const statusRow = wrap.children[3] as HTMLElement;
    expect(statusRow.querySelector('[aria-label="cabinet"]')).not.toBeNull();
    expect(controls.querySelector('[aria-label="cabinet"]')).toBeNull();
  });
});

// ——— the end card ————————————————————————————————————————————————————————
// Stage D. The standup replaces the mount's wrap outright, so it dropped the
// player's type choice and quoted the chat at the browser default. Hardcore,
// for the same reason the standup tests above take it: it is the one listed
// tier where an empty bar is the end rather than a compaction.

describe('what the standup keeps', () => {
  it('quotes the chat at the type the player chose, and says what the seed is for', () => {
    writeVibePrefs({ font: 'huge' });
    const m = mountVibeTyper(root, {
      tier: 3,
      endless: false,
      levelIndex: 0,
      seed: 1,
      agentName: 'Sprocket',
      theme: 'mechanical',
      integration: [],
      onExit: () => undefined,
      startAudio: false,
    });
    mount = m;
    expect(toStandup(m)).toBe(true);
    const scene = root.querySelector('.vibe-standup') as HTMLElement;
    expect(scene.style.getPropertyValue('--vibe-font')).toBe(FONT_SIZES.huge);
    const seed = root.querySelector('.vibe-seed')!;
    // The one instruction for replaying a run was a `title` on a paragraph,
    // which a touch player and a reader's software both never get.
    const why = seed.nextElementSibling as HTMLElement;
    expect(why.textContent).toBe('Type this code on the menu to play the same run again.');
    expect(why.className).toContain('why');
  });
});

// ——— the soft keyboard ————————————————————————————————————————————————————
//
// The cabinet is dressed for a phone — the stylesheet collapses the board to
// one column under 1032px — and the one thing it asks for could not be given
// there: the keys were read off a window keydown, Stage C gave the editor a
// tab stop, and a tab stop on a plain section raises no keyboard. There was
// no text field anywhere in the mount.

/** The hidden box the soft keyboard types into. */
function typeBox(): HTMLInputElement {
  return root.querySelector('.vibe-editor input') as HTMLInputElement;
}

/** How many characters of the live line are down, right or wrong. */
function typedCount(): number {
  return root.querySelectorAll('.vibe-live .ok, .vibe-live .bad').length;
}

/** What a soft keyboard sends: the edit it is about to make. */
function edit(inputType: string, data?: string): void {
  const box = typeBox();
  const e = new InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    data: data ?? null,
    inputType,
  });
  box.dispatchEvent(e);
}

describe('the box a soft keyboard types into', () => {
  it('is a keyboard and not a document, so nothing corrects what is typed', () => {
    mount = mountLevel();
    const box = typeBox();
    expect(box).not.toBeNull();
    expect(box.type).toBe('text');
    expect(box.className).toContain('offscreen');
    expect(box.inputMode).toBe('text');
    expect(box.autocapitalize).toBe('off');
    expect(box.getAttribute('autocorrect')).toBe('off');
    expect(box.spellcheck).toBe(false);
    expect(box.autocomplete).toBe('off');
  });

  it('reads an inserted character as a keystroke, and a backspace as a backspace', () => {
    mount = mountLevel();
    settle(mount);
    const target = liveTarget();
    expect(target.length).toBeGreaterThan(2);
    edit('insertText', target[0]);
    mount.tick(STEP);
    expect(typedCount()).toBe(1);
    edit('insertText', target[1]);
    mount.tick(STEP);
    expect(typedCount()).toBe(2);
    edit('deleteContentBackward');
    mount.tick(STEP);
    expect(typedCount()).toBe(1);
  });

  it('sends the line on a keydown, because that is the key a soft keyboard sends', () => {
    mount = mountLevel();
    settle(mount);
    const target = liveTarget();
    for (const ch of target) {
      edit('insertText', ch);
      mount.tick(STEP);
    }
    expect(typedCount()).toBe(target.length);
    keyOn(typeBox(), 'Enter');
    mount.tick(STEP);
    mount.tick(STEP);
    settle(mount);
    // The line went; the editor is on the next one.
    expect(liveTarget()).not.toBe(target);
  });

  it('is read once: a printable keydown on the box is not a second keystroke', () => {
    mount = mountLevel();
    settle(mount);
    const target = liveTarget();
    // A hardware keyboard on a touch device sends BOTH to the focused box.
    // Only the edit is a move, so the character lands once.
    const key = new KeyboardEvent('keydown', { key: target[0]!, bubbles: true, cancelable: true });
    typeBox().dispatchEvent(key);
    edit('insertText', target[0]);
    mount.tick(STEP);
    expect(typedCount()).toBe(1);
  });

  it('leaves nothing in the box, and takes its listeners down with the field', () => {
    mount = mountLevel();
    settle(mount);
    const box = typeBox();
    box.value = 'x';
    box.dispatchEvent(
      new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'x' }),
    );
    expect(box.value).toBe('');
    const before = typedCount();
    mount.unmount();
    mount = null;
    edit('insertText', 'a');
    expect(typedCount()).toBe(before);
  });
});

// ——— what comes after a product ————————————————————————————————————————————
//
// The end card had one way forward and it was the menu, which then re-selected
// the product just finished, because the menu opens on the stored level. A
// player working down the story levels shipped one, was returned to the menu,
// and had to find the next one themselves.

/** The buttons on the standup's row, in the order they were laid down. */
function standupButtons(): string[] {
  return [...root.querySelectorAll('.vibe-standup .row button')].map((b) => b.textContent ?? '');
}

/** The product the field's chat is headed with. */
function headedProduct(): string {
  return root.querySelector('.vibe-chat .vibe-who')?.textContent ?? '';
}

describe('the end card’s way forward', () => {
  const LEVELS = DEFAULT_PATTERNS.levels.levels;

  it('walks the menu’s own order and stops at the end of the list', () => {
    const order = menuLevelOrder(LEVELS);
    expect(order.length).toBe(LEVELS.length);
    expect(new Set(order).size).toBe(LEVELS.length);
    // Stack heading by stack heading, which is not the raw index order.
    expect(nextLevelIndex(LEVELS, order[0]!)).toBe(order[1]!);
    // And it stops rather than wrapping into another stack with no word.
    expect(nextLevelIndex(LEVELS, order[order.length - 1]!)).toBeNull();
  });

  it('offers the same product again and the next one, and moves the stored level on', () => {
    mount = mountLevel(0, 1);
    expect(playToStandup(mount)).toBe(true);
    expect(standupLines()[1]).toBe('the level shipped');
    const after = nextLevelIndex(LEVELS, 0);
    expect(after).not.toBeNull();
    expect(standupButtons()).toEqual([
      'Build this again',
      'The next product',
      'Back to the cabinets',
      'Retro',
    ]);
    // The menu opens on the product AFTER the one that shipped, and the one
    // that shipped is marked, so a player picking by hand can see where they
    // were.
    const kept = readVibePrefs();
    expect(kept.level).toBe(after);
    expect(kept.shipped).toEqual([LEVELS[0]!.product]);

    // The next button remounts through the call the menu makes.
    const next = [...root.querySelectorAll('.vibe-standup .row button')].find(
      (b) => b.textContent === 'The next product',
    ) as HTMLButtonElement;
    next.click();
    mount = null;
    expect(root.querySelector('.vibe-standup')).toBeNull();
    expect(headedProduct()).toBe(LEVELS[after!]!.product);
    // Leave the new run the way a player would, so nothing outlives the test.
    (
      [...root.querySelectorAll('button')].find(
        (b) => b.textContent === 'Back to the cabinets',
      ) as HTMLButtonElement
    ).click();
  });

  it('gives the endless ladder a replay and no next, because there is none', () => {
    mount = mountVibeTyper(root, {
      tier: 3,
      endless: true,
      seed: 1,
      agentName: 'Sprocket',
      theme: 'mechanical',
      integration: [],
      onExit: () => undefined,
      startAudio: false,
    });
    expect(toStandup(mount)).toBe(true);
    expect(standupButtons()).toEqual(['Take this ladder again', 'Back to the cabinets', 'Retro']);
    // A ladder nobody shipped marks nothing and moves no stored level.
    expect(readVibePrefs().shipped).toBeUndefined();
  });
});
