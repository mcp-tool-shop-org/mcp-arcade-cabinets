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
import { assertCatalogTools, CONTRACT, type ToolDef } from './contract';
import { hostForRound, tapeCards, type Live } from './host';
import { speakLine, voiceHealth } from './voice';

/** Seconds between liveness probes of the voice worker, off the beat. */
export const VOICE_PROBE_S = 15;

/** A probe older than this is not a promise the worker will speak. */
export const VOICE_AUTH_FRESH_MS = 1000;

/** The host-side voice worker; in the Catalog container, host.docker.internal. */
export const DEFAULT_VOICE_URL = 'http://127.0.0.1:7788';

export const SERVER_NAME = 'ghost-on-the-menu';
export const SERVER_VERSION = '0.8.0';

const here = path.dirname(fileURLToPath(import.meta.url));
/** `packages/cabinet-server/{src,dist}` → the repo's fixtures. Baked into the image later. */
export const DEFAULT_TAPES_DIR = path.resolve(here, '..', '..', '..', 'fixtures', 'tapes');

function listTapesDir(dir: string, warnMissing: boolean): { name: string; tape: Tape }[] {
  let names: string[];
  try {
    names = readdirSync(dir).sort();
  } catch {
    // Menu-shaped miss: never dump ENOENT/EACCES with a machine path.
    if (warnMissing) process.stderr.write('tapes dir did not load (unreadable)\n');
    return [];
  }
  const out: { name: string; tape: Tape }[] = [];
  for (const f of names) {
    if (!f.endsWith('.tape.json')) continue;
    const name = f.replace(/\.tape\.json$/, '');
    try {
      out.push({ name, tape: loadTape(JSON.parse(readFileSync(path.join(dir, f), 'utf8'))) });
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: unknown }).code)
          : '';
      const why =
        code === 'ENOENT' || code === 'EACCES'
          ? 'unreadable'
          : err instanceof Error
            ? err.message
            : 'did not load';
      process.stderr.write(`tape ${name}: ${why}\n`);
    }
  }
  return out;
}

/** Baked dir plus an optional overlay. Overlay miss is empty, not a replace of `dir`. */
export function listTapes(dir: string, overlayDir?: string): { name: string; tape: Tape }[] {
  const baked = listTapesDir(dir, true);
  const overlay = overlayDir?.trim();
  if (!overlay) return baked;
  const extra = listTapesDir(overlay, false);
  const seen = new Set(baked.map((t) => t.name));
  for (const t of extra) {
    if (seen.has(t.name)) continue;
    baked.push(t);
    seen.add(t.name);
  }
  baked.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return baked;
}

/** Catalog listing must match CONTRACT. Missing file (the image) is not a mismatch. */
function checkCatalogListing(): void {
  const catalog = path.resolve(here, '..', '..', '..', 'catalog', 'tools.json');
  let raw: string;
  try {
    raw = readFileSync(catalog, 'utf8');
  } catch {
    return;
  }
  assertCatalogTools(JSON.parse(raw) as unknown);
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
  /** Optional overlay of operator `.tape.json` files, beside the baked dir. */
  tapesUserDir?: string;
  /** Fixture name the round plays. */
  fixture?: string;
  tier?: 0 | 1 | 2 | 3;
  seed?: number;
  /** The voice worker's base url; null keeps the cabinet silent. */
  voiceUrl?: string | null;
  /** The worker's bearer token (VOICE_TOKEN), when it binds beyond loopback. */
  voiceToken?: string;
}

