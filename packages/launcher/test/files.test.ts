import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
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

  // The check is lexical, and this is the case that says so out loud. A link
  // inside the served tree that points outside it resolves to a name under
  // the root, so `resolveUnder` keeps it and the file behind it is served.
  // That is the decision the doc comment now states: the served tree comes
  // out of `scripts/build.mjs` and an npm tarball, neither of which carries
  // links. Pinning it here means a change of mind has to change this case
  // rather than happen quietly.
  it('follows a link planted inside the tree, because the check is on the name', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'ghost-link-'));
    try {
      const root = path.join(dir, 'play');
      await mkdir(root, { recursive: true });
      await writeFile(path.join(dir, 'secret.txt'), 'not for the browser', 'utf8');
      const link = path.join(root, 'secret.txt');
      try {
        await symlink(path.join(dir, 'secret.txt'), link, 'file');
      } catch {
        // Windows without developer mode refuses to make one at all, which
        // is its own answer to the question this case asks.
        return;
      }
      expect(resolveUnder(root, '/secret.txt')).toBe(link);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
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
