import { describe, expect, it } from 'vitest';

import { columnWord, hpWord, parseIntent, pilotPrompt, type BossView } from '../src/pilot';

const FORBIDDEN =
  /\d|\b(lie|fact|revealed|followed|held|score|pass|fail|nrp|integrity|utility|cleared|ghost)\b/i;

describe('ollama boss pilot', () => {
  it('builds the same prompt whether a wave had a lie', () => {
    const view: BossView = {
      kind: 'whisperer',
      hp: 'mid',
      column: 'center',
      motion: 'fight',
    };
    const a = pilotPrompt(view);
    const b = pilotPrompt({ ...view });
    expect(a).toBe(b);
    expect(a).not.toMatch(FORBIDDEN);
    expect(a).toMatch(/whisperer/);
    expect(a).toMatch(/one word/);
  });

  it('parses a one-word intent and falls back to script', () => {
    expect(parseIntent('spread\nI will fan')).toBe('spread');
    expect(parseIntent('PLATE')).toBe('plate');
    expect(parseIntent('please explode')).toBe('script');
  });

  it('names hp and column without digits', () => {
    expect(hpWord(8, 8)).toBe('high');
    expect(hpWord(4, 8)).toBe('mid');
    expect(hpWord(1, 8)).toBe('low');
    expect(columnWord(20, 480)).toBe('left');
    expect(columnWord(240, 480)).toBe('center');
    expect(columnWord(400, 480)).toBe('right');
  });
});
