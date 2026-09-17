#!/usr/bin/env python
"""The cabinet's voice: a host-side worker (G15).

Speaks a gate-passed line in the boss's preset voice, hears it back with a
word-level ASR, and runs fx-dub's spoken-content receipt on the pair: the
words spoken are the gated words, no invented speech, no hole mid-line. A
line whose receipt fails is not served as audio; the answer says so in
words. Every line is cached by its voice and text, so the authored fallback
lines are synthesised once and generated lines once each.

    python voice/worker.py [--host 127.0.0.1] [--port 7788] [--cache film/voice]
                           --model <dir with kokoro-v1.0.onnx and voices-v1.0.bin>
                           [--asr small.en] [--device auto] [--cache-takes 400]

Environment: KOKORO_DIR (the model dir; required unless --model), VOICE_HOST,
VOICE_PORT, VOICE_CACHE, VOICE_ASR, VOICE_DEVICE, VOICE_TOKEN, VOICE_CACHE_TAKES.
For a container to reach the worker, bind the host's Docker interface (or
0.0.0.0) AND set VOICE_TOKEN: every /speak and /audio then needs
`Authorization: Bearer <token>`. /health stays open and carries no take.

Endpoints, all JSON:
    GET  /health                   liveness: {ok, engine}, nothing more
    GET  /stats                    engine, asr device, voices, lines cached, counters (bearer when a token is set)
    POST /speak {text, preset, rate, loudness, kind, max_gap_s} -> {ok, id, duration_s, receipt, url}
    GET  /audio/<id>.wav           the take (only when its receipt passed)

Never inside the Catalog container: the container reaches it at
host.docker.internal and degrades to silence when it is not there. Nothing
here sees a fact; the worker never sees the tape, only the line.

Hardened on Grok's slice-4 review: a bearer token on the hook, a cap on the
cache (oldest takes evicted), no rig path default for the weights, and a
take served only with a passed receipt beside it. Hardened again on the
wave-3 pass: the bearer is compared in constant time, a take id must be the
twenty hex characters `line_id` mints, and the accept path is bounded (a
handler timeout and a cap on the sockets in flight), because a thread is
spawned and the request line parsed before the bearer gate runs — the gate
does not protect the accept path.

Tests: `python -m unittest discover -s voice/tests -t voice/tests` from the
repo root. They stand the worker up on a loopback port with a stub voice, so
no weights, no GPU and no model download are needed.
"""

from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
import re
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

import numpy as np
import soundfile as sf

HERE = Path(__file__).resolve().parent
PERSONAS = HERE.parent / 'packages' / 'cabinet-server' / 'personas.json'
# The cast, when the persona sheets cannot be read (a worker copied out of
# the repo). Kept only as the floor; the sheets are the source of truth.
CAST_FALLBACK = ('whisperer', 'menu', 'doorman', 'archivist')
# A take id is exactly what line_id() mints: twenty lowercase hex characters.
# `str.isalnum()` was Unicode-wide and admitted fullwidth digits, superscripts
# and non-Latin letters — no traversal, but it did not describe the set.
TAKE_ID = re.compile(r'[0-9a-f]{20}')


def cast_kinds(path: Path = PERSONAS) -> tuple[str, ...]:
    """The boss kinds, read from the persona sheets the cabinet ships.

    Hardcoding the list let it fall out of step: the Archivist shipped in
    personas.json and never reached the hint, so its name was the one the
    ASR was most likely to misspell and the receipt most likely to refuse.
    """
    try:
        raw = json.loads(path.read_text(encoding='utf-8'))
        kinds = tuple(k for k in raw['boss'] if isinstance(k, str) and k.isascii() and k.isalpha())
    except (OSError, ValueError, KeyError, TypeError):
        kinds = ()
    return kinds or CAST_FALLBACK


