import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TAPES,
  firstLeak,
  integrationFrom,
  leakWhy,
  parseBot,
  play,
  seedFromTape,
  SCREEN_FORBIDDEN,
  typistBot,
} from '../src/play';
import { endlessPeek, MOVED_SUFFIX, printableLevelId } from '../src/level';
import { DEFAULT_PATTERNS } from '../src/patterns';
import { loadTape } from '@mcp-arcade-cabinets/tape-core';
import { readFileSync } from 'node:fs';

const ROOT = path.resolve(__dirname, '../../..');
const DIST = path.join(ROOT, 'packages', 'vibe-typer', 'dist', 'play.js');
const TAPES = path.join(ROOT, 'fixtures', 'tapes');

type PlayCli = { typerScreenHit: (text: string) => string | null };

function cli(args: string[], timeout = 60000) {
  return spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'play.mjs'), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
  });
}

async function playCli(): Promise<PlayCli> {
  return (await import(pathToFileURL(path.join(ROOT, 'scripts', 'play.mjs')).href)) as PlayCli;
}

describe('the bots', () => {
  it('reads its own name', () => {
    expect(parseBot(undefined)).toEqual({ name: 'typist:40', wpm: 40, errorRate: 0.03 });
    expect(parseBot('idle')).toEqual({ name: 'idle', wpm: 0, errorRate: 0 });
    expect(parseBot('perfect')).toEqual({ name: 'perfect', wpm: 90, errorRate: 0 });
    expect(parseBot('typist:60:0.02')).toEqual({
      name: 'typist:60:0.02',
      wpm: 60,
      errorRate: 0.02,
    });
    expect(parseBot('sweeper')).toBeNull();
    expect(parseBot('typist:0')).toBeNull();
    expect(parseBot('typist:40:2')).toBeNull();
  });

  it('types at its cadence and no faster', () => {
    const bot = typistBot(60, 0, 1);
    const state = { clock: 0, beat: 'code', target: 'abc', typed: '', errors: [] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const first = bot(state as any);
    expect(first.key).toBe('a');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(bot(state as any)).toEqual({});
    state.clock = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(bot(state as any).key).toBe('a');
  });
});

describe('the play-through', () => {
  it('ships the first level and prints a screen with no digit on it', async () => {
    const out = play({ tier: 0, bot: 'typist:40', seed: 1 });
    expect(out.ok, out.text).toBe(true);
    expect(out.ended).toBe('shipped');
    expect(out.pieces).toBeGreaterThan(0);
    expect(out.valuation).toBeGreaterThan(0);
    const { typerScreenHit } = await playCli();
    expect(typerScreenHit(out.text)).toBeNull();
    const lines = out.text.split('\n');
    expect(lines[0]).toBe('Vibe Typer');
    expect(lines[2]).toBe('level shipped');
    expect(out.text).toMatch(/^valuation: \d+ \w+$/m);
  });

  // One label convention for the whole printed block. It used to say
  // `stack javascript` four lines above `pieces: 4`, and the word `level`
  // carried an id in the header and a count in the footer six lines apart.
  it('labels every field the same way and never calls a count a level', () => {
    const out = play({ tier: 0, bot: 'perfect', seed: 3 });
    const lines = out.text.split('\n');
    // No field is labelled with a bare space any more. The end word
    // (`level shipped`) and the moved note are sentences and not fields, so
    // the scan is anchored to the start of a line and to the field names.
    for (const label of ['stack', 'product', 'agent', 'valuation', 'pieces']) {
      expect(out.text, label).not.toMatch(new RegExp(`^${label} [a-z0-9]`, 'm'));
    }
    expect(lines[1]).toMatch(
      /^level: \S+ · stack: \S+ · tier: \w+ · bot: \S+ · seed: \d+ · endless: no$/,
    );
    expect(out.text).toMatch(/^levels played: \d+$/m);
    expect(out.text).not.toMatch(/^levels: /m);
    expect(out.text).toMatch(/^product: /m);
    expect(out.text).toMatch(/^agent: /m);
  });

  // The scoreboard's headline number had no unit on any surface while the
  // milestones crossing it are named after funding rounds.
  it('gives the valuation its unit off the field, from the lever', async () => {
    const out = play({ tier: 0, bot: 'perfect', seed: 3 });
    const unit = DEFAULT_PATTERNS.cabinet.words.valuationUnit;
    expect(unit.length).toBeGreaterThan(0);
    expect(out.text).toMatch(new RegExp(`^valuation: \\d+ ${unit}$`, 'm'));
    // The board itself keeps the bare number: the unit is said off the field.
    const { typerScreenHit } = await playCli();
    expect(typerScreenHit(out.text)).toBeNull();
  });

  // The header used to be built after the loop from the level the run died
  // on and printed as though it described the whole run: an endless run was
  // headed with one product over a body that built three.
  it('heads an endless run with the run, and records every level it played', async () => {
    const out = play({ tier: 1, bot: 'typist:40', seed: 3, endless: true });
    expect(out.levels).toBeGreaterThan(1);
    const lines = out.text.split('\n');
    expect(lines[1]).toMatch(/^last level: endless-\d+ ·/);
    expect(lines[1]).toContain(`levels played: ${out.levels}`);
    const products = lines.filter((line) => line.startsWith('product: '));
    expect(products).toHaveLength(out.levels);
    for (const line of products) expect(line).toMatch(/^product: .+ · stack: \w+$/);
    const { typerScreenHit } = await playCli();
    expect(typerScreenHit(out.text)).toBeNull();
  });

  // An endless level's only name was zero-based and was printed one line
  // from a one-based count of the same thing.
  it('names an endless level with the ordinal the rest of the cabinet counts with', () => {
    expect(endlessPeek({ set: DEFAULT_PATTERNS, seed: 3, tier: 1, levelIndex: 0 }).id).toBe(
      'endless-1',
    );
    expect(endlessPeek({ set: DEFAULT_PATTERNS, seed: 3, tier: 1, levelIndex: 2 }).id).toBe(
      'endless-3',
    );
  });

  // The planner's own bookkeeping suffix used to be printed as the level's
  // only name: `--stack sql --level 1` read `level duck-rides-moved`.
  it('says a moved level moved instead of gluing it to the name', () => {
    expect(printableLevelId(`duck-rides${MOVED_SUFFIX}`)).toBe('duck-rides');
    expect(printableLevelId('duck-rides')).toBe('duck-rides');
    const out = play({ tier: 0, bot: 'perfect', seed: 3, stack: 'sql', level: 0 });
    expect(out.text).not.toContain(MOVED_SUFFIX);
    expect(out.text).toContain('the level was moved off its own stack');
  });

  it('fails the run when the bar empties on the gentlest tier', () => {
    const out = play({ tier: 0, bot: 'idle', endless: true, seed: 1 });
    expect(out.ok).toBe(false);
    expect(out.ended).toBe('context');
    expect(out.why).toMatch(/context/);
  });

  it('lets idle be idle on a listed level, and names an unknown bot', () => {
    const unknown = play({ bot: 'sweeper' });
    expect(unknown.ok).toBe(false);
    expect(unknown.text).toMatch(/unknown bot sweeper/);
    expect(unknown.why).toMatch(/idle, perfect or typist/);
  });

  it('plays every tier and both hands of the ladder', () => {
    for (const tier of [0, 1, 2, 3] as const) {
      const out = play({ tier, bot: 'perfect', seed: 3, level: 2 });
      expect(out.ok, `tier ${tier}: ${out.why}`).toBe(true);
      expect(out.leaked).toBe(false);
    }
  });

  it('reads the tapes for the integration stack, and nothing else from them', () => {
    const snippets = integrationFrom(TAPES);
    expect(snippets.length).toBeGreaterThan(0);
    for (const snippet of snippets) {
      expect(snippet.stack).toBe('integration');
      expect(snippet.notes.every((n) => /^(server|policy) /.test(n))).toBe(true);
    }
    const out = play({ tier: 0, bot: 'perfect', seed: 1, stack: 'integration' });
    expect(out.ok, out.why).toBe(true);
    expect(out.text).toMatch(/stack: integration/);
  });

  it('takes a tool name off a tape row and never a fact', () => {
    const tape = loadTape(
      JSON.parse(readFileSync(path.join(TAPES, 'naive-ndjson.tape.json'), 'utf8')),
    );
    const seed = seedFromTape(tape);
    expect(seed.server).toBe('mcp-arcade-fixture');
    expect(seed.policy).toBe('naive');
    expect(seed.tools).toContain('echo');
    expect(seed.tools.some((t) => t.includes(' '))).toBe(false);
  });

  it('says so, and reads nothing, when there are no tapes', () => {
    const out = play({ stack: 'integration', tapes: path.join(ROOT, 'no-such-dir') });
    expect(out.ok).toBe(false);
    expect(out.why).toBe('no tapes');
    expect(integrationFrom(path.join(ROOT, 'no-such-dir'))).toEqual([]);
  });

  // The catch used to `continue` on one branch and fall off the end of the
  // block on the other, which are the same thing: a JSON syntax error, an
  // unreadable file and a genuinely malformed tape all looked exactly like a
  // directory with no tapes in it. The integration stack seasons the trigram
  // model, so a tape dropped in silence moves every snippet's value.
  it('halts on a broken fixture and only skips a tape it cannot read', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'vibe-tapes-'));
    try {
      const good = readFileSync(path.join(TAPES, 'naive-ndjson.tape.json'), 'utf8');
      writeFileSync(path.join(dir, 'good.tape.json'), good);
      // A tape this cabinet cannot read: skipped, and the rest still load.
      writeFileSync(path.join(dir, 'wrong.tape.json'), JSON.stringify({ schema: 'not-ours' }));
      expect(integrationFrom(dir).length).toBeGreaterThan(0);

      // A file that is not JSON at all is a broken fixture, not a tape.
      writeFileSync(path.join(dir, 'torn.tape.json'), '{ "schema": ');
      expect(() => integrationFrom(dir)).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('the tape boundary', () => {
  // The default was `path.resolve('fixtures/tapes')` — the process cwd, not
  // this package. test/helpers.ts fixed exactly that for itself, with a
  // comment saying that from the package directory it found no tapes at all;
  // `play`'s own default kept the trap, so `play({ level: 8 })` from anywhere
  // but the repo root got no integration snippets and then halted as
  // `patterns/levels.json: levels.8`, blaming a lever file for a missing
  // directory. And the tapes are an input to the trigram model, so the same
  // call from two directories scored differently.
  it('finds the tapes from this module and not from wherever it was called', () => {
    expect(path.isAbsolute(DEFAULT_TAPES)).toBe(true);
    expect(DEFAULT_TAPES).toBe(path.resolve(__dirname, '../../../fixtures/tapes'));
    expect(DEFAULT_TAPES).toBe(TAPES);
    expect(integrationFrom(DEFAULT_TAPES).length).toBeGreaterThan(0);
  });

  // Stage A made a tape this cabinet cannot read a halt, which is the right
  // decision — but the throw left `play` by a door no other failure in it
  // uses: every other one returns a Transcript carrying a `why`.
  it('returns a transcript, not a throw, when a fixture is torn', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'vibe-tapes-'));
    try {
      writeFileSync(path.join(dir, 'torn.tape.json'), '{ "schema": ');
      const out = play({ tier: 0, bot: 'perfect', seed: 1, tapes: dir });
      expect(out.ok).toBe(false);
      expect(out.why).toBe('bad tape');
      expect(out.text).toMatch(/torn\.tape\.json/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('a leak names itself', () => {
  // `leaked` was a boolean over a transcript printing the last four chat
  // lines. An endless run says hundreds, so a needle that landed on the
  // twelfth was flagged and then invisible: the operator got the word
  // "leaked" over a screen with nothing wrong on it. Every other failure in
  // that module names itself usefully.
  it('keeps the first offending line, its speaker and the needle', () => {
    const leak = firstLeak([
      { who: 'user', line: 'can you make it a bit faster' },
      { who: 'agent', line: 'on it, the run is a pass' },
      { who: 'user', line: 'and 4 more of those' },
    ]);
    expect(leak).not.toBeNull();
    expect(leak!.at).toBe(2);
    expect(leak!.who).toBe('agent');
    expect(leak!.needle).toBe('pass');
    expect(leak!.line).toBe('on it, the run is a pass');
    expect(leakWhy(leak!)).toBe('leaked: the agent said pass on chat line 2');
  });

  it('says nothing about a chat that may be shown', () => {
    expect(firstLeak([{ who: 'user', line: 'make it a little louder' }])).toBeNull();
    expect(firstLeak([])).toBeNull();
  });
});

describe('the runner', () => {
  it('scans the screen between the header and the valuation', async () => {
    const { typerScreenHit } = await playCli();
    const clean = [
      'Vibe Typer',
      'level: a · stack: bash · tier: easy',
      'level shipped',
      'product: ducks',
      'valuation: 12 points',
    ];
    expect(typerScreenHit(clean.join('\n'))).toBeNull();
    const dirty = [...clean];
    dirty.splice(3, 0, 'product 12 ducks');
    expect(typerScreenHit(dirty.join('\n'))).toBe('1');
    expect(SCREEN_FORBIDDEN.test('product 12 ducks')).toBe(true);
  });

  it('runs the cabinet from the command line', () => {
    if (!existsSync(DIST)) return; // `pnpm build` makes it; verify always does
    const ok = cli(['vibe-typer', '--tier', '0', '--bot', 'typist:40']);
    expect(ok.status, ok.stderr).toBe(0);
    expect(ok.stdout).toMatch(/^Vibe Typer$/m);
    expect(ok.stdout).toMatch(/^level shipped$/m);
    expect(ok.stdout).toMatch(/^valuation: \d+ \w+$/m);
  });

  it('names a bad bot, a bad stack, a bad flag and an unknown cabinet', () => {
    const bot = cli(['vibe-typer', '--bot', 'sweeper']);
    expect(bot.status).toBe(2);
    expect(bot.stderr).toMatch(/unknown bot sweeper/);

    const stack = cli(['vibe-typer', '--stack', 'cobol']);
    expect(stack.status).toBe(2);
    expect(stack.stderr).toMatch(/unknown stack cobol/);

    const fixture = cli(['vibe-typer', '--fixture', 'naive-ndjson']);
    expect(fixture.status).toBe(2);
    expect(fixture.stderr).toMatch(/takes no --fixture/);

    const cabinet = cli(['house-call']);
    expect(cabinet.status).toBe(2);
    expect(cabinet.stderr).toMatch(/unknown cabinet house-call; use ghost or vibe-typer/);

    const usage = cli(['--help']);
    expect(usage.status).toBe(0);
    expect(usage.stdout).toMatch(/pnpm test:play vibe-typer/);
  });
});
