// The say gate (G14). Free text reaches the field only through here. The
// bounds are the Director's: at most twelve words, one sentence, no digit,
// no fact or score word (the same FORBIDDEN test the prompts throw on), no
// tool, model or seat name, and nothing said in the round's recent window.
// A line that fails is dropped by the caller, and the seed's authored line
// plays instead, so the scripted floor never leaves.

import { TOOL_NAMES, VIBE_TOOL_NAMES } from './tool-names';

export const SAY_MAX_WORDS = 12;

/**
 * Any digit in any script, and any other number glyph: fullwidth and Arabic
 * digits (Nd), superscripts, circled digits and fractions (No). The ASCII
 * class alone let a fullwidth digit onto the field (Grok's review).
 */
export const DIGIT = /[\p{Nd}\p{No}]/u;

/** The same words the pilot and voice prompts refuse, plus their plurals. */
export const FORBIDDEN =
  /[\p{Nd}\p{No}]|\b(lie|lies|fact|facts|revealed|followed|held|score|scores|pass|fail|nrp|integrity|utility|cleared|ghost)\b/iu;

/**
 * Vendor, model and seat words the say gate also refuses. Tool names come
 * from TOOL_NAMES so a new lever is gated without a third hardcoded list.
 */
const VENDOR_NAMES = [
  'stinger',
  'paint',
  'seat',
  'ollama',
  'claude',
  'anthropic',
  'openai',
  'chatgpt',
  'gpt',
  'kimi',
  'qwen',
  'llama',
  'mistral',
  'gemini',
  'gemma',
  'deepseek',
  'minimax',
  'glm',
  'hermes',
  'grok',
  'phi',
  'llm',
  'mcp',
] as const;

/**
 * Tool, model, vendor and seat names. The model is a character, not a
 * feature (G17): nothing on the field may name it. The word `model` itself
 * is allowed: the persona may own being one.
 */
export function namesRegex(tools: readonly string[]): RegExp {
  return new RegExp(`\\b(${[...tools, ...VENDOR_NAMES].join('|')})\\b`, 'i');
}

export const NAMES = namesRegex(TOOL_NAMES);

/**
 * The same refusal for the typing cabinet's four levers (slice 4). Measured
 * before adding it, because `view`, `product`, `ask` and `react` are
 * ordinary English in a way `sfx` and `tapes` are not: of the sixteen
 * hundred and twenty-one authored reaction and review lines the user can
 * say, none carries any of the four. The rule therefore costs the authored
 * pool nothing and closes the same hole on the seat's side.
 */
export const VIBE_NAMES = namesRegex(VIBE_TOOL_NAMES);

/**
 * Code points nobody typed: the C0 and C1 controls, the soft hyphen, the
 * zero-width spaces and joiners, the line and paragraph separators, the bidi
 * overrides and isolates, and the byte-order mark. They pass every other
 * rule here — not whitespace, not a digit, not a closed word, not a name —
 * and would land verbatim on the field caption and in the JSON body the
 * voice worker writes into a receipt file on the host. The typing cabinet's
 * gate already refuses them (`lineFault`, which takes the whole line back to
 * this keyboard); this closes the same class on the shooter's side without
 * banning the accented letters and curly marks a persona sheet may carry.
 */
export const UNPRINTABLE =
  // eslint-disable-next-line no-control-regex -- the controls are the rule
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2028\u2029\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/;

export type GateReason =
  | 'empty'
  | 'long'
  | 'overlong'
  | 'sentences'
  | 'digit'
  | 'character'
  | 'forbidden'
  | 'name'
  | 'repeat';

export type GateResult = { ok: true; line: string } | { ok: false; reason: GateReason };

const WRAP = /^[\s"'“”‘’*_`]+|[\s"'“”‘’*_`]+$/g;

/** Trim, drop wrapping quotes and markdown stars, collapse whitespace. */
export function normalizeLine(raw: string): string {
  return String(raw ?? '')
    .replace(WRAP, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Letters only, lower case: the key the no-repeat window compares. */
export function lineKey(line: string): string {
  return line.toLowerCase().replace(/[^a-z]/g, '');
}

/** One sentence by the gate's own count: what a seed line must be. */
export function isOneSentence(line: string): boolean {
  return sentenceCount(normalizeLine(line)) === 1;
}

function sentenceCount(line: string): number {
  // An ellipsis is a pause, not a full stop.
  return line
    .replace(/\.{3,}|…/g, ',')
    .split(/[.!?]+(?:\s|$)/)
    .map((s) => s.trim())
    .filter(Boolean).length;
}

/**
 * `maxChars` is the contract's own bound for the field, and it refuses
 * rather than clips. The caller used to clip to the bound and gate the short
 * string, which is a repair: the boss would then say something the caller
 * did not write, and say it as though it had been admitted. The typing
 * cabinet removed that same defect on its side (`tooLong`), and this is the
 * same rule in the one place the shooter does its gating.
 */
export function gateLine(
  raw: unknown,
  opts: { recent?: readonly string[]; maxWords?: number; maxChars?: number } = {},
): GateResult {
  const max = Math.min(SAY_MAX_WORDS, opts.maxWords ?? SAY_MAX_WORDS);
  if (typeof raw !== 'string') return { ok: false, reason: 'empty' };
  if (opts.maxChars !== undefined && raw.length > opts.maxChars) {
    return { ok: false, reason: 'overlong' };
  }
  if (/[\r\n]/.test(raw.trim())) return { ok: false, reason: 'sentences' };
  const line = normalizeLine(raw);
  if (line === '') return { ok: false, reason: 'empty' };
  if (UNPRINTABLE.test(line)) return { ok: false, reason: 'character' };
  if (DIGIT.test(line)) return { ok: false, reason: 'digit' };
  const words = line.split(' ').filter(Boolean);
  if (words.length > max) return { ok: false, reason: 'long' };
  if (sentenceCount(line) > 1) return { ok: false, reason: 'sentences' };
  if (FORBIDDEN.test(line)) return { ok: false, reason: 'forbidden' };
  if (NAMES.test(line)) return { ok: false, reason: 'name' };
  const key = lineKey(line);
  for (const r of opts.recent ?? []) {
    if (lineKey(r) === key) return { ok: false, reason: 'repeat' };
  }
  return { ok: true, line };
}
