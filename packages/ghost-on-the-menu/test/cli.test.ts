import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { loadTape } from '@mcp-arcade-cabinets/tape-core';
import { describe, expect, it, vi } from 'vitest';

import { playTape } from '../src/play';

const ROOT = path.resolve(__dirname, '../../..');

type Transcript = {
  ok: boolean;
  text: string;
  revealed: string[];
  lies: string[];
  ended: 'time' | 'lamps' | null;
  lives: number;
  leaked: boolean;
};

type PlayCli = {
  whyFailed: (t: Transcript, bot?: string) => string;
  reportPlay: (t: Transcript, bot?: string) => number;
};

type SweepCli = {
  endLabel: (ended: 'time' | 'lamps' | null) => string;
  parseTapeFile: (file: string, name: string) => unknown;
};

type SitCli = {
  endLabel: (ended: 'time' | 'lamps' | null) => string;
  gateFromSay: (text: string) => string;
  parseTapeFile: (file: string, name: string) => unknown;
};

type FilmCli = {
  parseTapeFile: (file: string, name: string) => unknown;
};

function loadFixture(name: string) {
  return loadTape(
    JSON.parse(readFileSync(path.resolve('fixtures/tapes', `${name}.tape.json`), 'utf8')),
  );
}

function run(script: string, args: string[], timeout = 8000) {
  return spawnSync(process.execPath, [path.join(ROOT, 'scripts', script), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
  });
}

async function playCli(): Promise<PlayCli> {
  return (await import(pathToFileURL(path.join(ROOT, 'scripts', 'play.mjs')).href)) as PlayCli;
}

async function sweepCli(): Promise<SweepCli> {
  return (await import(pathToFileURL(path.join(ROOT, 'scripts', 'sweep.mjs')).href)) as SweepCli;
}

async function sitCli(): Promise<SitCli> {
  return (await import(pathToFileURL(path.join(ROOT, 'scripts', 'sit.mjs')).href)) as SitCli;
}

async function filmCli(): Promise<FilmCli> {
  return (await import(pathToFileURL(path.join(ROOT, 'scripts', 'film.mjs')).href)) as FilmCli;
}

describe('CLI --help (F-755a4733)', () => {
  it('play --help prints usage flags and exits 0 without importing dist', () => {
    const r = run('play.mjs', ['--help']);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/usage:/);
    expect(r.stdout).toMatch(/--fixture/);
    expect(r.stdout).toMatch(/--bot idle\|sweeper\|reader/);
    expect(r.stdout).toMatch(/--seat mcp/);
    expect(r.stdout).toMatch(/--tier/);
    expect(r.stdout).toMatch(/--climb/);
    expect(r.stdout + r.stderr).not.toMatch(/build it first/);
    expect(r.stdout + r.stderr).not.toMatch(/dist\/play\.js/);
  });

  it('play -h is the same usage path', () => {
    const r = run('play.mjs', ['-h']);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/usage:/);
  });

  it('film --help prints film flags and exits 0 without writing frames', () => {
    const r = run('film.mjs', ['--help']);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/usage:/);
    expect(r.stdout).toMatch(/--fixture/);
    expect(r.stdout).toMatch(/--bot/);
    expect(r.stdout).toMatch(/--tier/);
    expect(r.stdout).toMatch(/--times/);
    expect(r.stdout).toMatch(/--out/);
    expect(r.stdout).not.toMatch(/frames in /);
  });

  it('sit --help prints sit flags and exits 0 without sitting a model', () => {
    const r = run('sit.mjs', ['--help']);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/usage:/);
    expect(r.stdout).toMatch(/--model/);
    expect(r.stdout).toMatch(/--fixture/);
    expect(r.stdout).toMatch(/--tier/);
    expect(r.stdout).toMatch(/--bot/);
    expect(r.stdout).toMatch(/--seat/);
    expect(r.stdout).toMatch(/--constrain/);
    expect(r.stdout).toMatch(/--say/);
    expect(r.stdout).toMatch(/--voice/);
    expect(r.stdout).toMatch(/--speed/);
    expect(r.stdout).toMatch(/--lamps/);
    expect(r.stdout).toMatch(/--ollama/);
    expect(r.stdout).toMatch(/--voice-url/);
    expect(r.stdout).not.toMatch(/\nsit /);
  });

  it('sit --ollama-url is unknown and the usage names --ollama', () => {
    const r = run('sit.mjs', ['--ollama-url', 'x']);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/unknown flag --ollama-url/);
    expect(r.stderr).toMatch(/--ollama/);
    expect(r.stdout + r.stderr).not.toMatch(/\nsit /);
  });

  it('sweep --help prints --climb and exits 0 without playing a tape', () => {
    const r = run('sweep.mjs', ['--help']);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/usage:/);
    expect(r.stdout).toMatch(/--climb/);
    expect(r.stdout).not.toMatch(/tier bot/);
    expect(r.stdout).not.toMatch(/no tapes under/);
  });
});

