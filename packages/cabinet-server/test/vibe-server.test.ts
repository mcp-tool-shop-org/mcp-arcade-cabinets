// The typing cabinet's stdio server, driven the way a client drives it: a
// client over stdio lists the four tools within two seconds, calls each,
// sends a shape the contract does not admit, and asks for a name that was
// never on the menu. The endless run underneath is the real sim.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { build } from 'esbuild';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  corpusOf,
  endlessPeek,
  inBand,
  leversOf,
  planOf,
  suppliedCount,
} from '@mcp-arcade-cabinets/vibe-typer';

import { VIBE_CONTRACT } from '../src/contract';
import { FORBIDDEN } from '../src/gate';
import { SERVER_VERSION } from '../src/server';
import { vibeHeadlessRound, VIBE_SERVER_VERSION, wholeEnv } from '../src/server-vibe';

const PKG = path.resolve(__dirname, '..');
const OUT = path.join(PKG, 'dist', 'server-vibe.test-build.js');

describe('the version the handshake reports', () => {
  it('is the one the release gate reads, and the one the package carries', () => {
    // The gate greps this exact shape out of server.ts and the constant may
    // not move, so the typing cabinet declares its own and this is the
    // andon that keeps the two in step.
    const src = readFileSync(path.join(PKG, 'src', 'server.ts'), 'utf8');
    const grepped = /SERVER_VERSION[^0-9]+([0-9][0-9.]*)/.exec(src)?.[1];
    expect(grepped).toBe(SERVER_VERSION);
    expect(VIBE_SERVER_VERSION).toBe(SERVER_VERSION);
    const pkg = JSON.parse(readFileSync(path.join(PKG, 'package.json'), 'utf8')) as {
      version: string;
    };
    expect(VIBE_SERVER_VERSION).toBe(pkg.version);
  });
});

describe('the environment overrides', () => {
  it('takes a whole number and treats anything else as absent, never as the default', () => {
    expect(wholeEnv('5')).toBe(5);
    expect(wholeEnv('0')).toBe(0);
    expect(wholeEnv(' 12 ')).toBe(12);
    // The sim folds a seed through `>>> 0`, so a negative one is ordinary.
    expect(wholeEnv('-7')).toBe(-7);
    // Not a whole number is absent. Coercing these through NaN to a fallback
    // would read afterwards as though the operator asked for the default.
    for (const bad of ['abc', '1.5', '', ' ', '1e3', '0x10', '+4', '12abc', '9'.repeat(30)]) {
      expect(wholeEnv(bad), bad).toBeNull();
    }
    expect(wholeEnv(undefined)).toBeNull();
  });
});

describe('the headless endless round', () => {
  it('plays the real sim under the tools and starts the next run when the bar empties', () => {
    const h = vibeHeadlessRound({ seed: 4, tier: 0 });
    expect(h.tapes).toBeGreaterThan(0);
    const first = h.live.seed;
    let ended = false;
    for (let i = 0; i < 60_000; i++) {
      h.step(1 / 60);
      if (h.live.seed !== first) {
        ended = true;
        break;
      }
    }
    expect(ended, 'the bar emptied and the next run started').toBe(true);
    expect(h.live.state.over).toBe(false);
    const view = h.cabinet.call('view', {}).content[0]!.text;
    expect(view).toMatch(/^product /);
    expect(view).not.toMatch(FORBIDDEN);
  }, 30_000);

  it('queues a request, refuses the same one again, and takes a different one', () => {
    const h = vibeHeadlessRound({ seed: 6, tier: 0 });
    const next = endlessPeek({
      set: leversOf(h.live.state),
      seed: h.live.seed,
      tier: planOf(h.live.state).tier,
      levelIndex: h.live.state.levelIndex + 1,
    });
    const pool = inBand(corpusOf(h.live.state), next.stack, next.bandMin, next.bandMax);
    const send = (ask: string, code: string) =>
      h.cabinet.call('ask', { ask, code, title: 'a small thing', notes: 'it does one job' })
        .content[0]!.text;

    expect(send('let {product} count the leaves', pool[0]!.code)).toBe(
      'the next request is queued',
    );
    expect(suppliedCount(h.live.state)).toBe(1);
    // The same words again, and the same words with the hole written out.
    expect(send('let {product} count the leaves', pool[1]!.code)).toBe(
      'the gate refused it (repeat); the cabinet plays one of its own instead',
    );
    expect(send(`let ${next.product} count the leaves`, pool[1]!.code)).toBe(
      'the gate refused it (repeat); the cabinet plays one of its own instead',
    );
    expect(suppliedCount(h.live.state)).toBe(1);
    // A different request is taken.
    expect(send('let {product} whistle on a tuesday', pool[1]!.code)).toBe(
      'the next request is queued',
    );
    expect(suppliedCount(h.live.state)).toBe(2);
    // The refusal never carries the words that were refused.
    for (const record of h.cabinet.log) expect(record.gate).not.toContain('leaves');
  });
});

