# Review — Vibe Typer slice 3, sub-slice F (one npm package per cabinet)

**Reviewer:** Kimi K2.6 (`kimi-k2.6:cloud` through the local Ollama daemon), packet only: the lock G23–G30, the slice-3 kickoff (§ Sub-slice F), and the diff of `cabinet/vibe-typer-s3f` against its base with the lockfile and images omitted. **Date:** 2026-09-15. **Coordinator's note:** no halt; the one change (the version gate skips a glob that matched no file) applied on the branch before the merge. The page for the second package was checked by the coordinator against the three narrowings: it promises only the Ollama daemon and the endless seat, so none of them breaks a promise. Line numbers cite the diff, not the merged files.

**Date:** 2026-09-15

## 1. VITE_CABINET and the tree-shaking

`vite.config.ts:506-530` defines `import.meta.env.VITE_CABINET` as a string literal via `define`, and halts on values outside `['all','ghost','vibe']`. `main.ts:156-157` folds the branch to the constants `HAS_GHOST` and `HAS_VIBE`. The if/else chain at `main.ts:214-225` deliberately avoids early returns so Rollup drops the dead branch entirely; `switchMenu` and `cabinetCards` are lifted so a single-cabinet build drops the pref read and the typing-cabinet lever names. The two `/* #__PURE__ */` annotations at `packages/vibe-typer/src/corpus.ts:240` and `packages/vibe-typer/src/patterns.ts:810` are safe: `loadCorpus` and `loadPatterns` only produce a value and still halt on bad levers when consumed. No determinism leak; no gate bypass.

**hold**

## 2. The pack script

`packages/launcher/scripts/build.mjs:48-140` adds `parsePackArgs`, `placeOf`, `layoutOf`, `checkDist`, and `pack` with `--cabinet`, `--out`, and `--check`. The public split at `build.mjs:325-335` uses `fs.cp` with a filter that drops top-level public directories not in `spec.public`. Marker needles and absent strings are checked against concatenated `assets/*.js` in `checkDist`. `prepack` now gates with `checkDist` instead of rebuilding, removing the wrong-shell trap. No arithmetic issue; no silent swallow.

**hold**

## 3. The Vibe launcher

`cli.ts:16` imports from the shared `serve.ts`. Port `7778` at `cli.ts:24`. `--mcp` exits `2` with `MCP_LINE` naming slice 4 (`cli.ts:44-45`, `cli.ts:140-144`), asserted in `cli.test.ts:63-79`. `sayModule: null` (`cli.ts:120`), `voiceUrl: null` (`cli.ts:124`), and `anthropicKey: null` (`cli.ts:129`) are the narrowings the brief records in `docs/vibe-typer.slice3.md` decisions 4–6. The README is not in the packet, so its promises cannot be checked here; the brief sanctions every narrowing.

**hold**

## 4. release.yml

The version gate at `release.yml:97-127` now walks every manifest. The smoke runs `--version` on both bins and asserts Vibe `--mcp` exits 2 with "slice 4" (`release.yml:147-180`). The tarball contract checks per-package need/carry/gone lists (`release.yml:227-285`). The publish loop uses `npm view` to skip existing versions, making reruns idempotent (`release.yml:305-316`). Provenance (`--provenance`) and no `environment:` are preserved; the filename stays `release.yml`. However, the manifest loop uses unguarded bash globs: if `apps/` or `packages/` ever contains a directory without a `package.json`, the literal glob string is passed to `node -p`, which throws and kills the step under `set -e`.

**change** — insert `[ -e "$manifest" ] || continue` as the first line of the loop body in `.github/workflows/release.yml:103`.

## 5. The tests

`cli.test.ts` covers flags, ports, help, version, and the `--mcp` exit code and stderr content. `serve.test.ts` uses `rawGet` over a raw TCP socket (`serve.test.ts:32-48`) to test traversal attempts (`/../secret.txt`, `%2e%2e`, `..%5c`, double climbs) and the safe inside-path `/keys/../index.html`. It also tests method refusal (405 on PUT), voice 404 with no upstream socket opened, and say/endless 503 when unconfigured. No `WeakMap` misuse; no `Math.random` or `Date.now` in test logic.

**hold**

## 6. The Ghost package byte-identical for a player

Ghost game code is untouched. Ghost's shell is built with `VITE_CABINET=ghost`, dropping Vibe's corpus and levers via the same pure annotations. The marker gate proves no Vibe strings survive. `serve.ts` changes are backward-compatible for Ghost (voiceUrl remains a string in Ghost's call site). The Ghost player gets a smaller package that contains only Ghost assets; the split is intentional and verified.

**hold**

## 7. What the coordinator must do before cutting 0.10.0

Bump every workspace manifest to the same version (the gate enforces this); publish the `@mcptoolshop/vibe-typer` placeholder so the name exists for Trusted Publishing; configure Trusted Publishing on npmjs.com for the new name; fold the six compensator rows from `docs/vibe-typer.slice3.md` into `docs/npm-launcher.md`; deprecate or unpublish the placeholder within 72 h; update lead-authored surfaces (root README, package pages, handbook, landing, `CLAUDE.md`, changelog). These are procedural, not code defects in this diff.

**hold**

## Summary

- **change** `.github/workflows/release.yml:103` — add `[ -e "$manifest" ] || continue` inside the version-gate loop so literal glob strings are never passed to `node -p`.
- No **halts**.