describe('play.mjs cabinet (F-5a0008a4)', () => {
  it('first positional other than ghost is unknown cabinet, not a missing build', () => {
    const r = run('play.mjs', ['naive-ndjson']);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/unknown cabinet naive-ndjson/);
    expect(r.stderr).toMatch(/use ghost/);
    expect(r.stderr).toMatch(/usage:/);
    expect(r.stderr).not.toMatch(/build it first/);
    expect(r.stderr).not.toMatch(/dist\/play\.js/);
  });

  it('rejects an unknown flag instead of treating it as a package', () => {
    const r = run('play.mjs', ['ghost', '--nope', '1']);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/unknown flag --nope/);
  });
});

describe('film/sit/play invalid flags (F-585f2b6e)', () => {
  it('film --bot nope names the allowed set, exits 2, writes no PNG', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'film-bot-'));
    const r = run('film.mjs', ['--bot', 'nope', '--out', tmp]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/unknown bot nope; use idle, sweeper or reader/);
    expect(readdirSync(tmp).filter((f) => f.endsWith('.png'))).toEqual([]);
  });

  it('film --times foo is a named times error, exits 2, writes no PNG', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'film-times-'));
    const r = run('film.mjs', ['--times', 'foo', '--out', tmp]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/times/);
    expect(r.stderr).not.toMatch(/TypeError/);
    expect(readdirSync(tmp).filter((f) => f.endsWith('.png'))).toEqual([]);
  });

  it('film --tier foo and --tier 4 are named tier errors, not a stack', () => {
    const foo = run('film.mjs', ['--tier', 'foo']);
    expect(foo.status).toBe(2);
    expect(foo.stderr).toMatch(/tier must be 0\.\.3/);
    expect(foo.stderr).not.toMatch(/TypeError/);
    const four = run('film.mjs', ['--tier', '4']);
    expect(four.status).toBe(2);
    expect(four.stderr).toMatch(/tier must be 0\.\.3 \(got 4\)/);
  });

  it('sit --bot idleee names the allowed set and exits 2', () => {
    const r = run('sit.mjs', ['--bot', 'idleee']);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/unknown bot idleee; use idle, sweeper or reader/);
  });

  it('sit --seat only prompt|mcp', () => {
    const r = run('sit.mjs', ['--seat', 'boss']);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/unknown seat boss; use prompt or mcp/);
  });

  it('sit --tier 4, --lamps, --voice are named errors', () => {
    const tier = run('sit.mjs', ['--tier', '4']);
    expect(tier.status).toBe(2);
    expect(tier.stderr).toMatch(/tier must be 0\.\.3/);
    const lamps = run('sit.mjs', ['--lamps', 'maybe']);
    expect(lamps.status).toBe(2);
    expect(lamps.stderr).toMatch(/unknown lamps maybe; use keep or lose/);
    const voice = run('sit.mjs', ['--voice', 'nope']);
    expect(voice.status).toBe(2);
    expect(voice.stderr).toMatch(/unknown voice nope; use auto, on or off/);
  });

  it('play --bot nope names the allowed set and exits 2, not a stack', () => {
    const r = run('play.mjs', ['ghost', '--bot', 'nope']);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/unknown bot nope; use idle, sweeper or reader/);
    expect(r.stderr).not.toMatch(/TypeError/);
    expect(r.stderr).not.toMatch(/at /);
  });

  it('play --tier 4 is a named error; --seat prompt is refused', () => {
    const tier = run('play.mjs', ['ghost', '--tier', '4']);
    expect(tier.status).toBe(2);
    expect(tier.stderr).toMatch(/tier must be 0\.\.3 \(got 4\)/);
    const seat = run('play.mjs', ['ghost', '--seat', 'prompt']);
    expect(seat.status).toBe(2);
    expect(seat.stderr).toMatch(/unknown seat prompt; use mcp/);
  });
});

