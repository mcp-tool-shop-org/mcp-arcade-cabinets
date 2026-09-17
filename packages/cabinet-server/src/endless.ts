// The endless seat (G28 as the slice-3 kickoff amends it): in endless mode
// a seated model plays the vibe coder and writes the request the player
// types — the ask, the code, the title, the notes, and a product when the
// level is new. Same shape as the say seat next door: tiered by capability
// (a Claude agent when a key is configured, else a signed-in cloud tag,
// else a local model), one fact-blind prompt, one answer, and a gate on the
// far side that the model never sees.
//
// What it does NOT do: wait. The shell prefetches during the request in
// hand and hands the answer to the sim as data (G11, G13). A late, refused
// or malformed answer is the authored pool and the corpus, silently.
//
// Fact-blind in (G12): the seat is told the product, the language, the band
// as a word, the last few asks so it does not repeat itself, and the letter
// pairs the typist fumbles. It is never told a tape, a receipt, a valuation
// or the corpus. Model-blind out (G17): nothing it writes may name a tool,
// a model or a company, and the code gate in the cabinet package refuses
// the ones that do.

import Anthropic from '@anthropic-ai/sdk';

import { chatJson, mapTransport, type ChatOpts } from './client';
import { FORBIDDEN } from './gate';
import { CLAUDE_MODEL, NO_SEAT, sayTier, type SayOpts, type SayTier } from './say';
import { bandWord, LANGUAGE_WORDS, sayablePairs, STACK_WORDS } from './vibe-words';

export { bandWord, LANGUAGE_WORDS, sayablePairs, STACK_WORDS };

/** Frozen system prompt for the endless seat. Same for every level. */
export const ENDLESS_SYSTEM =
  'You are the user of a coding agent in an arcade cabinet. You cannot write code, ' +
  'you are fond of the agent, and the things you want are absurd and sincere. ' +
  'Answer with one JSON object and nothing else.';

/** What the seat is shown. Words and the product; no tape, no receipt, no score. */
export interface EndlessView {
  product: string;
  stack: string;
  bandMin: number;
  bandMax: number;
  /** The last few asks, so the seat does not ask for the same thing again. */
  recent: string[];
  /** Letter pairs the typist fumbles; the code should carry them where natural. */
  weak: string[];
  /** True when the seat should name a new product as well. */
  newLevel: boolean;
}

export interface EndlessPrompt {
  system: string;
  user: string;
}

export function endlessPrompt(view: EndlessView): EndlessPrompt {
  const stackWord = STACK_WORDS[view.stack] ?? 'wires';
  const language = LANGUAGE_WORDS[view.stack] ?? LANGUAGE_WORDS.integration!;
  const pairs = sayablePairs(view.weak);
  const lines = [
    `the thing being built: ${view.product}`,
    `the team you are on: ${stackWord}`,
    `write the code in: ${language}`,
    `how hard this job should feel: ${bandWord(view.bandMin)}`,
    ...(view.recent.length > 0
      ? ['you asked for these lately, ask for something else:', ...view.recent.map((r) => `- ${r}`)]
      : []),
    ...(pairs.length > 0
      ? [`letter pairs to use where they fit naturally: ${pairs.join(' ')}`]
      : []),
    '',
    'give these fields:',
    'ask - one sentence in your own voice, at most twelve words, every number spelled out,',
    '  no exclamation mark, no word in capitals, no name of any tool, model or company,',
    '  American spelling. You may write {product} in the ask, spelled exactly like that in' +
      ' braces, and the game fills the thing being built in for you. No other braces.',
    'code - a small, real, runnable snippet in the language above, at most twelve lines,',
    '  at most eighty columns wide, plain ASCII, no tab characters, and no comment or name',
    '  anywhere in it that names a tool, a model or a company. Write numbers in the code as',
    '  ordinary digits, the way the language needs them; only the ask spells them out.',
    '  Its size should match the word for how hard the job should feel.',
    'title - a few plain words for what the code does.',
    'notes - up to three short teaching sentences about the code, one sentence each.',
    ...(view.newLevel
      ? ['product - a new absurd startup idea, at most eight words, no capitals, no number.']
      : []),
    '',
    'The ask must describe the job the code actually does. Answer with the JSON object only.',
  ];
  const user = lines.join('\n');
  if (FORBIDDEN.test(`${ENDLESS_SYSTEM}\n${user}`)) {
    throw new Error('endless prompt leaked a forbidden word');
  }
  return { system: ENDLESS_SYSTEM, user };
}

