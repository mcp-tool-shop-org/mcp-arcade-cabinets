// The launcher's server: the shell on disk, two allowlisted proxies, and
// the say seat's node side.
//
// This is what `apps/cabinets/vite.config.ts` gives a developer, minus
// Vite, so a player who has only run `npx` gets the same cabinet — the one
// thing GitHub Pages structurally cannot serve, because Pages cannot reach
// a daemon on the player's own machine.
//
// It listens on loopback and only loopback. The proxies hand a browser a
// path to the player's Ollama daemon and voice worker; a bind on any other
// interface would hand it to their network too.

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';

import {
  allowed,
  ENDLESS_PATH,
  pathOnly,
  PREFIXES,
  restAfter,
  SAY_PATH,
  upstreamFor,
} from './allow';
import { resolveUnder, typeFor } from './files';

/** Loopback only. Not an option: see the note at the top of this file. */
export const HOST = '127.0.0.1';

const SAY_MAX_BYTES = 32 * 1024;
/**
 * The cap on a proxied POST body, which is a different question than the one
 * `SAY_MAX_BYTES` answers. The say and endless routes hand a fact-blind view
 * to a seat and 32 KiB is generous for that. `/ollama/api/chat` carries the
 * page's whole conversation, which grows with the run: capping it at the say
 * seat's size means a long enough session starts collecting 413s from a
 * number that was never chosen for it, and the shell answers a failed call by
 * falling back to the scripted seat — so the player would watch the daemon
 * quietly stop being used with nothing said anywhere.
 */
const PROXY_MAX_BYTES = 1024 * 1024;
const SAY_MIN_INTERVAL_MS = 400;
const SAY_TIMEOUT_MS = 12_000;
const SAY_MAX_RECENT = 16;
const SAY_MAX_MODELS = 32;
const SAY_STR = 200;
const PROXY_TIMEOUT_MS = 120_000;

// The endless seat writes a whole snippet, not a line, so it is given
// longer than the say seat's twelve seconds. Nothing waits on it: the shell
// prefetches during the request in hand and the corpus plays if it is late
// (G11, G13).
const ENDLESS_TIMEOUT_MS = 20_000;
const ENDLESS_MAX_RECENT = 3;
const ENDLESS_MAX_WEAK = 24;
const ENDLESS_STR = 200;
const ENDLESS_PRODUCT = 120;
const STACKS = ['bash', 'csharp', 'java', 'javascript', 'python', 'sql', 'integration'] as const;

const BOSS_KINDS = ['whisperer', 'menu', 'doorman', 'archivist'] as const;
const HP_WORDS = ['high', 'mid', 'low'] as const;
const COLUMNS = ['left', 'center', 'right'] as const;
const STICKS = ['still', 'left', 'right'] as const;
const WAVES = ['inspect', 'poison', 'rug', 'unlisted', 'breather'] as const;

/** What the launcher needs to know to stand a cabinet up. */
export interface ServeOpts {
  /** The built shell (`index.html`, `assets`, `sprites`, `tracks`). */
  playDir: string;
  /** The bundled cabinet-server, for the say seat. Null disables `/cabinet/say`. */
  sayModule: string | null;
  /**
   * The bundled cabinet-server for the endless seat. The same file as
   * `sayModule` in the shipped package, and named separately only so a
   * caller can light one seat without the other. Absent means the say
   * module, and null on both disables `/cabinet/endless`.
   */
  endlessModule?: string | null;
  /** The player's Ollama daemon. */
  ollamaUrl: string;
  /**
   * The host-side voice worker (`pnpm voice`), when they run one. Null does
   * not proxy `/voice` at all: the path 404s before a socket is opened, the
   * same as any other call the allowlist does not name. The typing cabinet
   * has no voice, so its package passes null rather than standing a proxy
   * up that nothing on the page will ever call.
   */
  voiceUrl: string | null;
  /** The worker's bearer. Added here; the browser never holds it. */
  voiceToken: string | null;
  /** Sits the Claude tier of the say seat. Never reaches the browser. */
  anthropicKey: string | null;
}

interface SeatView {
  kind: (typeof BOSS_KINDS)[number];
  hp: (typeof HP_WORDS)[number];
  column: (typeof COLUMNS)[number];
  stick: (typeof STICKS)[number];
  motion: string;
  wave: (typeof WAVES)[number];
}