describe('play.mjs failed why (F-6424a635)', () => {
  it('names leaked vs reader missed on stderr, not only round complete', async () => {
    const { whyFailed, reportPlay } = await playCli();
    const leaked = playTape(loadFixture('naive-ndjson'), { fixture: 'tape-9', bot: 'idle' });
    expect(leaked.leaked).toBe(true);
    expect(leaked.ok).toBe(false);
    const leakedWhy = whyFailed(leaked, 'idle');
    expect(leakedWhy).toMatch(/leaked/);
    expect(leakedWhy).not.toMatch(/reader missed/);

    const missed: Transcript = {
      ok: false,
      leaked: false,
      ended: 'time',
      lives: 3,
      revealed: [],
      lies: ['poison.follow_through:0', 'temporal.rug_pull:0'],
      text: 'Ghost on the Menu\ntape x fixture y policy z bot reader\nround complete\nrevealed: none',
    };
    const missedWhy = whyFailed(missed, 'reader');
    expect(missedWhy).toMatch(/reader missed poison\.follow_through:0, temporal\.rug_pull:0/);
    expect(missedWhy).not.toMatch(/leaked/);

    const under: Transcript = {
      ...missed,
      revealed: ['a'],
      lies: ['a', 'b', 'c'],
      text: 'Ghost on the Menu\ntape x\nround complete\nrevealed: a',
    };
    expect(whyFailed(under, 'sweeper')).toMatch(/sweeper under half \(1\/3\)/);

    const lamps: Transcript = {
      ...missed,
      ended: 'lamps',
      revealed: missed.lies,
      text: 'Ghost on the Menu\ntape x\nround complete\nrevealed: all',
    };
    expect(whyFailed(lamps, 'reader')).toMatch(/ended=lamps/);

    const threw: Transcript = {
      ...missed,
      revealed: missed.lies,
      text: 'Ghost on the Menu\ntape x\nround complete\nrevealed: all\nseat threw',
    };
    expect(whyFailed(threw, 'reader')).toMatch(/seat threw/);

    const overrun: Transcript = {
      ...missed,
      revealed: missed.lies,
      text: 'Ghost on the Menu\ntape x\nround complete\nrevealed: all',
    };
    expect(whyFailed(overrun, 'reader')).toMatch(/overrun/);

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(reportPlay(leaked, 'idle')).toBe(1);
      const stdout = log.mock.calls.map((c) => String(c[0])).join('\n');
      const stderr = err.mock.calls.map((c) => String(c[0])).join('\n');
      expect(stdout).toMatch(/FAILED/);
      expect(stdout).not.toMatch(/^round complete$/m);
      expect(stderr).toMatch(/leaked/);
      err.mockClear();
      expect(reportPlay(missed, 'reader')).toBe(1);
      expect(err.mock.calls.map((c) => String(c[0])).join('\n')).toMatch(/reader missed/);
    } finally {
      log.mockRestore();
      err.mockRestore();
    }
  });
});

describe('sweep end column (F-a27ffe6a)', () => {
  it('prints time/lamps/clear, never the string null, with a legend word', async () => {
    const { endLabel } = await sweepCli();
    const idleLamps = playTape(loadFixture('naive-ndjson'), {
      fixture: 'naive-ndjson',
      bot: 'idle',
      tier: 1,
    });
    expect(idleLamps.ended).toBe('lamps');
    expect(endLabel(idleLamps.ended)).toBe('lamps');

    const reader = playTape(loadFixture('naive-ndjson'), {
      fixture: 'naive-ndjson',
      bot: 'reader',
    });
    const clearOrTime = endLabel(reader.ended);
    expect(['time', 'clear']).toContain(clearOrTime);

    const table = [endLabel('lamps'), endLabel(null), endLabel('time')].join(' ');
    expect(table).toBe('lamps clear time');
    expect(table).not.toMatch(/null/);
    expect(endLabel(null)).toBe('clear');

    const src = readFileSync(path.join(ROOT, 'scripts', 'sweep.mjs'), 'utf8');
    expect(src).toMatch(/end: time \| lamps \| clear/);
    expect(src).toMatch(/endLabel\(r\.ended\)/);
    expect(src).not.toMatch(/pad\(r\.ended,/);
    expect(src).toMatch(/mean lost/);
    expect(src).toMatch(/lamps: mean lamps lost of 3; revealed: found\/present/);
    expect(src).not.toMatch(/\\ntier\/bot\s+tapes dead\s+lamps\s+revealed/);
  });
});

describe('play.mjs unknown fixture before dist (F-d6b1613b)', () => {
  it('unknown fixture is exit 2 with the roster, not a missing build', () => {
    const r = run('play.mjs', ['ghost', '--fixture', 'nope']);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/unknown fixture nope; have:/);
    expect(r.stderr).not.toMatch(/dist\/play\.js/);
    expect(r.stderr).not.toMatch(/build it first/);
  });
});

