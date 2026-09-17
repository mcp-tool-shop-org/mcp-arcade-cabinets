// The typing cabinet's voice: which of the user's lines are spoken, and when
// a take is allowed to play. A fake worker and a hand-turned clock, so the
// rule is tested and not the network.

import { describe, expect, it, vi } from 'vitest';

import {
  createVibeVoicer,
  vibeVoiceLine,
  type VibeBeat,
  type VibeLine,
  type VibeVoiceJob,
} from '../src/voice-vibe';
import type { SpeakAnswer, VoiceReceipt } from '../src/voice';
import { BAD_PAYLOAD, VOICE_WORDS } from '../src/voice-words';

const BEATS: VibeBeat[] = ['request', 'reply', 'code', 'ship', 'compaction', 'creep', 'sync'];

describe('which of the user lines are spoken', () => {
  const table: {
    who: 'user' | 'agent';
    nag: boolean;
    beat: VibeBeat;
    shipped: boolean;
    want: VibeLine | null;
  }[] = [
    { who: 'user', nag: false, beat: 'request', shipped: false, want: 'ask' },
    { who: 'user', nag: false, beat: 'creep', shipped: false, want: 'creep' },
    { who: 'user', nag: true, beat: 'code', shipped: false, want: 'nag' },
    { who: 'user', nag: false, beat: 'ship', shipped: false, want: 'reaction' },
    { who: 'user', nag: false, beat: 'ship', shipped: true, want: 'review' },
    { who: 'user', nag: false, beat: 'sync', shipped: false, want: null },
    { who: 'user', nag: false, beat: 'code', shipped: false, want: null },
    { who: 'user', nag: false, beat: 'reply', shipped: false, want: null },
    { who: 'user', nag: false, beat: 'compaction', shipped: false, want: null },
    // A check-in outside the code beat is not a check-in the sim makes, and
    // is not spoken as one either.
    { who: 'user', nag: true, beat: 'request', shipped: false, want: null },
    { who: 'user', nag: true, beat: 'sync', shipped: false, want: null },
  ];

  for (const row of table) {
    const name = `${row.who}${row.nag ? ' checking in' : ''} on ${row.beat}${
      row.shipped ? ' with the ship frame' : ''
    } is ${row.want ?? 'not spoken'}`;
    it(name, () => {
      expect(vibeVoiceLine(row)).toBe(row.want);
    });
  }

  it('never speaks the agent, on any beat', () => {
    for (const beat of BEATS) {
      for (const nag of [false, true]) {
        for (const shipped of [false, true]) {
          expect(vibeVoiceLine({ who: 'agent', nag, beat, shipped }), beat).toBeNull();
        }
      }
    }
  });

  it('never speaks anything in the meeting', () => {
    for (const nag of [false, true]) {
      for (const shipped of [false, true]) {
        expect(vibeVoiceLine({ who: 'user', nag, beat: 'sync', shipped })).toBeNull();
      }
    }
  });
});

// ——— the voicer ————————————————————————————————————————————————————————————

let seq = 0;

function job(line: VibeLine, text = `line ${(seq += 1)}`): VibeVoiceJob {
  return {
    text,
    kind: 'user',
    line,
    seq,
    voice: { preset: 'af_bella', rate: 1, loudness: -4 },
    maxGap: 0.5,
  };
}

function receipt(ok: boolean, cached = false, duration = 1): VoiceReceipt {
  return {
    id: 'abc',
    ok,
    text: 'x',
    heard: 'x',
    duration_s: duration,
    tts_s: 0.4,
    asr_s: 0.3,
    cached,
    checks: [{ check: 'line_present', ok, detail: ok ? '' : 'not found' }],
    url: ok ? '/audio/abc.wav' : null,
  };
}

