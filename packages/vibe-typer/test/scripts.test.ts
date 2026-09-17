// The two dev scripts a lead drives by hand: the level sweep the Director's
// drains are set from, and the authoring pass.
//
// Both stated their flags in more places than one and the places disagreed.
// The sweep said its flag set three times — a file header, `USAGE`, and
// whatever `main` happened to read off `flags` — so `--cap` was in none of the
// help and `--capp 100` was accepted in silence and ignored, on the tool a
// mis-set lever comes out of. The authoring script accepted `--temperature`,
// `--timeout` and `--ollama` and described none of them.
//
// Every case here stops before the script builds anything, so the whole file
// is three short child processes and no model call.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(HERE, '..');
const SWEEP = path.join(PKG, 'scripts', 'sweep-levels.mjs');
const AUTHOR = path.join(PKG, 'scripts', 'author.mjs');

function run(script: string, args: string[]) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', timeout: 60000 });
}

describe('the level sweep states its flags once and holds them', () => {
  it('names every flag it takes in --help, with its default', () => {
    const out = run(SWEEP, ['--help']);
    expect(out.status).toBe(0);
    for (const flag of ['--tier', '--bot', '--seeds', '--cap', '--suggest', '--json']) {
      expect(out.stdout, flag).toContain(flag);
    }
    // `--cap` was the flag `main` read and no help mentioned.
    expect(out.stdout).toMatch(/--cap .*\n?.*default 324000/s);
    // The file header no longer keeps a second, staler list.
    const head = readFileSync(SWEEP, 'utf8').split('\n').slice(0, 12).join('\n');
    expect(head).toContain('--help');
    expect(head).not.toContain('[--seeds 1,2,3] [--suggest]');
  });

  it('refuses an unknown flag instead of taking it and ignoring it', () => {
    const out = run(SWEEP, ['--capp', '100']);
    expect(out.status).toBe(2);
    expect(out.stderr).toContain('unknown flag --capp');
  });

  it('refuses a tier outside the ladder, the way transcript.mjs does', () => {
    const out = run(SWEEP, ['--tier', '9']);
    expect(out.status).toBe(2);
    expect(out.stderr).toContain('tier must be 0..3 or all (got 9)');
    // `all` is the default and stays legal.
    expect(run(SWEEP, ['--seeds', 'x']).status).toBe(2);
    expect(run(SWEEP, ['--cap', '0']).status).toBe(2);
  });
});

describe('the authoring script states every flag it accepts', () => {
  it('documents the three that appeared nowhere, with their defaults', () => {
    const out = run(AUTHOR, ['--help']);
    expect(out.status).toBe(0);
    const text = out.stdout;
    for (const flag of [
      '--model',
      '--level',
      '--out',
      '--only',
      '--pool',
      '--skip',
      '--chunk',
      '--spare',
      '--concurrency',
      '--temperature',
      '--timeout',
      '--ollama',
      '--editor',
      '--same-family',
      '--revoice',
      '--apply',
    ]) {
      expect(text, flag).toContain(flag);
    }
    // Every flag line states a default or says the flag is its own answer.
    expect(text).toContain('default 40');
    expect(text).toContain('default 2');
    expect(text).toContain('default 0.9 writing');
    expect(text).toContain('default 1800000');
    expect(text).toContain('http://127.0.0.1:11434');
    // `--skip` and `--editor` are in a synopsis line now, not only the body.
    expect(text).toMatch(/node scripts\/author\.mjs run .*\[--skip <key>\]/);
    expect(text).toMatch(/\[--editor <spec>\]/);
    // `edit` is a command and no longer sits in the flag list as though it
    // were a flag.
    expect(text).toMatch(/^commands$/m);
    expect(text.trimEnd().split('\n').pop()).toMatch(/^ {2}--apply /);
  });
});
