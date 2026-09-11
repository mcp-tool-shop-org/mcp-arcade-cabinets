import { describe, expect, it } from 'vitest';

import { FORBIDDEN } from '../src/gate';
import { DEFAULT_PERSONAS, loadPersonas } from '../src/personas';

function clone(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(DEFAULT_PERSONAS)) as Record<string, unknown>;
}

describe('personas.json', () => {
  it('loads the shipped sheets, one per boss kind, with no forbidden word anywhere', () => {
    const p = loadPersonas(clone());
    expect(p).toEqual(DEFAULT_PERSONAS);
    for (const kind of ['whisperer', 'menu', 'doorman'] as const) {
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
    const presets = new Set(Object.values(p.boss).map((b) => b.voice.preset));
    expect(presets.size).toBe(3);
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
