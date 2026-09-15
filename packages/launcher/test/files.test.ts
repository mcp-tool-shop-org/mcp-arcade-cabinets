import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveUnder, typeFor } from '../src/files';

const ROOT = path.resolve('/tmp/play-root');

describe('resolving a request to a file in the shell', () => {
  it('serves index.html for the root and for a bare directory name', () => {
    expect(resolveUnder(ROOT, '/')).toBe(path.join(ROOT, 'index.html'));
    expect(resolveUnder(ROOT, '')).toBe(path.join(ROOT, 'index.html'));
  });

  it('resolves the files the shell actually asks for', () => {
    expect(resolveUnder(ROOT, '/sprites/answer.png')).toBe(
      path.join(ROOT, 'sprites', 'answer.png'),
    );
    expect(resolveUnder(ROOT, '/tracks/menu.mp3')).toBe(path.join(ROOT, 'tracks', 'menu.mp3'));
    expect(resolveUnder(ROOT, '/assets/index-sm2jKTwd.js')).toBe(
      path.join(ROOT, 'assets', 'index-sm2jKTwd.js'),
    );
  });

  it('refuses every path that climbs out of the root', () => {
    for (const bad of [
      '/../secrets',
      '/../../etc/passwd',
      '/sprites/../../../etc/passwd',
      '/%2e%2e/secrets',
      '/%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '/..%2fsecrets',
    ]) {
      expect(resolveUnder(ROOT, bad), bad).toBeNull();
    }
  });

  it('refuses a backslash, which escapes the root on Windows', () => {
    expect(resolveUnder(ROOT, '/..\\secrets')).toBeNull();
    expect(resolveUnder(ROOT, '/sprites\\..\\..\\secrets')).toBeNull();
    expect(resolveUnder(ROOT, '/%5c..%5csecrets')).toBeNull();
  });

  it('refuses a NUL and an undecodable escape rather than passing them on', () => {
    expect(resolveUnder(ROOT, '/index.html%00.png')).toBeNull();
    expect(resolveUnder(ROOT, '/%zz')).toBeNull();
    expect(resolveUnder(ROOT, '/%E0%A4%A')).toBeNull();
  });

  it('keeps a path that merely looks like a climb but lands inside', () => {
    expect(resolveUnder(ROOT, '/sprites/../index.html')).toBe(path.join(ROOT, 'index.html'));
    expect(resolveUnder(ROOT, '/a/b/../../tracks/menu.mp3')).toBe(
      path.join(ROOT, 'tracks', 'menu.mp3'),
    );
  });

  it('names the types the shell ships and nothing louder for the rest', () => {
    expect(typeFor('/x/index.html')).toBe('text/html; charset=utf-8');
    expect(typeFor('/x/app.js')).toBe('text/javascript; charset=utf-8');
    expect(typeFor('/x/answer.PNG')).toBe('image/png');
    expect(typeFor('/x/menu.mp3')).toBe('audio/mpeg');
    expect(typeFor('/x/take.wav')).toBe('audio/wav');
    expect(typeFor('/x/thing.bin')).toBe('application/octet-stream');
    expect(typeFor('/x/noext')).toBe('application/octet-stream');
  });
});
