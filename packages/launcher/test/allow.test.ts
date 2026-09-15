import { describe, expect, it } from 'vitest';

import { allowed, pathOnly, PREFIXES, restAfter, SAY_PATH, upstreamFor } from '../src/allow';

describe('the launcher allowlists', () => {
  it('routes only the two proxied prefixes', () => {
    expect(upstreamFor('/ollama/api/tags')).toBe('ollama');
    expect(upstreamFor('/ollama')).toBe('ollama');
    expect(upstreamFor('/voice/health')).toBe('voice');
    expect(upstreamFor('/sprites/answer.png')).toBeNull();
    expect(upstreamFor('/')).toBeNull();
    // A prefix is a path segment, not a string prefix.
    expect(upstreamFor('/ollamafoo')).toBeNull();
    expect(upstreamFor('/voiced/thing')).toBeNull();
  });

  it('strips the query before routing and the prefix before proxying', () => {
    expect(pathOnly('/ollama/api/tags?x=1')).toBe('/ollama/api/tags');
    expect(restAfter(PREFIXES.ollama, '/ollama/api/chat?stream=false')).toBe('/api/chat');
    expect(restAfter(PREFIXES.ollama, '/ollama')).toBe('/');
    expect(restAfter(PREFIXES.voice, '/voice/audio/abc12345.wav')).toBe('/audio/abc12345.wav');
  });

  it('lets through exactly what the shell calls on the daemon', () => {
    expect(allowed('ollama', 'GET', '/api/tags')).toBe(true);
    expect(allowed('ollama', 'POST', '/api/chat')).toBe(true);
    // The methods are not interchangeable.
    expect(allowed('ollama', 'POST', '/api/tags')).toBe(false);
    expect(allowed('ollama', 'GET', '/api/chat')).toBe(false);
  });

  it('refuses every way to make the daemon do work', () => {
    for (const rest of [
      '/api/pull',
      '/api/push',
      '/api/create',
      '/api/delete',
      '/api/copy',
      '/api/generate',
      '/api/embeddings',
      '/api/blobs/sha256:00',
      '/',
    ]) {
      expect(allowed('ollama', 'GET', rest), rest).toBe(false);
      expect(allowed('ollama', 'POST', rest), rest).toBe(false);
      expect(allowed('ollama', 'DELETE', rest), rest).toBe(false);
    }
  });

  it('lets through exactly what the shell calls on the voice worker', () => {
    expect(allowed('voice', 'GET', '/health')).toBe(true);
    expect(allowed('voice', 'GET', '/stats')).toBe(true);
    expect(allowed('voice', 'POST', '/speak')).toBe(true);
    expect(allowed('voice', 'GET', '/audio/0123abcd.wav')).toBe(true);
    expect(allowed('voice', 'GET', '/audio/0123ABCD9876FEDC.wav')).toBe(true);
  });

  it('refuses a take that is not a hash-named wav', () => {
    for (const rest of [
      '/audio/../../etc/passwd',
      '/audio/report.wav',
      '/audio/0123abc.wav', // seven, under the floor of eight
      '/audio/0123abcd.mp3',
      '/audio/0123abcd.wav/extra',
      '/audio/',
      '/speak/now',
    ]) {
      expect(allowed('voice', 'GET', rest), rest).toBe(false);
    }
    expect(allowed('voice', 'DELETE', '/audio/0123abcd.wav')).toBe(false);
  });

  it('names the say route as this process, not a proxy', () => {
    expect(SAY_PATH).toBe('/cabinet/say');
    expect(upstreamFor(SAY_PATH)).toBeNull();
  });
});
