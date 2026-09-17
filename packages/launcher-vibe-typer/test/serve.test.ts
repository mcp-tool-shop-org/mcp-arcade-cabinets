// What `@mcptoolshop/vibe-typer` actually serves.
//
// The server is the launcher's, and `packages/launcher/test/serve.test.ts`
// tests it as a server. This file tests the shape THIS package stands it up
// in, which is the thing the split introduced and the thing a reviewer of
// one package cannot see from the other: the typing cabinet's own files are
// served, the shooter's are not there to be served, `/voice` is proxied to
// the worker on the same allowlist the shooter's package uses (slice 4C), and
// the climb out of the shell directory is refused exactly as it is in the
// other package.

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import { createServer } from 'node:http';
import { connect } from 'node:net';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createCabinetServer, DARK, listenFrom } from '../../launcher/src/serve';

/**
 * `fetch` resolves `/../x` against the origin before it ever opens a
 * socket, so it cannot ask the question a traversal attempt asks. This
 * writes the request line by hand.
 */
function rawGet(port: number, line: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = connect(port, '127.0.0.1', () => {
      // The Host carries the port, because that is what a browser sends and
      // because the server checks it before it routes anything.
      socket.write(`GET ${line} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nConnection: close\r\n\r\n`);
    });
    const chunks: Buffer[] = [];
    socket.on('data', (c: Buffer) => chunks.push(c));
    socket.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    socket.on('error', reject);
    socket.setTimeout(5000, () => {
      socket.destroy();
      reject(new Error('timeout'));
    });
  });
}

/** Everything outside the shell that a climb could reach. */
let outside: string;
let play: string;
let cabinet: Server;
let base: string;

/** A stand-in daemon: says what it was asked, so a leak is visible. */
let upstream: Server;
let upstreamBase: string;
const seen: { method: string; url: string; auth: string | null }[] = [];

beforeAll(async () => {
  outside = await mkdtemp(path.join(os.tmpdir(), 'vibe-root-'));
  play = path.join(outside, 'play');
  // What the Vibe package's pack copies: the keyboard sets and the frames.
  // `sprites/` is Ghost's and is deliberately not made here — the 404 below
  // is the whole point of the split.
  await mkdir(path.join(play, 'keys', 'mechanical'), { recursive: true });
  await mkdir(path.join(play, 'vibe', 'frames'), { recursive: true });
  await writeFile(path.join(play, 'index.html'), '<!doctype html><title>cabinet</title>', 'utf8');
  await writeFile(path.join(play, 'keys', 'mechanical', 'a.wav'), Buffer.from([0x52, 0x49]));
  await writeFile(
    path.join(play, 'vibe', 'frames', 'terminal.png'),
    Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  );
  await writeFile(path.join(outside, 'secret.txt'), 'not for the browser', 'utf8');

  upstream = createServer((req, res) => {
    seen.push({
      method: req.method ?? '',
      url: req.url ?? '',
      auth: (req.headers.authorization as string | undefined) ?? null,
    });
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ reached: req.url }));
  });
  const upPort = await listenFrom(upstream, 24_511);
  upstreamBase = `http://127.0.0.1:${upPort}`;

  // Exactly what `src/cli.ts` builds: no say seat, no key, and the voice
  // worker pointed at the same stand-in so a leak past the allowlist shows.
  cabinet = createCabinetServer({
    playDir: play,
    // `DARK`, exactly as `src/cli.ts` passes it: this cabinet has no say
    // seat. The endless module is null here and a path in the package, which
    // is the other case -- a bundle that was expected on disk.
    sayModule: DARK,
    endlessModule: null,
    ollamaUrl: upstreamBase,
    voiceUrl: upstreamBase,
    voiceToken: 'a-bearer-the-page-never-sees',
    anthropicKey: null,
  });
  const port = await listenFrom(cabinet, 24_611);
  base = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((r) => cabinet.close(() => r()));
  await new Promise<void>((r) => upstream.close(() => r()));
  await rm(outside, { recursive: true, force: true });
});