/** A headless round the tools act on. Stepped by `step(dt)`; restarts at the scene. */
export function headlessRound(opts: HeadlessOpts = {}) {
  const dir = opts.tapesDir ?? DEFAULT_TAPES_DIR;
  const tapes = listTapes(dir, opts.tapesUserDir);
  const fixture = opts.fixture ?? 'naive-ndjson';
  const found = tapes.find((t) => t.name === fixture);
  if (!found) {
    const loaded = tapes.map((t) => t.name).join(', ') || 'none';
    throw new Error(`fixture ${fixture} is not on the menu (loaded: ${loaded})`);
  }
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
  const voiced = { asked: 0, ok: 0, failed: 0, noWorker: 0, refused: 0 };
  const voiceUrl = opts.voiceUrl === undefined ? DEFAULT_VOICE_URL : opts.voiceUrl;
  // Whether the worker will speak for us. Probed via authenticated GET /stats
  // (bearer when set) with a short abort at start and on a cadence, and set
  // by every take's outcome; never on the beat. Open GET /health is not this.
  // probeGen drops a late voiceHealth so a success started while up cannot
  // resurrect workerUp after a 401. A 400 (bad job) leaves the worker up.
  let workerUp = false;
  let probeGen = 0;
  let lastAuthMs = 0;
  const voiceOpts = voiceUrl
    ? { url: voiceUrl, ...(opts.voiceToken ? { token: opts.voiceToken } : {}) }
    : null;
  const dropWorker = () => {
    workerUp = false;
    probeGen += 1;
  };
  const markLive = () => {
    workerUp = true;
    lastAuthMs = Date.now();
  };
  const probe = () => {
    if (!voiceOpts) return;
    const gen = ++probeGen;
    void voiceHealth(voiceOpts).then((h) => {
      if (gen !== probeGen) return;
      if (h === null) {
        workerUp = false;
        return;
      }
      markLive();
    });
  };
  probe();
  const host = hostForRound(() => live, {
    tapes: () => tapeCards(tapes),
    ...(voiceOpts
      ? {
          // The server has no speaker: a take is spoken, receipted and cached
          // by the worker; the receipt is the artifact. Silent, and said so,
          // when no worker answers or the bearer is refused (G18). A 15s-old
          // probe is not a promise; fail-closed and refresh off the beat.
          voiceReady: () => {
            if (workerUp && Date.now() - lastAuthMs <= VOICE_AUTH_FRESH_MS) return true;
            probe();
            // A live bit with a stale auth window is not "no worker": a probe
            // is in flight. Fail-closed on the take; the words say to retry.
            return workerUp ? 'checking' : false;
          },
          voice: (job) => {
            voiced.asked += 1;
            const gen = probeGen;
            void speakLine(job, voiceOpts).then((a) => {
              const live = gen === probeGen;
              if (a.status === 'voiced') {
                voiced.ok += 1;
                if (live) markLive();
              } else if (a.status === 'receipt failed') {
                voiced.failed += 1;
                if (live) markLive();
              } else if (a.status === 'speak failed') {
                voiced.failed += 1;
                if (live) markLive();
              } else if (a.status === 'refused' && a.refused !== 'auth') {
                voiced.refused += 1;
                if (live) markLive();
              } else if (a.status === 'refused') {
                voiced.refused += 1;
                if (live) dropWorker();
              } else {
                voiced.noWorker += 1;
                if (live) dropWorker();
              }
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
  return { cabinet, host, live, step, tapes, fixture: found.name, voiced, probe };
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
  checkCatalogListing();
  const h = headlessRound({
    ...(process.env.CABINET_FIXTURE ? { fixture: process.env.CABINET_FIXTURE } : {}),
    ...(process.env.CABINET_TAPES ? { tapesDir: process.env.CABINET_TAPES } : {}),
    ...(process.env.CABINET_TAPES_USER ? { tapesUserDir: process.env.CABINET_TAPES_USER } : {}),
    ...(process.env.VOICE_URL !== undefined
      ? { voiceUrl: process.env.VOICE_URL === '' ? null : process.env.VOICE_URL }
      : {}),
    ...(process.env.VOICE_TOKEN ? { voiceToken: process.env.VOICE_TOKEN } : {}),
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
  const probeTimer = setInterval(h.probe, VOICE_PROBE_S * 1000);
  probeTimer.unref();
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
