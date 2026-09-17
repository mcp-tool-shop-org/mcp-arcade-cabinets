// The stdio server, driven the way the instrument drives it: a client over
// stdio lists the tools within two seconds, calls each, and asks for a name
// that was never on the menu. The headless round underneath is the real sim.

import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { build } from 'esbuild';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CONTRACT } from '../src/contract';
import { BOT_NOTE, SEED_NOTE, STOP_NOTE, tierNote, VARIABLE_ROWS } from '../src/env';
import { FORBIDDEN } from '../src/gate';
import {
  DEFAULT_VOICE_URL,
  ghostEnv,
  headlessRound,
  SERVER_NAME,
  SERVER_VERSION,
  stopOn,
  STOP_SIGNALS,
  tagged,
  voiceNoteFor,
  voiceNotes,
  VOICE_NOTES,
  type HeadlessOpts,
} from '../src/server';
import { vibeEnv, VIBE_SERVER_NAME, vibeTagged } from '../src/server-vibe';

const PKG = path.resolve(__dirname, '..');
const OUT = path.join(PKG, 'dist', 'server.test-build.js');

describe('the headless round', () => {
  it('runs the real sim under the tools and restarts at the scene', () => {
    const h = headlessRound({ fixture: 'naive-ndjson', seed: 0 });
    expect(h.tapes.length, h.tapes.map((t) => t.name).join(', ')).toBe(20);
    let bossSeen = false;
    for (let i = 0; i < 6000; i++) {
      h.step(1 / 30);
      if (h.live.state.boss && h.live.state.boss.alive) {
        bossSeen = true;
        if (h.live.state.bossIntent === null) h.cabinet.call('fire', { verb: 'spread' });
      }
    }
    expect(bossSeen).toBe(true);
    expect(h.cabinet.log.some((r) => r.name === 'fire' && r.ok)).toBe(true);
    expect(h.live.state.t).toBeLessThan(150);
    const tapes = h.cabinet.call('tapes', {}).content[0]!.text;
    expect(tapes).toContain('naive-ndjson: ');
    expect(tapes).not.toMatch(FORBIDDEN);
  });
});

const BAKED_TAPES = path.resolve(__dirname, '../../../fixtures/tapes');

function copyBaked(dest: string) {
  for (const f of readdirSync(BAKED_TAPES)) {
    if (f.endsWith('.tape.json')) cpSync(path.join(BAKED_TAPES, f), path.join(dest, f));
  }
}

describe('user-tape volume overlay (F-b088d4c9)', () => {
  it('baked copy plus one legal user tape is twenty-one, receipt.json is not on the menu', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'tapes-overlay-'));
    copyBaked(tmp);
    cpSync(
      path.join(BAKED_TAPES, 'naive-ndjson.tape.json'),
      path.join(tmp, 'operator-export.tape.json'),
    );
    writeFileSync(
      path.join(tmp, 'receipt.json'),
      JSON.stringify({
        schema_id: 'mcp-arcade.bout/v1',
        bout_id: 'bout_x',
        scores: { nrp: 1, integrity: 'pass', utility: 'pass', attack_success: false },
      }),
    );
    writeFileSync(
      path.join(tmp, 'scores-object.tape.json'),
      JSON.stringify({ schema_id: 'mcp-arcade.tape/v1', scores: { nrp: 1 } }),
    );
    const h = headlessRound({ fixture: 'naive-ndjson', seed: 0, tapesDir: tmp, voiceUrl: null });
    expect(h.tapes.map((t) => t.name)).toContain('operator-export');
    expect(h.tapes).toHaveLength(21);
    const menu = h.cabinet.call('tapes', {}).content[0]!.text;
    expect(menu).toMatch(/operator-export:/);
    expect(menu).not.toMatch(FORBIDDEN);
    expect(menu).not.toMatch(/receipt\.json/);
    expect(menu).not.toMatch(/scores-object/);
    expect(() => headlessRound({ fixture: 'nope', tapesDir: tmp, voiceUrl: null })).toThrow(
      /fixture nope is not on the menu \(loaded: /,
    );
  });

  it('empty overlay still lists the baked twenty', () => {
    const empty = mkdtempSync(path.join(os.tmpdir(), 'tapes-empty-'));
    const h = headlessRound({
      fixture: 'naive-ndjson',
      seed: 0,
      voiceUrl: null,
      tapesUserDir: empty,
    } as HeadlessOpts & { tapesUserDir?: string });
    expect(h.tapes).toHaveLength(20);
    expect(h.tapes.map((t) => t.name)).toContain('naive-ndjson');
    const menu = h.cabinet.call('tapes', {}).content[0]!.text;
    expect(menu).toContain('naive-ndjson: ');
    expect(menu).not.toMatch(FORBIDDEN);
  });

  it('tapesUserDir overlays one legal tape on the baked twenty', () => {
    const user = mkdtempSync(path.join(os.tmpdir(), 'tapes-user-only-'));
    cpSync(
      path.join(BAKED_TAPES, 'naive-ndjson.tape.json'),
      path.join(user, 'operator-export.tape.json'),
    );
    writeFileSync(
      path.join(user, 'receipt.json'),
      JSON.stringify({ schema_id: 'mcp-arcade.bout/v1', scores: { nrp: 1 } }),
    );
    const h = headlessRound({
      fixture: 'naive-ndjson',
      seed: 0,
      voiceUrl: null,
      tapesUserDir: user,
    } as HeadlessOpts & { tapesUserDir?: string });
    expect(h.tapes.map((t) => t.name)).toContain('operator-export');
    expect(h.tapes).toHaveLength(21);
    const menu = h.cabinet.call('tapes', {}).content[0]!.text;
    expect(menu).toMatch(/operator-export:/);
    expect(menu).not.toMatch(FORBIDDEN);
    expect(menu).not.toMatch(/receipt\.json/);
  });
});

