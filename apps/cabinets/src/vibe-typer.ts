// Vibe Typer in the browser. You are the agent; your user is a vibe coder
// whose asks are absurd and who likes you. You type the reply, you type the
// code, the product assembles in the preview and the valuation rolls up.
//
// The shape is Ghost's (a mount that replaces the root, a requestAnimationFrame
// loop, prefs in localStorage, sound on the first gesture) and none of its
// game. DOM for the chat and the editor, because they are text; canvas for
// the preview, because it is a picture. The sim is headless and untouched:
// this module reads `state` and drains `state.events`, and never reaches
// inside the package for a rule.
//
// G23, the scoreboard is the game's number: valuation, vibes, streak and the
// context bar are on the field and nothing else is. No words a minute, no
// accuracy, no count of mistakes — not on the field, not on the standup, and
// in the retro only as words (G27).

import {
  PITCH_CAP,
  agentNameOf,
  codeOf,
  createRun,
  leversOf,
  planOf,
  seededRandom,
  stepRun,
  syncOf,
  NEAR_MISS,
  type RunInput,
  type RunState,
  type Snippet,
  type Tier,
} from '@mcp-arcade-cabinets/vibe-typer';

import { CONFETTI_MAX, cuesFor, shakeFor, type Cue } from './typer-cues';
import { createTyperAudio, isTheme, type Theme, type TyperAudio } from './typer-audio';
import { LEAVE_HOLD_MS, readKey } from './typer-keys';

// The feel the Director owns, in one place. High, not extreme (Q3.1). // Director
/** The sim's step. The loop accumulates real time and spends it here. */
const STEP = 1 / 60;
/** Frames of catch-up at most, so a tab that slept does not fast-forward a level. */
const MAX_STEPS = 8;
/** A creep is shown this long before its line is typeable (Q4.1). */
const CREEP_HOLD_MS = 600;
/** A piece pops in over this, scaling down from POP_FROM. */
const POP_MS = 240;
const POP_FROM = 1.3;
/** The valuation rolls up over this, and never rolls down. */
const ROLLUP_MS = 400;
/** The ship's white, and how long it sits. */
const FLASH_MS = 120;
/** A milestone word sits on the board this long. */
const TOAST_MS = 2000;
/** Characters a second a chat line types itself in at. */
const CHAT_CPS = 90;
/** The bar turns warm here, and hot at the near miss the package names. */
const WARM_AT = 0.25;
/** The preview, in CSS pixels, drawn at twice that. */
const PREVIEW_W = 480;
const PREVIEW_H = 360;
const PREVIEW_DPR = 2;
/** Clean lines whose lengths wander less than this read as steady (G27). */
const STEADY_CV = 0.45;
/** Characters a second, above and below which the retro says brisk or slow. */
const BRISK_CPS = 5.5;
const SLOW_CPS = 2.5;
/** Weak pairs are halved each run, so old trouble fades (G27). */
const WEAK_DECAY = 0.5;
/** The retro offers itself in full every this many standups (Q1.1). */
const RETRO_EVERY = 3;
/** Pairs the retro's key map shows. */
const RETRO_PAIRS = 8;

/**
 * The editor type, in four words. A typing game is read at arm's length and
 * v0.9.0's editor was too small for it, so `large` is the default and it is
 * visibly bigger than the `0.95rem` that shipped. One CSS custom property on
 * `.vibe` carries the chosen length to the editor, the chat and the beat word;
 * the scoreboard and the preview canvas are not on it.
 * // Director
 */
export const VIBE_FONTS = ['small', 'medium', 'large', 'huge'] as const;
export type VibeFont = (typeof VIBE_FONTS)[number];
/** // Director */
export const FONT_SIZES: Record<VibeFont, string> = {
  small: '0.9rem',
  medium: '1.05rem',
  large: '1.25rem',
  huge: '1.5rem',
};
/** // Director */
export const DEFAULT_FONT: VibeFont = 'large';
/** Share of the editor's width kept clear either side of the caret. // Director */
const CARET_MARGIN = 0.2;

export function isVibeFont(value: unknown): value is VibeFont {
  return typeof value === 'string' && (VIBE_FONTS as readonly string[]).includes(value);
}

/** The stacks, in words. The menu prints these, never a language's own name. */
export const STACK_WORDS: Record<string, string> = {
  bash: 'shell',
  csharp: 'sharp',
  java: 'java',
  javascript: 'script',
  python: 'python',
  sql: 'tables',
  integration: 'wires',
};

