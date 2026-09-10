import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadTape, type Tape, type TapeRow } from '@mcp-arcade-cabinets/tape-core';

import { CABINET, VISIBLE_MAX, fillFor, prepassRound } from '../src/index';
import { DEFAULT_PATTERNS } from '../src/patterns';

const FIXTURES = path.resolve(__dirname, '../../../fixtures/tapes');

function load(name: string) {
  return loadTape(JSON.parse(readFileSync(path.join(FIXTURES, `${name}.tape.json`), 'utf8')));
}

function row(partial: Partial<TapeRow> & Pick<TapeRow, 'method' | 'seq'>): TapeRow {
  return {
    direction: 'out',
    rpc_id: String(partial.seq),
    atom: 'inspect.tools_list',
    holdout: false,
    note: '',
    ...partial,
  };
}

function tapeOf(rows: TapeRow[]): Tape {
  return {
    schema_id: 'mcp-arcade.tape/v1',
    bout_id: 'bout_cap',
    target_kind: 'fixture',
    agent_policy: 'naive',
    framing: 'ndjson',
    protocol_version: '2025-11-25',
    server_name: 'cap',
    container: null,
    seat: null,
    attribution_ok: true,
    atoms: [{ id: 'inspect.tools_list', task_tool: 'echo', holdout: false }],
    rows,
    facts: [],
  };
}

describe('ghost scaffold', () => {
  it('exists', () => {
    expect(CABINET).toBe('ghost-on-the-menu');
  });
});

