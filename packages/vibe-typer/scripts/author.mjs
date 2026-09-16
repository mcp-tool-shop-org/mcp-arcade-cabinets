#!/usr/bin/env node
// `node scripts/author.mjs sample --model <spec>[,<spec>] [--level duck-rides]
//                                 [--out docs/vibe-typer.author-sample]`
// `node scripts/author.mjs run --model <spec> [--only asks|stories|nags|reactions|reviews|pools]
//                              [--chunk 40] [--concurrency 2] [--revoice] [--apply]`
// `node scripts/author.mjs edit --model <spec> [--concurrency 2] [--apply]`
//                              [--same-family "<reason>"]
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
// under `packages/vibe-typer/authoring/` and touches no lever. Every call that
// writes a line carries the voice sheet for the character it is writing, and
// the lines that slot has already kept in this run, so the pass reads as one
// writer rather than as one call.
//
// `edit` is the pass that reads a whole pool back and names the lines that
// break the voice. It only ever drops, and only while the pool stays over the
// loader's floor. It also refuses to run when the editor's family is the
// family that wrote the pool: a model reading its own writing is a second read,
// not an independent one. The writer of every pool is read out of the receipts
// under `authoring/`, both families go into the receipt, and `--same-family`
// with a stated reason is the only way past. It never reads a pool whose
// length is a level's clock (`TYPED_POOLS`), it never drops a line the
// character's own voice sheet names, and it runs cooler than `run` does.
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
  BRAND_NAMES,
  chunk,
  chunkEven,
  citedLines,
  corpusTopics,
  crossBracketTwins,
  Fail,
  familyClash,
  groupCandidates,
  keepFirstPassing,
  lineKey,
  makeGate,
  mapLimit,
  mergeDropped,
  modelFamily,
  parseArgv,
  parseCandidates,
  poolFilter,
  productPhrase,
  promptHash,
  runOpts,
  sampleSnippets,
  settleDrop,
  textHash,
  voiceExemplars,
  writerLookupNames,
} from './author-lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(HERE, '..');
const ROOT = path.resolve(PKG, '..', '..');
const PATTERNS = path.join(PKG, 'patterns');
const CORPUS_DIR = path.join(PATTERNS, 'corpus');
const AUTHORING = path.join(PKG, 'authoring');

const USAGE = `usage: node scripts/author.mjs sample --model <spec>[,<spec>...] [--level <id>] [--out <base>]
       node scripts/author.mjs run --model <spec> [--only <slot>] [--pool <key>] [--chunk <n>]
                                  [--spare <n>] [--concurrency <n>] [--revoice] [--apply]
       node scripts/author.mjs edit --model <spec> [--pool <key>] [--concurrency <n>] [--apply]
                                   [--same-family <reason>]

  <spec>      openrouter:<model-id> | ollama:<tag>
  <slot>      premises | stories | asks | nags | reactions | reviews | pools
  --pool      dotted pool names, comma separated; a head matches its whole branch
  --chunk     items one call writes for; the default is forty
  --spare     lines over the floor a pool is written to; four when re-voicing, none otherwise
  --concurrency  calls in flight at once; the answers are folded in key order either way
  --revoice   write each pool fresh at its floor instead of topping it up
  --same-family  the reason for seating the editor in the family that wrote the pool
  --skip      pools this run leaves alone, named the way --pool names them
  edit        read each whole pool back and drop the lines that break the voice`;

/** Flags that take a value. */
const FLAGS = new Set([
  'model',
  'level',
  'out',
  'only',
  'pool',
  'spare',
  'temperature',
  'timeout',
  'ollama',
  'concurrency',
  'chunk',
  'same-family',
  'skip',
]);
/** Flags that are their own answer. */
const BARE_FLAGS = new Set(['apply', 'revoice']);
/** The slots a full pass runs, in order. */
const DEFAULT_SLOTS = ['stories', 'asks', 'nags', 'reactions', 'reviews', 'pools'];
/**
 * Every slot `--only` accepts. `premises` is not in the full pass: `stories`
 * writes a premise and re-picks the four pieces under it, and `premises` is the
 * same line written again over pins that are staying. Asking for both in one
 * run would write the story twice.
 */
const RUN_SLOTS = ['premises', ...DEFAULT_SLOTS];
const DEFAULT_TEMPERATURE = 0.9;
/**
 * The editor runs cooler than the writer, and that is its own number.
 *
 * Writing wants the range: a warm model reaches for the image the sheet
 * permits, and the register the Director picked came off a warm call. Naming
 * the lines to drop is a judgment about lines that already exist, and a warm
 * judgment invents its reasons — the first pass on another family miscounted
 * the words in a three-word line and read sixty labeled brackets as one list,
 * both at the writer's temperature. `--temperature` still overrides it.
 */
const EDIT_TEMPERATURE = 0.3;
/**
 * Pools the editor never reads, and why.
 *
 * `agent.replies` is the text the player transcribes — the player is the agent
 * — so the length of a reply is time on the level's clock. Pruning it reshuffles
 * which reply is drawn at every request and moves every hardcore margin with
 * it, which is a change to how hard the game is. That is the Director's lever,
 * not an editor's, and an editor may not shorten a level's clock as a side
 * effect of tidying a voice. `user.syncs` is typed too, on the levels that
 * spend a sync; it was measured not to move a bar and is left in, and whether
 * it belongs here is the Director's call rather than this script's.
 */
const TYPED_POOLS = new Set(['agent.replies']);
/**
 * Ten minutes was the cap while a call wrote ten or twelve lines. A chunk of
 * forty on a thinking cloud tag is a twenty-thousand-token answer, most of it
 * the model thinking, and a timeout there throws away forty lines rather than
 * twelve. Thirty minutes is the cap now; `--timeout` still overrides it.
 */
const DEFAULT_TIMEOUT_MS = 1_800_000;
const DEFAULT_OLLAMA = 'http://127.0.0.1:11434';
const CANDIDATES_PER_SLOT = 3;
/**
 * How many calls a slot may have in flight. One is the sequential walk the
 * sample used. A cloud tag that thinks for three minutes a call makes a run of
 * a hundred and seventy calls a working day; the answers are independent of
 * one another, so the only thing concurrency may change is the wall clock —
 * `mapLimit` hands them back in key order, so the file a run writes is the
 * same file at any width.
 */
const DEFAULT_CONCURRENCY = 2;

/**
 * How many items one call writes for. The full run asked ten or twelve at a
 * time, which cost a hundred and eighty-nine calls and, worse, meant a hundred
 * and eighty-nine writers who had each seen nothing the others wrote. Forty
 * items a call is a quarter of the calls and one writer across each of them.
 * A chunk is split evenly rather than into a full call and a remainder, so a
 * pool of fifty-two at a chunk of forty is two calls of twenty-six.
 */
const DEFAULT_CHUNK = 40;

/**
 * How many lines over its floor a re-voiced pool asks for. The gate drops
 * about one key in five hundred; a pool asked for exactly its floor and
 * dropped one is a pool that fails the loader. Four spare is cheap — it almost
 * never costs another call, because a call count is a ceiling over the chunk.
 */
const REVOICE_SPARE = 4;

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

/**
 * Pools the full run tops up, with the size each must reach: three times the
 * floor slice one shipped. A key is a path into the lever — `user.creeps` is a
 * flat list, `user.reactions.0` is tier zero's list, `user.asks.bash.1` is the
 * warm tier's templates for the shell stack. The loader's `MIN_*` constants
 * were these same numbers until the proofread after 0.11.0 cut the pools that
 * are drawn blind to the lines that make sense against any request and set
 * the floors to what a level's draw needs; a run still writes up to these
 * targets, under the sheets' rule that such a line never names a piece.
 */
const POOL_TARGETS = {
  'user.reactions.0': 36,
  'user.reactions.1': 36,
  'user.reactions.2': 36,
  'user.creeps': 36,
  'user.reviews': 24,
  'user.syncs': 36,
  'agent.replies': 72,
  'agent.hmm': 36,
  'agent.compactions': 24,
  'agent.ships': 24,
};

/**
 * Pools only `--pool` reaches. `agent.nagReplies` is written by the `nags`
 * slot, one reply to each check-in that passed, and that pairing is the point
 * of it — the two pools read as one exchange rather than two lists. The pools
 * slot may still grow it when it is asked for by name, which is how a pool
 * whose check-ins are staying gets more answers written for them.
 */
const NAMED_ONLY_TARGETS = {
  'agent.nagReplies': 50,
};

/** Every `asks[stack][tier]` template pool, at three times slice one's sixteen. */
const ASK_POOL_TARGET = 48;

/** Check-ins the run asks for, and an agent reply to each one that passes. */
const NAG_TARGET = 50;

/** Reactions a topic gets, and reviews a level gets. */
const PER_TOPIC = 3;
const PER_PRODUCT = 3;

/**
 * How the prompt may gesture at a stack. The system prompt bars naming a real
 * language, and these pools are the user's own words, so the stack is named the
 * way a vibe coder names it: by the thing on the screen, never by the language.
 */
const STACK_WORDS = {
  bash: 'the black window with the blinking line in it, where commands are typed',
  csharp: 'a desktop program with windows and buttons, for people who like windows',
  java: 'a large, very serious enterprise system with a lot of ceremony',
  javascript: 'a page in a browser, with buttons that move when you click them',
  python: 'a small script that does one clever thing, written in the snake one',
  sql: 'the tables where all the records are kept, and the questions asked of them',
  integration: 'the little tools that call other little tools, wired together',
};

/** What each tier of ask asks for. Tier three borrows tier two's words. */
const ASK_TIER_WORDS = {
  0: 'an opening request, plain and hopeful, the thing anyone would ask for first',
  1: 'a bigger request that escalates: more of it, faster, and in the cloud',
  2: 'a request that has left the building entirely, absurd and completely sincere',
};

/** The mood a tiered pool other than the asks is written in. */
const MOOD_WORDS = {
  0: 'early days, warm and grateful, the startup still fits in one room',
  1: 'the company is growing and the user has started saying we a great deal',
  2: 'the hype has fully arrived and nobody involved is being sensible any more',
};

