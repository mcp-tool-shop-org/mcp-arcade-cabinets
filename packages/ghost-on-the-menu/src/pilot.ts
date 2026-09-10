// Optional local-Ollama boss seat. The prompt is frozen and never carries a
// fact, a lie flag, a count of lies, or a digit the player would see. If the
// seat is off or the call fails, the sim keeps the scripted phase fire.

export interface BossView {
  kind: 'whisperer' | 'menu' | 'doorman';
  hp: 'high' | 'mid' | 'low';
  column: 'left' | 'center' | 'right';
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

export async function askOllama(
  view: BossView,
  opts: { url: string; model: string },
): Promise<PilotIntent> {
  const prompt = pilotPrompt(view);
  const res = await fetch(opts.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: opts.model,
      prompt,
      stream: false,
      think: false,
      options: { temperature: 0, num_predict: 16 },
    }),
  });
  if (!res.ok) return 'script';
  const body = (await res.json()) as { response?: string; thinking?: string };
  return parseIntent(String(body.response ?? ''));
}
