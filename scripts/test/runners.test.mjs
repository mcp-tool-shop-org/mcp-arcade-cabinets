// The development runners under scripts/: the frame loop's cap, the screen
// gates on both acceptance paths, and the boundary that keeps a stack off the
// terminal. Each case here is red against the code as it stood before the
// amend wave.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import { MAX_TICKS, hex, parseTimes, runFrames } from '../film.mjs';
import { inspectScreen, reportPlay, typerScreenHit } from '../play.mjs';
import { chatRow, leaksIn, toastRow } from '../transcript.mjs';
import { lineFor, voiceFor } from '../voice.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

function run(script, args, timeout = 30000) {
  return spawnSync(process.execPath, [path.join(ROOT, 'scripts', script), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
  });
}

const GHOST_OK = [
  'Ghost on the Menu',
  'tape bout_GOLDEN fixture naive-ndjson policy naive server mcp-arcade-fixture bot reader',
  'round complete',
  'Same experiment, same guests, different evening.',
  'naive-ndjson',
  'server mcp-arcade-fixture',
  'policy naive',
  'revealed: poison.follow_through:followed:14',
].join('\n');

describe('film frame loop is capped (F-0ba2e84d)', () => {
  it('a round that neither ends nor reaches its time stops with the tick count', () => {
    // The old loop had no cap at all: `--times 99999`, or a stepRound that
    // stopped setting `scene`, span forever with no output.
    const state = { t: 0, scene: null };
    const writeFrame = vi.fn();
    expect(() =>
      runFrames({
        state,
        times: [99999],
        step: () => {
          state.t += 1 / 30;
        },
        writeFrame,
        maxTicks: 500,
      }),
    ).toThrow(/did not end after 500 frames/);
    expect(writeFrame).not.toHaveBeenCalled();
    expect(MAX_TICKS).toBeGreaterThan(1000);
  });

  it('a round that does reach its times still writes every frame', () => {
    const state = { t: 0, scene: null };
    const written = [];
    const frames = runFrames({
      state,
      times: [1, 2],
      step: () => {
        state.t += 1 / 30;
      },
      writeFrame: (label) => written.push(label),
    });
    expect(frames).toBe(2);
    expect(written).toEqual([1, 2]);
  });
});

describe('film --times rejects empty and negative entries (F-0ba2e84d)', () => {
  it('an empty entry is not zero and a negative one is not a frame name', () => {
    expect(parseTimes('3,8,12')).toEqual([3, 8, 12]);
    expect(parseTimes(' 3 , 8 ')).toEqual([3, 8]);
    // `''.split(',')` is one empty entry and `Number('')` is 0, so the old
    // check let `--times=` through as [0]; padStart over '-1' named a frame
    // `<fixture>.t0-1.png`.
    expect(() => parseTimes('')).toThrow(/times must be/);
    expect(() => parseTimes('3,,8')).toThrow(/no empty entry/);
    expect(() => parseTimes('-1')).toThrow(/never negative/);
    expect(() => parseTimes('foo')).toThrow(/finite numbers/);
    expect(() => parseTimes('')).toThrow(/^(?!.*TypeError).*$/s);
  });
});

describe('film hex names an unparsed color (F-0ba2e84d)', () => {
  it('parses what the renderer sets and refuses what it does not', () => {
    expect(hex('#ff00ff')).toEqual([255, 0, 255, 1]);
    expect(hex('rgba(76, 76, 106, 0.55)')).toEqual([76, 76, 106, 0.55]);
    expect(hex('rgb(1, 2, 3)')).toEqual([1, 2, 3, 1]);
    // It used to return magenta for anything it could not read, so a renderer
    // color regression showed up as a pink frame rather than as a failure.
    expect(() => hex('white')).toThrow(/renderer color not understood/);
    expect(() => hex('#abc')).toThrow(/renderer color not understood/);
  });
});

