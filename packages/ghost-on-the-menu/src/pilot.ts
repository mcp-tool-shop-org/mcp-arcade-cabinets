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

const SKIP_MODEL = /embed|nomic|translategemma|jam-ft|grader|aya-expanse|qwen3\.6:latest/i;

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
 * Forget what was learned about a seat. No arguments forgets every seat (the
 * shell calls this when the seat changes, and a test calls it so a retry it
 * exercised does not leak into the next test in the file).
 */
export function resetLowThink(model?: string, url?: string): void {
  if (model === undefined) {
    thinkers.clear();
    return;
  }
  if (url !== undefined) {
    forgetThinker(url, model);
    return;
  }
  thinkers.delete(model);
}

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
 * Cloud tag answers with an `error` body) so the shell can say so; the sim
 * keeps the scripted beat either way. Abort/timeout is a transport error.
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
    if (res.status === 404) throw new Error('ollama missing');
    if (res.status === 401 || res.status === 403) throw new Error('ollama refused');
    throw new Error('ollama error');
  }
  let body: { response?: unknown; thinking?: unknown; error?: unknown };
  try {
    body = (await res.json()) as { response?: unknown; thinking?: unknown; error?: unknown };
  } catch {
    throw new Error('ollama bad payload');
  }
  if (body.error) {
    const msg = typeof body.error === 'string' ? body.error : '';
    if (/retired/i.test(msg)) throw new Error('ollama model retired');
    throw new Error('ollama error');
  }
  return { response: String(body.response ?? ''), thinking: String(body.thinking ?? '') };
}

async function ask(opts: OllamaOpts, prompt: string): Promise<string> {
  if (!liveThinker(opts.url, opts.model)) {
    const first = await generate(opts, prompt, SHORT);
    if (first.response.trim() !== '' || first.thinking === '') {
      // A short answer landed: whatever we remembered about this seat is over.
      forgetThinker(opts.url, opts.model);
      return first.response;
    }
    rememberThinker(opts.url, opts.model);
  }
  return (await generate(opts, prompt, LOW)).response;
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
 */
export async function askNextIntents(
  opts: OllamaOpts,
  view: BossView,
  n: number,
): Promise<PilotIntent[]> {
  const want = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  if (want === 0) return [];
  try {
    const prompt = want === 1 ? pilotPrompt(view) : nextPrompt(view, want);
    return parseIntents(await ask(opts, prompt), want);
  } catch {
    return scripts(want);
  }
}

/** The voice seat: which of the kind's own lines the boss says at spawn, or null. */
export async function askOllamaLine(
  kind: BossView['kind'],
  lines: readonly string[],
  opts: OllamaOpts,
): Promise<number | null> {
  return parseLetter(await ask(opts, voicePrompt(kind, lines)), lines.length);
}
