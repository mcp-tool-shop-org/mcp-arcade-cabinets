// esbuild for the development runners, with the failure named.
//
// `film`, `sweep`, `sit` and `transcript` all build the workspace sources into
// one throwaway ESM file and import it. Every one of those steps can fail for a
// boring reason — a moved entry, a syntax error, an unwritable output directory
// — and an unguarded `await build()` surfaced that as an unhandled rejection
// with a raw stack, the one output shape this repo says it does not ship.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

import { cliError } from './cli.mjs';

const COMMON = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  logLevel: 'warning',
};

function oneLine(err) {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.split('\n')[0].trim();
}

/**
 * Bundle `contents` (or `entry`) to `outFile` under `outDir` and import it.
 * A failed build, a directory that cannot be made, or a file that cannot be
 * written each leave as a named exit-2 line.
 */
export async function bundleModule({ contents, entry, outDir, outFile, what = outFile }) {
  let result;
  try {
    result = await build(
      contents === undefined
        ? { ...COMMON, entryPoints: [entry] }
        : { ...COMMON, stdin: { contents, resolveDir: process.cwd(), loader: 'ts' } },
    );
  } catch (err) {
    throw cliError(`could not bundle ${what}: ${oneLine(err)}`);
  }
  const file = path.resolve(outDir, outFile);
  try {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(file, result.outputFiles[0].text);
  } catch (err) {
    throw cliError(`could not write ${file}: ${oneLine(err)}`);
  }
  try {
    return await import(pathToFileURL(file).href);
  } catch (err) {
    throw cliError(`could not load ${file}: ${oneLine(err)}`);
  }
}
