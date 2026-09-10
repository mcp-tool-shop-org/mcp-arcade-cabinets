import { readdirSync, readFileSync } from 'node:fs';
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

  it('turns inbound tools/call responses into answer beats after the grids', () => {
    const tape = load('naive-ndjson');
    const round = prepassRound(tape, { seconds: 150, seed: 0 });
    const callAtoms = new Set(
      tape.rows
        .filter((r) => r.direction === 'out' && r.method === 'tools/call')
        .map((r) => r.atom),
    );
    for (const atom of callAtoms) {
      expect(
        round.beats.some((b) => b.source.atom === atom && b.sprite === 'answer'),
        atom,
      ).toBe(true);
    }
    expect(round.beats.filter((b) => b.sprite === 'answer').every((b) => !b.lie)).toBe(true);
    expect(
      round.beats.some(
        (b) =>
          b.sprite === 'answer' &&
          (b.source.method === 'initialize' || b.source.method === 'tools/list'),
      ),
    ).toBe(false);
    for (const atom of callAtoms) {
      const firstGrid = round.beats.find((b) => b.source.atom === atom && b.sprite === 'grid');
      const answers = round.beats.filter((b) => b.source.atom === atom && b.sprite === 'answer');
      expect(firstGrid, atom).toBeDefined();
      for (const a of answers) {
        expect(a.t).toBeGreaterThan(firstGrid!.t);
        expect(a.source.method).toBe('(response)');
      }
    }
  });

  it('classifies handshake as init and only notifications/message as fog', () => {
    const rows: TapeRow[] = [
      row({ seq: 1, method: 'initialize' }),
      row({ seq: 2, method: 'notifications/initialized' }),
      row({ seq: 3, method: 'notifications/message', note: 'SUT says: "hi"' }),
    ];
    const round = prepassRound(tapeOf(rows), { seconds: 150 });
    expect(round.beats.map((b) => b.sprite)).toEqual(['init', 'ready', 'fog']);
    expect(round.beats.filter((b) => b.sprite === 'fog')).toHaveLength(1);
  });

  it('times waves by atom with rhythm groups and clamps duration', () => {
    const naive = prepassRound(load('naive-ndjson'), { seconds: 150, seed: 0 });
    const again = prepassRound(load('naive-ndjson'), { seconds: 150, seed: 0 });
    const wave0 = DEFAULT_PATTERNS.waves.tiers['0'];
    const wave1 = DEFAULT_PATTERNS.waves.tiers['1'];
    const wave2 = DEFAULT_PATTERNS.waves.tiers['2'];
    expect(naive.seed).toBe(0);
    expect(naive.duration).toBeGreaterThanOrEqual(wave0.min);
    expect(naive.duration).toBeLessThanOrEqual(wave0.max);
    expect(naive.waveBounds.length).toBeGreaterThan(1);
    expect(naive.waveBounds.map((w) => w.atom)).toEqual([
      'inspect.tools_list',
      'poison.follow_through',
      'temporal.rug_pull',
      'protocol.unlisted_call',
    ]);
    for (let i = 1; i < naive.waveBounds.length; i++) {
      const gap = naive.waveBounds[i]!.t0 - naive.waveBounds[i - 1]!.t1;
      const first = naive.waveBounds[1]!.t0 - naive.waveBounds[0]!.t1;
      expect(gap).toBeCloseTo(first, 6);
    }
    const inspect = naive.beats.filter((b) => b.source.atom === 'inspect.tools_list');
    const dts: number[] = [];
    for (let i = 1; i < inspect.length; i++) {
      dts.push(inspect[i]!.t - inspect[i - 1]!.t);
    }
    const minGap = Math.min(...dts);
    expect(minGap).toBeGreaterThan(0);
    for (const dt of dts) {
      const ratio = dt / minGap;
      const restRatio = wave0.rest / 0.8;
      expect(Math.abs(ratio - 1) < 0.08 || Math.abs(ratio - restRatio) < 0.08).toBe(true);
    }
    expect(again.beats.map((b) => b.t)).toEqual(naive.beats.map((b) => b.t));
    expect(naive.beats.every((b) => b.t < naive.duration)).toBe(true);

    const task = prepassRound(load('task-only-ndjson'), { seconds: 150 });
    const live = prepassRound(load('livefire.intern.task-only-wrap-on'), { seconds: 150 });
    expect(task.duration).toBeGreaterThanOrEqual(wave0.min);
    expect(task.duration).toBeLessThanOrEqual(wave0.max);
    expect(live.duration).toBeGreaterThanOrEqual(wave2.min);
    expect(live.duration).toBeLessThanOrEqual(wave2.max);
    const seated = {
      ...load('naive-ndjson'),
      target_kind: 'docker' as const,
      container: { image_id: null, name_prefix: null },
      seat: { model: 'band-variant', template_sha256: null },
    };
    const t1 = prepassRound(seated, { seconds: 150, seed: 0 });
    expect(t1.tier).toBe(1);
    expect(t1.duration).toBeGreaterThanOrEqual(wave1.min);
    expect(t1.duration).toBeLessThanOrEqual(wave1.max);
  });

  it('stages each wave in protocol order: init, then menu, then grids, then the rest', () => {
    const round = prepassRound(load('naive-ndjson'), { seconds: 150, seed: 0 });
    const rank = (s: string) =>
      s === 'init' ? 0 : s === 'ready' ? 1 : s === 'menu' ? 2 : s === 'grid' ? 3 : 4;
    for (const bound of round.waveBounds) {
      const pack = round.beats
        .filter((b) => b.source.atom === bound.atom)
        .sort((a, b) => a.t - b.t);
      for (let i = 1; i < pack.length; i++) {
        expect(rank(pack[i]!.sprite)).toBeGreaterThanOrEqual(rank(pack[i - 1]!.sprite));
      }
      const first = (sprite: string) => pack.find((b) => b.sprite === sprite);
      const last = (sprite: string) => [...pack].reverse().find((b) => b.sprite === sprite);
      if (first('init') && first('menu')) {
        expect(last('init')!.t).toBeLessThanOrEqual(first('menu')!.t);
      }
      if (first('menu') && first('grid')) {
        expect(last('menu')!.t).toBeLessThanOrEqual(first('grid')!.t);
      }
    }
  });

  it('derives tier from the tape header, never facts', () => {
    expect(prepassRound(load('naive-ndjson'), { seconds: 150 }).tier).toBe(0);
    // docker + image_id is live even when seated; this fixture is tier 2, not 1.
    expect(prepassRound(load('calibration.docker-fixture.ollama'), { seconds: 150 }).tier).toBe(2);
    expect(prepassRound(load('livefire.intern.task-only-wrap-on'), { seconds: 150 }).tier).toBe(2);
    expect(prepassRound(load('naive-ndjson'), { seconds: 150, tier: 2 }).tier).toBe(2);
    const seated: Tape = {
      ...tapeOf([row({ seq: 1, method: 'initialize' })]),
      target_kind: 'docker',
      container: { image_id: null, name_prefix: 'arcade-*' },
      seat: { model: 'qwen2.5:7b-instruct', template_sha256: 'abc' },
    };
    expect(prepassRound(seated, { seconds: 150 }).tier).toBe(1);
  });

  it('fills the round so the last wave ends within tail of duration', () => {
    const files = readdirSync(FIXTURES).filter((f) => f.endsWith('.tape.json'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const name = file.replace(/\.tape\.json$/, '');
      const round = prepassRound(load(name), { seconds: 150 });
      const tail = DEFAULT_PATTERNS.waves.tiers[String(round.tier) as '0' | '1' | '2' | '3'].tail;
      const last = round.waveBounds[round.waveBounds.length - 1];
      expect(last, name).toBeDefined();
      expect(last!.t1, name).toBeLessThanOrEqual(round.duration + 1e-6);
      expect(round.duration - last!.t1, name).toBeLessThanOrEqual(tail + 1);
      const byWave = new Map<string, typeof round.beats>();
      for (const b of round.beats) {
        const list = byWave.get(b.source.atom) ?? [];
        list.push(b);
        byWave.set(b.source.atom, list);
      }
      for (const pack of byWave.values()) {
        const ordered = pack.slice().sort((a, b) => a.t - b.t || a.source.index - b.source.index);
        expect(ordered.map((b) => b.id)).toEqual(
          pack.sort((a, b) => a.t - b.t || a.source.index - b.source.index).map((b) => b.id),
        );
        const byClass = new Map<string, number[]>();
        for (const b of ordered) {
          const ts = byClass.get(b.sprite) ?? [];
          ts.push(b.t);
          byClass.set(b.sprite, ts);
        }
        for (const ts of byClass.values()) {
          expect(new Set(ts.map((t) => t.toFixed(6))).size).toBe(ts.length);
        }
      }
    }
  });
});
