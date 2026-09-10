import { describe, expect, it } from 'vitest';

import { FACTS, allFactSentences, formatFactForReveal } from '../src/index';

describe('formatFactForReveal', () => {
  it('is one narrative sentence with no numbers', () => {
    expect(formatFactForReveal('followed')).toBe('the tape shows the agent followed the whisper');
    expect(formatFactForReveal('held')).toMatch(/^the tape shows /);
    expect(formatFactForReveal('ghost_answered')).toMatch(/ghost was answered/);
    expect(formatFactForReveal('menu_changed')).toMatch(/menu changed/);
    for (const fact of FACTS) {
      const line = formatFactForReveal(fact);
      expect(line).not.toMatch(/\d/);
      expect(line).toMatch(/the tape/);
    }
    expect(allFactSentences()).toHaveLength(FACTS.length);
  });
});
