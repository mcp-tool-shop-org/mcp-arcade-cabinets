// The house rules for the authored shelf, and the proof the shipped levers
// already keep them.
//
// The corpus used to be two shelves bound under one cover: 27 of 249 asks
// ended in a period and 222 did not, 124 of 249 reactions did and 125 did
// not, the agent's `replies` and `ships` kept the rule three pools out of
// five, and the 39 hand-authored snippets were Title-Cased over 210 lowercase
// ported ones, so one stack held both `For loop` and `for loop with nested
// conditional`. `scripts/normalize-lines.mjs` is the rule; this is the gate
// that keeps an authoring run from reopening the seam.
//
// The rules are re-derived here from the shipped files rather than read back
// out of the script's own walk, so a bug in the walk cannot pass itself.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// A dev script, plain JS; vitest resolves it and the shapes are checked here.
import { asRequest, asStatement, asTitle, plan } from '../scripts/normalize-lines.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(HERE, '..');
const CORPUS = path.join(PKG, 'patterns', 'corpus');

interface Row {
  id: string;
  title: string;
  ask?: string;
  reaction?: string;
  notes?: string[];
  creep?: { ask: string };
}

function corpus(): { file: string; row: Row }[] {
  const out: { file: string; row: Row }[] = [];
  for (const name of readdirSync(CORPUS)) {
    if (!name.endsWith('.json')) continue;
    const rows = JSON.parse(readFileSync(path.join(CORPUS, name), 'utf8')) as Row[];
    for (const row of rows) out.push({ file: name, row });
  }
  return out;
}

function lever(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(PKG, 'patterns', name), 'utf8'));
}

describe('the rules themselves', () => {
  it('takes a period off a request and leaves a question alone', () => {
    expect(asRequest('make the list go up.')).toBe('make the list go up');
    expect(asRequest('make the list go up')).toBe('make the list go up');
    expect(asRequest('can you make the list go up?')).toBe('can you make the list go up?');
  });

  it('puts a period on a statement and never a second stop', () => {
    expect(asStatement('it is live and looking lovely')).toBe('it is live and looking lovely.');
    expect(asStatement('it is live and looking lovely.')).toBe('it is live and looking lovely.');
    expect(asStatement('is it live?')).toBe('is it live?');
  });

  it('lowercases a title whole, acronyms with it', () => {
    expect(asTitle('For loop')).toBe('for loop');
    expect(asTitle('Inner JOIN')).toBe('inner join');
    expect(asTitle('LINQ pipeline')).toBe('linq pipeline');
    expect(asTitle('for loop with nested conditional')).toBe('for loop with nested conditional');
  });
});

describe('the shipped shelf keeps them', () => {
  it('has nothing left for the normalizer to do', () => {
    const changes = (plan() as { file: string; changes: { key: string }[] }[]).flatMap((f) =>
      f.changes.map((c) => `${f.file}: ${c.key}`),
    );
    expect(changes).toEqual([]);
  });

  it('titles the whole corpus one way', () => {
    for (const { file, row } of corpus()) {
      expect(row.title, `${file} ${row.id}`).toBe(row.title.toLowerCase());
    }
  });

  it('ends every authored ask with no period and every reaction with one', () => {
    let asks = 0;
    let reactions = 0;
    for (const { file, row } of corpus()) {
      if (typeof row.ask === 'string') {
        asks += 1;
        expect(row.ask.endsWith('.'), `${file} ${row.id}.ask`).toBe(false);
      }
      if (typeof row.creep?.ask === 'string') {
        expect(row.creep.ask.endsWith('.'), `${file} ${row.id}.creep.ask`).toBe(false);
      }
      if (typeof row.reaction === 'string') {
        reactions += 1;
        expect(/[.?]$/.test(row.reaction), `${file} ${row.id}.reaction`).toBe(true);
      }
      for (const [i, note] of (row.notes ?? []).entries()) {
        expect(/[.?]$/.test(note), `${file} ${row.id}.notes[${i}]`).toBe(true);
      }
    }
    // The shelf is 249 of each; if a port halves it, this says so.
    expect(asks).toBeGreaterThanOrEqual(240);
    expect(reactions).toBeGreaterThanOrEqual(240);
  });

  it('ends every pool the agent speaks from with a period', () => {
    const agent = lever('agent.json');
    for (const key of ['replies', 'hmm', 'compactions', 'ships', 'nagReplies']) {
      const pool = agent[key] as string[];
      expect(pool.length, key).toBeGreaterThan(0);
      for (const [i, line] of pool.entries()) {
        expect(/[.?]$/.test(line), `agent.${key}[${i}]`).toBe(true);
      }
    }
  });

  it("keeps the user's requests bare and their verdicts stopped", () => {
    const user = lever('user.json');
    const bare = (value: unknown, key: string): void => {
      if (typeof value === 'string') expect(value.endsWith('.'), key).toBe(false);
      else if (Array.isArray(value)) value.forEach((v, i) => bare(v, `${key}[${i}]`));
      else if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) bare(v, `${key}.${k}`);
      }
    };
    const stopped = (value: unknown, key: string): void => {
      if (typeof value === 'string') expect(/[.?]$/.test(value), key).toBe(true);
      else if (Array.isArray(value)) value.forEach((v, i) => stopped(v, `${key}[${i}]`));
      else if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) stopped(v, `${key}.${k}`);
      }
    };
    for (const key of ['asks', 'creeps', 'nags']) bare(user[key], `user.${key}`);
    for (const key of ['reviews', 'reactions', 'reactionsByTopic', 'reviewsByProduct']) {
      stopped(user[key], `user.${key}`);
    }
  });
});
