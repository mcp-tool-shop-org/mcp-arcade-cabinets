# Review — slice 7, the shift

Grok, sim owner. Read against G1, G7–G10, G11–G18, G19–G22; G21 is the one in this lane. Diff: `1cc76dc..main` (`8559a28`). The lock is not re-derived. Nothing is tagged.

No halt in this lane. The sim, the patterns and `tape-core` are unchanged by this review. This file is the report.

---

## 1. G1 and G12 on the climb — **hold**

`copiesAt` / `intensityAt` (`patterns.ts:701`, `:709`) lerp the JSON levers by `waveProgress` and `climb`. `sim.ts` reads `meta.round.climb` only in `fireScale` (`:119`) and `spawnDecoys` (`:667`). Decoys stay `lie: false`. `shift.ts` draws from the roster names, ranks the ordered draw, and writes a card from `server_name`, `agent_policy` and `task_tool` (`:213`); none of that is a fact, a lie flag, a count of lies, or a tape row.

The rug-flipped twin (`shift.test.ts:150`) runs at climb 1 for 1500 idle frames and snaps alive-enemy count, shot count, and burst on/off. Spawned decoys move the first; `fireScale` during a burst moves the second; they assert a burst appears (`:175`). Both levers are in the snap. It is the right invariant and complete for the pre-hit claim.

## 2. The shift bar — **hold**

`band.test.ts:189` is G21 as written: last call at live, half the roster survives, half the lies found, beside the tape-alone three quarters (`:157` in the curve block). Half is a step down, not a relaxation: the tape-alone describes still run at climb 0. The felt test (`:182`) is total lamps lost, which for a fixed roster is the same comparison as mean lamps. A per-tape count would be a different question (how many tapes got harder). G21 asked whether the mover loses more lamps than alone; the sum answers that. Seat reader at a quarter (`:202`) is a new survival bar at climb 1, not a quiet cut of “the reader reveals every lie on 0 and 1”.

## 3. The reach and the climb list — for the Director

Five copies and intensity 2.0 at live is the right stop. The first reach (4 and 1.55) moved the mover by one death and was correctly refused. Nine deaths of twenty against five alone sits one above the half-survive bar; that is felt without becoming the wall a third-longer round was. The list `[0, 0.35, 0.7, 1]` (`shift.json:3`) is a ramp. Booth’s trough is a play question, not a data change from this review: leave the third call at 0.7 until you hear it. If call three feels like a slog, drop that entry toward 0.4. Do not put a trough in from the armchair, and do not raise the last call past 1.

## 4. Seat at climb 1 — **hold**

The lever reaches seat. `burstActive` (`patterns.ts:720`) does not take `climb`; the window is still 4–9 s with a 6 s gap (`parallelism.json:16`). `copiesAt` / `intensityAt` do take it: at climb 1 the seat schedule starts at the tape-alone end (3 copies, intensity 1.4) and ends at 5 and 2.0. Extra copies do not shoot (`decoysFire` false). The seat sweeper already dies on seventeen of twenty from aimed formation and boss fire; sixteen against seventeen is the ceiling, not a dead wire. Heat that only lives inside a burst cannot kill a ship that is already down.

## 5. The word lists — **change**

Nothing on either list matches the say gate’s FORBIDDEN, NAMES, or the screen grep. No lamp, ghost, boss, tape, fire, say, view, seat, or vendor. Swap **ribbon** (keep **robin**): they are a near-homophone pair on the odd list, which is the PGP failure the two-list design was meant to stop. **brick** / **bridge** and **flag** / **flask** are lookalikes, not soundalikes; leave them. **horn** / **heron** sit on different lists, so an even-odd swap already fails.

## 6. The code — **change**

A four-bit roster check (`shift.ts:63`, folded into the last word at `:168`) rejects a random other 20-tape menu fifteen times in sixteen. That is enough to say “another menu” for a foreign folder. It is not enough for a spoken transposition of the two even words (first and third): those bits never touch the check nibble, and the shuffled rank still fits under 116280 about half the time, which plays a different valid shift at the same difficulty with no error. The even-odd swap the test covers (`shift.test.ts:108`) still fails, as PGP intended. For hand-me-a-code that same-parity slip is the one that matters. Do not recode from this review (any code already handed would die). A check that mixes all four words is a later lever.

## 7. Tapes, instrument, server — **hold**

`git diff --name-only 1cc76dc..main` does not touch `fixtures/tapes`, `packages/tape-core`, `packages/cabinet-server`, or the instrument. The MCP tools still play one tape; `climb` is a `prepassRound` option the server does not set.

---

## What I changed

Nothing in `packages/ghost-on-the-menu` or `packages/tape-core`. No halt in this lane. This file is the commit.

## What Claude should change

Swap **ribbon** on the odd list when the lists are next edited (Grok’s file; not done here so as not to recode a live menu). A mixed-word check for same-parity transposition is a later lever, not this slice. Do not start slice 5 from this review. A `shift` tool on the cabinet server stays the Director’s call.

## For the Director

Five and 2.0 at live is the stop: the first try was not felt, this one is, and the mover still clears the half-survive bar. Keep `[0, 0.35, 0.7, 1]` until you play a shift. If the third call feels like a slog, that is Booth’s trough and it belongs in `shift.json` as a lower third number, not as a harder last call. Four is data; do not add a fifth word to rescue the code.
