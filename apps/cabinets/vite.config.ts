import { existsSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { defineConfig, type Plugin } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));

const SAY_MAX_BYTES = 32 * 1024;
const SAY_MIN_INTERVAL_MS = 400;
const SAY_MAX_RECENT = 16;
const SAY_MAX_MODELS = 32;
const SAY_STR = 200;

const BOSS_KINDS = ['whisperer', 'menu', 'doorman'] as const;
const HP_WORDS = ['high', 'mid', 'low'] as const;
const COLUMNS = ['left', 'center', 'right'] as const;
const STICKS = ['still', 'left', 'right'] as const;
const WAVES = ['inspect', 'poison', 'rug', 'unlisted', 'breather'] as const;

function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T | undefined {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

function pathOnly(url: string | undefined): string {
  return (url ?? '/').split('?')[0] ?? '/';
}

function restAfter(prefix: string, url: string | undefined): string {
  const p = pathOnly(url);
  if (p === prefix) return '/';
  if (p.startsWith(`${prefix}/`)) {
    const rest = p.slice(prefix.length);
    return rest.startsWith('/') ? rest : `/${rest}`;
  }
  return p.startsWith('/') ? p : `/${p}`;
}

function jsonType(header: string | string[] | undefined): boolean {
  const raw = Array.isArray(header) ? header[0] : header;
  const type = String(raw ?? '')
    .split(';')[0]
    ?.trim()
    .toLowerCase();
  return type === 'application/json';
}

function parseSeatView(raw: unknown): {
  kind: (typeof BOSS_KINDS)[number];
  hp: (typeof HP_WORDS)[number];
  column: (typeof COLUMNS)[number];
  stick: (typeof STICKS)[number];
  motion: string;
  wave: (typeof WAVES)[number];
} | null {
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

function parseStrings(raw: unknown, max: number, each: number): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (out.length >= max) break;
    if (typeof item !== 'string') continue;
    out.push(item.slice(0, each));
  }
  return out;
}

function notFound(res: ServerResponse): void {
  res.statusCode = 404;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ error: 'not found' }));
}

/**
 * Dev-only reverse proxies stay on loopback, but the browser can still hit
 * the Vite port. Allow only the paths the shell uses; reject pull/delete/
 * create/generate and the worker's /stats.
 */
function devAllowlists(): Plugin {
  return {
    name: 'dev-allowlists',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const p = pathOnly(req.url);
        if (p === '/ollama' || p.startsWith('/ollama/')) {
          const rest = restAfter('/ollama', req.url);
          const method = req.method ?? 'GET';
          if (rest === '/api/tags' && method === 'GET') {
            next();
            return;
          }
          if (rest === '/api/chat' && method === 'POST') {
            next();
            return;
          }
          notFound(res);
          return;
        }
        if (p === '/voice' || p.startsWith('/voice/')) {
          const rest = restAfter('/voice', req.url);
          const method = req.method ?? 'GET';
          if (rest === '/health' && method === 'GET') {
            next();
            return;
          }
          if (rest === '/speak' && method === 'POST') {
            next();
            return;
          }
          if (method === 'GET' && /^\/audio\/[a-f0-9]{8,64}\.wav$/i.test(rest)) {
            next();
            return;
          }
          notFound(res);
          return;
        }
        next();
      });
    },
  };
}

/**
 * The say seat's node side (G14). The browser posts the boss's fact-blind
 * view, the round's recent lines and the say count; this runs the tiered
 * agent (a Claude agent when ANTHROPIC_API_KEY is set in the dev server's
 * environment, else a Cloud tag, else local) and answers with the say
 * tool's ungated arguments. The key never reaches the browser; the gate
 * runs in the browser's cabinet, where the line lands. Words only in the
 * answer: no status code, no model text, reaches the shell.
 */
