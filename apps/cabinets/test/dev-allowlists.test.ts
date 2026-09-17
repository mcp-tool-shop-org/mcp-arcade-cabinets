// The dev server's proxy allowlist, read by something at last.
//
// `vite.config.ts` carries a comment saying to keep its table in step with
// `packages/launcher/src/allow.ts`, and the launcher's copy has a test behind
// every rule while this one had nothing reading it at all — so the half that
// stops a browser POSTing /ollama/api/pull or /api/delete through the dev
// proxy could drift out of step and nothing would fail. Two things are
// asserted here: the table itself, so a rule cannot be loosened quietly, and
// that the two copies agree path for path, so a path added to one and not the
// other is a red test rather than a route that works in dev and 404s for a
// player.

import { describe, expect, it } from 'vitest';

import { allowed, upstreamFor } from '../../../packages/launcher/src/allow';
import {
  DEV_PREFIXES,
  devAllowed,
  devUpstreamFor,
  parseEndlessView,
  parseSeatView,
  pathOnly,
  restAfter,
} from '../vite.config';

/** Every method and path either copy is asked about, in one place. */
const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'];
const PATHS = [
  '/api/tags',
  '/api/chat',
  '/api/generate',
  '/api/pull',
  '/api/push',
  '/api/create',
  '/api/delete',
  '/api/copy',
  '/api/embeddings',
  '/api/blobs/sha256:00',
  '/health',
  '/stats',
  '/speak',
  '/speak/now',
  '/audio/0123abcd.wav',
  '/audio/0123ABCD9876FEDC.wav',
  '/audio/0123abc.wav',
  '/audio/report.wav',
  '/audio/0123abcd.mp3',
  '/audio/../../etc/passwd',
  '/audio/',
  '/',
];

describe('the dev server routes only the two proxied prefixes', () => {
  it('names the same prefixes the launcher does', () => {
    expect(DEV_PREFIXES).toEqual({ ollama: '/ollama', voice: '/voice' });
    expect(devUpstreamFor('/ollama/api/tags')).toBe('ollama');
    expect(devUpstreamFor('/voice/health')).toBe('voice');
    expect(devUpstreamFor('/sprites/answer.png')).toBeNull();
    // A prefix is a path segment, not a string prefix.
    expect(devUpstreamFor('/ollamafoo')).toBeNull();
    expect(devUpstreamFor('/voiced/thing')).toBeNull();
  });

  it('strips the query before routing and the prefix before proxying', () => {
    expect(pathOnly('/ollama/api/tags?x=1')).toBe('/ollama/api/tags');
    expect(restAfter('/ollama', '/ollama/api/chat?stream=false')).toBe('/api/chat');
    expect(restAfter('/ollama', '/ollama')).toBe('/');
    expect(restAfter('/voice', '/voice/audio/abc12345.wav')).toBe('/audio/abc12345.wav');
  });
});

describe('the dev server lets through exactly what the shell calls', () => {
  it('opens the three the daemon is asked for and nothing else', () => {
    expect(devAllowed('ollama', 'GET', '/api/tags')).toBe(true);
    expect(devAllowed('ollama', 'POST', '/api/chat')).toBe(true);
    expect(devAllowed('ollama', 'POST', '/api/generate')).toBe(true);
    // The methods are not interchangeable.
    expect(devAllowed('ollama', 'POST', '/api/tags')).toBe(false);
    expect(devAllowed('ollama', 'GET', '/api/chat')).toBe(false);
  });

  it('refuses every way to make the daemon do work', () => {
    for (const rest of [
      '/api/pull',
      '/api/push',
      '/api/create',
      '/api/delete',
      '/api/copy',
      '/api/embeddings',
      '/api/blobs/sha256:00',
      '/',
    ]) {
      for (const method of METHODS) {
        expect(devAllowed('ollama', method, rest), `${method} ${rest}`).toBe(false);
      }
    }
  });

  it('opens the worker only for its health, its stats, a take and a hash-named wav', () => {
    expect(devAllowed('voice', 'GET', '/health')).toBe(true);
    expect(devAllowed('voice', 'GET', '/stats')).toBe(true);
    expect(devAllowed('voice', 'POST', '/speak')).toBe(true);
    expect(devAllowed('voice', 'GET', '/audio/0123abcd.wav')).toBe(true);
    for (const rest of [
      '/audio/../../etc/passwd',
      '/audio/report.wav',
      '/audio/0123abc.wav',
      '/audio/0123abcd.mp3',
      '/audio/',
      '/speak/now',
    ]) {
      expect(devAllowed('voice', 'GET', rest), rest).toBe(false);
    }
    expect(devAllowed('voice', 'DELETE', '/audio/0123abcd.wav')).toBe(false);
  });
});

describe('the dev server and the launcher say the same thing', () => {
  it('agrees on every method and path either one is asked about', () => {
    for (const up of ['ollama', 'voice'] as const) {
      for (const method of METHODS) {
        for (const rest of PATHS) {
          expect(devAllowed(up, method, rest), `${up} ${method} ${rest}`).toBe(
            allowed(up, method, rest),
          );
        }
      }
    }
  });

  it('routes the same prefixes and leaves the node-side seats alone', () => {
    for (const url of [
      '/ollama',
      '/ollama/api/tags',
      '/voice',
      '/voice/health',
      '/cabinet/say',
      '/cabinet/endless',
      '/sprites/answer.png',
      '/',
    ]) {
      expect(devUpstreamFor(url), url).toBe(upstreamFor(url));
    }
  });
});

describe('the two request parsers the browser posts through', () => {
  it('takes a fact-blind boss view and refuses anything outside the closed sets', () => {
    const view = {
      kind: 'menu',
      hp: 'mid',
      column: 'left',
      stick: 'still',
      motion: 'drifting',
      wave: 'inspect',
    };
    expect(parseSeatView(view)).toEqual(view);
    expect(parseSeatView({ ...view, kind: 'archivist' })).not.toBeNull();
    expect(parseSeatView({ ...view, kind: 'nobody' })).toBeNull();
    expect(parseSeatView({ ...view, hp: 'half' })).toBeNull();
    expect(parseSeatView({ ...view, wave: 'lies' })).toBeNull();
    expect(parseSeatView(null)).toBeNull();
    // Free text is cut, never trusted whole.
    expect(parseSeatView({ ...view, motion: 'x'.repeat(200) })?.motion).toHaveLength(80);
  });

  it('takes a level view, holds the band to the levers and cuts every length', () => {
    const view = {
      product: 'a ledger',
      stack: 'sql',
      bandMin: 2,
      bandMax: 4,
      recent: ['one', 'two', 'three', 'four', 'five'],
      weak: ['th', 'qu'],
      newLevel: true,
    };
    const read = parseEndlessView(view);
    expect(read?.stack).toBe('sql');
    // Three asks at most reach the seat, however many the browser posts.
    expect(read?.recent).toHaveLength(3);
    expect(parseEndlessView({ ...view, stack: 'rust' })).toBeNull();
    expect(parseEndlessView({ ...view, bandMin: 4, bandMax: 2 })).toBeNull();
    expect(parseEndlessView({ ...view, bandMin: 0 })).toBeNull();
    expect(parseEndlessView({ ...view, product: '  ' })).toBeNull();
    expect(parseEndlessView(null)).toBeNull();
  });
});
