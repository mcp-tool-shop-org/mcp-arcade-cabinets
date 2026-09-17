import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import { createServer } from 'node:http';
import { connect } from 'node:net';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  checkSeatUrl,
  createCabinetServer,
  DARK,
  faultLine,
  listenFrom,
  listenLines,
  ListenTrouble,
  ownHost,
  ownOrigin,
  parseEndlessView,
  parseSeatView,
  notFoundLine,
  parseStrings,
  readBody,
  retiredLine,
  seatHaltLines,
  seatWatch,
  troubleLine,
} from '../src/serve';

/**
 * `fetch` resolves `/../x` against the origin before it ever opens a
 * socket, so it cannot ask the question a traversal attempt asks. This
 * writes the request line by hand.
 */
function rawGet(port: number, line: string, headers: string[] = []): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = connect(port, '127.0.0.1', () => {
      // The Host carries the port, because that is what a browser sends and
      // because the server now checks it.
      const sent = headers.length > 0 ? headers : [`Host: 127.0.0.1:${port}`];
      socket.write(`GET ${line} HTTP/1.1\r\n${sent.join('\r\n')}\r\nConnection: close\r\n\r\n`);
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

  it('404s a file that is not there, in words a person can act on', async () => {
    const port = (cabinet.address() as { port: number }).port;
    const res = await fetch(`${base}/sprites/nothing.png`);
    expect(res.status).toBe(404);
    // The rule `sendText` states was applied to two 403s and to nothing
    // else, while this is the refusal a person meets most often: a mistyped
    // address bar, or a bookmark from an older shell.
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(await res.text()).toBe(`${notFoundLine('/sprites/nothing.png', port)}\n`);
    expect(notFoundLine('/x', 7777)).toBe(
      'this cabinet has nothing at /x; the game is at http://127.0.0.1:7777/',
    );
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
    // Only a browser form or a stray fetch reaches this: every path a script
    // calls was answered above it.
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(await res.text()).toContain('this cabinet only serves the game here');
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
      expect(res.status, bad).toBe(403);
      expect(await res.json(), bad).toEqual({ error: 'not proxied' });
    }
    const tagsByPost = await fetch(`${base}/ollama/api/tags`, { method: 'POST' });
    expect(tagsByPost.status).toBe(403);
    expect(seen).toEqual([]);
  });

  // Three different fixes used to share one word. A verb off the allowlist, a
  // file that is not in the shell and an upstream this cabinet was never
  // given all answered `404 not found`, so a developer who added a call to
  // the page and forgot `allow.ts` got the same answer as a typo in an asset
  // path — and the same answer the daemon itself would give for an unknown
  // route.
  it('tells the three refusals apart, and says the proxied one out loud', async () => {
    const said: string[] = [];
    const split = createCabinetServer({
      playDir: play,
      sayModule: null,
      endlessModule: null,
      ollamaUrl: upstreamBase,
      // No worker configured: the `/voice` prefix is known and there is
      // nothing behind it, which is not the same as a path nobody proxies.
      voiceUrl: null,
      voiceToken: null,
      anthropicKey: null,
      onTrouble: (line: string) => said.push(line),
    });
    const port = await listenFrom(split, 24_911);
    const at = `http://127.0.0.1:${port}`;
    try {
      const missing = await fetch(`${at}/nope.png`);
      expect(missing.status).toBe(404);
      // Written for the person in the browser window, not for a parser:
      // every path a script calls is a seat or a proxy prefix and was
      // answered before this route.
      expect(missing.headers.get('content-type')).toBe('text/plain; charset=utf-8');
      expect(await missing.text()).toContain('this cabinet has nothing at /nope.png');

      const off = await fetch(`${at}/ollama/api/pull`, { method: 'POST' });
      expect(off.status).toBe(403);
      expect(await off.json()).toEqual({ error: 'not proxied' });

      const noWorker = await fetch(`${at}/voice/health`);
      expect(noWorker.status).toBe(503);
      expect(await noWorker.json()).toEqual({ error: 'no upstream' });

      // Only the one that is always either a bug in the shell or somebody
      // probing reaches the terminal.
      expect(said).toEqual([
        'the page asked for POST /api/pull, which this cabinet does not proxy',
      ]);
    } finally {
      await new Promise<void>((r) => split.close(() => r()));
    }
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
    expect(nope.status).toBe(403);
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
    // A bundle that was expected on disk and is not there: 503, and it names
    // the file, because this one is a broken download.
    expect(await res.json()).toEqual({
      error: 'no cabinet server built',
      hint: 'this package is missing dist/cabinet-server.js',
    });
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
    // `no answer` is what the seat says when it was asked and said nothing.
    // A body the route could not read never reached a seat at all, and a
    // client told otherwise goes off to debug a daemon that was never called.
    expect(await bad.json()).toEqual({
      error: 'bad view',
      hint: 'view must be the seat view this route takes',
    });
    // The refusal above took the route's turn; the minimum interval between
    // two asks is the point of that turn, so wait it out.
    await new Promise((r) => setTimeout(r, 450));
    const notJson = await fetch(`${seatedBase}/cabinet/endless`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{oh no',
    });
    expect(notJson.status).toBe(400);
    expect(await notJson.json()).toEqual({ error: 'bad json', hint: 'the body must be JSON' });
  });

  it('refuses a body bigger than the cap, and names the cap it met', async () => {
    const res = await post({ view, filler: 'x'.repeat(40 * 1024) });
    expect(res.status).toBe(413);
    // The two caps in this server differ by route — 1 MiB on the proxy, 32
    // KiB here — and both used to answer the same two words.
    expect(await res.json()).toEqual({ error: 'too large', hint: 'at most 32 KB' });
  });

  it('says so when the package has no cabinet server rather than hanging', async () => {
    const res = await post({ view }, base);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      error: 'no cabinet server built',
      hint: 'this package is missing dist/cabinet-server.js',
    });
  });

  it('asks the seat and hands back what it said', async () => {
    // The refusals above each took the route's turn; the minimum interval
    // between two asks is the point of that turn, so wait it out.
    await new Promise((r) => setTimeout(r, 450));
    const res = await post({ view, models: ['kimi-test:cloud'] });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; request: { ask: string }; model: string };
    expect(body.request.ask).toBe('can you make it sing');
    expect(body.model).toBe('kimi-test:cloud');
    // The 200 is the page's contract; the body is everyone else's.
    expect(body.ok).toBe(true);
  });

  it('says which of the two waits it wants, and how long', async () => {
    const res = await post({ view });
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('1');
    expect(await res.json()).toEqual({
      error: 'slow down',
      hint: 'one call at a time, and at most one every 400 ms',
    });
  });

  it('answers in words when the seat throws, and does not read as a success', async () => {
    await new Promise((r) => setTimeout(r, 450));
    const down = await post({ view: { ...view, product: 'a boom for houseplants' } });
    expect(down.status).toBe(200);
    expect(await down.json()).toEqual({ ok: false, error: 'no answer' });
    await new Promise((r) => setTimeout(r, 450));
    const retired = await post({ view: { ...view, product: 'a gone for houseplants' } });
    expect(await retired.json()).toEqual({ ok: false, error: 'model retired' });
  });
});

