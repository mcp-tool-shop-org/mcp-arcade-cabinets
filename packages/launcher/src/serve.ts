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

/**
 * A seat's module, or why there is none.
 *
 * A path lights the seat. `DARK` is a cabinet that does not have this seat at
 * all — the shooter has no endless seat, the typing cabinet has no say seat —
 * and is answered 404, because nothing here is broken. `null` is a module the
 * package expected on disk and did not find, which is a broken install and is
 * answered 503. The two used to share `503 no cabinet server built`, so a
 * player probing a seat that was never lit was told their download was bad.
 */
export const DARK = 'dark';

/**
 * A module path, `DARK`, or null. Spelled `string | null` because `DARK` is a
 * string: the sentinel is the value, not a second type, and no real module
 * path is ever the word `dark`.
 */
export type SeatModule = string | null;

/** What the launcher needs to know to stand a cabinet up. */
export interface ServeOpts {
  /** The built shell (`index.html`, `assets`, `sprites`, `tracks`). */
  playDir: string;
  /**
   * The bundled cabinet-server, for the say seat. `DARK` is a cabinet with no
   * say seat; null is one whose bundle is missing.
   */
  sayModule: SeatModule;
  /**
   * The bundled cabinet-server for the endless seat. The same file as
   * `sayModule` in the shipped package, and named separately only so a
   * caller can light one seat without the other. Absent means the say
   * module; `DARK` is a cabinet with no endless seat, and null is one whose
   * bundle is missing.
   */
  endlessModule?: SeatModule;
  /** The player's Ollama daemon. */
  ollamaUrl: string;
  /**
   * The host-side voice worker (`pnpm voice`), when they run one. Null does
   * not proxy `/voice` at all: the path answers `503 no upstream` before a
   * socket is opened. It used to answer 404, the same word as a path the
   * allowlist does not name and as a file the shell does not have, which is
   * three different fixes behind one word.
   */
  voiceUrl: string | null;
  /** The worker's bearer. Added here; the browser never holds it. */
  voiceToken: string | null;
  /** Sits the Claude tier of the say seat. Never reaches the browser. */
  anthropicKey: string | null;
  /**
   * Where the cabinet says, in words, why a call to the daemon or the worker
   * came back empty. The page is told `no answer` on purpose — it has a
   * scripted fallback and no business knowing more — but the person who ran
   * `npx` was getting the same one word for a daemon that is not running, an
   * address with a typo in it, a worker that is down and a tag the host has
   * retired. The launcher points this at stderr; a test points it at an array.
   */
  onTrouble?: (line: string) => void;
}

/** A network seat a cabinet reaches out to, in the words a player would use. */
export type TroubleSeat = 'daemon' | 'worker';

const SEAT_WORD: Record<TroubleSeat, string> = {
  daemon: 'the daemon',
  worker: 'the voice worker',
};

function errName(err: unknown): string {
  return err instanceof Error ? err.name : '';
}

function errCode(err: unknown): string {
  let cur: unknown = err;
  for (let i = 0; i < 4 && cur && typeof cur === 'object'; i += 1) {
    if ('code' in cur && typeof cur.code === 'string') return cur.code;
    cur = 'cause' in cur ? cur.cause : undefined;
  }
  return '';
}

/**
 * Why a proxied call came back with nothing, said the way the cabinet says
 * everything else. The address is in the line because the misdiagnosis this
 * cures is a typo in OLLAMA_URL that reads exactly like a daemon that is not
 * running. No file path and no stack ever goes in here.
 */
export function troubleLine(seat: TroubleSeat, url: string, err: unknown): string {
  const who = SEAT_WORD[seat];
  const name = errName(err);
  if (name === 'TimeoutError' || name === 'AbortError') {
    return `${who} at ${url} took too long to answer`;
  }
  const code = errCode(err);
  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'EHOSTUNREACH') {
    return `${who} at ${url} is not running, or is not at that address`;
  }
  return `${who} at ${url} did not answer`;
}

/**
 * What the last-resort catch says in the terminal, in the cabinet's one voice.
 * The error object used to be dropped entirely; this reduces it to a cause
 * word the way `troubleLine` does, and carries no stack and no path.
 */