/**
 * The schema both tiers are held to. `product` is required and may be the
 * empty string, because a strict tool schema wants every property named and
 * an empty product is how a seat says it has none.
 *
 * Every property carries its rule. They used to live only in the user turn,
 * so a seat whose provider weights the tool schema over the prose saw five
 * undescribed required fields; `TOOL_DESCRIPTION` named four of the five and
 * left out the one the doc comment above explains. The rules stay in the
 * prompt as well rather than moving out of it: the lower tier asks for a
 * JSON object with no schema attached, and that turn is the only place it
 * can read them.
 */
export const ENDLESS_SCHEMA = {
  type: 'object',
  properties: {
    ask: {
      type: 'string',
      description:
        'What you want, in your own voice: one sentence of at most twelve words, lower case, no exclamation mark, no word in capitals, every number spelled out, American spelling, and no name of any tool, model or company. You may write {product} exactly like that and the game fills the thing being built in for you; no other braces.',
    },
    code: {
      type: 'string',
      description:
        'A small, real, runnable snippet in the language the level names: at most twelve lines, at most eighty columns to a line, plain ASCII, no tab characters, and no comment or name in it that names a tool, a model or a company. Write numbers here as ordinary digits; only the ask spells them out. Its size should match the word for how hard the job should feel.',
    },
    title: { type: 'string', description: 'A few plain words for what the code does.' },
    notes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Up to three short teaching sentences about the code, one sentence to an entry.',
    },
    product: {
      type: 'string',
      description:
        'A new absurd startup idea, at most eight words, lower case, no number - and the empty string when the level did not ask for one.',
    },
  },
  required: ['ask', 'code', 'title', 'notes', 'product'],
  additionalProperties: false,
} as const;

/** The one tool the upper tier is given, by name. */
export const ENDLESS_TOOL_NAME = 'endless_request';
const TOOL_NAME = ENDLESS_TOOL_NAME;

/**
 * The sentence beside that tool. It named four of the five required
 * fields and left out `product`, which the schema marks required and which
 * is how a seat says it has none.
 */
export const ENDLESS_TOOL_DESCRIPTION =
  'Send one request for the coding agent to write: the ask, the code, a title, notes, and the product ' +
  'the level is building - the empty string when the level did not ask for a new one. ' +
  'Every field carries its own rule; read them before you write.';
const TOOL_DESCRIPTION = ENDLESS_TOOL_DESCRIPTION;

/** What a seat sends back, ungated. The code gate is the cabinet package's. */
export interface EndlessRequest {
  product?: string;
  ask: string;
  code: string;
  title: string;
  notes: string[];
}

export interface EndlessAnswer {
  /** The seat's request, ungated, or null when it answered with nothing usable. */
  request: EndlessRequest | null;
  tier: SayTier;
  model: string;
  ms: number;
  /** True when the model answered in prose and put no object together. */
  suppressed: boolean;
}

// Bounds on what comes back, so a seat cannot post a novel through the
// route into the gate, and the refusal is cheap.
//
// They refuse; they do not clip. A clipped field used to be handed on as
// though the model had written exactly that, and `gateCode` has no
// total-length rule of its own — a cut that lands after a complete
// statement in a brace-free language passes every check it does have, and
// the player types code the model did not write. This package removed that
// repair twice on purpose (vibe-cabinet.ts's `tooLong`, gate.ts's say);
// the endless seat was the third copy and kept the old behavior. A refusal
// here is `parseRequest` returning null, which is the documented fallback:
// the corpus plays.
const ASK_MAX = 200;
const CODE_MAX = 2048;
const TITLE_MAX = 80;
const NOTE_MAX = 200;
const NOTES_MAX = 3;
const PRODUCT_MAX = 80;

/** A bounded string, or null — for a value that is not one, and for one over its cap. */
function str(value: unknown, cap: number): string | null {
  if (typeof value !== 'string') return null;
  return value.length > cap ? null : value;
}