// ——— who the cabinet is willing to be talked to as (the rebinding gate) ——————
//
// Binding 127.0.0.1 keeps other machines out and does nothing about DNS
// rebinding: a page the player has open while the cabinet runs can point its
// own hostname at 127.0.0.1 and then read every answer here same-origin, on a
// port it can guess. Behind that sit the player's model list, chat and
// generate against their daemon, the voice worker with its bearer added on
// this side, and the say seat, which spends their ANTHROPIC_API_KEY. The
// rebound page cannot forge Host, so Host is the check.

describe('the names the cabinet answers to', () => {
  it('takes its own address on its own port, and nothing else', () => {
    for (const good of ['127.0.0.1:7777', 'localhost:7777', 'LOCALHOST:7777', '[::1]:7777']) {
      expect(ownHost(good, 7777), good).toBe(true);
    }
    for (const bad of [
      undefined,
      '',
      'cabinet.example.com:7777',
      '127.0.0.1',
      'localhost',
      '127.0.0.1:7778',
      '127.0.0.2:7777',
      '127.0.0.1.example.com:7777',
      'localhost:7777:7777',
      ['localhost:7777', 'evil.example.com:7777'],
    ]) {
      expect(ownHost(bad as string | string[] | undefined, 7777), String(bad)).toBe(false);
    }
  });

  it('takes no Origin at all, and its own, and refuses every other one', () => {
    expect(ownOrigin(undefined, 7777)).toBe(true);
    expect(ownOrigin('http://127.0.0.1:7777', 7777)).toBe(true);
    expect(ownOrigin('http://localhost:7777', 7777)).toBe(true);
    for (const bad of [
      'null',
      'http://evil.example.com',
      'http://evil.example.com:7777',
      'https://127.0.0.1:7777',
      'http://127.0.0.1:7778',
      'file://',
    ]) {
      expect(ownOrigin(bad, 7777), bad).toBe(false);
    }
  });
});