describe('the vibe-typer package as it is served', () => {
  it('serves the shell at the root', async () => {
    const res = await fetch(`${base}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(await res.text()).toContain('cabinet');
  });

  it('serves a keyboard sample with its own type and no cache', async () => {
    const res = await fetch(`${base}/keys/mechanical/a.wav`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('audio/wav');
    expect(res.headers.get('cache-control')).toBe('no-cache');
  });

  it('serves a device frame', async () => {
    const res = await fetch(`${base}/vibe/frames/terminal.png`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
  });

  it('404s the other cabinet, which this package does not carry', async () => {
    for (const ghost of ['/sprites/answer.png', '/tracks/menu.mp3']) {
      const res = await fetch(`${base}${ghost}`);
      expect(res.status, ghost).toBe(404);
    }
  });

  it('refuses to climb out of the shell directory', async () => {
    const port = (cabinet.address() as { port: number }).port;
    for (const bad of [
      '/../secret.txt',
      '/%2e%2e%2fsecret.txt',
      '/keys/../../secret.txt',
      '/..%2fsecret.txt',
      '/..%5csecret.txt',
      '/keys/..%2f..%2fsecret.txt',
    ]) {
      const raw = await rawGet(port, bad);
      expect(raw, bad).not.toContain('not for the browser');
      expect(raw.split('\r\n')[0], bad).toMatch(/^HTTP\/1\.1 404 /);
    }
  });

  it('serves a path that only looks like a climb but lands inside', async () => {
    const port = (cabinet.address() as { port: number }).port;
    const raw = await rawGet(port, '/keys/../index.html');
    expect(raw.split('\r\n')[0]).toMatch(/^HTTP\/1\.1 200 /);
    expect(raw).toContain('cabinet');
  });

  it('answers a write to a file path with 405, never a write', async () => {
    const res = await fetch(`${base}/index.html`, { method: 'PUT', body: 'x' });
    expect(res.status).toBe(405);
  });

  it('passes the daemon calls the cabinet makes, and nothing else', async () => {
    seen.length = 0;
    const tags = await fetch(`${base}/ollama/api/tags`);
    expect(tags.status).toBe(200);
    for (const bad of ['/ollama/api/pull', '/ollama/api/delete', '/ollama/api/create']) {
      const res = await fetch(`${base}${bad}`, { method: 'POST' });
      // Not 404: a verb off the allowlist and a file that is not in the
      // shell used to share one word, and they are two different fixes.
      expect(res.status, bad).toBe(403);
      expect(await res.json(), bad).toEqual({ error: 'not proxied' });
    }
    expect(seen.map((s) => `${s.method} ${s.url}`)).toEqual(['GET /api/tags']);
  });

  it('passes the worker calls the voice makes, and adds the bearer here', async () => {
    seen.length = 0;
    for (const voice of ['/voice/health', '/voice/stats', '/voice/audio/0123abcd.wav']) {
      const res = await fetch(`${base}${voice}`);
      expect(res.status, voice).toBe(200);
    }
    const speak = await fetch(`${base}/voice/speak`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    expect(speak.status).toBe(200);
    expect(seen.map((s) => `${s.method} ${s.url}`)).toEqual([
      'GET /health',
      'GET /stats',
      'GET /audio/0123abcd.wav',
      'POST /speak',
    ]);
    // The bearer is the server's, never the page's.
    expect(seen.every((s) => s.auth === 'Bearer a-bearer-the-page-never-sees')).toBe(true);
  });

  it('refuses everything on the worker that is off the allowlist', async () => {
    seen.length = 0;
    // `fetch` resolves the climb against the origin before it opens a
    // socket, so this one never reaches the `/voice` prefix at all: it
    // arrives as `/secret.txt`, which is a file the shell does not have.
    const climb = await fetch(`${base}/voice/audio/../../secret.txt`);
    expect(climb.status).toBe(404);
    for (const bad of ['/voice/voices', '/voice/audio/x.wav']) {
      const res = await fetch(`${base}${bad}`);
      expect(res.status, bad).toBe(403);
      expect(await res.json(), bad).toEqual({ error: 'not proxied' });
    }
    for (const bad of ['/voice/health', '/voice/stats']) {
      const res = await fetch(`${base}${bad}`, { method: 'POST', body: '{}' });
      expect(res.status, bad).toBe(403);
    }
    expect(seen).toEqual([]);
  });

  it('has no say seat: the shooter asks, this cabinet does not', async () => {
    const res = await fetch(`${base}/cabinet/say`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ view: {} }),
    });
    // 404, not 503: the seat is dark by design and there is nothing to
    // rebuild. Anyone probing this package used to be told it was broken.
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: 'no such seat',
      hint: 'this cabinet does not light the say seat',
    });
  });

  it('answers the endless route rather than 404ing it', async () => {
    const get = await fetch(`${base}/cabinet/endless`);
    expect(get.status).toBe(405);
    const plain = await fetch(`${base}/cabinet/endless`, { method: 'POST', body: 'x' });
    expect(plain.status).toBe(415);
    // With no bundle beside this test the route says so; in the package the
    // module is there and the seat answers. Either way it is not a 404.
    const posted = await fetch(`${base}/cabinet/endless`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ view: {} }),
    });
    // The bundle is not beside this test, which is the broken-install case
    // and keeps its 503 -- the seat itself is one this cabinet does light.
    expect(posted.status).toBe(503);
    expect(await posted.json()).toEqual({
      error: 'no cabinet server built',
      hint: 'this package is missing dist/cabinet-server.js',
    });
  });
});