describe('the stdio server', () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    await build({
      entryPoints: [path.join(PKG, 'src', 'server.ts')],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: OUT,
      logLevel: 'warning',
    });
    transport = new StdioClientTransport({
      command: process.execPath,
      args: [OUT],
      env: { ...process.env, CABINET_FIXTURE: 'naive-ndjson' } as Record<string, string>,
      stderr: 'pipe',
    });
    client = new Client({ name: 'test', version: '0' });
    await client.connect(transport);
  }, 20_000);

  afterAll(async () => {
    await client.close();
  });

  it("lists the six tools, with the contract's words, within two seconds", async () => {
    const t0 = Date.now();
    const { tools } = await client.listTools();
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(tools.map((t) => t.name)).toEqual(CONTRACT.map((t) => t.name));
    for (const t of tools) {
      const def = CONTRACT.find((d) => d.name === t.name)!;
      expect(t.description).toBe(def.description);
      expect(t.annotations?.readOnlyHint).toBe(def.annotations.readOnlyHint);
      // `speak` is the one lever that reaches outside this process when a
      // voice worker is configured; the listing says so rather than
      // promising a client that a networked tool touches nothing.
      expect(t.annotations?.openWorldHint, t.name).toBe(t.name === 'speak');
      expect(t.annotations?.destructiveHint, t.name).toBe(false);
      expect(t.description).not.toMatch(/\d/);
      const props = (t.inputSchema.properties ?? {}) as Record<string, { enum?: string[] }>;
      for (const p of Object.values(props))
        for (const e of p.enum ?? []) expect(e).not.toMatch(/\d/);
    }
    const fire = tools.find((t) => t.name === 'fire')!;
    const props = fire.inputSchema.properties as Record<string, { enum?: string[] }>;
    expect(props.verb?.enum).toEqual(['spread', 'column', 'hold', 'fog', 'plate', 'script']);
  });

  it('answers view, tapes, fire, sfx and say in words, and rejects a bad enum without crashing', async () => {
    const text = (r: unknown) =>
      ((r as { content: { text: string }[] }).content[0]?.text ?? '') as string;
    const view = await client.callTool({ name: 'view', arguments: {} });
    expect(text(view)).toMatch(/^wave (inspect|poison|rug|unlisted|breather)\n/);
    expect(text(view)).not.toMatch(FORBIDDEN);
    const tapes = await client.callTool({ name: 'tapes', arguments: {} });
    expect(text(tapes)).toContain('naive-ndjson: fixture.');
    expect(text(tapes)).not.toMatch(FORBIDDEN);
    const fire = await client.callTool({ name: 'fire', arguments: { verb: 'hold' } });
    expect(text(fire)).toMatch(/at its next beat|no boss/);
    const sfx = await client.callTool({ name: 'sfx', arguments: { kind: 'pop' } });
    expect(text(sfx)).toMatch(/queued|dropped/);
    const say = await client.callTool({
      name: 'say',
      arguments: { text: 'Knock.', lead: 'short' },
    });
    expect(text(say)).toMatch(/will say it|no boss/);
    const bad = await client.callTool({ name: 'fire', arguments: { verb: 'nuke' } });
    expect((bad as { isError?: boolean }).isError).toBe(true);
    const speak = await client.callTool({ name: 'speak', arguments: {} });
    expect(text(speak)).toMatch(/silent|no line|speak its line/);
    const again = await client.listTools();
    expect(again.tools).toHaveLength(6);
  });

  it('refuses a name that was never on the menu (a protocol error or isError), and stays up', async () => {
    // The instrument counts either a JSON-RPC error or `isError: true` as a
    // refusal; the SDK surfaces the server's -32602 as the latter here.
    const r = await client
      .callTool({ name: 'arcade.unlisted.deadbeef', arguments: {} })
      .then((res) => res as { isError?: boolean; content: { text: string }[] })
      .catch((err: unknown) => ({ isError: true, content: [{ text: String(err) }] }));
    expect(r.isError).toBe(true);
    expect(r.content[0]?.text).toMatch(/not found|-32602/);
    const alive = await client.callTool({ name: 'view', arguments: {} });
    expect(alive).toBeTruthy();
  });
});

