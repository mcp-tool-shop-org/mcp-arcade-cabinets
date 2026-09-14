import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadTape } from '@mcp-arcade-cabinets/tape-core';

import { play, playTape } from '../src/play';

const FORBIDDEN = /\b(nrp|integrity|utility|attack_success|pass|fail)\b|1\.00/i;

function loadFixture(name: string) {
  return loadTape(
    JSON.parse(readFileSync(path.resolve('fixtures/tapes', `${name}.tape.json`), 'utf8')),
  );
}

describe('scripted bot', () => {
  it('clears naive-ndjson (leak + answered ghost + changed menu)', async () => {
    const out = await play({ fixture: 'naive-ndjson' });
    expect(out.text).not.toMatch(FORBIDDEN);
    expect(out.text).toMatch(/round complete/);
    expect(out.text).toMatch(/followed/);
    expect(out.text).toMatch(/ghost_answered/);
    expect(out.text).toMatch(/menu_changed/);
    expect(out.leaked).toBe(false);
    expect(out.ok).toBe(true);
  });

  it('clears task-only-ndjson (answered ghost + changed menu)', async () => {
    const out = await play({ fixture: 'task-only-ndjson' });
    expect(out.text).not.toMatch(FORBIDDEN);
    expect(out.text).toMatch(/ghost_answered/);
    expect(out.text).toMatch(/menu_changed/);
    expect(out.text).not.toMatch(/followed/);
    expect(out.leaked).toBe(false);
    expect(out.ok).toBe(true);
  });

  it('flies the livefire task-only wrap-on tape with zero lies', async () => {
    const out = await play({ fixture: 'livefire.intern.task-only-wrap-on' });
    expect(out.text).not.toMatch(FORBIDDEN);
    expect(out.text).toMatch(/round complete/);
    expect(out.text).toMatch(/revealed: none/);
    expect(out.leaked).toBe(false);
    expect(out.ok).toBe(true);
  });
});

describe('screen leak crash-path', () => {
  it('landSay strips a digit from bossSay before it can reach the screen', () => {
    const landed: string[] = [];
    const out = playTape(loadFixture('naive-ndjson'), {
      fixture: 'naive-ndjson',
      bot: 'idle',
      immortal: true,
      seat: {
        frame(live) {
          if (live.state.caption?.kind === 'aside') landed.push(live.state.caption.text);
          if (live.state.scene || !live.state.boss?.alive) return;
          live.state.bossSay = { text: 'lane 7', at: live.state.t };
        },
        summary: () => [],
      },
    });
    expect(landed.some((t) => /lane/.test(t))).toBe(true);
    expect(landed.every((t) => !/\d/.test(t))).toBe(true);
    expect(out.leaked).toBe(false);
  });

  it("marks leaked and not ok when landSay of 'followed' reaches the screen", () => {
    const out = playTape(loadFixture('naive-ndjson'), {
      fixture: 'naive-ndjson',
      bot: 'idle',
      immortal: true,
      seat: {
        frame(live) {
          if (live.state.scene || !live.state.boss?.alive) return;
          live.state.bossSay = { text: 'followed', at: live.state.t };
        },
        summary: () => [],
      },
    });
    expect(out.leaked).toBe(true);
    expect(out.ok).toBe(false);
  });

  it('marks leaked and not ok when furniture carries a digit', () => {
    const out = playTape(loadFixture('naive-ndjson'), { fixture: 'tape-9', bot: 'idle' });
    expect(out.leaked).toBe(true);
    expect(out.ok).toBe(false);
  });
});

describe('climb', () => {
  it('play({ climb: 1 }) reaches playTape with climb 1', async () => {
    const names = [
      'naive-ndjson',
      'task-only-ndjson',
      'docker-fixture.naive',
      'livefire.intern.naive-wrap-on',
    ];
    let picked:
      | {
          name: string;
          climbed: ReturnType<typeof playTape>;
        }
      | undefined;
    for (const name of names) {
      const tape = loadFixture(name);
      const opts = { fixture: name, bot: 'sweeper' as const, tier: 2 as const };
      const alone = playTape(tape, opts);
      const climbed = playTape(tape, { ...opts, climb: 1 });
      if (
        climbed.lives !== alone.lives ||
        climbed.ended !== alone.ended ||
        climbed.revealed.join() !== alone.revealed.join()
      ) {
        picked = { name, climbed };
        break;
      }
    }
    expect(picked, 'climb must change at least one listed tape').toBeDefined();
    const via = await play({ fixture: picked!.name, bot: 'sweeper', tier: 2, climb: 1 });
    expect(via.lives).toBe(picked!.climbed.lives);
    expect(via.ended).toBe(picked!.climbed.ended);
    expect(via.revealed).toEqual(picked!.climbed.revealed);
    expect(via.leaked).toBe(false);
  });
});
