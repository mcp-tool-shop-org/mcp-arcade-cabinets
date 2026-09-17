// personas.json: one sheet per boss kind (register, tics, what it may own
// about being a model) plus the say lever's timing data. Loaded with a
// schema at import; every string is FORBIDDEN-checked because every string
// reaches the say prompt. A bad file halts the server at load.

import personasJson from '../personas.json';

import { FORBIDDEN, SAY_MAX_WORDS } from './gate';

export type BossKind = 'whisperer' | 'menu' | 'doorman' | 'archivist';
export type Lead = 'short' | 'beat' | 'long';
export const LEADS = ['short', 'beat', 'long'] as const;
/**
 * The boss kinds this loader knows. The sim's own list is `BOSS_KINDS` in
 * `packages/ghost-on-the-menu/src/patterns.ts`, which is not exported — only
 * the derived type is — so this is a copy, and a test pins it to that file's
 * source rather than leaving the two to drift.
 *
 * `loadPersonas` also refuses a sheet for a kind that is not here. Without
 * that, a fifth sheet loaded green and was silently ignored, and a fifth
 * kind in the sim made `personas.boss[boss.kind]` undefined at the host and
 * threw a TypeError inside a `speak` call — which is the one thing a loader
 * that halts at load exists to prevent.
 */
export const BOSS_KINDS: readonly BossKind[] = ['whisperer', 'menu', 'doorman', 'archivist'];
const KINDS = BOSS_KINDS;

/**
 * Delivery, authored per persona (finding 14: loudness carries the dry
 * read; the engine infers nothing from the text). A clone is a consented
 * recording the Director supplies; null means the preset.
 */
export interface VoiceSheet {
  preset: string;
  /** Speech rate multiplier. */
  rate: number;
  /** Gain in decibels around the preset's own level. */
  loudness: number;
  clone: string | null;
}

export interface Persona {
  register: string;
  tics: string[];
  owns: string[];
  voice: VoiceSheet;
}

export interface Personas {
  /** Seconds from the call to the line landing, per lead word. */
  lead: Record<Lead, number>;
  /** Lines remembered for the no-repeat window. */
  window: number;
  /** Word cap; never above the gate's own. */
  maxWords: number;
  /** Seconds between unprompted lines while a boss is up. */
  cadence: number;
  /**
   * The host-side engine the voice sheets are written for, and the bark's
   * timing budget: the longest pause a take may hold mid-line before the
   * receipt calls it a hole. fx-dub's default is half a second; direction
   * lives here as data, never as a tuned threshold in the worker.
   */
  voice: { engine: string; sampleRate: number; maxGap: number };
  boss: Record<BossKind, Persona>;
}

/**
 * The bounds the checks below already encode, said in words. They are the
 * half of every halt here that was missing: the code knew the range and the
 * operator was only ever shown the key.
 */
const RATE_RULE = 'a speech rate is a multiplier from half again slower to twice as fast';
const LOUDNESS_RULE = 'a gain is decibels around the preset, from well under to a little over';
const LEAD_RULE = 'a lead is seconds from the call to the line landing, and sits above nothing';
const WINDOW_RULE = 'the no-repeat window is a whole number of lines, at least one';
const MAX_WORDS_RULE = "a word cap is a whole number, at least one, and never above the gate's own";
const CADENCE_RULE = 'a cadence is seconds between unprompted lines, and sits above nothing';
const SAMPLE_RATE_RULE = "the engine's sample rate is a number above nothing";
const MAX_GAP_RULE = 'a mid-line pause budget is seconds, above nothing and at most three';

/**
 * Halt, naming the place and the rule.
 *
 * `key` alone used to be the whole message, across every call site here, so
 * a fatal startup line read `personas.json: boss.doorman.voice.rate` - a
 * path into a file the operator may not have, with no statement of what was
 * expected and no word about what to do. This file is on the same startup
 * path the sibling loader's halts are: `DEFAULT_PERSONAS` is built at
 * import, `startStdio` prints `err.message` and exits, so an MCP client
 * shows a server that died and one path. The bounds were all right there in
 * the checks and none of them was ever said. The rule is the sentence that
 * makes the path actionable, and it is not optional here either
 * (`contract.ts` carries the same contract).
 */
function fail(key: string, rule: string): never {
  throw new Error(`personas.json: ${key} (${rule})`);
}

function rec(v: unknown, key: string): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    fail(key, 'this must be a block of named fields');
  }
  return v as Record<string, unknown>;
}

function num(v: unknown, key: string, rule = 'this must be a number'): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(key, rule);
  return v;
}

