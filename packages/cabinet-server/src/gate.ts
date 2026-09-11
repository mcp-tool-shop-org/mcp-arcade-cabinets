// The say gate (G14). Free text reaches the field only through here. The
// bounds are the Director's: at most twelve words, one sentence, no digit,
// no fact or score word (the same FORBIDDEN test the prompts throw on), no
// tool, model or seat name, and nothing said in the round's recent window.
// A line that fails is dropped by the caller, and the seed's authored line
// plays instead, so the scripted floor never leaves.

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
 * Tool, model, vendor and seat names. The model is a character, not a
 * feature (G17): nothing on the field may name it. The word `model` itself
 * is allowed: the persona may own being one.
 */
export const NAMES =
  /\b(fire|say|sfx|speak|stinger|paint|view|tapes|seat|ollama|claude|anthropic|openai|chatgpt|gpt|kimi|qwen|llama|mistral|gemini|gemma|deepseek|minimax|glm|hermes|grok|phi|llm|mcp)\b/i;

export type GateReason = 'empty' | 'long' | 'sentences' | 'digit' | 'forbidden' | 'name' | 'repeat';

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

function sentenceCount(line: string): number {
  // An ellipsis is a pause, not a full stop.
  return line
    .replace(/\.{3,}|…/g, ',')
    .split(/[.!?]+(?:\s|$)/)
    .map((s) => s.trim())
    .filter(Boolean).length;
}

export function gateLine(
  raw: unknown,
  opts: { recent?: readonly string[]; maxWords?: number } = {},
): GateResult {
  const max = Math.min(SAY_MAX_WORDS, opts.maxWords ?? SAY_MAX_WORDS);
  if (typeof raw !== 'string') return { ok: false, reason: 'empty' };
  if (/[\r\n]/.test(raw.trim())) return { ok: false, reason: 'sentences' };
  const line = normalizeLine(raw);
  if (line === '') return { ok: false, reason: 'empty' };
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