describe('a request addressed to somebody else', () => {
  it('refuses a Host that is not this cabinet, and serves the one that is', async () => {
    const port = (cabinet.address() as { port: number }).port;
    const mine = await rawGet(port, '/', [`Host: 127.0.0.1:${port}`]);
    expect(mine.split('\r\n')[0]).toMatch(/^HTTP\/1\.1 200 /);
    expect(mine).toContain('cabinet');
    for (const host of [
      'cabinet.example.com',
      `cabinet.example.com:${port}`,
      `127.0.0.1:${port + 1}`,
    ]) {
      const raw = await rawGet(port, '/', [`Host: ${host}`]);
      expect(raw.split('\r\n')[0], host).toMatch(/^HTTP\/1\.1 403 /);
      expect(raw, host).not.toContain('<title>cabinet');
      // The person who most often trips this is the player who typed their
      // own machine's name or a VPN address into the bar, and what they used
      // to get was two words of JSON rendered as source: correct and
      // unhelpful at the same time.
      expect(raw, host).toContain('text/plain');
      expect(raw, host).toContain(`this cabinet answers to http://127.0.0.1:${port}/ only`);
      expect(raw, host).toContain('open that address instead');
    }
  });

  it('keeps the JSON shape for the paths a script calls', async () => {
    const port = (cabinet.address() as { port: number }).port;
    const raw = await rawGet(port, '/ollama/api/tags', ['Host: cabinet.example.com']);
    expect(raw.split('\r\n')[0]).toMatch(/^HTTP\/1\.1 403 /);
    expect(raw).toContain('application/json');
    expect(raw).toContain('"wrong host"');
  });

  it('refuses a cross-origin call and never opens a socket to the daemon', async () => {
    seen.length = 0;
    const port = (cabinet.address() as { port: number }).port;
    const raw = await rawGet(port, '/ollama/api/tags', [
      `Host: 127.0.0.1:${port}`,
      'Origin: http://evil.example.com',
    ]);
    expect(raw.split('\r\n')[0]).toMatch(/^HTTP\/1\.1 403 /);
    expect(raw).toContain('wrong origin');
    expect(seen).toEqual([]);
    const ours = await rawGet(port, '/ollama/api/tags', [
      `Host: 127.0.0.1:${port}`,
      `Origin: http://127.0.0.1:${port}`,
    ]);
    expect(ours.split('\r\n')[0]).toMatch(/^HTTP\/1\.1 200 /);
    expect(seen).toHaveLength(1);
  });

  it('refuses the say seat to a rebound page before it can spend a key', async () => {
    const res = await fetch(`${base}/cabinet/say`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://evil.example.com' },
      body: JSON.stringify({ view: {} }),
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'wrong origin' });
  });
});

// ——— the three ways a request body ends ——————————————————————————————————————
//
// They used to share one `null` and every caller answered 413 for it, so a
// connection reset mid-upload was reported to the page as a size refusal and
// sent anyone debugging it at the wrong constant.

