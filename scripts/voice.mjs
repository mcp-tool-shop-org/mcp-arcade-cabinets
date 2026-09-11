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

const args = new Set(process.argv.slice(2));
const port = process.env.VOICE_PORT ?? '7788';
const url = `http://127.0.0.1:${port}`;

if (args.has('--check')) {
  const res = await fetch(`${url}/health`).catch(() => null);
  if (!res || !res.ok) {
    console.error(`no voice worker at ${url}; start one with pnpm voice`);
    process.exit(1);
  }
  const h = await res.json();
  console.log(`${h.engine} on ${h.device}, ${h.voices.length} voices, ${h.cached} lines cached`);
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
  for (const kind of ['whisperer', 'menu', 'doorman']) {
    const v = personas.boss[kind].voice;
    const text = voice.boss[kind][0];
    const t0 = Date.now();
    const r = await (
      await fetch(`${url}/speak`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, kind, preset: v.preset, rate: v.rate, loudness: v.loudness }),
      })
    ).json();
    const failed = (r.checks ?? []).filter((c) => !c.ok).map((c) => `${c.check}: ${c.detail}`);
    console.log(
      `  ${kind.padEnd(10)} ${v.preset.padEnd(11)} ${String(Date.now() - t0).padStart(5)}ms ${r.ok ? 'receipt ok ' : 'receipt FAILED'} ${r.cached ? '(cached)' : `tts ${r.tts_s}s asr ${r.asr_s}s`}  "${text}"${failed.length ? '\n    ' + failed.join('\n    ') : ''}`,
    );
  }
  process.exit(0);
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