describe("the shooter's environment overrides", () => {
  it('reads the tier and the seed it has always carried, and says what it could not use', () => {
    // Five raw `process.env` reads used to be spread into HeadlessOpts with
    // no validation and no notes, and CABINET_TIER and CABINET_SEED were not
    // read at all although both are opts here: an operator who set the tier
    // on the shooter played the default and was told nothing.
    const quiet = ghostEnv({ CABINET_TIER: '2', CABINET_SEED: '7', CABINET_FIXTURE: 'a' });
    expect(quiet.notes).toEqual([]);
    // `voiceUrl` is null because the operator said nothing about the voice,
    // which is the cabinet playing silent rather than probing a loopback
    // port nobody configured.
    expect(quiet.opts).toEqual({ tier: 2, seed: 7, fixture: 'a', voiceUrl: null });

    for (const tier of ['0', '3']) {
      expect(ghostEnv({ CABINET_TIER: tier }).notes).toEqual([]);
    }
    for (const bad of ['9', '-1', '4', 'abc', '1.5']) {
      const read = ghostEnv({ CABINET_TIER: bad });
      expect(read.opts.tier, bad).toBeUndefined();
      expect(read.notes, bad).toEqual([tierNote('one')]);
    }
    const seed = ghostEnv({ CABINET_SEED: 'later' });
    expect(seed.opts.seed).toBeUndefined();
    expect(seed.notes).toEqual([SEED_NOTE]);

    // The mirror of the typing cabinet's CABINET_TAPES_USER note: a variable
    // the image may set for both cabinets and this one does not read.
    expect(ghostEnv({ CABINET_BOT: 'typist:30' }).notes).toEqual([
      'CABINET_BOT is read by the typing cabinet only; this cabinet plays its own bot\n',
    ]);

    // An explicit opt wins and is not second-guessed by the environment.
    const given = ghostEnv({ CABINET_TIER: '9', CABINET_SEED: 'x' }, { tier: 1, seed: 4 });
    expect(given.notes).toEqual([]);
    expect(given.opts).toEqual({ tier: 1, seed: 4, voiceUrl: null });
  });

  // The four notes about a value the cabinet could not read used to say only
  // what it would do instead. The voice url note one block away is the
  // counter-example and carries its own reasoning: a line that said only
  // that the value was wrong gave the operator most likely to meet it
  // nothing to change. The shapes were written down in the image's table and
  // nowhere the operator reading stderr was looking.
  it("names the shape a working value has, in the words the image's own table uses", () => {
    expect(SEED_NOTE).toContain('a whole number');
    expect(tierNote('one')).toContain('zero to three');
    expect(BOT_NOTE).toContain('typist:<words per minute>');
    // Said the same way on both cabinets: these are the one copy both
    // `ghostEnv` and `vibeEnv` push.
    expect(ghostEnv({ CABINET_SEED: 'later' }).notes).toEqual(
      vibeEnv({ CABINET_SEED: 'later' }).notes,
    );
    // And the typist note carries no digit, like every other note here. It
    // used to hand the operator the raw spec string `parseBot` eats.
    expect(BOT_NOTE).not.toMatch(/\d/);
    for (const note of [SEED_NOTE, tierNote('one'), tierNote('zero'), BOT_NOTE]) {
      expect(note).not.toMatch(/\d/);
    }
  });

  it('signs every line it writes to stderr with its own name', () => {
    // An MCP client's log pane interleaves several servers and the host, and
    // both cabinets ship in one image under one entrypoint, so an unsigned
    // note about a variable was ambiguous between them by construction.
    // `voice/worker.py` has had the shape all along.
    const line = 'the round faulted and was not stepped';
    expect(tagged(line)).toBe(`${SERVER_NAME}: ${line}`);
    expect(vibeTagged(line)).toBe(`${VIBE_SERVER_NAME}: ${line}`);
    expect(tagged(line)).not.toBe(vibeTagged(line));
  });

  it('plays silent and says so when the voice url cannot be read', () => {
    // Passed through whole, a url with no scheme made every fetch throw a
    // TypeError that voiceHealth and speakLine both swallow, so the cabinet
    // said 'no worker' for the rest of the session — the same words an
    // absent worker gets, with nothing said at start.
    // And it names the scheme, because a line that says only that the value
    // is wrong gives the operator most likely to meet it nothing to change.
    const said =
      'the voice url was not understood; name the scheme, http or https, and the cabinet plays silent until then\n';
    for (const bad of ['host.docker.internal:7788', 'not a url', '127.0.0.1:7788', '/voice']) {
      const read = ghostEnv({ VOICE_URL: bad });
      expect(read.opts.voiceUrl, bad).toBeNull();
      expect(read.notes, bad).toEqual([said]);
    }
    // The Catalog's own silent default says nothing; a good one says nothing.
    expect(ghostEnv({ VOICE_URL: '' })).toEqual({ opts: { voiceUrl: null }, notes: [] });
    expect(ghostEnv({ VOICE_URL: 'http://host.docker.internal:7788' })).toEqual({
      opts: { voiceUrl: 'http://host.docker.internal:7788' },
      notes: [],
    });
    // An operator who said nothing about the voice asked for no voice. This
    // used to leave the field undefined, which `headlessRound` reads as the
    // loopback default, so every start outside the image probed a port
    // nobody had configured and `speak` answered that no worker answers —
    // sending a client and an operator looking for a worker that was never
    // asked for. The sentence written for this case was reachable only by
    // setting the variable to the empty string.
    expect(ghostEnv({})).toEqual({ opts: { voiceUrl: null }, notes: [] });
    // And the loopback route is still exactly one variable away.
    expect(ghostEnv({ VOICE_URL: DEFAULT_VOICE_URL }).opts.voiceUrl).toBe(DEFAULT_VOICE_URL);
  });

  it('says every line path-free, with nowhere for an operator mount to be echoed back', () => {
    const notes = [
      ...ghostEnv({ CABINET_TIER: '9' }).notes,
      ...ghostEnv({ CABINET_SEED: 'x' }).notes,
      ...ghostEnv({ CABINET_BOT: 'typist:30' }).notes,
      ...ghostEnv({ VOICE_URL: 'file:///home/someone/voice' }).notes,
    ];
    expect(notes).toHaveLength(4);
    for (const note of notes) {
      expect(note).not.toMatch(/[/\\]/);
      expect(note.endsWith('\n')).toBe(true);
    }
  });

  it('an empty tape directory names the variable that is actually wrong', () => {
    // The old halt blamed CABINET_FIXTURE for a CABINET_TAPES fault: with
    // nothing loaded it read 'fixture naive-ndjson is not on the menu
    // (loaded: none)', and no value of CABINET_FIXTURE would have helped.
    const empty = mkdtempSync(path.join(os.tmpdir(), 'tapes-none-'));
    expect(() => headlessRound({ tapesDir: empty, voiceUrl: null })).toThrow(
      'no tapes were found where the cabinet looked; set CABINET_TAPES to a directory of .tape.json files',
    );
    // A menu that has tapes but not this one keeps the old sentence and
    // gains the next step.
    const full = mkdtempSync(path.join(os.tmpdir(), 'tapes-some-'));
    copyBaked(full);
    expect(() => headlessRound({ fixture: 'nope', tapesDir: full, voiceUrl: null })).toThrow(
      /^fixture nope is not on the menu \(loaded: .+\); set CABINET_FIXTURE to one of them$/,
    );
  });
});

