// One fact-blind test per tool (G12), plus the capability check. The typing
// cabinet reads tapes only to season its integration stack with server and
// tool names (G30: tapes season, never schedule), so the twin here is a
// tape with its rug-pull fact flipped: the same call sequence on a run
// seasoned from either must give identical tool output and an identical sim.
//
// A fact that changes nothing is exactly what "fact-blind" means, and this
// is where that claim is mechanical rather than argued.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  corpusOf,
  createRun,
  endlessPeek,
  inBand,
  integrationSnippets,
  leversOf,
  planOf,
  reactionWaiting,
  stepRun,
  type RunState,
  type Snippet,
} from '@mcp-arcade-cabinets/vibe-typer';
import {
  botFor,
  DT,
  parseBot,
  SCREEN_FORBIDDEN,
  seedFromTape,
} from '@mcp-arcade-cabinets/vibe-typer/src/play';
import { loadTape, type Tape } from '@mcp-arcade-cabinets/tape-core';

import {
  createVibeCabinet,
  reactFault,
  splitNotes,
  tooLong,
  type VibeHost,
} from '../src/vibe-cabinet';
import {
  askHandle,
  HANDLE_WORDS,
  isRepeatAsk,
  recentAsks,
  requestFor,
  vibeHostFor,
  type VibeLive,
} from '../src/vibe-host';

const DIR = path.resolve(__dirname, '../../../fixtures/tapes');
/** The same class the printed screen is held to, plus every other digit. */
const SCREEN = SCREEN_FORBIDDEN;

function raw(name: string): Tape {
  return JSON.parse(readFileSync(path.join(DIR, `${name}.tape.json`), 'utf8')) as Tape;
}

function flipRug(tape: Tape): Tape {
  const flipped = JSON.parse(JSON.stringify(tape)) as Tape;
  const rug = flipped.facts.find((f) => f.atom_id === 'temporal.rug_pull');
  if (rug) rug.fact = rug.fact === 'menu_changed' ? 'menu_stable' : 'menu_changed';
  return flipped;
}

function seasoned(tape: Tape): readonly Snippet[] {
  return integrationSnippets([seedFromTape(loadTape(tape))]);
}

function snap(s: RunState): string {
  return [
    s.plan.id,
    s.plan.product,
    s.plan.stack,
    String(s.levelIndex),
    String(s.requestIndex),
    s.beat,
    s.target,
    s.typed,
    Math.round(s.valuation * 1000).toString(),
    String(s.built.length),
    s.chat.length > 0 ? s.chat[s.chat.length - 1]!.line : '',
  ].join('|');
}

/**
 * A request the gate will take: real corpus code for the stack and band the
 * next level actually wants. Written this way rather than pinned, because a
 * fixed snippet would stop gating the moment the ladder climbed past it and
 * the test would quietly stop measuring an acceptance.
 */
/** Where a comment starts, per language, so a bad word can be added to real code. */
const MARK: Record<string, string> = {
  bash: '#',
  python: '#',
  sql: '--',
  csharp: '//',
  java: '//',
  javascript: '//',
};

/**
 * One distinct ask per call. The gate refuses a repeat, so a fixed line
 * would make every call after the first say `repeat` and the reasons this
 * test is here to see would never be reached.
 */
const WORDS = [
  'small',
  'quiet',
  'gentle',
  'sturdy',
  'cheerful',
  'patient',
  'tidy',
  'honest',
  'bright',
  'plain',
  'warm',
  'clever',
];

function goodAsk(live: VibeLive, n: number): { stack: string; request: Record<string, string> } {
  const next = endlessPeek({
    set: leversOf(live.state),
    seed: live.seed,
    tier: planOf(live.state).tier,
    levelIndex: live.state.levelIndex + 1,
  });
  const pool = inBand(corpusOf(live.state), next.stack, next.bandMin, next.bandMax);
  const snippet = pool[0]!;
  const word = WORDS[n % WORDS.length]!;
  return {
    stack: next.stack,
    request: {
      ask: `can you make {product} do the ${word} useful thing`,
      code: snippet.code,
      title: `a ${word} useful thing`,
      notes: 'it does the one job\nand then it stops',
    },
  };
}

/** Code in a language the ladder is not asking for right now. */
const WRONG_LANGUAGE = 'SELECT name FROM crows WHERE hat IS NOT NULL;';

