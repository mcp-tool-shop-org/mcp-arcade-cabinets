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
import { headlessRound, type HeadlessOpts } from '../src/server';

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
