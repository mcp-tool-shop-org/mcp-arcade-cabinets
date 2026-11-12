// Typed input to a verb and its words. Everything it knows comes from
// patterns/verbs.json, so a new synonym is a lever, not a code change.

import type { Direction, Patterns } from './types';

export type Command = { verb: string; rest: string; dir?: Direction };

const ARTICLES = new Set(['the', 'a', 'an']);

export function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w !== '' && !ARTICLES.has(w))
    .join(' ');
}

export function parse(raw: string, verbs: Patterns['verbs']): Command {
  const input = normalize(raw);
  if (input === '') return { verb: '', rest: '' };
  const phrases = Object.keys(verbs.phrases).sort((a, b) => b.length - a.length);
  for (const phrase of phrases) {
    const p = normalize(phrase);
    if (input === p || input.startsWith(`${p} `)) {
      return withDirection(
        { verb: verbs.phrases[phrase]!, rest: input.slice(p.length).trim() },
        verbs,
      );
    }
  }
  const [first = '', ...more] = input.split(' ');
  const rest = more.join(' ');
  const dir = verbs.directions[first];
  if (dir && rest === '') return { verb: 'go', rest: dir, dir };
  const verb = verbs.verbs[first];
  if (!verb) return { verb: '', rest: input };
  return withDirection({ verb, rest }, verbs);
}

/** "go north", "climb down" and "go to market" all carry a direction or a place name. */
function withDirection(c: Command, verbs: Patterns['verbs']): Command {
  if (c.verb === 'up' || c.verb === 'down') return { verb: 'go', rest: c.verb, dir: c.verb };
  if (c.verb !== 'go') return c;
  const dir = verbs.directions[c.rest];
  return dir ? { ...c, dir } : c;
}