export function faultLine(err: unknown): string {
  const why = errCode(err) || errName(err);
  const said = 'the cabinet could not answer that request';
  return why ? `${said} (${why})` : said;
}

/**
 * A bad `OLLAMA_URL` or `VOICE_URL`, in the shape every other halt takes:
 * the headline, a blank line, and a `next:` naming the variable to set. The
 * remedy used to be folded into the sentence as an example, which made this
 * the one halt in the launcher with no `next:` line at all.
 */
export function seatHaltLines(bad: string): string[] {
  const name = bad.split(' ')[0] ?? 'the address';
  return [bad, '', `next: set ${name} to an http:// address, or unset it for the default`];
}

/**
 * An address this cabinet will actually try to open a socket to, or the line
 * that says why not. `--port` has been held to a stated shape for a while;
 * the two environment variables every session depends on had none, so a
 * scheme-less or typo'd `OLLAMA_URL` started clean and turned up later as the
 * proxy's `no answer`, which reads exactly like a daemon that is not running.
 */
export function checkSeatUrl(name: string, raw: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    // The likeliest typo lands here — `OLLAMA_URL=127.0.0.1:11434`, which
    // `new URL` refuses because a scheme may not start with a digit — and
    // being shown the address you believe you typed is no help at all. The
    // example says what an address is here.
    return `${name} is not an address, got ${raw}; it wants a scheme, like http://127.0.0.1:11434`;
  }
  // `new URL('localhost:11434')` parses, with the host taken for the scheme,
  // so a named host reaches this branch rather than the one above. Left
  // alone it is a request the cabinet can never send.
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return `${name} wants an http:// or https:// address, got ${raw}`;
  }
  if (parsed.hostname === '') return `${name} names no host, got ${raw}`;
  return null;
}