describe('reading a request body', () => {
  function fakeRequest() {
    const handlers = new Map<string, ((value?: unknown) => void)[]>();
    const state = { destroyed: false };
    const req = {
      on(event: string, handler: (value?: unknown) => void) {
        handlers.set(event, [...(handlers.get(event) ?? []), handler]);
        return req;
      },
      destroy() {
        state.destroyed = true;
      },
    };
    return {
      req: req as unknown as Parameters<typeof readBody>[0],
      emit: (event: string, value?: unknown) => {
        for (const handler of handlers.get(event) ?? []) handler(value);
      },
      state,
    };
  }

  it('hands back the body it read', async () => {
    const fake = fakeRequest();
    const read = readBody(fake.req, 1024);
    fake.emit('data', Buffer.from('half '));
    fake.emit('data', Buffer.from('a body'));
    fake.emit('end');
    expect(await read).toEqual({ ok: Buffer.from('half a body') });
  });

  it('says the cap was passed, and stops reading', async () => {
    const fake = fakeRequest();
    const read = readBody(fake.req, 4);
    fake.emit('data', Buffer.from('too much'));
    expect(await read).toEqual({ tooLarge: true });
    expect(fake.state.destroyed).toBe(true);
  });

  it('says the request went away, which is not the same as too large', async () => {
    const reset = fakeRequest();
    const read = readBody(reset.req, 1024);
    reset.emit('data', Buffer.from('half'));
    reset.emit('error', new Error('ECONNRESET'));
    expect(await read).toEqual({ broken: true });

    const gone = fakeRequest();
    const second = readBody(gone.req, 1024);
    gone.emit('aborted');
    expect(await second).toEqual({ broken: true });
  });
});

// ——— what the proxy will carry ———————————————————————————————————————————————

describe('the cap on a proxied body', () => {
  it('carries a chat history well past the say seat size', async () => {
    seen.length = 0;
    const res = await fetch(`${base}/ollama/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // Bigger than SAY_MAX_BYTES, which used to cap this route and answer
      // 413 for it. The shell reads a failed call as a reason to fall back
      // to the scripted seat, so a long enough session would watch the
      // daemon quietly stop being used with nothing said anywhere.
      body: JSON.stringify({ model: 'x', messages: [{ content: 'x'.repeat(200 * 1024) }] }),
    });
    expect(res.status).toBe(200);
    expect(seen.map((s) => s.url)).toEqual(['/api/chat']);
  });

  it('still refuses a body past its own cap', async () => {
    seen.length = 0;
    const res = await fetch(`${base}/ollama/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'x', messages: [{ content: 'x'.repeat(1024 * 1024 + 64) }] }),
    });
    expect(res.status).toBe(413);
    // The proxy's own cap, not the say seat's: the number in the body is the
    // one the call actually met.
    expect(await res.json()).toEqual({ error: 'too large', hint: 'at most 1024 KB' });
    expect(seen).toEqual([]);
  });
});

// ——— the upstream when the browser hangs up ——————————————————————————————————

describe('a player who reloads during a long generate', () => {
  it('lets go of the upstream instead of leaving it streaming into nowhere', async () => {
    let closed = false;
    const slow = createServer((req, res) => {
      req.on('close', () => {
        closed = true;
      });
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json');
      // Headers and a first chunk, then nothing: a streamed completion.
      res.write('{"partial":');
    });
    const slowPort = await listenFrom(slow, 24_611);
    const front = createCabinetServer({
      playDir: play,
      sayModule: null,
      endlessModule: null,
      ollamaUrl: `http://127.0.0.1:${slowPort}`,
      voiceUrl: null,
      voiceToken: null,
      anthropicKey: null,
    });
    const frontPort = await listenFrom(front, 24_711);
    try {
      const ctl = new AbortController();
      const res = await fetch(`http://127.0.0.1:${frontPort}/ollama/api/tags`, {
        signal: ctl.signal,
      });
      expect(res.status).toBe(200);
      ctl.abort();
      for (let i = 0; i < 40 && !closed; i += 1) {
        await new Promise((r) => setTimeout(r, 50));
      }
      expect(closed).toBe(true);
    } finally {
      await new Promise<void>((r) => front.close(() => r()));
      await new Promise<void>((r) => slow.close(() => r()));
    }
  });
});

// ——— the seats a Ghost-shaped cabinet lights ————————————————————————————————
//
// `endlessModule` left absent falls back to the say module, so the shooter's
// package used to publish a second model-prompting route, handed the player's
// key, that nothing on its page ever called. Its launcher passes `DARK` now,
// and this is the shape that makes.

