import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { defineConfig, type Plugin } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));

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
  return {
    name: 'cabinet-say',
    configureServer(server) {
      server.middlewares.use('/cabinet/say', (req, res) => {
        const send = (body: unknown) => {
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(body));
        };
        if (req.method !== 'POST') {
          res.statusCode = 405;
          send({ error: 'post only' });
          return;
        }
        let raw = '';
        req.on('data', (chunk: Buffer) => {
          raw += chunk.toString('utf8');
        });
        req.on('end', () => {
          void (async () => {
            if (!existsSync(dist)) {
              send({ error: 'no cabinet server built' });
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
            const body = JSON.parse(raw || '{}') as {
              view?: unknown;
              recent?: string[];
              says?: number;
              models?: string[];
            };
            const ollama = process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434';
            const answer = await cs.askSayFor(
              body.view,
              Array.isArray(body.recent) ? body.recent.map(String) : [],
              Number(body.says ?? 0),
              {
                anthropicKey: process.env.ANTHROPIC_API_KEY ?? null,
                ollamaUrl: `${ollama.replace(/\/$/, '')}/api/chat`,
                models: Array.isArray(body.models) ? body.models.map(String) : [],
              },
            );
            send(answer);
          })().catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            send({ error: /retired/i.test(msg) ? 'model retired' : 'no answer' });
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
  plugins: [cabinetSay()],
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