def cast_hint(kinds: tuple[str, ...] | None = None) -> str:
    """The cast's proper nouns as one vocabulary hint for the ASR."""
    names = [k[:1].upper() + k[1:] for k in (kinds if kinds is not None else cast_kinds())]
    listed = ', '.join(['The ' + names[0]] + ['the ' + n for n in names[1:]]) if names else ''
    return f'{listed}. A tools list, a menu, a plate.'


CAST_HINT = cast_hint()


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
    def __init__(self, model_dir: Path, asr_name: str, device: str, cache: Path,
                 cache_takes: int = 400):
        from kokoro_onnx import Kokoro

        onnx = model_dir / 'kokoro-v1.0.onnx'
        voices = model_dir / 'voices-v1.0.bin'
        if not onnx.is_file() or not voices.is_file():
            raise RuntimeError(
                f'no Kokoro weights under {model_dir}: expected kokoro-v1.0.onnx and voices-v1.0.bin '
                '(set KOKORO_DIR or pass --model)'
            )
        t0 = time.time()
        self.cache_takes = max(1, int(cache_takes))
        self.kokoro = Kokoro(str(onnx), str(voices))
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
    def line_id(preset: str, rate: float, loudness: float, text: str, max_gap: float = 0.5) -> str:
        # The budget is part of the key: a take receipted under one budget is
        # never served under another.
        key = f'{preset}|{rate:.3f}|{loudness:.2f}|{max_gap:.2f}|{text}'
        return hashlib.sha256(key.encode('utf-8')).hexdigest()[:20]

    def _cached(self, wav: Path, rec: Path) -> dict | None:
        """Return a stored receipt without rendering.

        A passed take needs the wav beside it. A failed receipt is itself
        the sentinel: do not take the render lock or run Kokoro/ASR again,
        and never treat it as audio to serve.
        """
        if not rec.exists():
            return None
        try:
            receipt = json.loads(rec.read_text(encoding='utf-8'))
        except (OSError, ValueError):
            return None
        if not isinstance(receipt, dict):
            return None
        if receipt.get('ok'):
            if not wav.exists():
                return None
            receipt['cached'] = True
            return receipt
        receipt['cached'] = True
        receipt['ok'] = False
        return receipt

    def speak(self, text: str, preset: str, rate: float, loudness: float, kind: str,
              max_gap: float = 0.5) -> dict:
        lid = self.line_id(preset, rate, loudness, text, max_gap)
        wav = self.cache / f'{lid}.wav'
        rec = self.cache / f'{lid}.receipt.json'
        hit = self._cached(wav, rec)
        if hit is not None:
            return hit
        with self.lock:
            hit = self._cached(wav, rec)
            if hit is not None:
                return hit
            return self._render(text, preset, rate, loudness, kind, lid, wav, rec, max_gap)

    def _render(self, text, preset, rate, loudness, kind, lid, wav: Path, rec: Path,
                max_gap: float) -> dict:
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
            # The bark's timing budget is authored data (personas.json → voice.maxGap);
            # the caller sends it, the worker never tunes it.
            'max_gap_within_line_s': float(max_gap),
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
            'max_gap_s': float(max_gap),
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
        self._evict()
        return receipt

    def _evict(self) -> None:
        """Keep the cache to `cache_takes` receipts; the oldest take goes first, with its audio."""
        recs = sorted(self.cache.glob('*.receipt.json'), key=lambda p: p.stat().st_mtime)
        for old in recs[:-self.cache_takes] if len(recs) > self.cache_takes else []:
            lid = old.name[: -len('.receipt.json')]
            for f in (old, self.cache / f'{lid}.wav', self.cache / f'{lid}.failed.wav'):
                try:
                    f.unlink()
                except FileNotFoundError:
                    pass


VOICE: Voice | None = None
TOKEN: str | None = None
STATS = {'spoken': 0, 'cached': 0, 'refused': 0, 'started': time.time()}
# POST /speak: reject before read. Never rfile.read(-1).
MAX_SPEAK_BODY = 4096
MAX_KIND = 32
MAX_PRESET = 32
# Seconds a connection may sit without a complete request before the handler
# gives up on it.
CONN_TIMEOUT_S = 10
# Sockets in flight at once. The whole cabinet is one caller a beat; this is
# generous for that and finite for anyone else.
MAX_CONNS = 32


