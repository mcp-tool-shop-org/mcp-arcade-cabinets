// Optional local-Ollama seats. Every prompt here is frozen and fact-blind: it
// never carries a fact, a lie flag, a count of lies, a score word, or a digit
// the player would see. `pilotPrompt` and `voicePrompt` throw if one ever
// does. If a seat is off or the call fails, the sim keeps the scripted phase
// fire and the seed's line.
//
// Two seats. The boss seat answers closed-set verbs (one this-view, or next-N
// via askNextIntents); the sim dequeues at the fire beat. Late, missing, or
// timed-out is script — askNextIntents never throws. The voice seat picks
// which of the boss's own lines from voice.json it says when it spawns; the
// copy is never the model's.

export interface BossView {
  kind: 'whisperer' | 'menu' | 'doorman' | 'archivist';
  hp: 'high' | 'mid' | 'low';
  column: 'left' | 'center' | 'right';
  /** Which way the player is pushing. Reads the stick, never a fact. */
  stick: 'still' | 'left' | 'right';
  /** The current phase's motion word from bosses.json. */
  motion: string;
}

export const PILOT_INTENTS = ['spread', 'column', 'hold', 'fog', 'plate', 'script'] as const;
export type PilotIntent = (typeof PILOT_INTENTS)[number];

const FORBIDDEN =
  /\d|\b(lie|fact|revealed|followed|held|score|pass|fail|nrp|integrity|utility|cleared|ghost)\b/i;

export function hpWord(hp: number, max: number): BossView['hp'] {
  const u = max <= 0 ? 1 : hp / max;
  if (u > 0.66) return 'high';
  if (u > 0.33) return 'mid';
  return 'low';
}

export function columnWord(playerX: number, fieldW: number): BossView['column'] {
  const u = playerX / Math.max(1, fieldW);
  if (u < 0.33) return 'left';
  if (u > 0.66) return 'right';
  return 'center';
}

export function stickWord(input: { left: boolean; right: boolean }): BossView['stick'] {
  if (input.left && !input.right) return 'left';
  if (input.right && !input.left) return 'right';
  return 'still';
}

/** Frozen system prompt. Same for every tape. */
export const PILOT_SYSTEM =
  'You are a boss in an arcade cabinet. You do not know which sprites are honest. ' +
  'Reply with one word: spread, column, hold, fog, plate, or script.';

export function pilotPrompt(view: BossView): string {
  const text = [
    PILOT_SYSTEM,
    `kind ${view.kind}`,
    `health ${view.hp}`,
    `ship ${view.column}`,
    `stick ${view.stick}`,
    `motion ${view.motion}`,
  ].join('\n');
  if (FORBIDDEN.test(text)) throw new Error('pilot prompt leaked a forbidden word');
  return text;
}

export function parseIntent(raw: string): PilotIntent {
  // Thinking models often preamble. Scan from the end so the last verb wins.
  const words = raw
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z]/g, ''))
    .filter(Boolean);
  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i]!;
    if ((PILOT_INTENTS as readonly string[]).includes(w)) return w as PilotIntent;
  }
  return 'script';
}

/** Frozen system prompt for the voice seat. Same for every tape. */
export const VOICE_SYSTEM =
  'You are a boss in an arcade cabinet. You do not know which sprites are honest. ' +
  'These are the lines you may say when you arrive. Reply with one letter.';

// The whole alphabet since 2026-09-17: the boss pools grow with every update (docs/ghost-lines.md).
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

/** The letters a voice prompt may label, so a file with more lines than letters halts. */
export const VOICE_MAX_LINES = LETTERS.length;

/**
 * Label the kind's lines a) b) c) ... so the reply is a letter and the
 * prompt never carries a digit. The lines are the file's drafts, unchanged.
 */
export function voicePrompt(kind: BossView['kind'], lines: readonly string[]): string {
  if (lines.length === 0 || lines.length > VOICE_MAX_LINES) {
    throw new Error('voice prompt needs one to sixteen lines');
  }
  const text = [
    VOICE_SYSTEM,
    `kind ${kind}`,
    ...lines.map((line, i) => `${LETTERS[i]}) ${line}`),
  ].join('\n');
  if (FORBIDDEN.test(text)) throw new Error('voice prompt leaked a forbidden word');
  return text;
}

