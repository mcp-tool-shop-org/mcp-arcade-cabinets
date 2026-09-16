# Review — Vibe Typer slice 4, sub-slice B batch three (the milestone cards and the deploy ribbon)

**Reviewer:** Kimi K2.6 (`kimi-k2.6:cloud` through the local Ollama daemon), packet only: the lock G23–G30, the slice-4 kickoff (the frame, the carried decisions and § Sub-slice B), and the diff of `cabinet/vibe-typer-s4b3` against `main` with the docs, the receipts, the images and the lockfile omitted. **Date:** 2026-09-16. **Coordinator's note:** halt, four items. One applied. Three described sub-slice C's voice files as removed or altered, because the packet was cut against a `main` that C had moved after this branch was cut; the branch never touched those files, and the branch was then rebased onto the moved `main`. Later packets are cut from the merge base. Before the review, the coordinator had already sent one change: the milestone card is drawn over the preview pane rather than behind the scoreboard toast, where the art was invisible at the only size it was ever shown.

1. `apps/cabinets/src/typer-audio.ts` lines 3–6
   The comment reintroduces a machine-local path that the text it replaced explicitly said slice 4C had removed.
   change: Restore the path-free wording.

2. `packages/vibe-typer/patterns/voice/user.md` lines 7–12
   The diff strips the user's authored description and replaces the masculine pronouns. The voice sheet must match the character the Director set.
   change: Restore the character description and pronouns.

3. `packages/cabinet-server/src/voice-vibe.ts` (deleted) and the voice wiring in the shell, the lever, the launcher proxy, the sit measurement and the changelog entry
   The diff excises the entire slice-4C voice implementation. A sub-slice branch must not revert another sub-slice's work without a recorded decision.
   change: Restore the voice code and its records, or document a Director-signed decision to cut it.

4. `apps/cabinets/src/vibe-typer.ts` lines 665–672
   The card preload loop fires `img.src` for every slug but never cancels outstanding requests on unmount; a late handler still mutates the closed-over `cards` Map.
   change: Track the elements and abort their loads in the cleanup path, or guard the handler with a mounted flag.

Verdict: halt

## Dispositions (the coordinator)

| #   | Disposition     | Why                                                                                                                                                                                            |
| --- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | not this branch | The branch never edited that file; the packet compared against a `main` the voice merge had moved. The path-free comment is what is on `main`.                                                 |
| 2   | not this branch | Same cause; the sheet on `main` carries the character and one pronoun throughout.                                                                                                              |
| 3   | not this branch | Same cause; the voice is on `main` and untouched by this branch, which was rebased onto it before the merge.                                                                                   |
| 4   | applied         | The handlers now take the mount's `left` guard as the voice probes do; the test fires the `error` half after unmount on the four preloaded images and fails without the guard, passes with it. |
