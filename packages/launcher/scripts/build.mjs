// Lay a published package out — one cabinet per package.
//
// `--cabinet ghost` writes `packages/launcher/dist` (`@mcptoolshop/ghost-on-the-menu`);
// `--cabinet vibe` writes `packages/launcher-vibe-typer/dist` (`@mcptoolshop/vibe-typer`).
// Both declare no runtime dependencies on purpose: everything they need is
// bundled or copied in here, so the packages ship and `tape-core`,
// `ghost-on-the-menu`, `vibe-typer`, `cabinet-server` and `cabinets` all stay
// private. That is the whole reason this file exists instead of a
// `dependencies` block.
//
// `0.9.0` shipped both cabinets inside the package named for one of them,
// which made the name wrong. The split is the fix: the shell is built once
// per cabinet with `VITE_CABINET`, which drops the other cabinet's code from
// the bundle, and this script leaves the other cabinet's public files out of
// the copy. The marker gate below then proves both halves happened — the
// needles that must be there, and the one that must not.
//
// Standards compliance (workflow-standards, the six):
//   PIN_PER_STEP 2 — every input is a path in this file and the bundler is
//     pinned by the lockfile; the same tree produces the same dist.
//   ANDON_AUTHORITY 3 — a missing input halts with the command that makes
//     it, `verifyLayout` re-checks the result before anyone can pack, and
//     the marker gate halts on a shell built for the wrong cabinet rather
//     than shipping it under the wrong name.
//   NAMED_COMPENSATORS — n/a here: this writes only inside the package's
//     `dist/` (which it clears first) and its `LICENSE`. The irreversible
//     step is `npm publish`; its compensators are in `docs/npm-launcher.md`
//     and, for the second package, in `docs/vibe-typer.slice3.md`.
//   DECOMPOSE_BY_SECRETS 3 — the reason there are two packages and not one:
//     what a player of one cabinet needs is copied together, and what only
//     the other cabinet needs is not copied at all.
//   UNCERTAINTY_GATED_HUMANS — skip: no human checkpoint in a build step.
//   EXTERNAL_VERIFIER 1 — CI runs the published bins, which is a different
//     process than the one that built them, but not a different family.

