# Review — Vibe Typer slice 3, sub-slice B part five (finishing the coherence pass)

**Reviewer:** Kimi K2.6 (`kimi-k2.6:cloud` through the local Ollama daemon), packet only: the lock G23–G30, the slice-3 kickoff, and the diff of part five against part four with the levers' lines, the corpus asks and the receipts omitted. **Date:** 2026-09-16. **Coordinator's note:** every section holds; no change, no halt. The reviewer's one remark stands as a remediation item: the editor pass reads Kimi's lines with Kimi, the same family as the writer, so the next authoring pass should seat the editor on a different family (EXTERNAL_VERIFIER). Line numbers cite the diff, not the merged files.

## 1. The syncs slot with its own prompt and no voice sheet, and the tic rule in patterns.test.ts read from the user sheet

`syncPrompt` (`author.mjs:958`) carries no character sheet, no product, and no praise instruction; it names the four exemplars and caps at `SYNC_WORDS`. `slotPools` (`author.mjs:2237`) routes `user.syncs` through `ctx.system.plain` (`SAMPLE_SYSTEM`) and `ctx.gates.sync`, not a voice sheet. `patterns.test.ts:273` reads `user.md` dynamically under `## Their tics`, takes the first three words of each backtick span as a shape, and asserts no sync line contains any tic head; a sibling case asserts hits in `user.nags` and `user.creeps` to prevent a vacuous pass. The five-word ceiling is prompt-side only in the visible diff; `gates.sync` construction is not shown, though the slice doc notes no sync line fell to it.

**hold**

## 2. The premises slot and premiseGate (drops, never mends; the premise is a situation not an instruction)

`premiseGate` (`author.mjs:1720`) wraps `slugGate` and drops lines opening on `PREMISE_VERBS` (`author.mjs:1708`: `make`, `build`, `launch`, etc.); it returns `'opens on an instruction'` and never mends. `slotPremises` (`author.mjs:1720`) feeds the writer each level's four pinned requests so the premise opens the story rather than repeating the product. `levels.json:6` shows the sixteen premises are situations, none repeats its product, none opens on a verb. The regex anchors to root forms only; gerunds (e.g., `"building..."`) bypass the gate, though the prompt instructs the model away from them.

**hold**

## 3. The tightened agent sheet and the editor's two passes with --spare (drops only, never below a floor, refusals recorded)

`agent.md:19` tightens the image rule to work-in-hand only and bars pantry, garden, and furniture; the twenty exemplar lines were re-read and held. `--spare` is clamped to `≥0` in `runOpts` (`author-lib.mjs:414`) and `want` in `slotPools` (`author.mjs:2228`) is computed with `Math.max(0, target + spare - poolAt(...).length)`, preventing below-zero asks. The editor is the same model family as the writer; the slice doc (`slice3.md:1774`) records this as a weak seam under `EXTERNAL_VERIFIER`.

**hold**

## 4. --pool and --spare pinned into the receipts

`commandRun` (`author.mjs:1492`) pins `spare: opts.spare` and `pool: args.flags.pool ?? null` into the run receipt. `commandEdit` (`author.mjs:2413`) pins `pool` into the edit receipt; `spare` is omitted because edit does not grow pools.

**hold**

## 5. The flag validation from the previous review (unknown flags refused, non-numeric numbers refused, tests)

`parseArgv` (`author-lib.mjs:344`) checks flag names against `bare` and `valued` sets before taking values, so `--nope` at end-of-line throws `unknown flag` rather than `missing value`; single-dash unknowns throw; values handed to bare flags throw. `numberFlag` (`author-lib.mjs:395`) rejects `NaN`, `Infinity`, and empty strings via `Number.isFinite`. `runOpts` (`author-lib.mjs:414`) clamps `concurrency` and `chunk` to `≥1`. `author.test.ts:32` covers eleven cases across `parseArgv`, `runOpts`, and `poolFilter`. No malformed input is swallowed silently.

**hold**

## 6. The one drain kept against the sweep because the band bar is the andon

`sandwich-ledger` (`levels.json:48`) keeps `drainPerSec: 0.00544` against the sweep suggestion of `0.00571` because `band.test.ts` failed hardcore at the higher rate. The override is recorded in the slice doc (`slice3.md:1774`) as the andon firing: the bar wins over the rule.

**hold**

## 7. The thirty-line read: one voice or not, and what the lead should know before merging

The thirty-line read (`slice3.md:1832`) shows three distinct voices: user (lower case, tics), agent (capitalized, work-concrete), and sync (character-neutral, lower case). No digit, barred word, model name, or British spelling appears. Before merging, the lead should know: (1) the editor is same-family, so the `EXTERNAL_VERIFIER` weak seam persists; (2) the agent voice sheet hash moved to `a6ff3197248c563f…`, invalidating pre-part-five receipts; (3) `sandwich-ledger` drain is hand-pinned and must not be overwritten by future sweeps without the hardcore bar check; (4) `user.syncs` is fresh data guarded by `patterns.test.ts:273`.

**hold**

## Summary

No changes or halts. The diff is mechanically sound; the documented same-family editor seam is the coordinator's to resolve before merge.
