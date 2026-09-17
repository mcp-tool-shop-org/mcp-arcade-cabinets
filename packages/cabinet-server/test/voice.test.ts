// The voicer (G15): every take is receipted before it plays; a failed
// receipt is never played; a take that arrives while its line is up plays
// at once, one that missed its beat waits for the breather, one still
// unplayed at the scene is dropped. Words only in every status.

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { VoiceJob } from '../src/host';
import { DEFAULT_PERSONAS } from '../src/personas';
import {
  AUDIO_URL,
  BAD_PAYLOAD,
  createVoicer,
  speakLine,
  voiceHealth,
  voiceOutcomes,
  type SpeakAnswer,
} from '../src/voice';

/** A take id the worker can actually mint: `line_id()` is twenty hex characters. */
const TAKE = 'a1b2c3d4e5f60718293a';
const TAKE_URL = `/audio/${TAKE}.wav`;

const JOB: VoiceJob = {
  text: 'The plate is out, and the plate has opinions.',
  kind: 'doorman',
  voice: DEFAULT_PERSONAS.boss.doorman.voice,
  maxGap: DEFAULT_PERSONAS.voice.maxGap,
  at: 10,
};

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

function receipt(ok: boolean, cached = false): SpeakAnswer {
  return {
    status: ok ? 'voiced' : 'receipt failed',
    ms: 800,
    receipt: {
      id: TAKE,
      ok,
      text: JOB.text,
      heard: JOB.text,
      duration_s: 2.9,
      tts_s: 0.7,
      asr_s: 0.3,
      cached,
      checks: [{ check: 'no_invented_speech', ok, detail: ok ? 'clean' : 'one unscripted word' }],
      url: ok ? TAKE_URL : null,
    },
  };
}

