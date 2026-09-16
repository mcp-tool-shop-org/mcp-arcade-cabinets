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

import { checkDist, pack } from '../../launcher/scripts/build.mjs';

const check = process.argv.slice(2).includes('--check');
const spec = await (check ? checkDist({ cabinet: 'vibe' }) : pack({ cabinet: 'vibe' }));
if (check) process.stderr.write(`launcher: ${spec.name} dist checks out\n`);
