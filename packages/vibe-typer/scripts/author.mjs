#!/usr/bin/env node
// `node scripts/author.mjs sample --model <spec>[,<spec>] [--level duck-rides]
//                                 [--out docs/vibe-typer.author-sample]`
// `node scripts/author.mjs run --model <spec> [--only asks|stories|nags|reactions|reviews|pools]
//                              [--apply]`
//
// The offline authoring script (slice 3, sub-slice B). It asks a writing model
// for the user's and the agent's lines, gates every candidate with the
// package's own `lineFault` plus a British-spelling check, and writes what
// passed as data. It never edits a line into passing: it keeps or it drops.
//
// Nothing here is imported by the game and nothing here runs at play time.
//
// `sample` is the forty-line read the Director picks a model from: ten asks,
// ten nags, ten reactions, ten agent replies, for one level. Each call adds
// its model's column to `docs/vibe-typer.author-sample.json` and re-renders
// `docs/vibe-typer.author-sample.md`, so three calls make the side-by-side.
//
// `run` is the full pass. Without `--apply` it writes candidates and a report
// under `packages/vibe-typer/authoring/` and touches no lever.
//
// Every call is pinned: the receipt carries the model, the date, the sha256 of
// the exact prompt text and the temperature, so the same model and the same
// prompt hash is the replay.

import path from 'node:path';
import os from 'node:os';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

import {
  chunk,
  corpusTopics,
  groupCandidates,
  keepFirstPassing,
  makeGate,
  mergeDropped,
  parseCandidates,
  productPhrase,
  promptHash,
  sampleSnippets,
} from './author-lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(HERE, '..');
const ROOT = path.resolve(PKG, '..', '..');
const PATTERNS = path.join(PKG, 'patterns');
const CORPUS_DIR = path.join(PATTERNS, 'corpus');
const AUTHORING = path.join(PKG, 'authoring');

const USAGE = `usage: node scripts/author.mjs sample --model <spec>[,<spec>...] [--level <id>] [--out <base>]
       node scripts/author.mjs run --model <spec> [--only <slot>] [--apply]

  <spec>  openrouter:<model-id> | ollama:<tag>
  <slot>  stories | asks | nags | reactions | reviews | pools`;

const FLAGS = new Set(['model', 'level', 'out', 'only', 'temperature', 'timeout', 'ollama']);
const RUN_SLOTS = ['stories', 'asks', 'nags', 'reactions', 'reviews', 'pools'];
const DEFAULT_TEMPERATURE = 0.9;
const DEFAULT_TIMEOUT_MS = 600_000;
const DEFAULT_OLLAMA = 'http://127.0.0.1:11434';
const CANDIDATES_PER_SLOT = 3;

/** The level the sample reads, and how many snippets it asks about. */
const SAMPLE_LEVEL = 'duck-rides';
const SAMPLE_N = 10;
const SAMPLE_BAND_MAX = 2;

/**
 * A level's product string, as the prompt may say it. `duck-rides` names a real
 * company; the dispatch's own brand-free words for that product stand in. A
 * product that names a company with no entry here halts the run.
 */
const PRODUCT_PHRASE = {
  'Uber but for ducks': 'a rideshare for ducks',
};

/** Pools the full run tops up, with the size each must reach (three times slice one). */
const POOL_TARGETS = {
  'user.reactions': 36,
  'user.creeps': 36,
  'user.reviews': 24,
  'user.syncs': 36,
  'agent.replies': 72,
  'agent.hmm': 36,
  'agent.compactions': 24,
  'agent.ships': 24,
};

/** Word caps tighter than the gate's twelve, where the lever needs one. */
const ASK_WORDS = 10;
const SYNC_WORDS = 5;

class Fail extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function die(err) {
  const code = err instanceof Fail ? err.code : 'error';
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`${code}: ${msg}`);
  process.exit(2);
}

function parseArgv(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      flags.help = true;
      continue;
    }
    if (a === '--apply') {
      flags.apply = true;
      continue;
    }
    if (a.startsWith('--')) {
      let key;
      let val;
      const eq = a.indexOf('=');
      if (eq !== -1) {
        key = a.slice(2, eq);
        val = a.slice(eq + 1);
      } else {
        key = a.slice(2);
        const next = argv[i + 1];
        if (next === undefined || String(next).startsWith('--')) {
          throw new Fail('bad flag', `missing value for --${key}\n${USAGE}`);
        }
        val = next;
        i += 1;
      }
      if (!FLAGS.has(key)) throw new Fail('bad flag', `unknown flag --${key}\n${USAGE}`);
      flags[key] = val;
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

// ---------------------------------------------------------------------------
// The package's own gate, bundled in process so this script never copies it.
// ---------------------------------------------------------------------------

/**
 * Bundle the package's barrel with esbuild and import it, so `lineFault` and
 * `britishHit` are the game's own and not a copy that drifts from them.
 */
async function loadPackage() {
  const dir = path.join(os.tmpdir(), `vibe-author-${process.pid}`);
  mkdirSync(dir, { recursive: true });
  const entry = "export * from './packages/vibe-typer/src/index.ts';\n";
  let out;
  try {
    const r = await build({
      stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' },
      bundle: true,
      platform: 'node',
      format: 'esm',
      write: false,
      logLevel: 'warning',
    });
    out = path.join(dir, 'gate.mjs');
    writeFileSync(out, r.outputFiles[0].text);
  } catch (err) {
    throw new Fail('bundle', `could not bundle the package gate: ${err.message}`);
  }
  const mod = await import(pathToFileURL(out).href);
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // A left-over temp file is not worth a halt.
  }
  return mod;
}

// ---------------------------------------------------------------------------
// The levers
// ---------------------------------------------------------------------------