describe('the voicer', () => {
  it('plays a receipted take on the beat while its line is up', async () => {
    const d = deferred<SpeakAnswer>();
    const played: string[] = [];
    const status: string[] = [];
    const v = createVoicer({
      speak: () => d.promise,
      play: (url) => played.push(url),
      captionSeconds: 2.4,
      onStatus: (s) => status.push(s),
    });
    const own = { kind: 'aside', text: JOB.text };
    v.job(JOB);
    v.tick(10.0, own, false, false);
    expect(played).toEqual([]);
    d.resolve(receipt(true));
    await flush();
    v.tick(10.9, own, false, false);
    expect(played).toEqual([TAKE_URL]);
    expect(status).toEqual([
      'voice speaking ahead',
      'voice: receipt ok',
      'voice: spoke on the beat',
    ]);
    expect(v.stats().playedOnBeat).toBe(1);
    for (const s of status) expect(s).not.toMatch(/\d/);
  });

  it('holds a take that missed its beat for the breather, and drops it at the scene', async () => {
    const d = deferred<SpeakAnswer>();
    const played: string[] = [];
    const v = createVoicer({
      speak: () => d.promise,
      play: (url) => played.push(url),
      captionSeconds: 2.4,
    });
    v.job(JOB);
    d.resolve(receipt(true));
    await flush();
    v.tick(14, null, false, false); // the line left the field a while ago
    expect(played).toEqual([]);
    expect(v.status()).toBe('voice: held for the breather');
    v.tick(15, null, false, false);
    expect(played).toEqual([]);
    v.tick(20, null, true, false); // the breather
    expect(played).toEqual([TAKE_URL]);
    expect(v.stats().playedInBreather).toBe(1);

    const e = deferred<SpeakAnswer>();
    const w = createVoicer({
      speak: () => e.promise,
      play: (url) => played.push(url),
      captionSeconds: 2.4,
    });
    w.job(JOB);
    e.resolve(receipt(true));
    await flush();
    w.tick(30, null, false, true); // the scene
    expect(played).toHaveLength(1);
    expect(w.stats().dropped).toBe(1);
  });

  it('never plays over a catch or a wave card, and a new line drops a held take (Grok, slice-4 review)', async () => {
    const d = deferred<SpeakAnswer>();
    const played: string[] = [];
    const v = createVoicer({
      speak: () => d.promise,
      play: (url) => played.push(url),
      captionSeconds: 2.4,
    });
    v.job(JOB);
    d.resolve(receipt(true));
    await flush();
    // Within the window, but a catch is on the field: the take waits.
    v.tick(10.5, { kind: 'catch', text: 'poison.follow_through: followed' }, false, false);
    expect(played).toEqual([]);
    // A seed aside is not this line: still waits.
    v.tick(10.6, { kind: 'aside', text: 'I have a list. Lists make me calm.' }, false, false);
    expect(played).toEqual([]);
    expect(v.status()).toBe('voice: held for the breather');
    // The boss's own spawn line under its wave card is its line.
    const s = deferred<SpeakAnswer>();
    const u = createVoicer({
      speak: () => s.promise,
      play: (url) => played.push(url),
      captionSeconds: 2.4,
    });
    u.job(JOB);
    s.resolve(receipt(true));
    await flush();
    u.tick(10.5, { kind: 'wave', text: 'unlisted', line: JOB.text }, false, false);
    expect(played).toEqual([TAKE_URL]);
    played.length = 0;
    // A newer line arrives before the breather: the held take is dropped, not played later.
    const e = deferred<SpeakAnswer>();
    const w = createVoicer({
      speak: () => e.promise,
      play: (url) => played.push(url),
      captionSeconds: 2.4,
    });
    w.job(JOB);
    e.resolve(receipt(true));
    await flush();
    w.tick(14, null, false, false);
    expect(w.status()).toBe('voice: held for the breather');
    w.job({ ...JOB, text: 'Name and protocol.', at: 15 });
    w.tick(20, null, true, false);
    expect(played).toEqual([]);
    expect(w.stats().dropped).toBe(1);
  });

  it('never plays a take whose receipt failed, and says so in words', async () => {
    const d = deferred<SpeakAnswer>();
    const played: string[] = [];
    const v = createVoicer({
      speak: () => d.promise,
      play: (url) => played.push(url),
      captionSeconds: 2.4,
    });
    v.job(JOB);
    d.resolve(receipt(false));
    await flush();
    v.tick(10.5, { kind: 'aside', text: JOB.text }, false, false);
    expect(played).toEqual([]);
    expect(v.status()).toBe('voice: receipt failed, not played');
    expect(v.stats().receiptFailed).toBe(1);
  });

  it('a newer line replaces a pending one; no worker is silence, not an error', async () => {
    const first = deferred<SpeakAnswer>();
    const second = deferred<SpeakAnswer>();
    let n = 0;
    const played: string[] = [];
    const v = createVoicer({
      speak: () => (n++ === 0 ? first.promise : second.promise),
      play: (url) => played.push(url),
      captionSeconds: 2.4,
    });
    v.job(JOB);
    v.job({ ...JOB, text: 'Name and protocol.', at: 12 });
    first.resolve(receipt(true));
    await flush();
    v.tick(11, { kind: 'aside', text: JOB.text }, false, false);
    expect(played).toEqual([]); // the stale take is ignored
    second.resolve({ status: 'no worker', ms: 5, receipt: null });
    await flush();
    v.tick(12, { kind: 'aside', text: 'Name and protocol.' }, false, false);
    expect(played).toEqual([]);
    expect(v.status()).toBe('voice: no worker');
    expect(v.stats().noWorker).toBe(1);
  });
});

