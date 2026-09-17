import * as fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadTape } from '@mcp-arcade-cabinets/tape-core';

import { loadRoster, play, playTape } from '../src/play';

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

// Stage C. What a transcript carries: the round's own words, a reason a
// consumer can read without string-matching prose, a refusal that is scanned
// rather than asserted clean, and a fixture directory that is the repo's
// wherever the process happens to be standing.
describe('what a play-through hands back', () => {
  it('keeps every word the round said, not only the last frame', async () => {
    // The frame loop reassigned `lastTexts` every tick, so the only rendered
    // text that survived was the end scene: every wave card, catch word,
    // aside and boss line was rendered, scanned and thrown away — which is
    // the whole content of the humanization work.
    const out = await play({ fixture: 'naive-ndjson', bot: 'reader' });
    const rows = out.text
      .split('\n')
      .filter((l) => /^ {2}(wave|catch|aside|lamp|boss|scene|ending) · /.test(l));
    expect(rows.length).toBeGreaterThan(3);
    // The cards come before the marker, where the runner's screen scan looks.
    const marker = out.text.split('\n').findIndex((l) => l.startsWith('revealed:'));
    const first = out.text.split('\n').findIndex((l) => /^ {2}wave · /.test(l));
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(marker);
    // A wave card carries its authored line under its headline word.
    expect(rows.some((l) => l.includes(' — '))).toBe(true);
    expect(out.leaked).toBe(false);
  });

  // The two transcript builders used to disagree about their own shapes: bare
  // spaces in one header where the rest of the package uses ' · ', and
  // `revealed:` meaning a list of ids in one footer and a pair of counts in
  // the other, in two footers a reader compares side by side.
  it('joins both headers the same way and keeps one meaning for revealed:', async () => {
    const tape = await play({ fixture: 'naive-ndjson', bot: 'reader' });
    const tapeHeader = tape.text.split('\n')[1]!;
    expect(tapeHeader.split(' · ').length).toBe(5);
    expect(tapeHeader).toMatch(/^tape \S+ · fixture /);

    const endless = await play({ endless: true, bot: 'idle', seed: 4, calls: 2, tier: 2 });
    const endlessHeader = endless.text.split('\n')[1]!;
    expect(endlessHeader.split(' · ').length).toBe(5);
    expect(endlessHeader.startsWith('endless · rung ')).toBe(true);

    // `revealed:` is the id list on both, and the endless counts get their own
    // line and their own words.
    for (const t of [tape, endless]) {
      const marker = t.text.split('\n').find((l) => l.startsWith('revealed:'))!;
      expect(marker).toBeDefined();
      expect(marker).not.toMatch(/caught|put down/);
    }
    expect(endless.text).toMatch(/^caught: \d+ · put down: \d+$/m);
  });

  // The structured fields used to be an empty array on every endless run,
  // beside a footer that said how many were caught: a band test reading the
  // machine-readable field — which is what the interface comment invites —
  // got zero where the text said five.
  it('fills the endless run structured revealed and lies for real', async () => {
    const out = await play({ endless: true, bot: 'reader', seed: 9, calls: 3, tier: 2 });
    expect(out.lies.length).toBeGreaterThan(0);
    expect(out.revealed.length).toBeGreaterThan(0);
    const lies = new Set(out.lies);
    for (const id of out.revealed) expect(lies.has(id)).toBe(true);
    const marker = out.text.split('\n').find((l) => l.startsWith('revealed:'))!;
    expect(marker).toBe(`revealed: ${out.revealed.join(', ')}`);

    // The printed rows carry no clock — they sit inside the region the screen
    // scan reads, and a digit there is a leak — so the clock is a field. Both
    // shipping transcripts hand it over.
    expect(out.said.length).toBeGreaterThan(0);
    for (const row of out.said) expect(Number.isFinite(row.at)).toBe(true);
    expect(out.said.some((r) => r.at > 0)).toBe(true);
  });

  it('names the reason in a field rather than only in prose', async () => {
    const good = await play({ fixture: 'naive-ndjson', bot: 'reader' });
    expect(good.ok).toBe(true);
    expect(['complete', 'time', 'lamps']).toContain(good.why);

    const missing = await play({ fixture: 'no-such-tape' });
    expect(missing.ok).toBe(false);
    expect(missing.why).toBe('load');

    const bad = await play({ fixture: 'naive-ndjson', bot: 'no-such-bot' });
    expect(bad.why).toBe('load');
  });

  it('counts what the seat did instead of describing it', async () => {
    let frames = 0;
    const out = await play({
      fixture: 'naive-ndjson',
      bot: 'reader',
      seat: {
        frame() {
          frames += 1;
          if (frames === 3) throw new Error('seat');
        },
        summary: () => [],
      },
    });
    expect(out.ok).toBe(false);
    expect(out.why).toBe('seat-threw');
    expect(out.seat).toEqual({ calls: 3, throws: 1, brokeAt: 3 });
  });

  it('scans its own refusal text rather than asserting it clean', async () => {
    // A loader refusal used to quote the very word it had just refused, and
    // loadFail hard-coded `leaked: false` over it.
    const dir = path.resolve('fixtures/tapes');
    const file = path.join(dir, '_tmp_verdict.tape.json');
    const raw = JSON.parse(
      fs.readFileSync(path.join(dir, 'naive-ndjson.tape.json'), 'utf8'),
    ) as Record<string, unknown>;
    raw.server_name = 'acme pass labs';
    fs.writeFileSync(file, JSON.stringify(raw));
    try {
      const out = await play({ fixture: '_tmp_verdict' });
      expect(out.ok).toBe(false);
      expect(out.leaked).toBe(false);
      expect(out.text).not.toMatch(/\bpass\b/i);
      expect(out.text).not.toMatch(/\d/);
      expect(out.text).toMatch(/verdict word/);
    } finally {
      fs.rmSync(file, { force: true });
    }
  });

  it('finds the fixtures from the module, not from the process cwd', () => {
    const here = process.cwd();
    try {
      process.chdir(path.resolve('packages/ghost-on-the-menu'));
      // Run from the package directory, every fixture in the repo used to be
      // 'missing under fixtures/tapes' and the endless roster came up empty.
      expect(loadRoster().length).toBeGreaterThan(0);
    } finally {
      process.chdir(here);
    }
  });

  it('never puts a home path in a load failure', async () => {
    const here = process.cwd();
    try {
      process.chdir(path.resolve('packages/ghost-on-the-menu'));
      const out = await play({ fixture: 'no-such-tape' });
      expect(out.text).toMatch(/missing under/);
      expect(out.text).not.toMatch(/[A-Za-z]:\\/);
      expect(out.text).not.toMatch(/C:\\Users/);
      // The directory is named as the repo holds it, not as an absolute path
      // and not as though it were relative to wherever the reader is standing.
      expect(out.text).toContain("the repo's fixtures/tapes");
    } finally {
      process.chdir(here);
    }
  });
});
