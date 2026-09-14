// The voicer (G15): the client of the host-side voice worker, and the
// timing rule for a spoken line. A line is sent to the worker the moment
// it is admitted (one beat ahead); the worker speaks it, hears it back and
// runs fx-dub's spoken-content receipt. A take whose receipt failed is
// never played. A take that arrives while its line is on the field plays
// at once; one that misses its beat waits for the next breather; one
// still unplayed at the scene is dropped. Words only in every status.

import type { VoiceJob } from './host';

export interface VoiceReceipt {
  id: string;
  ok: boolean;
  text: string;
  heard: string;
  duration_s: number;
  tts_s: number;
  asr_s: number;
  cached: boolean;
  checks: { check: string; ok: boolean; detail: string }[];
  /** Served only when the receipt passed. */
  url: string | null;
}

export interface SpeakAnswer {
  receipt: VoiceReceipt | null;
  /** Words for the status line. */
  status: 'voiced' | 'receipt failed' | 'no worker' | 'refused' | 'speak failed';
  ms: number;
  /** 400 is a bad job on a live worker; 401 is not ready. */
  refused?: 'payload' | 'auth';
  /** Set when the speak POST was aborted. */
  why?: 'timeout';
  /** Path-free worker `error` field from a 400/401/500 JSON body. */
  error?: string;
}

export interface VoiceOpts {
  /** The worker's base, e.g. `/voice` behind the dev proxy or `http://127.0.0.1:7788`. */
  url: string;
  /** The worker's bearer token, when it binds beyond loopback (VOICE_TOKEN). */
  token?: string;
  fetchImpl?: typeof fetch;
}

function headersFor(opts: VoiceOpts, json = false): Record<string, string> {
  const h: Record<string, string> = {};
  if (json) h['content-type'] = 'application/json';
  if (opts.token) h.authorization = `Bearer ${opts.token}`;
  return h;
}

/** Worker error field, dropped if it looks like a path. Never a home path. */
async function readError(res: Response): Promise<string | undefined> {
  try {
    const j = (await res.json()) as { error?: unknown };
    if (typeof j.error !== 'string') return undefined;
    const e = j.error.trim();
    if (e === '' || e.includes('/') || e.includes('\\') || /[A-Za-z]:[\\/]/.test(e)) {
      return undefined;
    }
    return e.slice(0, 80);
  } catch {
    return undefined;
  }
}

/** Milliseconds a liveness probe may take before the worker counts as absent. */
export const PROBE_MS = 200;

/** Milliseconds a speak POST may take before the worker counts as absent. */
export const SPEAK_MS = 20_000;

/**
 * Whether a worker will speak for us. Open GET /health is not enough: it
 * never requires the bearer, so a token mismatch still looks live while
 * POST /speak 401s. Probe GET /stats with the bearer; 401 is not ready.
 * Null when none. The probe aborts after PROBE_MS so it can run beside
 * the beat, never on it.
 */