describe('the screen slicer refuses a transcript it cannot read (F-bb46112a)', () => {
  it('a missing footer marker is a failure to inspect, not a wider window', () => {
    const cut = [
      'Ghost on the Menu',
      'tape x fixture y policy z',
      'round complete',
      'a clean line',
    ];
    const seen = inspectScreen(cut.join('\n'), 'revealed:');
    expect(seen.ok).toBe(false);
    expect(seen.why).toMatch(/no revealed: line/);
    expect(seen.hit).toBeNull();
    // The old slicer ran to the end of the text here, so a footer line that is
    // allowed to carry digits was scanned as if it were screen, and a screen
    // that leaked in a cut-short transcript was reported against furniture.
    const withFooter = inspectScreen([...cut, 'revealed: poison:14'].join('\n'), 'revealed:');
    expect(withFooter.ok).toBe(true);
    expect(withFooter.hit).toBeNull();
    expect(withFooter.screen).toEqual(['a clean line']);
  });

  it('the header is furniture: its tape id and fixture name are never scanned', () => {
    const seen = inspectScreen(GHOST_OK, 'revealed:');
    expect(seen.ok).toBe(true);
    expect(seen.hit).toBeNull();
  });

  it('a transcript shorter than its own header cannot be inspected', () => {
    const seen = inspectScreen('fixture nope: bad json', 'revealed:');
    expect(seen.ok).toBe(false);
    expect(seen.why).toMatch(/shorter than its own header/);
  });

  it('the typer slicer is the same slicer', () => {
    const lines = [
      'Vibe Typer',
      'level cat-website stack bash tier easy bot perfect seed 1 endless no',
      'level shipped',
      'product a website for my cat',
      'valuation: 26',
    ];
    expect(typerScreenHit(lines.join('\n'))).toBeNull();
    lines[3] = 'product 3 cats';
    expect(typerScreenHit(lines.join('\n'))).toBe('3');
  });
});

describe('the ghost path gates on the printed transcript (F-dbfda755)', () => {
  const quiet = () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    return {
      stderr: () => err.mock.calls.map((c) => String(c[0])).join('\n'),
      stop: () => {
        log.mockRestore();
        err.mockRestore();
      },
    };
  };

  it('a clean transcript the cabinet called ok still passes', () => {
    const q = quiet();
    try {
      expect(reportPlay({ ok: true, text: GHOST_OK, leaked: false }, 'reader')).toBe(0);
    } finally {
      q.stop();
    }
  });

  it('a word on the screen fails the run even when the cabinet said ok', () => {
    // The cabinet's own detector reads ctx.texts; this one reads what was
    // printed. Before the fix `pnpm test:play ghost` could not fail on a word
    // its detector missed — the vibe path had this gate and the ghost path
    // did not.
    const leaky = GHOST_OK.replace(
      'Same experiment, same guests, different evening.',
      'Same experiment, 2 guests, different evening.',
    );
    const q = quiet();
    try {
      expect(reportPlay({ ok: true, text: leaky, leaked: false }, 'reader')).toBe(1);
      expect(q.stderr()).toMatch(/leaked \(2\)/);
    } finally {
      q.stop();
    }
  });

  it('a transcript with no footer fails rather than passing uninspected', () => {
    const q = quiet();
    try {
      const cut = GHOST_OK.split('\n').slice(0, 4).join('\n');
      expect(reportPlay({ ok: true, text: cut, leaked: false }, 'reader')).toBe(1);
      expect(q.stderr()).toMatch(/cannot inspect the screen/);
    } finally {
      q.stop();
    }
  });
});

describe('the runners never print a stack (F-0bf55e37)', () => {
  it('film with an unwritable out directory names the failure', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'film-out-'));
    const notADir = path.join(dir, 'taken');
    writeFileSync(notADir, 'this is a file, not a directory');
    const r = run('film.mjs', ['--out', notADir]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).not.toMatch(/^\s+at /m);
    expect(r.stderr).not.toMatch(/node:internal/);
    expect(r.stderr.trim().split('\n').length).toBeLessThanOrEqual(2);
  });
});