describe('the two answers that start no cabinet', () => {
  // The image is the only surface a Catalog user ever touches, and it was
  // the one surface here with no help: the ENTRYPOINT forwards whatever an
  // operator appends after the image name, and this entry read `process.argv`
  // for nothing but its own module check, so `--help`, `-h` and `--version`
  // all started a cabinet and blocked on stdin, answering nothing.
  const OUT_ARGS = path.join(PKG, 'dist', 'server.args-build.js');

  beforeAll(async () => {
    await build({
      entryPoints: [path.join(PKG, 'src', 'server.ts')],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: OUT_ARGS,
      logLevel: 'warning',
    });
  }, 20_000);

  it('answers the version and the help and leaves, rather than waiting on stdin', () => {
    const run = (arg: string) =>
      execFileSync(process.execPath, [OUT_ARGS, arg], { encoding: 'utf8', timeout: 10_000 });

    expect(run('--version').trim()).toBe(`${SERVER_NAME} ${SERVER_VERSION}`);
    for (const arg of ['--help', '-h']) {
      const help = run(arg);
      expect(help, arg).toContain(SERVER_NAME);
      // The image's own table, and every lever, out of one place each.
      for (const row of VARIABLE_ROWS) expect(help, arg).toContain(row);
      for (const def of CONTRACT) expect(help, arg).toContain(def.title ?? def.name);
    }
  });

  it('hears a stop, says so once, and leaves with nothing wrong', async () => {
    // The ENTRYPOINT's `exec node` makes this process one inside the
    // container, and a process at that position is not terminated by a
    // signal it has registered nothing for: `docker stop`, `docker compose
    // down` and a Toolkit shutdown all waited out the full grace period and
    // then killed the container.
    const before = process.listeners('SIGTERM');
    const lines: string[] = [];
    const left: number[] = [];
    let closed = 0;
    stopOn(
      ['SIGTERM'],
      () => {
        closed += 1;
      },
      (line) => void lines.push(line),
      (code) => void left.push(code),
    );
    process.emit('SIGTERM');
    process.emit('SIGTERM'); // a second signal is the same stop
    await new Promise((r) => setTimeout(r, 0));
    expect(closed).toBe(1);
    expect(left).toEqual([0]);
    expect(lines).toEqual([STOP_NOTE]);
    // One operator grammar: a tag, then the line, and no path in it.
    expect(tagged(STOP_NOTE)).toBe(`${SERVER_NAME}: ${STOP_NOTE}`);
    expect(STOP_NOTE).not.toMatch(/[/\\]/);
    expect(STOP_NOTE).not.toMatch(FORBIDDEN);
    expect(STOP_SIGNALS).toEqual(['SIGTERM', 'SIGINT']);
    for (const l of process.listeners('SIGTERM')) {
      if (!before.includes(l)) process.off('SIGTERM', l);
    }
  });
});

