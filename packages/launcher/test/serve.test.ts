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
  ownHost,
  ownOrigin,
  parseEndlessView,
  parseSeatView,
  parseStrings,
  readBody,
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
    }
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
    expect(await res.json()).toEqual({ error: 'too large' });
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
// key, that nothing on its page ever called. Its launcher passes null now,
// and this is the shape that makes.

describe('a Ghost-shaped cabinet', () => {
  it('answers the endless seat with 503 while the say seat is lit', async () => {
    const moduleDir = await mkdtemp(path.join(os.tmpdir(), 'ghost-seats-'));
    await writeFile(
      path.join(moduleDir, 'seat.mjs'),
      'export async function askSayFor() { return { line: "hello" }; }\n',
      'utf8',
    );
    const shooter = createCabinetServer({
      playDir: play,
      sayModule: path.join(moduleDir, 'seat.mjs'),
      endlessModule: null,
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
      expect(endless.status).toBe(503);
      expect(await endless.json()).toEqual({ error: 'no cabinet server built' });
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
      expect(await say.json()).toEqual({ line: 'hello' });
    } finally {
      await new Promise<void>((r) => shooter.close(() => r()));
      await rm(moduleDir, { recursive: true, force: true });
    }
  });
});
