# Vibe Typer — slice 3, sub-slice B part two: the levers, the stories, the nags

**Date:** 2026-09-15. **Builder:** Opus (this sub-slice). **Coordinator:** Claude (Fable 5.1). **Director:** Mike.
**Brief:** `docs/vibe-typer.kickoff-s3.md` § "Sub-slice B — the content pipeline" under `docs/vibe-typer.dispatch.md` (the lock G23–G30).
**Branch:** `cabinet/vibe-typer-s3b2`, one commit, not merged.

This is the data contract the authoring script writes into, and the mechanic that plays it. The script itself
(`scripts/author.mjs`, the model choice, the sample the Director reads) is part one and is a sibling's. Nothing
here runs a model, spends anything, or reaches the network. Version stays `0.9.0`.

Three things arrive together because they are one idea — the request should describe the code the player types,
the reaction should know what shipped, and the level should be a story rather than a band — and one thing
arrives beside them: the user checks in while you work, and it costs nothing.

## Standards compliance

| Standard                 | Score | Evidence                                                                                                                                                                                                                                                        |
| ------------------------ | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PIN_PER_STEP             | 3     | The nag clock is a seeded generator salted off the level seed (`NAG_SALT`), so the check-ins replay with the run; `sim.test.ts` still asserts a byte-identical `RunState` for the same levers, seed, tier and input stream.                                     |
| ANDON_AUTHORITY          | 3     | Every new key halts at load with `patterns/<file>: <key>` — a level with no story, a pinned list of the wrong length, a check-in clock that runs backwards, a topic pool with a digit, a snippet ask that yells. Pinned ids that do not exist halt `pnpm test`. |
| NAMED_COMPENSATORS       | 2     | The sub-slice's only irreversible action is the branch push. Compensator: `git push origin --delete cabinet/vibe-typer-s3b2` (owner: the coordinator). No npm, no tag, no release, no Pages deploy, no spend. No skip.                                          |
| DECOMPOSE_BY_SECRETS     | 3     | The words live in `patterns/` and change when the writing changes; the rules live in `src/` and change when the game changes; the shell reads `nag` off an event it already handles. Ghost, `tape-core`, `cabinet-server` and the launcher are untouched.       |
| UNCERTAINTY_GATED_HUMANS | 2     | `nagEvery` is a JSON lever with a row in the table below and a measured sweep behind it. Every line written here is a placeholder the authoring run replaces; they are listed under **What is a placeholder** so the Director prunes on read, not on discovery. |
| EXTERNAL_VERIFIER        | 2     | This builder never reviews its own diff; the coordinator sends it to a different family from a packet. The band is the mechanical check: it proves a check-in moves no number, which is not a thing the builder gets to assert.                                 |

## What was built

```
packages/vibe-typer/src/
  types.ts     Snippet.ask, ChatLine.nag, LevelPlan.story, message events carry nag
  corpus.ts    validates a snippet's own ask at load
  patterns.ts  LevelDef.story + LevelDef.snippets, levels.nagEvery, user.nags,
               user.reactionsByTopic, user.reviewsByProduct, agent.nagReplies, loadPools
  lines.ts     askFor, templateAsk, reaction(snippet), review(levelId), nag(), nagReply()
  level.ts     pinned requests in story order, the story onto the plan
  sim.ts       the nag clock, maybeNag, the answer in sendLine, NAG_SALT
  index.ts     askFor and NAG_SALT on the barrel
packages/vibe-typer/patterns/
  levels.json  a story on all eight levels, pinned snippets on two, nagEvery
  user.json    reactionsByTopic (six topics), reviewsByProduct (two products), nags (sixteen)
  agent.json   nagReplies (sixteen)
  corpus/{bash,python,sql}.json   six snippets carry their own ask
packages/vibe-typer/scripts/
  port-corpus.mjs  reads the file it is about to overwrite and carries every
                   authored ask across by snippet id; prints the count
packages/vibe-typer/test/
  helpers.ts   RunReport.nags and RunReport.nagFaults; DriveOpts.levers
  band.test.ts  three bars: the count, where a nag may land, and what it may not move
  sim.test.ts level.test.ts lines.test.ts patterns.test.ts corpus.test.ts
apps/cabinets/src/
  typer-cues.ts   CueName gains 'nag'; a user message with nag reads as one
  typer-audio.ts  the nag sound: the ping, and a fourth below it a beat later
  vibe-typer.ts   a nag line carries `vibe-user vibe-nag`; the standup shows the story
apps/cabinets/index.html      .vibe-nag, beside .vibe-user
apps/cabinets/test/typer-cues.test.ts
docs/vibe-typer.slice3.b2.md  this file
```