import { cp, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const launcher = path.resolve(here, '..');
const repo = path.resolve(launcher, '..', '..');

const SHELL = path.join(repo, 'apps', 'cabinets', 'dist');
const SERVER_BUNDLE = path.join(repo, 'packages', 'cabinet-server', 'dist', 'index.js');
/**
 * The stdio cabinet server each package's `--mcp` hands stdio to, one per
 * cabinet. Two entries, not one with a flag: the two cabinets' servers
 * change on different clocks, and a flag would put the shooter's sim, its
 * tape menu and its voice probe inside the typing cabinet's package.
 */
const STDIO_BUNDLES = {
  ghost: path.join(repo, 'packages', 'cabinet-server', 'dist', 'server.js'),
  vibe: path.join(repo, 'packages', 'cabinet-server', 'dist', 'server-vibe.js'),
};
const TAPES = path.join(repo, 'fixtures', 'tapes');

/** Every public directory the shell ships, so the copy can leave the rest out. */
const PUBLIC_DIRS = ['sprites', 'tracks', 'keys', 'vibe'];

/**
 * The typing cabinet's recorded beds, one a corpus stack. This is the same
 * list as `VIBE_TRACK_KEYS` in `apps/cabinets/src/typer-audio.ts`, spelled
 * again because a pack script is plain node and may not import the shell's
 * TypeScript; `apps/cabinets/test/typer-audio.test.ts` fails the build if the
 * two ever disagree.
 *
 * It is here as a per-file requirement rather than a directory one because a
 * missing bed is silent by design — the procedural bed simply keeps the bar,
 * and the player hears a cabinet that works. That is the right behavior at
 * run time and the wrong one at pack time, where the only sign of a bed left
 * out of the tarball would be a stack that quietly never plays its music.
 */
const VIBE_TRACK_KEYS = ['bash', 'csharp', 'java', 'javascript', 'python', 'sql', 'integration'];

/**
 * What each cabinet's package carries, and how to tell from the built shell
 * that it is the right one.
 *
 * `needles` are strings that must be in the play bundle. They do two jobs at
 * once: a Pages `vite build` (PROD, no `VITE_LOCAL_SEATS`) drops the local
 * seat chrome and its mount mark, so a missing mark means the shell was
 * built for Pages and the player would get no daemon; and a shell built for
 * the other cabinet has none of these either.
 *
 * `absent` is the other half, and it is the one the split added. A string
 * that only the other cabinet's code carries must NOT be in this bundle: if
 * it is, `VITE_CABINET` did not take and the package named for one cabinet
 * is about to ship two.
 */
const CABINETS = {
  ghost: {
    pkgDir: path.join(repo, 'packages', 'launcher'),
    name: '@mcptoolshop/ghost-on-the-menu',
    /** The stdio cabinet server (`--mcp`): `fire`, `say`, `speak`, `sfx`, `view`, `tapes`. */
    stdio: 'ghost',
    public: ['sprites', 'tracks'],
    needles: [
      ['data-local-seats', 'the seats mount mark'],
      ['/ollama/api/tags', 'the daemon probe'],
      ['/ollama/api/generate', 'the next-verb seat'],
      ['Ollama bosses', 'the Ollama checkbox'],
    ],
    absent: [['data-vibe-seat', "the typing cabinet's seat mount mark"]],
  },
  vibe: {
    pkgDir: path.join(repo, 'packages', 'launcher-vibe-typer'),
    name: '@mcptoolshop/vibe-typer',
    /** Its own four levers since slice 4: `view`, `product`, `ask`, `react`. */
    stdio: 'vibe',
    public: ['keys', 'vibe'],
    /** One recorded bed a stack, checked by name (see VIBE_TRACK_KEYS above). */
    files: VIBE_TRACK_KEYS.map((key) => path.join('play', 'vibe', 'tracks', `${key}.mp3`)),
    needles: [
      ['data-vibe-seat', 'the endless seat mount mark'],
      ['/cabinet/endless', 'the endless seat'],
      ['/ollama/api/tags', 'the daemon probe'],
      // Since slice 4C this package stands a `/voice` proxy. A shell built
      // without the voice chrome would leave that proxy with no caller, and
      // the player would get a cabinet whose user never speaks with no sign
      // that anything is missing — so the mark is checked like the seat's.
      ['data-vibe-voice', 'the voice mount mark'],
    ],
    absent: [['Ollama bosses', "the shooter's Ollama checkbox"]],
  },
};

function halt(lines) {
  for (const line of lines) process.stderr.write(`${line}\n`);
  process.exit(1);
}

async function present(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

/** The arguments, or a halt naming what was wrong with them. */
export function parsePackArgs(argv) {
  let cabinet = 'ghost';
  let out;
  let check = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--cabinet') {
      cabinet = argv[i + 1];
      i += 1;
    } else if (arg === '--out') {
      out = argv[i + 1];
      i += 1;
    } else if (arg === '--check') {
      check = true;
    } else {
      return { bad: `unknown argument ${arg}` };
    }
  }
  if (!Object.prototype.hasOwnProperty.call(CABINETS, cabinet)) {
    return {
      bad: `--cabinet wants ${Object.keys(CABINETS).join(' or ')}, got ${cabinet ?? '(nothing)'}`,
    };
  }
  return { cabinet, check, ...(out === undefined ? {} : { out }) };
}

/** Where a cabinet's package, and its `dist`, live. */
function placeOf(cabinet, out) {
  const spec = CABINETS[cabinet];
  if (!spec) halt([`launcher: no cabinet named ${cabinet}`]);
  const pkg = out ? path.resolve(repo, out) : spec.pkgDir;
  return { spec, pkg, dist: path.join(pkg, 'dist') };
}

