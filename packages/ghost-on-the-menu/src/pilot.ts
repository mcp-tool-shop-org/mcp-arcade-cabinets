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
  const word = raw.trim().toLowerCase().split(/\s+/)[0] ?? 'script';
  return (PILOT_INTENTS as readonly string[]).includes(word) ? (word as PilotIntent) : 'script';
}

export async function askOllama(
  view: BossView,
  opts: { url: string; model: string },
): Promise<PilotIntent> {
  const prompt = pilotPrompt(view);
  const res = await fetch(opts.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: opts.model, prompt, stream: false }),
  });
  if (!res.ok) return 'script';
  const body = (await res.json()) as { response?: string };
  return parseIntent(String(body.response ?? ''));
}
