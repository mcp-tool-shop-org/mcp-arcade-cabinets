// The stdio server, driven the way the instrument drives it: a client over
// stdio lists the tools within two seconds, calls each, and asks for a name
// that was never on the menu. The headless round underneath is the real sim.

import { cpSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { build } from 'esbuild';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CONTRACT } from '../src/contract';
import { FORBIDDEN } from '../src/gate';
import { DEFAULT_TIER, ghostEnv, headlessRound, type HeadlessOpts } from '../src/server';

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
    expect(quiet.opts).toEqual({ tier: 2, seed: 7, fixture: 'a' });

    for (const tier of ['0', '3']) {
      expect(ghostEnv({ CABINET_TIER: tier }).notes).toEqual([]);
    }
    for (const bad of ['9', '-1', '4', 'abc', '1.5']) {
      const read = ghostEnv({ CABINET_TIER: bad });
      expect(read.opts.tier, bad).toBeUndefined();
      expect(read.notes, bad).toEqual([
        `CABINET_TIER was not understood; the cabinet plays at tier ${DEFAULT_TIER}\n`,
      ]);
    }
    const seed = ghostEnv({ CABINET_SEED: 'later' });
    expect(seed.opts.seed).toBeUndefined();
    expect(seed.notes).toEqual(['CABINET_SEED was not understood; the cabinet draws its own\n']);

    // The mirror of the typing cabinet's CABINET_TAPES_USER note: a variable
    // the image may set for both cabinets and this one does not read.
    expect(ghostEnv({ CABINET_BOT: 'typist:30' }).notes).toEqual([
      'CABINET_BOT is read by the typing cabinet only; this cabinet plays its own bot\n',
    ]);

    // An explicit opt wins and is not second-guessed by the environment.
    const given = ghostEnv({ CABINET_TIER: '9', CABINET_SEED: 'x' }, { tier: 1, seed: 4 });
    expect(given.notes).toEqual([]);
    expect(given.opts).toEqual({ tier: 1, seed: 4 });
  });

  it('plays silent and says so when the voice url cannot be read', () => {
    // Passed through whole, a url with no scheme made every fetch throw a
    // TypeError that voiceHealth and speakLine both swallow, so the cabinet
    // said 'no worker' for the rest of the session — the same words an
    // absent worker gets, with nothing said at start.
    const said = 'the voice url was not understood; the cabinet plays silent\n';
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
    // Unset is not the same as empty: the cabinet keeps its own default.
    expect(ghostEnv({}).opts.voiceUrl).toBeUndefined();
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
});