describe('sit GATE_FIX parenthetical (F-7cbaf3ac)', () => {
  it('captures the whole refused-it sentence, not the first word', async () => {
    const { gateFromSay } = await sitCli();
    const repeat = gateFromSay(
      'the gate refused it (that line was just said); the boss says one of its own instead',
    );
    const forbidden = gateFromSay(
      'the gate refused it (that kind of word is not allowed); the boss says one of its own instead',
    );
    const digit = gateFromSay('the gate refused it (a digit is not allowed)');
    expect(repeat).toBe('that line was just said');
    expect(forbidden).toBe('that kind of word is not allowed');
    expect(repeat).not.toBe(forbidden);
    expect(`refused: ${repeat}`).not.toMatch(/^refused: that$/);
    expect(`refused: ${forbidden}`).not.toMatch(/^refused: that$/);
    expect(digit).toBe('a digit is not allowed');
    expect(`refused: ${digit}`).not.toMatch(/^refused: a$/);
  });
});

describe('sit round ended (F-b89aaec9)', () => {
  it('prints time|lamps|clear, never the word null', async () => {
    const { endLabel } = await sitCli();
    expect(endLabel(null)).toBe('clear');
    expect(`round ended by ${endLabel(null)}`).toBe('round ended by clear');
    expect(`round ended by ${endLabel(null)}`).not.toMatch(/null/);
    expect(endLabel('lamps')).toBe('lamps');
    expect(endLabel('time')).toBe('time');
    const src = readFileSync(path.join(ROOT, 'scripts', 'sit.mjs'), 'utf8');
    expect(src).toMatch(/round ended by \$\{endLabel\(state\.ended\)\}/);
    expect(src).not.toMatch(/round ended by \$\{state\.ended\}/);
  });
});

describe('film/sit/sweep bad json (F-bdd1f83e)', () => {
  it('names the fixture and does not dump a stack', async () => {
    const film = await filmCli();
    const sit = await sitCli();
    const sweep = await sweepCli();
    const tmp = path.join(os.tmpdir(), `tape-bdd1f83e-${process.pid}.json`);
    writeFileSync(tmp, '{"schema_id":');
    try {
      for (const [name, parse] of [
        ['film', film.parseTapeFile],
        ['sit', sit.parseTapeFile],
        ['sweep', sweep.parseTapeFile],
      ] as const) {
        expect(() => parse(tmp, 'naive-ndjson'), name).toThrow(/fixture naive-ndjson: bad json/);
        try {
          parse(tmp, 'naive-ndjson');
        } catch (err) {
          expect(String(err)).not.toMatch(/SyntaxError/);
          expect(String(err)).not.toMatch(/at /);
        }
      }
    } finally {
      unlinkSync(tmp);
    }
    const srcFilm = readFileSync(path.join(ROOT, 'scripts', 'film.mjs'), 'utf8');
    const srcSit = readFileSync(path.join(ROOT, 'scripts', 'sit.mjs'), 'utf8');
    const srcSweep = readFileSync(path.join(ROOT, 'scripts', 'sweep.mjs'), 'utf8');
    for (const src of [srcFilm, srcSit, srcSweep]) {
      expect(src).toMatch(/parseTapeFile\(/);
      expect(src).toMatch(/process\.exit\(2\)/);
    }
  });
});

describe('film last frame and empty times (F-94a60d0e)', () => {
  it('uses real tape furniture, not server x', () => {
    const src = readFileSync(path.join(ROOT, 'scripts', 'film.mjs'), 'utf8');
    expect(src).toMatch(/server \$\{tape\.server_name/);
    expect(src).toMatch(/policy \$\{tape\.agent_policy\}/);
    expect(src).not.toMatch(/server x/);
    expect(src).not.toMatch(/policy y/);
    expect(src).toMatch(/no frames \(round ended at t=/);
  });

  it('--times past duration still writes an end-scene frame or exits 2', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'film-times-past-'));
    const r = run(
      'film.mjs',
      ['--fixture', 'naive-ndjson', '--bot', 'idle', '--tier', '1', '--times', '200', '--out', tmp],
      30000,
    );
    const pngs = readdirSync(tmp).filter((f) => f.endsWith('.png'));
    if (pngs.length === 0) {
      expect(r.status).toBe(2);
      expect(r.stderr).toMatch(/no frames \(round ended at t=/);
      expect(r.stdout).not.toMatch(/frames in /);
    } else {
      expect(r.status, r.stderr).toBe(0);
      expect(pngs.length).toBeGreaterThan(0);
    }
  });
});