describe('a Ghost-shaped cabinet', () => {
  it('answers the endless seat with 404 while the say seat is lit', async () => {
    const moduleDir = await mkdtemp(path.join(os.tmpdir(), 'ghost-seats-'));
    await writeFile(
      path.join(moduleDir, 'seat.mjs'),
      'export async function askSayFor() { return { line: "hello" }; }\n',
      'utf8',
    );
    const shooter = createCabinetServer({
      playDir: play,
      sayModule: path.join(moduleDir, 'seat.mjs'),
      endlessModule: DARK,
      ollamaUrl: upstreamBase,
      voiceUrl: upstreamBase,
      voiceToken: null,
      anthropicKey: 'not-a-real-key',
    });
    const port = await listenFrom(shooter, 24_811);
    try {
      const endless = await fetch(`http://127.0.0.1:${port}/cabinet/endless`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          view: {
            product: 'a diary for houseplants',
            stack: 'python',
            bandMin: 1,
            bandMax: 2,
            recent: [],
            weak: [],
            newLevel: false,
          },
        }),
      });
      // Not 503: nothing here is missing and there is nothing to rebuild.
      // The shooter has no endless seat, and a player probing it used to be
      // told their download was broken.
      expect(endless.status).toBe(404);
      expect(await endless.json()).toEqual({
        error: 'no such seat',
        hint: 'this cabinet does not light the endless seat',
      });
      const say = await fetch(`http://127.0.0.1:${port}/cabinet/say`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          view: {
            kind: 'menu',
            hp: 'mid',
            column: 'left',
            stick: 'still',
            motion: 'leaning',
            wave: 'poison',
          },
        }),
      });
      expect(say.status).toBe(200);
      // `ok` beside the seat's own answer: the status line is the page's
      // contract, and the body is what anything else on loopback reads.
      expect(await say.json()).toEqual({ ok: true, line: 'hello' });
    } finally {
      await new Promise<void>((r) => shooter.close(() => r()));
      await rm(moduleDir, { recursive: true, force: true });
    }
  });
});

