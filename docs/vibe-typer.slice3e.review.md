# Review — Vibe Typer slice 3, sub-slice E (the menu by stack, the seat on the endless entry, the premise)

**Reviewer:** Kimi K2.6 (`kimi-k2.6:cloud` through the local Ollama daemon), packet only: the lock G23–G30, the slice-3 kickoff, and the diff of `cabinet/vibe-typer-s3e` against the music branch it was cut from, with the lockfile omitted. **Date:** 2026-09-15. **Coordinator's note:** every section holds; no change, no halt. Line numbers cite the diff, not the merged files.

## 1. The grouped list (stack order, the pick as an index into levels.levels, no digits, any level count)

`byStack` buckets each level’s corpus index via the `forEach` index `i` (`main.ts:607`). The print order is `STACKS` first, then any unknown stack from `byStack.keys()`, so a lever-added stack never loses its heading (`main.ts:612`). The pick is still an index into `levels.levels`; `prefs.level` persists that index and the mount receives `levelIndex` unchanged (`main.ts:571`, `typer-menu.test.ts:147`). A row now carries only the product and `bandWord`, dropping the repeated stack word (`main.ts:604`). The digit gate holds: `typer-menu.test.ts:134` asserts `/\d/` is false over the whole `.vibe-levels` text. No level-count constants are baked in; the test computes expected groups from `LEVELS.length` and `STACKS` (`typer-menu.test.ts:117`, `typer-menu.test.ts:128`).

**hold**

## 2. The endless entry's seat column and the one-look probe (LOCAL_SEATS, the timeout, abort on Play, no write after the menu is replaced, G17 outside the field)

`LOCAL_SEATS` is exported as a boolean (`vibe-typer.ts:100`). The endless row opens on `SEAT_LOOKING` and resolves to `the user is ${tag}` or `SEAT_AUTHORED` (`main.ts:617`, `main.ts:621`). The menu look is bounded by `SEAT_PROBE_TIMEOUT_MS = 5000` (`vibe-typer.ts:113`), not the field’s 2000 ms. Play aborts the controller (`main.ts:731`), and the `.then` guard `isConnected` prevents writing to a replaced menu (`main.ts:621`). G17 is respected: the tag is printed in menu chrome only; nothing in the diff names the model on the field.

**hold**

## 3. The shared probeSeatModels and the field's probeTags rewritten onto it (any behavior change in the field's loop)

`probeTags` now delegates to `probeSeatModels` with `tagsCtl.signal` and `TAGS_TIMEOUT_MS` (`vibe-typer.ts:1083`). `probeSeatModels` internalizes the fetch, JSON parse, `listPilotModels` filter, and swallows all failures as `[]` (`vibe-typer.ts:198`). The callback adds an explicit `tagsCtl.signal.aborted` short-circuit (`vibe-typer.ts:1087`), but because `AbortSignal.any` already includes that signal the behavior is equivalent: no extra network processing after abort. The loop remains non-blocking; `void` is still used (`vibe-typer.ts:1083`).

**hold**

## 4. The standup heading and the premise

The standup heading joins `plan.product` and `STACK_WORDS[plan.stack] ?? plan.stack` with a middle dot (`vibe-typer.ts:1325`). The premise renders only when `plan.story !== ''` (`vibe-typer.ts:1327`). Endless plans carry `story: ''`, so no premise is rendered (`typer-mount.test.ts:398`). The test verifies the heading text and that the premise precedes the run-end line (`typer-mount.test.ts:386`).

**hold**

## 5. Ghost untouched (ghostMenu, the switch, Ghost's CSS) and vibeMenu exported without changing menu();

`ghostMenu`, the `menu()` switch, and Ghost-specific rules are absent from the diff; only `.vibe-levels` and `.vibe-group` are added (`index.html:146`). `vibeMenu` is exported (`main.ts:560`). The bootstrap is guarded with `if (root) menu();` (`main.ts:771`), keeping `menu()` itself byte-identical for Ghost.

**hold**

## 6. The tests (the mocked mount, the LOCAL_SEATS case, the standup cases)

`typer-menu.test.ts:18` hoists a `vi.mock` that stubs `mountVibeTyper` so Play is a pref write and spy call, not a game. The `LOCAL_SEATS = false` case uses `vi.doMock` and `vi.resetModules`, running last to avoid polluting the module cache (`typer-menu.test.ts:178`). Standup cases in `typer-mount.test.ts:390` let the context drain rather than typing four requests; the listed-level test uses hardcore because only there does empty context end the run. `flush(6)` in `typer-menu.test.ts:46` is arbitrary but sufficient for the mocked `fetch` microtask.

**hold**

## 7. What the sixteen-level levers and the art sub-slice should know

The menu grouping is data-driven from `levels.levels` and `STACKS`; the sixteen-level rewrite needs no test or shell changes (`docs/vibe-typer.slice3.md:403`). Every authored level must carry `stack` and `story` for the standup heading and premise to render correctly (`docs/vibe-typer.slice3.md:425`). Art sub-slice D (Comfy MCP) is untouched here and should land only after A–C are green on rectangles, per the brief (`docs/vibe-typer.slice3.md:433`).

**hold**

## Summary

1. Grouped level list by stack; pick stays an index into `levels.levels`.
2. Menu probes seat once (5 s, abort on Play, `isConnected` guard).
3. `probeSeatModels` shared with field; `probeTags` rewritten, no behavior change.
4. Standup heading carries stack word; premise renders when `story` is non-empty.
5. `vibeMenu` exported, bootstrap guarded; Ghost untouched.
6. No halts; no changes required.