function readJson(file) {
  if (!existsSync(file))
    throw new Fail('missing file', `${path.relative(ROOT, file)} is not there`);
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Fail('bad json', `${path.relative(ROOT, file)}: ${err.message}`);
  }
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function corpusFiles() {
  return readdirSync(CORPUS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();
}

function loadCorpus() {
  const byStack = new Map();
  const all = [];
  for (const f of corpusFiles()) {
    const stack = f.replace(/\.json$/, '');
    const list = readJson(path.join(CORPUS_DIR, f));
    byStack.set(stack, list);
    all.push(...list);
  }
  return { byStack, all };
}

function levelProduct(level) {
  const phrase = productPhrase(level.product, PRODUCT_PHRASE);
  if (phrase === null) {
    throw new Fail(
      'brand in product',
      `level ${level.id} names a real company and has no brand-free phrase; add one to PRODUCT_PHRASE`,
    );
  }
  return phrase;
}

// ---------------------------------------------------------------------------
// The routes
// ---------------------------------------------------------------------------

function parseSpec(spec) {
  const i = String(spec).indexOf(':');
  if (i === -1) throw new Fail('bad model', `--model wants openrouter:<id> or ollama:<tag>`);
  const route = spec.slice(0, i);
  const id = spec.slice(i + 1);
  if (route !== 'openrouter' && route !== 'ollama') {
    throw new Fail('bad model', `unknown route "${route}"; use openrouter or ollama`);
  }
  if (id === '') throw new Fail('bad model', 'the model id is empty');
  return { spec, route, id };
}

/**
 * Ollama's `/api/chat` with `stream: true`, parsed as NDJSON. Streaming is not
 * a nicety here: node's fetch drops a non-streaming answer after five minutes
 * of silent headers, and a cloud tag writing forty lines can take longer.
 */
async function callOllama(model, system, user, opts) {
  const url = `${opts.ollama.replace(/\/$/, '')}/api/chat`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: true,
        options: { temperature: opts.temperature },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: AbortSignal.timeout(opts.timeoutMs),
    });
  } catch (err) {
    throw new Fail('daemon down', `ollama at ${opts.ollama} did not answer: ${err.message}`);
  }
  if (!res.ok || !res.body) {
    // The body says why: a retired tag answers 410 with the date it went. The
    // trailing request reference is dropped so two tries read as one reason.
    let why = '';
    if (res.body) {
      const raw = (await res.text()).replace(/\s+/g, ' ').trim();
      try {
        why = String(JSON.parse(raw).error ?? raw);
      } catch {
        why = raw;
      }
      why = why
        .replace(/\s*\(ref:[^)]*\)\s*$/, '')
        .trim()
        .slice(0, 160);
    }
    throw new Fail(
      'model refused',
      `ollama ${model}: HTTP ${res.status}${why === '' ? '' : ` — ${why}`}`,
    );
  }
  let text = '';
  let tokens = { in: 0, out: 0 };
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line === '') continue;
      let obj;
      try {
        obj = JSON.parse(line);
      } catch {
        continue;
      }
      if (obj.error) throw new Fail('model refused', `ollama ${model}: ${obj.error}`);
      const part = obj.message && obj.message.content;
      if (typeof part === 'string') text += part;
      if (obj.done) {
        tokens = { in: obj.prompt_eval_count ?? 0, out: obj.eval_count ?? 0 };
      }
    }
  }
  if (text.trim() === '') throw new Fail('model refused', `ollama ${model}: the answer was empty`);
  return { text, tokens, cost: null };
}

async function callOpenRouter(model, system, user, opts) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Fail('missing key', 'OPENROUTER_API_KEY is not set');
  let res;
  try {
    res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
        'HTTP-Referer': 'https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets',
        'X-Title': 'Vibe Typer authoring',
      },
      body: JSON.stringify({
        model,
        temperature: opts.temperature,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: AbortSignal.timeout(opts.timeoutMs),
    });
  } catch (err) {
    throw new Fail('route down', `openrouter did not answer: ${err.message}`);
  }
  const body = await res.text();
  if (!res.ok) {
    throw new Fail(
      'model refused',
      `openrouter ${model}: HTTP ${res.status} ${body.slice(0, 200)}`,
    );
  }
  let json;
  try {
    json = JSON.parse(body);
  } catch {
    throw new Fail('bad answer', `openrouter ${model}: the answer was not JSON`);
  }
  if (json.error) {
    throw new Fail('model refused', `openrouter ${model}: ${json.error.message ?? 'refused'}`);
  }
  const text = json.choices?.[0]?.message?.content ?? '';
  if (String(text).trim() === '') {
    throw new Fail('model refused', `openrouter ${model}: the answer was empty`);
  }
  const usage = json.usage ?? {};
  return {
    text,
    tokens: { in: usage.prompt_tokens ?? 0, out: usage.completion_tokens ?? 0 },
    cost: typeof usage.cost === 'number' ? usage.cost : null,
  };
}