Nothing in `packages/ghost-on-the-menu`, `tape-core`, `cabinet-server`, `launcher`, `catalog/`,
`.github/workflows/`, `site/` or `voice/` was touched. `pnpm-lock.yaml` did not move; no dependency was added.

## The data contract, as implemented

**1. An ask per snippet.** `patterns/corpus/<stack>.json` snippets may carry `"ask": string`, the user's words
for the job that snippet's code actually does. `{product}` may stand in it and is filled at plan time;
`{title}` may not appear, because a snippet that describes itself has no use for its title. `corpus.ts →
loadStack` validates it when present — `lineFault(ask)` must be null, with the literal `{product}` read as the
one word it is — and halts with `patterns/corpus/<stack>.json: <i>.ask`. `Snippet` gains `ask?: string`.
`LinePicker.ask(stack, product, snippet)` now routes through the exported `askFor(snippet, product, picker,
stack)`: a snippet with its own ask is used verbatim and **spends no draw from the template bag**; a snippet
without one reads `picker.templateAsk(...)`, which is exactly the old behaviour.

**2. Level stories and pinned snippets.** Every level in `patterns/levels.json` carries `"story"` — a one-line
premise through the same gate as every authored line — and may carry `"snippets": [id, …]`, exactly `requests`
ids, unique. The loader checks the shape; it never reads the corpus, so `level.test.ts` checks that every pinned
id exists in `DEFAULT_CORPUS` for that level's stack, and a typo halts `pnpm test` rather than the first
play-through that draws it. `LevelDef` gains `story` and `snippets?`; `LevelPlan` gains `story` (endless: `''`).
`planLevel` plays a pinned level's requests **in the authored order**; a pinned id the stack does not carry
throws `patterns/levels.json: levels.<i>.snippets.<j>`. Pinned or drawn, the snippet is added to `used`, valued
by the difficulty formula, and may carry a creep.

**3. Nags and replies.** `patterns/user.json → nags` and `patterns/agent.json → nagReplies`, through `loadLines`
with `MIN_NAGS = 12` and `MIN_NAG_REPLIES = 12` (gate, no duplicate). Sixteen of each are written. The picker
gains `nag()` and `nagReply()` bags.

**4. Reactions per piece.** `patterns/user.json → reactionsByTopic`, a record keyed by a corpus `topics` word.
The record may be empty; a pool that is there carries at least one gate-clean, de-duplicated line. The halt path
is `reactionsByTopic.<topic>.<i>`. `LinePicker.reaction(snippet)` walks `snippet.topics` in order and takes the
next line from the first topic with a pool, else the tier pool as before. One bag a topic, so a level never
repeats a reaction.

**5. Reviews per product.** `patterns/user.json → reviewsByProduct`, keyed by level id, loaded the same way.
`LinePicker.review(levelId)` prefers the product's pool and falls back to the generic one.

**6. The nag mechanic.** `patterns/levels.json → nagEvery: { min, max }`, seconds of frame time, both positive
with `min <= max`. The interval is drawn per nag from a **separate** generator, `seededRandom(mixSeed(plan.seed,
NAG_SALT))` with `NAG_SALT = 0x9a9`, so a level plans the same snippets, the same creeps and the same meeting
whether the check-ins are on or off — which is a band bar, not a claim. `ChatLine` gains `nag?: true`; the
`message` event gains `nag?: true` rather than a new kind, so the cue table stays exhaustive by kind. The clock,
the next due time and the owed answer live in the run's `WeakMap` context, never on `RunState`: that is what
lets the band compare two runs byte for byte.

