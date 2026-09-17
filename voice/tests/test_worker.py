"""The voice worker's hardenings, as tests.

The worker is the only network-facing component the cabinets ship, and until
this file the whole of its CI was `python -m py_compile`. Every rule checked
here is one the TypeScript side depends on and could lose silently: the
bearer gate on /speak, /stats and /audio; /health staying open; a take served
only when its receipt says ok; the body cap; the preset, rate, loudness and
max_gap ranges; the cache eviction; the refusal to re-render a cached failed
receipt; the shape of a take id; and the bounded accept path.

No weights, no GPU, no model download: the worker is stood up on a loopback
port with a stub voice in place of Kokoro and faster-whisper.

    python -m unittest discover -s voice/tests -t voice/tests
"""

from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import os
import socket
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORKER = ROOT / 'voice' / 'worker.py'

_spec = importlib.util.spec_from_file_location('cabinet_voice_worker', WORKER)
assert _spec and _spec.loader
worker = importlib.util.module_from_spec(_spec)
sys.modules['cabinet_voice_worker'] = worker
_spec.loader.exec_module(worker)

TOKEN = 'voice-secret'
# Same length as the real one, so a wrong token exercises the comparison
# rather than a length check.
WRONG = 'voice-secrez'
WAV = b'RIFF....WAVEfmt '


def take_id(text: str = 'The plate is out.') -> str:
    return worker.Voice.line_id('bm_george', 1.0, 0.0, text, 0.5)


class StubVoice:
    """Everything the Handler reaches on VOICE, and nothing that needs a GPU."""

    def __init__(self, cache: Path):
        self.asr_name = 'small.en'
        self.device = 'cpu'
        self.voices = ['bf_emma', 'bm_george']
        self.cache = cache
        self.cache_takes = 2
        self.spoken: list[tuple] = []

    def write_take(self, text: str, ok: bool = True) -> str:
        lid = take_id(text)
        receipt = {'id': lid, 'ok': ok, 'text': text, 'cached': False}
        (self.cache / f'{lid}.receipt.json').write_text(json.dumps(receipt), encoding='utf-8')
        (self.cache / f'{lid}{"" if ok else ".failed"}.wav').write_bytes(WAV)
        return lid

    def speak(self, text, preset, rate, loudness, kind, max_gap=0.5) -> dict:
        self.spoken.append((text, preset, rate, loudness, kind, max_gap))
        lid = worker.Voice.line_id(preset, rate, loudness, text, max_gap)
        receipt = {'id': lid, 'ok': True, 'text': text, 'cached': False}
        (self.cache / f'{lid}.receipt.json').write_text(json.dumps(receipt), encoding='utf-8')
        (self.cache / f'{lid}.wav').write_bytes(WAV)
        return receipt