/** What the endless seat is shown. Words and the product; nothing measured. */
export interface EndlessView {
  product: string;
  stack: (typeof STACKS)[number];
  bandMin: number;
  bandMax: number;
  recent: string[];
  weak: string[];
  newLevel: boolean;
}

function oneOf<T extends string>(v: unknown, list: readonly T[]): T | undefined {
  return typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : undefined;
}

function jsonType(header: string | string[] | undefined): boolean {
  const raw = Array.isArray(header) ? header[0] : header;
  const type = String(raw ?? '')
    .split(';')[0]
    ?.trim()
    .toLowerCase();
  return type === 'application/json';
}

/** The boss's fact-blind view, or null. A malformed view is never guessed at. */
export function parseSeatView(raw: unknown): SeatView | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const kind = oneOf(o.kind, BOSS_KINDS);
  const hp = oneOf(o.hp, HP_WORDS);
  const column = oneOf(o.column, COLUMNS);
  const stick = oneOf(o.stick, STICKS);
  const wave = oneOf(o.wave, WAVES);
  if (!kind || !hp || !column || !stick || !wave) return null;
  if (typeof o.motion !== 'string') return null;
  return { kind, hp, column, stick, motion: o.motion.slice(0, 80), wave };
}

function bandNumber(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 7 ? v : undefined;
}

/**
 * The typing cabinet's fact-blind view of the level it is about to play, or
 * null. The stack is a closed set, the bands are the seven the cabinet has,
 * and every free-text field is cut to a length, so nothing longer than a
 * request can be smuggled through the route into the prompt.
 */
export function parseEndlessView(raw: unknown): EndlessView | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const stack = oneOf(o.stack, STACKS);
  const bandMin = bandNumber(o.bandMin);
  const bandMax = bandNumber(o.bandMax);
  if (!stack || bandMin === undefined || bandMax === undefined) return null;
  if (bandMax < bandMin) return null;
  if (typeof o.product !== 'string' || o.product.trim() === '') return null;
  return {
    product: o.product.slice(0, ENDLESS_PRODUCT),
    stack,
    bandMin,
    bandMax,
    recent: parseStrings(o.recent, ENDLESS_MAX_RECENT, ENDLESS_STR),
    weak: parseStrings(o.weak, ENDLESS_MAX_WEAK, 2),
    newLevel: o.newLevel === true,
  };
}

/** Bounded list of bounded strings. Anything else in the array is dropped. */
export function parseStrings(raw: unknown, max: number, each: number): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (out.length >= max) break;
    if (typeof item === 'string') out.push(item.slice(0, each));
  }
  return out;
}

function sendJson(res: ServerResponse, code: number, body: unknown): void {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

/**
 * How reading a request body ended. Three outcomes, not two: the body
 * arrived, the cap was passed, or the request went away under us. They used
 * to share a `null` and every caller turned that `null` into 413 `too large`,
 * so a connection reset mid-upload was reported to the page as a size refusal
 * and sent anyone debugging it at the wrong constant.
 */
export type BodyRead = { ok: Buffer } | { tooLarge: true } | { broken: true };

/** Read a request body, or say which way it did not arrive. */
export function readBody(req: IncomingMessage, cap: number): Promise<BodyRead> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let done = false;
    const finish = (value: BodyRead) => {
      if (done) return;
      done = true;
      resolve(value);
    };
    req.on('data', (chunk: Buffer) => {
      if (done) return;
      size += chunk.length;
      if (size > cap) {
        finish({ tooLarge: true });
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => finish({ ok: Buffer.concat(chunks) }));
    req.on('error', () => finish({ broken: true }));
    req.on('aborted', () => finish({ broken: true }));
  });
}

/** Serve one file out of the shell, or 404. */
async function serveFile(res: ServerResponse, playDir: string, urlPath: string): Promise<void> {
  const file = resolveUnder(playDir, urlPath);
  if (!file) {
    sendJson(res, 404, { error: 'not found' });
    return;
  }
  let target = file;
  try {
    const info = await stat(target);
    if (info.isDirectory()) {
      const index = resolveUnder(playDir, `${urlPath.replace(/\/+$/, '')}/index.html`);
      if (!index) {
        sendJson(res, 404, { error: 'not found' });
        return;
      }
      target = index;
      await stat(target);
    }
  } catch {
    sendJson(res, 404, { error: 'not found' });
    return;
  }
  res.statusCode = 200;
  res.setHeader('content-type', typeFor(target));
  // The shell is rebuilt under the same names on every release; a player
  // who upgrades must not be served yesterday's bundle out of the cache.
  res.setHeader('cache-control', 'no-cache');
  createReadStream(target)
    .on('error', () => {
      if (!res.headersSent) sendJson(res, 404, { error: 'not found' });
      else res.end();
    })
    .pipe(res);
}