/** What must exist in `dist` for the package to work at all. */
function layoutOf(spec) {
  return [
    'cli.js',
    'cabinet-server.js',
    'cabinet-stdio.js',
    path.join('play', 'index.html'),
    'tapes',
    ...spec.public.map((dir) => path.join('play', dir)),
    ...(spec.files ?? []),
  ];
}

/**
 * The gate, over a `dist` that is already written. It is separate from
 * `pack` because it is what `prepack` runs.
 *
 * `prepack` used to be `pack`, and with one package that was right. With
 * two it is a trap: `pnpm build:launcher` packs Ghost and then Vibe, so the
 * built shell on disk afterwards is whichever cabinet went last, and a
 * `prepack` that rebuilt from it would quietly reassemble the OTHER
 * package out of the wrong shell — at `npm publish` time, which is the one
 * moment nothing may be quietly reassembled. Checking instead of rebuilding
 * keeps the andon (a stale, incomplete or wrong-cabinet dist still halts
 * before the irreversible step) and takes the trap away.
 */
export async function checkDist({ cabinet, out }) {
  const { spec, dist } = placeOf(cabinet, out);

  const absentFiles = [];
  for (const rel of layoutOf(spec)) {
    if (!(await present(path.join(dist, rel)))) absentFiles.push(rel);
  }
  if (absentFiles.length > 0) {
    halt([
      `launcher: ${spec.name}'s dist is incomplete`,
      ...absentFiles.map((rel) => `- missing: dist/${rel}`),
      '',
      'next: pnpm build:launcher (from the repo root)',
    ]);
  }
  const strays = [];
  for (const rel of PUBLIC_DIRS.filter((dir) => !spec.public.includes(dir)).map((dir) =>
    path.join('play', dir),
  )) {
    if (await present(path.join(dist, rel))) strays.push(rel);
  }
  if (strays.length > 0) {
    halt([
      `launcher: ${spec.name} is carrying the other cabinet's files`,
      ...strays.map((rel) => `- should not be here: dist/${rel}`),
      '',
      'next: check the public split in packages/launcher/scripts/build.mjs',
    ]);
  }

  // The reason these packages exist: one cabinet each, with local seats.
  const assets = path.join(dist, 'play', 'assets');
  const names = (await readdir(assets)).filter((n) => n.endsWith('.js'));
  let playJs = '';
  for (const n of names) playJs += await readFile(path.join(assets, n), 'utf8');
  const stripped = spec.needles.filter(([needle]) => !playJs.includes(needle));
  if (stripped.length > 0) {
    halt([
      `launcher: the play shell is not a ${cabinet} launcher shell`,
      ...stripped.map(([, what]) => `- missing: ${what}`),
      '',
      `next: cross-env VITE_LOCAL_SEATS=true VITE_CABINET=${cabinet} \\`,
      '        pnpm -F @mcp-arcade-cabinets/cabinets build',
      '     then pnpm build:launcher',
    ]);
  }
  const leftover = spec.absent.filter(([needle]) => playJs.includes(needle));
  if (leftover.length > 0) {
    halt([
      `launcher: ${spec.name} is carrying the other cabinet`,
      ...leftover.map(([, what]) => `- still in the bundle: ${what}`),
      '',
      `next: the shell was built without VITE_CABINET=${cabinet}; rebuild it`,
      '     with pnpm build:launcher, and check the define in',
      '     apps/cabinets/vite.config.ts',
    ]);
  }
  return spec;
}

/**
 * Build one package. `cabinet` picks what it carries; `out` is the package
 * directory to write into, and defaults to that cabinet's own.
 */
