// The typing cabinet's stdio server. A headless endless run plays inside
// it under a typist bot, and the four tools are the levers a client pulls on
// that run. stdout is the transport; nothing else is written there. Tools
// list at once: the sim is built before the transport connects.
//
// This is a second entry beside `server.ts` rather than a flag on it. The
// two cabinets' servers change on different clocks (DECOMPOSE_BY_SECRETS),
// and a flag would bundle the shooter's sim, its tape menu and its voice
// probe into the typing cabinet's package for nothing. What that costs is
// the two small copies below — the tapes directory and the zod shape — and
// a test that keeps the version in step with the one the release gate reads
// out of `server.ts`.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import {
  createRun,
  nextSeed,
  stepRun,
  type RunState,
  type Snippet,
  type Tier,
} from '@mcp-arcade-cabinets/vibe-typer';
import { botFor, integrationFrom, parseBot } from '@mcp-arcade-cabinets/vibe-typer/src/play';

import { assertCatalogTools, VIBE_CONTRACT, type ToolDef } from './contract';
import { createVibeCabinet, type VibeCabinet } from './vibe-cabinet';
import { vibeHostFor, type VibeLive } from './vibe-host';

export const VIBE_SERVER_NAME = 'vibe-typer';
/**
 * Kept in step with `SERVER_VERSION` in `server.ts` by a test, rather than
 * imported from it. The release gate greps that constant out of that file
 * and the constant may not move; importing it here would drag the shooter's
 * whole graph into this bundle, because the bottom of `server.ts` is a
 * top-level side effect a bundler must keep. The test is the andon.
 */
export const VIBE_SERVER_VERSION = '0.11.1';

const here = path.dirname(fileURLToPath(import.meta.url));
/** `packages/cabinet-server/{src,dist}` → the repo's fixtures, as the shooter resolves it. */
export const VIBE_TAPES_DIR = path.resolve(here, '..', '..', '..', 'fixtures', 'tapes');

/**
 * A human pace, on purpose. The sim steps in wall-clock time, so a perfect
 * typist would race through a level faster than a client at cloud latency
 * can fill the next one, and every level would fall back to the corpus.
 * Measured on this rig; the number is in docs/vibe-typer.slice4.md.
 */
export const VIBE_BOT = 'typist:45';

/** Catalog listing must match the contract. Missing file (the package) is not a mismatch. */
function checkVibeCatalogListing(): void {
  const catalog = path.resolve(here, '..', '..', '..', 'catalog', 'tools.vibe.json');
  let raw: string;
  try {
    raw = readFileSync(catalog, 'utf8');
  } catch {
    return;
  }
  assertCatalogTools(JSON.parse(raw) as unknown, VIBE_CONTRACT, 'catalog/tools.vibe.json');
}

/** The same mapping `server.ts` uses: enums and bounded strings, nothing else. */
function zodShape(def: ToolDef) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [k, p] of Object.entries(def.inputSchema.properties)) {
    shape[k] = 'enum' in p ? z.enum(p.enum as [string, ...string[]]) : z.string().max(p.maxLength);
  }
  return shape;
}

export interface VibeHeadlessOpts {
  /** Where the tapes are; they season the integration stack and never schedule it (G30). */
  tapesDir?: string;
  seed?: number;
  tier?: Tier;
  /** The typist at the keyboard. A faster one leaves a client less time. */
  bot?: string;
}

/**
 * A headless endless run the tools act on. Stepped by `step(dt)`; the next
 * run starts on the next seed when the bar empties, so a client that stays
 * connected keeps playing.
 */
export function vibeHeadlessRound(opts: VibeHeadlessOpts = {}) {
  const dir = opts.tapesDir ?? VIBE_TAPES_DIR;
  const integration: readonly Snippet[] = integrationFrom(dir);
  if (integration.length === 0) {
    // Menu-shaped miss, said once: a cabinet with no tapes has no
    // integration stack and plays every other stack exactly as it always
    // did. Never a machine path, never a crash.
    process.stderr.write('tapes dir did not load; the cabinet plays without the wires stack\n');
  }
  const spec = parseBot(opts.bot ?? VIBE_BOT) ?? parseBot(VIBE_BOT)!;
  const tier = opts.tier ?? 0;
  let plays = 0;
  const live: VibeLive = { state: null as unknown as RunState, seed: opts.seed ?? 1 };
  const make = (): RunState =>
    createRun({
      seed: live.seed,
      tier,
      endless: true,
      ...(integration.length > 0 ? { integration } : {}),
    });
  live.state = make();
  let bot = botFor(spec, live.seed);
  const host = vibeHostFor(() => live);
  const cabinet: VibeCabinet = createVibeCabinet(host);
  const step = (dt: number) => {
    if (live.state.over) {
      plays += 1;
      live.seed = nextSeed(live.seed, plays);
      live.state = make();
      bot = botFor(spec, live.seed);
    }
    stepRun(live.state, bot(live.state), dt);
  };
  return { cabinet, host, live, step, bot: spec.name, tapes: integration.length };
}

export function buildVibeServer(cabinet: VibeCabinet): McpServer {
  const server = new McpServer({ name: VIBE_SERVER_NAME, version: VIBE_SERVER_VERSION });
  for (const def of VIBE_CONTRACT) {
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

/**
 * A whole number out of an environment variable, or null when it is not one.
 * `CABINET_TIER=abc` and `CABINET_SEED=1.5` are **absent**, not the default:
 * a fallback reached through `NaN` reads afterwards as though the operator
 * asked for the default, which they did not. A leading minus is allowed
 * because the sim folds a seed through `>>> 0` and a negative one is an
 * ordinary seed to it.
 */
export function wholeEnv(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const text = raw.trim();
  if (!/^-?\d+$/.test(text)) return null;
  const n = Number(text);
  return Number.isSafeInteger(n) ? n : null;
}

export async function startVibeStdio(opts: VibeHeadlessOpts = {}): Promise<void> {
  checkVibeCatalogListing();
  const seed = wholeEnv(process.env.CABINET_SEED);
  const tier = wholeEnv(process.env.CABINET_TIER);
  const h = vibeHeadlessRound({
    ...(process.env.CABINET_TAPES ? { tapesDir: process.env.CABINET_TAPES } : {}),
    ...(seed !== null ? { seed } : {}),
    ...(tier !== null && tier >= 0 && tier <= 3 ? { tier: tier as Tier } : {}),
    ...(process.env.CABINET_BOT ? { bot: process.env.CABINET_BOT } : {}),
    ...opts,
  });
  const server = buildVibeServer(h.cabinet);
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
  process.stderr.write(
    `${VIBE_SERVER_NAME} ${VIBE_SERVER_VERSION}: endless under ${h.bot}, tools listed\n`,
  );
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  startVibeStdio().catch((err: unknown) => {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
}
