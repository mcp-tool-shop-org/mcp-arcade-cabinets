// Optional local-Ollama seats. Every prompt here is frozen and fact-blind: it
// never carries a fact, a lie flag, a count of lies, a score word, or a digit
// the player would see. `pilotPrompt` and `voicePrompt` throw if one ever
// does. If a seat is off or the call fails, the sim keeps the scripted phase
// fire and the seed's line.
//
// Two seats. The boss seat answers one verb per beat; the sim turns it into
// fire and motion (a fan, a lean and an aimed shot, a held breath, fog, the
// plate). The voice seat picks which of the boss's own lines from voice.json
// it says when it spawns; the copy is never the model's.

export interface BossView {
  kind: 'whisperer' | 'menu' | 'doorman';
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

const LETTERS = 'abcdefghijklmnop';

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

export function defaultPilotModel(names: readonly string[]): string {
  const listed = listPilotModels(names);
  const preferred =
    listed.find((n) => n === 'gpt-oss:120b-cloud') ?? listed.find((n) => isCloudModel(n));
  if (preferred) return preferred;
  if (listed.includes('qwen2.5:7b-instruct')) return 'qwen2.5:7b-instruct';
  return listed[0] ?? 'qwen2.5:7b-instruct';
}

export interface OllamaOpts {
  url: string;
  model: string;
}

/**
 * Models that spent the whole budget thinking with `think: false` set. They
 * are asked again with `think: 'low'` and a longer budget, and remembered so
 * the next beat asks that way first. gpt-oss on Ollama Cloud does this.
 */
const thinkers = new Set<string>();

/** For tests and the shell: whether a model has been seen to need `think: 'low'`. */
export function needsLowThink(model: string): boolean {
  return thinkers.has(model);
}

const SHORT = { think: false as const, num_predict: 16 };
const LOW = { think: 'low' as const, num_predict: 96 };

/**
 * One `/api/generate` call. Throws on transport or model errors (a retired
 * Cloud tag answers with an `error` body) so the shell can say so; the sim
 * keeps the scripted beat either way.
 */
async function generate(
  opts: OllamaOpts,
  prompt: string,
  budget: { think: boolean | 'low'; num_predict: number },
): Promise<{ response: string; thinking: string }> {
  const res = await fetch(opts.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: opts.model,
      prompt,
      stream: false,
      think: budget.think,
      options: { temperature: 0, num_predict: budget.num_predict },
    }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const body = (await res.json()) as { response?: string; thinking?: string; error?: string };
  if (body.error) throw new Error(body.error);
  return { response: String(body.response ?? ''), thinking: String(body.thinking ?? '') };
}

async function ask(opts: OllamaOpts, prompt: string): Promise<string> {
  if (!thinkers.has(opts.model)) {
    const first = await generate(opts, prompt, SHORT);
    if (first.response.trim() !== '' || first.thinking === '') return first.response;
    thinkers.add(opts.model);
  }
  return (await generate(opts, prompt, LOW)).response;
}

export async function askOllama(view: BossView, opts: OllamaOpts): Promise<PilotIntent> {
  return parseIntent(await ask(opts, pilotPrompt(view)));
}

/** The voice seat: which of the kind's own lines the boss says at spawn, or null. */
export async function askOllamaLine(
  kind: BossView['kind'],
  lines: readonly string[],
  opts: OllamaOpts,
): Promise<number | null> {
  return parseLetter(await ask(opts, voicePrompt(kind, lines)), lines.length);
}
