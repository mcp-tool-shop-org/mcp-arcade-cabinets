#!/usr/bin/env node
// `pnpm voice [--check] [--port 7788]`
// Runs the host-side voice worker (voice/worker.py) from the repo's venv:
// Kokoro speaks, faster-whisper hears it back, fx-dub receipts the pair.
// `--check` asks a running worker for its health and speaks one authored
// line per boss, printing each receipt. A development tool; Pages never
// has a voice. Set VOICE_PYTHON to use another interpreter.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

import {
  cliError,
  die,
  isMain,
  parseArgv,
  readJsonFile,
  requirePort,
  runMain,
} from './lib/cli.mjs';

const USAGE = `usage: pnpm voice [--check] [--port 7788]
  --check     health plus one authored line per boss (needs a running worker)
  --port      worker port (or VOICE_PORT, default 7788)
env: KOKORO_DIR   folder holding the Kokoro ONNX weights (required to spawn)
     VOICE_PYTHON interpreter (else the repo venv, else python)
     VOICE_TOKEN  bearer the worker requires beyond loopback`;

// This runner used to collect every token it did not recognize into a Set and
// ignore it, so `--por 7788`, `--chek` and `--port=7789` all ran silently on
// the defaults — the only script under scripts/ that did. It now shares the
// parser its siblings use: an unknown flag is an exit-2 usage error, and the
// `--flag=value` form is handled.
const FLAGS = new Set(['check', 'port']);
const BOOLEANS = new Set(['check']);

const PERSONAS = 'packages/cabinet-server/personas.json';
const VOICE_LINES = 'packages/ghost-on-the-menu/patterns/voice.json';
const BOSSES = ['whisperer', 'menu', 'doorman'];

function timedOut(err) {
  return Boolean(
    err &&
    typeof err === 'object' &&
    'name' in err &&
    (err.name === 'TimeoutError' || err.name === 'AbortError'),
  );
}

/** A response body as JSON, or a named failure. A 200 of HTML is not a stack. */
async function jsonBody(res, what) {
  try {
    return await res.json();
  } catch {
    throw cliError(`${what} did not answer with json`, 1);
  }
}

/** The boss's voice from personas.json, naming the persona when it is not there. */
export function voiceFor(personas, kind) {
  const boss = personas && typeof personas === 'object' ? personas.boss : undefined;
  const persona = boss && typeof boss === 'object' ? boss[kind] : undefined;
  if (!persona || typeof persona !== 'object' || !persona.voice) {
    throw cliError(`${PERSONAS} has no voice for the ${kind}`, 1);
  }
  return persona.voice;
}

/** The boss's first authored line, naming the file when it is not there. */
export function lineFor(voice, kind) {
  const boss = voice && typeof voice === 'object' ? voice.boss : undefined;
  const lines = boss && typeof boss === 'object' ? boss[kind] : undefined;
  const text = Array.isArray(lines) ? lines[0] : undefined;
  if (typeof text !== 'string' || text === '') {
    throw cliError(`${VOICE_LINES} has no line for the ${kind}`, 1);
  }
  return text;
}