/** One palette a stack. The product is drawn in its own colors. */
const PALETTES: Record<string, string[]> = {
  bash: ['#5b8c5a', '#7aa878', '#3e6b48', '#9ec49a'],
  csharp: ['#6a8aaa', '#8fb0cc', '#47637f', '#a9c6dd'],
  java: ['#a08040', '#c2a063', '#7a5f2c', '#d8bd8a'],
  javascript: ['#e8a04a', '#f0bd7d', '#b87a2c', '#f6d6ac'],
  python: ['#5a7fa8', '#7fa3c6', '#3f5c7d', '#a8c4de'],
  sql: ['#7a6aa0', '#9a8cc0', '#584a78', '#bdb2d8'],
  integration: ['#2a5a5a', '#468080', '#1c4040', '#6fa5a5'],
};

const DEVICE: Record<string, 'phone' | 'terminal' | 'notebook' | 'ledger' | 'wires'> = {
  bash: 'terminal',
  csharp: 'phone',
  javascript: 'phone',
  python: 'notebook',
  sql: 'ledger',
  java: 'notebook',
  integration: 'wires',
};

/** The tiers, in words. Hardcore comes from the selector only (G25, G26). */
export const TIER_WORDS: { tier: Tier; word: string }[] = [
  { tier: 0, word: 'easy' },
  { tier: 1, word: 'warm' },
  { tier: 2, word: 'hot' },
  { tier: 3, word: 'hardcore' },
];

/** A level's band, in the same words. No band digits anywhere (G23). */
export function bandWord(min: number, max: number): string {
  const mid = (min + max) / 2;
  if (mid <= 2) return 'easy';
  if (mid <= 3.5) return 'warm';
  return 'hot';
}

// ——— prefs ————————————————————————————————————————————————————————————————
// Ghost keeps its own under `ghost.prefs`; these sit beside them under the
// `vibe.` prefix. Words and choices only: nothing here is a score.

const PREFS_KEY = 'vibe.prefs';
const WEAK_KEY = 'vibe.weak';

export interface VibePrefs {
  /** Which cabinet the menu opens on, so a returning player lands on their game. */
  cabinet?: 'ghost' | 'vibe';
  tier?: Tier;
  /** A listed level by index, or the endless ladder. */
  level?: number;
  endless?: 'on' | 'off';
  agent?: string;
  theme?: Theme;
  /** The editor type, from the menu's settings row. */
  font?: VibeFont;
  /** The seed box, as the player left it. */
  seed?: string;
  muted?: 'on' | 'off';
  /** How many standups this browser has seen; the retro offers itself on every third. */
  runs?: number;
  /** The last seed played, so a blank box draws the next one from it. */
  last?: number;
}

export function readVibePrefs(): VibePrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const o = parsed as Record<string, unknown>;
    const out: VibePrefs = {};
    if (o.cabinet === 'ghost' || o.cabinet === 'vibe') out.cabinet = o.cabinet;
    if (typeof o.tier === 'number' && [0, 1, 2, 3].includes(o.tier)) out.tier = o.tier as Tier;
    if (typeof o.level === 'number' && Number.isInteger(o.level) && o.level >= 0) {
      out.level = o.level;
    }
    if (o.endless === 'on' || o.endless === 'off') out.endless = o.endless;
    if (typeof o.agent === 'string') out.agent = cleanName(o.agent);
    if (isTheme(o.theme)) out.theme = o.theme;
    if (isVibeFont(o.font)) out.font = o.font;
    if (typeof o.seed === 'string') out.seed = o.seed.slice(0, 12);
    if (o.muted === 'on' || o.muted === 'off') out.muted = o.muted;
    if (typeof o.runs === 'number' && Number.isFinite(o.runs)) out.runs = Math.max(0, o.runs);
    if (typeof o.last === 'number' && Number.isFinite(o.last)) out.last = o.last >>> 0;
    return out;
  } catch {
    return {};
  }
}

export function writeVibePrefs(patch: VibePrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...readVibePrefs(), ...patch }));
  } catch {
    /* a private window or blocked storage: the game still plays */
  }
}

/** The pairs this browser has trouble with. Per viewer, never sent (G8). */
export function readWeak(): Record<string, number> {
  try {
    const raw = localStorage.getItem(WEAK_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, number> = {};
    for (const [pair, count] of Object.entries(parsed as Record<string, unknown>)) {
      if (pair.length === 2 && typeof count === 'number' && count > 0) out[pair] = count;
    }
    return out;
  } catch {
    return {};
  }
}

/** Merge a run's pairs into the stored ones, halving what was there (G27). */
export function mergeWeak(
  stored: Record<string, number>,
  run: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [pair, count] of Object.entries(stored)) {
    const faded = count * WEAK_DECAY;
    if (faded >= 0.25) out[pair] = faded;
  }
  for (const [pair, count] of Object.entries(run)) out[pair] = (out[pair] ?? 0) + count;
  return out;
}