## The rng call order for a pinned level

`planLevel` creates one generator per level, `seededRandom(mixSeed(seed, levelIndex * 7919 + tier))`. For a
**listed** level, `levelDefAt` draws nothing (only an endless level's product and stack come off it). Then, per
request, in this order:

1. **the pick** — `weightedPick` over the candidates. **A pinned level skips this entirely**: no draw.
2. **the creep test** — one `rng()` against `creepShare`, pinned or not.
3. **the creep line**, when the test passed — two `rng()` calls inside `creepLine` (the snippet, then the line).

Then, after every request: the sync test (one `rng()` against `syncShare`) and, when it passed, the sync
position (one more). The nag clock touches none of this — it is its own generator.

So a pinned level's stream is `[creep test, (creep snippet, creep line), …] × requests, sync test, (sync at)`,
and a drawn level's is the same with a pick in front of each creep test. Two levels are pinned today; the other
six draw exactly as they did in slice 1, which is why their band numbers did not move.

## The nag timing rules

In `stepRun`, in frame time (`state.clock`), after the transitional beats have taken their step and returned:

- **Due:** `state.clock >= nextNagAt`. The interval is redrawn only when a nag actually lands.
- **Beat:** `state.beat === 'code'` and nothing else. A sync, a creep, a ship, an ask and a reply are other
  beats, and the three transitional ones (`request`, `creep`, `ship`) return from `stepRun` before the check is
  reached — including the step that lands a creep line, so a check-in can never share that frame.
- **Not the run's first line:** never when `levelIndex` is the run's own first level and `requestIndex === 0`
  and `lineIndex === 0`. In endless this is the first line of the **run**, not of each level (Decision 4).
- **One at a time:** never while an earlier check-in is still owed its answer.
- **It waits, it does not skip.** A due check-in whose moment is wrong lands on the first step where the moment
  is right; nothing is redrawn and nothing is lost.
- **On firing:** the user's line, with `nag: true` on the chat line and on the event; the answer is marked owed;
  the next interval is drawn. **Nothing else moves** — no `messageCost`, no streak, no hype, no value, no
  piece, no refill.
- **The answer** lands in `sendLine`, on the clean path of a code line, after the `line ok` event and before the
  beat moves on. A line sent wrong keeps it owed. A ship on that line says the answer first, then the ship line.
  A level that ends with an answer owed drops it; the next level starts with a fresh clock and nothing owed.

## The numbers

**`patterns/levels.json → nagEvery`** — the only number this sub-slice adds. // Director

| Key            | Value | Why                                                                                        |
| -------------- | ----- | ------------------------------------------------------------------------------------------ |
| `nagEvery.min` | 60    | A minute of typing is the shortest gap that still reads as a person waiting, not pestering |
| `nagEvery.max` | 140   | Past this a mid-length level would go by without a single check-in                         |

Measured with `typist:40:0.03` at tier 0 over seeds 1, 2, 3, on the levels as they now stand (the two pinned
levels included). Seconds are the run's own clock; the valuation is the level's payout.

| Level | id                  | nags (seeds 1, 2, 3) | seconds        | valuation     |
| ----- | ------------------- | -------------------- | -------------- | ------------- |
| 0     | cat-website         | 1, 1, 1              | 144, 138, 144  | 43, 37, 42    |
| 1     | duck-rides          | 1, 1, 1              | 190, 173, 184  | 65, 37, 45    |
| 2     | fridge-chain        | 3, 3, 3              | 324, 390, 327  | 114, 103, 92  |
| 3     | plant-dashboard     | 2, 3, 2              | 316, 345, 338  | 184, 160, 121 |
| 4     | self-newsletter     | 5, 7, 4              | 521, 621, 530  | 209, 339, 169 |
| 5     | coffee-loyalty      | 5, 2, 3              | 540, 326, 381  | 226, 147, 185 |
| 6     | book-club-metaverse | 8, 8, 7              | 722, 890, 730  | 438, 494, 378 |
| 7     | app-that-rates-apps | 9, 6, 13             | 931, 645, 1275 | 420, 197, 477 |

Elsewhere: tier 1 at `typist:40:0.03` reads one to ten; tier 2 at `typist:60:0.02` reads zero to seven; tier 3
with `perfect` reads zero to four — a faster typist is asked less, which is the right way round. An endless run
at tier 0 sees six or seven check-ins over its three or four levels.

**Why the count is not two to eight everywhere.** The brief asks for roughly two to eight a level. A level runs
from about 140 seconds to about 1,275 at forty words a minute — a spread of nine — and one interval cannot put
both ends of that inside a band of four. Holding the floor at two would mean a gap under 70 seconds, which
gives the longest level eighteen check-ins; holding the ceiling at eight means the two short levels get one.
The lever is set for the ceiling and the middle: six of the eight levels sit between two and eight, the two
short teaching levels get exactly one, and the longest reaches thirteen at one seed. The band asserts the
measured range with slack rather than the target (Decision 5). If the Director wants two on the short levels,
the honest fix is a shorter gap plus a cap per request, and that is a mechanic change, not a number.

## The band

**Three bars added**, all in `test/band.test.ts`:

| Bar                                                                               | Result                                                     |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| the check-in count a level, `typist:40:0.03` tier 0, seeds 1–3, in `[1, 16]`      | holds — measured 1 to 13                                   |
| a check-in never lands off a code beat, nor on the run's first line — every tier  | holds — zero faults, listed and endless, all four tiers    |
| nags on against nags off: same valuation, vibes, streak, ticks and stripped state | holds — 96 pairs (four tiers × eight levels × three seeds) |

The third is the load-bearing one: the two runs are compared after `chat` and `events` are emptied, so the plan,
the built pieces, the bar, the milestones and the weak pairs are equal to the byte. A check-in that leaked a
cost anywhere would fail it.

**Every bar from slice 1 and slice 2 holds at its original number**, with no lever re-tuned: idle never ships
and compacts at tiers 0–2 and ends at tier 3; `typist:40:0.03` ships every level clean at tier 0 and with at
most one compaction at tier 1; `typist:60:0.02` the same at tier 2; `perfect` beats hardcore clean on every
level and seed; `typist:40:0.03` runs out of bar on all eight levels at tier 3; endless runs six-plus for a
clean typist and two-plus for a forty; the valuation never falls and hype stays on the ladder; no unexplained
streak drop; no digit and no barred word on any chat line at any tier; the same seed gives the same run; Copilot
lights at least once a level at tier 0 and never in hardcore.

Two measurements **did** move, and neither is a bar: level zero now runs about 140 seconds rather than 204 and
pays about 40 rather than 82, and level one pays about 50 rather than 55. That is the pinned story — the cat's
website opens on two of the shortest snippets in the corpus because the first request of the first level is
where a player learns the loop. The drain on those levels was left alone; the bar they have to clear got easier,
not harder, which is why nothing broke.

## What is a placeholder

> **Replaced, 2026-09-15 into 2026-09-16.** The full authoring run landed on `kimi-k2.6:cloud` in sub-slice B
> part three, and every line listed below is gone, replaced by a line the model wrote and the gate kept.
> Specifically: all eight stories were re-written and the levels re-pinned (there are sixteen levels now, and
> fourteen of them pin four snippets); the six hand-written snippet asks were replaced by asks on 246 of the
> 249 snippets — `cal-sh-d1-001`, `cal-sh-d1-005`, `sh-for-loop`, `cal-py-d1-001`, `cal-py-d1-003` and
> `cal-sq-d1-001` all carry the model's words now, not the hand's; the sixteen check-ins and sixteen replies
> were joined by forty-three more check-ins and ninety-seven more replies; the eighteen reactions over six
> topics became three each over all 498 topics the corpus uses; and the six reviews over two products became
> three each over all sixteen levels. **Nothing written by hand in this sub-slice survives in the levers.** The
> list below stands as the record of what was a draft and what it was for. See
> `docs/vibe-typer.slice3.md` § "Sub-slice B, part three" for the counts, the receipts and the three snippets
> that ended with no ask of their own.

Everything written by hand here is a draft for the authoring run to replace, and it is all in the levers, so
replacing it is a data change:

- **Eight level stories.** Plain, one line each, gate-clean. They exist so the loader, the plan and the standup
  have something true to carry.
- **Six snippet asks** — `cal-sh-d1-001`, `cal-sh-d1-005`, `sh-for-loop` (bash band one), `cal-py-d1-001`,
  `cal-py-d1-003` (python band one), `cal-sq-d1-001` (sql band one). The other 243 snippets have none and read
  the template pool, which is the fallback the contract describes. Six rather than the brief's five: see
  Decision 8.
- **Sixteen nags and sixteen replies.**
- **Eighteen reactions** over six topics — `print`, `strings`, `variables`, `arithmetic`, `for-loop`,
  `functions` — chosen because they are among the most common topic words in the ported corpus.
- **Six reviews** over two products, `cat-website` and `duck-rides`.

`lines.test.ts` asserts that every `reviewsByProduct` key names a level that exists and every
`reactionsByTopic` key names a topic the corpus actually carries, so the authoring run cannot quietly write a
pool nothing will ever read.

## Decisions

Where the brief was silent, the choice and the reason.

1. **A snippet's own ask spends no draw from the template bag.** The bag is a no-repeat walk through the
   tier's templates; taking a draw for a request that never used one would burn the pool for the requests that
   do. `lines.test.ts` asserts it, and it is why a level can be half pinned and half drawn without the drawn
   halves reading oddly.
2. **`{title}` is barred from a snippet's own ask, and the loader enforces it.** The title hole exists because
   a template has to name the thing it is asking for; a snippet describing itself already knows. Barring it
   also keeps `safeTitle`'s fallback — four corpus titles carry a digit or a barred word — out of the path.
3. **A pinned id the stack does not carry is a throw, not a quiet draw.** A level that silently fell back to
   its band would hide the typo behind a game that still plays. The loader cannot see the corpus, so the throw
   lives in `planLevel` and a test walks every pinned id at build time.
4. **"The run's first line" means the run's, not each level's.** In endless, a level that began mid-run has
   already earned the player's attention; the rule exists so a player's very first line of a session is not
   interrupted, and that is a once-a-run problem. Written into `maybeNag` as `levelIndex === levelOffset`.
5. **The band asserts `[1, 16]`, not the brief's two to eight.** The measurement is above; one interval cannot
   hold a four-wide band across a nine-fold spread of level lengths. The bar is the measured range with slack,
   because a bar that cannot be met is a bar nobody can act on.
6. **A second check-in waits rather than being dropped.** "At most one owed answer" could be read as "skip the
   one that would overlap"; waiting keeps the rule to one line of code and means the lever's cadence is what is
   measured, not the cadence minus whatever the player's line length happened to swallow.
7. **The nag clock lives in the run context, not in `RunState`.** `RunState` is plain data and is compared byte
   for byte by the determinism test and by the new band bar; a next-due time on it would differ between the
   nags-on and nags-off runs and make that bar impossible to write honestly.
8. **Six hand-written asks, not five.** Level zero is the play-through and the Director's first level; three of
   its four requests carry their own ask and the fourth reads the template pool, so one level exercises both
   halves of the contract every time `pnpm verify` runs.
9. **The port carries the asks across by reading its own output first.** `ask` is authored here and is in none
   of the prototype's fields, so a re-run would have dropped every one. The script now reads the corpus file it
   is about to overwrite, keys the existing asks by snippet id, and writes them back onto the rows it emits; an
   id the prototype has dropped takes its ask with it and says so on stderr. **It was run once on this rig**
   against `E:/AI/prototypes/packages/dev-op-typer/DevOpTyper/Assets/Calibration/`, which does exist here: 249
   kept, 0 rejected, 6 asks carried, and the diff against the tree before the run is empty apart from nothing
   at all — the six ask lines are still the only change the corpus files carry against `main`.
10. **The `message` event was extended, not joined by a `nag` kind.** The cue table's `never` default is
    exhaustive over `Event['kind']`; a new kind would have been a type error there, which is the point, but the
    thing that changed is not a new class of event — it is the same user line with a different sound. The cue
    table answers it by reading the flag, and `EVENT_KINDS` still has twelve entries.
11. **The agent's answer is not marked as a nag.** The flag is what the shell italicises; the answer is the
    agent speaking in the agent's own colour, and it sounds like every other agent line. `typer-cues.test.ts`
    pins that an agent message with the flag still reads as `blip`.
12. **The nag sound is the ping with a fourth below it, a beat later** (0.18 s, 0.24 s tail, inside
    `TAIL_CAP`). Down, not up: the creep already climbs, and a check-in is a question, not an addition.
13. **The shell's nag line is one shade lighter and italic, and nothing else.** Nothing yells (G25); a check-in
    that changes no number has no business drawing the eye harder than the ask does.
14. **No mount test for the nag class.** The shell assertion the brief offers as a fallback is the one taken:
    plumbing `levers` into `VibeOpts` is small, but the jsdom test would then have to type a whole code line to
    reach the second line where a check-in is legal, and sub-slice A is editing the same file. The cover is
    `typer-cues.test.ts` (a user nag message reads as the `nag` cue, an agent one does not) and `sim.test.ts`
    (the chat line and the event carry `nag: true`); the class is a single expression over that flag.
15. **Reactions walk the snippet's topics in order and take the first pool that exists.** The first topic is
    the one the corpus names the snippet by; a scoring pass over all of them would need a rule about which
    topic is more interesting, and nobody has one.
16. **`reviewsByProduct` is keyed by level id, not by the product string.** The product text is a line that the
    authoring run may rewrite; the id is the thing the level is. A test keeps the keys honest.
17. **Two levels are pinned, six still draw.** The brief asks for two so the path is exercised; leaving the
    other six drawing keeps the slice-1 band measuring the same thing it always measured, so a broken bar would
    point at the nag and not at the pins. The remaining fourteen-plus authored levels are sub-slice E's.

## Verification

```
pnpm verify        lint · typecheck · test (44 files, 495 tests) · build · test:play ghost · test:play vibe-typer
pnpm build:play    site/public/play/index.html + assets + keys/ (both cabinets in one bundle)
pnpm format        run over every file this sub-slice touched
node packages/vibe-typer/scripts/port-corpus.mjs
                   249 kept, 0 rejected, 6 asks carried; the corpus files come
                   back byte for byte, the authored asks included
```

Slice 2 left the suite at 44 files and 466 tests; this one adds 29 and moves no file count.

`pnpm test:play ghost --fixture naive-ndjson` prints what it printed before, to the line. The Vibe Typer
play-through, with the pinned story and a check-in inside it:

```
Vibe Typer
level cat-website stack bash tier easy bot typist:40 seed 1 endless no
level shipped
product a website for my cat
stack bash
agent Claudette
agent That will be lovely, writing it out
user one more thing, it should remember me
agent Shipped it, exactly as you described
user the cat's followers are going to be thrilled
valuation: 66
pieces: 4
levels: 1
compactions: 0
```

The screen scan in `scripts/play.mjs` passes: the tail is the last four chat lines and now carries the product's
own review, which is words. A check-in landed earlier in that same run (it is one of the lines above the tail),
and every nag and every reply goes through the same gate as every other authored line.

**One thing to know about the baseline.** `packages/tape-core/test/schema.test.ts` and
`packages/ghost-on-the-menu/test/play.test.ts` race on `fixtures/tapes/_tmp_receipt.tape.json`: the Ghost test
writes and deletes it while the tape-core test reads every file in that directory. It failed once on the
untouched baseline of this branch's parent commit and has not failed since, on any run. It is not this
sub-slice's and is not fixed here; it is worth a session of somebody's.