class WorkerCase(unittest.TestCase):
    """A worker on a loopback port, with a stub voice and a bearer set."""

    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        cache = Path(self.tmp.name)
        self.voice = StubVoice(cache)
        self._was_voice, self._was_token = worker.VOICE, worker.TOKEN
        worker.VOICE = self.voice
        worker.TOKEN = TOKEN
        # Module state, so a test that reads a counter or waits for the
        # once-only line has to start from the floor.
        self._was_stats = dict(worker.STATS)
        for key in worker.STATS:
            if key != 'started':
                worker.STATS[key] = 0
        worker.SAID.clear()
        self.server = worker.Server(('127.0.0.1', 0), worker.Handler)
        self.base = f'http://127.0.0.1:{self.server.server_address[1]}'
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=5)
        worker.VOICE, worker.TOKEN = self._was_voice, self._was_token
        worker.STATS.clear()
        worker.STATS.update(self._was_stats)
        worker.SAID.clear()
        self.tmp.cleanup()

    # --- helpers -----------------------------------------------------------

    def call(self, path: str, token: str | None = None, body: dict | None = None,
             raw: bytes | None = None) -> tuple[int, bytes, str]:
        data = raw if raw is not None else (
            json.dumps(body).encode('utf-8') if body is not None else None
        )
        req = urllib.request.Request(self.base + path, data=data)
        if data is not None:
            req.add_header('content-type', 'application/json')
        if token is not None:
            req.add_header('authorization', f'Bearer {token}')
        try:
            with urllib.request.urlopen(req, timeout=10) as res:
                return res.status, res.read(), res.headers.get('content-type', '')
        except urllib.error.HTTPError as err:
            with err:
                return err.code, err.read(), err.headers.get('content-type', '')

    def speak_body(self, **over) -> dict:
        body = {'text': 'The plate is out.', 'preset': 'bm_george', 'kind': 'doorman',
                'rate': 1.0, 'loudness': 0.0, 'max_gap_s': 0.5}
        body.update(over)
        return body

    # --- the bearer gate ---------------------------------------------------

    def test_health_is_open_and_carries_no_take(self):
        code, body, _ = self.call('/health')
        self.assertEqual(code, 200)
        self.assertEqual(json.loads(body), {'ok': True, 'engine': 'kokoro-onnx'})

    def test_every_other_path_needs_the_bearer(self):
        lid = self.voice.write_take('The plate is out.')
        for path, body in (('/stats', None), (f'/audio/{lid}.wav', None),
                           ('/speak', self.speak_body())):
            with self.subTest(path=path):
                code, _, _ = self.call(path, body=body)
                self.assertEqual(code, 401, 'no bearer at all')
                code, _, _ = self.call(path, token=WRONG, body=body)
                self.assertEqual(code, 401, 'a wrong bearer of the same length')
                code, _, _ = self.call(path, token=TOKEN, body=body)
                self.assertEqual(code, 200)

    def test_the_bearer_is_compared_in_constant_time(self):
        # The rule, not the timing: a prefix of the token is not a token, and
        # the comparison is the one that does not stop at the first mismatch.
        code, _, _ = self.call('/stats', token=TOKEN[:4])
        self.assertEqual(code, 401)
        self.assertIn('compare_digest', WORKER.read_text(encoding='utf-8'))

    # --- the body and the ranges -------------------------------------------

    def test_speak_refuses_a_body_over_the_cap_before_reading_it(self):
        big = json.dumps(self.speak_body(text='x' * worker.MAX_SPEAK_BODY)).encode('utf-8')
        self.assertGreater(len(big), worker.MAX_SPEAK_BODY)
        code, body, _ = self.call('/speak', token=TOKEN, raw=big)
        self.assertEqual(code, 400)
        self.assertEqual(json.loads(body)['error'], 'bad content-length')
        self.assertEqual(self.voice.spoken, [])

    def test_speak_refuses_a_job_outside_the_authored_ranges(self):
        cases = {
            'rate or loudness out of range': self.speak_body(rate=9.0),
            'max_gap_s out of range': self.speak_body(max_gap_s=99.0),
            'text must be one short line': self.speak_body(text=''),
            'no such voice': self.speak_body(preset='not_a_voice'),
            'kind or preset too long': self.speak_body(kind='k' * (worker.MAX_KIND + 1)),
        }
        for want, body in cases.items():
            with self.subTest(want=want):
                code, out, _ = self.call('/speak', token=TOKEN, body=body)
                self.assertEqual(code, 400)
                self.assertEqual(json.loads(out)['error'], want)
        code, out, _ = self.call('/speak', token=TOKEN, raw=b'{not json')
        self.assertEqual(code, 400)
        self.assertEqual(json.loads(out)['error'], 'bad json')
        self.assertEqual(self.voice.spoken, [])

    def test_a_good_job_is_spoken_and_answered_with_its_take_url(self):
        code, out, _ = self.call('/speak', token=TOKEN, body=self.speak_body())
        self.assertEqual(code, 200)
        answer = json.loads(out)
        self.assertTrue(answer['ok'])
        self.assertEqual(answer['url'], f"/audio/{answer['id']}.wav")
        self.assertEqual(len(self.voice.spoken), 1)

    # --- the take ----------------------------------------------------------

    def test_audio_is_served_only_with_a_passed_receipt_beside_it(self):
        ok = self.voice.write_take('The plate is out.')
        code, body, ctype = self.call(f'/audio/{ok}.wav', token=TOKEN)
        self.assertEqual(code, 200)
        self.assertEqual(body, WAV)
        self.assertEqual(ctype, 'audio/wav')

        failed = self.voice.write_take('The door is a suggestion.', ok=False)
        code, _, _ = self.call(f'/audio/{failed}.wav', token=TOKEN)
        self.assertEqual(code, 404, 'a failed receipt is never audio')

        code, _, _ = self.call(f'/audio/{"a" * 20}.wav', token=TOKEN)
        self.assertEqual(code, 404, 'no take, no receipt')

    def test_a_take_id_is_the_twenty_hex_characters_the_worker_mints(self):
        lid = take_id()
        self.assertRegex(lid, r'^[0-9a-f]{20}$')
        # `isalnum()` is Unicode-wide and admitted every one of these. None of
        # them is an id the worker can mint, so none of them is an id.
        wide = ('Ａ' * 20, 'Ⅷ' * 20, '٩' * 20, 'abcdefabcdefabcdefab²')
        for bad in wide:
            with self.subTest(bad=bad.encode('unicode_escape')):
                self.assertTrue(bad.isalnum(), 'the check this replaced said yes')
                self.assertIsNone(worker.TAKE_ID.fullmatch(bad))
        for bad in ('ABCDEF0123456789abcd', lid[:19], lid + 'a', ''):
            with self.subTest(bad=bad):
                self.assertIsNone(worker.TAKE_ID.fullmatch(bad))
                code, _, _ = self.call(f'/audio/{bad}.wav', token=TOKEN)
                self.assertEqual(code, 404)

    # --- the cache ---------------------------------------------------------

    def test_the_cache_evicts_the_oldest_take_over_the_cap(self):
        cache = Path(self.tmp.name)
        for i, text in enumerate(('one.', 'two.', 'three.')):
            lid = self.voice.write_take(text)
            # Age them apart so the sort has something to sort by.
            os.utime(cache / f'{lid}.receipt.json', (1_700_000_000 + i, 1_700_000_000 + i))
        self.assertEqual(len(list(cache.glob('*.receipt.json'))), 3)
        worker.Voice._evict(self.voice)
        left = sorted(p.name for p in cache.glob('*.receipt.json'))
        self.assertEqual(len(left), self.voice.cache_takes)
        gone = take_id('one.')
        self.assertFalse((cache / f'{gone}.receipt.json').exists())
        self.assertFalse((cache / f'{gone}.wav').exists(), 'the audio goes with the receipt')

    def test_a_cached_failed_receipt_is_never_re_rendered_or_served(self):
        cache = Path(self.tmp.name)
        lid = self.voice.write_take('The door is a suggestion.', ok=False)
        wav = cache / f'{lid}.wav'
        rec = cache / f'{lid}.receipt.json'
        hit = worker.Voice._cached(self.voice, wav, rec)
        self.assertIsNotNone(hit, 'a failed receipt is its own sentinel, not a miss')
        self.assertFalse(hit['ok'])
        self.assertTrue(hit['cached'])
        # A passed receipt with no audio beside it is a miss, not a hit.
        passed = self.voice.write_take('The plate is out.')
        (cache / f'{passed}.wav').unlink()
        self.assertIsNone(
            worker.Voice._cached(self.voice, cache / f'{passed}.wav',
                                 cache / f'{passed}.receipt.json'))

    # --- the accept path ---------------------------------------------------

    def test_the_accept_path_is_bounded(self):
        self.assertEqual(worker.Handler.timeout, worker.CONN_TIMEOUT_S)
        self.assertEqual(worker.Handler.protocol_version, 'HTTP/1.0')
        self.assertTrue(worker.Server.daemon_threads)
        self.assertEqual(worker.Server.max_conns, worker.MAX_CONNS)

    def test_a_connection_over_the_cap_is_closed_rather_than_given_a_thread(self):
        for _ in range(self.server.max_conns):
            self.assertTrue(self.server.slots.acquire(blocking=False))
        left, right = socket.socketpair()
        try:
            before = threading.active_count()
            self.server.process_request(right, ('127.0.0.1', 0))
            self.assertEqual(self.server.refused, 1)
            self.assertLessEqual(threading.active_count(), before)
            self.assertEqual(left.recv(16), b'', 'the socket was closed, not queued')
        finally:
            left.close()
            for _ in range(self.server.max_conns):
                self.server.slots.release()


    # --- what a refusal leaves behind -------------------------------------

    def test_a_refused_bearer_is_counted_and_said_once(self):
        """The operator with the wrong token can read neither log nor /stats.

        log_message is silenced outright and /stats is behind the same bearer
        that is failing, so without this the worker looks healthy on the open
        /health the TypeScript client deliberately does not trust.
        """
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            for _ in range(3):
                code, _, _ = self.call('/stats', token=WRONG)
                self.assertEqual(code, 401)
            code, _, _ = self.call('/speak', token=WRONG, body=self.speak_body())
            self.assertEqual(code, 401)
        self.assertEqual(worker.STATS['auth'], 4)
        said = err.getvalue()
        self.assertEqual(said.count('bearer'), 1, 'one line the first time, then quiet')
        self.assertNotIn('/', said, 'path-free')
        self.assertTrue(said.endswith('\n'))

    def test_a_malformed_job_is_counted_and_said_once(self):
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            code, _, _ = self.call('/speak', token=TOKEN, raw=b'{not json')
            self.assertEqual(code, 400)
            code, _, _ = self.call('/speak', token=TOKEN, body=self.speak_body(rate=9.0))
            self.assertEqual(code, 400)
        self.assertEqual(worker.STATS['bad_request'], 2)
        self.assertEqual(worker.STATS['auth'], 0)
        said = err.getvalue()
        self.assertEqual(said.count('malformed'), 1)
        self.assertNotIn('/', said)
        self.assertEqual(self.voice.spoken, [])

    def test_the_counters_say_what_they_mean_and_stats_carries_them(self):
        # `refused` meant a failed spoken-content receipt here and an HTTP
        # 400 or 401 on the TypeScript side, so two surfaces told two stories
        # with one word while someone debugged a silent cabinet.
        self.assertIn('receipt_failed', worker.STATS)
        self.assertNotIn('refused', worker.STATS)
        self.call('/stats', token=WRONG)
        self.call('/speak', token=TOKEN, raw=b'{not json')
        code, body, _ = self.call('/stats', token=TOKEN)
        self.assertEqual(code, 200)
        stats = json.loads(body)['stats']
        self.assertEqual(stats['auth'], 1)
        self.assertEqual(stats['bad_request'], 1)
        self.assertEqual(stats['receipt_failed'], 0)
        self.assertNotIn('started', stats)
        # /health stays liveness only and carries none of it.
        _, health, _ = self.call('/health')
        self.assertEqual(json.loads(health), {'ok': True, 'engine': 'kokoro-onnx'})


