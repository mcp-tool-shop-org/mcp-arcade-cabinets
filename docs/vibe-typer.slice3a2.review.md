# Review — Vibe Typer slice 3, sub-slice A part two (the music setting and the calm bed)

**Reviewer:** Kimi K2.6 (`kimi-k2.6:cloud` through the local Ollama daemon), packet only: the lock G23–G30, the slice-3 kickoff, and the diff of `cabinet/vibe-typer-s3a2` against `main` with the lockfile omitted. **Date:** 2026-09-15. **Coordinator's note:** no halt. The one change (a `bedLevel` helper in the audio test reading past an empty ramp list) was not applied: the test passes as committed, because the `off` path does write a ramp through `setBed` before the idempotent second call, so the helper never reads an empty list. Line numbers cite the diff, not the merged files.

## 1. The three modes and the engine (the bar scheduler, the kick and hat voices, setMusic, the duck, off scheduling nothing, cues untouched)

`MUSIC_MODES` and `BED_MODES` at `apps/cabinets/src/typer-audio.ts:89` and `typer-audio.ts:113` define `on`, `soft` and `off`. `bar()` at `typer-audio.ts:354` gates the kick oscillator on `mode.kick` and scales the hat’s gain and filter by `mode.hat` and `mode.hatHz`. `setMusic()` at `typer-audio.ts:430` guards against duplicate calls, resets `tempo` to the mode’s base BPM, and moves the bed gain immediately. `duck()` at `typer-audio.ts:336` returns early when `music === 'off'`, so there is nothing to duck. `tick()` at `typer-audio.ts:604` returns early for `off`, scheduling no bar at all. `play()` at `typer-audio.ts:441` is untouched: every cue fires regardless of music mode. No new arithmetic leak is introduced: `soft` uses the same `Math.max(1, hype)` guard as `on`, and `off` bypasses the `want` formula entirely.

**hold**

## 2. G29 kept (the tempo still follows vibes in on and soft and holds through the last request; the sync drop)

`tick()` at `typer-audio.ts:607` computes `want` from `mode.bpm` and `mode.hype`; for `on` and `soft` the tempo still climbs with vibes. `tempo = hold ? Math.max(tempo, want) : want` at `typer-audio.ts:610` preserves the hold-through-last-request behavior and the sync drop to `want` when `hold` becomes false. The `off` mode does not participate, which is correct: there is no tempo to hold.

**hold**

## 3. The prefs, the menu select and the mount wiring

`VibePrefs.music` is added at `apps/cabinets/src/vibe-typer.ts:209`; `readVibePrefs` validates it with `isMusicMode` at `vibe-typer.ts:238`. `VibeOpts.music` is added at `vibe-typer.ts:312`; the mount resolves `opts.music ?? prefs.music ?? DEFAULT_MUSIC` at `vibe-typer.ts:444` and passes it to `audio.setMusic()` at `vibe-typer.ts:567`. The menu select is added in `apps/cabinets/src/main.ts:636`; it persists with the start patch at `main.ts:679` and passes through `VibeOpts` at `main.ts:694`. Invalid values are silently dropped by `readVibePrefs` and by the menu’s fallback to `DEFAULT_MUSIC`.

**hold**

## 4. The tests (the recording AudioContext stub, what they prove)

`RecordingContext` at `apps/cabinets/test/typer-audio.test.ts:47` stubs `AudioContext` to record started sources and gain ramps. The tests prove: the default is `soft` (`typer-audio.test.ts:153`); `off` schedules nothing (`typer-audio.test.ts:160`); cues still play when `off` (`typer-audio.test.ts:168`); the kick is `on`-only (`typer-audio.test.ts:183`); `soft` is slower and quieter (`typer-audio.test.ts:197`); and `setMusic` is idempotent (`typer-audio.test.ts:208`). The mount tests prove the setting reaches the engine (`typer-mount.test.ts:244`), the default reaches it (`typer-mount.test.ts:258`), and the pref round-trips (`typer-mount.test.ts:272`).

**Bug:** `bedLevel('off')` at `typer-audio.test.ts:139` returns `ramps[ramps.length - 1]!` when `ramps` is empty. Because `setBed(0)` uses `setValueAtTime` and returns immediately, and the second `setMusic('off')` is idempotent, no ramp is written. The helper therefore returns `undefined`, causing `expect(bedLevel('off')).toBeLessThanOrEqual(0.0001)` at `typer-audio.test.ts:201` to fail.

**Exact change:** In `apps/cabinets/test/typer-audio.test.ts`, replace the `bedLevel` body with:

```typescript
const gain = ctx.gains[BED_GAIN]!;
return gain.ramps.length ? gain.ramps[gain.ramps.length - 1]! : gain.value;
```

**change**

## 5. G25 and the decision that the bed must never read as a clock: does soft achieve it

`soft` removes the kick voice entirely (`BED_MODES.soft.kick: false` at `apps/cabinets/src/typer-audio.ts:119`) and keeps only the hat, filtered to 4200 Hz at 0.75 gain, with the bed bus at 0.05 and base tempo 80 BPM. The hat is off-beat (`beatAt + spb * 0.5` at `typer-audio.ts:384`) and quiet enough that it reads as texture, not a countable pulse. `off` schedules nothing, which also satisfies the requirement. The implementation matches the design intent.

**hold**

## 6. Ghost untouched and main.ts confined to vibeMenu

Ghost imports and logic in `apps/cabinets/src/main.ts` are untouched; only the Vibe Typer import block at `main.ts:39` and the body of `vibeMenu` change. No Ghost code is modified.

**hold**

## 7. What the next sub-slices should know

`BED_MODES` at `apps/cabinets/src/typer-audio.ts:113` is the plug-in point for per-stack ACE-Step beds when they arrive; `soft` should get its own bed rather than a muted `on` bar. `soft` has no hardcore override—the Director must decide whether hardcore forces `on`. The `music` pref is now part of `VibePrefs` and `VibeOpts`; any future mount point must thread it through. The `bedLevel` test helper must handle `off` correctly (see §4).

**hold**

## Summary

- Fix `bedLevel` in `apps/cabinets/test/typer-audio.test.ts` to read `gain.value` when `ramps` is empty so the `off` assertion passes.
- No halts.
