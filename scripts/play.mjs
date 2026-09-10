#!/usr/bin/env node
// `pnpm test:play ghost [--fixture name]`
// A scripted play-through is the acceptance test for a playable slice. Each
// cabinet registers a `play(args)` that returns a transcript; this runner
// prints it and exits non-zero if the transcript reports a failure or if any
// forbidden score chrome (nrp, integrity, pass/fail, attack_success) appears
// before the run's end screen.
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const [cabinet, ...rest] = process.argv.slice(2);
if (!cabinet) {
  console.error('usage: pnpm test:play ghost [--fixture name]');
  process.exit(2);
}
const args = {};
for (let i = 0; i < rest.length; i += 2) args[rest[i].replace(/^--/, '')] = rest[i + 1];
const pkg = cabinet === 'ghost' ? 'ghost-on-the-menu' : cabinet;
const mod = await import(pathToFileURL(path.resolve(`packages/${pkg}/dist/play.js`)).href).catch(
  () => null,
);
if (!mod || typeof mod.play !== 'function') {
  console.error(
    `no play-through for ${pkg}: build it first (packages/${pkg}/dist/play.js must export play(args))`,
  );
  process.exit(3);
}
const transcript = await mod.play(args);
console.log(transcript.text);
process.exit(transcript.ok ? 0 : 1);
