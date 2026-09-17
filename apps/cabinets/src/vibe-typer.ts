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
  VALUE_TOLERANCE,
  agentNameOf,
  codeOf,
  corpusOf,
  createRun,
  endlessPeek,
  feedRequests,
  gateCode,
  leversOf,
  nextSeed,
  planOf,
  seededRandom,
  stepRun,
  suppliedAsks,
  suppliedCount,
  syncOf,
  NEAR_MISS,
  STACKS,
  type Band,
  type CodeGateReason,
  type RunInput,
  type RunState,
  type Snippet,
  type Stack,
  type Tier,
} from '@mcp-arcade-cabinets/vibe-typer';
import { coarsePointer } from './pointer';
import { LOCAL_SEATS, probeSeatModels } from './seats';
import {
  createVibeVoicer,
  speakLine,
  vibeVoiceLine,
  voiceHealth,
  type SpeakAnswer,
  type VibeVoiceJob,
} from '@mcp-arcade-cabinets/cabinet-server/src/browser';

import { CONFETTI_MAX, cuesFor, shakeFor, type Cue } from './typer-cues';
import { CARD_ASPECT, CARD_SLUGS, DEPLOY_SLUG, RIBBON_ASPECT, cardSlugOf } from './typer-cards';
import { PIECE_KINDS, pieceKindOf, type PieceKind } from './typer-tiles';
import {
  createTyperAudio,
  DEFAULT_MUSIC,
  domBedMaker,
  isMusicMode,
  isTheme,
  type MusicMode,
  type SampleState,
  type Theme,
  type TyperAudio,
  type VibeTrackKey,
} from './typer-audio';
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
/** The middle of the deploy band, from the bottom of the preview. Unchanged. */
const DEPLOY_MID = 33;
/** A milestone card is drawn this wide over the preview, leaving a margin. */
export const CARD_W = 440;
/** The card fades in over this and out over this, unless the player asked for calm. */
const CARD_FADE_MS = 200;
/** The milestone word over the card: cream, because the card's empty half is navy. */
const CARD_WORD = '#f6d6ac';
/** The milestone word's size on the card, in the field's own face. */
const CARD_FONT = '28px system-ui, sans-serif';
/**
 * The ribbon's face, in one place. It was written out twice — once for the
 * painted ribbon and once for the flat bar behind it — while every other word
 * on this canvas takes `CARD_FONT`, so the two paths could drift apart at the
 * one moment the player is being congratulated.
 */
const RIBBON_FONT = '16px system-ui, sans-serif';
/**
 * The word on the ribbon.
 *
 * Every other word drawn on this cabinet's surfaces comes from the levers —
 * `words.valuation`, `words.hype`, `words.streak`, `words.context`,
 * `words.beats`, and the milestone word from `cue.toast` — so a cabinet that
 * renames the act renames everything except the band the player sees at the
 * moment of shipping. It is one constant rather than two string literals
 * here; taking it from the levers wants a `words.deployed` key, which is
 * `CabinetSet` in `packages/vibe-typer/src/patterns.ts` and its loader, and
 * is not this file's to add.
 */
const DEPLOY_WORD = 'deployed';
/**
 * The room the milestone word has on the card: its right half, which is where
 * it is drawn because every card keeps its motif in its left third. The word
 * comes from the levers, so its length is not fixed by this file — without a
 * bound, anything past about twenty characters ran off the card's right edge
 * and then off the preview. Ghost's own draw adapter has always clamped
 * (`FIELD.width - 32`); this is the same rule for the same act.
 */
const CARD_WORD_MAX = CARD_W * 0.62;
/** Characters a second a chat line types itself in at. */
const CHAT_CPS = 90;
/**
 * The two quiet rows that bracket a quick sync in the chat. They are built
 * from the beat's own word, so a cabinet that renames the meeting renames
 * these with it, and they carry no digit.
 */
const meetingStarts = (word: string): string => `${word} starts`;
const meetingEnds = (word: string): string => `${word} ends`;
/** The bar turns warm here, and hot at the near miss the package names. */
const WARM_AT = 0.25;
/** The preview, in CSS pixels, drawn at twice that. */
export const PREVIEW_W = 480;
export const PREVIEW_H = 360;
/** The room a drawn word has on the ribbon before it is condensed, not clipped. */
const RIBBON_MAX = PREVIEW_W - 32;
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

// The endless seat (G28 as slice 3 amends it). The seat writes a whole
// request; the code gate accepts or refuses it; a refusal is re-asked once
// and then forgotten, because the corpus is always there (G11, G13).
// // Director
/** How long one ask may take before the shell stops listening for it. */
const ENDLESS_TIMEOUT_MS = 20_000;
/** How often the shell looks for a daemon while the seat is off. */
const TAGS_EVERY_MS = 5000;
/** How long the field's repeated look for a daemon may take. */
const TAGS_TIMEOUT_MS = 2000;
/** How often the shell asks whether a voice worker is up. Ghost's cadence. */
const VOICE_PROBE_MS = 5000;
/** Asks for one request slot before the shell gives that slot to the corpus. */
const ENDLESS_TRIES = 2;
/** Weak pairs the seat is told about. */
const WEAK_TO_SEAT = 8;
/** Asks the seat is shown so it does not repeat itself. */
const RECENT_TO_SEAT = 3;

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

type DeviceKind = 'phone' | 'terminal' | 'notebook' | 'ledger' | 'wires';

const DEVICE: Record<string, DeviceKind> = {
  bash: 'terminal',
  csharp: 'phone',
  javascript: 'phone',
  python: 'notebook',
  sql: 'ledger',
  java: 'notebook',
  integration: 'wires',
};

/** One painted frame a device kind, under `vibe/frames/<kind>.png` at 960x720. */
const DEVICE_KINDS: DeviceKind[] = ['terminal', 'phone', 'notebook', 'ledger', 'wires'];

/** The tiers, in words. Hardcore comes from the selector only (G25, G26). */
export const TIER_WORDS: { tier: Tier; word: string }[] = [
  { tier: 0, word: 'easy' },
  { tier: 1, word: 'warm' },
  { tier: 2, word: 'hot' },
  { tier: 3, word: 'hardcore' },
];

/**
 * The levels grouped the way the menu prints them: one group a stack, the
 * known stacks in the corpus order and any stack the levers grew after them,
 * and each group's levels in the levers' own order.
 *
 * One function, two readers. The menu paints these groups and the end card's
 * next product walks them, because a next that walked the raw index would
 * jump between stacks and land the player somewhere the menu never showed
 * them in that order.
 */
export function menuStackGroups(
  levels: readonly { stack: string }[],
): { stack: string; levels: number[] }[] {
  const byStack = new Map<string, number[]>();
  levels.forEach((level, i) => {
    const bucket = byStack.get(level.stack);
    if (bucket) bucket.push(i);
    else byStack.set(level.stack, [i]);
  });
  const order = [
    ...STACKS.filter((stack) => byStack.has(stack)),
    // A stack the levers grow that this shell has never heard of still gets
    // a group, after the known ones, rather than no row at all.
    ...[...byStack.keys()].filter((stack) => !(STACKS as readonly string[]).includes(stack)),
  ];
  return order.map((stack) => ({ stack, levels: byStack.get(stack) ?? [] }));
}

/** Every level in the menu's order, flat. */
export function menuLevelOrder(levels: readonly { stack: string }[]): number[] {
  return menuStackGroups(levels).flatMap((group) => group.levels);
}

/**
 * The level after this one in the menu's order, or null at the end of the
 * list. It stops rather than wrapping: a wrap would hand the player a product
 * from another stack with no word about where they had been taken.
 */
export function nextLevelIndex(
  levels: readonly { stack: string }[],
  current: number,
): number | null {
  const order = menuLevelOrder(levels);
  const at = order.indexOf(current);
  if (at < 0 || at + 1 >= order.length) return null;
  return order[at + 1] ?? null;
}

/** A level's band, in the same words. No band digits anywhere (G23). */
export function bandWord(min: number, max: number): string {
  const mid = (min + max) / 2;
  if (mid <= 2) return 'easy';
  if (mid <= 3.5) return 'warm';
  return 'hot';
}

// ——— the daemon, read once ————————————————————————————————————————————————
// `LOCAL_SEATS`, `probeSeatModels` and `probeSeatName` live in `./seats` now,
// which neither cabinet's mount imports: the menu could not ask whether a
// seat exists without pulling this whole module — and `typer-cues`,
// `typer-cards`, `typer-tiles` and `typer-audio` behind it — into a
// Ghost-only bundle's graph.

// ——— prefs ————————————————————————————————————————————————————————————————
// Ghost keeps its own under `ghost.prefs`; these sit beside them under the
// `vibe.` prefix. Words and choices only: nothing here is a score.

const PREFS_KEY = 'vibe.prefs';
const WEAK_KEY = 'vibe.weak';
/**
 * How much of a typed seed phrase is kept. One number for the menu and for
 * the stored pref, because a seed cut in one place and not the other plays a
 * run the player cannot get back.
 */
export const SEED_MAX = 12;

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
  /** The bed, from the menu's settings row. */
  music?: MusicMode;
  /** The seed box, as the player left it. */
  seed?: string;
  muted?: 'on' | 'off';
  /** How many standups this browser has seen; the retro offers itself on every third. */
  runs?: number;
  /** The last seed played, so a blank box draws the next one from it. */
  last?: number;
  /** Whether the endless user is played by a model, when one can be reached. */
  seat?: 'on' | 'off';
  /** Whether the user's lines are spoken, when a worker can be reached. */
  voice?: 'on' | 'off';
  /**
   * The products this browser has shipped, by name. The menu marks them in
   * the third column so a player picking by hand can see where they were. A
   * word a row, never a count (G23), and never sent anywhere (G8).
   */
  shipped?: string[];
}