function line(v: unknown, key: string): string {
  if (typeof v !== 'string' || v.trim() === '') {
    fail(key, 'a line on a sheet is words, and never empty');
  }
  if (FORBIDDEN.test(v)) {
    fail(
      key,
      'every string here reaches the say prompt, so none may carry a digit or a word about how the game is going',
    );
  }
  return v;
}

function lines(v: unknown, key: string): string[] {
  if (!Array.isArray(v) || v.length === 0) fail(key, 'this is a list with at least one line in it');
  return v.map((x, i) => line(x, `${key}.${i}`));
}

function loadVoice(v: unknown, key: string): VoiceSheet {
  const r = rec(v, key);
  const preset = r.preset;
  if (typeof preset !== 'string' || !/^[a-z]{2}_[a-z]+$/.test(preset)) {
    fail(
      `${key}.preset`,
      'a preset is two lower-case letters, an underscore, then a lower-case word',
    );
  }
  const rate = num(r.rate, `${key}.rate`, RATE_RULE);
  if (!(rate >= 0.5 && rate <= 2)) fail(`${key}.rate`, RATE_RULE);
  const loudness = num(r.loudness, `${key}.loudness`, LOUDNESS_RULE);
  if (!(loudness >= -24 && loudness <= 12)) fail(`${key}.loudness`, LOUDNESS_RULE);
  const clone = r.clone;
  if (clone !== null && (typeof clone !== 'string' || clone.trim() === '')) {
    fail(`${key}.clone`, 'a clone is the name of a consented recording, or null for the preset');
  }
  return { preset, rate, loudness, clone: clone === null ? null : String(clone) };
}

export function loadPersonas(raw: unknown): Personas {
  const obj = rec(raw, 'root');
  const leadRaw = rec(obj.lead, 'lead');
  const lead = {} as Record<Lead, number>;
  for (const k of LEADS) {
    const n = num(leadRaw[k], `lead.${k}`, LEAD_RULE);
    if (!(n > 0)) fail(`lead.${k}`, LEAD_RULE);
    lead[k] = n;
  }
  if (!(lead.short < lead.beat && lead.beat < lead.long)) {
    fail(
      'lead',
      'the three leads run short, then beat, then long, each one further out than the last',
    );
  }
  const window = num(obj.window, 'window', WINDOW_RULE);
  if (!Number.isInteger(window) || window < 1) fail('window', WINDOW_RULE);
  const maxWords = num(obj.maxWords, 'maxWords', MAX_WORDS_RULE);
  if (!Number.isInteger(maxWords) || maxWords < 1 || maxWords > SAY_MAX_WORDS) {
    fail('maxWords', MAX_WORDS_RULE);
  }
  const cadence = num(obj.cadence, 'cadence', CADENCE_RULE);
  if (!(cadence > 0)) fail('cadence', CADENCE_RULE);
  const voiceRaw = rec(obj.voice, 'voice');
  const engine = voiceRaw.engine;
  if (typeof engine !== 'string' || engine.trim() === '') {
    fail('voice.engine', 'the host-side engine these sheets are written for, named as a word');
  }
  const sampleRate = num(voiceRaw.sampleRate, 'voice.sampleRate', SAMPLE_RATE_RULE);
  if (!(sampleRate > 0)) fail('voice.sampleRate', SAMPLE_RATE_RULE);
  const maxGap = num(voiceRaw.maxGap, 'voice.maxGap', MAX_GAP_RULE);
  if (!(maxGap > 0 && maxGap <= 3)) fail('voice.maxGap', MAX_GAP_RULE);
  const bossRaw = rec(obj.boss, 'boss');
  // A key the loader does not know is a halt at load, not a sheet quietly
  // dropped on the floor. The missing-key case is the loop below.
  for (const key of Object.keys(bossRaw)) {
    if (!(KINDS as readonly string[]).includes(key)) {
      // Name the kinds it knows, the way `loadTool` names the cabinet's
      // levers. It used to name neither the key it found nor the four it
      // would have taken.
      fail(
        `boss.${key}`,
        `the boss kinds this cabinet plays are ${KINDS.join(', ')} and nothing else`,
      );
    }
  }
  const boss = {} as Record<BossKind, Persona>;
  for (const kind of KINDS) {
    const p = rec(bossRaw[kind], `boss.${kind}`);
    boss[kind] = {
      register: line(p.register, `boss.${kind}.register`),
      tics: lines(p.tics, `boss.${kind}.tics`),
      owns: lines(p.owns, `boss.${kind}.owns`),
      voice: loadVoice(p.voice, `boss.${kind}.voice`),
    };
  }
  return { lead, window, maxWords, cadence, voice: { engine, sampleRate, maxGap }, boss };
}

export const DEFAULT_PERSONAS: Personas = loadPersonas(personasJson);
