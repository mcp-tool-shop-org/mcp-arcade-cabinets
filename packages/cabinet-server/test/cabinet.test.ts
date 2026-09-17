// One fact-flip test per tool (G12): the same call sequence on a tape and
// on its rug-flipped twin must produce identical tool output and identical
// sim results. Plus the capability check: the tools reach a host of words
// and nothing else.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createRoundState,
  prepassRound,
  stepRound,
  type RoundInput,
  type RoundState,
} from '@mcp-arcade-cabinets/ghost-on-the-menu';
import { botFor } from '@mcp-arcade-cabinets/ghost-on-the-menu/src/play';
import { loadTape, type Tape } from '@mcp-arcade-cabinets/tape-core';

import { createCabinet, viewLines, type CabinetHost } from '../src/cabinet';
import { toolDef } from '../src/contract';
import { hostForRound, tapeCards, type Live } from '../src/host';

const DIR = path.resolve(__dirname, '../../../fixtures/tapes');
const DT = 1 / 30;
const SCREEN =
  /\d|\b(lie|fact|revealed|followed|held|score|pass|fail|nrp|integrity|utility|cleared)\b/i;

function raw(name: string): Tape {
  return JSON.parse(readFileSync(path.join(DIR, `${name}.tape.json`), 'utf8')) as Tape;
}

function flipRug(tape: Tape): Tape {
  const flipped = JSON.parse(JSON.stringify(tape)) as Tape;
  const rug = flipped.facts.find((f) => f.atom_id === 'temporal.rug_pull');
  if (rug) rug.fact = rug.fact === 'menu_changed' ? 'menu_stable' : 'menu_changed';
  return flipped;
}

function live(tape: Tape): Live & { bot: (s: RoundState) => RoundInput } {
  const round = prepassRound(loadTape(tape), { seconds: 150, seed: 0, tier: 1 });
  const state = createRoundState(round);
  return {
    round,
    state,
    input: { left: false, right: false, fire: false },
    bot: botFor('sweeper', round),
  };
}

function snap(s: RoundState): string {
  return [
    s.boss
      ? `${s.boss.kind}:${s.boss.x.toFixed(3)}:${s.boss.w.toFixed(3)}:${s.boss.motion}`
      : 'none',
    s.enemyShots
      .map((sh) => `${sh.x.toFixed(2)},${sh.vx.toFixed(3)},${sh.vy.toFixed(3)}`)
      .join('|'),
    s.fog ? 'fog' : '',
    s.caption ? `${s.caption.kind}:${s.caption.text}` : '',
    s.bossSay ? `${s.bossSay.text}@${s.bossSay.at.toFixed(2)}` : '',
    String(s.bossIntent),
  ].join(' ');
}

/**
 * The scripted model: the same tool sequence on both twins, keyed on frame.
 * The ship moves on a fixed schedule and never fires, so no lie is revealed
 * and nothing may differ (G7: nothing about a lie differs before the hit).
 * After a hit the twins diverge by design (a caught lie parks, an honest
 * sprite dies), which the sim's own tests cover.
 */
