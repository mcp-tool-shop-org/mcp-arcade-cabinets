# Review — Vibe Typer slice 3, sub-slice C (endless on a model)

**Reviewer:** Kimi K2.6 (`kimi-k2.6:cloud` through the local Ollama daemon), packet only: the lock G23–G30, the slice-3 kickoff, and the diff of `cabinet/vibe-typer-s3c` against its base with the lockfile omitted. **Date:** 2026-09-15. **Coordinator's note:** no halt. Applied on the branch before the merge: the NaN guard before the range test, and the spelling list on the seat's ask, title, notes and product (detail `spelling: <hit>`). Not applied: the newline replacement, because `\b` already treats a newline as a boundary. Line numbers cite the diff, not the merged files.

## 1. The code gate

The gate runs 14 checks in fixed order: shape, printable ASCII, tab/CR, line count, column width, bracket balance, language heuristics, barred words, model names, band value, then chat-gate fields (ask, title, notes, product). `balanced` scans line-by-line, respects `\` escapes and comment marks, and tracks `()[]{}` with a stack (`packages/vibe-typer/src/codegate.ts:252`). `LANGUAGE_HINTS` is a cheap keyword table (`needs` every-of, `must` any-of, `mustNot` none-of) scoped to the stack (`packages/vibe-typer/src/codegate.ts:183`). `bandRange` caches per-corpus in a `WeakMap` and widens the corpus range by `VALUE_TOLERANCE = 0.15` (`packages/vibe-typer/src/codegate.ts:293`).

Two bypasses remain:

- A barred word or model name split across lines evades the `\b` word boundaries because newline is a non-word character (`packages/vibe-typer/src/codegate.ts:198` and `:200`).
- A `NaN` difficulty value passes the `v < low || v > high` range test because all comparisons with `NaN` are false (`packages/vibe-typer/src/codegate.ts:224`).
- The ask, title, notes and product are checked only by `lineFault` and `TEXT_NOT_ASCII`; neither the diff nor the visible `lineFault` implementation rejects British spellings, so a seat can write _programme_ or _colour_ onto the field (`packages/vibe-typer/src/codegate.ts:226-240`).

No off-by-one: `MAX_LINES` refuses at `> 12`, `MAX_COLS` at `> 80`, `MAX_NOTES` at `> 3`, `MAX_PRODUCT_WORDS` at `> 8`.

**change** — In `packages/vibe-typer/src/codegate.ts:198` and `:200`, replace `code` with `code.replace(/\n/g, ' ')` before the `BARRED_IN_CODE` and `MODEL_FORBIDDEN` tests. After `:222` (`const v = valueOf(...)`), add `if (!Number.isFinite(v)) return refuse('value-out-of-band', 'not a number');`. Apply the British-spelling word list from sub-slice A to the ask/title/notes/product checks in the same file (lines 226-240), either by extending `lineFault` or adding a second regex pass, so "colour" cannot reach the field from the seat.

## 2. The sim feed

`feedRequests` appends gated snippets to `ctx.supplied` and sets `ctx.suppliedProduct` once (`packages/vibe-typer/src/sim.ts:118`). `planLevel` splices the buffer in order, overriding the noun-drawn product only when the seat supplied one (`packages/vibe-typer/src/level.ts:162`). `endlessPeek` draws the next level's definition from a fresh seeded stream without mutating run state (`packages/vibe-typer/src/level.ts:108`). With the seat off, the run is byte-identical to `main`; the test asserts an empty feed and no feed produce identical serialised states, and the same feed twice yields deep-equal results (`packages/vibe-typer/test/sim.test.ts:502` and `:560`). No `Date.now`, `Math.random`, or object-key order leaks affect the sim state.

**hold**

## 3. The node side in cabinet-server

The prompt is frozen in `ENDLESS_SYSTEM` and built from the `EndlessView` only; it never sees a tape, receipt, valuation or corpus (`packages/cabinet-server/src/endless.ts:24` and `:78`), satisfying G12. Tiering reuses `sayTier` (Claude by key, else cloud, else local). `chatJson` constrains the answer to a JSON schema, omits the `tools` key when empty, and retries with low-think once for thinkers (`packages/cabinet-server/src/client.ts:242`). `parseRequest` caps every string (`ask` 200, `code` 2048, `title` 80, `notes` 3×200, `product` 80) and returns `null` on any malformed payload rather than throwing (`packages/cabinet-server/src/endless.ts:180`). Transport errors are mapped through `mapTransport` to `"model retired"` or `"no answer"` (`packages/cabinet-server/src/endless.ts:265`). `Date.now` is used only for latency timing, not for content.

**hold**

## 4. The two routes

Both routes enforce POST-only (405), JSON-only (415), a 32 KB cap (413), a 400 ms minimum interval (429), and a 20 s timeout. The Vite middleware manually reads chunks and aborts on overflow (`apps/cabinets/vite.config.ts:354`); the launcher uses `readBody` (`packages/launcher/src/serve.ts:381`). `parseEndlessView` bounds the stack to a closed set, bands to integers 1–7, and free-text fields to hard caps (`packages/launcher/src/serve.ts:88`). The allowlist gains `ENDLESS_PATH` (`packages/launcher/src/allow.ts:27`). The marker gate checks `data-vibe-seat` and `/cabinet/endless` (`packages/launcher/scripts/build.mjs:142`).

**hold**

## 5. The shell

`LOCAL_SEATS` is true in dev and when `VITE_LOCAL_SEATS` is set at pack time (`apps/cabinets/src/vibe-typer.ts:96`). Prefetch fires once per step loop when the current request is paid for, guarded by `seatBusy`, `daemon === 'up'`, and `have + given < def.requests` (`apps/cabinets/src/vibe-typer.ts:1052`). A late answer is queued in `ctx.supplied` for the next level and never blocks the step (`apps/cabinets/src/vibe-typer.ts:892`). The seat status lives only in the controls row (`data-vibe-seat`, `seatStat`) and the standup says only "the user was a model", satisfying G17 (`apps/cabinets/src/vibe-typer.ts:476` and `:1233`). `leave()` aborts both controllers and the probe timer (`apps/cabinets/src/vibe-typer.ts:1281`).

**hold**

## 6. The sit tool and measured numbers

`scripts/sit.mjs` reads `--cabinet` before parsing other flags and delegates to `sit-vibe.mjs` unchanged for Ghost (`scripts/sit.mjs:197`). `sit-vibe.mjs` bundles the sim and cabinet-server in-process, asks the seat per slot, re-asks once on refusal, feeds accepted snippets, and prints latency spread, refusal counts, and ten sampled asks (`scripts/sit-vibe.mjs:1`). The measured numbers show gpt-oss skews too-wide and kimi skews too-long, both caught mechanically (`docs/vibe-typer.slice3.c.md:302`).

**hold**

## 7. The band bar added and the old bars

The new bar `endless with a seat` asserts that a synthetic gated-corpus feed lasts at least as many levels and ships at least as many pieces as the unseated run, with no valuation drop (`packages/vibe-typer/test/band.test.ts:133`). The helper `seatFiller` memoises per level and feeds through the same gate the shell uses (`packages/vibe-typer/test/helpers.ts:175`). Existing bars (endless ladder, scoreboard) are untouched.

**hold**

## 8. What the merge with the nag mechanic and the sixteen-level sub-slice should know

The nag sibling will add nag pools and a `nag: true` event in `stepRun`/`sendLine`; this sub-slice does not touch those functions, so the merge is clean. The sixteen-level sibling will add `story` and pinned `snippets` to `levels.json`; `planLevel` already honours `Snippet.ask` and the `supplied` buffer, so authored asks and seated asks coexist without conflict. The container tools (`product`, `ask`, `react`) are slice 4 and untouched.

**hold**

## Summary

- **change** `packages/vibe-typer/src/codegate.ts`: replace `code` with `code.replace(/\n/g, ' ')` before `BARRED_IN_CODE` and `MODEL_FORBIDDEN` to close the split-word bypass.
- **change** `packages/vibe-typer/src/codegate.ts`: add `!Number.isFinite(v)` guard after `valueOf` to reject `NaN` before the band range check.
- **change** `packages/vibe-typer/src/codegate.ts`: apply the British-spelling word list (from sub-slice A) to the ask/title/notes/product checks so a seat cannot write "colour" onto the field.
- No halts.
