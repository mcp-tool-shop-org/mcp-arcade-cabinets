// Register seeds for the say prompt: three of the kind's own lines from
// voice.json, rotated by the say count so the model sees the register, not
// the same three lines every time. Only one-sentence lines seed (the
// Director's word, 2026-09-11, on Grok's review): the gate's bound is one
// sentence, and a two-sentence seed teaches the model to fail it. The
// two-sentence drafts stay in the file and stay the fallback floor.
// Browser-safe.

import { gateLine, isOneSentence } from './gate';

/**
 * The kind's lines that would pass the gate whole: one sentence, and none
 * of the words the gate refuses (a tool name, a vendor, a fact word). The
 * lead writes the pools for the field, where "list" and "menu" are the
 * agent's vocabulary; the say seat may only seed from the lines the gate
 * itself would let through, or it teaches the model to fail it.
 */
export function seedPool(own: readonly string[]): string[] {
  return own.filter((line) => isOneSentence(line) && gateLine(line).ok);
}

/** Three register seeds from the kind's one-sentence lines, rotated by the say count. */
export function seedLines(own: readonly string[], n: number): string[] {
  const pool = seedPool(own);
  if (pool.length === 0) return [];
  const out: string[] = [];
  for (let i = 0; i < Math.min(3, pool.length); i++) out.push(pool[(n + i) % pool.length]!);
  return out;
}