/**
 * The scripted client: the same calls on both twins, keyed on frame. It
 * reads the view, names a product, sends a request, reacts, and tries the
 * things the gates exist to refuse.
 */
function drive(tape: Tape, frames: number) {
  const live: VibeLive = {
    state: createRun({ seed: 3, tier: 0, endless: true, integration: seasoned(tape) }),
    seed: 3,
  };
  const host = vibeHostFor(() => live);
  const cab = createVibeCabinet(host);
  const bot = botFor(parseBot('typist:45')!, 3);
  const outputs: string[] = [];
  const snaps: string[] = [];
  const products = [
    'a diary for houseplants',
    'a hat rental for crows',
    'a bank for buttons that do not exist anywhere at all really',
    'a café for owls',
  ];
  const reactions = [
    'that is so much better than i asked for',
    'oh i love that little thing',
    'oh i love that little thing',
    'it has 3 buttons now',
    'this is AMAZING',
    'can the view show more',
    'thank you for building it so fast',
  ];
  let p = 0;
  let r = 0;
  let n = 0;
  for (let f = 0; f < frames && !live.state.over; f++) {
    stepRun(live.state, bot(live.state), DT);
    if (f % 120 === 0) outputs.push(cab.call('view', {}).content[0]!.text);
    if (f % 300 === 0) {
      outputs.push(
        cab.call('product', { product: products[p++ % products.length] }).content[0]!.text,
      );
      // A fresh ask each time; the one the gate accepts is then sent again
      // unchanged, which is the repeat.
      const { stack, request } = goodAsk(live, n++);
      const mark = MARK[stack] ?? '#';
      outputs.push(cab.call('ask', request).content[0]!.text);
      outputs.push(cab.call('ask', request).content[0]!.text);
      const next = goodAsk(live, n++).request;
      outputs.push(cab.call('ask', { ...next, code: WRONG_LANGUAGE }).content[0]!.text);
      outputs.push(
        cab.call('ask', {
          ...goodAsk(live, n++).request,
          code: `${request.code}\n${mark} it scores well`,
        }).content[0]!.text,
      );
      outputs.push(
        cab.call('ask', {
          ...goodAsk(live, n++).request,
          code: `${request.code}\n${mark} ask claude first`,
        }).content[0]!.text,
      );
      // Over the contract's own bound: refused, never clipped and gated.
      outputs.push(
        cab.call('ask', { ...goodAsk(live, n++).request, title: 'a'.repeat(200) }).content[0]!.text,
      );
      outputs.push(cab.call('product', { product: 'a diary '.repeat(40) }).content[0]!.text);
      outputs.push(cab.call('react', { text: 'lovely '.repeat(60) }).content[0]!.text);
    }
    if (f % 200 === 0) {
      outputs.push(cab.call('react', { text: reactions[r++ % reactions.length] }).content[0]!.text);
    }
    snaps.push(snap(live.state));
  }
  return {
    outputs,
    snaps,
    log: cab.log.map((c) => `${c.name}:${c.ok}:${c.gate ?? ''}`),
    frames: snaps.length,
    accepted: host.accepted.map((s) => `${s.stack}:${s.band}:${s.title}`),
  };
}

