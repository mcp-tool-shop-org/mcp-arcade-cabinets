// The voicer (G15): every take is receipted before it plays; a failed
// receipt is never played; a take that arrives while its line is up plays
// at once, one that missed its beat waits for the breather, one still
// unplayed at the scene is dropped. Words only in every status.

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { VoiceJob } from '../src/host';
import { DEFAULT_PERSONAS } from '../src/personas';
import { createVoicer, speakLine, voiceHealth, type SpeakAnswer } from '../src/voice';

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
      id: 'abc',
      ok,
      text: JOB.text,
      heard: JOB.text,
      duration_s: 2.9,
      tts_s: 0.7,
      asr_s: 0.3,
      cached,
      checks: [{ check: 'no_invented_speech', ok, detail: ok ? 'clean' : 'one unscripted word' }],
      url: ok ? '/audio/abc.wav' : null,
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
    expect(played).toEqual(['/audio/abc.wav']);
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
    expect(played).toEqual(['/audio/abc.wav']);
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
    expect(played).toEqual(['/audio/abc.wav']);
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
      if (url.endsWith('/health')) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            engine: 'kokoro-onnx',
            device: 'cuda',
            voices: ['bm_george'],
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ ...receipt(true).receipt, url: '/audio/abc.wav' }),
      };
    });
    const h = await voiceHealth({ url: '/voice' });
    expect(h?.engine).toBe('kokoro-onnx');
    const a = await speakLine(JOB, { url: '/voice' });
    expect(a.status).toBe('voiced');
    expect(a.receipt?.url).toBe('/audio/abc.wav');
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

  it('a worker that is down is silence; a refused line is refused', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('ECONNREFUSED');
    });
    expect(await voiceHealth({ url: '/voice' })).toBeNull();
    expect((await speakLine(JOB, { url: '/voice' })).status).toBe('no worker');
    vi.stubGlobal('fetch', async () => ({
      ok: false,
      status: 400,
      json: async () => ({ error: 'no such voice' }),
    }));
    expect((await speakLine(JOB, { url: '/voice' })).status).toBe('refused');
  });
});
