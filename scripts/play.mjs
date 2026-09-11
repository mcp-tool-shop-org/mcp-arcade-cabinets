#!/usr/bin/env node
// `pnpm test:play ghost [--fixture name] [--bot idle|sweeper|reader] [--seat mcp]`
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
if (args.seat === 'mcp') {
  // The cabinet server driven in-process: its scripted model pulls the
  // levers each frame on tier 1 with the sweeper as an immortal ship, so
  // every boss on the tape is met (as `pnpm sit` does).
  const cs = await import(
    pathToFileURL(path.resolve('packages/cabinet-server/dist/index.js')).href
  ).catch(() => null);
  if (!cs || typeof cs.createScriptedSeat !== 'function') {
    console.error('no cabinet server: build it first (packages/cabinet-server/dist/index.js)');
    process.exit(3);
  }
  args.seat = cs.createScriptedSeat();
  args.tier = args.tier === undefined ? 1 : Number(args.tier);
  args.bot = args.bot ?? 'sweeper';
  args.immortal = true;
} else if (args.seat !== undefined) {
  console.error(`unknown seat ${args.seat}; use mcp`);
  process.exit(2);
}
const transcript = await mod.play(args);
console.log(transcript.text);
process.exit(transcript.ok ? 0 : 1);