class Handler(BaseHTTPRequestHandler):
    # A thread is spawned and the request line parsed before _allowed() runs,
    # so a client that opens a socket and says nothing is unauthenticated by
    # construction. Bound the wait, and stay on HTTP/1.0 (said out loud, not
    # left to the base class) so no connection is kept alive after its answer.
    timeout = CONN_TIMEOUT_S
    protocol_version = 'HTTP/1.0'

    def log_message(self, fmt, *args):  # quiet
        return

    def _json(self, code: int, body: dict):
        data = json.dumps(body).encode('utf-8')
        self.send_response(code)
        self.send_header('content-type', 'application/json')
        self.send_header('content-length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _allowed(self) -> bool:
        """With VOICE_TOKEN set, /speak and /audio need the bearer; /health never does.

        Constant-time: a short-circuiting `==` leaks a signal proportional to
        the matching prefix, and the only configuration where the token is
        mandatory is the one where the worker binds beyond loopback and that
        signal is remotely observable.
        """
        if TOKEN is None:
            return True
        got = self.headers.get('authorization', '')
        return hmac.compare_digest(got.encode('utf-8'), f'Bearer {TOKEN}'.encode('utf-8'))

    def do_GET(self):
        path = urlparse(self.path).path
        if path == '/health':
            # Liveness only, on an open port (Grok, slice-6 review): no voice
            # list, no cache size, no counters. The engine word is the whole answer.
            return self._json(200, {'ok': True, 'engine': 'kokoro-onnx'})
        if path == '/stats':
            if not self._allowed():
                return self._json(401, {'error': 'a bearer token is required'})
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
            if not self._allowed():
                return self._json(401, {'error': 'a bearer token is required'})
            lid = path[len('/audio/'):-4]
            if not TAKE_ID.fullmatch(lid):
                return self._json(404, {'error': 'no such take'})
            wav = VOICE.cache / f'{lid}.wav'
            rec = VOICE.cache / f'{lid}.receipt.json'
            # A take is served only with its receipt beside it, and only when
            # the receipt passed (Grok, slice-4 review): the file on disk is
            # not the proof, the receipt is.
            if not wav.exists() or not rec.exists():
                return self._json(404, {'error': 'no such take'})
            try:
                if not json.loads(rec.read_text(encoding='utf-8')).get('ok'):
                    return self._json(404, {'error': 'no such take'})
            except (OSError, ValueError):
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
        if not self._allowed():
            return self._json(401, {'error': 'a bearer token is required'})
        raw_len = self.headers.get('content-length')
        if raw_len is None:
            return self._json(400, {'error': 'bad content-length'})
        try:
            n = int(raw_len)
        except (TypeError, ValueError):
            return self._json(400, {'error': 'bad content-length'})
        if n < 0 or n > MAX_SPEAK_BODY:
            return self._json(400, {'error': 'bad content-length'})
        raw_body = self.rfile.read(n)
        try:
            body = json.loads(raw_body)
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError):
            return self._json(400, {'error': 'bad json'})
        if not isinstance(body, dict):
            return self._json(400, {'error': 'bad json'})
        try:
            text = str(body.get('text', '')).strip()
            preset = str(body.get('preset', 'am_michael'))
            kind = str(body.get('kind', 'boss'))
            rate = float(body.get('rate', 1.0))
            loudness = float(body.get('loudness', 0.0))
            max_gap = float(body.get('max_gap_s', 0.5))
        except (TypeError, ValueError):
            return self._json(400, {'error': 'bad request'})
        if len(kind) > MAX_KIND or len(preset) > MAX_PRESET:
            return self._json(400, {'error': 'kind or preset too long'})
        if not (0.1 <= max_gap <= 3.0):
            return self._json(400, {'error': 'max_gap_s out of range'})
        if not text or len(text) > 200:
            return self._json(400, {'error': 'text must be one short line'})
        if preset not in VOICE.voices:
            return self._json(400, {'error': 'no such voice'})
        if not (0.5 <= rate <= 2.0) or not (-24.0 <= loudness <= 12.0):
            return self._json(400, {'error': 'rate or loudness out of range'})
        try:
            receipt = VOICE.speak(text, preset, rate, loudness, kind, max_gap)
        except Exception as err:  # noqa: BLE001
            sys.stderr.write(f'voice: speak failed: {err}\n')
            return self._json(500, {'error': 'speak failed'})
        if receipt.get('cached'):
            STATS['cached'] += 1
        else:
            STATS['spoken'] += 1
        if not receipt['ok']:
            STATS['refused'] += 1
        out = dict(receipt)
        out['url'] = f"/audio/{receipt['id']}.wav" if receipt['ok'] else None
        return self._json(200, out)


