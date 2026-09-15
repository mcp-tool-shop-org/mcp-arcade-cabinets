# Review — Vibe Typer slice 2 (the shell)

**Reviewer:** Kimi K2.6 (`kimi-k2.6:cloud` through the local Ollama daemon), packet only: the lock G23–G30, the slice-2 kickoff, and the diff of `cabinet/vibe-typer-s2` against `main` with the keyboard samples and the lockfile omitted. **Date:** 2026-09-15. **Coordinator's note:** no halt; the four changes applied on `main` the same day (the creep hold counts frame time and sim time does not accumulate under it; the editor shake draws from the run's seeded generator; the bed drops to base tempo during a sync; the Escape test restores its clock mock in a `finally`). Line numbers cite the diff, not the merged files.

## 1. The mount, the loop and the keystroke path

One keystroke per step is enforced: `advance` feeds `queue.shift() ?? {}` to `stepRun` once per iteration (`vibe-typer.ts:851`). IME composition is ignored at the source (`typer-keys.ts:37`). Escape is a hold: `readKey` returns `leave` (`typer-keys.ts:48`), the mount records `escSince` on keydown (`vibe-typer.ts:893`), clears it on keyup (`vibe-typer.ts:911`), and exits only after `LEAVE_HOLD_MS` (`vibe-typer.ts:900`). Unmount removes the window listeners, cancels the RAF handle and closes the audio context (`vibe-typer.ts:925`).

Two determinism leaks break replayability. First, the editor shake in `tick` uses unseeded `Math.random()` (`vibe-typer.ts:888`); it must draw from the mount's existing `rng` (seeded from `planOf(state).seed`). Second, `holding()` gates the sim loop on wall-clock time (`performance.now()` / `Date.now()` at `vibe-typer.ts:502`) instead of frame `dt`. Worse, `acc` is incremented _before_ the hold check (`vibe-typer.ts:845`), so the 600 ms creep hold caps and discards sim time; the loop falls behind the wall clock and never catches up. The hold should count down in `dt` (frame time) and skip `acc` accumulation while active.

**change** — Replace `Math.random()` in shake with `rng()` (`vibe-typer.ts:888`). Replace wall-clock creep hold with a `dt`-based countdown that prevents `acc` from growing during the hold (`vibe-typer.ts:845`, `vibe-typer.ts:502`).

## 2. The panes and the scoreboard

G23 is respected on the field: the board shows valuation, vibes, streak and context; the mount test asserts the absence of “accuracy”, “wpm”, “errors” and “mistakes” (`typer-mount.test.ts:175`). The retro is opt-in every third standup (`vibe-typer.ts:956`) and speaks only in words (consistency, speed), never in typist counts.

G24 is respected: `drainEvents` pushes pieces whose `size` equals the event’s value (`vibe-typer.ts:810`), and `packPieces` lays out blocks with area proportional to that size (`vibe-typer.ts:670`). The valuation rolls up over `ROLLUP_MS` and never down (`vibe-typer.ts:753`).

`packPieces` floors zero-size pieces to `0.01` to avoid division by zero (`vibe-typer.ts:670`). This is safe but means a zero-value piece still draws a sliver; the sim’s deterministic difficulty formula should never emit zero, so the distortion is theoretical.

**hold**

## 3. The cue table and the audio engine

Exhaustiveness is solid: `typer-cues.ts:89` switches on `Event['kind']` with a `never` default, and `typer-cues.ts:68` lists all twelve kinds. `typer-cues.test.ts` walks a value of every kind at runtime and asserts distinct cue names, correct pitch-to-rate mapping, grazed near-miss selection, and zero shake on bad keys.

The keystroke engine uses round-robin variants (`typer-audio.ts:267`), ±3 % detune from a seeded RNG (`typer-audio.ts:265`), oldest-steal polyphony capped at six (`typer-audio.ts:140`), and a procedural click-and-sine fallback when samples are missing (`typer-audio.ts:274`). The bed tempo scales with hype and holds via `Math.max(tempo, want)` when `hold` is true (`typer-audio.ts:414`), satisfying the last-request hold.

The sync breather is missing its tempo drop. The brief requires the bed to drop to base tempo during sync; the shell calls `audio?.tick(dt, state.hype, hold)` with no sync flag (`vibe-typer.ts:904`), so hype-driven tempo persists through the meeting. Pass `isSync ? 1 : state.hype` (or add a `sync` parameter to `tick`) so the bed returns to `BED_BPM` during sync.

