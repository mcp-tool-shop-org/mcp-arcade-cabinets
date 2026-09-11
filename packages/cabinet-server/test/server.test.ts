// The stdio server, driven the way the instrument drives it: a client over
// stdio lists the tools within two seconds, calls each, and asks for a name
// that was never on the menu. The headless round underneath is the real sim.

import path from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { build } from 'esbuild';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CONTRACT } from '../src/contract';
import { FORBIDDEN } from '../src/gate';
import { headlessRound } from '../src/server';

const PKG = path.resolve(__dirname, '..');
const OUT = path.join(PKG, 'dist', 'server.test-build.js');

describe('the headless round', () => {
  it('runs the real sim under the tools and restarts at the scene', () => {
    const h = headlessRound({ fixture: 'naive-ndjson', seed: 0 });
    expect(h.tapes.length).toBeGreaterThanOrEqual(16);
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
      expect(t.annotations?.openWorldHint).toBe(false);
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