class Server(ThreadingHTTPServer):
    """ThreadingHTTPServer with a ceiling on the sockets in flight.

    The bearer gate runs inside the handler, after a thread has been spawned
    and the request line read, so it cannot protect the accept path: bound
    the accept path itself. Over the cap a connection is closed at once
    rather than queued, which is the same answer a busy worker would give and
    costs no thread. Threads are daemons so a shutdown never waits on one.
    """

    daemon_threads = True
    max_conns = MAX_CONNS

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.slots = threading.BoundedSemaphore(self.max_conns)
        self.refused = 0

    def process_request(self, request, client_address):
        if not self.slots.acquire(blocking=False):
            self.refused += 1
            self.shutdown_request(request)
            return
        try:
            super().process_request(request, client_address)
        except BaseException:
            self.slots.release()
            raise

    def process_request_thread(self, request, client_address):
        try:
            super().process_request_thread(request, client_address)
        finally:
            self.slots.release()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--host', default=os.environ.get('VOICE_HOST', '127.0.0.1'))
    ap.add_argument('--port', type=int, default=int(os.environ.get('VOICE_PORT', '7788')))
    ap.add_argument('--cache', default=os.environ.get('VOICE_CACHE', str(HERE.parent / 'film' / 'voice')))
    ap.add_argument('--model', default=os.environ.get('KOKORO_DIR'))
    ap.add_argument('--asr', default=os.environ.get('VOICE_ASR', 'small.en'))
    ap.add_argument('--device', default=os.environ.get('VOICE_DEVICE', 'auto'))
    ap.add_argument('--cache-takes', type=int, default=int(os.environ.get('VOICE_CACHE_TAKES', '400')))
    ap.add_argument('--token', default=os.environ.get('VOICE_TOKEN'))
    args = ap.parse_args()
    if not args.model:
        sys.stderr.write('voice: no model dir; set KOKORO_DIR or pass --model <dir>\n')
        return 2
    _cuda_dirs()
    global VOICE, TOKEN
    TOKEN = args.token.strip() if args.token and args.token.strip() else None
    if args.host not in ('127.0.0.1', 'localhost', '::1') and TOKEN is None:
        sys.stderr.write('voice: binding beyond loopback needs VOICE_TOKEN set\n')
        return 2
    t0 = time.time()
    VOICE = Voice(Path(args.model), args.asr, args.device, Path(args.cache), args.cache_takes)
    sys.stderr.write(
        f'voice: kokoro-onnx ({len(VOICE.voices)} voices) + faster-whisper {args.asr} on {VOICE.device}, '
        f'ready in {time.time() - t0:.1f}s, http://{args.host}:{args.port}'
        f'{" (bearer token required)" if TOKEN else ""}, cache {VOICE.cache_takes} takes\n'
    )
    server = Server((args.host, args.port), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == '__main__':
    sys.exit(main())