export async function pack({ cabinet, out }) {
  const { spec, pkg, dist } = placeOf(cabinet, out);

  /** Copied in verbatim: source on disk, name inside `dist`, how to make it. */
  const inputs = [
    {
      from: SHELL,
      to: path.join(dist, 'play'),
      what: 'the shell',
      next: `cross-env VITE_LOCAL_SEATS=true VITE_CABINET=${cabinet} pnpm -F @mcp-arcade-cabinets/cabinets build`,
    },
    {
      from: SERVER_BUNDLE,
      to: path.join(dist, 'cabinet-server.js'),
      what:
        spec.stdio === 'ghost'
          ? 'the cabinet-server bundle (the say seat)'
          : 'the cabinet-server bundle (the endless seat)',
      next: 'pnpm -F @mcp-arcade-cabinets/cabinet-server build',
    },
    {
      from: STDIO_BUNDLES[spec.stdio],
      to: path.join(dist, 'cabinet-stdio.js'),
      what: `the stdio cabinet server (--mcp), ${spec.stdio}`,
      next: 'pnpm -F @mcp-arcade-cabinets/cabinet-server build',
    },
    {
      from: TAPES,
      to: path.join(dist, 'tapes'),
      what: 'the tapes',
      next: 'nothing to build; fixtures/tapes is tracked',
    },
  ];

  const missing = [];
  for (const input of inputs) {
    if (!(await present(input.from))) missing.push(input);
  }
  if (missing.length > 0) {
    halt([
      `launcher: inputs missing for ${spec.name}, nothing was written`,
      ...missing.map((m) => `- ${m.what}: ${path.relative(repo, m.from)}`),
      '',
      'next: pnpm build:launcher (from the repo root), or individually:',
      ...[...new Set(missing.map((m) => `  ${m.next}`))],
    ]);
  }

  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  await build({
    entryPoints: [path.join(pkg, 'src', 'cli.ts')],
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    outfile: path.join(dist, 'cli.js'),
    banner: { js: '#!/usr/bin/env node' },
    logLevel: 'warning',
  });

  for (const input of inputs) {
    if (input.from === SHELL) {
      // The public split. Vite copies `public/` whole, so both cabinets'
      // assets are in the built shell; this is where the package named for
      // one cabinet stops carrying the other one's five keyboard sets, or
      // its five megabytes of beds.
      const drop = new Set(PUBLIC_DIRS.filter((dir) => !spec.public.includes(dir)));
      await cp(input.from, input.to, {
        recursive: true,
        filter: (src) => {
          const rel = path.relative(input.from, src);
          if (rel === '') return true;
          return !drop.has(rel.split(path.sep)[0]);
        },
      });
      continue;
    }
    await cp(input.from, input.to, { recursive: true });
  }

  // The license travels with the package rather than being remembered by
  // hand. Copying it here is also how the two packages cannot drift from
  // the repo's own.
  await cp(path.join(repo, 'LICENSE'), path.join(pkg, 'LICENSE'));

  // The same gate `prepack` runs, so a bad pack is caught where it was made
  // and not two commands later.
  await checkDist({ cabinet, ...(out === undefined ? {} : { out }) });

  // stderr, not stdout: this runs under `npm pack --json`, which
  // parses npm's stdout. A friendly line there is a JSON syntax error for
  // anything that packs this package in a pipeline.
  process.stderr.write(`launcher: ${spec.name} dist ready at ${path.relative(repo, dist)}\n`);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  const args = parsePackArgs(process.argv.slice(2));
  if (args.bad) {
    halt([
      `launcher: ${args.bad}`,
      '',
      'usage: node scripts/build.mjs [--cabinet ghost|vibe] [--out <package dir>] [--check]',
      '  --check  gate the dist that is already there; do not rebuild it',
    ]);
  }
  const { check, ...where } = args;
  const run = check ? checkDist(where) : pack(where);
  await run
    .then((spec) => {
      if (check) {
        process.stderr.write(`launcher: ${spec.name} dist checks out\n`);
      }
    })
    .catch((err) => {
      halt([`launcher: ${err instanceof Error ? err.message : String(err)}`]);
    });
}