/** Pull the object out of an answer that may be fenced, prefaced or both. */
export function parseRequest(raw: unknown): EndlessRequest | null {
  let value: unknown = raw;
  if (typeof value === 'string') {
    const text = value.replace(/```[a-z]*\n?/gi, '').trim();
    const open = text.indexOf('{');
    const close = text.lastIndexOf('}');
    if (open === -1 || close <= open) return null;
    try {
      value = JSON.parse(text.slice(open, close + 1));
    } catch {
      return null;
    }
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const o = value as Record<string, unknown>;
  const ask = str(o.ask, ASK_MAX);
  const code = str(o.code, CODE_MAX);
  const title = str(o.title, TITLE_MAX);
  if (ask === null || code === null || title === null) return null;
  const kept = Array.isArray(o.notes)
    ? o.notes.filter((n): n is string => typeof n === 'string').slice(0, NOTES_MAX)
    : [];
  // One note over its cap refuses the whole request, the way an over-long
  // ask does: a note is teaching text the player reads, and half a sentence
  // is not what the seat wrote either.
  const notes: string[] = [];
  for (const n of kept) {
    const note = str(n, NOTE_MAX);
    if (note === null) return null;
    notes.push(note);
  }
  const out: EndlessRequest = { ask, code, title, notes };
  // `product` is required by the schema and may be the empty string, which
  // is how a seat says it has none; only an over-long one is a refusal.
  if (typeof o.product === 'string') {
    const product = str(o.product, PRODUCT_MAX);
    if (product === null) return null;
    if (product.trim() !== '') out.product = product;
  }
  return out;
}

async function askClaudeEndless(prompt: EndlessPrompt, key: string): Promise<EndlessAnswer> {
  const t0 = Date.now();
  const client = new Anthropic({ apiKey: key, timeout: 20_000, maxRetries: 0 });
  try {
    const response = await client.beta.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 600,
      system: prompt.system,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      tools: [
        {
          name: TOOL_NAME,
          description: TOOL_DESCRIPTION,
          input_schema: { ...ENDLESS_SCHEMA } as Record<string, unknown> & { type: 'object' },
          strict: true,
        },
      ],
      messages: [{ role: 'user', content: prompt.user }],
    });
    const ms = Date.now() - t0;
    if (response.stop_reason === 'refusal') {
      return { request: null, tier: 'claude', model: CLAUDE_MODEL, ms, suppressed: false };
    }
    let request: EndlessRequest | null = null;
    let prose = false;
    for (const block of response.content) {
      if (block.type === 'tool_use' && block.name === TOOL_NAME) {
        request = parseRequest(block.input);
      } else if (block.type === 'text' && block.text.trim() !== '') {
        prose = true;
      }
    }
    return {
      request,
      tier: 'claude',
      model: CLAUDE_MODEL,
      ms,
      suppressed: request === null && prose,
    };
  } catch (err) {
    throw mapTransport(err, 'claude');
  }
}

async function askOllamaEndless(
  prompt: EndlessPrompt,
  chat: ChatOpts,
  tier: SayTier,
): Promise<EndlessAnswer> {
  // Measured on this rig: four hundred tokens cut a full answer off in the
  // middle of the code field, and a truncated object parses to nothing. The
  // prompt caps the code at twelve lines and eighty columns, so seven
  // hundred is the room that bound needs once JSON escaping is paid for.
  const a = await chatJson(chat, prompt.system, prompt.user, ENDLESS_SCHEMA, {
    num_predict: 700,
  });
  const request = parseRequest(a.content);
  return {
    request,
    tier,
    model: chat.model,
    ms: a.ms,
    suppressed: request === null && a.content.trim() !== '',
  };
}

/**
 * Ask the endless seat for one request. Throws on transport or model errors
 * so the caller can say so in words; the corpus plays either way.
 */
export async function askEndlessFor(view: EndlessView, opts: SayOpts): Promise<EndlessAnswer> {
  const prompt = endlessPrompt(view);
  const pick = sayTier(opts);
  // Both ways in, named. `sayTier` makes the answer concrete — a key, else a
  // signed-in cloud tag, else any listed local model — and none of that used
  // to reach the operator, who got a bare sentence with no code, no hint and
  // no statement of what configuring one would mean. The say seat's twin
  // says the same thing in the same words.
  if (!pick) throw new Error(NO_SEAT('endless'));
  if (pick.tier === 'claude') return askClaudeEndless(prompt, opts.anthropicKey!);
  const chat: ChatOpts = { url: opts.ollamaUrl, model: pick.model };
  if (opts.fetchImpl) chat.fetchImpl = opts.fetchImpl;
  return askOllamaEndless(prompt, chat, pick.tier);
}