async function check(url) {
  const HEALTH_MS = 2_000;
  const SPEAK_MS = 20_000;
  const pathFree = (s) =>
    typeof s === 'string' && s.trim() !== '' && !s.includes('/') && !s.includes('\\');
  let res;
  try {
    res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(HEALTH_MS) });
  } catch (err) {
    die(
      timedOut(err)
        ? 'the worker did not answer in time'
        : 'no voice worker; start one with pnpm voice',
      1,
    );
  }
  if (!res.ok) die('no voice worker; start one with pnpm voice', 1);
  const h = await jsonBody(res, 'health');
  const auth = process.env.VOICE_TOKEN
    ? { authorization: `Bearer ${process.env.VOICE_TOKEN}` }
    : {};
  let stats = null;
  let statsNote = '';
  try {
    const statsRes = await fetch(`${url}/stats`, {
      headers: auth,
      signal: AbortSignal.timeout(HEALTH_MS),
    });
    if (statsRes.status === 401) {
      statsNote = "stats/speak need the worker's token";
    } else if (!statsRes.ok) {
      let errWord = '';
      try {
        const body = await statsRes.json();
        errWord = pathFree(body.error) ? body.error.trim() : '';
      } catch {
        errWord = '';
      }
      statsNote = errWord || 'stats did not answer';
    } else {
      stats = await statsRes.json().catch(() => null);
      if (!stats) statsNote = 'stats did not answer with json';
    }
  } catch (err) {
    statsNote = timedOut(err) ? 'the worker did not answer in time' : 'stats did not answer';
  }
  console.log(
    stats
      ? `${stats.engine} on ${stats.device}, ${stats.voices.length} voices, ${stats.cached} lines cached`
      : `${h.engine} answers; ${statsNote}`,
  );
  // Both pattern files are read through the named reader: a moved or renamed
  // file names itself rather than throwing an ENOENT stack at the top level.
  const personas = readJsonFile(path.resolve(PERSONAS), PERSONAS);
  const voice = readJsonFile(path.resolve(VOICE_LINES), VOICE_LINES);
  let failedAny = false;
  for (const kind of BOSSES) {
    const v = voiceFor(personas, kind);
    const text = lineFor(voice, kind);
    const t0 = Date.now();
    try {
      const spoken = await fetch(`${url}/speak`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...auth },
        body: JSON.stringify({ text, kind, preset: v.preset, rate: v.rate, loudness: v.loudness }),
        signal: AbortSignal.timeout(SPEAK_MS),
      });
      let r = {};
      try {
        r = await spoken.json();
      } catch {
        r = {};
      }
      const errWord = pathFree(r.error) ? r.error.trim() : '';
      if (spoken.status === 401) {
        failedAny = true;
        console.log(
          `  ${kind.padEnd(10)} ${String(v.preset).padEnd(11)} ${String(Date.now() - t0).padStart(5)}ms receipt FAILED  stats/speak need the worker's token${errWord ? `\n    ${errWord}` : ''}  "${text}"`,
        );
        continue;
      }
      const ok = spoken.ok && r.ok === true;
      if (!ok) failedAny = true;
      const failed = (r.checks ?? []).filter((c) => !c.ok).map((c) => `${c.check}: ${c.detail}`);
      const extra = !ok && errWord ? `\n    ${errWord}` : '';
      console.log(
        `  ${kind.padEnd(10)} ${String(v.preset).padEnd(11)} ${String(Date.now() - t0).padStart(5)}ms ${ok ? 'receipt ok ' : 'receipt FAILED'} ${r.cached ? '(cached)' : `tts ${r.tts_s}s asr ${r.asr_s}s`}  "${text}"${failed.length ? '\n    ' + failed.join('\n    ') : ''}${extra}`,
      );
    } catch (err) {
      failedAny = true;
      const why = timedOut(err) ? 'the worker did not answer in time' : 'receipt FAILED';
      console.log(
        `  ${kind.padEnd(10)} ${String(v.preset).padEnd(11)} ${String(Date.now() - t0).padStart(5)}ms ${why}  "${text}"`,
      );
    }
  }
  process.exit(failedAny ? 1 : 0);
}

async function main() {
  const { positional, flags } = parseArgv(process.argv.slice(2), FLAGS, {
    usage: USAGE,
    booleans: BOOLEANS,
  });
  if (flags.help) {
    console.log(USAGE);
    process.exit(0);
  }
  if (positional.length > 0) die(`unknown argument ${positional[0]}\n${USAGE}`);
  // The port is validated before it is ever put in a URL: an unvalidated one
  // built a nonsense URL whose failed fetch was reported as "no voice worker",
  // which is the wrong diagnosis for a typo.
  const port = requirePort(flags.port ?? process.env.VOICE_PORT ?? '7788');
  const url = `http://127.0.0.1:${port}`;

  if (flags.check) {
    await check(url);
    return;
  }

  const venv = path.resolve('.venv/Scripts/python.exe');
  const py = process.env.VOICE_PYTHON ?? (existsSync(venv) ? venv : 'python');
  if (!process.env.KOKORO_DIR) {
    die(
      'set KOKORO_DIR to the folder holding kokoro-v1.0.onnx and voices-v1.0.bin (the Kokoro ONNX weights)',
    );
  }
  // VOICE_HOST, VOICE_TOKEN, VOICE_CACHE_TAKES and the rest pass through the environment.
  const child = spawn(py, [path.resolve('voice/worker.py'), '--port', String(port)], {
    stdio: 'inherit',
  });
  child.on('error', (err) => die(`could not start ${py}: ${err.message}`, 1));
  child.on('exit', (code) => process.exit(code ?? 0));
}

if (isMain(import.meta.url)) {
  await runMain(main);
}
