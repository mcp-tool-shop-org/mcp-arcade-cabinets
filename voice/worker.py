#!/usr/bin/env python
"""The cabinet's voice: a host-side worker (G15).

Speaks a gate-passed line in the boss's preset voice, hears it back with a
word-level ASR, and runs fx-dub's spoken-content receipt on the pair: the
words spoken are the gated words, no invented speech, no hole mid-line. A
line whose receipt fails is not served as audio; the answer says so in
words. Every line is cached by its voice and text, so the authored fallback
lines are synthesised once and generated lines once each.

    python voice/worker.py [--host 127.0.0.1] [--port 7788] [--cache film/voice]
                           [--model E:/AI-Models/kokoro] [--asr small.en] [--device auto]

Endpoints, all JSON:
    GET  /health                   engine, asr device, voices, lines cached
    POST /speak {text, preset, rate, loudness, kind}   -> {ok, id, duration_s, receipt, url}
    GET  /audio/<id>.wav           the take (only when its receipt passed)

Never inside the Catalog container: the container reaches it at
host.docker.internal and degrades to silence when it is not there. Nothing
here sees a fact; the worker never sees the tape, only the line.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

import numpy as np
import soundfile as sf

HERE = Path(__file__).resolve().parent
CAST_HINT = 'The Whisperer, the Menu, the Doorman. A tools list, a menu, a plate.'


def _cuda_dirs():
    """Put the pip-installed CUDA runtime DLLs on the loader path (Windows)."""
    try:
        import nvidia  # noqa: F401
    except ImportError:
        return
    base = Path(sys.prefix) / 'Lib' / 'site-packages' / 'nvidia'
    for sub in ('cublas', 'cudnn'):
        d = base / sub / 'bin'
        if d.is_dir():
            os.environ['PATH'] = str(d) + os.pathsep + os.environ.get('PATH', '')
            if hasattr(os, 'add_dll_directory'):
                os.add_dll_directory(str(d))


class Voice:
    def __init__(self, model_dir: Path, asr_name: str, device: str, cache: Path):
        from kokoro_onnx import Kokoro

        t0 = time.time()
        self.kokoro = Kokoro(str(model_dir / 'kokoro-v1.0.onnx'), str(model_dir / 'voices-v1.0.bin'))
        self.voices = sorted(self.kokoro.get_voices())
        self.tts_load_s = round(time.time() - t0, 2)
        self.cache = cache
        self.cache.mkdir(parents=True, exist_ok=True)
        self.lock = threading.Lock()
        self.asr_name = asr_name
        self.device = self._load_asr(device)

    def _load_asr(self, device: str) -> str:
        from faster_whisper import WhisperModel

        order = ['cuda', 'cpu'] if device == 'auto' else [device]
        for dev in order:
            try:
                kw = {'device': dev, 'compute_type': 'float16' if dev == 'cuda' else 'int8'}
                asr = WhisperModel(self.asr_name, **kw)
                # A real decode, so a missing CUDA library fails here, not on the first line.
                probe = np.zeros(16000, dtype=np.float32)
                segs, _ = asr.transcribe(probe, language='en', beam_size=1)
                list(segs)
                self.asr = asr
                return dev
            except Exception as err:  # noqa: BLE001
                sys.stderr.write(f'asr on {dev} unavailable: {str(err)[:100]}\n')
        raise RuntimeError('no ASR device')

    @staticmethod
    def line_id(preset: str, rate: float, loudness: float, text: str) -> str:
        key = f'{preset}|{rate:.3f}|{loudness:.2f}|{text}'
        return hashlib.sha256(key.encode('utf-8')).hexdigest()[:20]

    def speak(self, text: str, preset: str, rate: float, loudness: float, kind: str) -> dict:
        lid = self.line_id(preset, rate, loudness, text)
        wav = self.cache / f'{lid}.wav'
        rec = self.cache / f'{lid}.receipt.json'
        if wav.exists() and rec.exists():
            receipt = json.loads(rec.read_text(encoding='utf-8'))
            receipt['cached'] = True
            return receipt
        with self.lock:
            if wav.exists() and rec.exists():
                receipt = json.loads(rec.read_text(encoding='utf-8'))
                receipt['cached'] = True
                return receipt
            return self._render(text, preset, rate, loudness, kind, lid, wav, rec)

    def _render(self, text, preset, rate, loudness, kind, lid, wav: Path, rec: Path) -> dict:
        from fxdub.dialogue_receipt import check_dialogue

        t0 = time.time()
        samples, sr = self.kokoro.create(text, voice=preset, speed=float(rate), lang='en-us')
        samples = np.asarray(samples, dtype=np.float32)
        gain = float(10 ** (float(loudness) / 20.0))
        samples = np.clip(samples * gain, -1.0, 1.0)
        tts_s = round(time.time() - t0, 3)
        duration = round(len(samples) / sr, 3)
        sf.write(str(wav), samples, sr)

        t1 = time.time()
        # The cast's proper nouns as a vocabulary hint, so the ASR spells the
        # boss names the way the script does (measured: without it "Doorman"
        # came back as "dorman" and the receipt refused the take). A hint to
        # the listener, never a change to the check.
        segments, _ = self.asr.transcribe(
            str(wav), word_timestamps=True, language='en', beam_size=1, initial_prompt=CAST_HINT,
        )
        words = []
        for seg in segments:
            for w in seg.words or []:
                words.append({'text': w.word.strip(), 'type': 'word', 'start': float(w.start),
                              'end': float(w.end), 'speaker_id': 'BOSS'})
        asr_s = round(time.time() - t1, 3)

        scene = {
            'name': kind,
            'clip_duration_s': round(duration + 0.05, 3),
            'max_gap_within_line_s': 0.5,
            'cast': {'BOSS': {'description': kind, 'on_frame': True}},
            'lines': [{'speaker': 'BOSS', 'text': text}],
        }
        result = check_dialogue(scene, words, only_speaker='BOSS')
        checks = [{'check': c['check'], 'ok': c['ok'], 'detail': c['detail']} for c in result['checks']]
        ok = all(c['ok'] for c in checks)
        receipt = {
            'id': lid,
            'ok': ok,
            'kind': kind,
            'preset': preset,
            'rate': rate,
            'loudness': loudness,
            'text': text,
            'heard': ' '.join(w['text'] for w in words),
            'duration_s': duration,
            'tts_s': tts_s,
            'asr_s': asr_s,
            'engine': 'kokoro-onnx',
            'asr': f'faster-whisper {self.asr_name} ({self.device})',
            'verifier': 'fxdub-dialogue',
            'checks': checks,
            'cached': False,
        }
        rec.write_text(json.dumps(receipt, indent=2), encoding='utf-8')
        if not ok:
            # A failed receipt is a finding: the take is kept for the record and never served.
            wav.rename(wav.with_suffix('.failed.wav'))
        return receipt


VOICE: Voice | None = None
STATS = {'spoken': 0, 'cached': 0, 'refused': 0, 'started': time.time()}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):  # quiet
        return

    def _json(self, code: int, body: dict):
        data = json.dumps(body).encode('utf-8')
        self.send_response(code)
        self.send_header('content-type', 'application/json')
        self.send_header('content-length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == '/health':
            return self._json(200, {
                'ok': True,
                'engine': 'kokoro-onnx',
                'asr': f'faster-whisper {VOICE.asr_name}',
                'device': VOICE.device,
                'voices': VOICE.voices,
                'cached': len(list(VOICE.cache.glob('*.receipt.json'))),
                'stats': {k: v for k, v in STATS.items() if k != 'started'},
            })
        if path.startswith('/audio/') and path.endswith('.wav'):
            lid = path[len('/audio/'):-4]
            if not lid.isalnum():
                return self._json(404, {'error': 'no such take'})
            wav = VOICE.cache / f'{lid}.wav'
            if not wav.exists():
                return self._json(404, {'error': 'no such take'})
            data = wav.read_bytes()
            self.send_response(200)
            self.send_header('content-type', 'audio/wav')
            self.send_header('content-length', str(len(data)))
            self.send_header('cache-control', 'max-age=86400')
            self.end_headers()
            self.wfile.write(data)
            return
        return self._json(404, {'error': 'no such path'})

    def do_POST(self):
        path = urlparse(self.path).path
        if path != '/speak':
            return self._json(404, {'error': 'no such path'})
        try:
            n = int(self.headers.get('content-length', '0'))
            body = json.loads(self.rfile.read(n) or b'{}')
            text = str(body.get('text', '')).strip()
            preset = str(body.get('preset', 'am_michael'))
            rate = float(body.get('rate', 1.0))
            loudness = float(body.get('loudness', 0.0))
            kind = str(body.get('kind', 'boss'))
            if not text or len(text) > 200:
                return self._json(400, {'error': 'text must be one short line'})
            if preset not in VOICE.voices:
                return self._json(400, {'error': 'no such voice'})
            if not (0.5 <= rate <= 2.0) or not (-24.0 <= loudness <= 12.0):
                return self._json(400, {'error': 'rate or loudness out of range'})
            receipt = VOICE.speak(text, preset, rate, loudness, kind)
            if receipt.get('cached'):
                STATS['cached'] += 1
            else:
                STATS['spoken'] += 1
            if not receipt['ok']:
                STATS['refused'] += 1
            out = dict(receipt)
            out['url'] = f"/audio/{receipt['id']}.wav" if receipt['ok'] else None
            return self._json(200, out)
        except Exception as err:  # noqa: BLE001
            return self._json(500, {'error': str(err)[:200]})


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--host', default=os.environ.get('VOICE_HOST', '127.0.0.1'))
    ap.add_argument('--port', type=int, default=int(os.environ.get('VOICE_PORT', '7788')))
    ap.add_argument('--cache', default=os.environ.get('VOICE_CACHE', str(HERE.parent / 'film' / 'voice')))
    ap.add_argument('--model', default=os.environ.get('KOKORO_DIR', 'E:/AI-Models/kokoro'))
    ap.add_argument('--asr', default=os.environ.get('VOICE_ASR', 'small.en'))
    ap.add_argument('--device', default=os.environ.get('VOICE_DEVICE', 'auto'))
    args = ap.parse_args()
    _cuda_dirs()
    global VOICE
    t0 = time.time()
    VOICE = Voice(Path(args.model), args.asr, args.device, Path(args.cache))
    sys.stderr.write(
        f'voice: kokoro-onnx ({len(VOICE.voices)} voices) + faster-whisper {args.asr} on {VOICE.device}, '
        f'ready in {time.time() - t0:.1f}s, http://{args.host}:{args.port}\n'
    )
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == '__main__':
    sys.exit(main())
