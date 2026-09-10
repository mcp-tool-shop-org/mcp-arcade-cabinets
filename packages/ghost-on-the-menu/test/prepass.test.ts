import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadTape, type Tape, type TapeRow } from '@mcp-arcade-cabinets/tape-core';

import { CABINET, VISIBLE_MAX, fillFor, prepassRound } from '../src/index';

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
});