/** Word caps tighter than the gate's twelve, where the lever needs one. */
const ASK_WORDS = 10;
const SYNC_WORDS = 5;

function die(err) {
  const code = err instanceof Fail ? err.code : 'error';
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`${code}: ${msg}`);
  process.exit(2);
}

/** The command line, with this script's two flag sets and its usage. */
function readArgv(argv) {
  return parseArgv(argv, { valued: FLAGS, bare: BARE_FLAGS, usage: USAGE });
}

/**
 * The shared flags of `run` and `edit`, with this script's own defaults. The
 * temperature is the one default the two commands do not share: writing is a
 * draft and editing is a judgment.
 */
function readOpts(args, temperature = DEFAULT_TEMPERATURE) {
  return runOpts(args.flags, {
    temperature,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    ollama: DEFAULT_OLLAMA,
    concurrency: DEFAULT_CONCURRENCY,
    chunk: DEFAULT_CHUNK,
  });
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
    // A cloud tag holds a small number of request slots and answers 429 when
    // they are all busy. That is a queue, not a refusal: the caller waits and
    // asks again rather than writing the slot off as a drop.
    throw new Fail(
      res.status === 429 ? 'busy' : 'model refused',
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

/** How long a call waits out a busy queue before asking again, and how often. */
const BUSY_TRIES = 6;
const BUSY_BACKOFF_MS = 20_000;
const BUSY_CAP_MS = 180_000;

function sleep(ms) {
  return new Promise((done) => setTimeout(done, ms));
}

/**
 * One call, with the wall time it took. A failure is retried once, as it always
 * was. A **busy** queue is not a failure and does not spend that retry: the
 * call waits, twice as long each time with a little jitter so a slot's worth of
 * workers do not all come back at the same instant, and asks again. The receipt
 * carries how many times it waited, because a run of a hundred and seventy
 * calls against a tag with a handful of slots is mostly waiting.
 */
async function callModel(target, system, user, opts) {
  const fn = target.route === 'ollama' ? callOllama : callOpenRouter;
  const started = Date.now();
  let waits = 0;
  let first = null;
  for (let attempt = 1; ; attempt += 1) {
    try {
      const r = await fn(target.id, system, user, opts);
      return { ...r, ms: Date.now() - started, attempts: attempt, waits };
    } catch (err) {
      if (err instanceof Fail && err.code === 'busy' && waits < BUSY_TRIES) {
        const back = Math.min(BUSY_CAP_MS, BUSY_BACKOFF_MS * 2 ** waits);
        waits += 1;
        await sleep(back / 2 + Math.random() * back);
        continue;
      }
      if (first === null) {
        first = err;
        continue;
      }
      const also = err.message === first.message ? 'twice' : `first try: ${first.message}`;
      throw new Fail(err instanceof Fail ? err.code : 'call failed', `${err.message} (${also})`);
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
const PERSONA = [
  'You are the staff comedy writer on a workplace sitcom about a small software',
  'startup that is always one week away from either greatness or the end. You have',
  'been in that writers room for six seasons. You love the developers you write',
  'about: you were one before the room hired you, you still read their forums late',
  'at night, and you think their patience is the funniest and kindest thing on',
  'television. You write fond absurdity, never satire with teeth.',
  '',
  'What the room keeps you for:',
  '- the joke is on a situation the whole audience has been in, never on a person',
  '  who is in it',
  '- a violation is only funny while it stays benign, so the stakes stay small and',
  '  nobody in the scene gets hurt',
  '- a punchline lands in eight words and dies in twenty',
  '- the specific beats the general every time: one small named thing is funny, a',
  '  whole category is not',
  '- warmth is the engine, and the writer is never the cleverest person in the room',
  '',
].join('\n');

const RULES = [
  'Today you are writing lines for a typing arcade game.',
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

/**
 * The two voice sheets, `patterns/voice/user.md` and `patterns/voice/agent.md`.
 *
 * The full run of sub-slice B part three wrote every line through a hundred and
 * eighty-nine calls that each knew the persona and nothing another call had
 * written, and a hundred and eighty-nine strangers do not sound like one
 * person. The sheet is the fix: it rides in the system prompt of every call
 * that writes for that character, after the persona and before the rules, so
 * every call is writing the same person.
 */
const VOICE_DIR = path.join(PATTERNS, 'voice');

function readVoice(which) {
  const file = path.join(VOICE_DIR, `${which}.md`);
  if (!existsSync(file)) {
    throw new Fail('missing file', `${path.relative(ROOT, file)} is not there`);
  }
  const text = readFileSync(file, 'utf8').trim();
  if (text === '') throw new Fail('empty voice', `${path.relative(ROOT, file)} is empty`);
  return text;
}

function loadVoices() {
  return { user: readVoice('user'), agent: readVoice('agent') };
}

/** The sheet, wrapped so the model reads it as a character brief and not as prose. */
function voiceBlock(sheet) {
  return [
    'The character whose lines you are writing today. Every line you write must',
    'sound like the same person wrote it, and that person is this one.',
    '',
    '--- begin the voice sheet ---',
    sheet,
    '--- end the voice sheet ---',
    '',
  ].join('\n');
}

/** Persona, then the voice sheet, then the rules. `sheet` of null is the old prompt. */
function systemFor(sheet) {
  return sheet === null
    ? [PERSONA, RULES].join('\n')
    : [PERSONA, voiceBlock(sheet), RULES].join('\n');
}

/**
 * The sample carries no voice sheet, on purpose. Its four prompt hashes are the
 * ones the Director read a model from and the ones `docs/vibe-typer.slice3.md`
 * pins; a sheet in that prompt would change every one of them and the pinned
 * read would no longer replay.
 */
const SAMPLE_SYSTEM = systemFor(null);

/**
 * How many lines already kept for a slot ride back into the next call of that
 * slot. A hundred and twenty lines is a few thousand tokens, which is small
 * beside a chunk of forty pieces of code and is enough for the model to hear
 * where the pool already is.
 */
const MEMORY_LINES = 120;

/**
 * The lines this slot has already kept in this run, at the top of the prompt.
 * They are the memory the full run did not have: not a style note about the
 * voice, but the actual pool as it stands, so the next forty lines do not
 * repeat it in words or in meaning.
 */
function memoryBlock(lines) {
  if (!lines || lines.length === 0) return '';
  return [
    'Lines already written for this same pool, earlier in this same run. They are',
    'finished and they are staying. Keep their voice exactly, and do not repeat any',
    'of them — not in words and not in meaning.',
    '',
    ...lines.slice(-MEMORY_LINES).map((l) => `- ${l}`),
    '',
    '---',
    '',
  ].join('\n');
}

/**
 * A slot's memory: the lines it has kept so far in this run. `mapLimit` reads
 * the tail when a call starts, so a call sees what the calls before it kept and
 * nothing of the ones beside it. That makes the run order-dependent, which is
 * the price of the memory; the receipt pins every call's own prompt hash, so
 * the replay is per call rather than per slot.
 */
function makeMemory(seed = []) {
  const lines = [...seed];
  return {
    lines,
    add(line) {
      if (typeof line === 'string' && line !== '') lines.push(line);
    },
    tail() {
      return lines.slice(-MEMORY_LINES);
    },
  };
}

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

/**
 * The sixteen premises in one call, with the sixteen products in front of the
 * writer at once. The keys are ordinals, never level ids: a key the writer can
 * read is a key the writer writes back into a line.
 *
 * Each product is shown with the four requests that level already pins, when it
 * has them. A premise is the line those four sit under, so the writer has to
 * see them — part four showed the product alone and got sixteen restatements of
 * the product back, which is the instruction the level already carries rather
 * than the situation that makes it funny.
 */
function premisesPrompt(products, per) {
  const rows = [];
  for (const p of products) {
    rows.push(`- ${p.key}: ${p.phrase}`);
    for (const ask of p.asks ?? []) rows.push(`    they then ask: ${ask}`);
  }
  return [
    'A level of the game is one story about one product, and the standup shows one',
    'line above the product before the level starts: the premise. It is the situation',
    'the user is in that makes them want this thing today — what is going on in their',
    'life, or their company, or their kitchen — and the four requests under it are the',
    'tale it sets up.',
    '',
    'A premise is never the instruction. The user is not asking for the thing here;',
    'the request comes later, and the standup already prints the product on the line',
    'below. So the premise never repeats the product back, and never opens with a verb',
    'telling the agent to build, make, launch, create or track anything.',
    '',
    'Two premises of the right shape, for two products you will see below:',
    '',
    '- for a website for a cat: the cat has a following and needs somewhere to put it',
    '- for a rideshare for ducks: the ducks are ready, the rides are not',
    '',
    'Here are all the products, in the order the player meets them, each with the',
    'requests that level goes on to make. The first ones are the small hopeful ideas',
    'and the last ones have left the building entirely. Write the premise for each.',
    'They are read one after another by the same player, so no two of them may open',
    'the same way or land the same joke.',
    '',
    ...rows,
    '',
    'At most twelve words each, in lower case, in the voice of the sheet above.',
    '',
    `Give ${per} different candidates for each one.`,
    '',
    'Answer with a JSON object whose keys are the labels above and whose values are',
    `arrays of ${per} strings. The label is a label; never write it inside a line.`,
  ].join('\n');
}

/**
 * One level's four pieces and the four requests that ask for them, written
 * under the premise that opens the level.
 */
function picksPrompt(product, premise, snippets, per) {
  return [
    `A level of the game is one story about one product. This level's product is`,
    `${product}, and the line the standup shows before it starts is:`,
    '',
    premise,
    '',
    'Choose four of the pieces below and write the four requests that ask for them, in',
    'order, so that they tell one story under that line: the first sets the product up,',
    'the middle two escalate the idea, and the fourth is the deploy with a twist. Choose',
    'pieces whose code really does the job each request describes.',
    '',
    'Every request is a template of ten words or fewer; the token {product} may appear',
    'once and is replaced later. The user types in lower case.',
    '',
    'The four are read one after another by the same player in the same minute, so no',
    'two of them may open on the same word, and at most one of the four may open on the',
    'token. A player who reads the same four opening words four times is reading a form,',
    'not a person.',
    '',
    snippetBlock(snippets),
    '',
    'Answer with a JSON object of this shape:',
    '{ "picks": [four ids in order],',
    '  "asks": { "<id>": [' + per + ' strings], ... one entry per pick } }',
  ].join('\n');
}

function reviewPrompt(products, per) {
  return [
    'At the end of a level the user reviews what was built, one line, delighted and',
    'absurd, naming the product in their own plain words. Write the review for each',
    'product below. At most twelve words. The user types in lower case.',
    '',
    ...products.map((p) => `- ${p.key}: ${p.phrase}`),
    '',
    `Give ${per} different candidates for each product.`,
    '',
    'Answer with a JSON object whose keys are the labels above and whose values are',
    `arrays of ${per} strings. The label is a label and is not the name of anything;`,
    'never write a label inside a line, and never invent a short hyphenated name for a',
    'product. The user calls their product what it is, in words.',
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
    'a line of meeting chatter, five words or fewer, that reads the same whoever says it',
  'agent.replies':
    "the agent's cheerful sycophantic yes to a request, capitalized like a person in a chat",
  'agent.hmm':
    "the agent's own gentle correction when a line came out wrong, never blaming anyone, capitalized",
  'agent.compactions':
    "the agent's one-line summary of the work so far when the conversation is compacted, capitalized",
  'agent.ships': "the agent's line when a piece is finished and live, proud and warm, capitalized",
  'agent.nagReplies':
    "the agent's reply to a check-in while it is still typing, fond and unbothered, never promising a time, capitalized",
};

/**
 * The template pools a request falls back to when its snippet has no ask of its
 * own. One stack, one tier, and the token standing in for whatever is being
 * built, so the same template serves every absurd product.
 */
function askPoolPrompt(stack, tier, n, per) {
  return [
    `Write ${n} requests the user makes of the agent. Each one is ${ASK_TIER_WORDS[tier]}.`,
    '',
    `What is being built this time is ${STACK_WORDS[stack]}.`,
    '',
    'Write each request as a template: the token {product} may appear once and is',
    `replaced by the product name later, so keep every line to ${ASK_WORDS} words or fewer.`,
    'The user types in lower case and does not capitalize. Every line is different from',
    'the others, and none of them names the language or the tool.',
    '',
    `Give ${per} different candidates for each of the ${n}.`,
    '',
    `Answer with a JSON array of ${n} arrays, each holding ${per} strings.`,
  ].join('\n');
}

/**
 * The quick sync, which is neither character's voice and so carries neither
 * sheet.
 *
 * A meeting interrupts a level and the player types three short lines of it
 * between two requests. Part four pointed the user sheet at this pool and got
 * back the user's tics — `can it be more`, `oh also`, `tiny thing` — which is a
 * founder talking to their agent, not two people in a meeting. A sync line has
 * to read the same whoever says it, because the shell does not say who did.
 */
function syncPrompt(n, per) {
  return [
    `Write ${n} lines of meeting chatter.`,
    '',
    'Two people who like each other are on a quick call. Nothing is wrong, nobody is',
    'in trouble, and the meeting is the small friendly noise a working day makes:',
    'agreeing, offering, asking for the thing on the screen, saying the obvious kind',
    'sentence out loud.',
    '',
    'These are the lines to write toward:',
    '',
    '- sounds good',
    '- will do',
    '- can you share your screen',
    '- let me find the link',
    '',
    `At most ${SYNC_WORDS} words each, in lower case.`,
    '',
    'Every line must read the same whoever said it. Nobody reading one may be able to',
    'tell which of the two people in the meeting said it, so no line asks for a thing',
    'to be built, praises anyone, mentions a product, or belongs to one person more',
    'than the other. Most of them end with nothing at all; a few are questions.',
    'Every line is different from the others.',
    '',
    `Give ${per} different candidates for each of the ${n}.`,
    '',
    `Answer with a JSON array of ${n} arrays, each holding ${per} strings.`,
  ].join('\n');
}

function poolPrompt(key, n, per) {
  const parts = key.split('.');
  const brief = POOL_BRIEFS[`${parts[0]}.${parts[1]}`];
  const words = key === 'user.syncs' ? SYNC_WORDS : 12;
  // A tiered pool says which tier it is writing for; a flat one says nothing.
  const tier = parts[2] !== undefined ? MOOD_WORDS[parts[2]] : null;
  return [
    `Write ${n} lines, each one ${brief}.`,
    ...(tier === null ? [] : ['', `The mood of this batch: ${tier}.`, '']),
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
async function askSlot(target, system, user, keys, gate, opts) {
  const hash = promptHash(system, user);
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
    waits: 0,
    error: null,
    lines: {},
    alternates: {},
    // The model's own parsed answer, for a slot that needs more than lines
    // (the story slot reads its four picks out of it).
    raw: null,
  };
  let answer;
  try {
    answer = await callModel(target, system, user, opts);
  } catch (err) {
    return { ...base, error: err.message };
  }
  base.ms = answer.ms;
  base.tokens = answer.tokens;
  base.cost = answer.cost;
  base.attempts = answer.attempts;
  base.waits = answer.waits ?? 0;
  let parsed;
  try {
    parsed = parseCandidates(answer.text);
  } catch (err) {
    return { ...base, error: err.message };
  }
  base.raw = parsed;
  // A slot with no keys wants the model's own object and nothing else — the
  // picks call reads its four ids and their asks out of `raw` itself. Shaping
  // an answer against no keys would count every field it holds as surplus,
  // which is where the full run's fifty-seven phantom drops came from.
  if (keys.length === 0) return base;
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
      SAMPLE_SYSTEM,
      askPrompt(snippets, product, CANDIDATES_PER_SLOT),
      ids,
      gates.ask,
      opts,
    );

    process.stderr.write(`${target.spec}: nags\n`);
    const nags = await askSlot(
      target,
      SAMPLE_SYSTEM,
      nagPrompt(SAMPLE_N, CANDIDATES_PER_SLOT),
      keys,
      gates.line,
      opts,
    );

    process.stderr.write(`${target.spec}: reactions\n`);
    const reactions = await askSlot(
      target,
      SAMPLE_SYSTEM,
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
            SAMPLE_SYSTEM,
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
    waits: 0,
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
  const only = args.flags.only ? String(args.flags.only).split(',') : DEFAULT_SLOTS;
  for (const s of only) {
    if (!RUN_SLOTS.includes(s)) throw new Fail('bad flag', `unknown slot "${s}"\n${USAGE}`);
  }
  const opts = readOpts(args);
  const apply = args.flags.apply === true;
  const revoice = args.flags.revoice === true;
  mkdirSync(AUTHORING, { recursive: true });

  const ctx = makeCtx(target, opts, gates, { apply, revoice });
  // A snippet pinned into a level story keeps the story's ask; the ask slot
  // skips it so the two never write the same key twice.
  for (const level of ctx.levels.levels) {
    for (const id of level.snippets ?? []) ctx.pinned.add(id);
  }

  const runners = {
    premises: slotPremises,
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
    concurrency: opts.concurrency,
    chunk: opts.chunk,
    revoice,
    // What `--spare` and `--pool` were given as, so a run that wrote one pool
    // a long way over its floor replays as that run and not as the full pass.
    spare: opts.spare,
    pool: args.flags.pool ?? null,
    voice: ctx.voiceHashes,
    applied: apply,
    calls: 0,
    wallMs: 0,
    slots: {},
  };
  const startedAt = Date.now();
  for (const name of only) {
    process.stderr.write(`${target.spec}: ${name}\n`);
    const slotStarted = Date.now();
    const result = await runners[name](ctx);
    result.report.wallMs = Date.now() - slotStarted;
    receipt.slots[name] = result.report;
    receipt.calls = Object.values(receipt.slots).reduce((a, s) => a + (s.calls ?? 0), 0);
    receipt.wallMs = Date.now() - startedAt;
    if (apply) {
      result.apply();
      // Saved a slot at a time, not once at the end: a run of fifty calls that
      // dies in its third hour must not throw away the four slots that landed.
      saveLevers(ctx);
    }
    // The candidates are written whether or not the run applies: a line the
    // gate kept and a line it dropped are both evidence, and an applied run
    // that kept no record of what it did not take would be the one run
    // nobody could read afterwards.
    writeJson(path.join(AUTHORING, `${stamp}-${name}.json`), {
      model: target.spec,
      date: today(),
      stamp,
      applied: apply,
      report: result.report,
      candidates: result.candidates,
    });
    // Written after every slot, so a run that dies late still leaves the
    // receipt for the slots that landed.
    writeJson(path.join(AUTHORING, `${stamp}-run.json`), receipt);
  }
  writeJson(path.join(AUTHORING, `${stamp}-run.json`), receipt);
  if (apply) {
    saveLevers(ctx);
    prettier([...ctx.touched]);
  }
  console.log(
    apply
      ? `applied ${only.join(', ')} into the levers in ${receipt.calls} calls; run pnpm test before committing`
      : `wrote candidates for ${only.join(', ')} under ${path.relative(ROOT, AUTHORING)}`,
  );
}

/**
 * Everything a slot reads: the levers, the corpus, the two voice sheets, the
 * two system prompts built from them, and the gates with the level-id rule
 * added.
 */
function makeCtx(target, opts, gates, { apply = false, revoice = false } = {}) {
  const levels = readJson(path.join(PATTERNS, 'levels.json'));
  const voices = loadVoices();
  const slugs = levels.levels.map((l) => l.id).filter((id) => id.includes('-'));
  return {
    target,
    opts,
    apply,
    revoice,
    gates: {
      line: slugGate(gates.line, slugs),
      ask: slugGate(gates.ask, slugs),
      sync: slugGate(gates.sync, slugs),
      premise: premiseGate(slugGate(gates.line, slugs)),
    },
    voices,
    // `plain` is the persona and the rules with no sheet at all. One slot uses
    // it: the quick-sync chatter, which is neither character's voice.
    system: { user: systemFor(voices.user), agent: systemFor(voices.agent), plain: SAMPLE_SYSTEM },
    voiceHashes: { user: textHash(voices.user), agent: textHash(voices.agent) },
    // The lines each sheet names as the voice, by key. The editor may not drop
    // one of them; nothing else reads this.
    exemplars: { user: voiceExemplars(voices.user), agent: voiceExemplars(voices.agent) },
    levels,
    user: readJson(path.join(PATTERNS, 'user.json')),
    agent: readJson(path.join(PATTERNS, 'agent.json')),
    corpus: loadCorpus(),
    pinned: new Set(),
    touched: new Set(),
  };
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The gate, plus: a line may never name a level by its id.
 *
 * The full run showed the review prompt the level id beside the product and
 * eight of the sixteen reviews wrote the id back — a hyphenated internal name
 * in the mouth of a person who calls their own product what it is, in words.
 * The prompts no longer show an id at all; this is the second lock, and like
 * every other gate rule it drops the line rather than mending it.
 */
function slugGate(base, slugs) {
  if (slugs.length === 0) return base;
  const re = new RegExp(`\\b(${slugs.map(escapeRegExp).join('|')})\\b`, 'i');
  return (line) => {
    const reason = base(line);
    if (reason !== null) return reason;
    return re.test(line) ? 'names a level by its id' : null;
  };
}

/**
 * The verbs a premise may not open on. A premise sits above the product on the
 * standup and the four requests sit under it; a line that opens on one of these
 * is the request again, which is what part four's sixteen premises were. Like
 * `slugGate` this lives in the script and drops rather than mends.
 */
const PREMISE_VERBS =
  /^(make|build|launch|create|track|add|give|open|start|design|write|run|judge|organize|chain|trade|show|list|let|have|put|set|turn|keep|find|count|pick|send|ship|do)\b/i;

function premiseGate(base) {
  return (line) => {
    const reason = base(line);
    if (reason !== null) return reason;
    return PREMISE_VERBS.test(String(line).trim()) ? 'opens on an instruction' : null;
  };
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
    chunk: opts.chunk,
    concurrency: opts.concurrency,
    prompts: [],
    calls: 0,
    requested: 0,
    kept: 0,
    missing: 0,
    waits: 0,
    dropped: {},
    ms: 0,
    tokens: { in: 0, out: 0 },
    cost: null,
    errors: [],
  };
}

function foldSlot(report, slot) {
  report.prompts.push(slot.promptHash);
  report.calls += 1;
  report.requested += slot.requested;
  report.kept += slot.kept;
  report.missing += slot.missing;
  report.waits += slot.waits ?? 0;
  report.ms += slot.ms;
  report.tokens.in += slot.tokens?.in ?? 0;
  report.tokens.out += slot.tokens?.out ?? 0;
  if (typeof slot.cost === 'number') report.cost = (report.cost ?? 0) + slot.cost;
  mergeDropped(report.dropped, slot.dropped);
  if (slot.error) report.errors.push(slot.error);
  return report;
}

/** The snippets a level may pin: its own stack, inside its band. */
function bandPool(ctx, level) {
  return (ctx.corpus.byStack.get(level.stack) ?? []).filter(
    (s) => s.band >= level.bandMin && s.band <= level.bandMax,
  );
}

/**
 * The sixteen premises and nothing else: one call, the products and the four
 * pinned requests of each level in front of the writer, the pins untouched.
 *
 * `stories` re-picks and re-writes the four requests as well, which is right
 * when the levels are being built and wrong when they are built and only the
 * line above them is off. Part five is the second case: the pins and the asks
 * of part four hold, and the premises under them were sixteen restatements of
 * the product.
 */
async function slotPremises(ctx) {
  const report = emptyReport(ctx.target, ctx.opts);
  const candidates = {};
  const levels = ctx.levels.levels;
  const keys = levels.map((_, i) => `item-${i + 1}`);
  const asks = askByLevel(ctx);
  const products = levels.map((l, i) => ({
    key: keys[i],
    phrase: levelProduct(l),
    asks: asks.get(l.id) ?? [],
  }));
  const slot = await askSlot(
    ctx.target,
    ctx.system.user,
    premisesPrompt(products, CANDIDATES_PER_SLOT),
    keys,
    ctx.gates.premise,
    ctx.opts,
  );
  foldSlot(report, slot);
  const writes = [];
  for (const [i, level] of levels.entries()) {
    const line = slot.lines[keys[i]];
    candidates[level.id] = {
      kept: line,
      alternates: slot.alternates[keys[i]] ?? [],
    };
    if (typeof line === 'string') writes.push({ level, story: line });
    else report.errors.push(`${level.id}: the premise did not come back clean`);
  }
  return {
    report,
    candidates,
    apply() {
      for (const w of writes) w.level.story = w.story;
      ctx.touched.add(path.join(PATTERNS, 'levels.json'));
    },
  };
}

/** Each level's four pinned requests, as the corpus holds them. */
function askByLevel(ctx) {
  const byId = new Map();
  for (const s of ctx.corpus.all) byId.set(s.id, s);
  const out = new Map();
  for (const level of ctx.levels.levels) {
    const asks = [];
    for (const id of level.snippets ?? []) {
      const ask = byId.get(id)?.ask;
      if (typeof ask === 'string' && ask !== '') asks.push(ask);
    }
    out.set(level.id, asks);
  }
  return out;
}

/**
 * Level stories: the sixteen premises in one call, then one call a level for
 * the four pinned pieces and the four requests that ask for them.
 *
 * The full run wrote each premise in the same call as its level's picks, which
 * meant sixteen premises written by sixteen calls that had never heard one
 * another. The premises are one call now, with all sixteen products in front
 * of the writer, and each picks call is then given its own level's premise so
 * the four requests are written under the line that opens them.
 */
async function slotStories(ctx) {
  const report = emptyReport(ctx.target, ctx.opts);
  const candidates = { premises: {}, levels: {} };
  const levels = ctx.levels.levels;
  // The key is an ordinal, never the level id: a key the writer can read is a
  // key the writer will write back into a line.
  const keys = levels.map((_, i) => `item-${i + 1}`);
  const products = levels.map((l, i) => ({ key: keys[i], phrase: levelProduct(l) }));

  const premiseSlot = await askSlot(
    ctx.target,
    ctx.system.user,
    premisesPrompt(products, CANDIDATES_PER_SLOT),
    keys,
    ctx.gates.line,
    ctx.opts,
  );
  foldSlot(report, premiseSlot);
  const premises = new Map();
  for (const [i, level] of levels.entries()) {
    const line = premiseSlot.lines[keys[i]];
    candidates.premises[level.id] = {
      kept: line,
      alternates: premiseSlot.alternates[keys[i]] ?? [],
    };
    if (typeof line === 'string') premises.set(level.id, line);
    else report.errors.push(`${level.id}: the premise did not come back clean`);
  }

  // A stack with no file — the integration one, which is built from tape
  // headers at play time — has no pieces to show the writer, so its level gets
  // the premise and nothing else. It pins nothing and draws its four requests
  // from the band, which is what the contract says it does.
  const jobs = [];
  const writes = [];
  const used = new Set();
  for (const level of levels) {
    const pool = bandPool(ctx, level);
    if (!premises.has(level.id)) {
      // Its premise did not come back, so this level keeps the story and the
      // four pins it already had — and those pins are spoken for, or a level
      // that is being re-picked could take one of them and put the same piece
      // in two levels again.
      for (const id of level.snippets ?? []) used.add(id);
      continue;
    }
    if (pool.length < 4) {
      writes.push({ level, story: premises.get(level.id), picks: null, asks: {} });
      continue;
    }
    jobs.push({ level, pool });
  }

  const mem = makeMemory([...premises.values()]);
  const asked = await mapLimit(jobs, ctx.opts.concurrency, (job) =>
    askPicks(ctx, job, premises.get(job.level.id), mem),
  );
  const again = [];
  for (const r of asked) {
    const taken = foldPicks(ctx, report, candidates, r, used, writes, mem, premises);
    if (taken === 'collision') again.push(r.job);
  }
  // A level whose four pieces were already taken by an earlier level is asked
  // once more with those pieces out of its pool. Fifty-six pins over fifty-two
  // ids is what the full run left behind, because no call knew what another
  // had pinned; the set is shared here and the re-ask closes the gap.
  if (again.length > 0) {
    const retried = await mapLimit(again, ctx.opts.concurrency, (job) =>
      askPicks(
        ctx,
        { ...job, pool: job.pool.filter((s) => !used.has(s.id)) },
        premises.get(job.level.id),
        mem,
      ),
    );
    for (const r of retried) {
      const taken = foldPicks(ctx, report, candidates, r, used, writes, mem, premises);
      if (taken === 'collision') {
        report.errors.push(`${r.job.level.id}: its four pieces are still taken by another level`);
      }
    }
  }

  // Re-voicing re-pins every level, so the set of pinned pieces is the one this
  // slot just wrote plus the pins of any level it could not re-pin — not the
  // union of that and the pins the run started from. Without this the `asks`
  // slot skips a piece that was pinned before the run and is not pinned now,
  // and that piece keeps an ask written by a call from the pass before.
  if (ctx.revoice) {
    ctx.pinned.clear();
    const repinned = new Set(writes.map((w) => w.level.id));
    for (const level of levels) {
      if (repinned.has(level.id)) continue;
      for (const id of level.snippets ?? []) ctx.pinned.add(id);
    }
    for (const w of writes) for (const id of w.picks ?? []) ctx.pinned.add(id);
  }

  return {
    report,
    candidates,
    apply() {
      for (const level of ctx.levels.levels) {
        // The product is a lever string the player reads on the standup and in
        // every review. One of the sixteen named a real company, and the
        // brand-free phrase this script has always sent to the writer is now
        // what the level itself says.
        const phrase = productPhrase(level.product, PRODUCT_PHRASE);
        if (BRAND_NAMES.test(level.product) && phrase !== null) level.product = phrase;
      }
      for (const w of writes) {
        w.level.story = w.story;
        if (w.picks === null) delete w.level.snippets;
        else w.level.snippets = w.picks;
        for (const [id, ask] of Object.entries(w.asks)) setSnippetAsk(ctx, id, ask);
      }
      ctx.touched.add(path.join(PATTERNS, 'levels.json'));
    },
  };
}

/** One level's four picks and the four requests that ask for them. */
async function askPicks(ctx, job, premise, mem) {
  const product = levelProduct(job.level);
  const slot = await askSlot(
    ctx.target,
    ctx.system.user,
    memoryBlock(mem.tail()) + picksPrompt(product, premise, job.pool, CANDIDATES_PER_SLOT),
    [],
    ctx.gates.ask,
    ctx.opts,
  );
  return { job, slot };
}

/**
 * Fold one picks answer in level order. Returns `'taken'`, `'collision'` when a
 * piece is already pinned elsewhere, or `'error'`.
 */
function foldPicks(ctx, report, candidates, { job, slot }, used, writes, mem, premises) {
  const { level, pool } = job;
  foldSlot(report, slot);
  const raw = slot.raw ?? null;
  const picks = Array.isArray(raw?.picks)
    ? raw.picks.filter((id) => pool.some((s) => s.id === id))
    : [];
  candidates.levels[level.id] = { picks, asks: {}, raw };
  if (picks.length !== 4 || new Set(picks).size !== 4) {
    report.errors.push(`${level.id}: the four picks did not come back clean`);
    return 'error';
  }
  if (picks.some((id) => used.has(id))) return 'collision';
  const asks = {};
  for (const id of picks) {
    const list = Array.isArray(raw?.asks?.[id]) ? raw.asks[id] : [];
    const { kept, dropped } = keepFirstPassing(list, ctx.gates.ask);
    mergeDropped(report.dropped, dropped);
    report.requested += list.length;
    if (kept === null) {
      report.errors.push(`${level.id}: an ask for a pinned piece did not pass the gate`);
      return 'error';
    }
    report.kept += 1;
    asks[id] = kept;
  }
  candidates.levels[level.id].asks = asks;
  for (const id of picks) used.add(id);
  // Marked pinned the moment the story is written, not when the lever is
  // saved: the `asks` slot runs next in the same invocation and must skip a
  // snippet whose ask this story just wrote, or it would ask a second time and
  // write over the story's own words.
  for (const id of picks) ctx.pinned.add(id);
  for (const ask of Object.values(asks)) mem.add(ask);
  writes.push({ level, story: premises.get(level.id), picks, asks });
  return 'taken';
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
  const groups = [];
  for (const [stack, list] of ctx.corpus.byStack) {
    for (const group of chunkEven(
      list.filter((s) => !ctx.pinned.has(s.id)),
      ctx.opts.chunk,
    )) {
      groups.push({ stack, group });
    }
  }
  const mem = makeMemory();
  const asked = await mapLimit(groups, ctx.opts.concurrency, async ({ stack, group }) => {
    const ids = group.map((s) => s.id);
    const slot = await askSlot(
      ctx.target,
      ctx.system.user,
      memoryBlock(mem.tail()) + askTemplatePrompt(group, CANDIDATES_PER_SLOT),
      ids,
      ctx.gates.ask,
      ctx.opts,
    );
    for (const id of ids) mem.add(slot.lines[id]);
    return { stack, ids, slot };
  });
  for (const { stack, ids, slot } of asked) {
    foldSlot(report, slot);
    for (const id of ids) {
      candidates[id] = { kept: slot.lines[id], alternates: slot.alternates[id] ?? [] };
      if (slot.lines[id]) writes.push({ stack, id, ask: slot.lines[id] });
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
  const want = ctx.revoice ? NAG_TARGET + REVOICE_SPARE : NAG_TARGET;
  const nagGroups = chunkEven(nagKeys(want), ctx.opts.chunk);
  const nagMem = makeMemory();
  // One after another, not side by side. Both of these slots write a single
  // pool, so two calls in flight are two writers with no memory of each other
  // writing the same fifty lines; the first attempt lost eight of fifty-four
  // check-ins to dedupe that way and fell under the pool's floor. The pools
  // slot solves the same problem by ordering; here there is nothing to order
  // against, so the width is one.
  const askedNags = await mapLimit(nagGroups, 1, async (group) => {
    const slot = await askSlot(
      ctx.target,
      ctx.system.user,
      memoryBlock(nagMem.tail()) + nagPrompt(group.length, CANDIDATES_PER_SLOT),
      group,
      ctx.gates.line,
      ctx.opts,
    );
    for (const k of group) nagMem.add(slot.lines[k]);
    return slot;
  });
  for (const [i, slot] of askedNags.entries()) {
    foldSlot(report, slot);
    for (const k of nagGroups[i]) {
      candidates.nags[k] = { kept: slot.lines[k], alternates: slot.alternates[k] ?? [] };
      if (slot.lines[k]) nags.push(slot.lines[k]);
    }
  }
  // The agent answers the check-ins that passed, in the order they passed, so
  // the two pools read as one exchange rather than two lists.
  const replyGroups = chunkEven(nags, ctx.opts.chunk);
  let n = 0;
  const keyed = replyGroups.map((group) => group.map(() => `reply-${(n += 1)}`));
  const replyMem = makeMemory();
  const askedReplies = await mapLimit(replyGroups, 1, async (group, g) => {
    const slot = await askSlot(
      ctx.target,
      ctx.system.agent,
      memoryBlock(replyMem.tail()) + nagReplyPrompt(group, CANDIDATES_PER_SLOT),
      keyed[g],
      ctx.gates.line,
      ctx.opts,
    );
    for (const k of keyed[g]) replyMem.add(slot.lines[k]);
    return slot;
  });
  for (const [g, slot] of askedReplies.entries()) {
    foldSlot(report, slot);
    for (const k of keyed[g]) {
      candidates.nagReplies[k] = { kept: slot.lines[k], alternates: slot.alternates[k] ?? [] };
      if (slot.lines[k]) replies.push(slot.lines[k]);
    }
  }
  return {
    report,
    candidates,
    apply() {
      ctx.user.nags = settle(report, 'user.nags', ctx.user.nags ?? [], nags, NAG_TARGET, ctx);
      ctx.agent.nagReplies = settle(
        report,
        'agent.nagReplies',
        ctx.agent.nagReplies ?? [],
        replies,
        NAG_TARGET,
        ctx,
      );
      ctx.touched.add(path.join(PATTERNS, 'user.json'));
      ctx.touched.add(path.join(PATTERNS, 'agent.json'));
    },
  };
}

/**
 * What a pool becomes. Topping up appends, as it always did. Re-voicing
 * replaces — that is the whole point of the pass — but never below the
 * loader's floor: a pool that came back short keeps the lines it had and the
 * report says which pool and by how much, so the slot can be asked again
 * rather than the levers being left unloadable.
 */
function settle(report, key, existing, fresh, floor, ctx) {
  if (!ctx.revoice) return dedupe([...existing, ...fresh]);
  const next = dedupe(fresh);
  if (next.length >= floor) return next;
  report.errors.push(
    `${key}: re-voiced to ${next.length} lines, under its floor of ${floor}; the old pool was kept`,
  );
  return existing;
}

/** Three reactions per corpus topic, keyed by the topic word. */
async function slotReactions(ctx) {
  const report = emptyReport(ctx.target, ctx.opts);
  const topics = corpusTopics(ctx.corpus.all);
  const byTopic = {};
  const candidates = {};
  const groups = chunkEven(topics, ctx.opts.chunk);
  const mem = makeMemory();
  const asked = await mapLimit(groups, ctx.opts.concurrency, async (group) => {
    const slot = await askSlot(
      ctx.target,
      ctx.system.user,
      memoryBlock(mem.tail()) + topicReactionPrompt(group, PER_TOPIC),
      group,
      ctx.gates.line,
      ctx.opts,
    );
    for (const t of group) mem.add(slot.lines[t]);
    return slot;
  });
  for (const [i, slot] of asked.entries()) {
    foldSlot(report, slot);
    for (const t of groups[i]) {
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
      // A topic whose three candidates all fell the gate keeps the three it
      // had, so no topic is ever left without a line and the loader holds.
      ctx.user.reactionsByTopic = { ...(ctx.user.reactionsByTopic ?? {}), ...byTopic };
      ctx.touched.add(path.join(PATTERNS, 'user.json'));
    },
  };
}

/** Three reviews per level, keyed by an ordinal so no id can be written back. */
async function slotReviews(ctx) {
  const report = emptyReport(ctx.target, ctx.opts);
  const levels = ctx.levels.levels;
  const keys = levels.map((_, i) => `item-${i + 1}`);
  const products = levels.map((l, i) => ({ key: keys[i], phrase: levelProduct(l) }));
  const byLevel = {};
  const candidates = {};
  const groups = chunkEven(products, ctx.opts.chunk);
  const mem = makeMemory();
  const asked = await mapLimit(groups, ctx.opts.concurrency, async (group) => {
    const slot = await askSlot(
      ctx.target,
      ctx.system.user,
      memoryBlock(mem.tail()) + reviewPrompt(group, PER_PRODUCT),
      group.map((p) => p.key),
      ctx.gates.line,
      ctx.opts,
    );
    for (const p of group) mem.add(slot.lines[p.key]);
    return slot;
  });
  const byKey = new Map(levels.map((l, i) => [keys[i], l.id]));
  for (const [i, slot] of asked.entries()) {
    foldSlot(report, slot);
    for (const p of groups[i]) {
      const id = byKey.get(p.key);
      const lines = [slot.lines[p.key], ...(slot.alternates[p.key] ?? [])].filter(
        (x) => typeof x === 'string',
      );
      candidates[id] = lines;
      if (lines.length > 0) byLevel[id] = lines;
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

/** The pools: topped up to their floor, or written fresh at it when re-voicing. */
async function slotPools(ctx) {
  const report = emptyReport(ctx.target, ctx.opts);
  const candidates = {};
  const adds = {};
  // Every pool this run writes, flat and tiered alike, as one list of calls,
  // so a slot of fifty-odd calls runs at the width the run was given rather
  // than one pool at a time.
  const jobs = [];
  const mems = new Map();
  const floors = {};
  const plan = Object.entries(POOL_TARGETS).map(([key, target]) => ({ key, target }));
  // A pool the full pass never writes here joins the plan only when `--pool`
  // named one, so a run with no `--pool` writes exactly what it always did.
  if (ctx.opts.poolsNamed) {
    for (const [key, target] of Object.entries(NAMED_ONLY_TARGETS)) plan.push({ key, target });
  }
  // The ask templates: one pool a stack a tier, the fallback a request reads
  // when its own snippet has no ask. Twenty-one pools, so they are built the
  // same way rather than written out.
  for (const stack of Object.keys(STACK_WORDS)) {
    for (const tier of ['0', '1', '2']) {
      plan.push({ key: `user.asks.${stack}.${tier}`, target: ASK_POOL_TARGET, stack, tier });
    }
  }
  // How far over its floor a pool is written. Re-voicing keeps the four spare
  // it always had; a top-up adds nothing unless `--spare` asks for it, which
  // is how a pool already at its floor is grown rather than left alone.
  const spare = ctx.opts.spare ?? (ctx.revoice ? REVOICE_SPARE : 0);
  for (const item of plan) {
    const { key, target } = item;
    // `--pool` narrows the slot to named pools, so one pool can be re-voiced
    // or grown without re-writing the thirty-one beside it.
    if (!ctx.opts.pools(key)) continue;
    const want = ctx.revoice
      ? target + spare
      : Math.max(0, target + spare - poolAt(ctx, key).length);
    candidates[key] = [];
    floors[key] = target;
    mems.set(key, makeMemory());
    if (want === 0) continue;
    const field = key.split('.')[1];
    const keys = Array.from({ length: want }, (_, i) => `${field}-${i + 1}`);
    const sync = key === 'user.syncs';
    for (const group of chunkEven(keys, ctx.opts.chunk)) {
      jobs.push({
        key,
        group,
        gate: sync ? ctx.gates.sync : item.stack ? ctx.gates.ask : ctx.gates.line,
        // The sync pool is chatter, not a character, so it carries no sheet.
        system: sync
          ? ctx.system.plain
          : key.startsWith('agent.')
            ? ctx.system.agent
            : ctx.system.user,
        prompt: sync
          ? syncPrompt(group.length, CANDIDATES_PER_SLOT)
          : item.stack
            ? askPoolPrompt(item.stack, item.tier, group.length, CANDIDATES_PER_SLOT)
            : poolPrompt(key, group.length, CANDIDATES_PER_SLOT),
      });
    }
  }
  // Two calls that write the same pool must never be in flight together. The
  // memory is what keeps a pool from repeating itself, and a call only sees
  // what the calls **before** it kept — so a pool written by two calls side by
  // side is written twice by a writer with no memory, and the duplicates it
  // makes are deduped back out under the pool's floor. Ordering every pool's
  // first call ahead of every pool's second puts them a whole round apart.
  const round = new Map();
  for (const job of jobs) {
    const n = round.get(job.key) ?? 0;
    round.set(job.key, n + 1);
    job.round = n;
  }
  jobs.sort((a, b) => a.round - b.round);
  const asked = await mapLimit(jobs, ctx.opts.concurrency, async (job) => {
    const mem = mems.get(job.key);
    const slot = await askSlot(
      ctx.target,
      job.system,
      memoryBlock(mem.tail()) + job.prompt,
      job.group,
      job.gate,
      ctx.opts,
    );
    for (const k of job.group) mem.add(slot.lines[k]);
    return slot;
  });
  for (const [i, slot] of asked.entries()) {
    const job = jobs[i];
    foldSlot(report, slot);
    for (const k of job.group) {
      if (slot.lines[k]) candidates[job.key].push(slot.lines[k]);
    }
  }
  for (const key of Object.keys(candidates)) {
    if (candidates[key].length > 0) adds[key] = candidates[key];
  }
  return {
    report,
    candidates,
    apply() {
      for (const [key, lines] of Object.entries(adds)) {
        setPoolAt(ctx, key, settle(report, key, poolAt(ctx, key), lines, floors[key], ctx));
      }
    },
  };
}

/**
 * A pool by its dotted path. `user.creeps`, `user.reactions.0`,
 * `user.asks.bash.1` — the first segment names the lever file and the rest
 * walk into it. A path that is not there reads as empty, which is what makes
 * a pool the run has never written before a top-up from zero.
 */
function poolAt(ctx, key) {
  const parts = key.split('.');
  let node = parts[0] === 'user' ? ctx.user : ctx.agent;
  for (const part of parts.slice(1)) {
    if (node === undefined || node === null) return [];
    node = node[part];
  }
  return Array.isArray(node) ? node : [];
}

function setPoolAt(ctx, key, lines) {
  const parts = key.split('.');
  const file = parts[0];
  let node = file === 'user' ? ctx.user : ctx.agent;
  const walk = parts.slice(1);
  const last = walk.pop();
  for (const part of walk) {
    if (!node[part] || typeof node[part] !== 'object') node[part] = {};
    node = node[part];
  }
  node[last] = lines;
  ctx.touched.add(path.join(PATTERNS, `${file}.json`));
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
// Who wrote a pool
// ---------------------------------------------------------------------------

/**
 * Every candidate key the applied authoring receipts hold, with the model that
 * wrote it and the stamp it was written under.
 *
 * Only a receipt that applied counts: a dry run wrote candidates and touched no
 * lever, so the lines in the pool today did not come from it. The files are
 * walked in stamp order and a later stamp wins, so the key answers with the
 * model that last wrote it.
 *
 * A key is filed twice — bare, and under the slot that wrote it — because the
 * slots do not key alike. `reactions` and `stories` both write `cat-website`,
 * and only one of them wrote `user.reviewsByProduct`.
 *
 * Answers `{ index, unreadable }`. A file in `unreadable` is a receipt that
 * would not parse, and the caller halts on it: the index is then incomplete in
 * a way nothing can measure from the outside.
 */
function writerIndex() {
  const index = new Map();
  const unreadable = [];
  if (!existsSync(AUTHORING)) return { index, unreadable };
  const files = readdirSync(AUTHORING)
    .filter((f) => f.endsWith('.json') && !f.endsWith('-run.json') && !f.endsWith('-edit.json'))
    .sort();
  for (const file of files) {
    let receipt;
    try {
      receipt = readJson(path.join(AUTHORING, file));
    } catch (err) {
      // A receipt nobody can parse is never silent and never shrugged off. It
      // is said here and carried out, because the keys it would have held are
      // unknowable: it may be the only record of a pool's writer, and it may be
      // the newest record of one the older receipts still answer for. Either
      // way the index is incomplete and the gate above refuses on it.
      process.stderr.write(`cannot read the receipt ${file}: ${err.message}\n`);
      unreadable.push(file);
      continue;
    }
    if (!receipt || receipt.applied !== true) continue;
    if (typeof receipt.model !== 'string' || receipt.model === '') continue;
    const candidates = receipt.candidates;
    if (!candidates || typeof candidates !== 'object') continue;
    const stamp = typeof receipt.stamp === 'string' ? receipt.stamp : file;
    const slot = /-([a-z]+)\.json$/.exec(file)?.[1] ?? '';
    for (const key of Object.keys(candidates)) {
      for (const name of [key, `${slot} ${key}`]) {
        const seen = index.get(name);
        if (seen === undefined || seen.stamp <= stamp)
          index.set(name, { spec: receipt.model, stamp });
      }
    }
  }
  return { index, unreadable };
}

/**
 * The model that wrote the lines a job is about to read, as a spec and a family
 * word. The job's own lever keys are looked up, most specific name first, and
 * the most recent hit wins. A job whose keys are in no receipt answers
 * `unknown` rather than guessing.
 */
function writerFor(index, job) {
  let best = null;
  for (const key of job.leverKeys ?? [job.name]) {
    for (const slot of [...(job.writerSlots ?? []), '']) {
      let hit;
      for (const name of writerLookupNames(key)) {
        hit = index.get(slot === '' ? name : `${slot} ${name}`);
        if (hit !== undefined) break;
      }
      if (hit === undefined) continue;
      if (best === null || best.stamp < hit.stamp) best = hit;
      break;
    }
  }
  if (best === null) return { spec: null, family: 'unknown', stamp: null };
  return { spec: best.spec, family: modelFamily(best.spec), stamp: best.stamp };
}

/** The one writer every job agrees on, or `mixed` when they do not. */
function agreedWriter(jobs) {
  const specs = new Set(jobs.map((job) => job.writer?.spec ?? null));
  if (specs.size === 1) {
    const spec = [...specs][0];
    return { spec, family: modelFamily(spec) };
  }
  return {
    spec: 'mixed',
    family: 'mixed',
    families: [...new Set(jobs.map((job) => job.writer?.family ?? 'unknown'))].sort(),
  };
}

// ---------------------------------------------------------------------------
// edit — the editor pass. One call a pool, and it may only drop.
// ---------------------------------------------------------------------------

/**
 * Read a whole pool back with the voice sheet in front of it and name the
 * lines that break the voice, repeat another line's meaning, or make no sense
 * where they are used.
 *
 * The editor never rewrites. The gate keeps or drops and never mends, and an
 * editor that could rewrite would be the one place in the pass where a line
 * nobody wrote in one sitting could still reach the lever. A drop is refused
 * when it would take a pool under the loader's floor, and the receipt says so.
 *
 * The editor is also refused the seat when it is the family that wrote the
 * pool. That was slice three's weak seam and it was left to memory; it is the
 * tool's job now.
 *
 * Two more things it may not take: a pool in `TYPED_POOLS`, which it never
 * reads at all, and a line the character's own voice sheet names, which is kept
 * by definition and counted as such.
 */
async function commandEdit(args, gates) {
  const spec = args.flags.model;
  if (!spec) throw new Fail('bad flag', `edit wants --model\n${USAGE}`);
  const target = parseSpec(spec);
  const opts = readOpts(args, EDIT_TEMPERATURE);
  const apply = args.flags.apply === true;
  mkdirSync(AUTHORING, { recursive: true });
  const ctx = makeCtx(target, opts, gates, { apply });
  // `--pool` narrows the editor to named pools, the same way it narrows `run`;
  // `TYPED_POOLS` takes the pools whose length is a level's clock out of its
  // reach whatever the flags say; `--skip` is this run's own choice and is
  // pinned in the receipt so a pass with a hole in it says where the hole is.
  const skipped = poolFilter(args.flags.skip);
  const skipNamed = args.flags.skip !== undefined;
  const jobs = editJobs(ctx)
    .filter((job) => !TYPED_POOLS.has(job.name))
    .filter((job) => !(skipNamed && skipped(job.name)))
    .filter((job) => opts.pools(job.name));
  if (jobs.length === 0)
    throw new Fail(
      'bad flag',
      `--pool matched no pool
${USAGE}`,
    );

  // Who wrote each pool, and who is about to read it. Both go into the receipt
  // and the halt below is decided from them before a single call is made.
  const editor = { spec: target.spec, family: modelFamily(target.spec) };
  const { index, unreadable } = writerIndex();
  for (const job of jobs) job.writer = writerFor(index, job);
  const sameFamily = args.flags['same-family'] ?? null;
  // A receipt that would not parse is a hole in the index of unknown shape. The
  // pool it was the only record of answers `unknown` and the gate below catches
  // that; the pool it held the *newest* record of still answers, out of an older
  // receipt, and would be cleared against a writer it no longer has. Nothing
  // here can tell the two apart, so an unreadable receipt halts the pass.
  if (unreadable.length > 0 && sameFamily === null) {
    throw new Fail(
      'unreadable receipt',
      `${unreadable.length} receipt${unreadable.length > 1 ? 's' : ''} under ${path.relative(
        ROOT,
        AUTHORING,
      )} would not parse:
  ${unreadable.slice(0, 4).join('\n  ')}${unreadable.length > 4 ? '\n  …' : ''}
the writer of a pool is read from those files, so the gate cannot show that this
editor did not write what it is about to read.
repair or remove them, or pass --same-family "<reason>" to say why not.`,
    );
  }
  const clash = familyClash(
    editor.family,
    jobs.map((job) => ({ name: job.name, family: job.writer.family })),
  );
  if (clash.length > 0 && sameFamily === null) {
    const named = clash
      .slice(0, 4)
      .map((c) => `${c.name} (${c.why})`)
      .join('\n  ');
    throw new Fail(
      'same family',
      `the editor (${editor.spec}, ${editor.family}) cannot be cleared against ${
        clash.length
      } of the ${jobs.length} pools it would read:
  ${named}${clash.length > 4 ? '\n  …' : ''}
a model reading its own writing is a second read, not an independent one, and a
writer the receipts do not say is not a writer this gate can clear.
seat a different family, or pass --same-family "<reason>" to say why not.`,
    );
  }
  if (editor.family === 'unknown') {
    process.stderr.write(
      `${target.spec}: the family tables do not know this model, so the receipt says unknown for the editor\n`,
    );
  }
  const stamp = runStamp();
  const startedAt = Date.now();

  const asked = await mapLimit(jobs, opts.concurrency, async (job) => {
    process.stderr.write(`${target.spec}: edit ${job.name}\n`);
    const system = [PERSONA, voiceBlock(ctx.voices[job.voice]), EDITOR_RULES].join('\n');
    const user = editPrompt(job);
    const hash = promptHash(system, user);
    try {
      const answer = await callModel(target, system, user, opts);
      return { job, hash, answer, error: null };
    } catch (err) {
      return { job, hash, answer: null, error: err.message };
    }
  });

  const receipt = {
    date: today(),
    stamp,
    model: target.spec,
    route: target.route,
    temperature: opts.temperature,
    concurrency: opts.concurrency,
    pool: args.flags.pool ?? null,
    applied: apply,
    voice: ctx.voiceHashes,
    // Both families, at the top and again per pool. `writer` is the one family
    // that wrote every pool this run read; `mixed` when they do not agree, and
    // `unknown` when the receipts under `authoring/` do not say.
    editor,
    writer: agreedWriter(jobs),
    sameFamily,
    // Receipts the writer index could not read. Empty is the ordinary case; a
    // name here means this pass ran with a hole in the index and somebody said
    // why in `sameFamily`.
    unreadableReceipts: unreadable,
    // The pools the editor is never handed, so a receipt reads as the whole
    // pass rather than as a pass with a silent hole in it. `typed` is the
    // standing rule; `skip` is what this one invocation chose to leave alone.
    skipped: { typed: [...TYPED_POOLS], skip: args.flags.skip ?? null },
    calls: 0,
    wallMs: 0,
    tokens: { in: 0, out: 0 },
    pools: {},
  };
  for (const { job, hash, answer, error } of asked) {
    const exemplars = ctx.exemplars[job.voice];
    const entry = {
      promptHash: hash,
      voice: job.voice,
      writer: job.writer,
      editor,
      lines: job.lines.length,
      floor: job.floor,
      ms: answer?.ms ?? 0,
      dropped: [],
      refused: [],
      kept: [],
      error,
    };
    receipt.calls += 1;
    receipt.tokens.in += answer?.tokens?.in ?? 0;
    receipt.tokens.out += answer?.tokens?.out ?? 0;
    receipt.pools[job.name] = entry;
    if (error !== null || answer === null) continue;
    let parsed;
    try {
      parsed = parseCandidates(answer.text);
    } catch (err) {
      entry.error = err.message;
      continue;
    }
    for (const call of readDrops(parsed, job.lines.length)) {
      const row = {
        index: call.index,
        line: job.lines[call.index],
        why: call.why,
        pool: job.poolOf(call.index),
      };
      // The prompt asks for both of the first two; this is where asking stops
      // being a request. A line the sheet names is the reference the pool was
      // written from, and a reference is not a copy of its copies; a twin under
      // another bracket is a different list, not a repeat.
      const verdict = settleDrop({
        isExemplar: exemplars.has(lineKey(exemplarText(row.line))),
        hasTwinElsewhere: job.twinElsewhere(call.index),
        namesOtherBracket: namesOtherBracket(job, call),
        why: call.why,
        atFloor: !job.canDrop(call.index),
      });
      if (verdict === 'exemplar') {
        entry.kept.push({ ...row, kept: 'exemplar' });
      } else if (verdict === 'twin') {
        entry.refused.push({
          ...row,
          whyRefused: 'the line it points at is under another bracket',
        });
      } else if (verdict === 'floor') {
        entry.refused.push({ ...row, whyRefused: 'the pool is at its floor' });
      } else {
        job.drop(call.index);
        entry.dropped.push(row);
      }
    }
  }
  receipt.wallMs = Date.now() - startedAt;
  writeJson(path.join(AUTHORING, `${stamp}-edit.json`), receipt);
  if (apply) {
    for (const job of jobs) job.commit();
    saveLevers(ctx);
    prettier([...ctx.touched]);
  }
  const tally = (what) => Object.values(receipt.pools).reduce((a, p) => a + p[what].length, 0);
  console.log(
    `${receipt.calls} calls; ${tally('dropped')} lines dropped, ${tally(
      'refused',
    )} refused at a floor, ${tally('kept')} kept as the sheet's own; ${
      apply ? 'applied' : 'not applied'
    }; receipt ${path.relative(ROOT, path.join(AUTHORING, `${stamp}-edit.json`))}`,
  );
}

/**
 * Whether every line the editor's clause points at is under a bracket other
 * than the dropped line's own.
 *
 * Telling the model in the prompt that the brackets are separate lists taught
 * it to write `repeats line 1 in the same bracket` and go on pointing at line
 * one of a different bracket. The clause carries the pointer, so the claim is
 * checkable: a repeat that names only lines from elsewhere is the cross-bracket
 * read again, wearing the right words. A clause that names one line in its own
 * bracket and three elsewhere is left alone — the first one may be real.
 */
function namesOtherBracket(job, call) {
  // Only a bracketed job has separate lists inside one call. A tiered pool's
  // three tiers are one climbing list read together on purpose, so a line in
  // the plain tier and a line in the absurd one saying the same thing is a real
  // repeat and `poolOf` naming two different tiers means nothing here.
  if (!job.bracketed) return false;
  const mine = job.poolOf(call.index);
  const cited = citedLines(call.why).filter((n) => n <= job.lines.length);
  if (cited.length === 0) return false;
  return cited.every((n) => job.poolOf(n - 1) !== mine);
}

/**
 * The line as the sheet would carry it. The two record pools show the editor
 * `[topic] the line`, and the bracket is a label the sheet never has, so it
 * comes off before the key is taken.
 */
function exemplarText(line) {
  const m = /^\[[^\]]*\]\s*/.exec(String(line ?? ''));
  return m === null ? String(line ?? '') : String(line).slice(m[0].length);
}

const EDITOR_RULES = [
  'Today you are not writing lines. You are reading lines that were already',
  'written for the character above, and naming the ones that should be dropped.',
  '',
  'Drop a line only when one of these is true:',
  '- it does not sound like that character',
  '- it already appears in the same list, said a different way',
  '- it makes no sense for the place the list says it is used',
  '',
  'The voice sheet above ends with a table of lines that are the voice. Those',
  'lines are kept by definition. Most of them are also in the list you are',
  'reading, because the list was written from them, so when a line below matches',
  'one of them it is the original and the others are the copies. Never name one.',
  '',
  'When the list is a batch of labeled groups, a line is only a repeat of another',
  'line inside its own bracket. Two brackets may say similar things: they are',
  'different lists that a player never sees together.',
  '',
  'Never rewrite a line, never suggest a replacement, never reorder anything. You',
  'name the numbers of the lines to drop and nothing else. Be sparing: a line that',
  'is merely not your favorite stays. Most lists need very few dropped.',
  '',
  'Answer with JSON and nothing else. No prose before it, none after it, no code fence.',
].join('\n');

function editPrompt(job) {
  return [
    job.brief,
    '',
    ...job.lines.map((line, i) => `${i + 1}) ${line}`),
    '',
    'Answer with a JSON array of objects, one for each line to drop, of this shape:',
    '{ "line": <the number of the line>, "why": "<one clause saying which of the three>" }',
    'An empty array means every line holds.',
  ].join('\n');
}

/** The drops the editor named, as zero-based indexes, ignoring anything odd. */
function readDrops(parsed, n) {
  const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.drop) ? parsed.drop : [];
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const raw = typeof row === 'number' ? row : Number(row?.line ?? row?.index ?? NaN);
    if (!Number.isInteger(raw) || raw < 1 || raw > n) continue;
    const index = raw - 1;
    if (seen.has(index)) continue;
    seen.add(index);
    out.push({ index, why: typeof row?.why === 'string' ? row.why : '' });
  }
  return out;
}

/** How many named pools of a record one editor call reads at once. */
const EDIT_MAP_CHUNK = 60;

/**
 * Every pool the editor reads, each as one call. A job carries its lines in one
 * flat list, knows which sub-pool each line belongs to, knows the floor that
 * sub-pool may not go under, and names the lever keys and the slots that wrote
 * them so the receipt can say which family it is reading.
 */
function editJobs(ctx) {
  const jobs = [];

  const flat = (key, voice, floor, brief, writerSlots = ['pools']) => {
    const lines = poolAt(ctx, key);
    if (lines.length === 0) return;
    const drop = new Set();
    jobs.push({
      name: key,
      voice,
      brief,
      lines,
      floor,
      leverKeys: [key],
      writerSlots,
      poolOf: () => key,
      // One pool, one list: there is nowhere else for a twin to be.
      bracketed: false,
      twinElsewhere: () => false,
      canDrop: () => lines.length - drop.size > floor,
      drop: (i) => drop.add(i),
      commit() {
        if (drop.size === 0) return;
        setPoolAt(
          ctx,
          key,
          lines.filter((_, i) => !drop.has(i)),
        );
      },
    });
  };

  const tiered = (name, voice, keyOf, floor, brief) => {
    const tiers = ['0', '1', '2'];
    const lines = [];
    const owner = [];
    for (const tier of tiers) {
      for (const line of poolAt(ctx, keyOf(tier))) {
        lines.push(line);
        owner.push(tier);
      }
    }
    if (lines.length === 0) return;
    const drop = new Set();
    const left = (tier) => owner.filter((t, i) => t === tier && !drop.has(i)).length;
    jobs.push({
      name,
      voice,
      brief,
      lines,
      floor,
      leverKeys: tiers.map(keyOf),
      writerSlots: ['pools'],
      poolOf: (i) => keyOf(owner[i]),
      // The three tiers of one pool are one climbing list and are read as one:
      // a line in the easy tier and a line in the absurd one saying the same
      // thing is a real repeat, so there is no cross-bracket case here.
      bracketed: false,
      twinElsewhere: () => false,
      canDrop: (i) => left(owner[i]) > floor,
      drop: (i) => drop.add(i),
      commit() {
        if (drop.size === 0) return;
        for (const tier of tiers) {
          setPoolAt(
            ctx,
            keyOf(tier),
            lines.filter((_, i) => owner[i] === tier && !drop.has(i)),
          );
        }
      },
    });
  };

  // The ask templates, one call a stack: all three tiers of that stack read
  // together, because a stack's three tiers are one voice climbing.
  for (const stack of Object.keys(STACK_WORDS)) {
    tiered(
      `user.asks.${stack}`,
      'user',
      (tier) => `user.asks.${stack}.${tier}`,
      ASK_POOL_TARGET,
      [
        'These are the requests the user makes when what is being built is',
        `${STACK_WORDS[stack]}. They are templates: the token {product} stands in for`,
        'whatever is being built. They climb from the plain opening request through the',
        'bigger one to the fully absurd one, so the later ones are meant to be larger.',
      ].join('\n'),
    );
  }

  tiered(
    'user.reactions',
    'user',
    (tier) => `user.reactions.${tier}`,
    POOL_TARGETS['user.reactions.0'],
    "The user's reaction when a piece of the product has just shipped, in three moods: the early days, the company growing, and the hype fully arrived.",
  );

  flat('user.creeps', 'user', POOL_TARGETS['user.creeps'], POOL_BRIEFS['user.creeps']);
  flat('user.reviews', 'user', POOL_TARGETS['user.reviews'], POOL_BRIEFS['user.reviews']);
  flat('user.syncs', 'user', POOL_TARGETS['user.syncs'], POOL_BRIEFS['user.syncs']);
  // The two check-in pools are the one place two slots write the same lever:
  // `nags` writes them beside each other, `pools` writes either on its own.
  flat(
    'user.nags',
    'user',
    NAG_TARGET,
    'Short check-ins the user sends while the agent is still typing, fond and impatient and never angry.',
    ['pools', 'nags'],
  );
  flat('agent.replies', 'agent', POOL_TARGETS['agent.replies'], POOL_BRIEFS['agent.replies']);
  flat('agent.hmm', 'agent', POOL_TARGETS['agent.hmm'], POOL_BRIEFS['agent.hmm']);
  flat(
    'agent.compactions',
    'agent',
    POOL_TARGETS['agent.compactions'],
    POOL_BRIEFS['agent.compactions'],
  );
  flat('agent.ships', 'agent', POOL_TARGETS['agent.ships'], POOL_BRIEFS['agent.ships']);
  flat(
    'agent.nagReplies',
    'agent',
    NAG_TARGET,
    "The agent's reply to a check-in: fond, unbothered, still typing, and never promising a time.",
    ['pools', 'nags'],
  );

  // The reactions by topic and the reviews by product are records of small
  // pools, so the floor is one line each and a call reads a batch of them.
  jobs.push(
    ...mapJobs(
      ctx,
      'reactionsByTopic',
      'the word that names what the piece was about',
      EDIT_MAP_CHUNK,
      'reactions',
    ),
  );
  jobs.push(...mapJobs(ctx, 'reviewsByProduct', 'the product that level built', 64, 'reviews'));
  return jobs;
}

function mapJobs(ctx, field, what, size, writerSlot) {
  const map = ctx.user[field] ?? {};
  const names = Object.keys(map).sort();
  const out = [];
  for (const [g, group] of chunk(names, size).entries()) {
    const lines = [];
    const owner = [];
    for (const name of group) {
      for (const line of map[name] ?? []) {
        lines.push(`[${name}] ${line}`);
        owner.push(name);
      }
    }
    if (lines.length === 0) continue;
    const drop = new Set();
    const left = (name) => owner.filter((o, i) => o === name && !drop.has(i)).length;
    // A line that sits under two of this call's brackets, so a repeat claim
    // against it can only be reaching across the two lists.
    const twins = crossBracketTwins(
      lines.map((line, i) => ({ pool: owner[i], line: line.slice(`[${owner[i]}] `.length) })),
    );
    out.push({
      name: `user.${field}.${g + 1}`,
      voice: 'user',
      // The scoping sentence is the fix the first pass on another family
      // earned: without it, one call in nine read sixty brackets as one list
      // and dropped a third of them as repeats of each other.
      brief: [
        "Each line below is one of the user's lines, and the name in brackets in front",
        `of it is ${what}. A line has to make sense for its own bracket. The bracket is`,
        'a label and is not part of the line.',
        '',
        `This is ${group.length} separate lists printed one after another, not one list.`,
        'A line can only repeat another line that carries the same bracket. Two lines',
        'under different brackets are never repeats of one another, however alike they',
        'read: a player meets one bracket at a time and never sees them side by side.',
        '',
        'A bracket holds two or three lines and they are all about the same thing on',
        'purpose: they are different ways of saying what just shipped, and the game picks',
        'one of them. Being about the same thing is what they are for and is not',
        'repeating. A repeat is two lines that say it the same way.',
        '',
        'When you name a line, say which line number it repeats.',
      ].join('\n'),
      lines,
      floor: 1,
      // One call, many separate lists. This is the only job shape where that is
      // true, and it is what the two repeat refusals are for.
      bracketed: true,
      leverKeys: group.map((name) => `user.${field}.${name}`),
      writerSlots: [writerSlot],
      poolOf: (i) => `user.${field}.${owner[i]}`,
      twinElsewhere: (i) => twins.has(lineKey(lines[i].slice(`[${owner[i]}] `.length))),
      canDrop: (i) => left(owner[i]) > 1,
      drop: (i) => drop.add(i),
      commit() {
        if (drop.size === 0) return;
        const next = { ...(ctx.user[field] ?? {}) };
        for (const name of group) {
          const keep = [];
          for (let i = 0; i < lines.length; i += 1) {
            if (owner[i] !== name || drop.has(i)) continue;
            keep.push(lines[i].slice(`[${name}] `.length));
          }
          if (keep.length > 0) next[name] = keep;
        }
        ctx.user[field] = next;
        ctx.touched.add(path.join(PATTERNS, 'user.json'));
      },
    });
  }
  return out;
}

// ---------------------------------------------------------------------------

async function main() {
  const args = readArgv(process.argv.slice(2));
  if (args.flags.help || args.positional.length === 0) {
    console.log(USAGE);
    return;
  }
  const command = args.positional[0];
  if (command !== 'sample' && command !== 'run' && command !== 'edit') {
    throw new Fail('bad command', `unknown command "${command}"\n${USAGE}`);
  }
  const pkg = await loadPackage();
  const gates = {
    line: makeGate(pkg.lineFault, pkg.britishHit),
    ask: makeGate(pkg.lineFault, pkg.britishHit, { maxWords: ASK_WORDS }),
    sync: makeGate(pkg.lineFault, pkg.britishHit, { maxWords: SYNC_WORDS }),
  };
  if (command === 'sample') await commandSample(args, gates);
  else if (command === 'edit') await commandEdit(args, gates);
  else await commandRun(args, gates);
}

main().catch(die);
