// The pools that land against a request are drawn blind: the agent's reply
// to an ask, its line at the ship, its answer to a check-in, and the user's
// check-ins, creeps and generic reviews are picked by the seed with no
// knowledge of what was asked. A line in one of them that names a piece
// ("the greeting is almost ready", "giving every button a blanket") is
// therefore nonsense against most requests, and the Director read it as
// such on the published 0.11.0. The rule is mechanical now: none of these
// pools may name a piece. The reactions by topic and the reviews by product
// are keyed to what shipped and may name it; the per-snippet asks describe
// their own code.
import { describe, expect, it } from 'vitest';

import { DEFAULT_PATTERNS } from '../src/patterns';

/** Things a request might build. A blind line may not name one. */
const PIECES = [
  'greeting',
  'button',
  'table',
  'list',
  'chart',
  'background',
  'image',
  'picture',
  'card',
  'header',
  'footer',
  'badge',
  'slider',
  'clock',
  'countdown',
  'menu',
  'grid',
  'stepper',
  'avatar',
  'banner',
  'picker',
  'frame',
  'layer',
  'border',
  'font',
  'heading',
  'link',
  'icon',
  'margin',
  'row',
  'rows',
  'column',
  'form',
  'screen',
  'sidebar',
  'tooltip',
  'spinner',
  'dashboard',
  'radio',
  'checkbox',
  'input',
  'label',
  'email',
  'login',
  'search',
  'profile',
  'page',
  'map',
  'calendar',
  'timer',
  'progress',
  'ducks',
  'duck',
  'yogurt',
  'fridge',
  'toaster',
  'door',
  'hat',
  'bonnet',
  'sock',
  'socks',
];

const PIECE = new RegExp(`\\b(${PIECES.join('|')})\\b`, 'i');

const BLIND: Record<string, readonly string[]> = {
  'agent.replies': DEFAULT_PATTERNS.agent.replies,
  'agent.ships': DEFAULT_PATTERNS.agent.ships,
  'agent.nagReplies': DEFAULT_PATTERNS.agent.nagReplies,
  'user.nags': DEFAULT_PATTERNS.user.nags,
  'user.creeps': DEFAULT_PATTERNS.user.creeps,
  'user.reviews': DEFAULT_PATTERNS.user.reviews,
};

describe('the pools that are drawn blind', () => {
  for (const [name, pool] of Object.entries(BLIND)) {
    it(`${name} names no piece the request did not ask for`, () => {
      const bad = pool.filter((line) => PIECE.test(line));
      expect(bad, `${name} carries a piece:\n${bad.join('\n')}`).toEqual([]);
    });
  }

  it('the rule catches the lines the Director read', () => {
    expect(PIECE.test('You are absolutely right, it should hum a tune.')).toBe(false);
    expect(PIECE.test('Happy to, the greeting is almost ready.')).toBe(true);
    expect(PIECE.test('On it, giving every button a blanket.')).toBe(true);
    expect(PIECE.test('is the greeting ready')).toBe(true);
  });
});
