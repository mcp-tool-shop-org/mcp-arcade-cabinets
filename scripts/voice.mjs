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

const USAGE = `usage: pnpm voice [--check] [--port 7788]
  --check     health plus one authored line per boss (needs a running worker)
  --port      worker port (or VOICE_PORT, default 7788)
env: KOKORO_DIR   folder holding the Kokoro ONNX weights (required to spawn)
     VOICE_PYTHON interpreter (else the repo venv, else python)
     VOICE_TOKEN  bearer the worker requires beyond loopback`;

const argv = process.argv.slice(2);
let port = process.env.VOICE_PORT ?? '7788';
const flags = new Set();
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--port') {
    const next = argv[i + 1];
    if (next && !next.startsWith('-')) {
      port = next;
      i += 1;
    }
    continue;
  }
  flags.add(a);
}

if (flags.has('--help') || flags.has('-h')) {
  console.log(USAGE);
  process.exit(0);
}

const url = `http://127.0.0.1:${port}`;

function timedOut(err) {
  return Boolean(
    err &&
    typeof err === 'object' &&
    'name' in err &&
    (err.name === 'TimeoutError' || err.name === 'AbortError'),
  );
}

if (flags.has('--check')) {
  const HEALTH_MS = 2_000;
  const SPEAK_MS = 20_000;
  const pathFree = (s) =>
    typeof s === 'string' && s.trim() !== '' && !s.includes('/') && !s.includes('\\');
  let res;
  try {
    res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(HEALTH_MS) });
  } catch (err) {
    console.error(
      timedOut(err)
        ? 'the worker did not answer in time'
        : 'no voice worker; start one with pnpm voice',
    );
    process.exit(1);
  }
  if (!res.ok) {
    console.error('no voice worker; start one with pnpm voice');
    process.exit(1);
  }
  const h = await res.json();
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
      stats = await statsRes.json();
    }
  } catch (err) {
    statsNote = timedOut(err) ? 'the worker did not answer in time' : 'stats did not answer';
  }
  console.log(
    stats
      ? `${stats.engine} on ${stats.device}, ${stats.voices.length} voices, ${stats.cached} lines cached`
      : `${h.engine} answers; ${statsNote}`,
  );
  const personas = JSON.parse(
    (await import('node:fs')).readFileSync(
      path.resolve('packages/cabinet-server/personas.json'),
      'utf8',
    ),
  );
  const voice = JSON.parse(
    (await import('node:fs')).readFileSync(
      path.resolve('packages/ghost-on-the-menu/patterns/voice.json'),
      'utf8',
    ),
  );
  let failedAny = false;
  for (const kind of ['whisperer', 'menu', 'doorman']) {
    const v = personas.boss[kind].voice;
    const text = voice.boss[kind][0];
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
          `  ${kind.padEnd(10)} ${v.preset.padEnd(11)} ${String(Date.now() - t0).padStart(5)}ms receipt FAILED  stats/speak need the worker's token${errWord ? `\n    ${errWord}` : ''}  "${text}"`,
        );
        continue;
      }
      const ok = spoken.ok && r.ok === true;
      if (!ok) failedAny = true;
      const failed = (r.checks ?? []).filter((c) => !c.ok).map((c) => `${c.check}: ${c.detail}`);
      const extra = !ok && errWord ? `\n    ${errWord}` : '';
      console.log(
        `  ${kind.padEnd(10)} ${v.preset.padEnd(11)} ${String(Date.now() - t0).padStart(5)}ms ${ok ? 'receipt ok ' : 'receipt FAILED'} ${r.cached ? '(cached)' : `tts ${r.tts_s}s asr ${r.asr_s}s`}  "${text}"${failed.length ? '\n    ' + failed.join('\n    ') : ''}${extra}`,
      );
    } catch (err) {
      failedAny = true;
      const why = timedOut(err) ? 'the worker did not answer in time' : 'receipt FAILED';
      console.log(
        `  ${kind.padEnd(10)} ${v.preset.padEnd(11)} ${String(Date.now() - t0).padStart(5)}ms ${why}  "${text}"`,
      );
    }
  }
  process.exit(failedAny ? 1 : 0);
}

const venv = path.resolve('.venv/Scripts/python.exe');
const py = process.env.VOICE_PYTHON ?? (existsSync(venv) ? venv : 'python');
if (!process.env.KOKORO_DIR) {
  console.error(
    'set KOKORO_DIR to the folder holding kokoro-v1.0.onnx and voices-v1.0.bin (the Kokoro ONNX weights)',
  );
  process.exit(2);
}
// VOICE_HOST, VOICE_TOKEN, VOICE_CACHE_TAKES and the rest pass through the environment.
const child = spawn(py, [path.resolve('voice/worker.py'), '--port', port], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
