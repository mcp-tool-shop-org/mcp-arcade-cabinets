# Review — Vibe Typer slice 4, sub-slice B batch two (the avatars)

**Reviewer:** Kimi K2.6 (`kimi-k2.6:cloud` through the local Ollama daemon), packet only: the lock G23–G30, the slice-4 kickoff (the frame, the carried decisions and § Sub-slice B), and the diff of `cabinet/vibe-typer-s4b2` against `main` with the docs, the receipts, the images and the lockfile omitted. **Date:** 2026-09-16. **Coordinator's note:** halt, two items, both on a test file and both applied on the branch before the merge. The review covers the shell and test code; the user's portrait was redrawn twice after it on the Director's read (the plant withdrawn, then the character set as a man with an overgrown beard and messy hair), which changed images and records only. Line numbers cite the diff.

1. **apps/cabinets/test/avatar-cut.test.ts:110–111**
   The test named "keeps the whole subject inside the avatar it cuts" asserts only vertical containment (`square.y` and `square.y + square.h`) while its claim is that the whole subject is inside. It omits horizontal containment (`square.x` and `square.x + square.w`), so a regression that cropped the left or right edge of a wide portrait would not fail.
   change
   Add `expect(square.x).toBeLessThan(SUBJECT.x);` and `expect(square.x + square.w).toBeGreaterThan(SUBJECT.x + SUBJECT.w);` inside that test.

2. **apps/cabinets/test/avatar-cut.test.ts:66–67**
   The test "writes a 128x128 avatar that is opaque all the way out to its ground" claims the corner pixel is the ground colour, yet it only asserts the red and blue channels (`avatar.data[0]` and `avatar.data[2]`). The green channel (`avatar.data[1]`) is unchecked, so the assertion is weaker than the claim.
   change
   Add `expect(avatar.data[1]).toBe(GROUND[1]);` immediately after the existing two ground-channel assertions.

Verdict: halt

1. Add horizontal containment assertions to `avatar-cut.test.ts` line ~110.
2. Add the green-channel ground assertion to `avatar-cut.test.ts` line ~67.

## Dispositions (the coordinator)

| #   | Disposition | Why                                                                                                |
| --- | ----------- | -------------------------------------------------------------------------------------------------- |
| 1   | applied     | A crop that lost the left or right of a wide portrait would have passed; the pair now fails it.    |
| 2   | applied     | The corner pixel is read on all three channels, so the claim and the assertion say the same thing. |
