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
import { setEnv, wholeEnv } from './env';
import { hostForRound, tapeCards, type Live } from './host';
import { createStepFaults, guardStep, isStuck } from './step-guard';
import { speakLine, voiceHealth, type SpeakAnswer } from './voice';

/** Seconds between liveness probes of the voice worker, off the beat. */
export const VOICE_PROBE_S = 15;

/** A probe older than this is not a promise the worker will speak. */
export const VOICE_AUTH_FRESH_MS = 1000;

/** The host-side voice worker; in the Catalog container, host.docker.internal. */
export const DEFAULT_VOICE_URL = 'http://127.0.0.1:7788';

/** The tier a round plays at when the operator names none. */
export const DEFAULT_TIER = 1;
/** The tier as a word: a note to the operator carries no digit, like every other surface (Kimi, wave 5). */
const TIER_WORDS = ['zero', 'one', 'two', 'three'] as const;

/** The fixture a round plays when the operator names none. */
export const DEFAULT_FIXTURE = 'naive-ndjson';

export const SERVER_NAME = 'ghost-on-the-menu';
export const SERVER_VERSION = '0.11.1';

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

/**
 * Enums and bounded strings, and a property the contract does not list under
 * `required` is optional at the transport. It used to be required whatever
 * the contract said, so a contract could not express an optional field at
 * all — which the typing cabinet's `react` now needs for its tag.
 */