/** A worker whose answers are handed back one at a time, by the test. */
function fakeWorker() {
  const queue: ((a: SpeakAnswer) => void)[] = [];
  const speak = vi.fn(
    (_j: VibeVoiceJob) => new Promise<SpeakAnswer>((resolve) => queue.push(resolve)),
  );
  return {
    speak,
    /** Answer the nth outstanding take, and let the promise land. */
    async answer(index: number, a: SpeakAnswer) {
      const resolve = queue[index];
      if (!resolve) throw new Error(`no take ${index}`);
      resolve(a);
      await Promise.resolve();
      await Promise.resolve();
    },
    get outstanding() {
      return queue.length;
    },
  };
}

const VOICED: SpeakAnswer = { receipt: receipt(true), status: 'voiced', ms: 900 };
const FAILED: SpeakAnswer = { receipt: receipt(false), status: 'receipt failed', ms: 950 };

/**
 * A clock the test turns. The queue waits a take out by the receipt's own
 * length when the player hands back no `done`, so the rule needs one.
 */
function clock() {
  let t = 1_000_000;
  return {
    now: () => t,
    pass(ms: number) {
      t += ms;
    },
  };
}

describe('the timing rule', () => {
  it('plays a take on the beat its line still holds', async () => {
    const worker = fakeWorker();
    const played: string[] = [];
    const v = createVibeVoicer({
      speak: worker.speak,
      play: (_url, j) => played.push(j.text),
    });
    v.job(job('ask', 'is it live yet'));
    v.tick('request', false);
    v.tick('reply', false);
    await worker.answer(0, VOICED);
    v.tick('reply', false);
    expect(played).toEqual(['is it live yet']);
    expect(v.stats().playedOnBeat).toBe(1);
    expect(v.stats().voiced).toBe(1);
    expect(v.status()).toBe('voice: spoke on the beat');
  });

  it('holds a take that missed its beat and plays it at the next ask', async () => {
    const worker = fakeWorker();
    const played: string[] = [];
    const v = createVibeVoicer({ speak: worker.speak, play: (_u, j) => played.push(j.text) });
    v.job(job('nag', 'my cousin is asking'));
    v.tick('code', false);
    // The receipt comes back after the code beat is gone.
    await worker.answer(0, VOICED);
    v.tick('ship', false);
    expect(played).toEqual([]);
    expect(v.status()).toBe('voice: held for the next ask');
    // The request frame is one step; the held take waits for it and plays.
    v.tick('request', false);
    expect(played).toEqual(['my cousin is asking']);
    expect(v.stats().playedAtBoundary).toBe(1);
    expect(v.stats().playedOnBeat).toBe(0);
  });

  it('does not play a take at the boundary that held it', async () => {
    const worker = fakeWorker();
    const played: string[] = [];
    const v = createVibeVoicer({ speak: worker.speak, play: (_u, j) => played.push(j.text) });
    v.job(job('nag', 'is it still building'));
    v.tick('code', false);
    await worker.answer(0, VOICED);
    // The request frame both fails the check-in's beat and is a boundary.
    v.tick('request', false);
    expect(played).toEqual([]);
    // It is the NEXT one that plays it.
    v.tick('reply', false);
    v.tick('request', false);
    expect(played).toEqual(['is it still building']);
  });

  it('drops a held take when a newer user line lands first', async () => {
    const worker = fakeWorker();
    const played: string[] = [];
    const v = createVibeVoicer({ speak: worker.speak, play: (_u, j) => played.push(j.text) });
    v.job(job('nag', 'let me see it'));
    v.tick('code', false);
    await worker.answer(0, VOICED);
    v.tick('ship', false);
    expect(v.status()).toBe('voice: held for the next ask');
    // The next ask lands, which is what the user is saying now.
    v.job(job('ask', 'make it purple'));
    v.tick('request', false);
    expect(played).toEqual([]);
    expect(v.stats().dropped).toBe(1);
    await worker.answer(1, VOICED);
    v.tick('reply', false);
    expect(played).toEqual(['make it purple']);
  });

  it('replaces a take still at the worker when a newer line lands', async () => {
    const worker = fakeWorker();
    const played: string[] = [];
    // An ask and then a scope creep: not the one pair that queues, so the
    // newer line takes the older one's place at the worker.
    const v = createVibeVoicer({ speak: worker.speak, play: (_u, j) => played.push(j.text) });
    v.job(job('ask', 'make it count the ducks'));
    v.job(job('creep', 'oh also make it sing'));
    expect(v.stats().replaced).toBe(1);
    // The replaced take's receipt still comes back, and is not played.
    await worker.answer(0, VOICED);
    v.tick('code', false);
    expect(played).toEqual([]);
    await worker.answer(1, VOICED);
    v.tick('code', false);
    expect(played).toEqual(['oh also make it sing']);
    expect(v.stats().asked).toBe(2);
    expect(v.stats().voiced).toBe(1);
  });

  it('never plays a take whose receipt failed', async () => {
    const worker = fakeWorker();
    const played: string[] = [];
    const v = createVibeVoicer({ speak: worker.speak, play: (_u, j) => played.push(j.text) });
    v.job(job('ask', 'count down from ten'));
    await worker.answer(0, FAILED);
    for (const beat of BEATS) v.tick(beat, false);
    expect(played).toEqual([]);
    expect(v.stats().receiptFailed).toBe(1);
    expect(v.stats().voiced).toBe(0);
    expect(v.status()).toBe(VOICE_WORDS.receiptFailed);
  });

  it('tells an unreadable body apart from any other failed receipt', async () => {
    // The shooter made this distinction and this cabinet collapsed it, so
    // one worker behavior read as two different events depending on which
    // cabinet was up. The words are the shared table's now.
    const worker = fakeWorker();
    const v = createVibeVoicer({ speak: worker.speak, play: () => undefined });
    v.job(job('ask'));
    await worker.answer(0, {
      receipt: null,
      status: 'receipt failed',
      ms: 7,
      error: BAD_PAYLOAD,
    });
    expect(v.status()).toBe(VOICE_WORDS.unreadable);
    expect(v.status()).not.toBe(VOICE_WORDS.receiptFailed);
  });

  it('counts a worker that is not there, and plays nothing', async () => {
    const worker = fakeWorker();
    const played: string[] = [];
    const v = createVibeVoicer({ speak: worker.speak, play: (_u, j) => played.push(j.text) });
    v.job(job('ask'));
    await worker.answer(0, { receipt: null, status: 'no worker', ms: 12 });
    v.tick('reply', false);
    expect(played).toEqual([]);
    expect(v.stats().noWorker).toBe(1);
    expect(v.status()).toBe('voice: no worker');
  });

  it("says the refusal in a word of its own, never the worker's", async () => {
    const worker = fakeWorker();
    const v = createVibeVoicer({ speak: worker.speak, play: () => undefined });
    v.job(job('ask'));
    // The worker's own sentence names an engine. It is never printed.
    await worker.answer(0, {
      receipt: null,
      status: 'refused',
      ms: 8,
      refused: 'payload',
      error: 'kokoro has no such preset',
    });
    expect(v.status()).toBe(VOICE_WORDS.refused);
    expect(v.status()).not.toContain('kokoro');
    expect(v.stats().refused).toBe(1);

    const bearer = createVibeVoicer({ speak: worker.speak, play: () => undefined });
    bearer.job(job('ask'));
    await worker.answer(1, { receipt: null, status: 'refused', ms: 4, refused: 'auth' });
    expect(bearer.status()).toBe(VOICE_WORDS.auth);
  });

  it('drops a slot whose speak hook threw, and says so', async () => {
    const played: string[] = [];
    const v = createVibeVoicer({
      speak: () => Promise.reject(new Error('the hook threw')),
      play: (_u, j) => played.push(j.text),
    });
    v.job(job('ask', 'is it live yet'));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(v.status()).toBe('voice: the worker did not answer');
    expect(v.stats().noWorker).toBe(1);
    // And the slot left, so the line behind it is not stuck.
    const worker = fakeWorker();
    const v2 = createVibeVoicer({ speak: worker.speak, play: (_u, j) => played.push(j.text) });
    v2.job(job('ask', 'make it purple'));
    await worker.answer(0, VOICED);
    v2.tick('reply', false);
    expect(played).toEqual(['make it purple']);
  });

  it('drops everything when the run ends, and speaks nothing after', async () => {
    const worker = fakeWorker();
    const played: string[] = [];
    const v = createVibeVoicer({ speak: worker.speak, play: (_u, j) => played.push(j.text) });
    v.job(job('review', 'we shipped it, i am emotional'));
    await worker.answer(0, VOICED);
    v.tick('code', false);
    expect(v.status()).toBe('voice: held for the next ask');
    v.tick('code', true);
    expect(v.stats().dropped).toBe(1);
    v.tick('request', false);
    expect(played).toEqual([]);
    v.job(job('ask'));
    expect(worker.outstanding).toBe(1);
    expect(v.stats().asked).toBe(1);
  });

  it('counts a receipted take a newer line takes the place of', async () => {
    const worker = fakeWorker();
    const played: string[] = [];
    const v = createVibeVoicer({ speak: worker.speak, play: (_u, j) => played.push(j.text) });
    v.job(job('ask', 'count the ducks'));
    // Cached: the ask is back before the frame the creep lands on, and is
    // waiting for this frame's decision when the newer line arrives.
    await worker.answer(0, { receipt: receipt(true, true), status: 'voiced', ms: 3 });
    v.job(job('creep', 'oh also, in purple'));
    await worker.answer(1, { receipt: receipt(true, true), status: 'voiced', ms: 3 });
    v.tick('code', false);
    expect(played).toEqual(['oh also, in purple']);
    expect(v.stats().dropped).toBe(1);
  });

  it('counts a cached take and its milliseconds', async () => {
    const worker = fakeWorker();
    const v = createVibeVoicer({ speak: worker.speak, play: () => undefined });
    v.job(job('ask'));
    await worker.answer(0, { receipt: receipt(true, true), status: 'voiced', ms: 40 });
    expect(v.stats().cached).toBe(1);
    expect(v.stats().msSum).toBe(40);
  });

  it('plays a cold reaction and the ask behind it, in order, once each', async () => {
    const worker = fakeWorker();
    const c = clock();
    const played: string[] = [];
    const v = createVibeVoicer({
      speak: worker.speak,
      play: (_u, j) => played.push(j.text),
      now: c.now,
    });
    // The ship frame says the reaction; the sim enters the next request two
    // frames later and the ask lands on top of it, with the worker still
    // holding the first take.
    v.job(job('reaction', 'my cat now has a contact form.'));
    v.tick('ship', false);
    v.job(job('ask', 'now make it purple'));
    v.tick('request', false);
    expect(v.stats().replaced).toBe(0);
    expect(v.stats().asked).toBe(2);

    // The reaction's receipt comes back first and plays at once: the next
    // request's reply beat is still in hand for it.
    await worker.answer(0, VOICED);
    v.tick('reply', false);
    expect(played).toEqual(['my cat now has a contact form.']);

    // The ask's receipt is back, but the reaction is still in the air.
    await worker.answer(1, VOICED);
    c.pass(400);
    v.tick('reply', false);
    expect(played).toEqual(['my cat now has a contact form.']);

    // The take ends, and the ask follows it.
    c.pass(900);
    v.tick('reply', false);
    expect(played).toEqual(['my cat now has a contact form.', 'now make it purple']);
    expect(v.stats().playedOnBeat).toBe(2);
    expect(v.stats().dropped).toBe(0);

    // And once each: another frame adds nothing.
    c.pass(2000);
    v.tick('reply', false);
    expect(played.length).toBe(2);
  });

  it('follows the take element rather than the clock when it is handed one', async () => {
    const worker = fakeWorker();
    const c = clock();
    const played: string[] = [];
    let endReaction = () => undefined as void;
    const v = createVibeVoicer({
      speak: worker.speak,
      play: (_u, j, done) => {
        played.push(j.text);
        if (j.line === 'review') endReaction = done;
      },
      now: c.now,
    });
    v.job(job('review', 'we shipped it, i am emotional'));
    v.job(job('ask', 'now do the next one'));
    await worker.answer(0, { receipt: receipt(true, false, 30), status: 'voiced', ms: 800 });
    v.tick('reply', false);
    await worker.answer(1, VOICED);
    v.tick('reply', false);
    expect(played).toEqual(['we shipped it, i am emotional']);
    // The receipt says thirty seconds; the element says it is over now.
    endReaction();
    v.tick('reply', false);
    expect(played).toEqual(['we shipped it, i am emotional', 'now do the next one']);
  });

  it('lets the ask play at once when the reaction receipt failed', async () => {
    const worker = fakeWorker();
    const c = clock();
    const played: string[] = [];
    const v = createVibeVoicer({
      speak: worker.speak,
      play: (_u, j) => played.push(j.text),
      now: c.now,
    });
    v.job(job('reaction', 'the table splits seventeen ducks'));
    v.job(job('ask', 'make it rate my handwriting'));
    await worker.answer(0, FAILED);
    await worker.answer(1, VOICED);
    v.tick('reply', false);
    expect(played).toEqual(['make it rate my handwriting']);
    expect(v.stats().receiptFailed).toBe(1);
    expect(v.stats().playedOnBeat).toBe(1);
  });

  it('drops the older of two in hand when a third line lands', async () => {
    const worker = fakeWorker();
    const c = clock();
    const played: string[] = [];
    const v = createVibeVoicer({
      speak: worker.speak,
      play: (_u, j) => played.push(j.text),
      now: c.now,
    });
    v.job(job('reaction', 'the greeting knows every duck'));
    v.job(job('ask', 'give it a countdown'));
    // A scope creep, while both are still at the worker.
    v.job(job('creep', 'oh also make it purple'));
    expect(v.stats().replaced).toBe(1);
    await worker.answer(0, VOICED);
    await worker.answer(1, VOICED);
    await worker.answer(2, VOICED);
    v.tick('reply', false);
    c.pass(2000);
    v.tick('code', false);
    c.pass(2000);
    v.tick('code', false);
    expect(played).toEqual(['give it a countdown', 'oh also make it purple']);
  });

  it('never cuts off the take that is playing', async () => {
    const worker = fakeWorker();
    const c = clock();
    const played: string[] = [];
    const v = createVibeVoicer({
      speak: worker.speak,
      play: (_u, j) => played.push(j.text),
      now: c.now,
    });
    v.job(job('reaction', 'my fern has never looked more monitored.'));
    v.job(job('ask', 'add a page for the fern'));
    await worker.answer(0, VOICED);
    v.tick('reply', false);
    expect(played).toEqual(['my fern has never looked more monitored.']);
    // A third line while the first is in the air: the ask behind it goes,
    // not the one being heard.
    v.job(job('creep', 'tiny thing, make it green'));
    expect(v.stats().replaced).toBe(1);
    await worker.answer(2, VOICED);
    // The fern's take runs out, and the creep follows it on its own beat.
    c.pass(2000);
    v.tick('code', false);
    expect(played).toEqual([
      'my fern has never looked more monitored.',
      'tiny thing, make it green',
    ]);
  });

  it('hands the worker the words and the delivery and nothing else', async () => {
    const worker = fakeWorker();
    const v = createVibeVoicer({ speak: worker.speak, play: () => undefined });
    const j = job('ask', 'make it purple');
    v.job(j);
    expect(worker.speak).toHaveBeenCalledWith(j);
    expect(Object.keys(j).sort()).toEqual(['kind', 'line', 'maxGap', 'seq', 'text', 'voice']);
  });
});
