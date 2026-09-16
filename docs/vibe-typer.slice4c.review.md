# Review — Vibe Typer slice 4, sub-slice C (the voice on the user's lines)

**Reviewer:** Kimi K2.6 (`kimi-k2.6:cloud` through the local Ollama daemon), packet only: the lock G23–G30, the inherited lock G11–G18, the slice-4 kickoff (the frame and § Sub-slice C), and the diff of `cabinet/vibe-typer-s4c` against `main` with the docs, the lockfile and images omitted. **Date:** 2026-09-16. **Coordinator's note:** halt, four items, all four applied on the branch before the merge and recorded in `docs/vibe-typer.slice4.md` § Sub-slice C, "Review (Kimi K2.6, from a packet)". Before the review the coordinator had already sent one change of rule: two takes may be in hand at a request boundary so the reaction is heard on a cold cache. Line numbers cite the diff as reviewed.

1. `packages/cabinet-server/src/voice-vibe.ts` lines 260–310
   The `speak` promise chain has no `.catch()`. If `fetch` throws or the worker returns a malformed payload, the rejection is unhandled and the slot stays in `line` as `pending` forever, leaking memory and hiding the failure from stats and status.
   change: append a `.catch()` that removes the slot if its token still matches, counts it as `noWorker`, and sets a status word.

2. `apps/cabinets/src/vibe-typer.ts` line 785
   The `error` event listener on `takeEl` calls `finishTake()` but never `duckBeds(false)`. A playback error therefore leaves the bed ducked until the next take or a manual stop.
   change: un-duck in the `error` listener as `pause` and `ended` do.

3. `packages/cabinet-server/src/voice-vibe.ts` lines 295–300
   The `why` gate strips digits and path separators from `a.error` but not model or tool names, so a worker error such as "kokoro timeout" or "whisper overload" passes through to the player-facing status text.
   change: replace the dynamic extraction with a static refusal message, or run `a.error` through the same forbidden-word gate used for spoken lines.

4. `apps/cabinets/test/typer-mount.test.ts` lines 830–845
   The test "plays a receipted take and says so in words, naming nothing" checks only five specific strings; it does not verify that other model or tool names are absent from `root.textContent`.
   change: narrow the claim or expand the checked strings to cover all tool and model names.

Verdict: halt

1. Add `.catch()` to the `speak` promise so a rejection removes the slot and updates stats.
2. Add `duckBeds(false)` to the `error` listener.
3. Sanitize or replace the dynamic worker-error path so model or tool names cannot reach player-facing status text.
4. Narrow the claim or expand the checked strings in the "naming nothing" test.

## Dispositions (the coordinator)

| #   | Disposition | Why                                                                                                                                                                          |
| --- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | applied     | A thrown hook would have parked a slot and blocked the take behind it while the stats said it was on its way; the catch drops it, counts it and says so. One new test.       |
| 2   | applied     | A playback error now un-ducks the bed exactly as a pause or an end does.                                                                                                     |
| 3   | applied     | The worker's sentence is never printed; two static words, one per refusal class. The same shape in Ghost's `createVoicer` is named in the doc for a later pass.              |
| 4   | applied     | The test asserts the cabinet's own `NAMES` regex and the digit class over the page, plus the preset as its own line; `VIBE_NAMES` was not used because `ask` is a beat word. |