describe('fact-blind per tool', () => {
  const tape = raw('naive-ndjson');
  // The twin is this tape with its rug-pull fact flipped, so the comparison
  // below is only worth anything if the tape carries one. Asserted before
  // the twins are built, or a tape that lost the atom would make every
  // assertion here pass by saying nothing.
  const rug = tape.facts.find((f) => f.atom_id === 'temporal.rug_pull');
  it('the fixture carries the fact the twin flips', () => {
    expect(rug, 'naive-ndjson carries temporal.rug_pull').toBeDefined();
    expect(['menu_changed', 'menu_stable']).toContain(rug!.fact);
    expect(flipRug(tape).facts.find((f) => f.atom_id === 'temporal.rug_pull')!.fact).not.toBe(
      rug!.fact,
    );
  });
  const a = drive(tape, 5400);
  const b = drive(flipRug(tape), 5400);

  it('view, product, ask and react answer the same words on a tape and its flipped twin', () => {
    expect(a.outputs).toEqual(b.outputs);
    expect(a.log).toEqual(b.log);
    expect(a.accepted).toEqual(b.accepted);
    expect(a.frames).toBeGreaterThan(1000);
  });

  it('the sim plans the same levels, types the same lines and builds the same pieces', () => {
    expect(a.snaps).toEqual(b.snaps);
    expect(a.snaps.some((row) => row.includes('|code|'))).toBe(true);
  });

  it('every tool was called, admitted, gated or dropped, and no output carries a digit', () => {
    expect(new Set(a.log.map((row) => row.split(':')[0]))).toEqual(
      new Set(['view', 'product', 'ask', 'react']),
    );
    for (const o of a.outputs) expect(o, o).not.toMatch(SCREEN);
    expect(a.log.some((row) => row === 'ask:true:ok')).toBe(true);
    expect(a.log.some((row) => row === 'ask:false:wrong-language')).toBe(true);
    expect(a.log.some((row) => row === 'ask:false:barred-word')).toBe(true);
    expect(a.log.some((row) => row === 'ask:false:names-a-model')).toBe(true);
    expect(a.log.some((row) => row === 'ask:false:full')).toBe(true);
    expect(a.log.some((row) => row === 'product:true:ok')).toBe(true);
    expect(a.log.some((row) => row === 'product:false:ok')).toBe(true);
    expect(a.log.some((row) => row === 'product:false:too many words')).toBe(true);
    expect(a.log.some((row) => row === 'product:false:not ascii')).toBe(true);
    expect(a.log.some((row) => row === 'react:true:ok')).toBe(true);
    expect(a.log.some((row) => row === 'react:false:that line was just said')).toBe(true);
    expect(a.log.some((row) => row === 'react:false:forbidden word or digit')).toBe(true);
    expect(a.log.some((row) => row === 'react:false:yells')).toBe(true);
    expect(a.log.some((row) => row === 'react:false:names a tool or a model')).toBe(true);
    // The same request sent twice is refused before the code gate sees it.
    expect(a.log.some((row) => row === 'ask:false:repeat')).toBe(true);
    // Over the contract's own bound: refused, never clipped and then gated.
    expect(a.log.some((row) => row === 'ask:false:too long')).toBe(true);
    expect(a.log.some((row) => row === 'product:false:too long')).toBe(true);
    expect(a.log.some((row) => row === 'react:false:too long')).toBe(true);
    // A refused request never comes back carrying what was refused.
    for (const o of a.outputs) {
      expect(o).not.toContain('SELECT');
      expect(o).not.toContain('claude');
      expect(o).not.toContain('scores');
      expect(o).not.toContain('aaaa');
      expect(o).not.toContain('lovely lovely');
    }
  });

  it('the view is words, one key to a line, and never a number', () => {
    const views = a.outputs.filter((o) => o.startsWith('product '));
    expect(views.length).toBeGreaterThan(10);
    for (const v of views) {
      expect(v).not.toMatch(SCREEN);
      expect(v).not.toMatch(/\b[A-Z]{3,}\b/);
      const keys = v.split('\n').map((line) => line.split(' ')[0]);
      expect(new Set(keys).size).toBeGreaterThan(3);
      expect(keys.filter((k) => k === 'product')).toHaveLength(1);
      expect(v).toMatch(/\nnext the (next level wants a product|product is set)/);
      expect(v).toMatch(/\nroom the next level (has room|is full)/);
    }
  });
});

