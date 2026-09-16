# Review — Vibe Typer slice 4, sub-slice B batch one (the piece tiles)

**Reviewer:** Kimi K2.6 (`kimi-k2.6:cloud` through the local Ollama daemon), packet only: the lock G23–G30, the slice-4 kickoff (the frame, the carried decisions and § Sub-slice B), and the diff of `cabinet/vibe-typer-s4b1` against `main` with the docs, the receipts, the images and the lockfile omitted. **Date:** 2026-09-16. **Coordinator's note:** no halt; nothing to apply. Line numbers cite the diff.

1. `apps/cabinets/src/vibe-typer.ts` lines 950–960
   The piece `kind` is derived from `planOf(state).requests[state.requestIndex]?.snippet` at event-drain time. The comment documents the sim step contract (`ship` pushes, `advance` has not run), and the test in `typer-mount.test.ts` verifies the fallback block path when tiles are absent. No wait, no gate bypass, no determinism leak visible.
   hold

2. `apps/cabinets/src/vibe-typer.ts` lines 404–410, 843–860
   `askTiles` fires `Image` loads asynchronously with `{ once: true }` handlers and a `tilesAsked` guard; the draw loop simply skips the tile if the map misses. No state waits on the load, and a missing or broken tile silently falls back to the flat block, satisfying G25's "nothing yells" rule.
   hold

3. `apps/cabinets/src/typer-tiles.ts` lines 1–535
   The topic-to-kind table is player-opaque: the field never renders a topic string, only the resulting 128 px tile. No model name, tool name, digit, or score word reaches the surface. British spellings are absent from every player-facing path.
   hold

4. `apps/cabinets/src/typer-tiles.ts` lines 524–529, `apps/cabinets/test/typer-tiles.test.ts` lines 1–209
   `pieceKindOf` is total (`hashString` modulo 8 covers unmapped topics), stable (deterministic on `id` and topic order), and the corpus test asserts all eight kinds appear and that >80 % of snippets map by topic. No silent swallow; the `?? { id, topics: [] }` fallback in the mount is defensive and unreachable under the documented step contract.
   hold

5. `apps/cabinets/scripts/slice-tiles.mjs` lines 1–385, `.d.mts` lines 1–39
   The slicer is build-side only (comment explicitly states it does not ship), throws on malformed sheets rather than guessing, and uses no external dependencies. No packaging or CI surface is altered in the diff.
   hold

6. `apps/cabinets/test/typer-mount.test.ts` lines 354–395
   The stubbed-canvas test asserts `fillRect` is present and `drawImage` is absent under jsdom, which matches its claim that the fallback block path holds when tiles do not load.
   hold

7. `.gitignore` lines 16–18
   The new ignore entry covers the contact-sheet originals (`docs/art/originals-vibe-2/`); the shipped 128 px slices live under `public/` and are not ignored. No risk of publishing raw batch inputs.
   hold

Verdict: no halt