describe('the stdio server', () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    await build({
      entryPoints: [path.join(PKG, 'src', 'server-vibe.ts')],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: OUT,
      logLevel: 'warning',
    });
    transport = new StdioClientTransport({
      command: process.execPath,
      args: [OUT],
      env: { ...process.env, CABINET_SEED: '5' } as Record<string, string>,
      stderr: 'pipe',
    });
    client = new Client({ name: 'test', version: '0' });
    await client.connect(transport);
  }, 20_000);

  afterAll(async () => {
    await client.close();
  });

  it("lists the four tools, with the contract's words, within two seconds", async () => {
    const t0 = Date.now();
    const { tools } = await client.listTools();
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(tools.map((t) => t.name)).toEqual(VIBE_CONTRACT.map((t) => t.name));
    expect(tools.map((t) => t.name)).toEqual(['view', 'product', 'ask', 'react']);
    for (const t of tools) {
      const def = VIBE_CONTRACT.find((d) => d.name === t.name)!;
      expect(t.description).toBe(def.description);
      expect(t.annotations?.readOnlyHint).toBe(def.annotations.readOnlyHint);
      expect(t.annotations?.openWorldHint).toBe(false);
      expect(t.description).not.toMatch(/\d/);
    }
    // Not the shooter's. Two cabinets, two contracts, two servers.
    expect(tools.map((t) => t.name)).not.toContain('fire');
    expect(tools.map((t) => t.name)).not.toContain('tapes');
  });

  it('answers view, product, ask and react in words, and rejects a bad shape without crashing', async () => {
    const text = (r: unknown) =>
      ((r as { content: { text: string }[] }).content[0]?.text ?? '') as string;

    const view = await client.callTool({ name: 'view', arguments: {} });
    expect(text(view)).toMatch(/^product /);
    expect(text(view)).toMatch(/\nroom the next level (has room|is full)\n?$/);
    expect(text(view)).not.toMatch(FORBIDDEN);

    const product = await client.callTool({
      name: 'product',
      arguments: { product: 'a diary for houseplants' },
    });
    expect(text(product)).toMatch(/the next level will build that|the product is set/);
    expect(text(product)).not.toMatch(FORBIDDEN);

    const badProduct = await client.callTool({
      name: 'product',
      arguments: { product: 'a bank for buttons that do not exist anywhere at all really' },
    });
    expect(text(badProduct)).toBe(
      'the gate refused it (too many words); the cabinet draws one of its own instead',
    );

    const ask = await client.callTool({
      name: 'ask',
      arguments: {
        ask: 'can you make {product} list the crows',
        code: 'SELECT name FROM crows;',
        title: 'the crow list',
        notes: 'it reads one table',
      },
    });
    expect(text(ask)).toMatch(/queued|refused it \(|the next level is full/);
    expect(text(ask)).not.toMatch(FORBIDDEN);
    // A refusal names the rule and never carries the code back.
    expect(text(ask)).not.toContain('SELECT');

    const react = await client.callTool({
      name: 'react',
      arguments: { text: 'that is exactly the thing i wanted' },
    });
    expect(text(react)).toMatch(/the user will say it|a reaction is already waiting/);
    expect(text(react)).not.toMatch(FORBIDDEN);

    const shouting = await client.callTool({ name: 'react', arguments: { text: 'this is GREAT' } });
    expect(text(shouting)).toBe(
      'the gate refused it (yells); the user says one of their own instead',
    );

    const bad = await client.callTool({ name: 'react', arguments: { text: 42 } });
    expect((bad as { isError?: boolean }).isError).toBe(true);

    const again = await client.listTools();
    expect(again.tools).toHaveLength(4);
  });

  it('refuses a name that was never on the menu, including the other cabinet’s, and stays up', async () => {
    for (const name of ['fire', 'nag', 'arcade.unlisted.deadbeef']) {
      const r = await client
        .callTool({ name, arguments: {} })
        .then((res) => res as { isError?: boolean; content: { text: string }[] })
        .catch((err: unknown) => ({ isError: true, content: [{ text: String(err) }] }));
      expect(r.isError, name).toBe(true);
      expect(r.content[0]?.text, name).toMatch(/not found|-32602/);
    }
    const alive = await client.callTool({ name: 'view', arguments: {} });
    expect(alive).toBeTruthy();
  });
});