/** What the cabinet says when the host has retired the tag a seat is on. */
export function retiredLine(seat: TroubleSeat): string {
  return `${SEAT_WORD[seat]} says that model tag is retired; pick another seat`;
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
 * A refusal a person is going to read in a browser window rather than a
 * script is going to parse. Two words of JSON rendered as source is a correct
 * answer and an unhelpful one; the paths a script calls keep their JSON.
 */
function sendText(res: ServerResponse, code: number, line: string): void {
  res.statusCode = code;
  res.setHeader('content-type', 'text/plain; charset=utf-8');
  res.end(`${line}\n`);
}

/**
 * The cap refusal, carrying the number it met. Every size refusal used to be
 * the same two words while the cap behind it differed by route — 1 MiB on the
 * proxy, 32 KiB on the say and endless seats — so a page collecting 413s had
 * no way to tell which limit it had reached.
 */
function sendTooLarge(res: ServerResponse, cap: number): void {
  sendJson(res, 413, { error: 'too large', hint: `at most ${Math.floor(cap / 1024)} KB` });
}

/**
 * The two refusals that used to share `slow down`. One is an interval and one
 * is a call already in flight, and a client with nothing but the word has to
 * guess at both the cause and the wait. `retry-after` is in seconds, and one
 * is the smallest it can say.
 */
function sendSlowDown(res: ServerResponse): void {
  res.setHeader('retry-after', '1');
  sendJson(res, 429, {
    error: 'slow down',
    hint: `one call at a time, and at most one every ${SAY_MIN_INTERVAL_MS} ms`,
  });
}

function sendBusy(res: ServerResponse): void {
  res.setHeader('retry-after', '1');
  sendJson(res, 429, { error: 'busy', hint: 'a call is already in flight' });
}

/**
 * A seat this cabinet does not have. Not 503: nothing is missing and there is
 * nothing to rebuild, so a 503 sent a player off to repair a download that was
 * fine. Both routes are registered on both packages so the shape of the server
 * is one shape; which of them answers is the cabinet's design.
 */
function sendNoSuchSeat(res: ServerResponse, seat: 'say' | 'endless'): void {
  sendJson(res, 404, {
    error: 'no such seat',
    hint: `this cabinet does not light the ${seat} seat`,
  });
}

/** A seat whose bundle was expected in this package and is not there. */
function sendNoBundle(res: ServerResponse): void {
  sendJson(res, 503, {
    error: 'no cabinet server built',
    hint: 'this package is missing dist/cabinet-server.js',
  });
}

/**
 * The two 400s the seat routes answer. They used to say `no answer`, which is
 * what the seat says when it was asked and said nothing — so a client with a
 * slightly wrong body went off to debug a daemon that had never been called.
 */
function sendBadJson(res: ServerResponse): void {
  sendJson(res, 400, { error: 'bad json', hint: 'the body must be JSON' });
}

function sendBadView(res: ServerResponse): void {
  sendJson(res, 400, { error: 'bad view', hint: 'view must be the seat view this route takes' });
}

/**
 * Whether each seat is answering, so a line is said on the change rather than
 * on every call.
 *
 * `onTrouble` had no memory: a daemon that is not running repeated one
 * identical sentence for as long as the page kept probing — the shell
 * re-probes on the menu and on every model refresh — and the mirror-image
 * case was worse, because when the daemon came back nothing was said at all
 * and the operator's last word on the subject was a failure that was no
 * longer true.
 */
export function seatWatch(onTrouble?: (line: string) => void) {
  const state = new Map<TroubleSeat, 'answering' | 'quiet'>();
  return {
    /** A call to this seat failed. Says the cause the first time only. */
    trouble(seat: TroubleSeat, url: string, err: unknown): void {
      if (state.get(seat) === 'quiet') return;
      state.set(seat, 'quiet');
      onTrouble?.(troubleLine(seat, url, err));
    },
    /** A call to this seat came back. Says so only when it had gone quiet. */
    answering(seat: TroubleSeat, url: string): void {
      if (state.get(seat) !== 'quiet') {
        state.set(seat, 'answering');
        return;
      }
      state.set(seat, 'answering');
      onTrouble?.(`${SEAT_WORD[seat]} at ${url} is answering again`);
    },
  };
}

/** What `createCabinetServer` hands the proxy to keep the seats' state in. */
export type SeatWatch = ReturnType<typeof seatWatch>;

/**
 * How long a proxied call may be silent before the cabinet says it is still
 * waiting. `PROXY_TIMEOUT_MS` is two minutes, which is the right ceiling for
 * a cold model load on a small GPU and far too long to say nothing for: a
 * daemon that is merely slow and one that is wedged read exactly the same
 * until the abort fires.
 */
const PROXY_SLOW_MS = 10_000;

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

/**
 * What a file path that is not in the shell is told. This is the refusal a
 * person meets most often — a mistyped address bar, a bookmark from an older
 * shell — and it is the one `sendText`'s rule was written for: nothing here is
 * parsed by a script, because every path a script calls is a seat or a proxy
 * prefix and is answered before this route is reached.
 */
export function notFoundLine(urlPath: string, port: number): string {
  return `this cabinet has nothing at ${urlPath}; the game is at http://${HOST}:${port}/`;
}

/** Serve one file out of the shell, or say where the game is. */
async function serveFile(
  res: ServerResponse,
  playDir: string,
  urlPath: string,
  port: number,
): Promise<void> {
  const miss = () => sendText(res, 404, notFoundLine(urlPath, port));
  const file = resolveUnder(playDir, urlPath);
  if (!file) {
    miss();
    return;
  }
  let target = file;
  try {
    const info = await stat(target);
    if (info.isDirectory()) {
      const index = resolveUnder(playDir, `${urlPath.replace(/\/+$/, '')}/index.html`);
      if (!index) {
        miss();
        return;
      }
      target = index;
      await stat(target);
    }
  } catch {
    miss();
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
  seat: TroubleSeat,
  watch: SeatWatch,
  onTrouble?: (line: string) => void,
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
      sendTooLarge(res, PROXY_MAX_BYTES);
      req.resume();
      return;
    }
    const read = await readBody(req, PROXY_MAX_BYTES);
    if ('tooLarge' in read) {
      sendTooLarge(res, PROXY_MAX_BYTES);
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
  // Ten seconds of silence is a story; two minutes of it is not. The line
  // costs nothing when the daemon is healthy, because the headers clear the
  // timer long before it fires, and `unref` keeps it from holding the
  // process open on its own.
  const slow = setTimeout(() => {
    onTrouble?.(`${SEAT_WORD[seat]} at ${base} is taking a while (still waiting)`);
  }, PROXY_SLOW_MS);
  slow.unref();
  try {
    const upstream = await fetch(target, {
      method,
      headers,
      signal: ctl.signal,
      ...(body ? { body: new Uint8Array(body) } : {}),
    });
    clearTimeout(slow);
    watch.answering(seat, base);
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
  } catch (err: unknown) {
    // The daemon or the worker is not up, or took too long. The shell
    // already falls back to the scripted seat on a failed call; the person
    // who started the cabinet gets the cause in words — once, on the way
    // down, and once more on the way back up.
    watch.trouble(seat, base, err);
    if (!res.headersSent) {
      sendJson(res, 502, {
        error: 'upstream quiet',
        hint: 'the daemon or the worker did not answer',
      });
    } else res.end();
  } finally {
    clearTimeout(timer);
    clearTimeout(slow);
  }
}

/**
 * The say seat's node side (G14), as the dev server runs it.
 *
 * A failed ask answers 200 on purpose: the page wants the scripted fallback
 * and not a thrown fetch. That leaves the status line saying success for a
 * seat that answered nothing, which is fine for the page and wrong for
 * everything else on loopback — a curl probe, a test, an operator checking
 * whether the seat works. So the status line is the page's contract and the
 * body is everyone else's: `ok` is true on the good path and false on the
 * two failures, beside the `error` word the page already reads.
 */
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
    if (opts.sayModule === DARK) {
      sendNoSuchSeat(res, 'say');
      req.resume();
      return;
    }
    if (!opts.sayModule) {
      sendNoBundle(res);
      req.resume();
      return;
    }
    const declared = Number(req.headers['content-length'] ?? NaN);
    if (Number.isFinite(declared) && declared > SAY_MAX_BYTES) {
      sendTooLarge(res, SAY_MAX_BYTES);
      req.resume();
      return;
    }
    if (busy) {
      sendBusy(res);
      req.resume();
      return;
    }
    const now = Date.now();
    if (now - lastAt < SAY_MIN_INTERVAL_MS) {
      sendSlowDown(res);
      req.resume();
      return;
    }
    busy = true;
    lastAt = now;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const read = await readBody(req, SAY_MAX_BYTES);
      if ('tooLarge' in read) {
        sendTooLarge(res, SAY_MAX_BYTES);
        return;
      }
      // The request went away mid-upload; nobody is left to be told, and
      // 413 would name a cap that was never reached.
      if ('broken' in read) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(read.ok.toString('utf8') || '{}');
      } catch {
        sendBadJson(res);
        return;
      }
      const body = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
      const view = parseSeatView(body.view);
      if (!view) {
        sendBadView(res);
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
      sendJson(res, 200, { ok: true, ...(answer as Record<string, unknown>) });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // A retired tag and a quiet seat read the same to the page, which wants
      // only the fallback. They do not read the same to the person running
      // the cabinet: one is fixed by picking another seat, the other by
      // starting the daemon. The address is not named here because this seat
      // may be the hosted tier rather than the local daemon.
      const gone = /retired/i.test(msg);
      opts.onTrouble?.(gone ? retiredLine('daemon') : 'the seat did not answer');
      sendJson(res, 200, { ok: false, error: gone ? 'model retired' : 'no answer' });
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      busy = false;
    }
  };
}