describe('the worker client', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the gated words and the persona delivery, and reads the receipt', async () => {
    const sent: { url: string; body?: string }[] = [];
    vi.stubGlobal('fetch', async (url: string, init?: { body?: string }) => {
      sent.push({ url, ...(init?.body ? { body: init.body } : {}) });
      if (url.endsWith('/stats') || url.endsWith('/health')) {
        return { ok: true, json: async () => ({ ok: true, engine: 'kokoro-onnx' }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ ...receipt(true).receipt, url: TAKE_URL }),
      };
    });
    const h = await voiceHealth({ url: '/voice' });
    expect(h?.engine).toBe('kokoro-onnx');
    const a = await speakLine(JOB, { url: '/voice' });
    expect(a.status).toBe('voiced');
    expect(a.receipt?.url).toBe(TAKE_URL);
    const body = JSON.parse(sent[1]!.body!) as Record<string, unknown>;
    expect(body).toEqual({
      text: JOB.text,
      kind: 'doorman',
      preset: 'bm_george',
      rate: 1.1,
      loudness: 2,
      max_gap_s: 0.5,
    });
  });

  it('a worker that is down is silence; a refused line is refused; a slow probe aborts', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('ECONNREFUSED');
    });
    expect(await voiceHealth({ url: '/voice' })).toBeNull();
    // A probe that never answers is aborted after its budget, not awaited on the beat.
    vi.stubGlobal(
      'fetch',
      (_url: string, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const t0 = Date.now();
    expect(await voiceHealth({ url: '/voice', timeoutMs: 50 })).toBeNull();
    expect(Date.now() - t0).toBeLessThan(1000);
    vi.stubGlobal('fetch', async () => {
      throw new Error('ECONNREFUSED');
    });
    expect((await speakLine(JOB, { url: '/voice' })).status).toBe('no worker');
    vi.stubGlobal('fetch', async () => ({
      ok: false,
      status: 400,
      json: async () => ({ error: 'no such voice' }),
    }));
    expect((await speakLine(JOB, { url: '/voice' })).status).toBe('refused');
    vi.stubGlobal('fetch', async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: 'a bearer token is required' }),
    }));
    expect((await speakLine(JOB, { url: '/voice' })).status).toBe('refused');
  });

  it('speakLine aborts a hanging worker and says no worker / timeout', async () => {
    let sawSignal = false;
    const fetchImpl = ((_url: string, init?: { signal?: AbortSignal }) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      sawSignal = true;
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    }) as typeof fetch;
    const t0 = Date.now();
    const a = await speakLine(JOB, { url: '/voice', timeoutMs: 50, fetchImpl });
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(sawSignal).toBe(true);
    expect(a.status).toBe('no worker');
    expect(a.why).toBe('timeout');
  });

  it('sends Authorization: Bearer <token> and omits it when unset', async () => {
    const sent: { url: string; headers?: Record<string, string> }[] = [];
    const fetchImpl = (async (url: string, init?: { headers?: Record<string, string> }) => {
      sent.push({ url: String(url), ...(init?.headers ? { headers: init.headers } : {}) });
      return {
        ok: true,
        status: 200,
        json: async () => ({ ...receipt(true).receipt, url: TAKE_URL }),
      };
    }) as typeof fetch;

    await speakLine(JOB, { url: 'http://127.0.0.1:7788', token: 'voice-secret', fetchImpl });
    expect(sent[0]!.url).toMatch(/\/speak$/);
    expect(sent[0]!.headers?.authorization).toBe('Bearer voice-secret');

    sent.length = 0;
    await speakLine(JOB, { url: 'http://127.0.0.1:7788', fetchImpl });
    expect(sent[0]!.headers?.authorization).toBeUndefined();
    expect(sent[0]!.headers ?? {}).not.toHaveProperty('authorization');
  });

  it('a passed receipt whose url is not a take path is not a take', async () => {
    // Both voicers hand receipt.url to a play hook that makes it a media url
    // in a browser, so a hostile or misconfigured worker at VOICE_URL would
    // otherwise control that string. The launcher's proxy allowlist blocks
    // the practical exploit, but it lives in another package.
    const answer = async (url: unknown): Promise<SpeakAnswer> => {
      const fetchImpl = (async () => ({
        ok: true,
        status: 200,
        json: async () => ({ ...receipt(true).receipt, url }),
      })) as unknown as typeof fetch;
      return speakLine(JOB, { url: '/voice', fetchImpl });
    };
    for (const bad of [
      'https://elsewhere.example/take.wav',
      '//elsewhere.example/audio/a1b2c3d4e5f60718293a.wav',
      'javascript:alert(1)',
      '/audio/../../etc/passwd.wav',
      '/audio/a1b2c3d4e5f60718293a.wav?x=1',
      '/audio/A1B2C3D4E5F60718293A.wav',
      '/audio/abc.wav',
      '/audio/.wav',
      '',
      null,
      42,
    ]) {
      const a = await answer(bad);
      expect(a.status, String(bad)).toBe('receipt failed');
      expect(AUDIO_URL.test(String(bad)), String(bad)).toBe(false);
    }
    const good = await answer(TAKE_URL);
    expect(good.status).toBe('voiced');
    expect(good.receipt?.url).toBe(TAKE_URL);
  });

  it('voiceHealth probes /stats with the bearer (401 is not ready)', async () => {
    const sent: { url: string; headers?: Record<string, string> }[] = [];
    const fetchImpl = (async (url: string, init?: { headers?: Record<string, string> }) => {
      sent.push({ url: String(url), ...(init?.headers ? { headers: init.headers } : {}) });
      return { ok: true, json: async () => ({ ok: true, engine: 'kokoro-onnx' }) };
    }) as typeof fetch;
    const h = await voiceHealth({ url: '/voice', token: 'voice-secret', fetchImpl });
    expect(h?.engine).toBe('kokoro-onnx');
    expect(sent[0]!.url).toMatch(/\/stats$/);
    expect(sent[0]!.headers?.authorization).toBe('Bearer voice-secret');

    const unauthorized = (async (url: string, init?: { headers?: Record<string, string> }) => {
      sent.push({ url: String(url), ...(init?.headers ? { headers: init.headers } : {}) });
      return {
        ok: false,
        status: 401,
        json: async () => ({ ok: true, engine: 'kokoro-onnx' }),
      };
    }) as typeof fetch;
    expect(
      await voiceHealth({ url: '/voice', token: 'voice-secret', fetchImpl: unauthorized }),
    ).toBe(null);
    expect(sent[sent.length - 1]!.url).toMatch(/\/stats$/);
    expect(sent[sent.length - 1]!.headers?.authorization).toBe('Bearer voice-secret');

    const bodyFalse = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: false, engine: 'kokoro-onnx' }),
    })) as unknown as typeof fetch;
    expect(await voiceHealth({ url: '/voice', fetchImpl: bodyFalse })).toBeNull();
  });
});