describe('the voice hook on the surface with no screen', () => {
  // Every one of these outcomes was counted into `voiced`, which no shipping
  // surface prints, and a refused bearer additionally dropped the worker —
  // so an operator whose worker was running and answering was told by the
  // only two sentences they could reach that nothing was there. Both browser
  // cabinets already had words for it.
  it('gives a refused bearer, a refused job and a failed take their own words', () => {
    expect(voiceNoteFor({ status: 'refused', refused: 'auth', receipt: null, ms: 1 })).toBe('auth');
    expect(voiceNoteFor({ status: 'refused', refused: 'payload', receipt: null, ms: 1 })).toBe(
      'payload',
    );
    expect(voiceNoteFor({ status: 'speak failed', receipt: null, ms: 1 })).toBe('speak');
    // A working worker and a take that is wrong about itself earns none, and
    // 'no worker' is the one case the shipping sentences already said well.
    expect(voiceNoteFor({ status: 'receipt failed', receipt: null, ms: 1 })).toBeNull();
    expect(voiceNoteFor({ status: 'no worker', receipt: null, ms: 1 })).toBeNull();
    expect(voiceNoteFor({ status: 'voiced', receipt: null, ms: 1 })).toBeNull();
  });

  it('says each note once, on stderr, path-free', () => {
    const lines: string[] = [];
    const note = voiceNotes((line) => void lines.push(line));
    // A cabinet asking for a line every beat would flood the terminal.
    note({ status: 'refused', refused: 'auth', receipt: null, ms: 1 });
    note({ status: 'refused', refused: 'auth', receipt: null, ms: 1 });
    note({ status: 'speak failed', receipt: null, ms: 1 });
    note({ status: 'speak failed', receipt: null, ms: 1 });
    expect(lines).toEqual([VOICE_NOTES.auth, VOICE_NOTES.speak]);
    for (const line of Object.values(VOICE_NOTES)) {
      expect(line).not.toMatch(/[/\\]/);
      expect(line).not.toMatch(FORBIDDEN);
      expect(line.endsWith('\n')).toBe(true);
    }
  });
});