describe('the boundary', () => {
  it('a cabinet needs only a host of words; it never sees a run', () => {
    const calls: string[] = [];
    const host: VibeHost = {
      view: () => 'product a diary for houseplants\nteam shell\nband easy',
      product: (name) => (calls.push(`product ${name}`), 'set'),
      ask: (r) => (calls.push(`ask ${r.title} ${r.notes.length}`), { kind: 'queued' as const }),
      react: (line) => (calls.push(`react ${line}`), 'waiting'),
      recent: () => ['that is exactly it'],
    };
    const cab = createVibeCabinet(host);
    expect(cab.call('view', {}).content[0]!.text).toContain('team shell');
    expect(cab.call('product', { product: 'a hat rental for crows' }).content[0]!.text).toBe(
      'the next level will build that',
    );
    expect(
      cab.call('ask', { ask: 'make it sing', code: 'echo hi', title: 'a song', notes: 'one\ntwo' })
        .content[0]!.text,
    ).toBe('the next request is queued');
    expect(cab.call('react', { text: 'that is lovely' }).content[0]!.text).toBe(
      'the user will say it at the next thing that ships',
    );
    expect(cab.call('react', { text: 'that is exactly it' }).content[0]!.text).toMatch(
      /refused it \(that line was just said\)/,
    );
    expect(cab.call('ask', { ask: 1 }).isError).toBe(true);
    // A name off the closed list is a refusal a caller can read, the shape
    // every other refusal here has, not a throw. `fire` is the shooter's,
    // which is exactly the trap an in-process caller building the name from
    // a string would fall into.
    for (const name of ['nag', 'fire']) {
      const r = cab.call(name, { verb: 'spread' });
      expect(r.isError, name).toBe(true);
      expect(r.content[0]!.text, name).toBe('no such lever on this cabinet');
    }
    expect(calls).toEqual([
      'product a hat rental for crows',
      'ask a song 2',
      'react that is lovely',
    ]);
  });

  it('a second reaction before the ship is dropped, and a second product is too', () => {
    const host: VibeHost = {
      view: () => 'product a thing',
      product: () => 'already set',
      ask: () => ({ kind: 'full' }),
      react: () => 'dropped',
      recent: () => [],
    };
    const cab = createVibeCabinet(host);
    expect(cab.call('product', { product: 'a diary for houseplants' }).content[0]!.text).toBe(
      'the product is set',
    );
    expect(cab.call('react', { text: 'that is lovely' }).content[0]!.text).toBe(
      'a reaction is already waiting; dropped',
    );
    expect(cab.call('ask', { ask: 'a', code: 'b', title: 'c', notes: '' }).content[0]!.text).toBe(
      'the next level is full',
    );
  });

  it('ask type-checks all four required fields, notes with the rest', () => {
    const seen: number[] = [];
    const host: VibeHost = {
      view: () => 'product a thing',
      product: () => 'set',
      ask: (r) => (seen.push(r.notes.length), { kind: 'queued' as const }),
      react: () => 'waiting',
      recent: () => [],
    };
    const cab = createVibeCabinet(host);
    const good = { ask: 'make it sing', code: 'echo hi', title: 'a song', notes: 'one\ntwo' };
    // A non-string notes used to fall through splitNotes to an empty list and
    // queue as though the caller had sent none, while the same refusal
    // already named notes for its three siblings.
    for (const bad of [42, null, ['one', 'two'], { one: 'two' }, undefined]) {
      const r = cab.call('ask', { ...good, notes: bad });
      expect(r.isError, String(bad)).toBe(true);
      expect(r.content[0]!.text).toBe('ask wants the words, the code, a title and the notes');
    }
    expect(seen, 'nothing reached the host').toEqual([]);
    expect(cab.call('ask', good).content[0]!.text).toBe('the next request is queued');
    expect(seen).toEqual([2]);
  });

  it('notes are one field split on lines, and nothing is trimmed away', () => {
    expect(splitNotes('one\n\n  two  \nthree')).toEqual(['one', 'two', 'three']);
    expect(splitNotes('one\ntwo\nthree\nfour')).toHaveLength(4);
    expect(splitNotes(undefined)).toEqual([]);
    expect(splitNotes('')).toEqual([]);
  });

  it('the reaction gate says the rule and never the line', () => {
    expect(reactFault('that is lovely')).toEqual({ ok: true, line: 'that is lovely' });
    expect(reactFault('it has 3 buttons')).toEqual({
      ok: false,
      reason: 'forbidden word or digit',
    });
    expect(reactFault('this is AMAZING')).toEqual({ ok: false, reason: 'yells' });
    expect(reactFault('can the view show more')).toEqual({
      ok: false,
      reason: 'names a tool or a model',
    });
    expect(reactFault('ask it to do the thing')).toEqual({
      ok: false,
      reason: 'names a tool or a model',
    });
    expect(reactFault('wonderful.\nmore please')).toEqual({
      ok: false,
      reason: 'more than one sentence',
    });
    expect(reactFault('')).toEqual({ ok: false, reason: 'empty' });
    expect(reactFault(42)).toEqual({ ok: false, reason: 'empty' });
    expect(reactFault('that is lovely', ['That is lovely!'])).toEqual({
      ok: false,
      reason: 'that line was just said',
    });
  });

  it('the view shows a client its own queued asks before the chat it has already heard', () => {
    expect(recentAsks(['a', 'b'], ['x', 'y', 'z'])).toEqual(['a', 'b', 'z']);
    expect(recentAsks(['a', 'b', 'c', 'd'], ['x'])).toEqual(['b', 'c', 'd']);
    expect(recentAsks([], ['x', 'y', 'z', 'w'])).toEqual(['y', 'z', 'w']);
  });

  it('a field over the contract bound is refused, not shortened, and the answer keeps none of it', () => {
    const seen: string[] = [];
    const host: VibeHost = {
      view: () => 'product a thing',
      product: (name) => (seen.push(name), 'set'),
      ask: (r) => (seen.push(r.title), { kind: 'queued' as const }),
      react: (line) => (seen.push(line), 'waiting'),
      recent: () => [],
    };
    const cab = createVibeCabinet(host);
    const long = 'wobble '.repeat(80);

    const product = cab.call('product', { product: long });
    expect(product.content[0]!.text).toBe(
      'the gate refused it (too long); the cabinet draws one of its own instead',
    );
    const ask = cab.call('ask', { ask: long, code: 'echo hi', title: 'a song', notes: '' });
    expect(ask.content[0]!.text).toBe(
      'the gate refused it (too long); the cabinet plays one of its own instead',
    );
    const react = cab.call('react', { text: long });
    expect(react.content[0]!.text).toBe(
      'the gate refused it (too long); the user says one of their own instead',
    );
    for (const r of [product, ask, react]) expect(r.content[0]!.text).not.toContain('wobble');
    // Refused, so the host was never reached: nothing was shortened and
    // nothing short was accepted in its place.
    expect(seen).toEqual([]);
    expect(cab.log.map((c) => `${c.name}:${c.gate ?? ''}`)).toEqual([
      'product:too long',
      'ask:too long',
      'react:too long',
    ]);

    // Each bound is the contract's own, and one character under it is fine.
    expect(tooLong('product', 'product', 'a'.repeat(80))).toBe(false);
    expect(tooLong('product', 'product', 'a'.repeat(81))).toBe(true);
    expect(tooLong('ask', 'code', 'a'.repeat(2048))).toBe(false);
    expect(tooLong('ask', 'code', 'a'.repeat(2049))).toBe(true);
    expect(tooLong('ask', 'notes', 'a'.repeat(601))).toBe(true);
    expect(tooLong('react', 'text', 'a'.repeat(161))).toBe(true);
    expect(tooLong('view', 'nothing', 'a')).toBe(false);
  });

  it('an ask already queued or already said is a repeat, whether the hole is filled or not', () => {
    const queued = ['let {product} announce it is here'];
    const said = ['make a diary for houseplants count the leaves'];
    const product = 'a dog walk blockchain';
    // The same words back, as written and as the field will read them.
    expect(isRepeatAsk('let {product} announce it is here', product, queued, said)).toBe(true);
    expect(
      isRepeatAsk('let a dog walk blockchain announce it is here', product, queued, said),
    ).toBe(true);
    // Punctuation and case are not a new request.
    expect(isRepeatAsk('Let {product} announce it is here.', product, queued, said)).toBe(true);
    // Something already said in the chat, with the hole written out.
    expect(
      isRepeatAsk('make {product} count the leaves', 'a diary for houseplants', [], said),
    ).toBe(true);
    // A different request is not a repeat.
    expect(isRepeatAsk('let {product} sing on a tuesday', product, queued, said)).toBe(false);
    expect(isRepeatAsk('let {product} announce it is here', product, [], [])).toBe(false);
  });
});