describe('a live worker that answers with something else', () => {
  it('is a failed receipt, not an absent worker, and says so in its own words', async () => {
    // A 200 whose body is not JSON — a proxy's error page, a truncated
    // answer. It used to land in the outer catch as 'no worker', which is
    // the one status that drops the worker for the rest of the session.
    const fetchImpl = (async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON at position 0');
      },
    })) as unknown as typeof fetch;
    const a = await speakLine(JOB, { url: '/voice', fetchImpl });
    expect(a.status).toBe('receipt failed');
    expect(a.error).toBe(BAD_PAYLOAD);
    expect(a.receipt).toBeNull();
    expect(a.why).toBeUndefined();

    const status: string[] = [];
    const v = createVoicer({
      speak: async () => a,
      play: () => expect.unreachable('nothing plays without a receipt'),
      captionSeconds: 2.4,
      onStatus: (s) => status.push(s),
    });
    v.job(JOB);
    await flush();
    expect(v.stats().noWorker).toBe(0);
    expect(v.stats().receiptFailed).toBe(1);
    expect(v.status()).toBe('voice: the worker answered with something unreadable');
    for (const s of status) expect(s).not.toMatch(/\d/);
  });

  it('counts every outcome, so asked never runs ahead of what is accounted for', async () => {
    // The gap: 'speak failed' and both refusals incremented nothing, so a
    // worker that failed or refused every take reported asked=N with every
    // other counter at zero, which reads as N takes still in flight.
    const outcomes: SpeakAnswer[] = [
      receipt(true),
      receipt(false),
      { receipt: null, status: 'no worker', ms: 5 },
      { receipt: null, status: 'speak failed', ms: 5, error: 'speak failed' },
      { receipt: null, status: 'refused', ms: 5, refused: 'payload', error: 'no such voice' },
      { receipt: null, status: 'refused', ms: 5, refused: 'auth' },
    ];
    let i = 0;
    const v = createVoicer({
      speak: async () => outcomes[i++]!,
      play: () => undefined,
      captionSeconds: 2.4,
    });
    for (let n = 0; n < outcomes.length; n++) {
      v.job(JOB);
      // Settle each take before the next, so no job supersedes a pending one
      // and `asked` is exactly the outcomes with nothing left in flight.
      await flush();
    }
    const s = v.stats();
    expect(s.asked).toBe(outcomes.length);
    expect(s.speakFailed).toBe(1);
    expect(s.refused).toBe(2);
    expect(voiceOutcomes(s)).toBe(s.asked);
  });
});
