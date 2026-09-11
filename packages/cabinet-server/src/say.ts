// The say seat (G14): a persona-shaped agent behind one gate, tiered by
// capability. A Claude agent when a key is configured (read here, never in
// the browser, never committed), else a signed-in Ollama Cloud tag, else a
// local model. Every tier is asked the same fact-blind prompt and answers
// through the same `say` tool; the gate in `cabinet.ts` bounds the words.
// The prompt throws on a forbidden word, as `pilotPrompt` does.

import Anthropic from '@anthropic-ai/sdk';
import {
  DEFAULT_PATTERNS,
  isCloudModel,
  type WaveKind,
} from '@mcp-arcade-cabinets/ghost-on-the-menu';

import type { SeatView } from './cabinet';
import { toolDef } from './contract';
import { FORBIDDEN } from './gate';
import { chatTools, type ChatOpts } from './client';
import { DEFAULT_PERSONAS, LEADS, type Lead, type Persona } from './personas';
import { seedLines } from './seeds';

/** Frozen system prompt for the say seat. Same for every tape. */
export const SAY_SYSTEM =
  'You are a boss in an arcade cabinet. You do not know which sprites are honest. ' +
  'Stay in your register. Use the say tool once with one short line and nothing else.';

export const CLAUDE_MODEL = 'claude-opus-5';

export interface SayPrompt {
  system: string;
  user: string;
}

export function sayPrompt(
  view: SeatView,
  persona: Persona,
  seeds: readonly string[],
  recent: readonly string[],
): SayPrompt {
  const user = [
    `kind ${view.kind}`,
    `wave ${view.wave}`,
    `health ${view.hp}`,
    `ship ${view.column}`,
    `stick ${view.stick}`,
    `motion ${view.motion}`,
    `register: ${persona.register}`,
    `tics: ${persona.tics.join(' ')}`,
    `you may own: ${persona.owns.join(' ')}`,
    'lines in your register:',
    ...seeds.map((s) => `- ${s}`),
    ...(recent.length > 0 ? ['said lately, do not repeat:', ...recent.map((r) => `- ${r}`)] : []),
    'One line, at most twelve words, one sentence, no digit, no name of any tool or model.',
  ].join('\n');
  const text = `${SAY_SYSTEM}\n${user}`;
  if (FORBIDDEN.test(text)) throw new Error('say prompt leaked a forbidden word');
  return { system: SAY_SYSTEM, user };
}

export { seedLines } from './seeds';

export type SayTier = 'claude' | 'cloud' | 'local';

export interface SayCall {
  text: string;
  lead: Lead;
}

export interface SayAnswer {
  /** The say tool's arguments, ungated, or null when the model called nothing. */
  call: SayCall | null;
  tier: SayTier;
  model: string;
  ms: number;
  /** True when the model answered in prose and pulled no lever. */
  suppressed: boolean;
}

export interface SayOpts {
  /** The key, read by the server from its environment. Null means no Claude tier. */
  anthropicKey: string | null;
  /** Ollama `/api/chat`. */
  ollamaUrl: string;
  /** Pilot models the daemon lists, Cloud tags first. */
  models: readonly string[];
  fetchImpl?: typeof fetch;
}

/** Which tier the say seat sits in, by capability. Null when nothing is configured. */
export function sayTier(opts: {
  anthropicKey: string | null;
  models: readonly string[];
}): { tier: SayTier; model: string } | null {
  if (opts.anthropicKey && opts.anthropicKey.trim() !== '') {
    return { tier: 'claude', model: CLAUDE_MODEL };
  }
  const cloud = opts.models.find((m) => isCloudModel(m));
  if (cloud) return { tier: 'cloud', model: cloud };
  const local = opts.models[0];
  if (local) return { tier: 'local', model: local };
  return null;
}

function parseCall(args: unknown): SayCall | null {
  if (typeof args !== 'object' || args === null) return null;
  const a = args as Record<string, unknown>;
  const text = typeof a.text === 'string' ? a.text : null;
  const lead =
    typeof a.lead === 'string' && (LEADS as readonly string[]).includes(a.lead) ? a.lead : 'beat';
  if (text === null) return null;
  return { text, lead: lead as Lead };
}

async function askClaude(prompt: SayPrompt, key: string): Promise<SayAnswer> {
  const t0 = Date.now();
  const client = new Anthropic({ apiKey: key });
  const def = toolDef('say');
  const response = await client.beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 256,
    system: prompt.system,
    output_config: { effort: 'low' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    tools: [
      {
        name: def.name,
        description: def.description,
        input_schema: { ...def.inputSchema } as Record<string, unknown> & { type: 'object' },
        strict: true,
      },
    ],
    messages: [{ role: 'user', content: prompt.user }],
  });
  const ms = Date.now() - t0;
  if (response.stop_reason === 'refusal') {
    return { call: null, tier: 'claude', model: CLAUDE_MODEL, ms, suppressed: false };
  }
  let call: SayCall | null = null;
  let prose = false;
  for (const block of response.content) {
    if (block.type === 'tool_use' && block.name === 'say') call = parseCall(block.input);
    else if (block.type === 'text' && block.text.trim() !== '') prose = true;
  }
  return { call, tier: 'claude', model: CLAUDE_MODEL, ms, suppressed: call === null && prose };
}

async function askOllamaSay(prompt: SayPrompt, chat: ChatOpts, tier: SayTier): Promise<SayAnswer> {
  const def = toolDef('say');
  const a = await chatTools(chat, prompt.system, prompt.user, [def], { num_predict: 160 });
  let call: SayCall | null = null;
  for (const c of a.calls) if (c.name === 'say') call = parseCall(c.arguments);
  return {
    call,
    tier,
    model: chat.model,
    ms: a.ms,
    suppressed: call === null && a.content.trim() !== '',
  };
}

/**
 * Ask the say seat for a line. Throws on transport or model errors so the
 * caller can say so; the seed's line plays either way.
 */
export async function askSay(
  view: SeatView,
  persona: Persona,
  seeds: readonly string[],
  recent: readonly string[],
  opts: SayOpts,
): Promise<SayAnswer> {
  const prompt = sayPrompt(view, persona, seeds, recent);
  const pick = sayTier(opts);
  if (!pick) throw new Error('no say seat configured');
  if (pick.tier === 'claude') return askClaude(prompt, opts.anthropicKey!);
  const chat: ChatOpts = { url: opts.ollamaUrl, model: pick.model };
  if (opts.fetchImpl) chat.fetchImpl = opts.fetchImpl;
  return askOllamaSay(prompt, chat, pick.tier);
}

/**
 * The shell's ask, on the node side: the persona sheet and three register
 * seeds come from the shipped data; `says` rotates the seeds. The gate runs
 * in the browser's cabinet, where the line lands.
 */
export async function askSayFor(
  view: SeatView,
  recent: readonly string[],
  says: number,
  opts: SayOpts,
): Promise<SayAnswer> {
  const persona = DEFAULT_PERSONAS.boss[view.kind];
  const seeds = seedLines(DEFAULT_PATTERNS.voice.boss[view.kind], says);
  return askSay(view, persona, seeds, recent, opts);
}

export type { WaveKind };