/**
 * The endless seat's node side (G28 amended), as the dev server runs it.
 *
 * The 200-with-an-error is the say seat's choice for the say seat's reason,
 * and carries the same `ok` in the body: the status line is what the page
 * reads, and the body is what anything else on loopback reads.
 */
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
    if (module === DARK) {
      sendNoSuchSeat(res, 'endless');
      req.resume();
      return;
    }
    if (!module) {
      sendNoBundle(res);
      req.resume();
      return;
    }
    const declared = Number(req.headers['content-length'] ?? NaN);
    if (Number.isFinite(declared) && declared > SAY_MAX_BYTES) {
      sendTooLarge(res, SAY_MAX_BYTES);
      req.resume();
      return;
    }
    if (busy) {
      sendBusy(res);
      req.resume();
      return;
    }
    const now = Date.now();
    if (now - lastAt < SAY_MIN_INTERVAL_MS) {
      sendSlowDown(res);
      req.resume();
      return;
    }
    busy = true;
    lastAt = now;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const read = await readBody(req, SAY_MAX_BYTES);
      if ('tooLarge' in read) {
        sendTooLarge(res, SAY_MAX_BYTES);
        return;
      }
      // The request went away mid-upload; nobody is left to be told, and
      // 413 would name a cap that was never reached.
      if ('broken' in read) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(read.ok.toString('utf8') || '{}');
      } catch {
        sendBadJson(res);
        return;
      }
      const body = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
      const view = parseEndlessView(body.view);
      if (!view) {
        sendBadView(res);
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
      sendJson(res, 200, { ok: true, ...(answer as Record<string, unknown>) });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // A retired tag and a quiet seat read the same to the page, which wants
      // only the fallback. They do not read the same to the person running
      // the cabinet: one is fixed by picking another seat, the other by
      // starting the daemon. The address is not named here because this seat
      // may be the hosted tier rather than the local daemon.
      const gone = /retired/i.test(msg);
      opts.onTrouble?.(gone ? retiredLine('daemon') : 'the seat did not answer');
      sendJson(res, 200, { ok: false, error: gone ? 'model retired' : 'no answer' });
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
  const watch = seatWatch(opts.onTrouble);
  // The rebinding refusals are said in the terminal once and then not again:
  // a page that is probing will trip them as fast as it can, and the
  // operator needs to know it happened rather than to watch it happen.
  let saidHost = false;
  let saidOrigin = false;
  return createServer((req, res) => {
    void (async () => {
      // Before routing, and so before any socket is opened towards the
      // daemon or the worker: a request that is not addressed to this
      // cabinet by name is not answered at all.
      const port = req.socket.localPort ?? 0;
      // Who the refusal is written for. A script calling the proxies or the
      // seats parses JSON; a player who typed their machine's name or a VPN
      // address into the bar is looking at a browser window, and two words
      // of JSON rendered as source tells them nothing about what to type
      // instead.
      const forScript =
        upstreamFor(req.url) !== null ||
        pathOnly(req.url) === SAY_PATH ||
        pathOnly(req.url) === ENDLESS_PATH;
      if (!ownHost(req.headers.host, port)) {
        const name = typeof req.headers.host === 'string' ? req.headers.host : '(no Host header)';
        if (!saidHost) {
          saidHost = true;
          opts.onTrouble?.(`something asked this cabinet for ${name}; it answers to ${HOST} only`);
        }
        if (forScript) sendJson(res, 403, { error: 'wrong host' });
        else {
          sendText(
            res,
            403,
            `this cabinet answers to http://${HOST}:${port}/ only; open that address instead`,
          );
        }
        req.resume();
        return;
      }
      if (!ownOrigin(req.headers.origin, port)) {
        const from =
          typeof req.headers.origin === 'string' ? req.headers.origin : '(no Origin header)';
        if (!saidOrigin) {
          saidOrigin = true;
          opts.onTrouble?.(
            `a page at ${from} asked this cabinet for something; it answers pages it served itself`,
          );
        }
        if (forScript) sendJson(res, 403, { error: 'wrong origin' });
        else sendText(res, 403, 'a page at another address may not read this cabinet');
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
        // Three different fixes used to share one word. A verb off the
        // allowlist, a file that is not in the shell and an upstream this
        // cabinet was never given all answered `404 not found`, so a
        // developer who added a call to the page and forgot `allow.ts` got
        // the same answer as a typo in an asset path — which is the drift
        // the allowlist's own "keep the two in step" note is about, with no
        // way to notice it. No socket is opened towards anything either way.
        if (!base) {
          sendJson(res, 503, { error: 'no upstream' });
          req.resume();
          return;
        }
        const method = req.method ?? 'GET';
        if (!allowed(up, method, rest)) {
          // Always either a bug in the shell or somebody probing, so it is
          // worth a line in the terminal that started the cabinet.
          opts.onTrouble?.(
            `the page asked for ${method} ${rest}, which this cabinet does not proxy`,
          );
          sendJson(res, 403, { error: 'not proxied' });
          req.resume();
          return;
        }
        await proxy(
          req,
          res,
          base,
          rest,
          up === 'voice' ? opts.voiceToken : null,
          up === 'voice' ? 'worker' : 'daemon',
          watch,
          opts.onTrouble,
        );
        return;
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        // Only a browser form or a stray fetch ever reaches this: every path
        // a script calls was answered above. So it is written for a reader.
        sendText(res, 405, 'this cabinet only serves the game here, and only to a GET');
        req.resume();
        return;
      }
      await serveFile(res, opts.playDir, p, port);
    })().catch((err: unknown) => {
      // The one failure the operator could not see: every other failure in
      // this file reaches `onTrouble`, and this one wrote nothing anywhere
      // while the page quietly fell back.
      opts.onTrouble?.(faultLine(err));
      if (!res.headersSent) sendJson(res, 500, { error: 'cabinet fault' });
      else res.end();
    });
  });
}