function cabinetSay(): Plugin {
  const dist = path.resolve(here, '../../packages/cabinet-server/dist/index.js');
  let lastSayAt = 0;
  let sayBusy = false;
  return {
    name: 'cabinet-say',
    configureServer(server) {
      server.middlewares.use('/cabinet/say', (req: IncomingMessage, res: ServerResponse) => {
        const send = (body: unknown) => {
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(body));
        };
        const reject = (code: number, error: string) => {
          res.statusCode = code;
          send({ error });
          req.resume();
        };
        if (req.method !== 'POST') {
          reject(405, 'post only');
          return;
        }
        if (!jsonType(req.headers['content-type'])) {
          reject(415, 'json only');
          return;
        }
        const declared = Number(req.headers['content-length'] ?? NaN);
        if (Number.isFinite(declared) && declared > SAY_MAX_BYTES) {
          reject(413, 'too large');
          return;
        }
        const now = Date.now();
        if (sayBusy || now - lastSayAt < SAY_MIN_INTERVAL_MS) {
          reject(429, 'slow down');
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        let overflow = false;
        let finished = false;
        req.on('data', (chunk: Buffer) => {
          if (overflow || finished) return;
          size += chunk.length;
          if (size > SAY_MAX_BYTES) {
            overflow = true;
            reject(413, 'too large');
            req.destroy();
            return;
          }
          chunks.push(chunk);
        });
        req.on('end', () => {
          if (overflow || finished) return;
          finished = true;
          lastSayAt = Date.now();
          sayBusy = true;
          void (async () => {
            if (!existsSync(dist)) {
              res.statusCode = 503;
              send({ error: 'no cabinet server built' });
              return;
            }
            let parsed: unknown;
            try {
              parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
            } catch {
              res.statusCode = 400;
              send({ error: 'no answer' });
              return;
            }
            const body =
              parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
            const view = parseSeatView(body.view);
            if (!view) {
              res.statusCode = 400;
              send({ error: 'no answer' });
              return;
            }
            const cs = (await import(pathToFileURL(dist).href)) as {
              askSayFor: (
                view: unknown,
                recent: readonly string[],
                says: number,
                opts: {
                  anthropicKey: string | null;
                  ollamaUrl: string;
                  models: readonly string[];
                },
              ) => Promise<unknown>;
            };
            const ollama = process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434';
            const says = Number(body.says ?? 0);
            const answer = await cs.askSayFor(
              view,
              parseStrings(body.recent, SAY_MAX_RECENT, SAY_STR),
              Number.isFinite(says) ? Math.max(0, Math.min(10_000, Math.floor(says))) : 0,
              {
                anthropicKey: process.env.ANTHROPIC_API_KEY ?? null,
                ollamaUrl: `${ollama.replace(/\/$/, '')}/api/chat`,
                models: parseStrings(body.models, SAY_MAX_MODELS, 128),
              },
            );
            send(answer);
          })()
            .catch((err: unknown) => {
              const msg = err instanceof Error ? err.message : String(err);
              send({ error: /retired/i.test(msg) ? 'model retired' : 'no answer' });
            })
            .finally(() => {
              sayBusy = false;
            });
        });
      });
    },
  };
}

// The shell is built two ways: relative-base for the package's own dist, and
// under the landing site at /<repo>/play/ for GitHub Pages (PLAY_BASE and
// PLAY_OUT are set by the root `build:play` script). The say middleware and
// the Ollama proxy exist only on the dev server; Pages serves the game
// unchanged and cannot reach a daemon.
export default defineConfig({
  base: process.env.PLAY_BASE ?? './',
  build: { outDir: process.env.PLAY_OUT ?? 'dist', emptyOutDir: true },
  plugins: [devAllowlists(), cabinetSay()],
  server: {
    proxy: {
      '/ollama': {
        target: 'http://127.0.0.1:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, ''),
      },
      // The host-side voice worker (`pnpm voice`). Pages never has one.
      '/voice': {
        target: process.env.VOICE_URL ?? 'http://127.0.0.1:7788',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/voice/, ''),
        // The worker's bearer, when it has one, is added here on the node
        // side; the browser never holds it.
        ...(process.env.VOICE_TOKEN
          ? { headers: { authorization: `Bearer ${process.env.VOICE_TOKEN}` } }
          : {}),
      },
    },
  },
});