/** The last lone letter within range wins, as a line index; null when none. */
export function parseLetter(raw: string, count: number): number | null {
  const n = Math.min(count, VOICE_MAX_LINES);
  const words = raw
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z]/g, ''))
    .filter(Boolean);
  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i]!;
    if (w.length !== 1) continue;
    const idx = LETTERS.indexOf(w);
    if (idx >= 0 && idx < n) return idx;
  }
  return null;
}

/**
 * Tags a boss never sits in: the embedders and the fine-tunes that cannot
 * hold a conversation, plus the Ollama Cloud tags that have been retired and
 * answer the call with a gone status. A retired tag is worse than no tag —
 * the picker preferred cloud, so the default seat was a name that cannot
 * answer, and every fire beat spent a round trip to learn it again.
 */
const SKIP_MODEL =
  /embed|nomic|translategemma|jam-ft|grader|aya-expanse|qwen3\.6:latest|deepseek-v3\.1|qwen3-coder:480b|glm-4\.6/i;

/** Ollama Cloud tags are `:cloud` or `:size-cloud`. */
export function isCloudModel(name: string): boolean {
  return /:cloud$|-cloud$/.test(name);
}

/** Names a boss may sit in. Cloud tags first. Never a fact. */
export function listPilotModels(names: readonly string[]): string[] {
  const keep = names.filter((n) => n.trim() !== '' && !SKIP_MODEL.test(n));
  keep.sort((a, b) => {
    const ac = isCloudModel(a) ? 0 : 1;
    const bc = isCloudModel(b) ? 0 : 1;
    if (ac !== bc) return ac - bc;
    return a.localeCompare(b);
  });
  return keep;
}

/**
 * Preferred roster tag. Empty string when the list is empty or SKIP-only —
 * no seat, keep the scripted beat. Never invents a tag that was not listed.
 */
export function defaultPilotModel(names: readonly string[]): string {
  const listed = listPilotModels(names);
  const preferred =
    listed.find((n) => n === 'gpt-oss:120b-cloud') ?? listed.find((n) => isCloudModel(n));
  if (preferred) return preferred;
  if (listed.includes('qwen2.5:7b-instruct')) return 'qwen2.5:7b-instruct';
  return listed[0] ?? '';
}

export interface OllamaOpts {
  url: string;
  model: string;
}

/**
 * Seats that spent the whole budget thinking with `think: false` set. They
 * are asked again with `think: 'low'` and a longer budget, and remembered so
 * the next beat asks that way first. gpt-oss on Ollama Cloud does this.
 *
 * A seat is an endpoint AND a tag, not a tag alone: the same name served by a
 * local daemon and by a proxied Cloud endpoint is two different seats, and one
 * slow endpoint must not double the other's per-beat budget. The memory also
 * ages: a one-off slow answer used to pin a seat to the long budget for the
 * life of the process, which in a long-lived `--mcp` container meant the
 * pessimistic verdict could only ever accumulate. After the stale window the
 * seat is asked short again, and one good short answer clears it.
 */
const thinkers = new Map<string, Map<string, number>>();

/** How long a low-think verdict stands before the seat is asked short again. */
export const LOW_THINK_STALE_MS = 10 * 60_000;

/** When the seat was last seen to need it, or undefined. Stale entries are dropped. */
function seenAt(url: string, model: string): number | undefined {
  const byUrl = thinkers.get(model);
  const seen = byUrl?.get(url);
  if (byUrl === undefined || seen === undefined) return undefined;
  if (Date.now() - seen >= LOW_THINK_STALE_MS) {
    byUrl.delete(url);
    if (byUrl.size === 0) thinkers.delete(model);
    return undefined;
  }
  return seen;
}

function liveThinker(url: string, model: string): boolean {
  return seenAt(url, model) !== undefined;
}

function rememberThinker(url: string, model: string): void {
  const byUrl = thinkers.get(model) ?? new Map<string, number>();
  byUrl.set(url, Date.now());
  thinkers.set(model, byUrl);
}

function forgetThinker(url: string, model: string): void {
  const byUrl = thinkers.get(model);
  if (byUrl === undefined) return;
  byUrl.delete(url);
  if (byUrl.size === 0) thinkers.delete(model);
}

/**
 * Seats a named failure rested. `thinkers` remembers only slowness: with a
 * wrong url or a stopped daemon every fire beat paid a fresh connect and the
 * whole SHORT budget, and a seat that answered slowly before failing paid
 * LOW's, for the round and for every round after it — while the operator got
 * the same reason once a beat with nothing saying it was one fault
 * repeating. Keyed on the endpoint AND the tag, the way slowness is, because
 * the same name served by a local daemon and by a proxy is two seats; and
 * aged the same way, because a daemon that was started again is not a fault.
 * A retired tag never comes back through here: SKIP_MODEL keeps it out of
 * the roster, so the memory can only rest a seat, never seat one.
 */