/** Pass an allowlisted call to the daemon or the worker and stream it back. */
async function proxy(
  req: IncomingMessage,
  res: ServerResponse,
  base: string,
  rest: string,
  token: string | null,
): Promise<void> {
  const raw = req.url ?? '';
  const cut = raw.indexOf('?');
  const query = cut === -1 ? '' : raw.slice(cut);
  const target = `${base.replace(/\/$/, '')}${rest}${query}`;
  const headers: Record<string, string> = { accept: 'application/json' };
  if (jsonType(req.headers['content-type'])) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  const method = req.method ?? 'GET';
  let body: Buffer | null = null;
  if (method === 'POST') {
    // Answered off the declared length where there is one, the way the say
    // and endless routes do: the cap is reachable in the middle of a body,
    // and a refusal that arrives after the socket has been torn down reads
    // to the page as a dropped connection rather than as a size.
    const declared = Number(req.headers['content-length'] ?? NaN);
    if (Number.isFinite(declared) && declared > PROXY_MAX_BYTES) {
      sendJson(res, 413, { error: 'too large' });
      req.resume();
      return;
    }
    const read = await readBody(req, PROXY_MAX_BYTES);
    if ('tooLarge' in read) {
      sendJson(res, 413, { error: 'too large' });
      return;
    }
    // The request went away before it finished. There is nobody left to
    // answer, so nothing is answered — and in particular not 413, which
    // would name a cap that was never reached.
    if ('broken' in read) return;
    body = read.ok;
  }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), PROXY_TIMEOUT_MS);
  try {
    const upstream = await fetch(target, {
      method,
      headers,
      signal: ctl.signal,
      ...(body ? { body: new Uint8Array(body) } : {}),
    });
    res.statusCode = upstream.status;
    const type = upstream.headers.get('content-type');
    if (type) res.setHeader('content-type', type);
    if (!upstream.body) {
      res.end();
      return;
    }
    await new Promise<void>((resolve) => {
      const stream = Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]);
      stream.on('error', () => {
        res.end();
        resolve();
      });
      res.on('close', () => {
        // The browser hung up. Nothing will read the rest of this, so stop
        // pulling it: without the abort the socket to the daemon (or the
        // voice worker) stays open streaming a completion into nowhere until
        // PROXY_TIMEOUT_MS, and a player who reloads during a long generate
        // leaves one of those behind every time.
        ctl.abort();
        stream.destroy();
        resolve();
      });
      stream.on('end', () => resolve());
      stream.pipe(res);
    });
  } catch {
    // The daemon or the worker is not up, or took too long. The shell
    // already falls back to the scripted seat on a failed call.
    if (!res.headersSent) sendJson(res, 502, { error: 'no answer' });
    else res.end();
  } finally {
    clearTimeout(timer);
  }
}

/** The say seat's node side (G14), as the dev server runs it. */
function sayRoute(opts: ServeOpts) {
  let lastAt = 0;
  let busy = false;
  return async function handleSay(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'post only' });
      req.resume();
      return;
    }
    if (!jsonType(req.headers['content-type'])) {
      sendJson(res, 415, { error: 'json only' });
      req.resume();
      return;
    }
    if (!opts.sayModule) {
      sendJson(res, 503, { error: 'no cabinet server built' });
      req.resume();
      return;
    }
    const declared = Number(req.headers['content-length'] ?? NaN);
    if (Number.isFinite(declared) && declared > SAY_MAX_BYTES) {
      sendJson(res, 413, { error: 'too large' });
      req.resume();
      return;
    }
    const now = Date.now();
    if (busy || now - lastAt < SAY_MIN_INTERVAL_MS) {
      sendJson(res, 429, { error: 'slow down' });
      req.resume();
      return;
    }
    busy = true;
    lastAt = now;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const read = await readBody(req, SAY_MAX_BYTES);
      if ('tooLarge' in read) {
        sendJson(res, 413, { error: 'too large' });
        return;
      }
      // The request went away mid-upload; nobody is left to be told, and
      // 413 would name a cap that was never reached.
      if ('broken' in read) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(read.ok.toString('utf8') || '{}');
      } catch {
        sendJson(res, 400, { error: 'no answer' });
        return;
      }
      const body = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
      const view = parseSeatView(body.view);
      if (!view) {
        sendJson(res, 400, { error: 'no answer' });
        return;
      }
      const cs = (await import(pathToFileURL(opts.sayModule).href)) as {
        askSayFor: (
          view: unknown,
          recent: readonly string[],
          says: number,
          o: { anthropicKey: string | null; ollamaUrl: string; models: readonly string[] },
        ) => Promise<unknown>;
      };
      const says = Number(body.says ?? 0);
      const work = cs.askSayFor(
        view,
        parseStrings(body.recent, SAY_MAX_RECENT, SAY_STR),
        Number.isFinite(says) ? Math.max(0, Math.min(10_000, Math.floor(says))) : 0,
        {
          anthropicKey: opts.anthropicKey,
          ollamaUrl: `${opts.ollamaUrl.replace(/\/$/, '')}/api/chat`,
          models: parseStrings(body.models, SAY_MAX_MODELS, 128),
        },
      );
      const answer = await Promise.race([
        work,
        new Promise<never>((_, rej) => {
          timer = setTimeout(() => rej(new Error('no answer')), SAY_TIMEOUT_MS);
        }),
      ]);
      sendJson(res, 200, answer);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sendJson(res, 200, { error: /retired/i.test(msg) ? 'model retired' : 'no answer' });
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      busy = false;
    }
  };
}

