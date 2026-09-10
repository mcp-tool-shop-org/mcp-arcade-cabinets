import { describe, expect, it } from 'vitest';

import {
  columnWord,
  defaultPilotModel,
  hpWord,
  isCloudModel,
  listPilotModels,
  parseIntent,
  pilotPrompt,
  type BossView,
} from '../src/pilot';

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
    expect(parseIntent('thinking about the ship\n\ncolumn')).toBe('column');
  });

  it('lists cloud models first and skips graders, embeds and fine-tunes', () => {
    const names = [
      'qwen2.5:7b-instruct',
      'nomic-embed-text:latest',
      'gpt-oss:120b-cloud',
      'jam-ft-b2-qwen25:seed42',
      'ai-jam-grader-7b:latest',
      'translategemma:27b',
      'minimax-m3:cloud',
    ];
    const listed = listPilotModels(names);
    expect(listed.filter((n) => isCloudModel(n)).sort()).toEqual([
      'gpt-oss:120b-cloud',
      'minimax-m3:cloud',
    ]);
    expect(isCloudModel(listed[0] ?? '')).toBe(true);
    expect(listed[listed.length - 1]).toBe('qwen2.5:7b-instruct');
    expect(listed).toHaveLength(3);
    expect(defaultPilotModel(names)).toBe('gpt-oss:120b-cloud');
    expect(defaultPilotModel(['qwen2.5:7b-instruct'])).toBe('qwen2.5:7b-instruct');
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