class CastHintCase(unittest.TestCase):
    def test_the_hint_names_every_boss_the_cabinet_ships(self):
        kinds = worker.cast_kinds()
        self.assertIn('archivist', kinds, 'read from the persona sheets, not hardcoded')
        hint = worker.cast_hint(kinds)
        for kind in kinds:
            self.assertIn(kind[:1].upper() + kind[1:], hint)
        self.assertIn('the Archivist', hint)
        self.assertTrue(hint.startswith('The '))

    def test_an_unreadable_sheet_falls_back_to_the_cast_it_shipped_with(self):
        worker.SAID.discard('cast')
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            self.assertEqual(worker.cast_kinds(Path('nowhere/personas.json')), worker.CAST_FALLBACK)
            worker.cast_kinds(Path('nowhere/personas.json'))
        # A silent fallback re-opens the hole cast_kinds was written to
        # close: the operator's only symptom would be takes that quietly
        # stop passing their receipts.
        said = err.getvalue()
        self.assertEqual(said.count('persona sheets did not load'), 1)
        self.assertNotIn('/', said, 'path-free')
        self.assertTrue(said.endswith('\n'))
        worker.SAID.discard('cast')

    def test_the_fallback_cast_is_the_one_the_sheets_ship(self):
        # A fourth spelling of the same list, pinned to the sheets rather
        # than left to drift the way the Archivist did.
        sheets = json.loads(worker.PERSONAS.read_text(encoding='utf-8'))
        self.assertEqual(tuple(sheets['boss']), worker.CAST_FALLBACK)


if __name__ == '__main__':
    unittest.main()