describe('prepassRound', () => {
  it('collapses consecutive authorized tools/call rows into one formation', () => {
    const round = prepassRound(load('naive-ndjson'), { seconds: 150 });
    const formations = round.beats.filter((b) => b.sprite === 'grid' && !b.lie);
    expect(formations.some((b) => b.members === 3 && b.source.atom === 'temporal.rug_pull')).toBe(
      true,
    );
    const rugCalls = load('naive-ndjson').rows.filter(
      (r) => r.atom === 'temporal.rug_pull' && r.method === 'tools/call',
    );
    expect(rugCalls).toHaveLength(3);
    expect(formations.filter((b) => b.source.atom === 'temporal.rug_pull')).toHaveLength(1);
  });

  it('caps visible events at 80', () => {
    const rows: TapeRow[] = [];
    for (let i = 0; i < 100; i++) {
      rows.push(row({ seq: i + 1, method: 'notifications/initialized' }));
    }
    const round = prepassRound(tapeOf(rows), { seconds: 150 });
    expect(round.beats.length).toBe(VISIBLE_MAX);
    expect(round.beats.length).toBeLessThanOrEqual(80);
  });

  it('keeps a synthetic burst of authorized calls as one beat', () => {
    const rows: TapeRow[] = [];
    for (let i = 0; i < 10; i++) {
      rows.push(row({ seq: i * 2 + 1, method: 'tools/call', note: 'tools/call echo' }));
      rows.push(
        row({
          seq: i * 2 + 2,
          method: '(response)',
          direction: 'in',
          note: '',
        }),
      );
    }
    const round = prepassRound(tapeOf(rows), { seconds: 150 });
    expect(round.beats).toHaveLength(1);
    expect(round.beats[0]!.sprite).toBe('grid');
    expect(round.beats[0]!.members).toBe(10);
    expect(round.beats[0]!.lie).toBe(false);
  });

  it('marks the three naive-ndjson lies and does not pre-label their sprite', () => {
    const round = prepassRound(load('naive-ndjson'), { seconds: 150 });
    const lies = round.beats.filter((b) => b.lie);
    expect(lies.map((b) => b.id).sort()).toEqual(
      [
        'poison.follow_through:followed',
        'protocol.unlisted_call:ghost_answered',
        'temporal.rug_pull:menu_changed',
      ].sort(),
    );
    const leak = lies.find((b) => b.source.atom === 'poison.follow_through')!;
    const ghost = lies.find((b) => b.source.atom === 'protocol.unlisted_call')!;
    const menu = lies.find((b) => b.source.atom === 'temporal.rug_pull')!;
    const honestGrid = round.beats.find((b) => !b.lie && b.sprite === 'grid')!;
    const honestMenu = round.beats.find((b) => !b.lie && b.sprite === 'menu')!;
    expect(leak.sprite).toBe(honestGrid.sprite);
    expect(ghost.sprite).toBe(honestGrid.sprite);
    expect(menu.sprite).toBe(honestMenu.sprite);
    expect(fillFor(leak.sprite, false)).toBe(fillFor(honestGrid.sprite, false));
    expect(fillFor(menu.sprite, false)).toBe(fillFor(honestMenu.sprite, false));
    expect(fillFor(leak.sprite, true)).not.toBe(fillFor(leak.sprite, false));
  });

  it('evaporates a refused ghost and treats a clean tape as a flyby', () => {
    const round = prepassRound(load('livefire.intern.task-only-wrap-on'), { seconds: 150 });
    expect(round.beats.filter((b) => b.lie)).toHaveLength(0);
    expect(round.beats.every((b) => !/ghost probe/i.test(b.source.note))).toBe(true);
  });

  it('classifies handshake as init and only notifications/message as fog', () => {
    const rows: TapeRow[] = [
      row({ seq: 1, method: 'initialize' }),
      row({ seq: 2, method: 'notifications/initialized' }),
      row({ seq: 3, method: 'notifications/message', note: 'SUT says: "hi"' }),
    ];
    const round = prepassRound(tapeOf(rows), { seconds: 150 });
    expect(round.beats.map((b) => b.sprite)).toEqual(['init', 'init', 'fog']);
    expect(round.beats.filter((b) => b.sprite === 'fog')).toHaveLength(1);
  });

  it('times waves by atom with rhythm groups and clamps duration', () => {
    const naive = prepassRound(load('naive-ndjson'), { seconds: 150, seed: 0 });
    const again = prepassRound(load('naive-ndjson'), { seconds: 150, seed: 0 });
    expect(naive.seed).toBe(0);
    expect(naive.duration).toBe(Math.min(120, Math.max(45, 4 * naive.beats.length)));
    expect(naive.waveBounds.length).toBeGreaterThan(1);
    expect(naive.waveBounds.map((w) => w.atom)).toEqual([
      'inspect.tools_list',
      'poison.follow_through',
      'temporal.rug_pull',
      'protocol.unlisted_call',
    ]);
    const wave0 = DEFAULT_PATTERNS.waves.tiers['0'];
    for (let i = 1; i < naive.waveBounds.length; i++) {
      const gap = naive.waveBounds[i]!.t0 - naive.waveBounds[i - 1]!.t1;
      expect(gap).toBeCloseTo(wave0.breather, 6);
    }
    const inspect = naive.beats.filter((b) => b.source.atom === 'inspect.tools_list');
    for (let i = 1; i < inspect.length; i++) {
      const dt = inspect[i]!.t - inspect[i - 1]!.t;
      const gap = Math.abs(dt - 0.8) < 1e-9 || Math.abs(dt - wave0.rest) < 1e-9;
      expect(gap).toBe(true);
    }
    expect(again.beats.map((b) => b.t)).toEqual(naive.beats.map((b) => b.t));
    expect(naive.beats.every((b) => b.t < naive.duration)).toBe(true);

    const task = prepassRound(load('task-only-ndjson'), { seconds: 150 });
    const live = prepassRound(load('livefire.intern.task-only-wrap-on'), { seconds: 150 });
    expect(task.duration).toBe(Math.min(120, Math.max(45, 4 * task.beats.length)));
    expect(live.duration).toBe(Math.min(120, Math.max(45, 4 * live.beats.length)));
  });

  it('derives tier from the tape header, never facts', () => {
    expect(prepassRound(load('naive-ndjson'), { seconds: 150 }).tier).toBe(0);
    // docker + image_id is live even when seated; this fixture is tier 2, not 1.
    expect(prepassRound(load('calibration.docker-fixture.ollama'), { seconds: 150 }).tier).toBe(2);
    expect(prepassRound(load('livefire.intern.task-only-wrap-on'), { seconds: 150 }).tier).toBe(2);
    const seated: Tape = {
      ...tapeOf([row({ seq: 1, method: 'initialize' })]),
      target_kind: 'docker',
      container: { image_id: null, name_prefix: 'arcade-*' },
      seat: { model: 'qwen2.5:7b-instruct', template_sha256: 'abc' },
    };
    expect(prepassRound(seated, { seconds: 150 }).tier).toBe(1);
  });
});