// A daemon that is not running, an address with a typo in it, a worker that
// is down and a tag the host has retired all reached the person who ran
// `npx` as the same one word: `no answer`. The page is still told only that
// -- it has a fallback and no business knowing more -- but the cabinet now
// says the cause out loud, in its own words, with no path and no stack in it.
describe('what the cabinet says when a seat is not there', () => {
  it('names the seat, the address and the cause', () => {
    const refused = Object.assign(new Error('fetch failed'), {
      cause: Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }),
    });
    expect(troubleLine('daemon', 'http://127.0.0.1:11434', refused)).toBe(
      'the daemon at http://127.0.0.1:11434 is not running, or is not at that address',
    );
    const late = Object.assign(new Error('the operation was aborted'), { name: 'TimeoutError' });
    expect(troubleLine('worker', 'http://127.0.0.1:7788', late)).toBe(
      'the voice worker at http://127.0.0.1:7788 took too long to answer',
    );
    expect(troubleLine('daemon', 'http://127.0.0.1:1', new Error('something else'))).toBe(
      'the daemon at http://127.0.0.1:1 did not answer',
    );
    expect(retiredLine('daemon')).toBe(
      'the daemon says that model tag is retired; pick another seat',
    );
    for (const line of [
      troubleLine('daemon', 'http://127.0.0.1:11434', refused),
      troubleLine('worker', 'http://127.0.0.1:7788', late),
      retiredLine('worker'),
    ]) {
      expect(line.includes(process.cwd())).toBe(false);
      expect(line.includes('at Object.')).toBe(false);
    }
  });

  it('holds the two addresses to a stated shape, the way --port is held', () => {
    expect(checkSeatUrl('OLLAMA_URL', 'http://127.0.0.1:11434')).toBeNull();
    expect(checkSeatUrl('VOICE_URL', 'https://voice.example.test')).toBeNull();
    // The scheme-less forms are the ones that used to start clean and fail
    // later. A host that begins with a letter even parses, with the host
    // taken for the scheme, so a scheme check is what catches it.
    expect(checkSeatUrl('OLLAMA_URL', 'localhost:11434')).toBe(
      'OLLAMA_URL wants an http:// or https:// address, got localhost:11434',
    );
    // The likeliest typo of the lot, and the one that used to get the least
    // useful of the three messages: the address the player believes they
    // typed, handed back with no statement of what an address is here.
    expect(checkSeatUrl('OLLAMA_URL', '127.0.0.1:11434')).toBe(
      'OLLAMA_URL is not an address, got 127.0.0.1:11434; it wants a scheme, like http://127.0.0.1:11434',
    );
    for (const bad of ['', 'localhost', 'ollama', 'http//127.0.0.1', 'ftp://host', 'http://']) {
      const said = checkSeatUrl('OLLAMA_URL', bad);
      expect(said, JSON.stringify(bad)).not.toBeNull();
      expect(String(said).startsWith('OLLAMA_URL '), JSON.stringify(bad)).toBe(true);
    }
  });

  it('says it on stderr when a proxied call finds nothing there, and still tells the page nothing', async () => {
    // A port that was listened on and let go: nothing is there now.
    const vacated = createServer(() => undefined);
    const deadPort = await listenFrom(vacated, 24_611);
    await new Promise((r) => vacated.close(() => r(undefined)));
    const said: string[] = [];
    const quiet = createCabinetServer({
      playDir: play,
      sayModule: null,
      ollamaUrl: `http://127.0.0.1:${deadPort}`,
      voiceUrl: null,
      voiceToken: null,
      anthropicKey: null,
      onTrouble: (line: string) => said.push(line),
    });
    const port = await listenFrom(quiet, 24_711);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/ollama/api/tags`);
      expect(res.status).toBe(502);
      expect(await res.json()).toEqual({
        error: 'upstream quiet',
        hint: 'the daemon or the worker did not answer',
      });
      expect(said).toHaveLength(1);
      expect(said[0]!.startsWith(`the daemon at http://127.0.0.1:${deadPort} `)).toBe(true);
    } finally {
      await new Promise((r) => quiet.close(() => r(undefined)));
    }
  });

  it('says nothing at all while the daemon is answering', async () => {
    const said: string[] = [];
    const fine = createCabinetServer({
      playDir: play,
      sayModule: null,
      ollamaUrl: upstreamBase,
      voiceUrl: null,
      voiceToken: null,
      anthropicKey: null,
      onTrouble: (line: string) => said.push(line),
    });
    const port = await listenFrom(fine, 24_811);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/ollama/api/tags`);
      expect(res.status).toBe(200);
      expect(said).toEqual([]);
    } finally {
      await new Promise((r) => fine.close(() => r(undefined)));
    }
  });
});

// ——— the same sentence, over and over, and then silence ——————————————————————
//
// `onTrouble` had no memory. A daemon that is not running repeated one
// identical line for as long as the page kept probing — the shell re-probes
// on the menu and on every model refresh — and the mirror-image case was
// worse: when the daemon came back nothing was said at all, so the
// operator's last word on the subject was a failure that was no longer true.

describe('a seat that goes quiet and then comes back', () => {
  it('says the trouble once, stays quiet, and says so when it answers again', async () => {
    const said: string[] = [];
    const watch = seatWatch((line) => said.push(line));
    const refused = Object.assign(new Error('fetch failed'), {
      cause: Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }),
    });
    const url = 'http://127.0.0.1:11434';
    for (let i = 0; i < 3; i += 1) watch.trouble('daemon', url, refused);
    expect(said).toEqual([`the daemon at ${url} is not running, or is not at that address`]);
    watch.answering('daemon', url);
    expect(said).toHaveLength(2);
    expect(said[1]).toBe(`the daemon at ${url} is answering again`);
    // And it is not said again on every call after that.
    watch.answering('daemon', url);
    watch.answering('daemon', url);
    expect(said).toHaveLength(2);
    // The worker keeps its own state; one quiet seat does not speak for both.
    watch.trouble('worker', 'http://127.0.0.1:7788', refused);
    expect(said[2]).toBe(
      'the voice worker at http://127.0.0.1:7788 is not running, or is not at that address',
    );
  });

  it('says nothing about a seat that was answering all along', () => {
    const said: string[] = [];
    const watch = seatWatch((line) => said.push(line));
    watch.answering('daemon', 'http://127.0.0.1:11434');
    watch.answering('daemon', 'http://127.0.0.1:11434');
    expect(said).toEqual([]);
  });

  it('repeats neither line down the wire when the page keeps probing', async () => {
    const vacated = createServer(() => undefined);
    const deadPort = await listenFrom(vacated, 25_011);
    await new Promise((r) => vacated.close(() => r(undefined)));
    const said: string[] = [];
    const quiet = createCabinetServer({
      playDir: play,
      sayModule: null,
      endlessModule: null,
      ollamaUrl: `http://127.0.0.1:${deadPort}`,
      voiceUrl: null,
      voiceToken: null,
      anthropicKey: null,
      onTrouble: (line: string) => said.push(line),
    });
    const port = await listenFrom(quiet, 25_111);
    try {
      for (let i = 0; i < 3; i += 1) {
        const res = await fetch(`http://127.0.0.1:${port}/ollama/api/tags`);
        expect(res.status).toBe(502);
      }
      expect(said).toHaveLength(1);
    } finally {
      await new Promise((r) => quiet.close(() => r(undefined)));
    }
  });
});

