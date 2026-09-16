# Review — Vibe Typer slice 4, sub-slice A (the container tools)

**Reviewer:** Kimi K2.6 (`kimi-k2.6:cloud` through the local Ollama daemon), packet only: the lock G23–G30, the inherited lock G11–G18, the slice-4 kickoff (the frame and § Sub-slice A), and the diff of `cabinet/vibe-typer-s4a` against `main` with the docs, the lockfile and `film/` omitted. **Date:** 2026-09-16. **Coordinator's note:** halt, four items. Three applied and one refused with its reason, plus one item of the coordinator's own (the `ask` tool refuses a repeat); all five are folded into the single commit and recorded in `docs/vibe-typer.slice4.md` § "Review (Kimi K2.6, from a packet)". Line numbers cite the diff as reviewed, before the amendment.

1. `packages/cabinet-server/src/vibe-cabinet.ts` lines 167–174: `clip` silently truncates tool inputs to their JSON Schema `maxLength` instead of refusing them. A truncated string can slip past downstream word-count gates—for example, a 200-character `react.text` clipped to 160 may still be under twelve words and be accepted. This repairs instead of refusing.
   change: Delete `caps` and `clip`. Add explicit character-length refusal to `reactFault`, `productFault`, and the `ask` path (or `gateCode`) so any field exceeding its schema `maxLength` is refused with a reason word.

2. `packages/cabinet-server/src/server-vibe.ts` lines 89–94: `checkVibeCatalogListing` silently returns when `catalog/tools.vibe.json` is missing, swallowing a missing-mirror fault in environments where the catalog should be baked into the image (G18).
   change: Remove the `catch` block so a missing catalog file throws and halts the server.

3. `packages/cabinet-server/src/server-vibe.ts` lines 145–150: The `whole` helper maps invalid `CABINET_TIER` strings (e.g. `'abc'`) to fallback tier `0` because `Number('abc')` is `NaN` and the truthy env string bypasses the range check, silently ignoring the invalid value and applying tier `0`.
   change: Validate that `raw` matches `/^\d+$/` before converting; treat non-integer strings as absent.

4. `packages/cabinet-server/test/vibe-cabinet.test.ts` lines 140–150: The fact-blind test claims to compare a tape with its flipped `temporal.rug_pull` twin, but never asserts that the source tape actually contains that fact. If the fact were absent, the twins would be identical and the test would pass vacuously.
   change: Add an assertion that `raw('naive-ndjson').facts.some(f => f.atom_id === 'temporal.rug_pull')` is true before constructing the twins.

Verdict: halt

1. In `packages/cabinet-server/src/vibe-cabinet.ts`, remove `caps` and `clip` (lines 167–174) and add explicit character-length refusal to `reactFault`, `productFault`, and the `ask` handler so overlong strings are refused rather than truncated.
2. In `packages/cabinet-server/src/server-vibe.ts`, remove the `catch` block from `checkVibeCatalogListing` (lines 89–94) so a missing catalog throws.
3. In `packages/cabinet-server/src/server-vibe.ts`, change the `whole` helper (lines 145–150) to validate that `raw` is an integer string before converting; only apply the env var when valid.
4. In `packages/cabinet-server/test/vibe-cabinet.test.ts`, add an assertion before line 142 that the source tape contains the `temporal.rug_pull` fact.

## Dispositions (the coordinator)

| #   | Disposition | Why                                                                                                                                                                                                                                                                               |
| --- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | applied     | The gate accepts or refuses and never fixes; `tooLong` reads the bound from the contract and refuses with `too long`, one test per tool.                                                                                                                                          |
| 2   | refused     | No published package carries `catalog/`; Ghost's `checkCatalogListing` has the same `catch` for the same reason. The mirror is a repo-tree invariant the contract test asserts byte for byte, and a present-but-drifted file still halts the server before it lists.              |
| 3   | applied     | `wholeEnv` validates a whole-number string and treats anything else as absent; nine-case parse test.                                                                                                                                                                              |
| 4   | applied     | One `expect` before the twins are built: the fixture carries the fact and `flipRug` changes it.                                                                                                                                                                                   |
| +1  | coordinator | `ask` refuses a repeat of any queued ask or recent user line (`isRepeatAsk`), because a live seat wrote the same ask into four slots while the view listed it; the rule belongs in the gate, not in a prompt. The push-path numbers and the ten samples were re-taken afterwards. |