describe('voice names its pattern files and personas (F-df9afb08)', () => {
  it('an unknown flag and a bad port are exit 2, not a silent default', () => {
    const unknown = run('voice.mjs', ['--por', '7788']);
    expect(unknown.status).toBe(2);
    expect(unknown.stderr).toMatch(/unknown flag --por/);
    const eqForm = run('voice.mjs', ['--port=abc', '--check']);
    expect(eqForm.status).toBe(2);
    expect(eqForm.stderr).toMatch(/--port wants 1-65535, got abc/);
    expect(eqForm.stderr).not.toMatch(/no voice worker/);
    const help = run('voice.mjs', ['--help']);
    expect(help.status, help.stderr).toBe(0);
    expect(help.stdout).toMatch(/usage: pnpm voice/);
  });

  it('a renamed persona or a moved line names itself instead of throwing', () => {
    expect(voiceFor({ boss: { menu: { voice: { preset: 'x' } } } }, 'menu')).toEqual({
      preset: 'x',
    });
    expect(() => voiceFor({ boss: {} }, 'menu')).toThrow(
      /personas\.json has no voice for the menu/,
    );
    expect(() => voiceFor({}, 'doorman')).toThrow(/no voice for the doorman/);
    expect(lineFor({ boss: { menu: ['a line'] } }, 'menu')).toBe('a line');
    expect(() => lineFor({ boss: { menu: [] } }, 'menu')).toThrow(/voice\.json has no line/);
  });
});

describe('the transcript runner reads a whole run (C-w1-05)', () => {
  it('a chat row carries who, the check-in, the beat and the level', () => {
    const row = chatRow({ level: 2, at: 12.25, beat: 'code', who: 'agent', line: 'on it' });
    expect(row).toMatch(/lvl {2}2/);
    expect(row).toMatch(/t {3}12\.3/);
    expect(row).toMatch(/code/);
    expect(row).toMatch(/agent/);
    expect(row).toMatch(/on it$/);
    expect(row).not.toMatch(/check-in/);
    const nag = chatRow({
      level: 1,
      at: 1,
      beat: 'code',
      who: 'user',
      line: 'how goes',
      nag: true,
    });
    expect(nag).toMatch(/check-in/);
    expect(toastRow({ at: 3, what: 'milestone first payday' })).toMatch(
      /t {4}3\.0 {2}milestone first payday/,
    );
  });

  it('it reads what it printed: a line the screen may not carry is named', () => {
    expect(leaksIn(['a clean line', 'the build hums along'])).toEqual([]);
    expect(leaksIn(['2 cats reviewed'])[0]).toMatch(/^2 in /);
    expect(leaksIn(['the score is in'])[0]).toMatch(/^score in /);
  });

  it('usage and an unknown flag behave like every other runner', () => {
    const help = run('transcript.mjs', ['--help']);
    expect(help.status, help.stderr).toBe(0);
    expect(help.stdout).toMatch(/usage: pnpm transcript/);
    expect(help.stdout).toMatch(/--all-levels/);
    expect(help.stdout).toMatch(/--self-check/);
    const bad = run('transcript.mjs', ['vibe-typer', '--nope', '1']);
    expect(bad.status).toBe(2);
    expect(bad.stderr).toMatch(/unknown flag --nope/);
    const cabinet = run('transcript.mjs', ['house-call']);
    expect(cabinet.status).toBe(2);
    expect(cabinet.stderr).toMatch(/unknown cabinet house-call/);
    const mixed = run('transcript.mjs', ['ghost', '--all-levels']);
    expect(mixed.status).toBe(2);
    expect(mixed.stderr).toMatch(/ghost takes no --all-levels/);
  });

  it('--self-check plays one short level and reads it back clean', () => {
    const r = run('transcript.mjs', ['--self-check'], 180000);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/self-check: \d+ lines, no leak/);
    expect(r.stdout).toMatch(/^lvl {2}1 .*user/m);
    expect(r.stdout).toMatch(/^end: /m);
    expect(r.stderr).not.toMatch(/^\s+at /m);
  }, 180000);
});