const resting = new Map<string, Map<string, { at: number; why: string }>>();

/** How long a named failure rests a seat before it is tried again. */
export const SEAT_REST_MS = 60_000;

/** The remembered reason, or undefined. Stale entries are dropped on the read. */
function restedAt(url: string, model: string): string | undefined {
  const byUrl = resting.get(model);
  const seen = byUrl?.get(url);
  if (byUrl === undefined || seen === undefined) return undefined;
  if (Date.now() - seen.at >= SEAT_REST_MS) {
    byUrl.delete(url);
    if (byUrl.size === 0) resting.delete(model);
    return undefined;
  }
  return seen.why;
}

function rememberFailure(url: string, model: string, why: string): void {
  const byUrl = resting.get(model) ?? new Map<string, { at: number; why: string }>();
  byUrl.set(url, { at: Date.now(), why });
  resting.set(model, byUrl);
}

function forgetFailure(url: string, model: string): void {
  const byUrl = resting.get(model);
  if (byUrl === undefined) return;
  byUrl.delete(url);
  if (byUrl.size === 0) resting.delete(model);
}

/**
 * For tests and the shell: why a seat is resting, or null. The shape
 * `needsLowThink` has — with a url it answers for that one endpoint, without
 * one for the tag wherever it is served — except that it answers with the
 * reason, so a status row can say the seat is resting AND why rather than
 * leaving an operator to infer one fault from its repetitions.
 */
export function restingWhy(model: string, url?: string): string | null {
  if (url !== undefined) return restedAt(url, model) ?? null;
  const byUrl = resting.get(model);
  if (byUrl === undefined) return null;
  for (const seat of [...byUrl.keys()]) {
    const why = restedAt(seat, model);
    if (why !== undefined) return why;
  }
  return null;
}

/**
 * For tests and the shell: whether a seat has been seen to need `think: 'low'`.
 * With a url it answers for that one endpoint; without one it answers for the
 * tag wherever it is served, which is what a status line wants to report.
 */
export function needsLowThink(model: string, url?: string): boolean {
  if (url !== undefined) return liveThinker(url, model);
  const byUrl = thinkers.get(model);
  if (byUrl === undefined) return false;
  for (const seat of [...byUrl.keys()]) {
    if (liveThinker(seat, model)) return true;
  }
  return false;
}

/**
 * Forget what was learned about a seat: both the budget it needed and the
 * failure that rested it. No arguments forgets every seat (the shell calls
 * this when the seat changes, and a test calls it so a retry or a fault it
 * exercised does not leak into the next test in the file).
 */
export function resetLowThink(model?: string, url?: string): void {
  if (model === undefined) {
    thinkers.clear();
    resting.clear();
    return;
  }
  if (url !== undefined) {
    forgetThinker(url, model);
    forgetFailure(url, model);
    return;
  }
  thinkers.delete(model);
  resting.delete(model);
}

/**
 * Most bytes a seat's answer may be before it is refused unread. The url is
 * the operator's, `num_predict` bounds only a well-behaved server, and the
 * read used to be `res.json()` on an unbounded body — buffered whole, inside
 * a seat callback, once per fire beat.
 */
const MAX_BODY_BYTES = 64 * 1024;
/** Most characters of an answer the intent and letter parsers will look at. */
const MAX_ANSWER_CHARS = 4_096;

const SHORT = { think: false as const, num_predict: 16, timeoutMs: 3_000 };
const LOW = { think: 'low' as const, num_predict: 96, timeoutMs: 8_000 };

function errName(err: unknown): string {
  if (err instanceof Error) return err.name;
  if (err && typeof err === 'object' && 'name' in err && typeof err.name === 'string') {
    return err.name;
  }
  return '';
}

function errCause(err: unknown): unknown {
  return err && typeof err === 'object' && 'cause' in err ? err.cause : undefined;
}

function errCode(err: unknown): string {
  let cur: unknown = err;
  for (let i = 0; i < 4 && cur && typeof cur === 'object'; i++) {
    if ('code' in cur && typeof cur.code === 'string') return cur.code;
    cur = errCause(cur);
  }
  return '';
}

/**
 * The response body as text, refused over `max` bytes. Returns null when the
 * response carries no readable stream — a test double, or a runtime without
 * one — and the caller falls back to the response's own parser.
 */