// ——— a rebound page, said once in the terminal ——————————————————————————————

describe('what the operator is told about a refused Host', () => {
  it('says it happened once, however many times it happens', async () => {
    const said: string[] = [];
    const watched = createCabinetServer({
      playDir: play,
      sayModule: null,
      endlessModule: null,
      ollamaUrl: upstreamBase,
      voiceUrl: null,
      voiceToken: null,
      anthropicKey: null,
      onTrouble: (line: string) => said.push(line),
    });
    const port = await listenFrom(watched, 25_211);
    try {
      for (let i = 0; i < 3; i += 1) {
        await rawGet(port, '/', ['Host: cabinet.example.com']);
      }
      expect(said).toEqual([
        'something asked this cabinet for cabinet.example.com; it answers to 127.0.0.1 only',
      ]);
    } finally {
      await new Promise<void>((r) => watched.close(() => r()));
    }
  });
});

// ——— the port walk, in the player's words ————————————————————————————————————
//
// The old failure printed two numbers that contradicted each other: the
// prefix named the port the player asked for and the raw errno text named the
// twenty-first port the walk reached, with nothing saying where the second
// number came from. And after ten busy ports Node wrote its own
// MaxListenersExceededWarning into the terminal, which is an internal
// diagnostic naming a leak the player cannot act on.

describe('what the cabinet says when it cannot take a port', () => {
  it('names the range it walked, never a bare number the player did not type', () => {
    const busy = new ListenTrouble(
      Object.assign(new Error('listen EADDRINUSE: address already in use 127.0.0.1:7830'), {
        code: 'EADDRINUSE',
      }),
      7810,
      7830,
    );
    expect(listenLines(busy, 7810)).toEqual([
      'ports 7810-7830 are all busy',
      '',
      'next: free one, or pass --port <n>',
    ]);
  });

  it('names the privilege rather than the errno when the port is a low one', () => {
    const denied = new ListenTrouble(
      Object.assign(new Error('listen EACCES: permission denied 127.0.0.1:80'), { code: 'EACCES' }),
      80,
      80,
    );
    expect(listenLines(denied, 80)).toEqual([
      'port 80 needs a privilege this cabinet does not want',
      '',
      'next: pass --port with something above 1024',
    ]);
  });

  it('falls back to the cause for anything it has no words for', () => {
    const other = new ListenTrouble(
      Object.assign(new Error('listen EAFNOSUPPORT'), { code: 'EAFNOSUPPORT' }),
      7777,
      7777,
    );
    // The two fall-throughs used to be one bare line of Node's errno text,
    // which is the one halt shape in the launcher with nothing to do next.
    expect(listenLines(other, 7777)).toEqual([
      'could not listen on 7777: listen EAFNOSUPPORT',
      '',
      'next: pass --port <n>',
    ]);
    expect(listenLines(new Error('something else'), 7777)).toEqual([
      'could not listen on 7777: something else',
      '',
      'next: pass --port <n>',
    ]);
  });

  it('walks past busy ports without leaving a listener behind on the server', async () => {
    const first = createServer(() => undefined);
    const start = await listenFrom(first, 25_311);
    const second = createServer(() => undefined);
    await listenFrom(second, start + 1, 0);
    const third = createServer(() => undefined);
    await listenFrom(third, start + 2, 0);
    const walker = createServer(() => undefined);
    // An http server carries one internal `listening` listener of its own
    // from the moment it is made, so the question is whether the walk adds
    // any — not whether the count is zero.
    const before = {
      listening: walker.listenerCount('listening'),
      error: walker.listenerCount('error'),
    };
    try {
      const landed = await listenFrom(walker, start);
      expect(landed).toBe(start + 3);
      // The warning a player used to see — `MaxListenersExceededWarning: 11
      // listening listeners added to [Server]`, written into a startup that
      // otherwise speaks in sentences — arrives because the old code added
      // one per attempt and took off only the error handler.
      expect(walker.listenerCount('listening')).toBe(before.listening);
      expect(walker.listenerCount('error')).toBe(before.error);
    } finally {
      for (const server of [walker, third, second, first]) {
        await new Promise<void>((r) => server.close(() => r()));
      }
    }
  });

  it('gives up with a typed failure rather than a raw errno', async () => {
    const held = createServer(() => undefined);
    const heldPort = await listenFrom(held, 25_411);
    const walker = createServer(() => undefined);
    const before = {
      listening: walker.listenerCount('listening'),
      error: walker.listenerCount('error'),
    };
    try {
      // No room to walk into: one try, and the port it was given is taken.
      await expect(listenFrom(walker, heldPort, 0)).rejects.toBeInstanceOf(ListenTrouble);
      expect(walker.listenerCount('listening')).toBe(before.listening);
      expect(walker.listenerCount('error')).toBe(before.error);
    } finally {
      await new Promise<void>((r) => walker.close(() => r()));
      await new Promise<void>((r) => held.close(() => r()));
    }
  });
});

