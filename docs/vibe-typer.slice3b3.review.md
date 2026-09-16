# Review — Vibe Typer slice 3, sub-slice B part three (the full authoring run and the sixteen levels)

**Reviewer:** Kimi K2.6 (`kimi-k2.6:cloud` through the local Ollama daemon), packet only: the lock G23–G30, the slice-3 kickoff, and the structural diff of `cabinet/vibe-typer-s3b3` against its base (the levers' lines, the corpus asks and the authoring receipts omitted, since a following pass re-voices them). **Date:** 2026-09-16. **Coordinator's note:** no halt; the one change (the duck level's product is a brand name and becomes `a rideshare for ducks`) was handed to the coherence pass, which re-voices the stories and products on top of this branch, and the four pinned-twice snippets it names are on that pass's list as well. Line numbers cite the diff, not the merged files.

## 1. The sixteen levels in levels.json (two per corpus stack, a third for python and javascript, two integration; band order; pinned ids unique or not; the products)

Sixteen levels, band-ordered 1–2 through 5: two each for bash, sql, java, csharp; three each for python and javascript; two integration (`tool-finder` at `levels.json:67`, `one-button-company` at `levels.json:145`). Pinned ids are not unique across levels: `cal-js-d2-003` is pinned in `handwriting-rater` (`levels.json:29`) and `fridge-chain` (`levels.json:45`); `cal-sq-d2-004` in `sandwich-ledger` (`levels.json:37`) and `plant-dashboard` (`levels.json:60`); `cal-jv-d3-002` and `cal-jv-d3-003` in `lost-sock-platform` (`levels.json:53`) and `coffee-loyalty` (`levels.json:77`). The slice doc notes this as a same-run non-collision, but a coherence-pass item. The product `"Uber but for ducks"` at `levels.json:11` is a brand name on a player-facing surface; the gate bars brands and the `PRODUCT_PHRASE` mapping at `author.mjs:97` already translates it to `"a rideshare for ducks"`.

**change** `packages/vibe-typer/patterns/levels.json:11` `"product": "Uber but for ducks"` → `"product": "a rideshare for ducks"`.

## 2. The loader change letting an integration level be listed without pins, and play.ts, helpers.ts and level.test.ts seasoning the corpus from tapes

`patterns.ts:785-790` narrows the loader halt from `levels.<i>.stack` to `levels.<i>.snippets`; an integration level without pins loads. `play.ts:198-204` seasons `opts.integration` from tapes on every run, not only when the stack is forced to integration. `test/helpers.ts:72-76` and `test/level.test.ts:16-24` season from `fixtures/tapes` so the band and unit tests plan from the same corpus the shell uses. No determinism leak: the tests use fixed fixtures and the band asserts byte-for-byte sameness.

**hold**

## 3. The sweep script and the tuning rule (drainPerSec times seconds near 0.93 at tier zero), the three re-tuned levels, the widened check-in floor with its measurement

`sweep-levels.mjs:33` sets `BAR_BUDGET = 0.93`; `sweep-levels.mjs:170` computes `want = BAR_BUDGET / Math.max(1, r.seconds)`, safe from division by zero. Re-tuned: `fridge-chain` `drainPerSec` 0.0029→0.0020 (`levels.json:48`), `plant-dashboard` 0.0030→0.0022 (`levels.json:60`), `app-that-rates-apps` 0.0010→0.00062 (`levels.json:132`). Widened floor: `band.test.ts:39` sets `NAG_FLOOR_SECONDS = 180`; `band.test.ts:218-220` applies the minimum only when `seconds >= 180`. The sweep table shows short levels (e.g., `tool-finder` ~128 s) correctly permitted zero check-ins.

**hold**

## 4. The band (every bar over sixteen levels, four tiers, three seeds; the 120 s test timeout)

`band.test.ts:12` raises vitest timeout to `120_000` ms. The slice doc lists 17 band tests holding over 16 levels × 4 tiers × 3 seeds, including the byte-for-byte nag toggle and the check-in floor. No arithmetic underflow: drain values are positive literals; `mean` in sweep divides by `Math.max(1, xs.length)`.

**hold**

## 5. The authoring script's persona and the run receipt shape (chunking, the 429 backoff, what the receipt records)

Persona: `author.mjs:502-517` `PERSONA` constant; prepended to `SYSTEM`. No real name, no brand, no tool. Chunking: `author-lib.mjs:282-304` `mapLimit` preserves input order; `author.test.ts:291-304` proves it. 429 backoff: `author.mjs:450-453` constants; `author.mjs:473-490` waits with exponential backoff capping at `BUSY_CAP_MS` and jitter (`Math.random()` offline only, does not affect lever content). Receipt: `author.mjs:1305-1341` writes per-slot candidate files and a cumulative `stamp-run.json` with `model`, `route`, `temperature`, `concurrency`, `applied`, `wallMs`, and per-slot reports. The slice doc states per-call prompt hashes live under `slots.<name>.prompts`; the diff does not contradict this. No model string bypasses the gate: every slot calls `askSlot`, which applies the gate before writing to `lines`.

**hold**

## 6. The MIN_* floors raised

`patterns.ts:73-88` raises all `MIN_*` constants to match the pool targets authored by the run (e.g., `MIN_ASKS` 16→48, `MIN_NAGS` 12→50). The loader halts if any pool is undersized.

**hold**

## 7. What the coherence pass should know

Four snippets are pinned into two levels each (`cal-js-d2-003`, `cal-sq-d2-004`, `cal-jv-d3-002`, `cal-jv-d3-003`). A cross-level `used` set in the `stories` slot would fix it, requiring a re-run of that slot (`docs/vibe-typer.slice3.md:...`). Three snippets (`cal-sh-d2-002`, `py-for-loop`, `cal-py-d2-002`) carry no ask of their own and fall back to the template pool; they were un-pinned by the authoring run (`docs/vibe-typer.slice3.md:...`). `tool-finder` reviews contain the slug `"tool-finder"` because the review prompt showed the level id; the coherence pass should re-voice these (`docs/vibe-typer.slice3.md:...`). Nineteen of the first fifty check-in candidates ran to two sentences and were dropped; the pool is above floor, but shorter replacements are in the receipt if desired (`docs/vibe-typer.slice3.md:...`).

**hold**

## Summary

One change: replace the brand name in `levels.json` `duck-rides` product with a generic phrase. Every other bar holds; the sixteen levels are ordered, the integration loader is narrowed, the sweep tuning and check-in floor are measured, the authoring receipt records waits and per-slot output, the MIN_* floors match the run, and the coherence pass has four known items to address.