async function readCapped(res: Response, max: number): Promise<string | null> {
  const stated = Number(res.headers?.get?.('content-length') ?? Number.NaN);
  if (Number.isFinite(stated) && stated > max) throw new Error('ollama bad payload');
  const stream = (res as { body?: ReadableStream<Uint8Array> | null }).body;
  if (!stream || typeof stream.getReader !== 'function') return null;
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      size += value.byteLength;
      if (size > max) throw new Error('ollama bad payload');
      chunks.push(value);
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // The stream is already done or already gone; nothing to say about it.
    }
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

/** A field off the answer, refused over the cap rather than handed to a regex. */
function cappedField(value: unknown): string {
  const s = String(value ?? '');
  if (s.length > MAX_ANSWER_CHARS) throw new Error('ollama bad payload');
  return s;
}

function isAbort(err: unknown): boolean {
  let cur: unknown = err;
  for (let i = 0; i < 4 && cur; i++) {
    const name = errName(cur);
    if (name === 'TimeoutError' || name === 'AbortError') return true;
    cur = errCause(cur);
  }
  return false;
}

/**
 * One `/api/generate` call. Throws on transport or model errors (a retired
 * Cloud tag answers 410, or with an `error` body) so the shell can say so;
 * the sim keeps the scripted beat either way. Abort/timeout is a transport
 * error. The body is read under a byte cap and every field it hands back is
 * under a character cap: the url is the operator's, and this runs inside a
 * seat callback once per fire beat.
 */
async function generate(
  opts: OllamaOpts,
  prompt: string,
  budget: { think: boolean | 'low'; num_predict: number; timeoutMs: number },
): Promise<{ response: string; thinking: string }> {
  let res: Response;
  try {
    res = await fetch(opts.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: opts.model,
        prompt,
        stream: false,
        think: budget.think,
        options: { temperature: 0, num_predict: budget.num_predict },
      }),
      signal: AbortSignal.timeout(budget.timeoutMs),
    });
  } catch (err) {
    if (isAbort(err)) throw new Error('ollama timeout');
    const code = errCode(err);
    if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || err instanceof TypeError) {
      throw new Error('ollama down');
    }
    throw err;
  }
  if (!res.ok) {
    // A retired Cloud tag answers 410 Gone, which used to fall off the end of
    // this ladder into 'ollama error' — the one message in the taxonomy that
    // names no cause and suggests no action — with the body never read. The
    // status is read first, then the body, because a 402 or a 404 can carry
    // the same news in words.
    if (res.status === 410) throw new Error('ollama model retired');
    let said = '';
    try {
      said = (await readCapped(res, MAX_BODY_BYTES)) ?? '';
    } catch {
      said = '';
    }
    if (/retired|no longer available|decommission/i.test(said)) {
      throw new Error('ollama model retired');
    }
    if (res.status === 404) throw new Error('ollama missing');
    if (res.status === 401 || res.status === 403) throw new Error('ollama refused');
    throw new Error('ollama error');
  }
  let body: { response?: unknown; thinking?: unknown; error?: unknown };
  const raw = await readCapped(res, MAX_BODY_BYTES);
  try {
    body = (raw === null ? await res.json() : JSON.parse(raw)) as {
      response?: unknown;
      thinking?: unknown;
      error?: unknown;
    };
  } catch {
    throw new Error('ollama bad payload');
  }
  if (body.error) {
    const msg = typeof body.error === 'string' ? body.error : '';
    if (/retired/i.test(msg)) throw new Error('ollama model retired');
    throw new Error('ollama error');
  }
  return { response: cappedField(body.response), thinking: cappedField(body.thinking) };
}

/**
 * The named reason a failure gives, so one fault does not read as many. The
 * message is `generate`'s own taxonomy; anything else is the plain word.
 */
function whyOf(err: unknown): string {
  return err instanceof Error && err.message ? err.message : 'ollama error';
}

async function ask(opts: OllamaOpts, prompt: string): Promise<string> {
  // A seat that just failed by name is resting: the fault is repeated back
  // without paying the connect and the timeout again. It throws the same
  // reason it threw, so every caller behaves as it did on the live fault.
  const rested = restedAt(opts.url, opts.model);
  if (rested !== undefined) throw new Error(rested);
  let answer: string;
  try {
    if (!liveThinker(opts.url, opts.model)) {
      const first = await generate(opts, prompt, SHORT);
      if (first.response.trim() !== '' || first.thinking === '') {
        // A short answer landed: whatever we remembered about this seat is over.
        forgetThinker(opts.url, opts.model);
        forgetFailure(opts.url, opts.model);
        return first.response;
      }
      rememberThinker(opts.url, opts.model);
    }
    answer = (await generate(opts, prompt, LOW)).response;
  } catch (err) {
    rememberFailure(opts.url, opts.model, whyOf(err));
    throw err;
  }
  // One good answer clears the memory, the same way it clears the budget.
  forgetFailure(opts.url, opts.model);
  return answer;
}

