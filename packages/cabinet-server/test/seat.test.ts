// The beat machine (G13): one verb per beat, prefetched during the previous
// beat, revoked if the view changed, late is the script, a missing answer is
// the script, and the boundary never moves.

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SeatView } from '../src/cabinet';
import {
  askFire,
  createSeat,
  sameView,
  seatPrompt,
  VERB_FORMAT,
  warmUp,
  type FireAnswer,
} from '../src/client';
import { FORBIDDEN } from '../src/gate';

const V: SeatView = {
  kind: 'menu',
  hp: 'high',
  column: 'center',
  stick: 'still',
  motion: 'squash',
  wave: 'rug',
};

function answer(intent: FireAnswer['intent'], suppressed = false): FireAnswer {
  return {
    intent,
    suppressed,
    badCall: false,
    ms: 10,
    low: false,
    raw: { calls: [], content: '', thinking: '', ms: 10, low: false },
  };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('the seat over the fire tool', () => {
  it('asks once, admits at the boundary, then prefetches the next beat', async () => {
    const asks: SeatView[] = [];
    const pending: ReturnType<typeof deferred<FireAnswer>>[] = [];
    const admitted: string[] = [];
    const status: string[] = [];
    const seat = createSeat({
      ask: (v) => {
        asks.push(v);
        const d = deferred<FireAnswer>();
        pending.push(d);
        return d.promise;
      },
      admit: (verb) => admitted.push(verb),
      beatSeconds: 1,
      onStatus: (s) => status.push(s),
    });
    seat.tick(V, 0, false);
    expect(asks).toHaveLength(1);
    expect(seat.busy()).toBe(true);
    seat.tick(V, 0.1, false);
    expect(asks).toHaveLength(1); // never asked twice for one beat
    pending[0]!.resolve(answer('spread'));
    await flush();
    seat.tick(V, 0.2, false);
    expect(admitted).toEqual(['spread']);
    expect(status).toContain('seat called fire: spread');
    // The sim now holds the verb: the next tick prefetches the following beat.
    seat.tick(V, 0.3, true);
    expect(asks).toHaveLength(2);
    pending[1]!.resolve(answer('fog'));
    await flush();
    seat.tick(V, 0.4, true); // still waiting on the beat; the answer is held ready
    expect(admitted).toEqual(['spread']);
    seat.tick(V, 1.0, false); // the sim spent the verb at the beat: admit at once
    expect(admitted).toEqual(['spread', 'fog']);
    const st = seat.stats();
    expect(st.asked).toBe(3);
    expect(st.admitted).toBe(2);
    expect(st.byVerb).toEqual({ spread: 1, fog: 1 });
  });

  it('revokes a prefetched answer when the view changed and asks again', async () => {
    const pending: ReturnType<typeof deferred<FireAnswer>>[] = [];
    const admitted: string[] = [];
    const seat = createSeat({
      ask: () => {
        const d = deferred<FireAnswer>();
        pending.push(d);
        return d.promise;
      },
      admit: (verb) => admitted.push(verb),
      beatSeconds: 1,
    });
    seat.tick(V, 0, true); // prefetch during a held beat
    pending[0]!.resolve(answer('column'));
    await flush();
    const moved: SeatView = { ...V, hp: 'mid', motion: 'slit' };
    seat.tick(moved, 0.5, false); // the beat was spent; the boss's words moved: revoke, re-ask
    expect(admitted).toEqual([]);
    expect(pending).toHaveLength(2);
    pending[1]!.resolve(answer('hold'));
    await flush();
    seat.tick(moved, 0.6, false);
    expect(admitted).toEqual(['hold']);
    expect(seat.stats().revoked).toBe(1);
    expect(sameView(V, moved)).toBe(false);
    expect(sameView(V, { ...V })).toBe(true);
    // The ship's column and stick are read live by the sim; they do not revoke.
    expect(sameView(V, { ...V, column: 'left', stick: 'left' })).toBe(true);
  });

  it('a late answer counts as late; a missing verb, a suppressed answer and an error are the script', async () => {
    const pending: ReturnType<typeof deferred<FireAnswer>>[] = [];
    const admitted: string[] = [];
    const status: string[] = [];
    const seat = createSeat({
      ask: () => {
        const d = deferred<FireAnswer>();
        pending.push(d);
        return d.promise;
      },
      admit: (verb) => admitted.push(verb),
      beatSeconds: 1,
      onStatus: (s) => status.push(s),
    });
    seat.tick(V, 0, false);
    seat.tick(V, 2.5, false); // the beat went by while the seat was thinking
    pending[0]!.resolve(answer(null, true));
    await flush();
    seat.tick(V, 2.6, false);
    expect(admitted).toEqual(['script']);
    expect(seat.stats().late).toBe(1);
    expect(seat.stats().suppressed).toBe(1);
    expect(status).toContain('seat answered, called nothing: script');

    seat.tick(V, 2.7, false); // asks again
    pending[1]!.reject(new Error('tag was retired'));
    await flush();
    seat.tick(V, 2.8, false);
    expect(admitted).toEqual(['script', 'script']);
    expect(status).toContain('seat: model retired');
    expect(seat.stats().errors).toBe(1);

    seat.tick(V, 2.9, false);
    pending[2]!.resolve(answer(null, false));
    await flush();
    seat.tick(V, 3.0, false);
    expect(admitted).toEqual(['script', 'script', 'script']);
    expect(seat.stats().scripted).toBe(3);
  });

  it('drops everything when the boss leaves and never admits a stale answer', async () => {
    const pending: ReturnType<typeof deferred<FireAnswer>>[] = [];
    const admitted: string[] = [];
    const seat = createSeat({
      ask: () => {
        const d = deferred<FireAnswer>();
        pending.push(d);
        return d.promise;
      },
      admit: (verb) => admitted.push(verb),
      beatSeconds: 1,
    });
    seat.tick(V, 0, false);
    seat.tick({ kind: null }, 0.5, false);
    pending[0]!.resolve(answer('spread'));
    await flush();
    seat.tick(V, 1, false);
    expect(admitted).toEqual([]);
    expect(pending).toHaveLength(2);
  });
});

describe('askFire over a daemon', () => {
  afterEach(() => vi.unstubAllGlobals());

  function stub(answer: (body: Record<string, unknown>) => unknown) {
    const sent: Record<string, unknown>[] = [];
    vi.stubGlobal('fetch', async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body) as Record<string, unknown>;
      sent.push(body);
      return { ok: true, json: async () => answer(body) };
    });
    return sent;
  }

  it('sends the fire tool, the schema path and keep_alive for a local model, and takes the verb', async () => {
    const sent = stub(() => ({
      message: {
        content: '',
        tool_calls: [{ function: { name: 'fire', arguments: { verb: 'plate' } } }],
      },
    }));
    const a = await askFire(V, { url: '/x', model: 'qwen2.5:7b-instruct', constrain: true });
    expect(a.intent).toBe('plate');
    expect(a.suppressed).toBe(false);
    const body = sent[0]!;
    expect((body.tools as { function: { name: string } }[]).map((t) => t.function.name)).toEqual([
      'fire',
    ]);
    expect(body.format).toEqual(VERB_FORMAT);
    expect(body.keep_alive).toBe('30m');
    expect(body.think).toBe(false);
    const msgs = body.messages as { content: string }[];
    expect(msgs.map((m) => m.content).join('\n')).not.toMatch(FORBIDDEN);
    expect(seatPrompt(V)).toContain('wave rug');
    expect(() => seatPrompt({ ...V, motion: 'lie' })).toThrow(/forbidden/);
  });

  it('a verb in the content but no tool call is suppression, not a verb', async () => {
    stub(() => ({ message: { content: '{"verb":"spread"}' } }));
    const a = await askFire(V, { url: '/x', model: 'kimi-test:cloud', constrain: true });
    expect(a.intent).toBeNull();
    expect(a.suppressed).toBe(true);
    expect(a.badCall).toBe(false);
  });

  it('a tool call with a verb off the menu is a bad call, not a verb and not suppression', async () => {
    stub(() => ({
      message: {
        content: '',
        tool_calls: [{ function: { name: 'fire', arguments: { verb: 'wave' } } }],
      },
    }));
    const a = await askFire(V, { url: '/x', model: 'kimi-test:cloud' });
    expect(a.intent).toBeNull();
    expect(a.badCall).toBe(true);
    expect(a.suppressed).toBe(false);
  });

  it('retries with low thinking when a model spent its budget thinking, and remembers', async () => {
    const sent = stub((b) =>
      b.think === false
        ? { message: { content: '', thinking: 'The ship is left' } }
        : {
            message: {
              content: '',
              tool_calls: [{ function: { name: 'fire', arguments: { verb: 'column' } } }],
            },
          },
    );
    const model = 'gpt-oss-test:cloud';
    const a = await warmUp({ url: '/x', model });
    expect(a.intent).toBe('column');
    expect(a.low).toBe(true);
    expect(sent.map((s) => s.think)).toEqual([false, 'low']);
    expect((sent[0]!.messages as { content: string }[])[1]!.content).toContain('kind whisperer');
    await askFire(V, { url: '/x', model });
    expect(sent).toHaveLength(3);
    expect(sent[2]!.think).toBe('low');
    expect(sent[2]!.keep_alive).toBeUndefined();
  });

  it('throws on a model error so the seat can say so', async () => {
    stub(() => ({ error: 'some-tag was retired' }));
    await expect(askFire(V, { url: '/x', model: 'old:cloud' })).rejects.toThrow(/retired/);
  });
});