/** The endless seat's node side (G28 amended), as the dev server runs it. */
function endlessRoute(opts: ServeOpts) {
  let lastAt = 0;
  let busy = false;
  const module = opts.endlessModule === undefined ? opts.sayModule : opts.endlessModule;
  return async function handleEndless(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'post only' });
      req.resume();
      return;
    }
    if (!jsonType(req.headers['content-type'])) {
      sendJson(res, 415, { error: 'json only' });
      req.resume();
      return;
    }
    if (!module) {
      sendJson(res, 503, { error: 'no cabinet server built' });
      req.resume();
      return;
    }
    const declared = Number(req.headers['content-length'] ?? NaN);
    if (Number.isFinite(declared) && declared > SAY_MAX_BYTES) {
      sendJson(res, 413, { error: 'too large' });
      req.resume();
      return;
    }
    const now = Date.now();
    if (busy || now - lastAt < SAY_MIN_INTERVAL_MS) {
      sendJson(res, 429, { error: 'slow down' });
      req.resume();
      return;
    }
    busy = true;
    lastAt = now;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const read = await readBody(req, SAY_MAX_BYTES);
      if ('tooLarge' in read) {
        sendJson(res, 413, { error: 'too large' });
        return;
      }
      // The request went away mid-upload; nobody is left to be told, and
      // 413 would name a cap that was never reached.
      if ('broken' in read) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(read.ok.toString('utf8') || '{}');
      } catch {
        sendJson(res, 400, { error: 'no answer' });
        return;
      }
      const body = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
      const view = parseEndlessView(body.view);
      if (!view) {
        sendJson(res, 400, { error: 'no answer' });
        return;
      }
      const cs = (await import(pathToFileURL(module).href)) as {
        askEndlessFor: (
          view: unknown,
          o: { anthropicKey: string | null; ollamaUrl: string; models: readonly string[] },
        ) => Promise<unknown>;
      };
      const work = cs.askEndlessFor(view, {
        anthropicKey: opts.anthropicKey,
        ollamaUrl: `${opts.ollamaUrl.replace(/\/$/, '')}/api/chat`,
        models: parseStrings(body.models, SAY_MAX_MODELS, 128),
      });
      const answer = await Promise.race([
        work,
        new Promise<never>((_, rej) => {
          timer = setTimeout(() => rej(new Error('no answer')), ENDLESS_TIMEOUT_MS);
        }),
      ]);
      sendJson(res, 200, answer);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sendJson(res, 200, { error: /retired/i.test(msg) ? 'model retired' : 'no answer' });
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      busy = false;
    }
  };
}

/**
 * The names this cabinet answers to. Binding `127.0.0.1` stops another
 * machine from reaching the server, and it does nothing at all about DNS
 * rebinding: a page the player is looking at while the cabinet runs can point
 * its own hostname at `127.0.0.1` and then read every answer here
 * same-origin, on a port it can guess (7777 and 7778). What is behind that
 * is the player's model list, chat and generate against their daemon, the
 * voice worker with `VOICE_TOKEN` attached on this side, and `/cabinet/say`,
 * which spends `ANTHROPIC_API_KEY`. The rebound page cannot forge the `Host`
 * header, so the header is the check.
 */