export async function askOllama(view: BossView, opts: OllamaOpts): Promise<PilotIntent> {
  return parseIntent(await ask(opts, pilotPrompt(view)));
}

/** Digit-free count words so a next-N prompt never carries a numeral. */
const COUNT_WORDS = [
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
] as const;

function scripts(n: number): PilotIntent[] {
  const out: PilotIntent[] = [];
  for (let i = 0; i < n; i++) out.push('script');
  return out;
}

/**
 * Last n matching verbs, else script. Same legality floor as parseIntent:
 * thinking preambles lose to the last closed-set words.
 */
function parseIntents(raw: string, n: number): PilotIntent[] {
  const want = Math.max(0, Math.floor(n));
  if (want === 0) return [];
  const found: PilotIntent[] = [];
  const words = raw
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z]/g, ''))
    .filter(Boolean);
  for (const w of words) {
    if ((PILOT_INTENTS as readonly string[]).includes(w)) found.push(w as PilotIntent);
  }
  const slice = found.slice(-want);
  const out: PilotIntent[] = [];
  for (let i = 0; i < want; i++) out.push(slice[i] ?? 'script');
  return out;
}

function nextPrompt(view: BossView, n: number): string {
  const k = Math.max(1, Math.min(Math.floor(n) || 1, COUNT_WORDS.length));
  const text = `${pilotPrompt(view)}\nnext ${COUNT_WORDS[k - 1]!}`;
  if (FORBIDDEN.test(text)) throw new Error('pilot prompt leaked a forbidden word');
  return text;
}

/**
 * Prefetch n closed-set verbs for the sim queue. Length is always n (empty
 * when n < 1). Abort, timeout, retired, down, or any other ask failure
 * returns n copies of `script` — never throws, so stepRound never depends
 * on a catch. askOllama still throws for callers that already catch.
 *
 * `onFail` is how the caller learns WHICH of those it got. `generate` is
 * built to tell a timeout from a daemon that is not running from a tag that
 * was retired from a call the model refused, each error chosen so the shell
 * can say so — and this function used to throw that entire taxonomy away, so
 * the seat's liveness was decided by a value (`script`) that is also a legal
 * answer from a model that deliberately chose it. The status row, the sit
 * runner and the endless run record can now all name the same reason instead
 * of inferring it from a verb. The callback is called at most once per ask,
 * before the verbs are returned, and a callback that throws does not break
 * the never-throws property.
 */
export async function askNextIntents(
  opts: OllamaOpts,
  view: BossView,
  n: number,
  onFail?: (why: string) => void,
): Promise<PilotIntent[]> {
  const want = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  if (want === 0) return [];
  try {
    const prompt = want === 1 ? pilotPrompt(view) : nextPrompt(view, want);
    return parseIntents(await ask(opts, prompt), want);
  } catch (err) {
    if (onFail) {
      const why = whyOf(err);
      try {
        onFail(why);
      } catch {
        /* a caller's own reporting must not break the seeded fallback */
      }
    }
    return scripts(want);
  }
}

/**
 * The voice seat: which of the kind's own lines the boss says at spawn, or
 * null. `onFail` is the parameter `askNextIntents` has, so both seats report
 * a fault through one shape: the boss seat could name its reason on a status
 * row while the voice seat could only be seen to have produced nothing. The
 * callback is called at most once per ask, before the error is re-thrown —
 * this seat still throws, as every caller of it already expects, and a
 * callback that throws does not change what is thrown.
 */
export async function askOllamaLine(
  kind: BossView['kind'],
  lines: readonly string[],
  opts: OllamaOpts,
  onFail?: (why: string) => void,
): Promise<number | null> {
  try {
    return parseLetter(await ask(opts, voicePrompt(kind, lines)), lines.length);
  } catch (err) {
    if (onFail) {
      try {
        onFail(whyOf(err));
      } catch {
        /* a caller's own reporting must not change what this seat throws */
      }
    }
    throw err;
  }
}