export async function voiceHealth(
  opts: VoiceOpts & { timeoutMs?: number },
): Promise<{ engine: string } | null> {
  const f = opts.fetchImpl ?? fetch;
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), opts.timeoutMs ?? PROBE_MS) : null;
  try {
    const res = await f(`${opts.url}/stats`, {
      headers: headersFor(opts),
      ...(ctl ? { signal: ctl.signal } : {}),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { ok?: boolean; engine?: string };
    if (!j.ok) return null;
    return { engine: String(j.engine ?? '') };
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Ask the worker to speak one gated line in the persona's voice and receipt it. */
export async function speakLine(
  job: VoiceJob,
  opts: VoiceOpts & { timeoutMs?: number },
): Promise<SpeakAnswer> {
  const f = opts.fetchImpl ?? fetch;
  const t0 = Date.now();
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), opts.timeoutMs ?? SPEAK_MS) : null;
  try {
    const res = await f(`${opts.url}/speak`, {
      method: 'POST',
      headers: headersFor(opts, true),
      body: JSON.stringify({
        text: job.text,
        kind: job.kind,
        preset: job.voice.preset,
        rate: job.voice.rate,
        loudness: job.voice.loudness,
        max_gap_s: job.maxGap,
      }),
      ...(ctl ? { signal: ctl.signal } : {}),
    });
    const ms = Date.now() - t0;
    if (res.status === 400 || res.status === 401 || res.status === 500) {
      const error = await readError(res);
      if (res.status === 500) {
        return { receipt: null, status: 'speak failed', ms, ...(error ? { error } : {}) };
      }
      return {
        receipt: null,
        status: 'refused',
        ms,
        refused: res.status === 401 ? 'auth' : 'payload',
        ...(error ? { error } : {}),
      };
    }
    if (!res.ok) return { receipt: null, status: 'no worker', ms };
    const r = (await res.json()) as VoiceReceipt;
    return { receipt: r, status: r.ok ? 'voiced' : 'receipt failed', ms };
  } catch (err) {
    const ms = Date.now() - t0;
    const timedOut =
      ctl?.signal.aborted === true || (err instanceof Error && err.name === 'AbortError');
    return {
      receipt: null,
      status: 'no worker',
      ms,
      ...(timedOut ? { why: 'timeout' as const } : {}),
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export interface VoicerStats {
  asked: number;
  voiced: number;
  playedOnBeat: number;
  playedInBreather: number;
  dropped: number;
  receiptFailed: number;
  noWorker: number;
  cached: number;
  msSum: number;
}

export interface Voicer {
  /** The host's voice hook: hand a job in. */
  job(job: VoiceJob): void;
  /**
   * Call every frame with the round clock, the caption on the field (kind
   * and text, or null), whether the round is in a breather, and whether it
   * ended.
   */
  tick(
    t: number,
    caption: { kind: string; text: string; line?: string } | null,
    breather: boolean,
    ended: boolean,
  ): void;
  stats(): VoicerStats;
  status(): string;
}

export interface VoicerOpts {
  speak: (job: VoiceJob) => Promise<SpeakAnswer>;
  /** Play a passed take by its url. */
  play: (url: string, job: VoiceJob) => void;
  /** Seconds a line stays on the field (the sim's SAY_CAPTION_T). */
  captionSeconds: number;
  onStatus?: (status: string) => void;
}

/**
 * The timing rule. One take in flight at a time; a new job while one is
 * pending replaces it, and drops a take that is ready or held for the
 * breather (the boss says the newer thing). Ending the round bumps the
 * generation token so a late receipt cannot land next round. The take
 * plays at once if its own line is on the field, or within the caption
 * window on a clear field; never over a catch or a wave card; else at
 * the next breather; else never.
 */
export function createVoicer(opts: VoicerOpts): Voicer {
  const stats: VoicerStats = {
    asked: 0,
    voiced: 0,
    playedOnBeat: 0,
    playedInBreather: 0,
    dropped: 0,
    receiptFailed: 0,
    noWorker: 0,
    cached: 0,
    msSum: 0,
  };
  let token = 0;
  let pending: { job: VoiceJob; token: number } | null = null;
  let ready: { job: VoiceJob; url: string } | null = null;
  let held: { job: VoiceJob; url: string } | null = null;
  let last = 'voice waiting';
  let now = 0;
  const say = (s: string) => {
    last = s;
    opts.onStatus?.(s);
  };

  return {
    job(job) {
      const mine = ++token;
      pending = { job, token: mine };
      // One take at a time: a newer line drops a held breather take and an
      // already-receipted ready take, so the next tick cannot play the stale
      // line over (or beside) the new one.
      if (held) {
        held = null;
        stats.dropped += 1;
      }
      if (ready) {
        ready = null;
        stats.dropped += 1;
      }
      stats.asked += 1;
      say('voice speaking ahead');
      void opts.speak(job).then((a) => {
        if (!pending || pending.token !== mine) return;
        pending = null;
        stats.msSum += a.ms;
        if (a.status === 'voiced' && a.receipt?.url) {
          stats.voiced += 1;
          if (a.receipt.cached) stats.cached += 1;
          ready = { job, url: a.receipt.url };
          say('voice: receipt ok');
          return;
        }
        if (a.status === 'receipt failed') {
          stats.receiptFailed += 1;
          say('voice: receipt failed, not played');
          return;
        }
        if (a.status === 'speak failed') {
          say('voice: speak failed');
          return;
        }
        if (a.status === 'no worker') {
          stats.noWorker += 1;
          say(
            a.why === 'timeout' ? 'voice: the worker did not answer in time' : 'voice: no worker',
          );
          return;
        }
        if (a.refused === 'auth') {
          say('voice: refused (bearer)');
          return;
        }
        const why =
          a.error && !/\d/.test(a.error) && !a.error.includes('/') && !a.error.includes('\\')
            ? a.error
            : '';
        say(why ? `voice: refused (${why})` : 'voice: refused');
      });
    },
    tick(t, caption, breather, ended) {
      now = t;
      if (ended) {
        token += 1;
        if (ready || held || pending) stats.dropped += 1;
        pending = null;
        ready = null;
        held = null;
        return;
      }
      if (ready) {
        // Its own line is on the field, or the field is clear and its time
        // is within the caption window: play now. Never over a catch or a card.
        // Its own line: a seat's aside, or the boss's spawn line under its wave card.
        const ownLine =
          caption !== null &&
          ((caption.kind === 'aside' && caption.text === ready.job.text) ||
            (caption.kind === 'wave' && caption.line === ready.job.text));
        const clearWindow = caption === null && now < ready.job.at + opts.captionSeconds;
        if (ownLine || clearWindow) {
          opts.play(ready.url, ready.job);
          stats.playedOnBeat += 1;
          say('voice: spoke on the beat');
          ready = null;
        } else {
          // Missed its beat: wait for the next breather.
          held = ready;
          ready = null;
          say('voice: held for the breather');
        }
      }
      if (held && breather) {
        opts.play(held.url, held.job);
        stats.playedInBreather += 1;
        say('voice: spoke in the breather');
        held = null;
      }
    },
    stats: () => stats,
    status: () => last,
  };
}