const OWN_NAMES = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

/** An authority split into its name and port; brackets stay on an IPv6 name. */
function splitAuthority(raw: string): { name: string; port: string } | null {
  const v = raw.trim();
  if (v === '') return null;
  if (v.startsWith('[')) {
    const end = v.indexOf(']');
    if (end === -1) return null;
    const rest = v.slice(end + 1);
    if (rest === '') return { name: v.slice(0, end + 1), port: '' };
    if (!rest.startsWith(':')) return null;
    return { name: v.slice(0, end + 1), port: rest.slice(1) };
  }
  const parts = v.split(':');
  if (parts.length === 1) return { name: parts[0] ?? '', port: '' };
  if (parts.length !== 2) return null;
  return { name: parts[0] ?? '', port: parts[1] ?? '' };
}

/**
 * Is this `Host` header this cabinet's own address on this port? A missing
 * header, two of them, a name that is not loopback, or the right name on
 * somebody else's port are all somebody else's request.
 */
export function ownHost(raw: string | string[] | undefined, port: number): boolean {
  if (typeof raw !== 'string') return false;
  const authority = splitAuthority(raw);
  if (!authority) return false;
  if (!OWN_NAMES.has(authority.name.toLowerCase())) return false;
  return authority.port === String(port);
}

/**
 * Is this `Origin` this cabinet's own? No `Origin` is the page's own GET and
 * is ours; `null` (a sandboxed frame, a redirected form) is not, and neither
 * is https, since this server only ever speaks plain http on loopback.
 */
export function ownOrigin(raw: string | string[] | undefined, port: number): boolean {
  if (raw === undefined) return true;
  if (typeof raw !== 'string') return false;
  const match = /^http:\/\/(.+)$/i.exec(raw.trim());
  if (!match) return false;
  return ownHost(match[1], port);
}

/** Build the cabinet's server. Nothing listens until `listen` is called. */
export function createCabinetServer(opts: ServeOpts): Server {
  const handleSay = sayRoute(opts);
  const handleEndless = endlessRoute(opts);
  return createServer((req, res) => {
    void (async () => {
      // Before routing, and so before any socket is opened towards the
      // daemon or the worker: a request that is not addressed to this
      // cabinet by name is not answered at all.
      const port = req.socket.localPort ?? 0;
      if (!ownHost(req.headers.host, port)) {
        sendJson(res, 403, { error: 'wrong host' });
        req.resume();
        return;
      }
      if (!ownOrigin(req.headers.origin, port)) {
        sendJson(res, 403, { error: 'wrong origin' });
        req.resume();
        return;
      }
      const p = pathOnly(req.url);
      if (p === SAY_PATH) {
        await handleSay(req, res);
        return;
      }
      if (p === ENDLESS_PATH) {
        await handleEndless(req, res);
        return;
      }
      const up = upstreamFor(req.url);
      if (up) {
        const rest = restAfter(PREFIXES[up], req.url);
        const base = up === 'ollama' ? opts.ollamaUrl : opts.voiceUrl;
        // No upstream configured is the same answer as a path off the
        // allowlist: 404, and no socket opened towards anything.
        if (!base || !allowed(up, req.method ?? 'GET', rest)) {
          sendJson(res, 404, { error: 'not found' });
          req.resume();
          return;
        }
        await proxy(req, res, base, rest, up === 'voice' ? opts.voiceToken : null);
        return;
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        sendJson(res, 405, { error: 'get only' });
        req.resume();
        return;
      }
      await serveFile(res, opts.playDir, p);
    })().catch(() => {
      if (!res.headersSent) sendJson(res, 500, { error: 'no answer' });
      else res.end();
    });
  });
}

/** Listen on the first free port at or above `from`, on loopback. */
export function listenFrom(server: Server, from: number, tries = 20): Promise<number> {
  return new Promise((resolve, reject) => {
    let port = from;
    let left = tries;
    const attempt = () => {
      const onError = (err: NodeJS.ErrnoException) => {
        server.removeListener('error', onError);
        if (err.code === 'EADDRINUSE' && left > 0) {
          left -= 1;
          port += 1;
          attempt();
          return;
        }
        reject(err);
      };
      server.once('error', onError);
      server.listen(port, HOST, () => {
        server.removeListener('error', onError);
        resolve(port);
      });
    };
    attempt();
  });
}
