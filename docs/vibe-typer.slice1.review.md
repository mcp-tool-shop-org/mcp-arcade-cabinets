# Review — Vibe Typer slice 1 (the package)

**Reviewer:** Kimi K2.6 (`kimi-k2.6:cloud` through the local Ollama daemon), packet only: the lock G23–G30, the slice-1 kickoff, and the diff of `cabinet/vibe-typer-s1` against `main` with the corpus JSON, the key map and the lockfile omitted. **Date:** 2026-09-15. **Coordinator's note:** no halt; both changes applied on `main` the same day (the last piece carries the deploy bonus; `withIntegration` rebuilds the trigram model over the seasoned corpus, with the test that proves it).

## 1. The sim and the keystroke reducer

`sim.ts:385` silently ignores `input.key` when `length !== 1`, swallowing surrogate-pair characters and empty strings without emitting an event or error. Since the corpus is ASCII-only this is low-risk, but the reducer gives no signal. `sim.ts:299` pushes a built piece whose `size` is the discounted `piece` only, while `sim.ts:297` pays `piece + bonus` into valuation; the preview and the scoreboard therefore diverge by the bonus amount, contradicting Decision 9’s claim that the preview grows by exactly what the score counts (G24).

**change** — in `sim.ts:299` add `bonus` to the `size` field (`size: piece + bonus`) and emit the same total on the `piece` event, or document that the bonus is valuation-only and remove the G24 exact-match claim.

## 2. Determinism and the seed

`seed.ts` uses mulberry32 and FNV-1a; no `Date.now`, no `Math.random`. `corpus.ts:181` `integrationFrom` sorts tape names, eliminating `readdirSync` order variance. `level.ts:83` `endlessDef` draws products from seeded pools. Object-key iteration in `patterns.ts` and `corpus.ts` follows static arrays, not insertion order.

**hold**

## 3. The levers and the gate

`corpus.ts:225` `withIntegration` seasons the corpus but reuses the base n-gram model; integration snippets are valued by a model that has never seen them, violating the brief’s “built once from the whole corpus”. Gate: `safeTitle` in `lines.ts:137` falls back to a clean topic or “that thing”, so a corpus title carrying a digit never reaches chat. No digit or barred word reaches the screen; `typerScreenHit` scopes the scan correctly.

**change** — rebuild the model in `withIntegration` over the combined snippets and update `corpus.test.ts:102` to assert the new model contains integration contexts.

## 4. Difficulty, score and context arithmetic

`context.ts:17` `rateAt` clamps share to `[0,1]`; with one request `last=0` correctly yields share `0`. `score.ts:47` `pay` adds `value * hype * mult`; `value` is clamped to `≥0.01` by `difficulty.ts:119`. `sim.ts:295` clamps `discountShare` to `[0,1]` before computing `piece`. `context.ts:10` `clamp` returns `EMPTY` on `NaN`. No arithmetic path produces `NaN` or leaves `0..1`.

**hold**

## 5. The bots, the band and the play-through

`play.ts:248` `MAX_TICKS` caps the CLI at 40 min; `test/helpers.ts:14` `TICK_CAP` caps tests at 90 min. The band runs inside the tighter limit. `scripts/play.mjs:286` dispatches to `playTyper` and exits before the ghost branch; ghost is untouched. Band asserts determinism, gate, compactions, hardcore, Copilot, endless levels.

**hold**

## 6. The registry change in scripts/play.mjs

`scripts/play.mjs:18` `SCREEN_FORBIDDEN` carries ghost-specific terms; `typerScreenHit` correctly scopes the scan to lines 3..footer, so header digits do not leak. `scripts/play.mjs:286` `process.exit(await playTyper(flags))` exits with the play-through’s return code.

**hold**

## 7. Tone and the lock G25 "nothing yells"

`patterns.ts:336` `lineFault` rejects `!` and `\b[A-Z]{3,}\b`. `agent.json` contains no exclamation marks and no all-caps words; the agent is sycophantic (“You are absolutely right”, “Wonderful thinking”). `user.json` asks are absurd and fond; no cruelty.

**hold**

## 8. What slice 2 should know

`sim.ts:104` `runs` is a `WeakMap`; `codeOf`, `leversOf`, `agentNameOf`, `planOf` return defaults if the state reference is lost (e.g., after structured clone). The shell must preserve the original object or pass context separately. `sim.ts:372` `stepRun` clears `events` at the top of every step; the shell drains them after stepping. `index.ts` exports the full barrel; no `node:` imports reach the browser bundle.

**hold**

## Summary

Two changes before merge: (1) `sim.ts:299` align built-piece `size` with the bonus-included valuation increment, or document the exclusion; (2) `corpus.ts:225` rebuild the trigram model when integration snippets are added, and update `corpus.test.ts:102`. No halts.
