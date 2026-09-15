# Review — Vibe Typer slice 3, sub-slice B part two (the levers, the stories, the nags)

**Reviewer:** Kimi K2.6 (`kimi-k2.6:cloud` through the local Ollama daemon), packet only: the lock G23–G30, the slice-3 kickoff, and the diff of `cabinet/vibe-typer-s3b2` against its base with corpus JSON and the lockfile omitted. **Date:** 2026-09-15. **Coordinator's note:** no halt; the one change (the coffee level's spelling) was already made by sub-slice A and resolved in the merge. Line numbers cite the diff, not the merged files.

## 1. The nag mechanic in the sim (timing in frame time, the first-line rule, the owed reply, no cost, no streak, no hype, no value)

The nag clock lives in the WeakMap context (`sim.ts:56-66`) and arms with `state.clock + min + rng() * (max - min)` in frame time (`sim.ts:108`). `maybeNag` fires only on `code` beats (`sim.ts:124`), never while `nagReplyPending` (`sim.ts:124`), and never on the run’s first line (`sim.ts:125-126`). On firing it pushes a `message` event with `nag: true` (`sim.ts:129`) and leaves valuation, hype, streak and context untouched—confirmed by the byte-identical bar (`band.test.ts:220-228`). The answer lands in `sendLine` after a clean line, before the ship or reply (`sim.ts:438-441`); an owed reply is dropped at level advance (`sim.ts:365`).

**hold**

## 2. Determinism (the separate salted generator, the rng call order for a pinned level, the WeakMap context)

Determinism is protected by a separate generator salted with `NAG_SALT` (`sim.ts:78`, `sim.ts:116`). The WeakMap keeps `nextNagAt` and `nagReplyPending` off `RunState` so the band can strip chat/events and compare bytes (`band.test.ts:220-228`). For pinned levels the rng call order is: no pick, then creep test, then creep line draws (`level.ts:113-120`); drawn levels keep the pick first (`level.ts:122-127`). No `Date.now`, `Math.random`, or un-sorted iteration appears; `Object.keys` in `loadPools` walks insertion order from JSON (`patterns.ts:406-412`).

**hold**

## 3. The loader and the data contract (ask on a snippet, story and pinned snippets, nags, nagReplies, reactionsByTopic, reviewsByProduct; halts and gate bypasses)

The loader gates every new field. Snippet `ask` runs through `lineFault` and rejects `{title}` (`corpus.ts:70-76`). `story` and `product` are gated (`patterns.ts:368-369`). Pinned snippets are checked for exact length, duplicates and empties (`patterns.ts:371-380`). `nagEvery` enforces `0 < min <= max` (`patterns.ts:392-397`). `nags`, `nagReplies`, `reactionsByTopic` and `reviewsByProduct` all pass `loadLines` or `loadPools` (`patterns.ts:658-663`). Halt tests cover missing stories, backwards clocks, short pools and bad topic lines (`patterns.test.ts:145-160`). One British spelling remains player-facing: `levels.json:67` still reads `"a loyalty programme for the coffee machine"` despite Decision 4 requiring American English.

**change** — `packages/vibe-typer/patterns/levels.json:67` s/programme/program/

## 4. The picker (topic fallback, review by level id, bags and repeats)

`askFor` returns a snippet’s own ask verbatim and spends no draw from the template bag (`lines.ts:78-87`, `lines.test.ts:171-174`). `reaction(snippet)` walks topics in order and falls back to the tier pool (`lines.ts:96-102`). `review(levelId)` prefers the product pool (`lines.ts:112-116`). Bags prevent repeats within a level (`lines.test.ts:89-94`).

**hold**

## 5. The band bars added and the old bars

Three bars added: nag count inside `[1, 16]` (`band.test.ts:169-181`), nag beat correctness at every tier including endless (`band.test.ts:183-191`), and byte-identical stripped state when nags are toggled (`band.test.ts:193-228`). Slice-1 and slice-2 bars are reported holding at original numbers.

**hold**

## 6. The shell (the nag cue, the audio, the chat class, the standup story)

The shell adds `nag` to `CueName` (`typer-cues.ts:23`), renders user nags as `vibe-nag` (`vibe-typer.ts:469-473`), sounds them as a descending fourth (`typer-audio.ts:395-406`), and keeps agent answers as ordinary `blip` cues (`typer-cues.ts:108`). The standup shows `plan.story` when present (`vibe-typer.ts:916-917`).

**hold**

## 7. Tone and G25 nothing yells in the hand-written lines

All hand-written lines are gate-clean and calm: no caps, no exclamation marks, no model names. The nag cue carries zero shake, flash, confetti and toast (`typer-cues.test.ts:145-150`). The audio descends rather than climbs (`typer-audio.ts:395-406`). Nothing yells.

**hold**

## 8. What the authoring run and sub-slice C should know

The authoring run must scale the placeholder pools (sixteen nags, six topic reactions, etc.) to the sizes promised in the brief. Sub-slice C must ensure the seat’s code gate (`codegate.ts`) and chat gate both run before any model-written string reaches the field, and that prefetch never blocks the nag clock (G13). The seat name must stay off the field (G17).

**hold**

## Summary

One change: `packages/vibe-typer/patterns/levels.json:67` still reads "programme"; make it "program" per Decision 4. No halts. Determinism is clean, the nag mechanic moves no score numbers, all new pools pass the gate, and the band bars hold.