// ——— the one failure the operator could not see ——————————————————————————————
//
// Every other failure in this server reaches `opts.onTrouble`: the proxy on
// the way down and again on the way back up, the allowlist refusal, the host
// and origin refusals, the say seat's quiet or retired tag. The last-resort
// catch sent 500 and wrote nothing anywhere, and dropped the error object
// entirely rather than reducing it to a cause word. It calls this now.

describe('what the last-resort catch says', () => {
  it('says one sentence with the cause word, and never a stack or a path', () => {
    expect(faultLine(Object.assign(new Error('x'), { code: 'EACCES' }))).toBe(
      'the cabinet could not answer that request (EACCES)',
    );
    // No errno: the error's own name is the cause word, the way `troubleLine`
    // reaches for it.
    expect(faultLine(new TypeError('x is not a function'))).toBe(
      'the cabinet could not answer that request (TypeError)',
    );
    // Nothing thrown that is not an Error still gets a sentence.
    expect(faultLine('a string')).toBe('the cabinet could not answer that request');
    const thrown = new Error('at Object.<anonymous> (/home/someone/secret.js:1:1)');
    expect(faultLine(thrown).includes('at Object.')).toBe(false);
    expect(faultLine(thrown).includes('/home/someone')).toBe(false);
  });
});

// ——— one halt shape, for all three walls a player can meet ——————————————————
//
// `missingLines` is the model: headline, `- expected:` where there is one, a
// blank line, `next:`. The seat check halted in one line with the remedy
// folded into the sentence, and two of `listenLines`' branches returned a bare
// errno with no `next:` at all.

describe('the shape every halt takes', () => {
  it('names the variable to set, under a blank line, like the others', () => {
    expect(
      seatHaltLines('OLLAMA_URL wants an http:// or https:// address, got localhost:11434'),
    ).toEqual([
      'OLLAMA_URL wants an http:// or https:// address, got localhost:11434',
      '',
      'next: set OLLAMA_URL to an http:// address, or unset it for the default',
    ]);
    expect(seatHaltLines('VOICE_URL names no host, got http://')[2]).toBe(
      'next: set VOICE_URL to an http:// address, or unset it for the default',
    );
  });

  it('gives the two fall-through listen failures a next: line too', () => {
    const plain = listenLines(new Error('something else'), 7777);
    expect(plain).toEqual([
      'could not listen on 7777: something else',
      '',
      'next: pass --port <n>',
    ]);
    const odd = listenLines(
      new ListenTrouble(Object.assign(new Error('EPERM'), { code: 'EPERM' }), 7777, 7779),
      7777,
    );
    const busy = listenLines(
      new ListenTrouble(Object.assign(new Error('EADDRINUSE'), { code: 'EADDRINUSE' }), 7777, 7797),
      7777,
    );
    // Every halt ends with a `next:`, under a blank line. That is the shape,
    // not a flourish: two of these used to be one bare line of errno text.
    for (const lines of [
      plain,
      odd,
      busy,
      seatHaltLines('OLLAMA_URL names no host, got http://'),
    ]) {
      expect(lines[lines.length - 2]).toBe('');
      expect(lines[lines.length - 1]?.startsWith('next: ')).toBe(true);
    }
  });
});