function writeWeak(next: Record<string, number>): void {
  try {
    localStorage.setItem(WEAK_KEY, JSON.stringify(next));
  } catch {
    /* blocked storage: the next run simply starts fresh */
  }
}

/** A name the field can carry: no digit, no padding, and not a paragraph. */
export function cleanName(raw: string): string {
  return raw.replace(/\d/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
}

// ——— the mount ————————————————————————————————————————————————————————————

export interface VibeOpts {
  tier: Tier;
  endless: boolean;
  levelIndex?: number;
  seed: number;
  agentName: string;
  theme: Theme;
  /** The editor type. Left out, the mount takes the stored pref, then `large`. */
  font?: VibeFont;
  /** Integration snippets built from the bundled tapes (G30). */
  integration: Snippet[];
  onExit: () => void;
  /** True when the mount follows a click, so the sound may start at once. */
  startAudio: boolean;
}

export interface VibeMount {
  unmount(): void;
  /** The loop, one frame. The test drives this instead of the browser's clock. */
  tick(dt: number): void;
}

interface ChatItem {
  el: HTMLLIElement;
  full: string;
  shown: number;
}

interface Piece {
  id: string;
  size: number;
  /** Seconds left of the pop. */
  pop: number;
}

interface Speck {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Slice-and-dice over the pieces: each block's area is its own value (G24). */
export function packPieces(sizes: readonly number[], box: Box, rng: () => number): Box[] {
  if (sizes.length === 0) return [];
  const out: Box[] = [];
  const cut = (from: number, to: number, rect: Box, horizontal: boolean) => {
    if (to - from === 1) {
      out[from] = rect;
      return;
    }
    const total = sizes.slice(from, to).reduce((n, s) => n + Math.max(0.01, s), 0);
    let half = from;
    let run = 0;
    for (let i = from; i < to - 1; i++) {
      run += Math.max(0.01, sizes[i] ?? 0);
      half = i + 1;
      if (run >= total / 2) break;
    }
    const share = run / total;
    if (horizontal) {
      const w = rect.w * share;
      cut(from, half, { ...rect, w }, false);
      cut(half, to, { x: rect.x + w, y: rect.y, w: rect.w - w, h: rect.h }, false);
    } else {
      const h = rect.h * share;
      cut(from, half, { ...rect, h }, true);
      cut(half, to, { x: rect.x, y: rect.y + h, w: rect.w, h: rect.h - h }, true);
    }
  };
  cut(0, sizes.length, box, rng() < 0.5);
  return out;
}

export function mountVibeTyper(root: HTMLElement, opts: VibeOpts): VibeMount {
  root.replaceChildren();
  const prefs = readVibePrefs();
  const storedWeak = readWeak();
  const agentName = cleanName(opts.agentName) || 'the agent';

  const state: RunState = createRun({
    seed: opts.seed,
    tier: opts.tier,
    endless: opts.endless,
    weakBigrams: storedWeak,
    agentName,
    ...(opts.levelIndex !== undefined && !opts.endless ? { levelIndex: opts.levelIndex } : {}),
    ...(opts.integration.length > 0 ? { integration: opts.integration } : {}),
  });
  const levers = leversOf(state);
  const words = levers.cabinet.words;

  // ——— the furniture ——————————————————————————————————————————————————————
  const wrap = el('section', 'column vibe');
  // One property, three readers: the editor, the chat and the beat word.
  const font = opts.font ?? prefs.font ?? DEFAULT_FONT;
  wrap.style.setProperty('--vibe-font', FONT_SIZES[font]);

  const board = el('div', 'vibe-board');
  const valuationEl = el('span', 'vibe-stat vibe-valuation');
  const valuationWord = el('span', 'vibe-word', words.valuation);
  const valuationNum = el('b', 'vibe-num', '0');
  valuationEl.append(valuationWord, valuationNum);
  const hypeEl = el('span', 'vibe-stat vibe-hype');
  const hypeWord = el('span', 'vibe-word', words.hype);
  const hypeNum = el('b', 'vibe-num', '×1');
  hypeEl.append(hypeWord, hypeNum);
  const streakEl = el('span', 'vibe-stat vibe-streak');
  const streakWord = el('span', 'vibe-word', words.streak);
  const streakDots = el('span', 'vibe-dots', '');
  streakDots.setAttribute('aria-label', words.streak);
  streakEl.append(streakWord, streakDots);
  const barWrap = el('span', 'vibe-stat vibe-context');
  const barWord = el('span', 'vibe-word', words.context);
  const bar = el('span', 'vibe-bar');
  const barFill = el('span', 'vibe-bar-fill');
  bar.append(barFill);
  barWrap.append(barWord, bar);
  const toast = el('span', 'vibe-toast', '');
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  board.append(valuationEl, hypeEl, streakEl, barWrap, toast);

  const panes = el('div', 'vibe-panes');

  const chatPane = el('section', 'vibe-pane vibe-chat');
  const chatHead = el('div', 'vibe-head', `${planOf(state).product} · ${agentNameOf(state)}`);
  const chatList = el('ul', 'vibe-lines');
  const chatScroll = el('div', 'vibe-scroll');
  chatScroll.append(chatList);
  chatPane.append(chatHead, chatScroll);

  const editorPane = el('section', 'vibe-pane vibe-editor');
  const beatWord = el('div', 'vibe-head vibe-beat', words.beats[state.beat]);
  const codeBox = el('div', 'vibe-code');
  const tabHint = el('div', 'vibe-tab', 'Tab');
  tabHint.hidden = true;
  editorPane.append(beatWord, codeBox, tabHint);

  const canvas = el('canvas', 'vibe-preview');
  canvas.width = PREVIEW_W * PREVIEW_DPR;
  canvas.height = PREVIEW_H * PREVIEW_DPR;
  canvas.setAttribute('aria-label', `the product as it is built: ${planOf(state).product}`);
  const previewPane = el('section', 'vibe-pane vibe-preview-pane');
  previewPane.append(canvas);

  panes.append(chatPane, editorPane, previewPane);

  const controls = el('div', 'row');
  const mute = el('button', undefined, 'Sound on');
  mute.type = 'button';
  const back = el('button', undefined, 'Back to the cabinets');
  back.type = 'button';
  controls.append(mute, back);

  const hint = el(
    'p',
    'muted',
    'Type what you see. Enter sends a line, Tab takes the rest when the ghost offers it, hold Escape to leave.',
  );

  wrap.append(board, panes, controls, hint);
  root.append(wrap);
  root.classList.add('playing');

  // ——— the state the shell keeps ————————————————————————————————————————————
  const ctx2d = canvas.getContext('2d');
  const queue: RunInput[] = [];
  const chat: ChatItem[] = [];
  let chatAt = 0;
  let acc = 0;
  let left = false;
  let over = false;
  let audio: TyperAudio | null = null;
  let muted = prefs.muted === 'on';
  mute.textContent = muted ? 'Sound off' : 'Sound on';
  let shake = 0;
  let flash = 0;
  let flashLeft = 0;
  let toastLeft = 0;
  let rolled = 0;
  /** Seconds the creep frame has been held, in sim frame time (never the wall clock). */
  let creepHeld = 0;
  let escSince = 0;
  let lastSig = '';
  const pieces: Piece[] = [];
  let specks: Speck[] = [];
  let shipped = false;
  const rng = seededRandom(planOf(state).seed);
  // What the retro reads: how long each clean line took and how long it was.
  const cleanLines: { seconds: number; chars: number }[] = [];
  let lineStart = state.clock;
  let lineTarget = state.target;

  const ensureAudio = () => {
    if (audio || typeof AudioContext === 'undefined') return;
    try {
      const base = import.meta.env.BASE_URL || '/';
      audio = createTyperAudio(new AudioContext(), base, planOf(state).seed);
      audio.setTheme(opts.theme);
      audio.setMuted(muted);
      audio.resume();
    } catch {
      audio = null;
    }
  };

  // ——— the panes, drawn ————————————————————————————————————————————————————

  const pushChat = () => {
    for (let i = chatAt; i < state.chat.length; i++) {
      const line = state.chat[i]!;
      const node = el('li', line.who === 'user' ? 'vibe-user' : 'vibe-agent', '');
      chatList.append(node);
      chat.push({ el: node, full: line.line, shown: 0 });
    }
    chatAt = state.chat.length;
  };

  const runChat = (dt: number) => {
    let scrolled = false;
    for (const item of chat) {
      if (item.shown >= item.full.length) continue;
      item.shown = Math.min(item.full.length, item.shown + CHAT_CPS * dt);
      item.el.textContent = item.full.slice(0, Math.floor(item.shown));
      scrolled = true;
    }
    if (scrolled) chatScroll.scrollTop = chatScroll.scrollHeight;
  };

  /** One line of the editor, character by character: pending, ok or bad. */
  const lineNode = (target: string, typed: string, errors: readonly number[]): HTMLDivElement => {
    const node = el('div', 'vibe-line vibe-live');
    const bad = new Set(errors);
    const copilot = state.copilot !== null;
    for (let i = 0; i < Math.max(target.length, typed.length); i++) {
      const ch = i < typed.length ? typed[i]! : (target[i] ?? '');
      const span = el('span');
      if (i < typed.length) span.className = bad.has(i) ? 'bad' : 'ok';
      else span.className = copilot ? 'pending shimmer' : 'pending';
      span.textContent = ch === ' ' ? ' ' : ch;
      if (i === typed.length) node.append(el('span', 'vibe-caret', ''));
      node.append(span);
    }
    if (typed.length >= Math.max(target.length, typed.length)) {
      node.append(el('span', 'vibe-caret', ''));
    }
    return node;
  };

  const drawEditor = () => {
    const sig = [
      state.beat,
      state.lineIndex,
      state.target,
      state.typed,
      state.errors.join(','),
      state.copilot ? 'c' : '-',
      state.requestIndex,
      over ? 'over' : '',
    ].join('|');
    if (sig === lastSig) return;
    lastSig = sig;
    beatWord.textContent = words.beats[state.beat];
    codeBox.replaceChildren();
    if (state.beat === 'code' || state.beat === 'creep') {
      const lines = codeOf(state);
      lines.forEach((line, i) => {
        if (i === state.lineIndex && state.beat === 'code') {
          codeBox.append(lineNode(state.target, state.typed, state.errors));
          return;
        }
        const node = el('div', i < state.lineIndex ? 'vibe-line done' : 'vibe-line', line || ' ');
        codeBox.append(node);
      });
      if (state.beat === 'creep') {
        codeBox.append(el('div', 'vibe-line landing', 'one more line is coming'));
      }
    } else if (state.beat === 'reply' || state.beat === 'sync') {
      codeBox.append(lineNode(state.target, state.typed, state.errors));
      if (state.beat === 'sync') {
        for (const line of syncOf(state).slice(state.lineIndex + 1)) {
          codeBox.append(el('div', 'vibe-line', line));
        }
      }
    } else {
      codeBox.append(el('div', 'vibe-line', ' '));
    }
    tabHint.hidden = state.copilot === null || state.beat === 'request' || state.beat === 'ship';
    keepCaretInView();
  };

  /**
   * A code line never breaks inside a token, so at `huge` a long line runs
   * past the pane and the box scrolls sideways instead. Keep the caret on
   * screen when it does. jsdom reports zeros here and the guard skips it.
   */
  const keepCaretInView = () => {
    const caret = codeBox.querySelector('.vibe-caret') as HTMLElement | null;
    const view = codeBox.clientWidth;
    if (!caret || view <= 0) return;
    const x = caret.offsetLeft;
    const margin = view * CARET_MARGIN;
    if (x - codeBox.scrollLeft > view - margin) codeBox.scrollLeft = x - view + margin;
    else if (x - codeBox.scrollLeft < margin) codeBox.scrollLeft = Math.max(0, x - margin);
  };

  const drawBoard = (dt: number) => {
    const target = state.valuation;
    if (target > rolled) {
      const k = 1 - Math.pow(0.001, dt / (ROLLUP_MS / 1000));
      rolled = rolled + (target - rolled) * k;
      if (target - rolled < 0.5) rolled = target;
    }
    valuationNum.textContent = String(Math.round(rolled));
    hypeNum.textContent = `×${state.hype}`;
    const dots = Math.min(state.streak, PITCH_CAP);
    streakDots.textContent = '•'.repeat(dots);
    barFill.style.width = `${Math.max(0, Math.min(1, state.context)) * 100}%`;
    barFill.classList.toggle('warm', state.context < WARM_AT && state.context >= NEAR_MISS);
    barFill.classList.toggle('near', state.context < NEAR_MISS);
    if (toastLeft > 0) {
      toastLeft = Math.max(0, toastLeft - dt * 1000);
      if (toastLeft === 0) toast.textContent = '';
    }
  };

  // ——— the preview ————————————————————————————————————————————————————————

  const frameBox = (kind: string): Box => {
    if (kind === 'phone') return { x: 170, y: 40, w: 140, h: 280 };
    if (kind === 'terminal') return { x: 60, y: 60, w: 360, h: 240 };
    if (kind === 'notebook') return { x: 70, y: 50, w: 340, h: 260 };
    if (kind === 'ledger') return { x: 70, y: 60, w: 340, h: 240 };
    return { x: 60, y: 60, w: 360, h: 240 };
  };

  const drawFrame = (c: CanvasRenderingContext2D, kind: string, box: Box) => {
    c.strokeStyle = '#3a3a4a';
    c.lineWidth = 2;
    c.fillStyle = '#101018';
    c.fillRect(box.x - 10, box.y - 22, box.w + 20, box.h + 44);
    c.strokeRect(box.x - 10, box.y - 22, box.w + 20, box.h + 44);
    c.fillStyle = '#9a9aa6';
    if (kind === 'phone') {
      c.fillRect(box.x + box.w / 2 - 18, box.y - 14, 36, 4);
      c.fillRect(box.x + box.w / 2 - 14, box.y + box.h + 10, 28, 4);
    } else if (kind === 'terminal') {
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.arc(box.x + 6 + i * 14, box.y - 12, 4, 0, Math.PI * 2);
        c.fill();
      }
    } else if (kind === 'notebook') {
      c.fillRect(box.x - 10, box.y + box.h + 12, box.w + 20, 6);
    } else if (kind === 'ledger') {
      for (let i = 0; i < 4; i++) {
        c.fillRect(box.x, box.y - 16 + i * 2, box.w * (0.2 + i * 0.1), 1);
      }
    } else {
      c.beginPath();
      c.moveTo(box.x - 10, box.y + box.h / 2);
      c.lineTo(box.x + box.w + 10, box.y + box.h / 2);
      c.stroke();
    }
  };

  const drawPreview = (dt: number) => {
    if (!ctx2d) return;
    const c = ctx2d;
    c.save();
    c.setTransform(PREVIEW_DPR, 0, 0, PREVIEW_DPR, 0, 0);
    c.clearRect(0, 0, PREVIEW_W, PREVIEW_H);
    c.fillStyle = '#101018';
    c.fillRect(0, 0, PREVIEW_W, PREVIEW_H);
    const plan = planOf(state);
    const kind = DEVICE[plan.stack] ?? 'terminal';
    const box = frameBox(kind);
    drawFrame(c, kind, box);
    const palette = PALETTES[plan.stack] ?? PALETTES.bash!;
    const layout = packPieces(
      pieces.map((p) => p.size),
      box,
      seededRandom(plan.seed),
    );
    pieces.forEach((piece, i) => {
      const rect = layout[i];
      if (!rect) return;
      if (piece.pop > 0) piece.pop = Math.max(0, piece.pop - dt * 1000);
      const t = piece.pop / POP_MS;
      const scale = 1 + (POP_FROM - 1) * t;
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      const w = Math.max(2, (rect.w - 4) * scale);
      const h = Math.max(2, (rect.h - 4) * scale);
      c.fillStyle = palette[i % palette.length]!;
      c.globalAlpha = 0.9;
      c.fillRect(cx - w / 2, cy - h / 2, w, h);
      c.globalAlpha = 1;
    });
    // The confetti, seeded, and the ribbon in words.
    specks = specks.filter((s) => s.life > 0);
    for (const s of specks) {
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 240 * dt;
      c.fillStyle = s.color;
      c.globalAlpha = Math.max(0, Math.min(1, s.life));
      c.fillRect(s.x, s.y, 4, 6);
      c.globalAlpha = 1;
    }
    if (shipped) {
      c.fillStyle = '#e8a04a';
      c.fillRect(0, PREVIEW_H - 46, PREVIEW_W, 26);
      c.fillStyle = '#101018';
      c.font = '16px system-ui, sans-serif';
      c.fillText('deployed', 16, PREVIEW_H - 27);
    }
    if (flashLeft > 0) {
      flashLeft = Math.max(0, flashLeft - dt * 1000);
      c.fillStyle = `rgba(255,255,255,${(flash * flashLeft) / FLASH_MS})`;
      c.fillRect(0, 0, PREVIEW_W, PREVIEW_H);
    }
    c.restore();
  };

  const throwConfetti = (n: number) => {
    const count = Math.min(CONFETTI_MAX, n);
    const palette = PALETTES[planOf(state).stack] ?? PALETTES.bash!;
    const made: Speck[] = [];
    for (let i = 0; i < count; i++) {
      made.push({
        x: PREVIEW_W / 2 + (rng() * 2 - 1) * 60,
        y: PREVIEW_H / 2,
        vx: (rng() * 2 - 1) * 220,
        vy: -60 - rng() * 240,
        life: 0.8 + rng() * 0.8,
        color: palette[Math.floor(rng() * palette.length)]!,
      });
    }
    specks = [...specks, ...made].slice(-CONFETTI_MAX);
  };

  // ——— the cues ————————————————————————————————————————————————————————————

  const feel = (cue: Cue) => {
    if (cue.shake > 0) shake = Math.max(shake, shakeFor(cue.shake, state.target.length));
    if (cue.flash > 0) {
      flash = cue.flash;
      flashLeft = FLASH_MS;
    }
    if (cue.confetti > 0) {
      throwConfetti(cue.confetti);
      shipped = true;
    }
    if (cue.toast !== '') {
      toast.textContent = cue.toast;
      toastLeft = TOAST_MS;
    }
  };

  const drainEvents = () => {
    const cues = cuesFor(state.events);
    for (const event of state.events) {
      if (event.kind === 'piece')
        pieces.push({ id: `p${pieces.length}`, size: event.size, pop: POP_MS });
      if (event.kind === 'line' && event.ok) {
        cleanLines.push({
          seconds: Math.max(0.01, state.clock - lineStart),
          chars: Math.max(1, lineTarget.length),
        });
      }
    }
    for (const cue of cues) {
      feel(cue);
      audio?.play(cue);
    }
    if (state.target !== lineTarget) {
      lineTarget = state.target;
      lineStart = state.clock;
    }
  };

  // ——— the loop ————————————————————————————————————————————————————————————

  // The creep frame is held for CREEP_HOLD_MS of frame time so the appended
  // line is seen before it is typeable (Q4.1). Sim time does not accumulate
  // while it is held, so the loop never falls behind and never catches up in
  // a burst afterwards (the review's second change).
  const holding = (dt: number): boolean => {
    if (state.beat !== 'creep') {
      creepHeld = 0;
      return false;
    }
    creepHeld += dt;
    return creepHeld < CREEP_HOLD_MS / 1000;
  };

  const advance = (dt: number) => {
    if (over) return;
    if (holding(dt)) return;
    acc = Math.min(acc + dt, STEP * MAX_STEPS);
    let steps = 0;
    while (acc >= STEP && steps < MAX_STEPS && !state.over) {
      acc -= STEP;
      steps += 1;
      const input = queue.shift() ?? {};
      stepRun(state, input, STEP);
      pushChat();
      drainEvents();
      if (state.beat === 'creep') break;
    }
    if (state.over && !over) standup();
  };

  const tick = (dt: number) => {
    if (left) return;
    advance(dt);
    runChat(dt);
    drawBoard(dt);
    drawEditor();
    drawPreview(dt);
    if (shake > 0) {
      shake = Math.max(0, shake - dt * 24);
      const x = (rng() * 2 - 1) * shake;
      const y = (rng() * 2 - 1) * shake;
      editorPane.style.transform = shake > 0.1 ? `translate(${x}px, ${y}px)` : '';
    }
    const hold = state.requestIndex >= planOf(state).requests.length - 1;
    // A meeting is a breather: the bed drops to base tempo for it (Q3.7).
    audio?.tick(dt, state.beat === 'sync' ? 1 : state.hype, hold);
    if (escSince > 0) {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (now - escSince >= LEAVE_HOLD_MS) {
        escSince = 0;
        leave();
        opts.onExit();
      }
    }
  };

  let raf = 0;
  let last = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const frame = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    tick(dt);
    raf = requestAnimationFrame(frame);
  };
  if (typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(frame);

  // ——— input ———————————————————————————————————————————————————————————————

  const onKeyDown = (e: KeyboardEvent) => {
    if (left) return;
    if (e.target instanceof Element && e.target.closest('input, select, textarea')) return;
    const read = readKey(e);
    if (read.prevent) e.preventDefault();
    if (read.kind === 'leave') {
      if (escSince === 0) {
        escSince = typeof performance !== 'undefined' ? performance.now() : Date.now();
      }
      return;
    }
    if (read.kind === 'ignore') return;
    ensureAudio();
    if (over) return;
    queue.push(read.input);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    // Escape is the one key whose release matters: a tap must do nothing.
    if (e.key === 'Escape') escSince = 0;
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  mute.addEventListener('click', () => {
    muted = !muted;
    mute.textContent = muted ? 'Sound off' : 'Sound on';
    writeVibePrefs({ muted: muted ? 'on' : 'off' });
    ensureAudio();
    audio?.setMuted(muted);
  });
  wrap.addEventListener('click', () => {
    ensureAudio();
  });
  back.addEventListener('click', () => {
    leave();
    opts.onExit();
  });

  // ——— the standup —————————————————————————————————————————————————————————

  /** A count in words, or "many" past twelve. No digits on the standup (G23). */
  const countWord = (n: number): string => {
    const spelled = [
      'none',
      'one',
      'two',
      'three',
      'four',
      'five',
      'six',
      'seven',
      'eight',
      'nine',
      'ten',
      'eleven',
      'twelve',
    ];
    return spelled[n] ?? 'many';
  };

  const consistencyWord = (): string => {
    if (cleanLines.length < 4) return 'still finding it';
    const rates = cleanLines.map((l) => l.chars / l.seconds);
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    if (mean <= 0) return 'still finding it';
    const variance = rates.reduce((a, r) => a + (r - mean) * (r - mean), 0) / rates.length;
    return Math.sqrt(variance) / mean < STEADY_CV ? 'steady' : 'uneven';
  };

  const speedWord = (): string => {
    if (cleanLines.length === 0) return 'unhurried';
    const chars = cleanLines.reduce((a, l) => a + l.chars, 0);
    const seconds = cleanLines.reduce((a, l) => a + l.seconds, 0);
    const cps = seconds > 0 ? chars / seconds : 0;
    if (cps >= BRISK_CPS) return 'brisk';
    if (cps >= SLOW_CPS) return 'steady';
    return 'slow';
  };

  const retroPanel = (): HTMLElement => {
    const panel = el('section', 'vibe-retro');
    panel.append(el('h2', undefined, 'the retro'));
    const pairs = Object.entries(state.weakBigrams)
      .sort((a, b) => b[1] - a[1])
      .slice(0, RETRO_PAIRS);
    if (pairs.length === 0) {
      panel.append(el('p', 'muted', 'nothing tripped you this run'));
    } else {
      const map = el('div', 'vibe-keys');
      const top = pairs[0]![1];
      for (const [pair, count] of pairs) {
        const key = el('span', 'vibe-key', pair.replace(/ /g, '␣'));
        key.style.opacity = String(0.35 + 0.65 * (count / top));
        key.title = 'a pair worth another pass';
        map.append(key);
      }
      panel.append(el('p', 'muted', 'the pairs that caught you'), map);
    }
    panel.append(
      el('p', undefined, `your hands were ${consistencyWord()}`),
      el('p', 'muted', `and ${speedWord()}`),
      el('p', 'muted', 'measured against this browser and nothing else'),
    );
    return panel;
  };

  function standup() {
    over = true;
    const plan = planOf(state);
    const runs = (prefs.runs ?? 0) + 1;
    writeVibePrefs({ runs, last: opts.seed });
    writeWeak(mergeWeak(storedWeak, state.weakBigrams));
    audio?.end();
    const scene = el('section', 'column vibe-standup');
    scene.append(el('h1', undefined, plan.product));
    const lastUser = [...state.chat].reverse().find((c) => c.who === 'user');
    scene.append(
      el('p', 'muted', state.ended === 'shipped' ? 'the level shipped' : 'the context ran out'),
    );
    const previewHolder = el('div', 'vibe-standup-preview');
    previewHolder.append(canvas);
    scene.append(previewHolder);
    if (lastUser) scene.append(el('p', 'vibe-user', lastUser.line));
    const tally = el('div', 'row');
    const val = el('span', 'vibe-stat');
    val.append(
      el('span', 'vibe-word', words.valuation),
      el('b', 'vibe-num', String(Math.round(state.valuation))),
    );
    tally.append(val);
    if (state.endless) {
      tally.append(el('span', 'muted', `levels: ${countWord(state.levelIndex + 1)}`));
    }
    scene.append(tally);
    if (state.milestones.length > 0) {
      scene.append(el('p', 'muted', state.milestones.join(' · ')));
    }
    const seedLine = el('p', 'vibe-seed', `seed ${opts.seed}`);
    seedLine.title = 'Type this seed on the menu to play the same run again.';
    scene.append(seedLine);
    const row = el('div', 'row');
    const again = el('button', 'commit', 'Back to the cabinets');
    again.type = 'button';
    row.append(again);
    const offered = runs % RETRO_EVERY === 0;
    const retro = el('button', offered ? undefined : 'linky', 'Retro');
    retro.type = 'button';
    if (!offered) retro.title = 'a quieter look at the run, if you want one';
    row.append(retro);
    scene.append(row);
    let panel: HTMLElement | null = null;
    retro.addEventListener('click', () => {
      if (panel) {
        panel.remove();
        panel = null;
        return;
      }
      panel = retroPanel();
      scene.append(panel);
    });
    again.addEventListener('click', () => {
      leave();
      opts.onExit();
    });
    root.replaceChildren(scene);
    again.focus();
  }

  function leave() {
    if (left) return;
    left = true;
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    audio?.end();
    audio?.close();
    audio = null;
    root.classList.remove('playing');
  }

  pushChat();
  drawEditor();
  drawBoard(0);
  drawPreview(0);
  if (opts.startAudio) ensureAudio();

  return {
    unmount: leave,
    tick,
  };
}