**change** — Override `hype` to `1` in `audio.tick` while `state.beat === 'sync'` (`vibe-typer.ts:904`).

## 4. Quick sync in the sim and the band

The sim changes are correct. `Beat` gains `'sync'` (`types.ts`), `Event` gains `{ kind: 'sync'; on: boolean }`, and `LevelPlan` gains `syncAt` (`types.ts`). `planLevel` draws the meeting index between requests 1 and `requests.length − 1` (`level.ts:127`). `stepRun` skips the context drain during sync (`sim.ts:449`), `sendSyncLine` pays no value, builds no piece and leaves `streak` untouched (`sim.ts:332`), and the typist bot types sync lines like any other (`play.ts:53`). The user pool has fourteen lines capped at five words (`user.json`, `patterns.ts:615`), and the loader halts on a long one (`patterns.test.ts:112`). Band bars hold at slice-1 numbers because the drain stops for sync.

**hold**

## 5. The menu switch and Ghost untouched

The two-card switch puts Ghost first and selected by default (`main.ts:136`), persists the choice (`main.ts:124`), and routes to `ghostMenu` or `vibeMenu`. Ghost’s menu is moved into a function but otherwise unchanged; the `data-local-seats` markers and launcher grep strings remain in the bundle. Vibe prefs live under the `vibe.` prefix and `cleanName` strips digits (`vibe-typer.ts:248`). Integration snippets are seasoned once from the bundled tapes (`main.ts:414`), satisfying G30.

**hold**

## 6. The mount test and the other shell tests

`typer-keys.test.ts` covers printable characters, space (prevent-default), Backspace, Enter, Tab, Escape, modifiers, `isComposing`, and repeat. `typer-cues.test.ts` covers the exhaustive table, deduplication, and feel constants. `typer-mount.test.ts` runs under jsdom with stubbed canvas and AudioContext, asserts the first reply reaches chat, the editor advances to code, no digit appears in chat, and unmount freezes the DOM.

The Escape-hold test leaks its `performance.now()` mock: if the assertion fails, `spy.mockRestore()` never runs (`typer-mount.test.ts:220`). Add `try … finally` or an `afterEach` that calls `vi.restoreAllMocks()` so the leak does not poison subsequent tests.

**change** — Wrap `mount.tick(STEP)` and the assertion in `try { … } finally { spy.mockRestore(); }` (`typer-mount.test.ts:220`).

## 7. Tone and G25 nothing yells, and the fading of the retro (G27)

G25 holds. A bad key colours its character and sounds the error sample at reduced gain (`typer-cues.ts:96`), with zero shake and zero flash. A bad line triggers the agent’s “hmm”, resets the line and costs nothing else (sim). Compaction lands as a downward sweep and a summary line in chat (sim). Endless ends with valuation on the board (`vibe-typer.ts:940`). Hardcore is tier 3 from the selector only (`TIER_WORDS`).

G27 holds. Weak bigrams decay by `WEAK_DECAY = 0.5` each run (`vibe-typer.ts:228`) and are merged into `localStorage` at standup (`vibe-typer.ts:948`). The retro is offered every third standup (`vibe-typer.ts:956`), shows the top eight pairs, then consistency, then speed as words—never numbers, never another player.

**hold**

## 8. What slice 3 should know

The shell already documents the hook points in `docs/vibe-typer.slice2.md`: an optional `ask` callback in `VibeOpts`, prefetch fired in `advance`, voice lines fed from `drainEvents` via `message`/`creep`/`ship` cues, and the retro panel open for extension. The beat words want migrating to `cabinet.json` when the package is next open, and a stack picker for integration remains unbuilt. None of this blocks slice 3.

**hold**

## Summary

Three changes before merge: replace `Math.random()` with the seeded `rng` in shake (`vibe-typer.ts:888`), make the creep hold consume `dt` instead of wall clock and stop `acc` from growing while held (`vibe-typer.ts:845`, `vibe-typer.ts:502`), drop the bed to base tempo during sync by passing `hype = 1` while `state.beat === 'sync'` (`vibe-typer.ts:904`), and guard the `performance.now()` mock in the Escape test with `try … finally` (`typer-mount.test.ts:220`). No halts.