/** One call, retried once, with the wall time it took. */
async function callModel(target, system, user, opts) {
  const fn = target.route === 'ollama' ? callOllama : callOpenRouter;
  const started = Date.now();
  try {
    const r = await fn(target.id, system, user, opts);
    return { ...r, ms: Date.now() - started, attempts: 1 };
  } catch (first) {
    try {
      const r = await fn(target.id, system, user, opts);
      return { ...r, ms: Date.now() - started, attempts: 2 };
    } catch (second) {
      const also = second.message === first.message ? 'twice' : `first try: ${first.message}`;
      throw new Fail(
        second instanceof Fail ? second.code : 'call failed',
        `${second.message} (${also})`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// The prompts
// ---------------------------------------------------------------------------

/**
 * The one system prompt every slot shares. It names no company, no product, no
 * model and no tool, and it carries the barred word list so the model steers
 * around the gate instead of being marked down by it.
 */
const SYSTEM = [
  'You are writing lines for a typing arcade game.',
  '',
  'The game: the player is a coding agent, hard working, sycophantic and lovable.',
  'The agent works for a vibe coder whose requests are absurd and escalate. The user',
  'asks for a thing, the agent says yes and types the code, the thing gets built on',
  'screen and the valuation rolls up. The joke is on a situation every developer',
  'shares, and the user is never the villain.',
  '',
  'The register: gleeful and absurd, fond, benign. No cruelty and no punching down.',
  'No sarcasm at the user. No dated jokes, no memes, no brand names, and no real',
  'companies, products, programming languages, libraries, models or tools of any',
  'kind. Write the kind of developer humor that will still read in five years.',
  'Nothing yells.',
  '',
  'The rules for every line you write:',
  '- one sentence or one fragment, at most twelve words',
  '- no digits anywhere; spell a number out in letters if you need one',
  '- no exclamation marks',
  '- no word written in all capitals',
  '- American English spelling, never British',
  '- do not wrap the line in quotation marks',
  '- a line may end with a period, a question mark, or nothing at all',
  '- never use any of these words: lie, fact, revealed, followed, held, score,',
  '  pass, fail, nrp, integrity, utility, cleared, ghost',
  '- never name a real company, product, language, library, model or tool',
  '',
  'Answer with JSON and nothing else. No prose before it, none after it, no code fence.',
].join('\n');

function snippetBlock(snippets) {
  return snippets
    .map((s, i) => {
      const notes = (s.notes ?? []).join(' ');
      return [
        `piece ${i + 1}, id ${s.id}`,
        `title: ${s.title}`,
        'code:',
        s.code,
        notes === '' ? '' : `what it does: ${notes}`,
      ]
        .filter((x) => x !== '')
        .join('\n');
    })
    .join('\n\n');
}

function askPrompt(snippets, product, per) {
  return [
    `The product being built is ${product}.`,
    '',
    "Write the user's request for each piece of code below: what the user asks for,",
    "in the user's own voice, before the agent writes that code. The request must",
    'describe the job that code actually does for the product, in plain words a',
    'non-programmer would use. Do not describe the code and do not name the language.',
    '',
    'Write each request as a template. The token {product} may appear once and will be',
    'replaced by the product name later, so keep every template to ten words or fewer.',
    'The user types in lower case and does not capitalize.',
    '',
    `Give ${per} different candidates for each piece.`,
    '',
    snippetBlock(snippets),
    '',
    'Answer with a JSON object whose keys are the ids above and whose values are',
    `arrays of ${per} strings.`,
  ].join('\n');
}

function askTemplatePrompt(snippets, per) {
  return [
    'These pieces of code are used across many different absurd products, so the',
    'request must work for any of them: write it with the token {product} standing in',
    'for whatever is being built.',
    '',
    "Write the user's request for each piece below, in the user's own voice, before the",
    'agent writes that code. It must describe the job that code actually does, in plain',
    'words a non-programmer would use. Do not describe the code and do not name the',
    'language. Ten words or fewer. The user types in lower case.',
    '',
    `Give ${per} different candidates for each piece.`,
    '',
    snippetBlock(snippets),
    '',
    'Answer with a JSON object whose keys are the ids above and whose values are',
    `arrays of ${per} strings.`,
  ].join('\n');
}

function nagPrompt(n, per) {
  return [
    `Write ${n} short check-ins the user sends while the agent is still typing.`,
    'They are the "are you done yet" kind: asking for status, asking whether it is',
    'live yet, asking whether it deployed, asking to see it, saying a cousin is asking.',
    'Fond and impatient, never angry, never a threat. Five words or fewer is the sweet',
    'spot and twelve is the ceiling. The user types in lower case.',
    '',
    `Give ${per} different candidates for each of the ${n}.`,
    '',
    `Answer with a JSON array of ${n} arrays, each holding ${per} strings.`,
  ].join('\n');
}

function nagReplyPrompt(nags, per) {
  return [
    'Here are check-ins the user sent while the agent was still typing.',
    '',
    ...nags.map((line, i) => `${i + 1}) ${line}`),
    '',
    "Write the agent's reply to each one: fond, sycophantic, unbothered, still typing.",
    'Nearly there. One more line. It is going to be lovely. The agent is cheerful and',
    'never defensive, and never promises a time. The agent writes like a person in a',
    'chat and capitalizes the first word.',
    '',
    `Give ${per} different candidates for each one.`,
    '',
    `Answer with a JSON array of ${nags.length} arrays, each holding ${per} strings.`,
  ].join('\n');
}

function reactionPrompt(snippets, product, per) {
  return [
    `The product being built is ${product}.`,
    '',
    'Each piece below has just been finished and is now live in the product. Write the',
    "user's reaction to each, in the user's voice, naming the thing that just shipped",
    'in plain words: the greeting, the list, the table, the button, the loop. Delighted,',
    'absurd, fond. The user types in lower case.',
    '',
    `Give ${per} different candidates for each piece.`,
    '',
    snippetBlock(snippets),
    '',
    'Answer with a JSON object whose keys are the ids above and whose values are',
    `arrays of ${per} strings.`,
  ].join('\n');
}

function topicReactionPrompt(topics, per) {
  return [
    'The agent has just shipped a piece of the product. Each word below names what the',
    "piece was about. Write the user's reaction for each one, in the user's voice,",
    'naming that thing in plain words a non-programmer would use. Delighted, absurd,',
    'fond, at most twelve words. The user types in lower case.',
    '',
    ...topics.map((t) => `- ${t}`),
    '',
    `Give ${per} different candidates for each word.`,
    '',
    'Answer with a JSON object whose keys are the words above and whose values are',
    `arrays of ${per} strings.`,
  ].join('\n');
}

function storyPrompt(product, snippets, per) {
  return [
    `A level of the game is one story about one product. This level's product is`,
    `${product}.`,
    '',
    'Choose four of the pieces below and write the four requests that ask for them, in',
    'order, so that they tell one story: the first sets the product up, the middle two',
    'escalate the idea, and the fourth is the deploy with a twist. Choose pieces whose',
    'code really does the job each request describes.',
    '',
    'Also write the premise: one line the standup shows before the level starts, in the',
    "user's voice, at most twelve words.",
    '',
    'Every request is a template of ten words or fewer; the token {product} may appear',
    'once and is replaced later. The user types in lower case.',
    '',
    snippetBlock(snippets),
    '',
    'Answer with a JSON object of this shape:',
    '{ "story": [' + per + ' strings], "picks": [four ids in order],',
    '  "asks": { "<id>": [' + per + ' strings], ... one entry per pick } }',
  ].join('\n');
}

function reviewPrompt(products, per) {
  return [
    'At the end of a level the user reviews what was built, one line, delighted and',
    'absurd, naming the product. Write the review for each product below. At most',
    'twelve words. The user types in lower case.',
    '',
    ...products.map((p) => `- ${p.key}: ${p.phrase}`),
    '',
    `Give ${per} different candidates for each product.`,
    '',
    'Answer with a JSON object whose keys are the keys above and whose values are',
    `arrays of ${per} strings.`,
  ].join('\n');
}

const POOL_BRIEFS = {
  'user.reactions':
    "the user's reaction when a piece of the product has just shipped, delighted and absurd, in lower case",
  'user.creeps':
    "the user's scope creep, asked mid-build as one more small thing, absurd and fond, in lower case",
  'user.reviews':
    "the user's one-line review of what was built at the end, delighted and absurd, in lower case",
  'user.syncs':
    'a line of meeting chatter the user says in a quick sync, five words or fewer, in lower case',
  'agent.replies':
    "the agent's cheerful sycophantic yes to a request, capitalized like a person in a chat",
  'agent.hmm':
    "the agent's own gentle correction when a line came out wrong, never blaming anyone, capitalized",
  'agent.compactions':
    "the agent's one-line summary of the work so far when the conversation is compacted, capitalized",
  'agent.ships': "the agent's line when a piece is finished and live, proud and warm, capitalized",
};

function poolPrompt(key, n, per) {
  const words = key === 'user.syncs' ? SYNC_WORDS : 12;
  return [
    `Write ${n} lines, each one ${POOL_BRIEFS[key]}.`,
    `At most ${words} words each. Every line is different from the others.`,
    '',
    `Give ${per} different candidates for each of the ${n}.`,
    '',
    `Answer with a JSON array of ${n} arrays, each holding ${per} strings.`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// One slot: ask, parse, gate, tally
// ---------------------------------------------------------------------------

/**
 * Ask one model for one slot and gate what came back. Never throws for a model
 * failure: the receipt carries the reason and the caller keeps going.
 */
async function askSlot(target, user, keys, gate, opts) {
  const hash = promptHash(SYSTEM, user);
  const base = {
    promptHash: hash,
    temperature: opts.temperature,
    requested: keys.length * CANDIDATES_PER_SLOT,
    kept: 0,
    dropped: {},
    missing: 0,
    ms: 0,
    tokens: { in: 0, out: 0 },
    cost: null,
    attempts: 0,
    error: null,
    lines: {},
    alternates: {},
    // The model's own parsed answer, for a slot that needs more than lines
    // (the story slot reads its four picks out of it).
    raw: null,
  };
  let answer;
  try {
    answer = await callModel(target, SYSTEM, user, opts);
  } catch (err) {
    return { ...base, error: err.message };
  }
  base.ms = answer.ms;
  base.tokens = answer.tokens;
  base.cost = answer.cost;
  base.attempts = answer.attempts;
  let parsed;
  try {
    parsed = parseCandidates(answer.text);
  } catch (err) {
    return { ...base, error: err.message };
  }
  base.raw = parsed;
  const { groups, dropped: shapeDropped } = groupCandidates(parsed, keys, CANDIDATES_PER_SLOT);
  // A line the shaping could not place is a drop like any other, under `surplus`.
  mergeDropped(base.dropped, shapeDropped);
  for (const key of keys) {
    const list = groups.get(key) ?? [];
    if (list.length === 0) base.missing += 1;
    const { kept, dropped, alternates } = keepFirstPassing(list, gate);
    mergeDropped(base.dropped, dropped);
    base.lines[key] = kept;
    base.alternates[key] = alternates;
    if (kept !== null) base.kept += 1;
  }
  return base;
}

// ---------------------------------------------------------------------------
// sample
// ---------------------------------------------------------------------------

function nagKeys(n) {
  return Array.from({ length: n }, (_, i) => `nag-${i + 1}`);
}

async function commandSample(args, gates) {
  const outBase = path.resolve(ROOT, args.flags.out ?? 'docs/vibe-typer.author-sample');
  const levelId = args.flags.level ?? SAMPLE_LEVEL;
  const specs = String(args.flags.model ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
  if (specs.length === 0) throw new Fail('bad flag', `sample wants --model\n${USAGE}`);
  const targets = specs.map(parseSpec);

  const levels = readJson(path.join(PATTERNS, 'levels.json'));
  const level = levels.levels.find((l) => l.id === levelId);
  if (!level) throw new Fail('no level', `levels.json has no level "${levelId}"`);
  const product = levelProduct(level);
  const corpus = loadCorpus();
  const snippets = sampleSnippets(
    corpus.byStack.get(level.stack) ?? [],
    level.stack,
    Math.min(level.bandMax ?? SAMPLE_BAND_MAX, SAMPLE_BAND_MAX),
    SAMPLE_N,
  );
  if (snippets.length < SAMPLE_N) {
    throw new Fail('thin corpus', `${level.stack} has fewer than ${SAMPLE_N} snippets in band`);
  }

  const receiptFile = `${outBase}.json`;
  const receipt = existsSync(receiptFile)
    ? readJson(receiptFile)
    : {
        date: today(),
        level: level.id,
        stack: level.stack,
        product,
        candidatesPerSlot: CANDIDATES_PER_SLOT,
        snippets: snippets.map((s) => ({ id: s.id, title: s.title })),
        models: {},
      };

  const opts = {
    temperature: Number(args.flags.temperature ?? DEFAULT_TEMPERATURE),
    timeoutMs: Number(args.flags.timeout ?? DEFAULT_TIMEOUT_MS),
    ollama: args.flags.ollama ?? DEFAULT_OLLAMA,
  };
  const ids = snippets.map((s) => s.id);
  const keys = nagKeys(SAMPLE_N);

  for (const target of targets) {
    process.stderr.write(`${target.spec}: asks\n`);
    const asks = await askSlot(
      target,
      askPrompt(snippets, product, CANDIDATES_PER_SLOT),
      ids,
      gates.ask,
      opts,
    );

    process.stderr.write(`${target.spec}: nags\n`);
    const nags = await askSlot(
      target,
      nagPrompt(SAMPLE_N, CANDIDATES_PER_SLOT),
      keys,
      gates.line,
      opts,
    );

    process.stderr.write(`${target.spec}: reactions\n`);
    const reactions = await askSlot(
      target,
      reactionPrompt(snippets, product, CANDIDATES_PER_SLOT),
      ids,
      gates.line,
      opts,
    );

    // The agent answers this model's own check-ins, so the two tables read as
    // one exchange. A reply keeps its check-in's own key rather than its place
    // in the answer, so a nag that fell the gate leaves a hole in both tables
    // at the same row. A model whose nags all fell has nothing to reply to, and
    // the receipt says so.
    const replyKeys = keys.filter((k) => typeof nags.lines[k] === 'string');
    const keptNags = replyKeys.map((k) => nags.lines[k]);
    process.stderr.write(`${target.spec}: replies\n`);
    const replies =
      keptNags.length === 0
        ? { ...emptySlot(opts), error: 'no nag passed the gate, so there was nothing to reply to' }
        : await askSlot(
            target,
            nagReplyPrompt(keptNags, CANDIDATES_PER_SLOT),
            replyKeys,
            gates.line,
            opts,
          );

    receipt.models[target.spec] = {
      model: target.spec,
      route: target.route,
      id: target.id,
      date: today(),
      temperature: opts.temperature,
      slots: { asks, nags, reactions, replies },
      wallMs: [asks, nags, reactions, replies].reduce((a, s) => a + (s.ms ?? 0), 0),
      tokens: sumTokens([asks, nags, reactions, replies]),
      cost: sumCost([asks, nags, reactions, replies]),
    };
    writeJson(receiptFile, receipt);
  }

  writeFileSync(`${outBase}.md`, renderSample(receipt), 'utf8');
  console.log(
    `wrote ${path.relative(ROOT, receiptFile)} and ${path.relative(ROOT, `${outBase}.md`)}`,
  );
}

function emptySlot(opts) {
  return {
    promptHash: '',
    temperature: opts.temperature,
    requested: 0,
    kept: 0,
    dropped: {},
    missing: 0,
    ms: 0,
    tokens: { in: 0, out: 0 },
    cost: null,
    attempts: 0,
    error: null,
    lines: {},
    alternates: {},
  };
}

function sumTokens(slots) {
  return slots.reduce(
    (a, s) => ({ in: a.in + (s.tokens?.in ?? 0), out: a.out + (s.tokens?.out ?? 0) }),
    { in: 0, out: 0 },
  );
}

function sumCost(slots) {
  const known = slots.filter((s) => typeof s.cost === 'number');
  return known.length === 0 ? null : known.reduce((a, s) => a + s.cost, 0);
}

function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * The stamp every file of one `run` shares: the date and the time of day to the
 * millisecond. A second dry run on the same day has to sit beside the first,
 * not on top of it — the candidates a run threw away are the thing somebody
 * reads afterwards to decide whether the prompt moved in the right direction.
 */
function runStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${today()}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}${ms}`;
}

// ---------------------------------------------------------------------------
// The sample document
// ---------------------------------------------------------------------------

function cell(slot, key) {
  if (!slot) return '—';
  if (slot.error) return `— <sub>${escapePipes(slot.error)}</sub>`;
  const line = slot.lines?.[key];
  if (typeof line === 'string' && line !== '') return escapePipes(line);
  const reasons = Object.entries(slot.dropped ?? {})
    .map(([r, n]) => `${r} ${n}`)
    .join(', ');
  return `— <sub>${escapePipes(reasons === '' ? 'nothing came back' : reasons)}</sub>`;
}

function escapePipes(s) {
  return String(s).split('|').join('\\|');
}

function table(rows, header) {
  const head = `| ${header.join(' | ')} |`;
  const rule = `| ${header.map(() => '---').join(' | ')} |`;
  return [head, rule, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
}

/** Small counts read better as words in a document about writing. */
const COUNT_WORDS = [
  'no',
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
];

function spellCount(n) {
  return COUNT_WORDS[n] ?? String(n);
}

function capitalize(s) {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

/** A model that answered nothing at all: every slot came back an error. */
function neverAnswered(m) {
  const slots = Object.values(m.slots ?? {});
  return slots.length > 0 && slots.every((s) => s.error && (s.kept ?? 0) === 0);
}

function renderSample(receipt) {
  const all = Object.keys(receipt.models);
  const specs = all.filter((s) => !neverAnswered(receipt.models[s]));
  const silent = all.filter((s) => neverAnswered(receipt.models[s]));
  const header = ['piece', ...specs];
  const nagHeader = ['check-in', ...specs];
  const keys = nagKeys(receipt.snippets.length);
  const slot = (spec, name) => receipt.models[spec]?.slots?.[name];

  const out = [];
  out.push('# Vibe Typer — the authoring sample');
  out.push('');
  out.push(
    `**Date:** ${receipt.date}. **Level:** \`${receipt.level}\` (${receipt.stack}, the product written brand-free as "${receipt.product}"). **Candidates per line:** ${receipt.candidatesPerSlot}, of which the script keeps the first that passes the gate.`,
  );
  out.push('');
  out.push(
    `${capitalize(spellCount(specs.length))} writing ${specs.length === 1 ? 'model was' : 'models were'} asked the same four questions about the same ten pieces of code. Nothing below was edited: every line is what the model wrote, and a dash means no candidate for that line passed the gate.`,
  );
  out.push('');
  if (silent.length > 0) {
    out.push('## The seats that did not answer');
    out.push('');
    out.push(
      'Asked, retried once, and gone. The receipt keeps the calls; the tables leave the column out so they stay readable.',
    );
    out.push('');
    out.push(
      table(
        silent.map((spec) => [
          `\`${spec}\``,
          escapePipes(
            Object.values(receipt.models[spec].slots ?? {})
              .map((s) => s.error)
              .filter((x) => typeof x === 'string')[0] ?? 'no answer',
          ),
        ]),
        ['model', 'what came back'],
      ),
    );
    out.push('');
  }
  out.push('## The models and the prompts');
  out.push('');
  out.push(
    table(
      specs.flatMap((spec) => {
        const m = receipt.models[spec];
        return ['asks', 'nags', 'reactions', 'replies'].map((name) => [
          `\`${spec}\``,
          name,
          `\`${(m.slots[name]?.promptHash ?? '').slice(0, 16) || '—'}\``,
          String(m.temperature),
        ]);
      }),
      ['model', 'slot', 'prompt sha256 (first sixteen)', 'temperature'],
    ),
  );
  out.push('');
  out.push(
    'The replies slot asks each model to answer its own check-ins, so the two tables read as one exchange; its prompt hash therefore differs per model by design. The other three prompts are byte-for-byte the same for every model.',
  );
  out.push('');

  out.push('## The asks');
  out.push('');
  out.push('What the user asks for, before the agent writes that piece.');
  out.push('');
  out.push(
    table(
      receipt.snippets.map((s) => [
        `\`${s.id}\`<br><sub>${escapePipes(s.title)}</sub>`,
        ...specs.map((spec) => cell(slot(spec, 'asks'), s.id)),
      ]),
      header,
    ),
  );
  out.push('');

  out.push('## The check-ins');
  out.push('');
  out.push('What the user sends while the agent is still typing.');
  out.push('');
  out.push(
    table(
      keys.map((k) => [`\`${k}\``, ...specs.map((spec) => cell(slot(spec, 'nags'), k))]),
      nagHeader,
    ),
  );
  out.push('');

  out.push('## The reactions');
  out.push('');
  out.push('What the user says when that piece is live.');
  out.push('');
  out.push(
    table(
      receipt.snippets.map((s) => [
        `\`${s.id}\``,
        ...specs.map((spec) => cell(slot(spec, 'reactions'), s.id)),
      ]),
      header,
    ),
  );
  out.push('');

  out.push("## The agent's replies");
  out.push('');
  out.push("What the agent answers, to that same model's check-in of the same number.");
  out.push('');
  out.push(
    table(
      keys.map((k) => [`\`${k}\``, ...specs.map((spec) => cell(slot(spec, 'replies'), k))]),
      nagHeader,
    ),
  );
  out.push('');

  out.push('## What the gate dropped');
  out.push('');
  for (const spec of specs) {
    const m = receipt.models[spec];
    const tally = {};
    for (const name of ['asks', 'nags', 'reactions', 'replies']) {
      mergeDropped(tally, m.slots[name]?.dropped ?? {});
    }
    const rows = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    const kept = ['asks', 'nags', 'reactions', 'replies'].reduce(
      (a, n) => a + (m.slots[n]?.kept ?? 0),
      0,
    );
    out.push(`**\`${spec}\`** — kept ${kept} of the 40 lines.`);
    out.push('');
    out.push(
      rows.length === 0
        ? 'Nothing was dropped.'
        : table(
            rows.map(([r, n]) => [escapePipes(r), String(n)]),
            ['reason', 'candidates dropped'],
          ),
    );
    out.push('');
  }

  out.push('## Latency and cost');
  out.push('');
  out.push(
    table(
      specs.map((spec) => {
        const m = receipt.models[spec];
        return [
          `\`${spec}\``,
          `${(m.wallMs / 1000).toFixed(1)} s`,
          String(m.tokens.in),
          String(m.tokens.out),
          m.cost === null ? 'no per-token cost' : `$${m.cost.toFixed(4)}`,
        ];
      }),
      ['model', 'wall time, four calls', 'tokens in', 'tokens out', 'cost'],
    ),
  );
  out.push('');
  out.push('## For the Director');
  out.push('');
  out.push('Pick: ____');
  out.push('');
  out.push(
    'The pick, the exact model id, the prompt hash and the date go into `docs/vibe-typer.slice3.md` before the full authoring run. The full run is pinned to that pick: the same model and the same prompt hash is the replay.',
  );
  out.push('');
  return `${out.join('\n')}`;
}

// ---------------------------------------------------------------------------
// run — the full pass. One function, one prompt, per slot.
// ---------------------------------------------------------------------------

async function commandRun(args, gates) {
  const spec = args.flags.model;
  if (!spec) throw new Fail('bad flag', `run wants --model\n${USAGE}`);
  const target = parseSpec(spec);
  const only = args.flags.only ? String(args.flags.only).split(',') : RUN_SLOTS;
  for (const s of only) {
    if (!RUN_SLOTS.includes(s)) throw new Fail('bad flag', `unknown slot "${s}"\n${USAGE}`);
  }
  const opts = {
    temperature: Number(args.flags.temperature ?? DEFAULT_TEMPERATURE),
    timeoutMs: Number(args.flags.timeout ?? DEFAULT_TIMEOUT_MS),
    ollama: args.flags.ollama ?? DEFAULT_OLLAMA,
  };
  const apply = args.flags.apply === true;
  mkdirSync(AUTHORING, { recursive: true });

  const ctx = {
    target,
    opts,
    gates,
    apply,
    levels: readJson(path.join(PATTERNS, 'levels.json')),
    user: readJson(path.join(PATTERNS, 'user.json')),
    agent: readJson(path.join(PATTERNS, 'agent.json')),
    corpus: loadCorpus(),
    pinned: new Set(),
    touched: new Set(),
  };
  // A snippet pinned into a level story keeps the story's ask; the ask slot
  // skips it so the two never write the same key twice.
  for (const level of ctx.levels.levels) {
    for (const id of level.snippets ?? []) ctx.pinned.add(id);
  }

  const runners = {
    stories: slotStories,
    asks: slotAsks,
    nags: slotNags,
    reactions: slotReactions,
    reviews: slotReviews,
    pools: slotPools,
  };
  // One stamp for every file this invocation writes, so a second run on the
  // same day sits beside the first instead of on top of it.
  const stamp = runStamp();
  const receipt = {
    date: today(),
    stamp,
    model: target.spec,
    route: target.route,
    temperature: opts.temperature,
    applied: apply,
    slots: {},
  };
  for (const name of only) {
    process.stderr.write(`${target.spec}: ${name}\n`);
    const result = await runners[name](ctx);
    receipt.slots[name] = result.report;
    if (apply) {
      result.apply();
    } else {
      writeJson(path.join(AUTHORING, `${stamp}-${name}.json`), {
        model: target.spec,
        date: today(),
        stamp,
        report: result.report,
        candidates: result.candidates,
      });
    }
  }
  writeJson(path.join(AUTHORING, `${stamp}-run.json`), receipt);
  if (apply) {
    saveLevers(ctx);
    prettier([...ctx.touched]);
  }
  console.log(
    apply
      ? `applied ${only.join(', ')} into the levers; run pnpm test before committing`
      : `wrote candidates for ${only.join(', ')} under ${path.relative(ROOT, AUTHORING)}`,
  );
}

function saveLevers(ctx) {
  const userFile = path.join(PATTERNS, 'user.json');
  const agentFile = path.join(PATTERNS, 'agent.json');
  const levelsFile = path.join(PATTERNS, 'levels.json');
  if (ctx.touched.has(userFile)) writeJson(userFile, ctx.user);
  if (ctx.touched.has(agentFile)) writeJson(agentFile, ctx.agent);
  if (ctx.touched.has(levelsFile)) writeJson(levelsFile, ctx.levels);
  for (const [stack, list] of ctx.corpus.byStack) {
    const file = path.join(CORPUS_DIR, `${stack}.json`);
    if (ctx.touched.has(file)) writeJson(file, list);
  }
}

/** Two-space JSON with a trailing newline is already prettier's shape; this proves it. */
function prettier(files) {
  if (files.length === 0) return;
  const bin = path.join(ROOT, 'node_modules', 'prettier', 'bin', 'prettier.cjs');
  if (!existsSync(bin)) return;
  spawnSync(process.execPath, [bin, '--write', ...files], { cwd: ROOT, stdio: 'inherit' });
}

function emptyReport(target, opts) {
  return {
    model: target.spec,
    temperature: opts.temperature,
    prompts: [],
    requested: 0,
    kept: 0,
    missing: 0,
    dropped: {},
    ms: 0,
    tokens: { in: 0, out: 0 },
    cost: null,
    errors: [],
  };
}

function foldSlot(report, slot) {
  report.prompts.push(slot.promptHash);
  report.requested += slot.requested;
  report.kept += slot.kept;
  report.missing += slot.missing;
  report.ms += slot.ms;
  report.tokens.in += slot.tokens?.in ?? 0;
  report.tokens.out += slot.tokens?.out ?? 0;
  if (typeof slot.cost === 'number') report.cost = (report.cost ?? 0) + slot.cost;
  mergeDropped(report.dropped, slot.dropped);
  if (slot.error) report.errors.push(slot.error);
  return report;
}

/** Level stories: four pinned snippets in order, a premise, and the four asks. */
async function slotStories(ctx) {
  const report = emptyReport(ctx.target, ctx.opts);
  const candidates = {};
  const writes = [];
  for (const level of ctx.levels.levels) {
    const product = levelProduct(level);
    const pool = (ctx.corpus.byStack.get(level.stack) ?? []).filter(
      (s) => s.band >= level.bandMin && s.band <= level.bandMax,
    );
    if (pool.length < 4) {
      report.errors.push(`${level.id}: fewer than four snippets in band`);
      continue;
    }
    const user = storyPrompt(product, pool, CANDIDATES_PER_SLOT);
    const slot = await askSlot(ctx.target, user, ['story'], ctx.gates.line, ctx.opts);
    // `askSlot` gates the premise; the four picks and their asks live deeper in
    // the answer, so this slot reads the model's own object out of the receipt.
    const raw = slot.raw ?? null;
    foldSlot(report, slot);
    candidates[level.id] = { story: slot.lines.story, alternates: slot.alternates.story, raw };
    const picks = Array.isArray(raw?.picks)
      ? raw.picks.filter((id) => pool.some((s) => s.id === id))
      : [];
    if (slot.lines.story === null || picks.length !== 4) {
      report.errors.push(`${level.id}: the story or its four picks did not come back clean`);
      continue;
    }
    const asks = {};
    let clean = true;
    for (const id of picks) {
      const list = Array.isArray(raw?.asks?.[id]) ? raw.asks[id] : [];
      const { kept, dropped } = keepFirstPassing(list, ctx.gates.ask);
      mergeDropped(report.dropped, dropped);
      report.requested += list.length;
      if (kept === null) {
        clean = false;
        break;
      }
      report.kept += 1;
      asks[id] = kept;
    }
    if (!clean) {
      report.errors.push(`${level.id}: an ask for a pinned snippet did not pass the gate`);
      continue;
    }
    candidates[level.id].picks = picks;
    candidates[level.id].asks = asks;
    writes.push({ level, story: slot.lines.story, picks, asks });
  }
  return {
    report,
    candidates,
    apply() {
      for (const w of writes) {
        w.level.story = w.story;
        w.level.snippets = w.picks;
        for (const [id, ask] of Object.entries(w.asks)) setSnippetAsk(ctx, id, ask);
      }
      ctx.touched.add(path.join(PATTERNS, 'levels.json'));
    },
  };
}

function setSnippetAsk(ctx, id, ask) {
  for (const [stack, list] of ctx.corpus.byStack) {
    const s = list.find((x) => x.id === id);
    if (s) {
      s.ask = ask;
      ctx.touched.add(path.join(CORPUS_DIR, `${stack}.json`));
      return;
    }
  }
}

/** An ask for every snippet a level story did not pin. */
async function slotAsks(ctx) {
  const report = emptyReport(ctx.target, ctx.opts);
  const candidates = {};
  const writes = [];
  for (const [stack, list] of ctx.corpus.byStack) {
    const todo = list.filter((s) => !ctx.pinned.has(s.id));
    for (const group of chunk(todo, 10)) {
      const ids = group.map((s) => s.id);
      const slot = await askSlot(
        ctx.target,
        askTemplatePrompt(group, CANDIDATES_PER_SLOT),
        ids,
        ctx.gates.ask,
        ctx.opts,
      );
      foldSlot(report, slot);
      for (const id of ids) {
        candidates[id] = { kept: slot.lines[id], alternates: slot.alternates[id] ?? [] };
        if (slot.lines[id]) writes.push({ stack, id, ask: slot.lines[id] });
      }
    }
  }
  return {
    report,
    candidates,
    apply() {
      for (const w of writes) setSnippetAsk(ctx, w.id, w.ask);
    },
  };
}

/** Fifty check-ins and the agent's reply to each. */
async function slotNags(ctx) {
  const report = emptyReport(ctx.target, ctx.opts);
  const nags = [];
  const replies = [];
  const candidates = { nags: {}, nagReplies: {} };
  for (const group of chunk(nagKeys(50), 10)) {
    const slot = await askSlot(
      ctx.target,
      nagPrompt(group.length, CANDIDATES_PER_SLOT),
      group,
      ctx.gates.line,
      ctx.opts,
    );
    foldSlot(report, slot);
    for (const k of group) {
      candidates.nags[k] = { kept: slot.lines[k], alternates: slot.alternates[k] ?? [] };
      if (slot.lines[k]) nags.push(slot.lines[k]);
    }
  }
  for (const group of chunk(nags, 10)) {
    const keys = group.map((_, i) => `reply-${replies.length + i + 1}`);
    const slot = await askSlot(
      ctx.target,
      nagReplyPrompt(group, CANDIDATES_PER_SLOT),
      keys,
      ctx.gates.line,
      ctx.opts,
    );
    foldSlot(report, slot);
    for (const k of keys) {
      candidates.nagReplies[k] = { kept: slot.lines[k], alternates: slot.alternates[k] ?? [] };
      if (slot.lines[k]) replies.push(slot.lines[k]);
    }
  }
  return {
    report,
    candidates,
    apply() {
      ctx.user.nags = dedupe([...(ctx.user.nags ?? []), ...nags]);
      ctx.agent.nagReplies = dedupe([...(ctx.agent.nagReplies ?? []), ...replies]);
      ctx.touched.add(path.join(PATTERNS, 'user.json'));
      ctx.touched.add(path.join(PATTERNS, 'agent.json'));
    },
  };
}

/** Three reactions per corpus topic, keyed by the topic word. */
async function slotReactions(ctx) {
  const report = emptyReport(ctx.target, ctx.opts);
  const topics = corpusTopics(ctx.corpus.all);
  const byTopic = {};
  const candidates = {};
  for (const group of chunk(topics, 12)) {
    const slot = await askSlot(
      ctx.target,
      topicReactionPrompt(group, CANDIDATES_PER_SLOT),
      group,
      ctx.gates.line,
      ctx.opts,
    );
    foldSlot(report, slot);
    for (const t of group) {
      const lines = [slot.lines[t], ...(slot.alternates[t] ?? [])].filter(
        (x) => typeof x === 'string',
      );
      candidates[t] = lines;
      if (lines.length > 0) byTopic[t] = lines;
    }
  }
  return {
    report,
    candidates,
    apply() {
      ctx.user.reactionsByTopic = { ...(ctx.user.reactionsByTopic ?? {}), ...byTopic };
      ctx.touched.add(path.join(PATTERNS, 'user.json'));
    },
  };
}

/** Three reviews per level, keyed by the level id. */
async function slotReviews(ctx) {
  const report = emptyReport(ctx.target, ctx.opts);
  const products = ctx.levels.levels.map((l) => ({ key: l.id, phrase: levelProduct(l) }));
  const byLevel = {};
  const candidates = {};
  for (const group of chunk(products, 8)) {
    const keys = group.map((p) => p.key);
    const slot = await askSlot(
      ctx.target,
      reviewPrompt(group, CANDIDATES_PER_SLOT),
      keys,
      ctx.gates.line,
      ctx.opts,
    );
    foldSlot(report, slot);
    for (const k of keys) {
      const lines = [slot.lines[k], ...(slot.alternates[k] ?? [])].filter(
        (x) => typeof x === 'string',
      );
      candidates[k] = lines;
      if (lines.length > 0) byLevel[k] = lines;
    }
  }
  return {
    report,
    candidates,
    apply() {
      ctx.user.reviewsByProduct = { ...(ctx.user.reviewsByProduct ?? {}), ...byLevel };
      ctx.touched.add(path.join(PATTERNS, 'user.json'));
    },
  };
}

/** Top up the pools that existed in slice one until each is three times its floor. */
async function slotPools(ctx) {
  const report = emptyReport(ctx.target, ctx.opts);
  const candidates = {};
  const adds = {};
  for (const [key, target] of Object.entries(POOL_TARGETS)) {
    const [file, field] = key.split('.');
    const have = (file === 'user' ? ctx.user : ctx.agent)[field] ?? [];
    const want = Math.max(0, target - have.length);
    candidates[key] = [];
    if (want === 0) continue;
    const gate = key === 'user.syncs' ? ctx.gates.sync : ctx.gates.line;
    const keys = Array.from({ length: want }, (_, i) => `${field}-${i + 1}`);
    for (const group of chunk(keys, 12)) {
      const slot = await askSlot(
        ctx.target,
        poolPrompt(key, group.length, CANDIDATES_PER_SLOT),
        group,
        gate,
        ctx.opts,
      );
      foldSlot(report, slot);
      for (const k of group) {
        if (slot.lines[k]) candidates[key].push(slot.lines[k]);
      }
    }
    adds[key] = candidates[key];
  }
  return {
    report,
    candidates,
    apply() {
      for (const [key, lines] of Object.entries(adds)) {
        const [file, field] = key.split('.');
        const bag = file === 'user' ? ctx.user : ctx.agent;
        bag[field] = dedupe([...(bag[field] ?? []), ...lines]);
        ctx.touched.add(path.join(PATTERNS, `${file}.json`));
      }
    },
  };
}

function dedupe(list) {
  const seen = new Set();
  const out = [];
  for (const line of list) {
    if (seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out;
}

// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgv(process.argv.slice(2));
  if (args.flags.help || args.positional.length === 0) {
    console.log(USAGE);
    return;
  }
  const command = args.positional[0];
  if (command !== 'sample' && command !== 'run') {
    throw new Fail('bad command', `unknown command "${command}"\n${USAGE}`);
  }
  const pkg = await loadPackage();
  const gates = {
    line: makeGate(pkg.lineFault, pkg.britishHit),
    ask: makeGate(pkg.lineFault, pkg.britishHit, { maxWords: ASK_WORDS }),
    sync: makeGate(pkg.lineFault, pkg.britishHit, { maxWords: SYNC_WORDS }),
  };
  if (command === 'sample') await commandSample(args, gates);
  else await commandRun(args, gates);
}

main().catch(die);
