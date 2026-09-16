# Review — Vibe Typer slice 4, sub-slice D part two (the beds per stack)

**Reviewer:** Kimi K2.6 (`kimi-k2.6:cloud` through the local Ollama daemon), packet only: the lock G23–G30, the slice-4 kickoff (the frame and § Sub-slice D), and the diff of `cabinet/vibe-typer-s4d2` from its merge base with `main`, with the docs, the receipts, the audio and the lockfile omitted. **Date:** 2026-09-16. **Coordinator's note:** halt, four items; three applied and one refused with its reason, all recorded in `docs/vibe-typer.slice4.md` § Sub-slice D part two, "Review (Kimi K2.6, from a packet)". The Director heard the seven beds and approved the merge. Line numbers cite the diff.

1. **Director quote in source comments** — `apps/cabinets/src/typer-audio.ts`, lines ~115 and ~119.
   The comments for `BED_TRACK_MODE` and `BED_TRACK_LEVEL` end with `// Director`, directly quoting the Director in a committed file. The standing frame forbids this; decisions must be written as decisions with reasons.
   change: Remove the attributions and rewrite the two comments as plain technical decisions with their reasons.

2. **Unhandled promise rejection leaves the bar silent** — `apps/cabinets/src/typer-audio.ts`, line ~481 (inside `startTrack`).
   `void el.play();` sits in a `try/catch` that only catches synchronous throws. `HTMLAudioElement.play()` returns a promise that rejects when autoplay is blocked; the `void` leaves that rejection unhandled. By then `pickTrack` has set `playing` and begun fading the procedural bed out, so the player is left with silence.
   change: Catch the rejection and fall back to the procedural bed.

3. **Test claims pack-gate behavior it does not verify** — `apps/cabinets/test/typer-audio.test.ts`, lines ~360–375.
   The comment claims the pack gate halts before publish if a bed is missing, but the assertion only checks that the seven stack names appear in the `build.mjs` source.
   change: Exercise the build script's layout verification in a test, or remove the claim.

4. **Release script comment misrepresents the protection it adds** — `.github/workflows/release.yml`, lines ~227–237.
   Adding `dist/play/vibe/tracks/` to `carries` only proves at least one file under the prefix exists; missing beds would pass silently.
   change: Add the seven bed paths to `need`, or an explicit existence check.

Verdict: halt

## Dispositions (the coordinator)

| #   | Disposition | Why                                                                                                                                                                                                                                         |
| --- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | refused     | `// Director` is not a quote; it is this repo's marker for a feel constant the Director owns (the kickoff's standards table names it). The markers stay; each comment now states the decision and its reason beside the marker.             |
| 2   | applied     | `startTrack` catches both a rejected promise and a synchronous throw, drops the track (removed from the map so the next level in that stack does not retry), and restores the procedural bed over the crossfade. Two tests.                 |
| 3   | applied     | Taken the stronger way: `packages/launcher/test/pack-gate.test.ts` builds a passing `dist` in a temp dir, runs `checkDist` three ways, and proves one missing bed halts naming that file. The audio test's comment is reduced to its claim. |
| 4   | applied     | The seven paths are in the Vibe package's `need`, derived from one `VIBE_BEDS` array; the overlapping `carries` entry was removed so the weaker check is not the one trusted. Verified against the real tarball.                            |