/** How many shipped products are kept. The list is short; storage is not a log. */
const SHIPPED_KEEP = 64;

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
    if (isMusicMode(o.music)) out.music = o.music;
    if (typeof o.seed === 'string') out.seed = o.seed.slice(0, SEED_MAX);
    if (o.muted === 'on' || o.muted === 'off') out.muted = o.muted;
    if (typeof o.runs === 'number' && Number.isFinite(o.runs)) out.runs = Math.max(0, o.runs);
    if (typeof o.last === 'number' && Number.isFinite(o.last)) out.last = o.last >>> 0;
    if (o.seat === 'on' || o.seat === 'off') out.seat = o.seat;
    if (o.voice === 'on' || o.voice === 'off') out.voice = o.voice;
    if (Array.isArray(o.shipped)) {
      out.shipped = o.shipped
        .filter((name): name is string => typeof name === 'string' && name !== '')
        .slice(0, SHIPPED_KEEP);
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * What is under the key, unvalidated. Ghost's `rawPrefs`, for the same reason:
 * `readVibePrefs` is a strict allowlist, so merging a patch over IT drops every
 * field this build does not know about, and the settings row writes on every
 * change. A pref this build has never heard of belongs to whichever build
 * wrote it, so the merge is over the raw object and the validating stays on
 * the read.
 */
function rawVibePrefs(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return { ...(parsed as Record<string, unknown>) };
  } catch {
    return {};
  }
}

export function writeVibePrefs(patch: VibePrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...rawVibePrefs(), ...patch }));
  } catch {
    /* a private window or blocked storage: the game still plays */
  }
}

/**
 * Forget which cabinet and which product this browser last picked.
 *
 * What the recovery scene offers. The pick is what is remembered, so a
 * cabinet that throws on the way up is reloaded straight back into the same
 * pick and the game is stuck until the player clears their storage. Nothing
 * else about them is touched: the type, the keyboard, the sound, the music,
 * the agent's name, the seed and the shipped products all survive.
 */
