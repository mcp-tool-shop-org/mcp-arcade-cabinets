// The stdio cabinet server. A headless round runs inside it (the sweeper
// bot as the ship, lamps kept up so every boss is met), and the five tools
// are the levers a model pulls on that round. stdout is the transport;
// nothing else is written there. Tools list at once: the sim is built
// before the transport connects.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import {
  createRoundState,
  DEFAULT_SECONDS,
  prepassRound,
  stepRound,
  type Round,
  type RoundInput,
  type RoundState,
} from '@mcp-arcade-cabinets/ghost-on-the-menu';
import { botFor } from '@mcp-arcade-cabinets/ghost-on-the-menu/src/play';
import { loadTape, type Tape } from '@mcp-arcade-cabinets/tape-core';

import { createCabinet, type Cabinet } from './cabinet';
import { CONTRACT, type ToolDef } from './contract';
import { hostForRound, tapeCards, type Live } from './host';
import { speakLine } from './voice';

/** The host-side voice worker; in the Catalog container, host.docker.internal. */
export const DEFAULT_VOICE_URL = 'http://127.0.0.1:7788';

export const SERVER_NAME = 'ghost-on-the-menu';
export const SERVER_VERSION = '0.4.0';

const here = path.dirname(fileURLToPath(import.meta.url));
/** `packages/cabinet-server/{src,dist}` → the repo's fixtures. Baked into the image later. */
export const DEFAULT_TAPES_DIR = path.resolve(here, '..', '..', '..', 'fixtures', 'tapes');

export function listTapes(dir: string): { name: string; tape: Tape }[] {
  const out: { name: string; tape: Tape }[] = [];
  for (const f of readdirSync(dir).sort()) {
    if (!f.endsWith('.tape.json')) continue;
    const name = f.replace(/\.tape\.json$/, '');
    try {
      out.push({ name, tape: loadTape(JSON.parse(readFileSync(path.join(dir, f), 'utf8'))) });
    } catch {
      /* a tape that does not load is not on the menu */
    }
  }
  return out;
}

function zodShape(def: ToolDef) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [k, p] of Object.entries(def.inputSchema.properties)) {
    shape[k] = 'enum' in p ? z.enum(p.enum as [string, ...string[]]) : z.string().max(p.maxLength);
  }
  return shape;
}

export interface HeadlessOpts {
  tapesDir?: string;
  /** Fixture name the round plays. */
  fixture?: string;
  tier?: 0 | 1 | 2 | 3;
  seed?: number;
  /** The voice worker's base url; null keeps the cabinet silent. */
  voiceUrl?: string | null;
}

/** A headless round the tools act on. Stepped by `step(dt)`; restarts at the scene. */
export function headlessRound(opts: HeadlessOpts = {}) {
  const dir = opts.tapesDir ?? DEFAULT_TAPES_DIR;
  const tapes = listTapes(dir);
  const fixture = opts.fixture ?? 'naive-ndjson';
  const found = tapes.find((t) => t.name === fixture) ?? tapes[0];
  if (!found) throw new Error(`no tapes under ${dir}`);
  const tier = opts.tier ?? 1;
  const makeRound = (): Round =>
    prepassRound(found.tape, {
      seconds: DEFAULT_SECONDS,
      tier,
      ...(opts.seed !== undefined ? { seed: opts.seed } : {}),
    });
  let round = makeRound();
  let state: RoundState = createRoundState(round);
  let bot = botFor('sweeper', round);
  const input: RoundInput = { left: false, right: false, fire: false };
  const live: Live = { round, state, input };
  const voiced = { asked: 0, ok: 0, failed: 0, noWorker: 0 };
  const voiceUrl = opts.voiceUrl === undefined ? DEFAULT_VOICE_URL : opts.voiceUrl;
  const host = hostForRound(() => live, {
    tapes: () => tapeCards(tapes),
    ...(voiceUrl
      ? {
          // The server has no speaker: a take is spoken, receipted and cached
          // by the worker; the receipt is the artifact. Silent when no worker.
          voice: (job) => {
            voiced.asked += 1;
            void speakLine(job, { url: voiceUrl }).then((a) => {
              if (a.status === 'voiced') voiced.ok += 1;
              else if (a.status === 'receipt failed') voiced.failed += 1;
              else voiced.noWorker += 1;
            });
          },
        }
      : {}),
  });
  const cabinet: Cabinet = createCabinet(host);
  const step = (dt: number) => {
    if (live.state.scene) {
      round = makeRound();
      state = createRoundState(round);
      bot = botFor('sweeper', round);
      live.round = round;
      live.state = state;
    }
    const next = bot(live.state);
    input.left = next.left;
    input.right = next.right;
    input.fire = next.fire;
    live.state.lives = live.state.maxLives;
    stepRound(live.state, input, dt);
    host.takeSfx();
  };
  return { cabinet, host, live, step, tapes, fixture: found.name, voiced };
}

export function buildServer(cabinet: Cabinet): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  for (const def of CONTRACT) {
    server.registerTool(
      def.name,
      {
        description: def.description,
        inputSchema: zodShape(def),
        annotations: def.annotations,
      },
      async (args: Record<string, unknown>) => cabinet.call(def.name, args),
    );
  }
  return server;
}

export async function startStdio(opts: HeadlessOpts = {}): Promise<void> {
  const h = headlessRound({
    ...(process.env.CABINET_FIXTURE ? { fixture: process.env.CABINET_FIXTURE } : {}),
    ...(process.env.CABINET_TAPES ? { tapesDir: process.env.CABINET_TAPES } : {}),
    ...(process.env.VOICE_URL !== undefined
      ? { voiceUrl: process.env.VOICE_URL === '' ? null : process.env.VOICE_URL }
      : {}),
    ...opts,
  });
  const server = buildServer(h.cabinet);
  let last = Date.now();
  const timer = setInterval(() => {
    const now = Date.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    h.step(dt);
  }, 33);
  timer.unref();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`${SERVER_NAME} ${SERVER_VERSION}: ${h.fixture}, tools listed\n`);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  startStdio().catch((err: unknown) => {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
}
