import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import { createServer } from 'node:http';
import { connect } from 'node:net';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  createCabinetServer,
  listenFrom,
  parseEndlessView,
  parseSeatView,
  parseStrings,
} from '../src/serve';

/**
 * `fetch` resolves `/../x` against the origin before it ever opens a
 * socket, so it cannot ask the question a traversal attempt asks. This
 * writes the request line by hand.
 */
function rawGet(port: number, line: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = connect(port, '127.0.0.1', () => {
      socket.write(`GET ${line} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n`);
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
  outside = await mkdtemp(path.join(os.tmpdir(), 'ghost-root-'));
  // The shell is a directory inside the package; the secret stands in for
  // everything else on the player's disk, one level up from it.
  play = path.join(outside, 'play');
  await mkdir(path.join(play, 'sprites'), { recursive: true });
  await writeFile(path.join(play, 'index.html'), '<!doctype html><title>cabinet</title>', 'utf8');
  await writeFile(path.join(play, 'sprites', 'answer.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
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
  const upPort = await listenFrom(upstream, 24_311);
  upstreamBase = `http://127.0.0.1:${upPort}`;

  cabinet = createCabinetServer({
    playDir: play,
    sayModule: null,
    ollamaUrl: upstreamBase,
    voiceUrl: upstreamBase,
    voiceToken: 'worker-bearer',
    anthropicKey: null,
  });
  const port = await listenFrom(cabinet, 24_411);
  base = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((r) => cabinet.close(() => r()));
  await new Promise<void>((r) => upstream.close(() => r()));
  await rm(outside, { recursive: true, force: true });
});

describe('the launcher server', () => {
  it('serves the shell at the root', async () => {
    const res = await fetch(`${base}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(await res.text()).toContain('cabinet');
  });

  it('serves the sprites with their own type and no cache', async () => {
    const res = await fetch(`${base}/sprites/answer.png`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('cache-control')).toBe('no-cache');
  });

  it('404s a file that is not there', async () => {
    const res = await fetch(`${base}/sprites/nothing.png`);
    expect(res.status).toBe(404);
  });

  it('refuses to climb out of the shell directory', async () => {
    const port = (cabinet.address() as { port: number }).port;
    for (const bad of [
      '/../secret.txt',
      '/%2e%2e%2fsecret.txt',
      '/sprites/../../secret.txt',
      '/..%2fsecret.txt',
      '/..%5csecret.txt',
      '/sprites/..%2f..%2fsecret.txt',
    ]) {
      const raw = await rawGet(port, bad);
      expect(raw, bad).not.toContain('not for the browser');
      expect(raw.split('\r\n')[0], bad).toMatch(/^HTTP\/1\.1 404 /);
    }
  });

  it('serves a path that only looks like a climb but lands inside', async () => {
    const port = (cabinet.address() as { port: number }).port;
    const raw = await rawGet(port, '/sprites/../index.html');
    expect(raw.split('\r\n')[0]).toMatch(/^HTTP\/1\.1 200 /);
    expect(raw).toContain('cabinet');
  });

  it('answers a write to a file path with 405, never a write', async () => {
    const res = await fetch(`${base}/index.html`, { method: 'PUT', body: 'x' });
    expect(res.status).toBe(405);
  });

  it('passes the three allowlisted daemon calls through', async () => {
    seen.length = 0;
    const tags = await fetch(`${base}/ollama/api/tags`);
    expect(tags.status).toBe(200);
    const chat = await fetch(`${base}/ollama/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'x', messages: [] }),
    });
    expect(chat.status).toBe(200);
    const gen = await fetch(`${base}/ollama/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'x', prompt: 'hold' }),
    });
    expect(gen.status).toBe(200);
    expect(seen.map((s) => `${s.method} ${s.url}`)).toEqual([
      'GET /api/tags',
      'POST /api/chat',
      'POST /api/generate',
    ]);
  });

  it('never opens a socket for a daemon path outside the allowlist', async () => {
    seen.length = 0;
    for (const bad of ['/ollama/api/pull', '/ollama/api/delete', '/ollama/api/create']) {
      const res = await fetch(`${base}${bad}`, { method: 'POST' });
      expect(res.status, bad).toBe(404);
    }
    const tagsByPost = await fetch(`${base}/ollama/api/tags`, { method: 'POST' });
    expect(tagsByPost.status).toBe(404);
    expect(seen).toEqual([]);
  });

  it('adds the worker bearer on the node side and never to the daemon', async () => {
    seen.length = 0;
    await fetch(`${base}/voice/health`);
    await fetch(`${base}/ollama/api/tags`);
    expect(seen[0]?.auth).toBe('Bearer worker-bearer');
    expect(seen[1]?.auth).toBeNull();
  });

  it('passes a cached take but not an arbitrary worker path', async () => {
    seen.length = 0;
    const take = await fetch(`${base}/voice/audio/0123abcd.wav`);
    expect(take.status).toBe(200);
    const nope = await fetch(`${base}/voice/audio/report.wav`);
    expect(nope.status).toBe(404);
    expect(seen).toHaveLength(1);
  });

  it('keeps the query on the way to the upstream', async () => {
    seen.length = 0;
    await fetch(`${base}/ollama/api/tags?verbose=1`);
    expect(seen[0]?.url).toBe('/api/tags?verbose=1');
  });

  it('refuses a say that is not a posted json view', async () => {
    const get = await fetch(`${base}/cabinet/say`);
    expect(get.status).toBe(405);
    const plain = await fetch(`${base}/cabinet/say`, { method: 'POST', body: 'x' });
    expect(plain.status).toBe(415);
  });

  it('says so when the package has no cabinet server rather than hanging', async () => {
    const res = await fetch(`${base}/cabinet/say`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ view: {} }),
    });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'no cabinet server built' });
  });
});

describe('what the say route will accept as a view', () => {
  const good = {
    kind: 'menu',
    hp: 'mid',
    column: 'left',
    stick: 'still',
    motion: 'leaning',
    wave: 'poison',
  };

  it('takes a complete fact-blind view', () => {
    expect(parseSeatView(good)).toEqual(good);
  });

  it('takes the Archivist, the fourth boss kind', () => {
    expect(parseSeatView({ ...good, kind: 'archivist', wave: 'inspect' })).toEqual({
      ...good,
      kind: 'archivist',
      wave: 'inspect',
    });
  });

  it('refuses a view with a word outside the closed set', () => {
    expect(parseSeatView({ ...good, kind: 'oracle' })).toBeNull();
    expect(parseSeatView({ ...good, hp: '40' })).toBeNull();
    expect(parseSeatView({ ...good, wave: 'shift' })).toBeNull();
    expect(parseSeatView({ ...good, motion: 7 })).toBeNull();
    expect(parseSeatView(null)).toBeNull();
    expect(parseSeatView('menu')).toBeNull();
  });

  it('caps the one free-text word so a prompt cannot be smuggled in it', () => {
    const long = parseSeatView({ ...good, motion: 'x'.repeat(500) });
    expect(long?.motion).toHaveLength(80);
  });

  it('bounds the recent lines by count and by length', () => {
    expect(parseStrings(['a', 'b', 'c'], 2, 10)).toEqual(['a', 'b']);
    expect(parseStrings(['x'.repeat(50)], 5, 4)).toEqual(['xxxx']);
    expect(parseStrings(['ok', 7, null, 'two'], 5, 10)).toEqual(['ok', 'two']);
    expect(parseStrings('not a list', 5, 10)).toEqual([]);
  });
});

// ——— the endless seat's route (G28 as slice 3 amends it) ————————————————————
//
// The typing cabinet posts the level it is about to play; this process asks
// the seated model for the request the player will type. Same envelope as
// the say route: post only, json only, a size cap, a minimum interval, and
// words rather than a status code when the seat has nothing.

describe('what the endless route will accept as a view', () => {
  const good = {
    product: 'a diary for houseplants',
    stack: 'python',
    bandMin: 1,
    bandMax: 2,
    recent: ['can you make the list shorter'],
    weak: ['th', '()'],
    newLevel: true,
  };

  it('takes a complete fact-blind view', () => {
    expect(parseEndlessView(good)).toEqual(good);
  });

  it('refuses a stack outside the closed set and a band off the ladder', () => {
    expect(parseEndlessView({ ...good, stack: 'rust' })).toBeNull();
    expect(parseEndlessView({ ...good, bandMin: 0 })).toBeNull();
    expect(parseEndlessView({ ...good, bandMax: 8 })).toBeNull();
    expect(parseEndlessView({ ...good, bandMin: 1.5 })).toBeNull();
    expect(parseEndlessView({ ...good, bandMin: 4, bandMax: 2 })).toBeNull();
    expect(parseEndlessView({ ...good, product: '   ' })).toBeNull();
    expect(parseEndlessView(null)).toBeNull();
    expect(parseEndlessView('python')).toBeNull();
  });

  it('caps the free text so a prompt cannot be smuggled in it', () => {
    const big = parseEndlessView({
      ...good,
      product: 'p'.repeat(500),
      recent: Array.from({ length: 20 }, () => 'r'.repeat(500)),
      weak: Array.from({ length: 80 }, () => 'weak'),
      newLevel: 'yes',
    });
    expect(big?.product).toHaveLength(120);
    expect(big?.recent).toHaveLength(3);
    expect(big?.recent[0]).toHaveLength(200);
    expect(big?.weak).toHaveLength(24);
    expect(big?.weak[0]).toBe('we');
    expect(big?.newLevel).toBe(false);
  });
});

describe('the endless route', () => {
  let seated: Server;
  let seatedBase: string;
  let moduleDir: string;

  beforeAll(async () => {
    moduleDir = await mkdtemp(path.join(os.tmpdir(), 'cabinet-endless-'));
    // A stand-in for the bundled cabinet-server: it answers the way the
    // real one does, and throws when the product says to, so the route's
    // own words can be measured without a daemon.
    await writeFile(
      path.join(moduleDir, 'seat.mjs'),
      [
        'export async function askEndlessFor(view, opts) {',
        '  if (view.product.includes("boom")) throw new Error("ollama down");',
        '  if (view.product.includes("gone")) throw new Error("tag was retired");',
        '  return {',
        '    request: { ask: "can you make it sing", code: "x = 1", title: "a thing", notes: [] },',
        '    tier: "cloud",',
        '    model: opts.models[0] ?? "none",',
        '    ms: 1,',
        '    suppressed: false,',
        '  };',
        '}',
      ].join('\n'),
      'utf8',
    );
    seated = createCabinetServer({
      playDir: play,
      sayModule: null,
      endlessModule: path.join(moduleDir, 'seat.mjs'),
      ollamaUrl: upstreamBase,
      voiceUrl: upstreamBase,
      voiceToken: null,
      anthropicKey: null,
    });
    const port = await listenFrom(seated, 24_511);
    seatedBase = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((r) => seated.close(() => r()));
    await rm(moduleDir, { recursive: true, force: true });
  });

  const view = {
    product: 'a diary for houseplants',
    stack: 'python',
    bandMin: 1,
    bandMax: 2,
    recent: [],
    weak: [],
    newLevel: false,
  };

  function post(body: unknown, at = seatedBase): Promise<Response> {
    return fetch(`${at}/cabinet/endless`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('refuses anything that is not a posted json view', async () => {
    expect((await fetch(`${seatedBase}/cabinet/endless`)).status).toBe(405);
    const plain = await fetch(`${seatedBase}/cabinet/endless`, { method: 'POST', body: 'x' });
    expect(plain.status).toBe(415);
    const bad = await post({ view: { stack: 'rust' } });
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: 'no answer' });
  });

  it('refuses a body bigger than the cap', async () => {
    const res = await post({ view, filler: 'x'.repeat(40 * 1024) });
    expect(res.status).toBe(413);
  });

  it('says so when the package has no cabinet server rather than hanging', async () => {
    const res = await post({ view }, base);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'no cabinet server built' });
  });

  it('asks the seat and hands back what it said', async () => {
    // The refusals above each took the route's turn; the minimum interval
    // between two asks is the point of that turn, so wait it out.
    await new Promise((r) => setTimeout(r, 450));
    const res = await post({ view, models: ['kimi-test:cloud'] });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { request: { ask: string }; model: string };
    expect(body.request.ask).toBe('can you make it sing');
    expect(body.model).toBe('kimi-test:cloud');
  });

  it('slows a second ask down rather than running two seats at once', async () => {
    const res = await post({ view });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'slow down' });
  });

  it('answers in words when the seat throws', async () => {
    await new Promise((r) => setTimeout(r, 450));
    const down = await post({ view: { ...view, product: 'a boom for houseplants' } });
    expect(down.status).toBe(200);
    expect(await down.json()).toEqual({ error: 'no answer' });
    await new Promise((r) => setTimeout(r, 450));
    const retired = await post({ view: { ...view, product: 'a gone for houseplants' } });
    expect(await retired.json()).toEqual({ error: 'model retired' });
  });
});