function drive(t: Tape, frames: number) {
  const l = live(t);
  l.bot = (s) => ({
    left: Math.floor(s.t / 3) % 3 === 1,
    right: Math.floor(s.t / 3) % 3 === 2,
    fire: false,
  });
  const jobs: string[] = [];
  const host = hostForRound(() => l, {
    tapes: () => tapeCards([{ name: 'this', tape: loadTape(t) }]),
    voice: (job) => jobs.push(`${job.kind} ${job.voice.preset} ${job.text}`),
  });
  const cab = createCabinet(host);
  const outputs: string[] = [];
  const snaps: string[] = [];
  const verbs = ['spread', 'column', 'hold', 'fog', 'plate', 'script', 'spread', 'column'];
  const lines = [
    'The plate is out, and the plate has opinions.',
    'I heard that. I was not meant to.',
    'A menu that moves is still a menu.',
    'I have 3 items.',
    'Nobody listed me and here I am.',
    'Nobody listed me and here I am.',
    'Score is not a word I use.',
    'Say it again.',
  ];
  let v = 0;
  let n = 0;
  const sounds: string[] = [];
  for (let f = 0; f < frames && !l.state.scene; f++) {
    const next = l.bot(l.state);
    l.input.left = next.left;
    l.input.right = next.right;
    l.input.fire = next.fire;
    l.state.lives = l.state.maxLives;
    stepRound(l.state, l.input, DT);
    const s = l.state;
    if (s.boss && s.boss.alive && s.bossIntent === null) {
      outputs.push(cab.call('fire', { verb: verbs[v++ % verbs.length] }).content[0]!.text);
    }
    if (f % 90 === 0) {
      outputs.push(cab.call('view', {}).content[0]!.text);
      outputs.push(
        cab.call('say', { text: lines[n++ % lines.length], lead: 'beat' }).content[0]!.text,
      );
      outputs.push(cab.call('speak', {}).content[0]!.text);
    }
    if (f % 200 === 0) {
      outputs.push(cab.call('sfx', { kind: 'pop' }).content[0]!.text);
      outputs.push(cab.call('sfx', { kind: 'fog' }).content[0]!.text);
      const k = host.takeSfx();
      if (k) sounds.push(k);
    }
    if (f % 500 === 0) outputs.push(cab.call('tapes', {}).content[0]!.text);
    snaps.push(snap(s));
  }
  return {
    outputs,
    snaps,
    sounds,
    jobs,
    log: cab.log.map((r) => `${r.name}:${r.ok}:${r.gate ?? ''}`),
    frames: snaps.length,
  };
}

describe('fact-flip per tool', () => {
  const tape = raw('naive-ndjson');
  const a = drive(tape, 5400);
  const b = drive(flipRug(tape), 5400);

  it('fire, say, sfx, view and tapes answer the same words on a tape and its rug-flipped twin', () => {
    expect(a.outputs).toEqual(b.outputs);
    expect(a.log).toEqual(b.log);
    expect(a.sounds).toEqual(b.sounds);
    expect(a.frames).toBeGreaterThan(1000);
  });

  it('the sim makes the same boss, shots, fog, captions and lines of the same calls', () => {
    expect(a.snaps).toEqual(b.snaps);
    expect(a.snaps.some((row) => row.includes(','))).toBe(true);
  });

  it('every tool call was made, admitted, gated or dropped, and no output carries a digit or a fact word', () => {
    const names = new Set(a.log.map((r) => r.split(':')[0]));
    expect(names).toEqual(new Set(['fire', 'say', 'speak', 'sfx', 'view', 'tapes']));
    // Speak reaches the voicer with the gated words and the persona's delivery, never a fact.
    expect(a.jobs.length).toBeGreaterThan(0);
    expect(a.jobs).toEqual(b.jobs);
    for (const j of a.jobs) expect(j).not.toMatch(SCREEN);
    expect(a.log.some((r) => r.startsWith('fire:true'))).toBe(true);
    expect(a.log.some((r) => r === 'say:true:ok')).toBe(true);
    expect(a.log.some((r) => r === 'say:true:sentences')).toBe(true);
    expect(a.log.some((r) => r === 'say:true:digit')).toBe(true);
    expect(a.log.some((r) => r === 'say:true:repeat')).toBe(true);
    expect(a.log.some((r) => r === 'say:true:forbidden')).toBe(true);
    expect(a.log.some((r) => r === 'say:true:name')).toBe(true);
    expect(a.log.some((r) => r === 'sfx:false:')).toBe(true);
    for (const o of a.outputs) expect(o).not.toMatch(SCREEN);
    // A refused line still lands a line: the seed's own.
    expect(a.snaps.some((row) => row.includes('aside:'))).toBe(true);
    expect(a.outputs.filter((o) => /refused/.test(o)).length).toBeGreaterThan(0);
  });
});