function zodShape(def: ToolDef) {
  const shape: Record<string, z.ZodTypeAny> = {};
  const needed = new Set(def.inputSchema.required);
  for (const [k, p] of Object.entries(def.inputSchema.properties)) {
    const base =
      'enum' in p ? z.enum(p.enum as [string, ...string[]]) : z.string().max(p.maxLength);
    shape[k] = needed.has(k) ? base : base.optional();
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
  /**
   * The stderr sink for the voice hook's once-lines, taken as an argument so
   * a test can read them without a spawn — the same shape `guardStep` uses.
   */
  warn?: (line: string) => void;
}

/**
 * What the voice hook says on stderr, once each, when a configured worker
 * turns this cabinet away or cannot speak.
 *
 * None of this was said anywhere. The outcomes were counted into `voiced`,
 * which no shipping surface prints, and a refused bearer dropped the worker,
 * so the operator — who had set the token, and whose worker was running and
 * answering — was told by the only two sentences they could reach that
 * nothing was there. Both browser cabinets already had words for it; the one
 * surface with no screen had none. Path-free, said once, like every other
 * miss here.
 */
export const VOICE_NOTES = {
  auth: "the voice worker refused this cabinet's token; the cabinet plays silent\n",
  payload: 'the voice worker refused the job; nothing was spoken\n',
  speak: 'the voice worker could not speak; the cabinet plays on\n',
} as const;

/**
 * Which note a take's outcome earns, or null for one that earns none. A
 * receipt that failed is the worker working and the take being wrong about
 * itself, and 'no worker' is already the one case both shipping sentences
 * covered honestly.
 */
export function voiceNoteFor(answer: SpeakAnswer): keyof typeof VOICE_NOTES | null {
  if (answer.status === 'refused') return answer.refused === 'auth' ? 'auth' : 'payload';
  if (answer.status === 'speak failed') return 'speak';
  return null;
}

/**
 * The hook's stderr voice: each note said once, like `step-guard`'s line,
 * because a cabinet asking for a line every beat would otherwise flood the
 * terminal with the same sentence.
 */
export function voiceNotes(write: (line: string) => void): (answer: SpeakAnswer) => void {
  const said = new Set<keyof typeof VOICE_NOTES>();
  return (answer) => {
    const key = voiceNoteFor(answer);
    if (key === null || said.has(key)) return;
    said.add(key);
    write(VOICE_NOTES[key]);
  };
}

/** A headless round the tools act on. Stepped by `step(dt)`; restarts at the scene. */
export function headlessRound(opts: HeadlessOpts = {}) {
  const dir = opts.tapesDir ?? DEFAULT_TAPES_DIR;
  const tapes = listTapes(dir, opts.tapesUserDir);
  const fixture = opts.fixture ?? DEFAULT_FIXTURE;
  const found = tapes.find((t) => t.name === fixture);
  if (!found) {
    // Two faults, two halts. An empty menu is CABINET_TAPES pointing
    // somewhere with no tapes in it, and the old single sentence sent the
    // operator to CABINET_FIXTURE instead — a variable that was not the
    // fault and could not be set to anything that would help. The
    // unreadable case says its own line on stderr above; an existing but
    // empty or wrongly-populated directory said nothing at all, and this is
    // the halt a first-run operator is most likely to meet.
    if (tapes.length === 0) {
      throw new Error(
        'no tapes were found where the cabinet looked; set CABINET_TAPES to a directory of .tape.json files',
      );
    }
    const loaded = tapes.map((t) => t.name).join(', ');
    throw new Error(
      `fixture ${fixture} is not on the menu (loaded: ${loaded}); set CABINET_FIXTURE to one of them`,
    );
  }
  const tier = opts.tier ?? DEFAULT_TIER;
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
  // Owned here rather than by `startStdio`, because the cabinet is built here
  // and the tools have to be able to read the count.
  const faults = createStepFaults();
  const voiceUrl = opts.voiceUrl === undefined ? DEFAULT_VOICE_URL : opts.voiceUrl;
  const note = voiceNotes(opts.warn ?? ((line: string) => void process.stderr.write(line)));
  // Whether the worker will speak for us. Probed via authenticated GET /stats
  // (bearer when set) with a short abort at start and on a cadence, and set
  // by every take's outcome; never on the beat. Open GET /health is not this.
  //
  // Two generations, not one. `probeGen` drops a late voiceHealth so a
  // success started while up cannot resurrect workerUp after a 401;
  // `takeGen` does the same for a take. They used to be the same counter,
  // and every routine freshness probe bumped it — so a take that started
  // before the probe could no longer mark the worker live or drop it, and
  // the liveness bit was decided almost entirely by probes rather than by
  // what actually happened when the cabinet asked for a line.
  //
  // `probing` is the in-flight guard. The freshness window is much shorter
  // than the probe cadence, so voiceReady goes stale between almost every
  // pair of speak calls; without this, N rapid calls opened N concurrent
  // probes at the worker.
  //
  // A 400 (bad job) leaves the worker up.
  let workerUp = false;
  let probeGen = 0;
  let takeGen = 0;
  let lastAuthMs = 0;
  let probing = false;
  /** A configured worker that answered and turned this cabinet away. */
  let refusedAuth = false;
  const voiceOpts = voiceUrl
    ? { url: voiceUrl, ...(opts.voiceToken ? { token: opts.voiceToken } : {}) }
    : null;
  const dropWorker = () => {
    workerUp = false;
    probeGen += 1;
    takeGen += 1;
  };
  const markLive = () => {
    workerUp = true;
    lastAuthMs = Date.now();
  };
  const probe = () => {
    if (!voiceOpts) return;
    if (probing) return;
    probing = true;
    const gen = ++probeGen;
    void voiceHealth(voiceOpts)
      .then((h) => {
        if (gen !== probeGen) return;
        if (h === null) {
          workerUp = false;
          return;
        }
        refusedAuth = false;
        markLive();
      })
      .finally(() => {
        probing = false;
      });
  };
  probe();
  const host = hostForRound(() => live, {
    tapes: () => tapeCards(tapes),
    // The round's own health, at the boundary. `guardStep` counts faults and
    // keeps the server listed, which is right, but the count never crossed
    // into anything a client reads.
    stuck: () => isStuck(faults),
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
          voiceRefused: () => refusedAuth,
          voice: (job) => {
            voiced.asked += 1;
            const gen = takeGen;
            void speakLine(job, voiceOpts).then((a) => {
              const live = gen === takeGen;
              // Said once on stderr, path-free, whatever the take does to
              // the liveness bit below.
              note(a);
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
                refusedAuth = true;
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
  return { cabinet, host, live, step, tapes, fixture: found.name, voiced, probe, faults };
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

/**
 * A worker base this cabinet can actually fetch, or null.
 *
 * VOICE_URL used to be passed through whole. A value with no scheme or a
 * typo'd host makes every fetch in `voiceHealth`/`speakLine` throw a
 * TypeError, both of which swallow it and answer 'no worker' — the same
 * words an absent worker gets, for the rest of the session, with nothing
 * said at start. A bare `host.docker.internal:7788` is the shape that does
 * it, and `new URL` alone would accept it (as a scheme), so the scheme is
 * checked too.
 */
function voiceUrlOf(raw: string): string | null {
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:' ? raw : null;
  } catch {
    return null;
  }
}

/**
 * The operator's environment, read once and said out loud — the shooter's
 * twin of `vibeEnv` next door, and for the same reason.
 *
 * This server used to spread five raw `process.env` reads into `HeadlessOpts`
 * with no validation and no notes, and read neither CABINET_TIER nor
 * CABINET_SEED at all although both are opts here. An operator who set
 * CABINET_TIER on the shooter — the cabinet the Catalog listing describes —
 * played tier one and was told nothing.
 *
 * Pure, and the environment never wins over an explicit `opts`, so the lines
 * can be read in a test instead of out of a spawned process.
 */
export function ghostEnv(
  env: Record<string, string | undefined>,
  opts: HeadlessOpts = {},
): { opts: HeadlessOpts; notes: string[] } {
  const notes: string[] = [];
  const out: HeadlessOpts = {};

  if (opts.fixture === undefined && setEnv(env.CABINET_FIXTURE)) out.fixture = env.CABINET_FIXTURE;
  if (opts.tapesDir === undefined && setEnv(env.CABINET_TAPES)) out.tapesDir = env.CABINET_TAPES;
  if (opts.tapesUserDir === undefined && setEnv(env.CABINET_TAPES_USER)) {
    out.tapesUserDir = env.CABINET_TAPES_USER;
  }

  const seed = wholeEnv(env.CABINET_SEED);
  if (opts.seed === undefined) {
    if (seed !== null) out.seed = seed;
    else if (setEnv(env.CABINET_SEED)) {
      notes.push('CABINET_SEED was not understood; the cabinet draws its own\n');
    }
  }

  const tier = wholeEnv(env.CABINET_TIER);
  if (opts.tier === undefined) {
    if (tier !== null && tier >= 0 && tier <= 3) out.tier = tier as 0 | 1 | 2 | 3;
    else if (setEnv(env.CABINET_TIER)) {
      notes.push(
        `CABINET_TIER was not understood; the cabinet plays at tier ${TIER_WORDS[DEFAULT_TIER]}\n`,
      );
    }
  }

  // Read by the typing cabinet, never here: this round is always the sweeper.
  if (setEnv(env.CABINET_BOT)) {
    notes.push('CABINET_BOT is read by the typing cabinet only; this cabinet plays its own bot\n');
  }

  if (opts.voiceUrl === undefined && env.VOICE_URL !== undefined) {
    const raw = env.VOICE_URL.trim();
    const url = raw === '' ? null : voiceUrlOf(raw);
    // An empty VOICE_URL is the Catalog's own silent default and says
    // nothing; one that cannot be read says so once and then plays silent.
    if (raw !== '' && url === null) {
      // The clause naming the scheme is the whole point of the note. The
      // shape operators get wrong is a bare `host.docker.internal:7788`, and
      // a line that said only that the value was wrong gave the operator
      // most likely to meet it nothing to change. No digit, no path.
      notes.push(
        'the voice url was not understood; name the scheme, http or https, and the cabinet plays silent until then\n',
      );
    }
    out.voiceUrl = url;
  }
  if (opts.voiceToken === undefined && setEnv(env.VOICE_TOKEN)) out.voiceToken = env.VOICE_TOKEN;

  return { opts: { ...out, ...opts }, notes };
}

export async function startStdio(opts: HeadlessOpts = {}): Promise<void> {
  checkCatalogListing();
  const read = ghostEnv(process.env, opts);
  for (const note of read.notes) process.stderr.write(note);
  const h = headlessRound(read.opts);
  const server = buildServer(h.cabinet);
  let last = Date.now();
  // A throw from the sim is a quiet round, never a dead server (see step-guard).
  // The record is the round's own, so the tools can read it too.
  const step = guardStep(h.step, h.faults);
  const timer = setInterval(() => {
    const now = Date.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
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