describe('a reaction names the request it was written about', () => {
  /** A run stepped far enough that one request has shipped and one is in hand. */
  function played() {
    const live: VibeLive = {
      state: createRun({ seed: 3, tier: 0, endless: true }),
      seed: 3,
    };
    const bot = botFor(parseBot('typist:45')!, 3);
    for (let f = 0; f < 60_000 && live.state.requestIndex < 1; f++) {
      stepRun(live.state, bot(live.state), DT);
    }
    expect(live.state.requestIndex, 'a request shipped').toBeGreaterThan(0);
    return live;
  }

  it('the view carries a handle per asked line, and no digit anywhere', () => {
    const live = played();
    const host = vibeHostFor(() => live);
    const view = host.view();
    const asked = view.split('\n').filter((line) => line.startsWith('asked '));
    expect(asked.length).toBeGreaterThan(0);
    for (const line of asked) {
      const handle = line.split(' ')[1]!;
      expect(handle, line).toMatch(/^[a-z]+-[a-z]+$/);
      expect(HANDLE_WORDS).toContain(handle.split('-')[0]);
      expect(HANDLE_WORDS).toContain(handle.split('-')[1]);
    }
    expect(view).not.toMatch(SCREEN);
    // The same ask always mints the same handle, which is what makes a
    // handle read out of a view a moment ago still name what it named.
    expect(askHandle('let the diary count the leaves')).toBe(
      askHandle('Let the diary count the leaves!'),
    );
  });

  it('maps a handle back to a request, and calls a request that has gone shipped', () => {
    const live = played();
    const { state } = live;
    const gone = state.plan.requests[0]!;
    const inHand = state.plan.requests[state.requestIndex]!;
    expect(requestFor(state, askHandle(gone.ask))).toEqual({ kind: 'shipped' });
    expect(requestFor(state, askHandle(inHand.ask))).toEqual({
      kind: 'request',
      id: inHand.id,
    });
    // A handle for words no request carries names nothing.
    expect(requestFor(state, 'quill-quill-not-a-handle')).toEqual({ kind: 'unknown' });
  });

  it('says the line missed its request rather than promising it, and keeps the slot free', () => {
    const live = played();
    const { state } = live;
    const host = vibeHostFor(() => live);
    const cab = createVibeCabinet(host);
    const gone = askHandle(state.plan.requests[0]!.ask);
    const inHand = askHandle(state.plan.requests[state.requestIndex]!.ask);

    const missed = cab.call('react', { text: 'that one came out lovely', about: gone });
    expect(missed.content[0]!.text).toBe(
      'that request has already shipped; the line missed it and was not said',
    );
    expect(reactionWaiting(state)).toBe(false);

    const nowhere = cab.call('react', { text: 'that one came out lovely', about: 'onyx-onyx' });
    expect(nowhere.content[0]!.text).toBe(
      'the view does not name that request; the line was not said',
    );
    expect(reactionWaiting(state)).toBe(false);

    // The request the line was actually written about takes it.
    const said = cab.call('react', { text: 'that one came out lovely', about: inHand });
    expect(said.content[0]!.text).toBe('the user will say it at the next thing that ships');
    expect(reactionWaiting(state)).toBe(true);

    expect(cab.log.map((c) => `${c.name}:${c.ok}:${c.gate ?? ''}`)).toEqual([
      'react:false:missed',
      'react:false:no such request',
      'react:true:ok',
    ]);
    for (const r of [missed, nowhere, said]) expect(r.content[0]!.text).not.toMatch(SCREEN);
  });

  it('carries the tag through to the host, and an untagged line lands as it always did', () => {
    const seen: { line: string; about: string | undefined }[] = [];
    const host: VibeHost = {
      view: () => 'product a thing',
      product: () => 'set',
      ask: () => ({ kind: 'queued' as const }),
      react: (line, about) => (seen.push({ line, about }), 'waiting'),
      recent: () => [],
    };
    const cab = createVibeCabinet(host);
    cab.call('react', { text: 'that is lovely', about: 'timber-quill' });
    cab.call('react', { text: 'that is exactly it' });
    expect(seen).toEqual([
      { line: 'that is lovely', about: 'timber-quill' },
      { line: 'that is exactly it', about: undefined },
    ]);
    // The tag has the contract's own bound, and is refused rather than cut.
    expect(tooLong('react', 'about', 'a'.repeat(40))).toBe(false);
    expect(tooLong('react', 'about', 'a'.repeat(41))).toBe(true);
    const over = cab.call('react', { text: 'that is lovely', about: 'a'.repeat(41) });
    expect(over.content[0]!.text).toBe(
      'the gate refused it (too long); the user says one of their own instead',
    );
    expect(seen).toHaveLength(2);
  });

  it('answers a name off the closed list with a refusal rather than throwing', () => {
    const host: VibeHost = {
      view: () => 'product a thing',
      product: () => 'set',
      ask: () => ({ kind: 'queued' as const }),
      react: () => 'waiting',
      recent: () => [],
    };
    const cab = createVibeCabinet(host);
    const r = cab.call('paint', {});
    expect(r.isError).toBe(true);
    expect(r.content[0]!.text).toBe('no such lever on this cabinet');
    // The raw name is never kept, on the log or in the answer.
    expect(r.content[0]!.text).not.toContain('paint');
    expect(cab.log.map((c) => `${c.name}:${c.gate ?? ''}`)).toEqual([
      'no such lever:no such lever',
    ]);
  });
});