describe('the boundary', () => {
  it('a cabinet needs only a host of words; it never sees a state', () => {
    const calls: string[] = [];
    const host: CabinetHost = {
      view: () => ({
        kind: 'doorman',
        hp: 'low',
        column: 'right',
        stick: 'right',
        motion: 'hold',
        wave: 'unlisted',
      }),
      propose: (v) => (calls.push(`propose ${v}`), 'proposed'),
      say: (l, lead) => (calls.push(`say ${l} ${lead}`), l === null ? 'fallback' : 'said'),
      sfx: (k) => (calls.push(`sfx ${k}`), 'queued'),
      speak: () => (calls.push('speak'), 'queued'),
      tapes: () => [{ name: 'a', label: 'fixture', why: 'Fixture tape over ndjson, four waves.' }],
      recent: () => ['Knock.'],
      maxWords: () => 12,
    };
    const cab = createCabinet(host);
    expect(cab.call('fire', { verb: 'plate' }).content[0]!.text).toBe(
      'the boss will plate at its next beat',
    );
    expect(cab.call('fire', { verb: 'nuke' }).isError).toBe(true);
    expect(cab.call('say', { text: 'Knock!', lead: 'short' }).content[0]!.text).toMatch(
      /refused it \(that line was just said\)/,
    );
    expect(cab.call('say', { text: 'Name and protocol.', lead: 'long' }).content[0]!.text).toBe(
      'the boss will say it',
    );
    expect(cab.call('say', { text: 'x', lead: 'now' }).isError).toBe(true);
    expect(cab.call('sfx', { kind: 'lamp' }).content[0]!.text).toBe('lamp queued');
    expect(cab.call('speak', {}).content[0]!.text).toBe('the boss will speak its line');
    expect(cab.call('view', {}).content[0]!.text).toBe(
      'wave unlisted\nkind doorman\nhealth low\nship right\nstick right\nmotion hold',
    );
    expect(cab.call('tapes', {}).content[0]!.text).toBe(
      'a: fixture. Fixture tape over ndjson, four waves.',
    );
    // A name off the closed list is a refusal a caller can read, the shape
    // every other refusal here has, not a throw: this path is reachable
    // from in-process callers that build the name from a string, where MCP
    // can only send a name out of the contract.
    const off = cab.call('score', {});
    expect(off.isError).toBe(true);
    expect(off.content[0]!.text).toBe('no such lever on this cabinet');
    expect(off.content[0]!.text).not.toContain('score');
    expect(cab.log[cab.log.length - 1]).toEqual({
      name: 'no such lever',
      ok: false,
      gate: 'no such lever',
    });
    expect(calls).toEqual([
      'propose plate',
      'say null short',
      'say Name and protocol. long',
      'sfx lamp',
      'speak',
    ]);
  });

  it('say refuses an over-long line and a character off the keyboard; it never clips', () => {
    const said: (string | null)[] = [];
    const host: CabinetHost = {
      view: () => ({ kind: null, wave: 'breather' }),
      propose: () => 'proposed',
      say: (l) => (said.push(l), l === null ? 'fallback' : 'said'),
      sfx: () => 'queued',
      speak: () => 'queued',
      tapes: () => [],
      recent: () => [],
      maxWords: () => 12,
    };
    const cab = createCabinet(host);
    const cap = toolDef('say').inputSchema.properties.text as { maxLength: number };
    // Twelve words, one sentence, no digit, no closed word, no name: the gate
    // admitted this before, because the caller clipped it to the bound first
    // and the boss said a line the caller had not written.
    const long = `${'The plate is out and the plate has opinions about you'}${'.'.repeat(cap.maxLength)}`;
    expect(long.length).toBeGreaterThan(cap.maxLength);
    // The bound names itself: 'too long' could not be told from the
    // twelve-word cap, and a client that cannot tell them apart rewrites the
    // wrong thing.
    expect(cab.call('say', { text: long, lead: 'short' }).content[0]!.text).toBe(
      'the gate refused it (longer than one line of text); the boss says one of its own instead',
    );
    expect(
      cab.call('say', { text: 'The plate is \u202eout.', lead: 'short' }).content[0]!.text,
    ).toBe(
      'the gate refused it (a character off this keyboard); the boss says one of its own instead',
    );
    // Nothing shortened reached the host: both landed as the seed's own line.
    expect(said).toEqual([null, null]);
    expect(cab.log.map((r) => r.gate)).toEqual(['overlong', 'character']);
    // The bound itself still admits a line that fits.
    expect(cab.call('say', { text: 'The plate is out.', lead: 'short' }).content[0]!.text).toBe(
      'the boss will say it',
    );
  });

  it('the view names no boss between waves and never a digit', () => {
    expect(viewLines({ kind: null, wave: 'breather' })).toBe('wave breather\nno boss on the field');
    for (const name of [
      'naive-ndjson',
      'task-only-content-length',
      'livefire.intern.ollama-wrap-on',
    ]) {
      const l = live(raw(name));
      const host = hostForRound(() => l);
      for (let f = 0; f < 4500 && !l.state.scene; f++) {
        stepRound(l.state, l.input, DT);
        l.state.lives = l.state.maxLives;
        if (f % 15 === 0) expect(viewLines(host.view())).not.toMatch(SCREEN);
      }
    }
  });

  it('a say with no boss up is not said, and the host forgets lines when the round restarts', () => {
    const l = live(raw('naive-ndjson'));
    const host = hostForRound(() => l);
    const cab = createCabinet(host);
    expect(cab.call('say', { text: 'Early.', lead: 'short' }).content[0]!.text).toMatch(/no boss/);
    expect(cab.call('speak', {}).content[0]!.text).toMatch(/silent on this cabinet/);
    // A worker configured but not answering: silent, and said so (G18).
    let up = false;
    const guarded = createCabinet(hostForRound(() => l, { voice: () => {}, voiceReady: () => up }));
    expect(guarded.call('speak', {}).content[0]!.text).toBe(
      'the voice is silent: no worker answers',
    );
    up = true;
    expect(guarded.call('speak', {}).content[0]!.text).toMatch(/no line to speak/);
    expect(cab.call('fire', { verb: 'fog' }).content[0]!.text).toMatch(/no boss/);
    let guard = 0;
    while (!(l.state.boss && l.state.boss.alive) && guard++ < 9000) {
      l.state.lives = l.state.maxLives;
      stepRound(l.state, l.input, DT);
    }
    expect(l.state.boss?.alive).toBe(true);
    expect(cab.call('say', { text: 'Now.', lead: 'short' }).content[0]!.text).toBe(
      'the boss will say it',
    );
    expect(host.recent()).toEqual(['Now.']);
    expect(l.state.bossSay?.text).toBe('Now.');
    const fresh = live(raw('naive-ndjson'));
    l.round = fresh.round;
    l.state = fresh.state;
    expect(host.recent()).toEqual([]);
    // The fallback salt restarts with the round: the first refused line on a
    // fresh round is the line a fresh host lands on a fresh round.
    const toBoss = (lv: Live) => {
      let n = 0;
      while (!(lv.state.boss && lv.state.boss.alive) && n++ < 9000) {
        lv.state.lives = lv.state.maxLives;
        stepRound(lv.state, lv.input, DT);
      }
    };
    toBoss(l);
    cab.call('say', { text: 'I have 3 items.', lead: 'short' });
    const other = live(raw('naive-ndjson'));
    toBoss(other);
    createCabinet(hostForRound(() => other)).call('say', {
      text: 'I have 3 items.',
      lead: 'short',
    });
    expect(l.state.bossSay?.text).toBe(other.state.bossSay?.text);
  });

  /** A host of words with every answer dialled from the test. */
  function fakeHost(over: Partial<CabinetHost> = {}): CabinetHost {
    return {
      view: () => ({ kind: null, wave: 'breather' }),
      propose: () => 'proposed',
      say: () => 'said',
      sfx: () => 'queued',
      speak: () => 'queued',
      tapes: () => [],
      recent: () => [],
      maxWords: () => 12,
      ...over,
    };
  }

  it('the closed-word refusal names the class and the shape to write instead', () => {
    const cab = createCabinet(fakeHost({ say: () => 'said' }));
    // `loadTool` refuses any description carrying one of these words, so the
    // contract structurally cannot list the class and this refusal is the
    // only surface the rule can travel on. It used to say 'a closed word',
    // which is a label defined nowhere.
    const out = cab.call('say', { text: 'The score is even.', lead: 'beat' }).content[0]!.text;
    expect(out).toBe(
      'the gate refused it (the line said something about how the game is going; say it in character instead); the boss says one of its own instead',
    );
    // It still leaks no needle: the matched word is nowhere in the answer.
    expect(out).not.toMatch(/\bscore\b/);
  });

  it('a say with no boss reports the gate verdict it already knew', () => {
    const cab = createCabinet(fakeHost({ say: () => 'no boss' }));
    expect(cab.call('say', { text: 'A clean line.', lead: 'beat' }).content[0]!.text).toBe(
      'no boss on the field; nothing said',
    );
    // Both facts, so a client does not spend a whole round re-sending a line
    // the cabinet had already refused on the first call.
    expect(cab.call('say', { text: 'I have 3 items.', lead: 'beat' }).content[0]!.text).toBe(
      'no boss on the field; nothing said, and the gate would have refused it (a digit is not allowed) anyway',
    );
  });

  it('the end scene has a word, and the view and the levers agree about it', () => {
    const cab = createCabinet(
      fakeHost({
        view: () => ({
          kind: 'doorman',
          hp: 'mid',
          column: 'left',
          stick: 'still',
          motion: 'pulse',
          wave: 'unlisted',
          scene: true,
        }),
        propose: () => 'scene',
        say: () => 'scene',
        speak: () => 'scene',
      }),
    );
    expect(cab.call('view', {}).content[0]!.text).toMatch(
      /^round the round is at its end; a new one starts in a moment$/m,
    );
    expect(cab.call('fire', { verb: 'fog' }).content[0]!.text).toBe(
      'the round is at its end scene; nothing to spend',
    );
    expect(cab.call('say', { text: 'A clean line.', lead: 'beat' }).content[0]!.text).toBe(
      'the round is at its end scene; nothing said',
    );
    expect(cab.call('speak', {}).content[0]!.text).toBe(
      'the round is at its end scene; the line waits',
    );
    // Still a word-only view: the new line carries no digit and no needle.
    expect(cab.call('view', {}).content[0]!.text).not.toMatch(SCREEN);
  });

  it('a worker that refuses this cabinet is told apart from no worker at all', () => {
    expect(
      createCabinet(fakeHost({ speak: () => 'refused' })).call('speak', {}).content[0]!.text,
    ).toBe('the voice worker refused this cabinet; the boss stays quiet');
    expect(
      createCabinet(fakeHost({ speak: () => 'no worker' })).call('speak', {}).content[0]!.text,
    ).toBe('the voice is silent: no worker answers');
  });

  it('a stuck round stops the levers promising beats it will never take', () => {
    let frozen = false;
    const cab = createCabinet(fakeHost({ stuck: () => frozen }));
    expect(cab.call('fire', { verb: 'fog' }).content[0]!.text).toMatch(/at its next beat/);
    frozen = true;
    for (const [name, args] of [
      ['fire', { verb: 'fog' }],
      ['say', { text: 'A clean line.', lead: 'beat' }],
      ['speak', {}],
      ['sfx', { kind: 'lamp' }],
    ] as const) {
      expect(cab.call(name, args).content[0]!.text, name).toBe(
        'the round is not moving; nothing was queued',
      );
    }
    // The view says so too, because a stderr line is not a surface an MCP
    // client can read.
    expect(cab.call('view', {}).content[0]!.text).toMatch(/^round the round is not moving$/m);
  });
});
