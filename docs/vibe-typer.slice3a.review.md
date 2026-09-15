# Review — Vibe Typer slice 3, sub-slice A (American English, the settings row, the beat words)

**Reviewer:** Kimi K2.6 (`kimi-k2.6:cloud` through the local Ollama daemon), packet only: the lock G23–G30, the slice-3 kickoff, and the diff of `cabinet/vibe-typer-s3a` against `main` with corpus JSON and the lockfile omitted. **Date:** 2026-09-15. **Coordinator's note:** no halt; both changes applied on the branch before the merge (the `analyse` pattern no longer matches the American plural noun `analyses`, and the spelling test scans `apps/cabinets/index.html` whole). Line numbers cite the diff, not the merged files.

## 1. The spelling module and its test (false positives, coverage of levers, corpus titles and notes, the shell)

- `packages/vibe-typer/src/spelling.ts:47` — the `analyze` entry uses `\banalys(e|es|ed|ing)\b`. The alternation `es` catches the British verb “analyses”, but it also catches the American plural noun “analyses” (as in “data analyses”), which is the standard American plural of “analysis”. This is a false-positive gate that will fail the build on legitimate copy.
- `packages/vibe-typer/test/spelling.test.ts:89` — the invariant test guards `analysis` but does not guard the plural noun `analyses`, so the false positive is unprotected.
- `packages/vibe-typer/test/spelling.test.ts:78-82` — the shell scan covers the four `.ts` modules and the Vibe Typer region of `main.ts`, but it does not scan `apps/cabinets/index.html`, which is part of the shell and contains user-facing strings (e.g., the “Tab” hint and other static nodes). The brief’s grep pass covered HTML and markdown surfaces; the test leaves them unguarded for regressions.
- The lever walk, corpus title/note/topic scan, and `code` exclusion are correct. The `main.ts` boundary marker is asserted so the scan cannot silently shrink.

**change** — In `spelling.ts:47`, change the `analyze` regex to `\banalys(e|ed|ing)\b` to exclude the ambiguous plural noun. In `spelling.test.ts`, add `apps/cabinets/index.html` to the shell scan and add an assertion that `britishHit('the data analyses show')` is null.

## 2. The beat words in cabinet.json and the loader's exhaustiveness over Beat

- `packages/vibe-typer/patterns/cabinet.json:9-17` adds all seven beat words behind the `words` key.
- `packages/vibe-typer/src/patterns.ts:38-46` uses `satisfies Record<Beat, true>` on `BEAT_KEYS`, making exhaustiveness a compile-time error; `Object.keys` preserves deterministic insertion order.
- `packages/vibe-typer/src/patterns.ts:348-356` loads every beat through `lineFault`; a missing or ungated beat halts with a keyed message.
- `packages/vibe-typer/test/patterns.test.ts:134-148` asserts halt on missing beat, missing `beats` object, and a beat word containing a digit.
- The shell no longer imports `Beat` and reads `words.beats[state.beat]` at `apps/cabinets/src/vibe-typer.ts:407` and `:537`, so the field cannot drift from the lever.

**hold**

## 3. The settings row, the prefs and the sound select agreeing with the field's mute button

- `apps/cabinets/src/main.ts:600-621` builds the settings row with three selects: type, keyboard, sound.
- The sound select writes `muted` on `change` at `:613-615` and again in `start()` at `:664`, using the same inverted encoding (`off` display → `on` pref) that the field’s own button uses. `mountVibeTyper` reads `prefs.muted` at mount; the two surfaces cannot disagree.
- Font and theme are written only in `start()`, consistent with the existing tier select; a player who changes them and leaves without pressing Play discards the change, which is acceptable menu semantics and still satisfies “persist under `vibe.prefs`” for any committed run.

**hold**

## 4. --vibe-font, the wrap rule, the caret follow and the 1280 grid

- `--vibe-font` is set inline on `.vibe` at `apps/cabinets/src/vibe-typer.ts:368` and consumed by `.vibe-code`, `.vibe-lines li` and `.vibe-beat` in `apps/cabinets/index.html:320,323,330`.
- `.vibe-line` moves to `white-space: pre` at `index.html:338`, preventing mid-token wrap; `.vibe-code` gains `overflow-x: auto` at `:335` so overlong lines scroll sideways instead.
- `keepCaretInView()` at `apps/cabinets/src/vibe-typer.ts:566-576` uses `CARET_MARGIN = 0.2`. It guards `view <= 0` for jsdom and clamps `scrollLeft` with `Math.max(0, x - margin)`. No NaN, underflow, or runaway scroll.
- The `@media (min-width: 1280px)` query at `index.html:443-447` widens the editor column before the text would need to shrink, satisfying the brief’s fallback order.

**hold**

## 5. Ghost untouched (main.ts hunks, index.html)

- In `apps/cabinets/src/main.ts`, the Ghost menu region above `// ——— Vibe Typer` is untouched; only the Vibe Typer imports and `vibeMenu` body change.
- In `apps/cabinets/index.html`, all CSS changes are under `.vibe-*` selectors; no Ghost classes are modified.

**hold**

## 6. The slice doc and the decisions

- `docs/vibe-typer.slice3.md` documents the sub-slice, lists eleven decisions with reasons, records verification commands and results, and does not quote the Director.
- The decisions cover every open point in the brief: font optionality, default size, property scope, grid query, caret margin, module placement, code exclusion, scan scope, and control shape.

**hold**

## 7. What the next sub-slices should know

- Sub-slice B’s authoring script should import `britishHit` from the barrel to gate drafted lines before they reach the levers; land the `analyse` regex fix in Section 1 before B’s full run or the authoring script will false-positive on “analyses”.
- Sub-slice C’s code gate (`src/codegate.ts`) must be wired into the endless prefetch path; the seat must never block a step (G11, G13), so a late, refused or malformed model answer must fall back to the authored pool synchronously without awaiting another frame.
- Sub-slice D’s art receipts belong in `docs/art/receipts.json`; every batch is a spend requiring a Director yes, and the VRAM watchdog (`pwsh -NoProfile -File E:\AI\training\_watchdog_start.ps1`) must run before any Comfy MCP call.
- The `vibe.prefs` key space now holds `tier`, `runs`, `endless`, `agent`, `theme`, `font`, `muted`, `seed`; sub-slice E should avoid collisions.

**hold**

## Summary

- **change** `packages/vibe-typer/src/spelling.ts:47`: narrow `\banalys(e|es|ed|ing)\b` to `\banalys(e|ed|ing)\b` to stop false-positive on the American plural noun “analyses”.
- **change** `packages/vibe-typer/test/spelling.test.ts`: add `apps/cabinets/index.html` to the shell scan so static user-facing strings are guarded.
- No halts.
