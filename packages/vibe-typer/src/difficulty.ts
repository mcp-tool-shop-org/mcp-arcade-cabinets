// G24: a request's value is a deterministic formula over its code, and the
// preview grows by exactly what the score counts. Pure; no state, no clock.
//
// The terms, and where each comes from in the research (docs/vibe-typer.dispatch.md):
//   surprisal   character trigram bits over the corpus          (Q2.4, Behmer and Crump 2017)
//   travel      key-pair cost, same finger worst                (Q2.1, Q2.6, Dhakal 2018, Karrenbauer 2014)
//   length      raw characters                                  (Q2.5, Buse and Weimer 2010)
//   punctuation density of non-word characters                  (Q2.5)
//   identifier  each name of identifierMin characters or more   (Q2.7, Hellendoorn 2019)
//   bracket     each closing bracket                            (Q2.7)
// Nesting depth is deliberately absent (Scalabrino 2018 finds it weak).

import type { DifficultySet, KeyPos } from './patterns';
import type { NgramModel } from './corpus';
import { surprisal } from './corpus';
import type { Snippet } from './types';

const IDENTIFIER = /[A-Za-z_][A-Za-z0-9_]*/g;
const CLOSER = /[)\]}]/g;
const PUNCTUATION = /[^A-Za-z0-9\s]/g;

interface Press {
  pos: KeyPos;
  shifted: boolean;
}

function pressOf(ch: string, set: DifficultySet): Press | null {
  const direct = set.keys[ch];
  if (direct) return { pos: direct, shifted: false };
  const base = set.shift[ch];
  if (base) {
    const pos = set.keys[base];
    if (pos) return { pos, shifted: true };
  }
  return null;
}

/**
 * Cost of pressing `to` having just pressed `from`. Same finger is dearest,
 * same hand next, alternating hands cheapest; a row jump adds; a fresh shift
 * adds once (a held shift across two shifted characters does not).
 */
export function travelCost(from: string | null, to: string, set: DifficultySet): number {
  const c = set.costs;
  const next = pressOf(to, set);
  if (!next) {
    if (to === '\n') return c.newline;
    if (to === ' ') return c.space;
    return c.unknown;
  }
  const prev = from === null ? null : pressOf(from, set);
  let cost: number;
  if (!prev) {
    cost = c.alternate;
  } else if (prev.pos.hand !== next.pos.hand) {
    cost = c.alternate;
  } else if (prev.pos.finger === next.pos.finger) {
    cost =
      prev.pos.row === next.pos.row && prev.pos.col === next.pos.col
        ? c.repeat
        : c.sameFinger + c.rowJump * Math.abs(prev.pos.row - next.pos.row);
  } else {
    cost = c.sameHand + c.rowJump * Math.abs(prev.pos.row - next.pos.row);
  }
  if (next.shifted && !(prev && prev.shifted)) cost += c.shift;
  return cost;
}

/** Summed travel over a text, counting the first press from rest. */
export function travel(text: string, set: DifficultySet): number {
  let sum = 0;
  let prev: string | null = null;
  for (const ch of text) {
    sum += travelCost(prev, ch, set);
    prev = ch;
  }
  return sum;
}

export interface ValueParts {
  surprisal: number;
  travel: number;
  length: number;
  punctuation: number;
  identifier: number;
  bracket: number;
  total: number;
}

/** Every term of the formula, for the tests and the slice doc. */
export function valueParts(text: string, model: NgramModel, set: DifficultySet): ValueParts {
  const w = set.weights;
  const length = text.length;
  const punctuation = (text.match(PUNCTUATION) ?? []).length;
  const identifiers = (text.match(IDENTIFIER) ?? []).filter(
    (name) => name.length >= w.identifierMin,
  ).length;
  const closers = (text.match(CLOSER) ?? []).length;
  const parts = {
    surprisal: w.surprisal * surprisal(model, text),
    travel: w.travel * travel(text, set),
    length: w.length * length,
    punctuation: w.punctuation * (length > 0 ? punctuation / length : 0),
    identifier: w.identifier * identifiers,
    bracket: w.bracket * closers,
    total: 0,
  };
  parts.total =
    w.scale *
    (parts.surprisal +
      parts.travel +
      parts.length +
      parts.punctuation +
      parts.identifier +
      parts.bracket);
  return parts;
}

/** The value of a piece of text. Always positive, so every request pays. */
export function valueOf(text: string, model: NgramModel, set: DifficultySet): number {
  return Math.max(0.01, valueParts(text, model, set).total);
}

/** The value of a snippet: its code as the player types it. */
export function value(snippet: Snippet, model: NgramModel, set: DifficultySet): number {
  return valueOf(snippet.code, model, set);
}