export function forgetVibePick(): void {
  try {
    const raw = rawVibePrefs();
    delete raw.cabinet;
    delete raw.level;
    delete raw.endless;
    localStorage.setItem(PREFS_KEY, JSON.stringify(raw));
  } catch {
    /* a private window or blocked storage: nothing was remembered anyway */
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
  /** The bed. Left out, the mount takes the stored pref, then `soft`. */
  music?: MusicMode;
  /** Integration snippets built from the bundled tapes (G30). */
  integration: Snippet[];
  onExit: () => void;
  /** True when the mount follows a click, so the sound may start at once. */
  startAudio: boolean;
  /**
   * The voice worker's client, replaced in a test. Left out, the shell talks
   * to the worker at `/voice`, which the launcher and the dev server proxy
   * and Pages does not have at all.
   */
  voice?: {
    health?: () => Promise<{ engine: string } | null>;
    speak?: (job: VibeVoiceJob) => Promise<SpeakAnswer>;
    play?: (url: string, job: VibeVoiceJob) => void;
  };
}

export interface VibeMount {
  unmount(): void;
  /** The loop, one frame. The test drives this instead of the browser's clock. */
  tick(dt: number): void;
  /**
   * What the endless seat has put in the run's buffer, and what the gate
   * has refused. For the tests only; nothing on the field reads it, and
   * nothing here is ever drawn (G17, G23).
   */
  debug(): {
    supplied: number;
    asked: number;
    accepted: number;
    refused: number;
    /** The bed the engine is playing, or nothing when no engine was built. */
    music: MusicMode | null;
    /** Milestone cards and ribbons the preload has in hand. */
    cards: number;
    /** The recorded bed that has the level, or nothing when the bar does. */
    track: VibeTrackKey | null;
    /** The level being played, and the product it is building. */
    level: number;
    product: string;
    /**
     * What is moving: whether the player asked for less of it, and the three
     * effects no stylesheet can reach.
     */
    motion: { calm: boolean; shake: number; flash: number; specks: number };
  };
}

interface ChatItem {
  el: HTMLLIElement;
  full: string;
  shown: number;
  /** The run clock at which the sim lets this line be read; hidden until then. */
  dueAt: number;
}

interface Piece {
  id: string;
  size: number;
  /** Seconds left of the pop. */
  pop: number;
  /** What this piece is a picture of, derived when it shipped (slice 4B). */
  kind: PieceKind;
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

/** A span the reader's software announces when it changes. Ghost's shape. */
function liveStatus(node: HTMLElement, name: string): void {
  node.setAttribute('aria-live', 'polite');
  node.setAttribute('role', 'status');
  node.setAttribute('aria-label', name);
}

/**
 * Why a grayed control is gray, as a visible word tied to the control.
 * Ghost's helper, for the same reason: a `title` on a disabled input reaches
 * nobody — the element is not focusable, Tab skips it, and a mouse player
 * only learns by hovering something that looks inert.
 */
/**
 * Tie one more description to a control without dropping the ones already on
 * it. `aria-describedby` is a list, and setting the attribute outright — which
 * is what every caller used to do — meant the second description silently
 * deleted the first.
 */
function describedBy(control: HTMLElement, id: string): void {
  const had = control.getAttribute('aria-describedby');
  control.setAttribute('aria-describedby', had ? `${had} ${id}` : id);
}

/**
 * What a feature IS, for a control whose only statement of it was a `title`.
 * A touch player has no hover, and a reader's software reads the label rather
 * than the title once anything else describes the control. The sentence goes
 * in the page, offscreen, tied to the box, so the one explanation reaches
 * everybody; the `title` stays as the hover affordance.
 */
function whatItIs(control: HTMLElement, id: string, text: string): HTMLSpanElement {
  const what = el('span', 'offscreen', text);
  what.id = id;
  describedBy(control, id);
  return what;
}

/**
 * A checkbox and the words that explain it, in one box that cannot come
 * apart. The controls row wraps, and a `why` span that is a plain sibling of
 * the box it explains can wrap onto the next line away from it.
 */
function seatGroup(...parts: (Node | null)[]): HTMLSpanElement {
  const box = el('span', 'seat-group');
  for (const part of parts) if (part) box.append(part);
  return box;
}

function whyDisabled(
  control: HTMLElement,
  id: string,
  text: string,
): { why: HTMLSpanElement; set: (on: boolean) => void } {
  const why = el('span', 'muted why', text);
  why.id = id;
  describedBy(control, id);
  return {
    why,
    set: (on: boolean) => {
      why.hidden = !on;
    },
  };
}

/** The local voice worker is not running. Plain words: no player runs `pnpm`. */
const NO_VOICE_WORD = 'voice: the local voice is not running';
/** Nothing on this machine will sit the user's chair. */
const NO_MODEL_WORD = 'seat: no model on this machine';
/** The shell is still looking for one. */
const LOOKING_WORD = 'seat: looking for a model on this machine';
/**
 * The corpus wrote this ask. A decision the cabinet made, and deliberately
 * NOT the same word as `NO_MODEL_WORD`: the two were one phrase, so a model
 * that had died mid-run read as a choice rather than as a machine that had
 * stopped answering.
 */
const WRITTEN_WORD = 'seat: a written ask';
/** The player turned the model user off. Their choice, said as their choice. */
const WRITTEN_USER = 'seat: a written user';

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

/**
 * Whether a key belongs to a control rather than to the field. The same list
 * Ghost's mount uses: a control gets its own keys, so Enter and Space press
 * the button under focus and Tab leaves it.
 */
function chromeTarget(t: EventTarget | null): boolean {
  return t instanceof Element && Boolean(t.closest('input, select, button, label, textarea'));
}

export function mountVibeTyper(root: HTMLElement, opts: VibeOpts): VibeMount {
  root.replaceChildren();
  const prefs = readVibePrefs();
  const storedWeak = readWeak();
  const agentName = cleanName(opts.agentName) || 'the agent';
  /** Whether this player is typing on glass. Read once, at the mount. */
  const onFinger = coarsePointer();

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
  // The bed's shape. Sound off still silences everything; this only shapes
  // the bed, and its default is the calm one.
  const music = opts.music ?? prefs.music ?? DEFAULT_MUSIC;

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
  /*
    The bullets are the picture of the streak and carry nothing a reader's
    software can get at. An `aria-label` on a generic span with no role is
    either ignored — the run of dots is read as characters or as decoration —
    or honored, in which case it REPLACES the bullets and the count is gone.
    Either way the streak did not reach the player. The picture is decoration
    now and the count is a word beside it, kept current by `drawBoard`.
  */
  streakDots.setAttribute('aria-hidden', 'true');
  const streakSaid = el('span', 'offscreen');
  streakEl.append(streakWord, streakDots, streakSaid);
  const barWrap = el('span', 'vibe-stat vibe-context');
  const barWord = el('span', 'vibe-word', words.context);
  const bar = el('span', 'vibe-bar');
  /*
    The hint calls this bar the clock, so the run's whole timer was invisible
    to a reader's software while the two numeric stats beside it read fine: it
    was a span whose only state was an inline width. It is a progress bar with
    a value now, named by the levers' own word for it.
  */
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-label', words.context);
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  bar.setAttribute('aria-valuenow', '100');
  const barFill = el('span', 'vibe-bar-fill');
  bar.append(barFill);
  barWrap.append(barWord, bar);
  const toast = el('span', 'vibe-toast', '');
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  board.append(valuationEl, hypeEl, streakEl, barWrap, toast);

  const panes = el('div', 'vibe-panes');

  const chatPane = el('section', 'vibe-pane vibe-chat');
  // Two faces beside two names: the user's before the product, because the
  // product is theirs and the header never names them, and the agent's before
  // the agent's name. The pictures are decoration (`alt=""`), so a screen
  // reader still reads exactly the words that were there before them.
  //
  // Nothing waits on a file. A face that is missing, slow or broken takes
  // itself out of the header on `error` and the header is the words alone,
  // byte for byte what it was before this batch. That is the frames' and the
  // tiles' rule, and jsdom — which hands an `Image` no file — is the case it
  // is written for.
  const chatHead = el('div', 'vibe-head vibe-chat-head');
  const avatar = (who: 'user' | 'agent'): HTMLImageElement | null => {
    if (typeof Image === 'undefined') return null;
    const img = new Image();
    img.className = `vibe-avatar vibe-avatar-${who}`;
    img.alt = '';
    img.decoding = 'async';
    img.addEventListener('error', () => img.remove(), { once: true });
    img.src = `${import.meta.env.BASE_URL}vibe/avatars/${who}.png`;
    return img;
  };
  // The chat is the user's pane, so the user's face heads it, before the
  // product, which is theirs; the header never names the user. The agent's
  // face heads the editor, which is the agent's pane: the player types there
  // (the Director's read of 0.11.0 on Pages: the agent belongs beside "your
  // reply", not beside the user).
  const userFace = avatar('user');
  const agentFace = avatar('agent');
  if (userFace) chatHead.append(userFace);
  // The product, which the level owns. In endless the level changes under the
  // run, so this node and the preview's label are both re-read from the plan
  // whenever the plan changes (`followPlan`); they were set once at mount and
  // stayed on the first level's product for the whole run, while the asks and
  // the standup named the level actually being played.
  const chatWho = el('span', 'vibe-who', planOf(state).product);
  chatHead.append(chatWho);
  const chatList = el('ul', 'vibe-lines');
  chatList.setAttribute('aria-label', 'what your user is saying');
  const chatScroll = el('div', 'vibe-scroll');
  chatScroll.append(chatList);
  /**
   * The chat is the cabinet's whole narrative — the asks, the check-ins, the
   * reactions — and it was a plain list with no name and nothing announced,
   * while every other changing surface in both cabinets has a live region. A
   * reader's software was told the milestone word and never told what the
   * user had asked for. The list itself cannot be the live region: the lines
   * type themselves in character by character, so marking it live would read
   * every keystroke. A line is announced once, whole, when it finishes.
   */
  const chatSaid = el('span', 'offscreen');
  liveStatus(chatSaid, 'the chat');
  chatPane.append(chatHead, chatScroll, chatSaid);

  const editorPane = el('section', 'vibe-pane vibe-editor');
  /**
   * The field, and the one thing on it that can hold focus.
   *
   * The keys are read off a window listener and dropped whenever a control
   * has them, and the mount made no focusable element at all: the panes, the
   * editor and the preview were all unfocusable. So a keyboard player who
   * pressed 'Sound on' or 'Model user' had nowhere to put focus back, every
   * letter after that was swallowed by the guard, the line never advanced and
   * the game read as frozen with no word anywhere. A mouse player recovered
   * by accident, clicking a pane. Ghost never had this because its field is a
   * focusable canvas that its mount and its difficulty handler both focus.
   */
  editorPane.tabIndex = 0;
  editorPane.setAttribute('role', 'group');
  editorPane.setAttribute('aria-label', 'the editor: type here');
  const beatWord = el('div', 'vibe-head vibe-beat');
  if (agentFace) beatWord.append(agentFace);
  beatWord.append(el('span', 'vibe-who', agentNameOf(state)));
  beatWord.append(el('span', 'vibe-dot', ' · '));
  const beatText = el('span', 'vibe-beat-word', words.beats[state.beat]);
  beatWord.append(beatText);
  const codeBox = el('div', 'vibe-code');
  const tabHint = el('div', 'vibe-tab', 'Tab');
  tabHint.hidden = true;
  /**
   * The one thing on a phone that raises a keyboard.
   *
   * A tab stop on a plain section raises nothing, and this cabinet had no
   * text field anywhere in the mount, so the one thing it asks for could not
   * be given on the device it is dressed for. The box is offscreen, holds
   * nothing and is never read: it is a keyboard, not a document, so every
   * correcting affordance a soft keyboard offers is turned off, and what it
   * reports is translated into the same `RunInput` the key reader produces so
   * the sim path stays one path.
   *
   * The desktop cost would have been a double read — with the box focused a
   * key arrives at both it and the window listener — so exactly one reader is
   * picked by focus: the window guard already ignores anything whose target
   * closes on an `input`, and the box only takes focus where the pointer is
   * coarse. A desktop round is byte for byte the round it was.
   */
  const typeBox = document.createElement('input');
  typeBox.type = 'text';
  typeBox.className = 'offscreen';
  typeBox.setAttribute('aria-label', 'type here');
  typeBox.inputMode = 'text';
  typeBox.autocapitalize = 'off';
  typeBox.setAttribute('autocorrect', 'off');
  typeBox.spellcheck = false;
  typeBox.autocomplete = 'off';
  editorPane.append(beatWord, codeBox, tabHint, typeBox);

  const canvas = el('canvas', 'vibe-preview');
  canvas.width = PREVIEW_W * PREVIEW_DPR;
  canvas.height = PREVIEW_H * PREVIEW_DPR;
  const previewLabel = (product: string) => `the product as it is built: ${product}`;
  canvas.setAttribute('aria-label', previewLabel(planOf(state).product));
  const previewPane = el('section', 'vibe-pane vibe-preview-pane');
  previewPane.append(canvas);

  panes.append(chatPane, editorPane, previewPane);

  const controls = el('div', 'row');
  // One convention across both cabinets and the menu's own select: the button
  // says the state in the select's words. 'Sound on' read as a promise and
  // turned the sound off.
  const soundWords = (off: boolean) => (off ? 'sound: off' : 'sound: on');
  const mute = el('button', undefined, soundWords(false));
  mute.type = 'button';
  const back = el('button', undefined, 'Back to the cabinets');
  back.type = 'button';
  /*
    One grammar for a mounted cabinet, settled across the two: field, controls
    row, status row, hint, the way out. Ghost has always read that way. This
    cabinet put the identically worded exit SECOND in its controls row, one
    control away from the toggle a player reaches for most, and appended its
    status words into the control row itself — so the same act, with the same
    consequence, sat in two different places with two different neighbors.
  */
  controls.append(mute);
  const statusRow = el('div', 'row');
  // The seat, outside the field. G17 keeps the model's name off the field;
  // the controls row is not the field, as Ghost's is not, so the tag may be
  // read here and nowhere else. The chat never learns it.
  const seatLabel = el('label');
  const seatBox = document.createElement('input');
  seatBox.type = 'checkbox';
  seatBox.checked = false;
  seatBox.disabled = true;
  seatLabel.append(seatBox, document.createTextNode(' Model user'));
  seatLabel.title =
    'In endless, your user is played by a model on your own machine: it names the product, asks for the thing and writes the code you type, behind a gate that refuses anything that is not small, plain and in the right language. Needs the local game, not Pages.';
  const seatWhat = whatItIs(seatBox, 'vibe-what-seat', seatLabel.title);
  const seatWhy = whyDisabled(seatBox, 'vibe-why-seat', 'needs a model on this machine');
  const seatStat = el('span', 'muted seat', '');
  liveStatus(seatStat, 'the user');
  const seatOn = LOCAL_SEATS && opts.endless;
  if (seatOn) {
    // The unique mark the launcher's pack greps for: a Pages build has none.
    controls.setAttribute('data-vibe-seat', 'on');
    controls.append(seatGroup(seatLabel, seatWhat, seatWhy.why));
    statusRow.append(seatStat);
  }
  // The voice (G15, slice 4C): the user speaks their own lines through the
  // host-side worker, and every take is heard back and receipted before it
  // plays. Off and disabled until the worker answers a probe; Pages never
  // has one, and a story level has a user too, so this is not the seat's
  // checkbox and does not wait on endless. The status is words beside it:
  // nothing here names the engine, the preset or a count (G17, G23).
  const voiceLabel = el('label');
  const voiceBox = document.createElement('input');
  voiceBox.type = 'checkbox';
  voiceBox.checked = false;
  voiceBox.disabled = true;
  voiceLabel.append(voiceBox, document.createTextNode(' Voice'));
  voiceLabel.title =
    'Your user says their asks, their check-ins and their reactions out loud through the local voice worker (pnpm voice); every take is heard back and receipted before it plays, and you type the replies as always.';
  const voiceWhat = whatItIs(voiceBox, 'vibe-what-voice', voiceLabel.title);
  const voiceWhy = whyDisabled(voiceBox, 'vibe-why-voice', 'needs the local voice running');
  const voiceStat = el('span', 'muted seat', '');
  liveStatus(voiceStat, 'voice');
  if (LOCAL_SEATS) {
    // The pack's second mark, for the voice half: the Vibe package now stands
    // a `/voice` proxy, and a shell built without this chrome would leave that
    // proxy with no caller. The gate greps for this and halts if it is gone.
    controls.setAttribute('data-vibe-voice', 'on');
    controls.append(seatGroup(voiceLabel, voiceWhat, voiceWhy.why));
    statusRow.append(voiceStat);
  }

  // ——— what the cabinet's own files are doing ——————————————————————————————
  //
  // Ghost carries 'art: using blocks' and 'music: chiptune' in a chrome span
  // and this cabinet carried nothing: a keyboard whose eight samples never
  // arrived fell back to the procedural click for the rest of the run without
  // a word, and a device frame that never loaded drew as rectangles the same
  // way. In a game whose product is the keyboard under the player's hands,
  // that is the degradation most worth naming. The recorded beds are not
  // reported from here — their loader is the music branch's, and the word for
  // a bed belongs with it.
  const chrome = el('span', 'muted seat', '');
  liveStatus(chrome, 'cabinet');
  statusRow.append(chrome);
  /** The words the chrome is carrying, in the order they were first raised. */
  const chromeWords = new Set<string>();
  const chromeWord = (word: string, on: boolean) => {
    if (on) chromeWords.add(word);
    else chromeWords.delete(word);
    const text = [...chromeWords].join(' · ');
    // A live region that is rewritten with the text it already has announces
    // itself again for nothing.
    if (chrome.textContent !== text) chrome.textContent = text;
  };
  const KEYS_GONE = 'keys: using clicks';
  const KEYS_SLOW = 'keys: slow, using clicks';
  const ART_GONE = 'art: using blocks';
  const SOUND_ASLEEP = 'sound: asleep, click to wake';
  const SOUND_GONE = 'sound: not on this browser';
  /** The engine's own word about its sample set, turned into the chrome's. */
  const sampleWord = (state: SampleState) => {
    chromeWord(KEYS_GONE, state === 'missing');
    chromeWord(KEYS_SLOW, state === 'timeout');
  };

  // The hint names what the player can see and nothing else. It used to say
  // "when the ghost offers it": the sibling cabinet on this menu is called
  // Ghost on the Menu, so that word read as the shooter's grammar rather
  // than as editor ghost-text, and nothing else here teaches it — the sim
  // calls the feature the copilot and the affordance on screen is the faded
  // rest of the line under a chip. The lock says this cabinet takes Ghost's
  // chassis and never its grammar, so the word is gone from the field.
  const hint = el(
    'p',
    'muted',
    'Type what you see. Enter sends a line, Tab takes the rest when the faded text appears, hold Escape to leave.',
  );

  wrap.append(board, panes, controls, statusRow, hint, back);
  root.append(wrap);
  root.classList.add('playing');

  // ——— the state the shell keeps ————————————————————————————————————————————
  const ctx2d = canvas.getContext('2d');
  // The painted device frames. A kind whose file is missing, slow, or broken
  // draws as `drawFrame`'s rectangles instead, so the game never waits on an
  // image and a Pages build without `vibe/frames/` still plays. Nothing here
  // runs in jsdom, where `Image` is never handed a loaded file.
  const frames = new Map<DeviceKind, HTMLImageElement>();
  /** The device kinds whose picture is not there; the chrome says so once. */
  const framesGone = new Set<DeviceKind>();
  if (typeof Image !== 'undefined') {
    for (const kind of DEVICE_KINDS) {
      const img = new Image();
      img.decoding = 'async';
      // Each fires once and detaches; a load that lands after unmount writes
      // into a Map nothing reads any more (the review's first change).
      img.addEventListener(
        'load',
        () => {
          frames.set(kind, img);
          framesGone.delete(kind);
          chromeWord(ART_GONE, framesGone.size > 0);
        },
        { once: true },
      );
      img.addEventListener(
        'error',
        () => {
          frames.delete(kind);
          framesGone.add(kind);
          chromeWord(ART_GONE, true);
        },
        { once: true },
      );
      img.src = `${import.meta.env.BASE_URL}vibe/frames/${kind}.png`;
    }
  }
  // The painted piece tiles, keyed `<stack>/<kind>`, on the same rule as the
  // frames: a tile that is missing, slow or broken leaves the flat block
  // exactly as it was. Fifty-six of them exist and a run is in one stack at a
  // time, so a stack's eight are asked for the first time a level of that
  // stack draws rather than all at the mount — it keeps a cabinet that plays
  // one story level from fetching the other six stacks' art for nothing, and
  // in endless it costs one request burst per stack change.
  const tiles = new Map<string, HTMLImageElement>();
  const tilesAsked = new Set<string>();
  const askTiles = (stack: string) => {
    if (tilesAsked.has(stack) || typeof Image === 'undefined') return;
    tilesAsked.add(stack);
    for (const kind of PIECE_KINDS) {
      const key = `${stack}/${kind}`;
      const img = new Image();
      img.decoding = 'async';
      img.addEventListener('load', () => tiles.set(key, img), { once: true });
      img.addEventListener('error', () => tiles.delete(key), { once: true });
      img.src = `${import.meta.env.BASE_URL}vibe/tiles/${key}.png`;
    }
  };
  // The milestone cards and the deploy ribbon, on the same rule again: a file
  // that is missing, slow or broken leaves the word alone and the flat bar
  // alone. These four are asked for at the mount rather than when they are
  // wanted, which is the one place this batch parts from the tiles' rule: a
  // level's stack is known a frame before a piece lands, but a milestone is a
  // line the valuation crosses without warning, and a picture fetched at that
  // moment would arrive after the toast had gone.
  //
  // The two handlers are guarded by the mount's `left` flag, the same guard
  // the voice's probes take: four files are asked for the moment the field is
  // built, and a player who leaves before they land would otherwise have a
  // `load` write into a Map that belongs to a field nobody is looking at.
  const cards = new Map<string, HTMLImageElement>();
  const askCards = () => {
    if (typeof Image === 'undefined') return;
    for (const slug of [...CARD_SLUGS.values(), DEPLOY_SLUG]) {
      const img = new Image();
      img.decoding = 'async';
      img.addEventListener(
        'load',
        () => {
          if (left) return;
          cards.set(slug, img);
        },
        { once: true },
      );
      img.addEventListener(
        'error',
        () => {
          if (left) return;
          cards.delete(slug);
        },
        { once: true },
      );
      img.src = `${import.meta.env.BASE_URL}vibe/cards/${slug}.png`;
    }
  };
  const queue: RunInput[] = [];
  const chat: ChatItem[] = [];
  let chatAt = 0;
  /** Whether the quick sync is open, as the chat pane has read the events so far. */
  let syncOpen = false;
  let acc = 0;
  let left = false;
  /**
   * A word for a live region, written only when it is not the word already
   * there. Ghost's helper, for the same reason: a region rewritten with the
   * text it already has announces itself again for nothing, and three writers
   * here (the seat's word and the voice's two) set `textContent` directly and
   * bypassed the only guard there was.
   */
  const writeWord = (node: HTMLElement, text: string) => {
    if (left || node.textContent === text) return;
    node.textContent = text;
  };
  /**
   * Put the keys back on the field. A control has just been used, and every
   * letter typed while it holds focus is dropped by the key guard — so the
   * editor pane takes focus back the moment a control is done with.
   */
  const takeKeys = () => {
    if (left || over) return;
    // Under a coarse pointer the letters come from the hidden box, so the box
    // is what takes focus back and the soft keyboard stays up; with a mouse
    // the pane takes it, exactly as it always has.
    if (onFinger) typeBox.focus();
    else editorPane.focus();
  };
  // Asked for here rather than where the Map is built, so the handlers' guard
  // reads a flag that already exists.
  askCards();
  let over = false;
  let audio: TyperAudio | null = null;
  let muted = prefs.muted === 'on';
  mute.textContent = soundWords(muted);
  let shake = 0;
  let flash = 0;
  let flashLeft = 0;
  let toastLeft = 0;
  /** The card the preview is showing, for as long as the toast's word is up. */
  let card: HTMLImageElement | null = null;
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

  // ——— less movement, when the system asks for it ——————————————————————————
  //
  // The stylesheet's `prefers-reduced-motion` block reaches the caret and the
  // shimmer, and the milestone card's fade reads the query itself — but the
  // three strongest movements this cabinet owns are an inline transform (the
  // editor's shake) and two canvas draws (the ship's white flash, the
  // confetti), which no stylesheet can reach. A player who has asked the
  // system for less movement now gets none of the three, and the query is
  // watched for a change mid-run the way Ghost watches it.
  const motionMq =
    typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  let calm = motionMq?.matches === true;
  const onMotion = (e: MediaQueryListEvent) => {
    calm = e.matches;
    if (!calm) return;
    // Whatever was already moving stops on the spot.
    shake = 0;
    flash = 0;
    flashLeft = 0;
    specks = [];
    editorPane.style.transform = '';
  };
  if (motionMq && typeof motionMq.addEventListener === 'function') {
    motionMq.addEventListener('change', onMotion);
  }

  /**
   * The chat's header and the preview's label both name the product, and the
   * product belongs to the level. In endless the level changes under the run,
   * so both follow the plan rather than being set once at mount.
   */
  let shownPlan = planOf(state);
  const followPlan = () => {
    const plan = planOf(state);
    if (plan === shownPlan) return;
    shownPlan = plan;
    // A level boundary closes any meeting still marked open, so the next
    // level's first lines are never painted as the last level's meeting.
    syncOpen = false;
    chatWho.textContent = plan.product;
    canvas.setAttribute('aria-label', previewLabel(plan.product));
  };

  /** The context this mount built, kept so a browser that sleeps it can be asked. */
  let audioCtx: AudioContext | null = null;
  /** A construction that threw is tried once, not once a gesture. */
  let audioFailed = false;
  /**
   * `resume()` was called exactly once, from inside a guard that returns early
   * for good once the engine exists — so a context the browser suspended AFTER
   * the first gesture (an interruption on a phone, a tab restored, WebKit's
   * own `interrupted`, which is not 'suspended' and never matched a test for
   * it) stayed asleep for the rest of the run with nothing said. Every state
   * but 'running' is asked to come back, on every gesture and whenever the
   * context says its state changed; a refusal gets a word on the chrome row.
   */
  const wakeAudio = () => {
    const ctxNow = audioCtx;
    if (left || !ctxNow || ctxNow.state === 'running') return;
    const settled = (ok: boolean) => {
      if (left) return;
      chromeWord(SOUND_ASLEEP, !(ok && ctxNow.state === 'running'));
    };
    try {
      void Promise.resolve(ctxNow.resume()).then(
        () => settled(true),
        () => settled(false),
      );
    } catch {
      settled(false);
    }
  };
  const onCtxState = () => wakeAudio();
  const ensureAudio = () => {
    if (audio) {
      // A gesture is also the moment to wake a context that went to sleep.
      wakeAudio();
      return;
    }
    if (audioFailed || typeof AudioContext === 'undefined') return;
    // The context is built into a local first: constructed inline as an
    // argument, a `createTyperAudio` that threw after the context existed left
    // it unreachable and never closed, and the guard above — back to null —
    // let the next gesture build another. A page may hold only a few, so that
    // ended with construction itself throwing for good, silently.
    let built: AudioContext | null = null;
    try {
      const base = import.meta.env.BASE_URL || '/';
      built = new AudioContext();
      const out = createTyperAudio(built, base, planOf(state).seed, domBedMaker, sampleWord);
      out.setTheme(opts.theme);
      out.setMusic(music);
      // The level's stack, before the first tick: it is what asks for this
      // stack's recorded bed, and the engine is built on the first gesture.
      out.setStack(planOf(state).stack);
      out.setMuted(muted);
      audio = out;
      audioCtx = built;
      built.addEventListener?.('statechange', onCtxState);
    } catch {
      audio = null;
      audioFailed = true;
      if (built) {
        try {
          void Promise.resolve(built.close()).catch(() => undefined);
        } catch {
          /* a context that will not close is already past helping */
        }
      }
      chromeWord(SOUND_GONE, true);
      return;
    }
    wakeAudio();
  };

  /**
   * The tab, going away and coming back. A hidden tab stops
   * `requestAnimationFrame`, so the loop stops — but the recorded beds are
   * media elements outside the graph and play on, and the crossfade that
   * `tick` drives freezes wherever it was, which is two beds at partial
   * volume: music with no game. The engine settles the cross and pauses them;
   * coming back starts the bed that holds the level and wakes the context,
   * which a phone will have suspended while the tab was away.
   */
  const onVisibility = () => {
    if (left) return;
    const away = document.visibilityState === 'hidden';
    audio?.setHidden(away);
    if (!away) wakeAudio();
  };
  document.addEventListener('visibilitychange', onVisibility);

  // ——— the voice (G15, slice 4C) ————————————————————————————————————————————
  //
  // The user's line goes to the worker the moment it lands; the chat shows it
  // at once either way and nothing on the field waits. The worker speaks it,
  // hears it back and runs fx-dub's receipt; a take whose receipt failed is
  // never played. `createVibeVoicer` owns when a take may play — this block
  // is only the client, the checkbox and the speaker.

  const voiceSheet = levers.cabinet.voice;
  /** The nth user line of this run. Nothing draws it; the stats read it. */
  let voiceSeq = 0;
  let voiceProbe = 0;
  let workerUp = false;
  /** A worker that answered and then went away does not re-arm the box. */
  let voiceSawDown = false;
  const takeEl = typeof Audio === 'undefined' ? null : new Audio();
  if (takeEl) takeEl.volume = 0.9;
  /**
   * What the voicer is waiting on: the take in the air is over when the
   * element says so. The queue behind it will not move until this is called,
   * so it is called on every way a take can end — including a stop.
   */
  let takeDone: (() => void) | null = null;
  const finishTake = () => {
    const f = takeDone;
    takeDone = null;
    f?.();
  };
  const duckBeds = (on: boolean) => {
    audio?.setBedDuck(on);
  };
  const stopTake = () => {
    finishTake();
    if (!takeEl) return;
    try {
      // Only when there is something to stop: a media element that has never
      // been handed a take has nothing to pause, and asking anyway is how a
      // headless run ends up printing a stack about it.
      if (!takeEl.paused) takeEl.pause();
      if (takeEl.getAttribute('src')) takeEl.removeAttribute('src');
    } catch {
      /* a player whose browser will not pause a take is not a player who
         loses the mount over it; the bed still comes back up below. */
    }
    duckBeds(false);
  };
  if (takeEl) {
    for (const ev of ['play', 'playing'] as const) {
      takeEl.addEventListener(ev, () => {
        if (!left && !muted) duckBeds(true);
      });
    }
    for (const ev of ['pause', 'ended'] as const) {
      takeEl.addEventListener(ev, () => {
        if (!left) duckBeds(false);
        finishTake();
      });
    }
    // A playback error ends the take like any other ending: the bed has to
    // come back up, or it stays held down until the next take plays.
    takeEl.addEventListener('error', () => {
      if (!left) duckBeds(false);
      finishTake();
    });
  }
  const markVoiceDown = () => {
    const wasOn = voiceBox.checked;
    if (workerUp) voiceSawDown = true;
    workerUp = false;
    voiceBox.disabled = true;
    voiceBox.checked = false;
    voiceWhy.set(true);
    if (wasOn) stopTake();
    writeWord(voiceStat, NO_VOICE_WORD);
  };
  const askHealth = opts.voice?.health ?? (() => voiceHealth({ url: '/voice', timeoutMs: 2000 }));
  const probeVoice = () => {
    void askHealth()
      .then((h) => {
        if (left) return;
        if (h) {
          const firstUp = !workerUp && !voiceSawDown;
          workerUp = true;
          voiceBox.disabled = false;
          voiceWhy.set(false);
          if (firstUp && prefs.voice === 'on') {
            voiceBox.checked = true;
            writeWord(voiceStat, 'voice on');
          } else if (!voiceBox.checked) {
            writeWord(voiceStat, 'voice ready');
          }
          return;
        }
        markVoiceDown();
      })
      .catch(() => {
        if (left) return;
        markVoiceDown();
      })
      .finally(() => {
        if (left) return;
        voiceProbe = window.setTimeout(probeVoice, VOICE_PROBE_MS);
      });
  };
  if (LOCAL_SEATS) probeVoice();

  const voicer = createVibeVoicer({
    speak: opts.voice?.speak ?? ((job) => speakLine(job, { url: '/voice' })),
    play:
      opts.voice?.play ??
      ((url, _job, done) => {
        // Mute silences the take, not the receipt: the line was still spoken,
        // heard back and receipted, and the numbers say so. Nothing is
        // audible, so nothing behind it waits either.
        if (left || !voiceBox.checked || !takeEl || muted) {
          done();
          return;
        }
        stopTake();
        takeDone = done;
        takeEl.muted = false;
        // The url the receipt names is the worker's own; the proxy mounts it
        // under `/voice` for both the dev server and the launcher.
        takeEl.src = `/voice${url}`;
        void takeEl.play().catch(() => {
          duckBeds(false);
          finishTake();
        });
      }),
    onStatus: (text) => writeWord(voiceStat, text),
  });

  /**
   * The run's opening ask. `createRun` says it before any step runs, so it is
   * in the chat but was never in a step's events and the drain below cannot
   * see it. It is also said before the worker has answered its first probe,
   * so it waits here for the checkbox rather than being dropped: the first
   * thing the user says is the one line a player is certain to be reading.
   * If the reply beat is gone before the box comes on, so is the ask.
   */
  let openAsk: string | null = null;
  const takeOpenAsk = () => {
    if (openAsk === null) return;
    if (state.beat !== 'request' && state.beat !== 'reply') {
      openAsk = null;
      return;
    }
    if (!voiceBox.checked) return;
    const text = openAsk;
    openAsk = null;
    voiceLine({ who: 'user', nag: false, text, shipped: false, beat: 'request' });
  };

  voiceBox.addEventListener('change', () => {
    writeVibePrefs({ voice: voiceBox.checked ? 'on' : 'off' });
    writeWord(voiceStat, voiceBox.checked ? 'voice on' : 'voice off');
    if (!voiceBox.checked) stopTake();
    // The control is done with; the letters go back to the field.
    takeKeys();
  });

  /** One user line, handed to the worker if this is a line the user says. */
  const voiceLine = (facts: {
    who: 'user' | 'agent';
    nag: boolean;
    text: string;
    shipped: boolean;
    /** The beat the line belongs to. The beat in hand unless it is said so. */
    beat?: (typeof state)['beat'];
  }) => {
    if (left || !voiceBox.checked) return;
    const line = vibeVoiceLine({
      who: facts.who,
      nag: facts.nag,
      beat: facts.beat ?? state.beat,
      shipped: facts.shipped,
    });
    if (!line) return;
    voiceSeq += 1;
    voicer.job({
      text: facts.text,
      kind: 'user',
      line,
      seq: voiceSeq,
      voice: voiceSheet.user,
      maxGap: voiceSheet.maxGap,
    });
  };

  // ——— the panes, drawn ————————————————————————————————————————————————————

  /**
   * Which of the lines this step added were said inside the quick sync, and
   * where the meeting opened and closed.
   *
   * A sync line is the player's half of a call, echoed into the chat by the
   * sim through the same `say` every ordinary reply takes — so without a mark
   * the meeting read as the agent asking its user questions it never asks
   * ("can we test audio?", "is everyone here"), with no room and no start.
   * The sim already says so in its events: a `sync` event opens or closes the
   * meeting and a `message` event is one chat line, both in the order they
   * happened. The beat word alone cannot do this — the last line of a meeting
   * is said and the meeting closed inside one step, so by the time the chat
   * is painted the beat has already moved on.
   */
  const syncMarks = (): { inSync: boolean[]; opened: number[]; closed: number[] } => {
    const inSync: boolean[] = [];
    const opened: number[] = [];
    const closed: number[] = [];
    for (const event of state.events) {
      if (event.kind === 'sync') {
        if (event.on === syncOpen) continue;
        syncOpen = event.on;
        (event.on ? opened : closed).push(inSync.length);
      } else if (event.kind === 'message') {
        inSync.push(syncOpen);
      }
    }
    return { inSync, opened, closed };
  };

  /** A quiet row in the chat saying the meeting started or ended. */
  const syncRow = (text: string): HTMLElement => {
    const row = el('li', 'vibe-mark', text);
    chatList.append(row);
    return row;
  };

  const pushChat = () => {
    const { inSync, opened, closed } = syncMarks();
    const first = chatAt;
    for (let i = chatAt; i < state.chat.length; i++) {
      const line = state.chat[i]!;
      const at = i - first;
      if (opened.includes(at)) syncRow(meetingStarts(words.beats.sync));
      if (closed.includes(at)) syncRow(meetingEnds(words.beats.sync));
      const meeting = inSync[at] === true;
      const cls =
        line.who === 'user'
          ? line.nag === true
            ? 'vibe-user vibe-nag'
            : 'vibe-user'
          : meeting
            ? 'vibe-agent vibe-sync'
            : 'vibe-agent';
      const node = el('li', cls, '');
      // The sim paces the reveal (`dueAt`, a gap after the line before, so
      // four lines said on one frame are read one at a time): a line lands
      // in the list in its order now, and shows when it is due.
      node.hidden = line.dueAt > state.clock;
      chatList.append(node);
      chat.push({ el: node, full: line.line, shown: 0, dueAt: line.dueAt });
    }
    // A meeting that opened or closed after the last line of the step still
    // gets its row, in the order it happened.
    const after = state.chat.length - first;
    if (opened.includes(after)) syncRow(meetingStarts(words.beats.sync));
    if (closed.includes(after)) syncRow(meetingEnds(words.beats.sync));
    chatAt = state.chat.length;
  };

  const runChat = (dt: number) => {
    let scrolled = false;
    for (const item of chat) {
      if (item.shown >= item.full.length) continue;
      if (item.dueAt > state.clock) continue;
      if (item.el.hidden) item.el.hidden = false;
      item.shown = Math.min(item.full.length, item.shown + CHAT_CPS * dt);
      item.el.textContent = item.full.slice(0, Math.floor(item.shown));
      // The line has just finished typing itself: this is the moment it is
      // worth saying, once, whole.
      if (item.shown >= item.full.length) writeWord(chatSaid, item.full);
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
    beatText.textContent = words.beats[state.beat];
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
    const said = `${words.streak}: ${countWord(dots)}`;
    if (streakSaid.textContent !== said) streakSaid.textContent = said;
    const left = Math.max(0, Math.min(1, state.context));
    barFill.style.width = `${left * 100}%`;
    const now = String(Math.round(left * 100));
    if (bar.getAttribute('aria-valuenow') !== now) bar.setAttribute('aria-valuenow', now);
    barFill.classList.toggle('warm', state.context < WARM_AT && state.context >= NEAR_MISS);
    barFill.classList.toggle('near', state.context < NEAR_MISS);
    if (toastLeft > 0) {
      toastLeft = Math.max(0, toastLeft - dt * 1000);
      if (toastLeft === 0) {
        toast.textContent = '';
        card = null;
      }
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
    askTiles(plan.stack);
    const kind = DEVICE[plan.stack] ?? 'terminal';
    const box = frameBox(kind);
    const art = frames.get(kind);
    // The painted frame when it is there, the rectangles until it is. Either
    // way `box` stays the packing area, so the blocks land in the same place.
    if (art) c.drawImage(art, 0, 0, PREVIEW_W, PREVIEW_H);
    else drawFrame(c, kind, box);
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
      // The block is drawn first either way, so the packed area still reads as
      // one filled surface and the packing is unchanged. A loaded tile then
      // sits on it as the largest square the block holds, centered: a wide
      // block shows its own color either side of the picture, and a block too
      // small to hold anything legible simply shows a very small picture on a
      // patch of color. Tiles carry a translucent near-black plate of their
      // own, which is what keeps an icon readable on the two lighter colors in
      // every palette.
      const tile = tiles.get(`${plan.stack}/${piece.kind}`);
      if (tile) {
        const side = Math.min(w, h);
        c.drawImage(tile, cx - side / 2, cy - side / 2, side, side);
      }
      c.globalAlpha = 1;
    });
    // The milestone card, over the pieces and under everything the deploy
    // throws. It is drawn for exactly as long as the board's word is up, on
    // the board's own clock, so the two cannot come apart: the word says
    // which milestone, the card is the picture of it, and a card that is
    // missing or has not loaded leaves the word doing the whole job.
    //
    // The word sits on the card's right half because every card draws its
    // motif in its left third and leaves the rest flat navy, which is what
    // makes a card reusable for any wording. It is cream rather than the
    // near-black the ribbon's word uses, for the same reason in reverse: the
    // ribbon's word sits on amber and this one sits on navy.
    if (card && toastLeft > 0) {
      const h = CARD_W / CARD_ASPECT;
      const x = (PREVIEW_W - CARD_W) / 2;
      const y = (PREVIEW_H - h) / 2;
      // A short fade either end, and a hard show and hide when the player
      // asked for less movement (the same `calm` the shake, the flash and the
      // confetti take; it was read per frame here and nowhere else).
      // The picture itself is still either way.
      const fade = calm
        ? 1
        : Math.max(0, Math.min(1, (TOAST_MS - toastLeft) / CARD_FADE_MS, toastLeft / CARD_FADE_MS));
      c.globalAlpha = fade;
      c.drawImage(card, x, y, CARD_W, h);
      c.fillStyle = CARD_WORD;
      c.font = CARD_FONT;
      c.textAlign = 'center';
      c.fillText(toast.textContent ?? '', x + CARD_W * 0.66, y + h / 2 + 10, CARD_WORD_MAX);
      c.textAlign = 'left';
      c.globalAlpha = 1;
    }
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
      // The painted ribbon when it is there, the flat bar until it is. The
      // word is drawn either way and at the same baseline: the ribbon has
      // folded ends and an empty middle, so it takes the word centered, while
      // the flat bar is a band and keeps the word where it has always been.
      const ribbon = cards.get(DEPLOY_SLUG);
      if (ribbon) {
        const h = PREVIEW_W / RIBBON_ASPECT;
        c.drawImage(ribbon, 0, PREVIEW_H - DEPLOY_MID - h / 2, PREVIEW_W, h);
        c.fillStyle = '#101018';
        c.font = RIBBON_FONT;
        c.textAlign = 'center';
        c.fillText(DEPLOY_WORD, PREVIEW_W / 2, PREVIEW_H - 27, RIBBON_MAX);
        c.textAlign = 'left';
      } else {
        c.fillStyle = '#e8a04a';
        c.fillRect(0, PREVIEW_H - 46, PREVIEW_W, 26);
        c.fillStyle = '#101018';
        c.font = RIBBON_FONT;
        c.fillText(DEPLOY_WORD, 16, PREVIEW_H - 27, RIBBON_MAX);
      }
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
    // The three movements a stylesheet cannot reach. Asked for less movement,
    // the player still gets the whole game: the ship still lands the deploy
    // band and the word, the bad line still sounds and still resets — only the
    // pane's jolt, the full-field white and the burst are gone.
    if (cue.shake > 0 && !calm) shake = Math.max(shake, shakeFor(cue.shake, state.target.length));
    if (cue.flash > 0 && !calm) {
      flash = cue.flash;
      flashLeft = FLASH_MS;
    }
    if (cue.confetti > 0) {
      if (!calm) throwConfetti(cue.confetti);
      shipped = true;
    }
    if (cue.toast !== '') {
      // The board's toast is a status line and stays one: the milestone word,
      // in the same live region, announced the same way, with nothing behind
      // it. The picture goes where the game celebrates — over the preview,
      // the size the preview can carry it at — and the two share one clock.
      toast.textContent = cue.toast;
      toastLeft = TOAST_MS;
      const slug = cardSlugOf(cue.toast);
      card = (slug === null ? undefined : cards.get(slug)) ?? null;
    }
  };

  const drainEvents = () => {
    // The level may have changed under this step; the header and the label
    // follow the plan before anything else reads it.
    followPlan();
    const cues = cuesFor(state.events);
    // The user's lines of this step, in order. The `message` event carries
    // who said it and whether it was a check-in but not the words, and the
    // sim pushes the chat line and the event together — so the tail of the
    // chat, as many entries as there are message events, is this step's, in
    // the order it was said.
    const said = state.events.filter((e) => e.kind === 'message');
    const shipped = state.events.some((e) => e.kind === 'ship');
    const from = state.chat.length - said.length;
    said.forEach((event, i) => {
      if (event.kind !== 'message') return;
      const line = state.chat[from + i];
      if (!line) return;
      voiceLine({
        who: event.who,
        nag: event.nag === true,
        text: line.line,
        shipped,
      });
    });
    for (const event of state.events) {
      if (event.kind === 'piece') {
        // The kind is read here because here is the only place the shipped
        // snippet is still in reach: `ship` pushes this event and the step
        // returns, so `advance` has not moved the request index or the level
        // yet, and the drain runs once per step. The sim keeps carrying
        // `{ id, size }` and nothing else — a field added there would move
        // every play-through, and sub-slice A just proved them byte-identical.
        const id = `p${pieces.length}`;
        const shipped = planOf(state).requests[state.requestIndex]?.snippet;
        pieces.push({
          id,
          size: event.size,
          pop: POP_MS,
          kind: pieceKindOf(shipped ?? { id, topics: [] }),
        });
      }
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

  // ——— the endless seat (G28 as slice 3 amends it) ————————————————————————
  //
  // In endless the user may be a model. It writes the product, the ask, the
  // code, the title and the notes; the code gate and the chat gate refuse
  // what it should not have written; the sim is fed the ones that pass and
  // never waits for any of it (G11, G13). The seat's own name is legible
  // here, in the controls row, and nowhere on the field (G17).

  let seatModels: string[] = [];
  let daemon: 'unknown' | 'up' | 'down' = 'unknown';
  let seatBusy = false;
  let seatCtl: AbortController | null = null;
  let tagsTimer = 0;
  /** Refusals in a row for the slot in hand; the second one gives it up. */
  let slotTries = 0;
  /**
   * Asks that came back with nothing at all, in a row. A run of them is a
   * machine that has gone, not a gate doing its job: `markSeatDown` used to
   * be reachable only from the tag probe, and the tag probe stopped running
   * the moment the box was checked, so a daemon that died mid-run left the
   * seat marked up forever — twenty seconds of 'seat thinking' a level,
   * followed by a word that read as a decision the cabinet had made.
   */
  let noAnswers = 0;
  /** Asks with no answer at all before the seat is called gone. // Director */
  const SEAT_GONE_AFTER = 2;
  /** Slots this level has already handed to the corpus, and which level. */
  let given = 0;
  let givenFor = -1;
  const seatCounts = { asked: 0, accepted: 0, refused: 0 };
  const refusals: Record<string, number> = {};
  const tagsCtl = new AbortController();

  const seatSay = (text: string) => {
    writeWord(seatStat, text);
  };

  const markSeatDown = () => {
    daemon = 'down';
    seatModels = [];
    seatBox.disabled = true;
    seatBox.checked = false;
    seatWhy.set(true);
    seatSay(NO_MODEL_WORD);
  };

  /**
   * The last few asks, so the seat does not repeat itself: the ones already
   * in the buffer first, because they are the ones it just wrote and they
   * have not been said on the field yet, then the chat's own.
   */
  const recentAsks = (): string[] =>
    [
      ...suppliedAsks(state),
      ...state.chat.filter((line) => line.who === 'user').map((line) => line.line),
    ].slice(-RECENT_TO_SEAT);

  /** The pairs this player fumbles most, for the seat to work into the code. */
  const topWeak = (): string[] =>
    Object.entries(state.weakBigrams)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, WEAK_TO_SEAT)
      .map(([pair]) => pair);

  /**
   * Ask the seat for one request for the NEXT endless level, while the
   * current one is being typed. One call in flight, ever; the level in hand
   * is never touched, and an answer that arrives after the level it was for
   * has started is simply queued behind what is there.
   */
  const askSeat = () => {
    if (left || !seatOn || !seatBox.checked || seatBusy || daemon !== 'up') return;
    if (!state.endless || state.over) return;
    const next = state.levelIndex + 1;
    if (givenFor !== next) {
      givenFor = next;
      given = 0;
      slotTries = 0;
    }
    const def = endlessPeek({
      set: levers,
      seed: opts.seed,
      tier: planOf(state).tier,
      levelIndex: next,
    });
    const have = suppliedCount(state);
    if (have + given >= def.requests) return;
    seatBusy = true;
    seatCounts.asked += 1;
    seatSay('seat thinking');
    seatCtl?.abort();
    seatCtl = new AbortController();
    const ctl = seatCtl;
    const stack: Stack = def.stack;
    const bandMin: Band = def.bandMin;
    const bandMax: Band = def.bandMax;
    const give = (reason: string) => {
      refusals[reason] = (refusals[reason] ?? 0) + 1;
      seatCounts.refused += 1;
      // A refusal is the gate doing its job; nothing answering at all is the
      // machine going away. Only the second kind is counted here, and a run
      // of them says the seat is gone rather than naming the fallback.
      if (reason === 'no answer') {
        noAnswers += 1;
        if (noAnswers >= SEAT_GONE_AFTER) {
          markSeatDown();
          return;
        }
      } else {
        noAnswers = 0;
      }
      if (slotTries + 1 >= ENDLESS_TRIES) {
        slotTries = 0;
        given += 1;
        seatSay(WRITTEN_WORD);
        return;
      }
      slotTries += 1;
    };
    void fetch('/cabinet/endless', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        view: {
          product: planOf(state).product,
          stack,
          bandMin,
          bandMax,
          recent: recentAsks(),
          weak: topWeak(),
          newLevel: have === 0,
        },
        models: seatModels,
      }),
      signal: AbortSignal.any([ctl.signal, AbortSignal.timeout(ENDLESS_TIMEOUT_MS)]),
    })
      .then(async (r) => {
        let a: {
          request?: unknown;
          model?: string;
          tier?: string;
          suppressed?: boolean;
          error?: string;
        } = {};
        try {
          a = (await r.json()) as typeof a;
        } catch {
          throw new Error(r.ok ? 'bad payload' : 'no answer');
        }
        if (!r.ok) {
          throw new Error(
            typeof a.error === 'string' && a.error.trim() ? a.error.trim() : 'no answer',
          );
        }
        return a;
      })
      .then((a) => {
        if (left || ctl.signal.aborted || state.over) return;
        if (a.error) {
          give('no answer');
          return;
        }
        if (!a.request) {
          give(a.suppressed === true ? 'answered in words' : 'no request');
          return;
        }
        const gated = gateCode(a.request, {
          stack,
          bandMin,
          bandMax,
          corpus: corpusOf(state),
          set: levers.difficulty,
          tolerance: VALUE_TOLERANCE,
        });
        if (!gated.ok) {
          const reason: CodeGateReason = gated.reason;
          give(reason);
          return;
        }
        slotTries = 0;
        noAnswers = 0;
        seatCounts.accepted += 1;
        feedRequests(state, [gated.snippet], gated.product);
        // The tag carries a version, which is a digit; the controls row is
        // not the field, so it may be read here (G17, and Ghost does the
        // same beside its own mute button).
        seatSay(`seat: ${typeof a.model === 'string' && a.model !== '' ? a.model : 'a model'}`);
      })
      .catch(() => {
        if (left || ctl.signal.aborted) return;
        give('no answer');
      })
      .finally(() => {
        if (seatCtl === ctl) {
          seatBusy = false;
          seatCtl = null;
        }
      });
  };

  /** One timer, armed from one place: two arms would double the probe's rate. */
  const armTags = (wait: number) => {
    if (left || !seatOn) return;
    if (tagsTimer) window.clearTimeout(tagsTimer);
    tagsTimer = window.setTimeout(probeTags, wait);
  };
  /**
   * How long to wait for the next look. Ghost's backoff shape: five seconds
   * for the first retry, doubling to a ceiling while nothing answers, back to
   * five the moment something does. A local build where nothing is listening
   * and nothing will be is the common case, and a flat five seconds there is
   * a failed fetch every five seconds for the life of the run.
   */
  const TAGS_CAP_MS = 60_000;
  let tagsFails = 0;
  const tagsWait = () => Math.min(TAGS_CAP_MS, TAGS_EVERY_MS * 2 ** Math.max(0, tagsFails - 1));
  const probeTags = () => {
    void probeSeatModels({ signal: tagsCtl.signal, timeoutMs: TAGS_TIMEOUT_MS })
      .then((listed) => {
        if (left || tagsCtl.signal.aborted) return;
        if (listed.length === 0) {
          tagsFails += 1;
          markSeatDown();
          return;
        }
        const was = daemon;
        tagsFails = 0;
        seatModels = listed;
        daemon = 'up';
        seatBox.disabled = false;
        seatWhy.set(false);
        if (was !== 'up') {
          if (prefs.seat !== 'off') {
            seatBox.checked = true;
            seatSay(LOOKING_WORD);
            askSeat();
          } else {
            seatSay(WRITTEN_USER);
          }
        }
      })
      .catch(() => {
        if (left || tagsCtl.signal.aborted) return;
        tagsFails += 1;
        markSeatDown();
      })
      .finally(() => {
        // The look keeps running while the box is checked. It used to stop
        // there, and `markSeatDown` was reachable from nowhere else — so a
        // daemon that went away mid-run could never be noticed, the box
        // stayed checked and enabled, and the player had nothing to act on.
        armTags(tagsWait());
      });
  };

  seatBox.addEventListener('change', () => {
    writeVibePrefs({ seat: seatBox.checked ? 'on' : 'off' });
    if (seatBox.checked) {
      seatSay(LOOKING_WORD);
      askSeat();
    } else {
      seatCtl?.abort();
      seatCtl = null;
      seatBusy = false;
      noAnswers = 0;
      seatSay(WRITTEN_USER);
      armTags(TAGS_EVERY_MS);
    }
    // The control is done with; the letters go back to the field.
    takeKeys();
  });

  if (seatOn) {
    seatSay(LOOKING_WORD);
    probeTags();
  }

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
      // Here, and only here: this is the one place that knows a request has
      // just been paid for, so it is where the next one is asked for and
      // where a late answer costs the step nothing (slice 2's note, G13).
      askSeat();
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
    // The voice's own frame: a receipted take plays here, on its beat or at
    // the next ask, and the run ending drops whatever is still in hand.
    takeOpenAsk();
    voicer.tick(state.beat, over || state.over);
    const hold = state.requestIndex >= planOf(state).requests.length - 1;
    // The stack the level is written in, on the same lazy rule the tiles
    // follow: asking is what fetches its bed, and a level that stays in one
    // stack asks once. In endless a stack change costs one fetch and a cross.
    audio?.setStack(planOf(state).stack);
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
    // The field is not the whole page. A key pressed on a control belongs to
    // that control: Enter and Space are how a button is pressed from the
    // keyboard, and swallowing them left 'Sound on' and 'Back to the
    // cabinets' — and the standup's own buttons — dead to anyone not using a
    // mouse. Ghost's filter is this one; the typing cabinet's was missing
    // `button` and `label`.
    if (chromeTarget(e.target)) return;
    // The run is over: the standup is a page of buttons and nothing here is
    // typing any more, so no key is taken and none is canceled.
    if (over) return;
    const read = readKey(e);
    // Tab is the browser's own key for moving focus. It is only taken when
    // there is a completion on screen to take; with none, Tab moves focus as
    // it does everywhere else (it used to be swallowed unconditionally, which
    // is a keyboard trap: focus could not leave the field at all).
    const prevent =
      read.kind === 'input' && read.input.tab === true ? state.copilot !== null : read.prevent;
    if (prevent) e.preventDefault();
    if (read.kind === 'leave') {
      if (escSince === 0) {
        escSince = typeof performance !== 'undefined' ? performance.now() : Date.now();
      }
      return;
    }
    if (read.kind === 'ignore') return;
    ensureAudio();
    queue.push(read.input);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    // Escape is the one key whose release matters: a hold leaves the field
    // (LEAVE_HOLD_MS); a tap throws the line away and starts it again, the
    // sim's courtesy (`RunInput.clear`), never a penalty.
    if (e.key !== 'Escape') return;
    const held =
      escSince > 0
        ? (typeof performance !== 'undefined' ? performance.now() : Date.now()) - escSince
        : 0;
    escSince = 0;
    if (held > 0 && held < LEAVE_HOLD_MS && !over) queue.push({ clear: true });
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // ——— the soft keyboard ————————————————————————————————————————————————————
  //
  // A soft keyboard sends `insertText` and `deleteContentBackward` and very
  // often no useful key at all, so the box is read through the edit it
  // announces rather than through a keydown. Enter and Backspace still get a
  // keydown, because the soft keyboards that do send them send those two.
  //
  // One reader, picked by focus: a key whose target is the box never reaches
  // the window listener (its guard closes on `input`), and the keydown below
  // takes only the three keys that are not characters — so a hardware
  // keyboard attached to a touch device is read once, by the edit, and never
  // twice.

  /** An edit the box announced, as the move the sim takes. */
  const takeEdit = (e: InputEvent): void => {
    if (left || over) return;
    if (e.inputType === 'deleteContentBackward') {
      queue.push({ backspace: true });
    } else if (e.inputType === 'insertLineBreak' || e.inputType === 'insertParagraph') {
      queue.push({ enter: true });
    } else if (e.inputType === 'insertText') {
      // A composition is whole words the player did not type character by
      // character, and a paste is a line nobody typed: neither is a move,
      // which is the key reader's rule kept here.
      for (const ch of e.data ?? '') queue.push({ key: ch });
    } else {
      return;
    }
    ensureAudio();
  };
  /**
   * Whether this browser announces an edit before it makes it. Latched on the
   * first `beforeinput`, so a browser that has them is read there and a
   * browser that has none is read on `input` — one reader either way.
   */
  let saysBefore = false;
  const onBoxBefore = (e: Event) => {
    saysBefore = true;
    takeEdit(e as InputEvent);
  };
  const onBoxInput = (e: Event) => {
    if (!saysBefore) takeEdit(e as InputEvent);
    // The box holds nothing: it is a keyboard. Emptying it keeps the caret at
    // the start, where a backspace still reports itself.
    typeBox.value = '';
  };
  const onBoxKey = (e: KeyboardEvent) => {
    if (left || over) return;
    if (e.key !== 'Enter' && e.key !== 'Backspace' && e.key !== 'Tab') return;
    const read = readKey(e);
    if (read.kind !== 'input') return;
    const prevent = read.input.tab === true ? state.copilot !== null : read.prevent;
    if (prevent) e.preventDefault();
    ensureAudio();
    queue.push(read.input);
  };
  typeBox.addEventListener('beforeinput', onBoxBefore);
  typeBox.addEventListener('input', onBoxInput);
  typeBox.addEventListener('keydown', onBoxKey);
  // A tap on the editor is a player asking for their keyboard. Only where the
  // pointer is coarse: with a mouse, focus belongs to the pane as before.
  const onPaneDown = () => {
    if (!left && !over) typeBox.focus();
  };
  if (onFinger) editorPane.addEventListener('pointerdown', onPaneDown);

  /** The field's keys, taken down. The standup drops them; so does leaving. */
  const dropKeys = () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    typeBox.removeEventListener('beforeinput', onBoxBefore);
    typeBox.removeEventListener('input', onBoxInput);
    typeBox.removeEventListener('keydown', onBoxKey);
    editorPane.removeEventListener('pointerdown', onPaneDown);
    typeBox.blur();
  };

  mute.addEventListener('click', () => {
    muted = !muted;
    mute.textContent = soundWords(muted);
    writeVibePrefs({ muted: muted ? 'on' : 'off' });
    ensureAudio();
    audio?.setMuted(muted);
    // The button is done with; the letters go back to the field.
    takeKeys();
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
    // The field is gone, so its keys go with it: the standup is a page of
    // buttons and the window listener has no business canceling Enter,
    // Space or Tab on them. A hold in progress is let go with them, since
    // the key that would have ended it is no longer being listened for.
    dropKeys();
    escSince = 0;
    const plan = planOf(state);
    const runs = (prefs.runs ?? 0) + 1;
    writeVibePrefs({ runs, last: opts.seed });
    writeWeak(mergeWeak(storedWeak, state.weakBigrams));
    audio?.end();
    const scene = el('section', 'column vibe-standup');
    // The end card quotes the chat, so it quotes it at the size the player
    // chose. `--vibe-font` was set on the mount's wrap and the standup
    // replaces that wrap outright, so the player's last user line — the same
    // words that were on screen a second earlier — dropped to the browser
    // default at the emotional payoff of the run.
    scene.style.setProperty('--vibe-font', FONT_SIZES[font]);
    // The product and the stack it was built on, in the menu's own words. The
    // stack is the one fact the end card was missing: two levels can share a
    // premise and read as the same job otherwise.
    scene.append(el('h1', undefined, `${plan.product} · ${STACK_WORDS[plan.stack] ?? plan.stack}`));
    // The level's premise, under its name. An endless level has none.
    if (plan.story !== '') scene.append(el('p', 'muted', plan.story));
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
    // Who your user was, in words. The standup is the field's end card, so
    // the model is a character here too and goes unnamed (G17).
    if (state.endless && seatOn) {
      scene.append(
        el('p', 'muted', seatCounts.accepted > 0 ? 'the user was a model' : 'the user was written'),
      );
    }
    if (state.milestones.length > 0) {
      scene.append(el('p', 'muted', state.milestones.join(' · ')));
    }
    const seedLine = el('p', 'vibe-seed', `seed ${opts.seed}`);
    // What the seed is for, in the page rather than in a `title` on a
    // paragraph: a paragraph is not focusable, Tab skips it, a reader's
    // software never announces a title on one, and a touch player has no
    // hover — so the seed was shown with no statement of what it is.
    const seedWhy = el('p', 'muted why', 'Type this seed on the menu to play the same run again.');
    scene.append(seedLine, seedWhy);
    // ——— what comes next ——————————————————————————————————————————————————
    //
    // The end card had one way forward and it was the menu — which then
    // re-selected the product just finished, because the menu opens on the
    // stored level. So a player working down the story levels shipped one and
    // had to find the next one themselves, remembering which ones they had
    // already built. Ghost's end scene, the same chassis, plays the tape again
    // on a click and carries a Next tape button; this takes that chassis and
    // none of its grammar. Both buttons remount through the call the menu
    // makes, with the settings already in hand.
    const listed = levers.levels.levels;
    // The next product in the MENU's order — stack heading by stack heading —
    // and null at the end of the list rather than a wrap into another stack.
    // Endless has no next, so it shows the replay button alone.
    const after = state.endless ? null : nextLevelIndex(listed, state.levelIndex);
    if (state.ended === 'shipped' && !state.endless) {
      // Where the menu opens next time: the product AFTER the one that
      // shipped, and the one that shipped marked as built.
      const done = prefs.shipped ?? [];
      const kept = done.includes(plan.product) ? done : [...done, plan.product];
      writeVibePrefs({
        shipped: kept.slice(-SHIPPED_KEEP),
        ...(after !== null ? { level: after } : {}),
      });
    }
    /** The call the menu makes, with this run's settings already in hand. */
    const remount = (levelIndex: number | null, seed: number) => {
      leave();
      mountVibeTyper(root, {
        ...opts,
        ...(levelIndex === null ? {} : { levelIndex }),
        endless: levelIndex === null,
        seed,
        startAudio: true,
      });
    };
    const row = el('div', 'row');
    const replay = el(
      'button',
      'commit',
      state.endless ? 'Take this ladder again' : 'Build this again',
    );
    replay.type = 'button';
    row.append(replay);
    const next = after === null ? null : el('button', 'commit', 'The next product');
    if (next) {
      next.type = 'button';
      row.append(next);
    }
    const back = el('button', undefined, 'Back to the cabinets');
    back.type = 'button';
    row.append(back);
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
    back.addEventListener('click', () => {
      leave();
      opts.onExit();
    });
    // The same run again: the same seed is the same run, which is what the
    // seed line under this row promises.
    replay.addEventListener('click', () => {
      remount(state.endless ? null : state.levelIndex, opts.seed);
    });
    // A new product draws the seed the menu would have drawn for it.
    next?.addEventListener('click', () => {
      remount(after, nextSeed(opts.seed, runs));
    });
    root.replaceChildren(scene);
    // A player who shipped is being carried forward, so the control that
    // carries them is the one under their hands; anyone else lands on the
    // replay, which is where Ghost's end scene leaves them.
    if (next && state.ended === 'shipped') next.focus();
    else replay.focus();
  }

  function leave() {
    if (left) return;
    left = true;
    // Nothing in flight outlives the mount: the seat's ask and the daemon
    // probe are both dropped before anything else is taken down.
    seatCtl?.abort();
    seatCtl = null;
    seatBusy = false;
    tagsCtl.abort();
    if (tagsTimer) window.clearTimeout(tagsTimer);
    if (voiceProbe) window.clearTimeout(voiceProbe);
    stopTake();
    if (raf) cancelAnimationFrame(raf);
    dropKeys();
    document.removeEventListener('visibilitychange', onVisibility);
    audioCtx?.removeEventListener?.('statechange', onCtxState);
    audioCtx = null;
    if (motionMq && typeof motionMq.removeEventListener === 'function') {
      motionMq.removeEventListener('change', onMotion);
    }
    audio?.end();
    audio?.close();
    audio = null;
    root.classList.remove('playing');
  }

  pushChat();
  // The opening ask, held for the checkbox (see `takeOpenAsk`).
  openAsk = [...state.chat].reverse().find((line) => line.who === 'user')?.line ?? null;
  drawEditor();
  drawBoard(0);
  drawPreview(0);
  if (opts.startAudio) ensureAudio();
  // The field has the keys from the first frame, so the first letter typed
  // lands whether or not the player has touched anything yet.
  takeKeys();

  return {
    unmount: leave,
    tick,
    debug: () => ({
      supplied: suppliedCount(state),
      asked: seatCounts.asked,
      accepted: seatCounts.accepted,
      refused: seatCounts.refused,
      music: audio ? audio.music() : null,
      cards: cards.size,
      // Which recorded bed has the level, or null: no engine yet, a mode that
      // plays the procedural bed, or a stack whose file never arrived.
      track: audio ? audio.track() : null,
      // The level in hand and its product. In endless both move under the
      // run, and the header and the preview's label follow them.
      level: state.levelIndex,
      product: planOf(state).product,
      motion: { calm, shake, flash, specks: specks.length },
    }),
  };
}