/**
 * Why the cabinet could not take a port, with enough on it for the caller to
 * word the failure. The old failure was the raw errno, and it printed two
 * numbers that contradicted each other: the prefix named the port the player
 * asked for and the errno text named the twenty-first port the walk reached,
 * with nothing saying where the second number came from.
 */
export class ListenTrouble extends Error {
  readonly code: string;
  /** The port the caller asked for. */
  readonly from: number;
  /** The port the walk was on when it gave up. */
  readonly port: number;

  constructor(cause: NodeJS.ErrnoException, from: number, port: number) {
    super(cause.message);
    this.name = 'ListenTrouble';
    this.code = cause.code ?? '';
    this.from = from;
    this.port = port;
  }
}

/**
 * What to tell the player about a failed listen. Pure, so the table of cases
 * is a test, and never a port the player did not name without saying where
 * that number came from.
 */
export function listenLines(err: unknown, from: number): string[] {
  if (!(err instanceof ListenTrouble)) {
    const msg = err instanceof Error ? err.message : String(err);
    return [`could not listen on ${from}: ${msg}`, '', 'next: pass --port <n>'];
  }
  if (err.code === 'EADDRINUSE') {
    return [
      err.port === err.from ? `port ${from} is busy` : `ports ${from}-${err.port} are all busy`,
      '',
      'next: free one, or pass --port <n>',
    ];
  }
  if (err.code === 'EACCES') {
    return [
      `port ${err.port} needs a privilege this cabinet does not want`,
      '',
      'next: pass --port with something above 1024',
    ];
  }
  return [`could not listen on ${err.port}: ${err.message}`, '', 'next: pass --port <n>'];
}

/**
 * Listen on the first free port at or above `from`, on loopback.
 *
 * Both handlers come off on every outcome. A fresh `listening` callback per
 * attempt, which is what this used to do, put Node's own
 * `MaxListenersExceededWarning` in the player's terminal after ten busy
 * ports — an internal diagnostic naming a leak they cannot act on, in the
 * middle of a startup that otherwise speaks in sentences.
 */
export function listenFrom(server: Server, from: number, tries = 20): Promise<number> {
  return new Promise((resolve, reject) => {
    let port = from;
    let left = tries;
    const attempt = () => {
      const at = port;
      // Declarations, not `const` arrows: each one names the other, and a
      // hoisted pair cannot be reached in its own dead zone.
      function onError(err: NodeJS.ErrnoException): void {
        server.removeListener('error', onError);
        server.removeListener('listening', onListen);
        if (err.code === 'EADDRINUSE' && left > 0) {
          left -= 1;
          port += 1;
          attempt();
          return;
        }
        reject(new ListenTrouble(err, from, at));
      }
      function onListen(): void {
        server.removeListener('error', onError);
        resolve(at);
      }
      server.once('error', onError);
      server.once('listening', onListen);
      server.listen(at, HOST);
    };
    attempt();
  });
}
