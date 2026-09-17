import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import personasJson from '../personas.json';
import { FORBIDDEN } from '../src/gate';
import { BOSS_KINDS, DEFAULT_PERSONAS, loadPersonas } from '../src/personas';

function clone(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(DEFAULT_PERSONAS)) as Record<string, unknown>;
}

describe('personas.json', () => {
  it('loads the shipped sheets, one per boss kind, with no forbidden word anywhere', () => {
    const p = loadPersonas(clone());
    expect(p).toEqual(DEFAULT_PERSONAS);
    for (const kind of ['whisperer', 'menu', 'doorman', 'archivist'] as const) {
      const sheet = p.boss[kind];
      expect(sheet.register).not.toMatch(FORBIDDEN);
      expect(sheet.tics.length).toBeGreaterThan(0);
      expect(sheet.owns.length).toBeGreaterThan(0);
      for (const s of [...sheet.tics, ...sheet.owns]) expect(s).not.toMatch(FORBIDDEN);
    }
    expect(p.lead.short).toBeLessThan(p.lead.beat);
    expect(p.lead.beat).toBeLessThan(p.lead.long);
    expect(p.maxWords).toBeLessThanOrEqual(12);
    expect(p.window).toBeGreaterThanOrEqual(1);
    expect(p.voice.engine).toBe('kokoro');
    expect(p.voice.maxGap).toBe(0.5);
    const presets = new Set(Object.values(p.boss).map((b) => b.voice.preset));
    expect(presets.size).toBeGreaterThanOrEqual(3);
    for (const b of Object.values(p.boss)) {
      expect(b.voice.rate).toBeGreaterThanOrEqual(0.5);
      expect(b.voice.clone).toBeNull();
    }
  });

  it('halts on a bad key, a fact word, a digit, or a lead out of order', () => {
    const noKind = clone();
    delete (noKind.boss as Record<string, unknown>).menu;
    expect(() => loadPersonas(noKind)).toThrow('personas.json: boss.menu');

    const fact = clone();
    (fact.boss as Record<string, Record<string, unknown>>).doorman!.register = 'It tells a lie.';
    expect(() => loadPersonas(fact)).toThrow('boss.doorman.register');

    const digit = clone();
    (digit.boss as Record<string, Record<string, unknown>>).menu!.tics = ['Asks 2 times.'];
    expect(() => loadPersonas(digit)).toThrow('boss.menu.tics.0');

    const lead = clone();
    (lead.lead as Record<string, number>).long = 0.1;
    expect(() => loadPersonas(lead)).toThrow('personas.json: lead');

    const words = clone();
    words.maxWords = 40;
    expect(() => loadPersonas(words)).toThrow('maxWords');

    const empty = clone();
    (empty.boss as Record<string, Record<string, unknown>>).whisperer!.owns = [];
    expect(() => loadPersonas(empty)).toThrow('boss.whisperer.owns');

    const gap = clone();
    (gap.voice as Record<string, unknown>).maxGap = 9;
    expect(() => loadPersonas(gap)).toThrow('voice.maxGap');

    const loud = clone();
    (
      (loud.boss as Record<string, Record<string, unknown>>).menu!.voice as Record<string, unknown>
    ).loudness = 40;
    expect(() => loadPersonas(loud)).toThrow('boss.menu.voice.loudness');

    const preset = clone();
    (
      (preset.boss as Record<string, Record<string, unknown>>).doorman!.voice as Record<
        string,
        unknown
      >
    ).preset = 'Robot 9';
    expect(() => loadPersonas(preset)).toThrow('boss.doorman.voice.preset');
  });
});

describe('the boss kinds are one list, four places', () => {
  it('is the list the sim itself keeps', () => {
    // `BOSS_KINDS` over in the sim is `const` and not exported — only the
    // derived type is — so the loader's copy is pinned to that file's source
    // the way patterns.test.ts pins VOICE_FORBIDDEN. If the sim gains a
    // fifth kind, this is what says so.
    const file = path.resolve('packages/ghost-on-the-menu/src/patterns.ts');
    const source = readFileSync(file, 'utf8');
    const match = /const BOSS_KINDS = \[([^\]]*)\] as const;/.exec(source);
    expect(match).not.toBeNull();
    const sim = match![1]!
      .split(',')
      .map((s) => s.trim().replace(/^'|'$/g, ''))
      .filter((s) => s !== '');
    expect(sim).toEqual([...BOSS_KINDS]);
  });

  it('is exactly what the shipped sheets carry', () => {
    expect(Object.keys(personasJson.boss)).toEqual([...BOSS_KINDS]);
  });

  it('halts at load on a sheet for a kind it does not know', () => {
    // It used to load green and be silently ignored, which is the same
    // silence that would let a fifth kind reach `personas.boss[kind]`
    // undefined and throw a TypeError inside a `speak` call instead.
    const extra = clone();
    const boss = extra.boss as Record<string, unknown>;
    boss.usher = JSON.parse(JSON.stringify(boss.doorman)) as unknown;
    // It names the key it found and the kinds it knows, the way `loadTool`
    // names the cabinet's levers. It used to name neither.
    expect(() => loadPersonas(extra)).toThrow('personas.json: boss.usher');
    expect(() => loadPersonas(extra)).toThrow('whisperer, menu, doorman, archivist');
  });

  it('says the rule beside the key, the way the sibling loader does', () => {
    // `DEFAULT_PERSONAS` is built at import and `startStdio` prints
    // `err.message` and exits, so an MCP client showed a server that died
    // with a path into a file the operator may not have, no statement of
    // what was expected and no word about what to do. Every bound was right
    // there in the check beside it and none of them was said.
    const bounds: [string, string, (o: Record<string, unknown>) => void][] = [
      [
        'boss.doorman.voice.rate',
        'multiplier',
        (o) => {
          voiceOf(o, 'doorman').rate = 9;
        },
      ],
      [
        'boss.doorman.voice.loudness',
        'decibels',
        (o) => {
          voiceOf(o, 'doorman').loudness = -99;
        },
      ],
      [
        'boss.doorman.voice.preset',
        'lower-case',
        (o) => {
          voiceOf(o, 'doorman').preset = 'Loud Voice';
        },
      ],
      [
        'voice.maxGap',
        'at most three',
        (o) => {
          (o.voice as Record<string, unknown>).maxGap = 30;
        },
      ],
      [
        'maxWords',
        "never above the gate's own",
        (o) => {
          o.maxWords = 99;
        },
      ],
      [
        'window',
        'at least one',
        (o) => {
          o.window = 0;
        },
      ],
      [
        'cadence',
        'above nothing',
        (o) => {
          o.cadence = 0;
        },
      ],
    ];
    for (const [key, rule, break_] of bounds) {
      const bad = clone();
      break_(bad);
      let message = '';
      try {
        loadPersonas(bad);
      } catch (err) {
        message = err instanceof Error ? err.message : String(err);
      }
      expect(message, key).toContain(`personas.json: ${key}`);
      expect(message, key).toContain(rule);
    }
  });
});

/** The voice sheet of one boss in a cloned file, for a test that breaks one bound. */
function voiceOf(o: Record<string, unknown>, kind: string): Record<string, unknown> {
  const boss = o.boss as Record<string, Record<string, unknown>>;
  return boss[kind]!.voice as Record<string, unknown>;
}
