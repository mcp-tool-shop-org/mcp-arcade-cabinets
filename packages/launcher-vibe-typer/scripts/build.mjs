// Lay `@mcptoolshop/vibe-typer` out, or gate the layout that is there.
//
// The work is in `packages/launcher/scripts/build.mjs`, which is shared by
// both cabinets' packages: one pack script, one marker gate, one public
// split, so a rule added for one package cannot go missing from the other.
// This file exists only so that the scripts in this package.json are
// commands a reader can run, and so that the cabinet cannot be passed wrong
// from here.
//
// `--check` is what `prepack` runs: it reads the dist rather than rebuilding
// it, because after `pnpm build:launcher` the built shell on disk belongs to
// whichever cabinet was packed last. See the note on `checkDist`.

import { checkDist, halt, pack, parsePackArgs } from '../../launcher/scripts/build.mjs';

const USAGE = [
  'usage: node scripts/build.mjs [--out <package dir>] [--check]',
  '  --check  gate the dist that is already there; do not rebuild it',
];

// This used to be `process.argv.slice(2).includes('--check')`, which made any
// argument that was not exactly `--check` a rebuild: a typo in this package's
// own prepack script (`--chekc`, `-check`) ran `pack()` at `npm publish`
// time, reassembling dist from whatever shell was on disk — and after
// `pnpm build:launcher` that is whichever cabinet was packed last. That is
// the trap the `--check` split exists to remove, and it was re-entered
// silently. A flag this file does not understand must stop the publish.
const given = process.argv.slice(2);
if (given.includes('--cabinet')) {
  halt(["launcher: --cabinet is not this package's to pass; it always packs vibe", '', ...USAGE]);
}
const args = parsePackArgs(['--cabinet', 'vibe', ...given]);
if (args.bad) halt([`launcher: ${args.bad}`, '', ...USAGE]);
const { check, ...where } = args;
try {
  const spec = await (check ? checkDist(where) : pack(where));
  if (check) process.stderr.write(`launcher: ${spec.name} dist checks out\n`);
} catch (err) {
  // The same route to `halt` the shared script's own entry point takes. This
  // runs from `prepack`, i.e. during `npm publish`: an unexpected failure
  // here used to surface as an unhandled rejection with a raw stack, which
  // still fails closed but throws away the line that says what to do next.
  halt([
    `launcher: ${err instanceof Error ? err.message : String(err)}`,
    '',
    'next: pnpm build:launcher (from the repo root)',
  ]);
}
