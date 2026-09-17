import * as fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadTape } from '@mcp-arcade-cabinets/tape-core';

import { play, playTape } from '../src/play';

const FORBIDDEN = /\b(nrp|integrity|utility|attack_success|pass|fail)\b|1\.00/i;

function loadFixture(name: string) {
  return loadTape(
    JSON.parse(fs.readFileSync(path.resolve('fixtures/tapes', `${name}.tape.json`), 'utf8')),
  );
}

describe('play() load failures', () => {
  it('returns ok:false for a missing fixture, never a path', async () => {
    const out = await play({ fixture: 'no-such-tape' });
    expect(out.ok).toBe(false);
    expect(out.text).toMatch(/fixture no-such-tape: missing/);
    expect(out.text).not.toMatch(/ENOENT/);
    expect(out.text).not.toMatch(/[A-Za-z]:\\/);
    expect(out.text).not.toMatch(/C:\\Users/);
  });

  it('returns ok:false for an invalid name, truncated JSON, and a receipt-shaped doc', async () => {
    const slash = await play({ fixture: 'foo/bar' });
    expect(slash.ok).toBe(false);
    expect(slash.text).toMatch(/invalid name/);
    const nul = await play({ fixture: 'foo\0bar' });
    expect(nul.ok).toBe(false);
    expect(nul.text).toMatch(/invalid name/);

    const dir = path.resolve('fixtures/tapes');
    const truncPath = path.join(dir, '_tmp_trunc.tape.json');
    const receiptPath = path.join(dir, '_tmp_receipt.tape.json');
    fs.writeFileSync(truncPath, '{');
    fs.writeFileSync(
      receiptPath,
      JSON.stringify({ schema_id: 'mcp-arcade.bout/v1', bout_id: 'bout_x', scores: { nrp: 1 } }),
    );
    try {
      const trunc = await play({ fixture: '_tmp_trunc' });
      expect(trunc.ok).toBe(false);
      expect(trunc.text).toMatch(/fixture _tmp_trunc: bad json/);
      expect(trunc.text).not.toMatch(/SyntaxError/);
      const receipt = await play({ fixture: '_tmp_receipt' });
      expect(receipt.ok).toBe(false);
      expect(receipt.text).toMatch(/fixture _tmp_receipt:/);
      expect(receipt.text).not.toMatch(/ENOENT/);
    } finally {
      fs.unlinkSync(truncPath);
      fs.unlinkSync(receiptPath);
    }
  });
});

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
    // Immortal: this tape derives to live, where no scripted bot lives out a
    // round since the 2026-09-17 tune, and the play-through here is about
    // the tape (zero lies, nothing revealed, no leak), not about a bot.
    const out = await play({ fixture: 'livefire.intern.task-only-wrap-on', immortal: true });
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

  it("drops landSay of 'followed' so it never reaches the screen", () => {
    const landed: string[] = [];
    const out = playTape(loadFixture('naive-ndjson'), {
      fixture: 'naive-ndjson',
      bot: 'idle',
      immortal: true,
      seat: {
        frame(live) {
          if (live.state.caption?.kind === 'aside') landed.push(live.state.caption.text);
          if (live.state.scene || !live.state.boss?.alive) return;
          live.state.bossSay = { text: 'followed', at: live.state.t };
        },
        summary: () => [],
      },
    });
    expect(landed.every((t) => !/followed/i.test(t))).toBe(true);
    expect(out.leaked).toBe(false);
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
