# The shift — slice 7, dispatch and record

**Date:** 2026-09-11
**Synthesizer:** Claude (Fable 5.1). **Design partner and reviewer:** Grok. **Director:** Mike.
**Trigger:** the Director's design, the same day as the slice-6 review: the tapes are not picked from a list but shuffled through, so a play reads as an agent working through the rig's tool calls, the player being the model navigating the guts of the rig to get the task done. Four questions were put to him and he decided all four: the lamps refill after each tape; the climb across the run is a crucial lever; four tapes make a run; a replay code is wanted.
**Product:** Ghost on the Menu, v0.5.0 published. The lock it sits on is G1, G7 to G10 (`docs/study-swarm.dispatch.md`) and G11 to G18 (`docs/cabinet-server.dispatch.md`), unchanged.

This is both the dispatch (the research grounding and the lock, G19 to G22) and the record of the build, since the slice was built the day it was decided.

## Standards compliance

| Standard                 | Score | Evidence                                                                                                                                                                                                                                                                         |
| ------------------------ | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PIN_PER_STEP             | 2     | The draw, the climb and the code are pure functions of seed, history and data; a code replays a shift byte for byte on the same roster, and the band replays every measurement from the pattern files. Research sources are named below with URLs; no signed receipts this time. |
| ANDON_AUTHORITY          | 3     | The band gains the shift bar (G21) and fails the build; the loader halts on a bad `shift.json` or a shift reach below the wave reach; the first reach tried was refused on the sweep before it shipped.                                                                          |
| NAMED_COMPENSATORS       | 2     | This slice adds no new irreversible action; the one it touches (`git push`) keeps its compensator below. No skip.                                                                                                                                                                |
| DECOMPOSE_BY_SECRETS     | 2     | `shift.ts` and `shift.json` change with the run's shape; `parallelism.json` with the difficulty; the shell with the page; the sim reads one number (`round.climb`) and nothing else changed there.                                                                               |
| UNCERTAINTY_GATED_HUMANS | 3     | The four questions went to the Director before any code, framed contrastively (carry lamps and a shift is a story; refill and it is a playlist); he decided all four; what no source settles (three or four bouts, a trough in the climb) is named for him below.                |
| EXTERNAL_VERIFIER        | 2     | Grok reviews the climb lever and the word lists (his lane); the band is the mechanical verifier of the tuning. Citation verification by a family-different lens was not run for this slice; the sources are listed for it.                                                       |

## Irreversible actions and compensators

| Action                                     | Compensator (command)                      | Post-rollback state                | Owner  |
| ------------------------------------------ | ------------------------------------------ | ---------------------------------- | ------ |
| `git push` of the shift (sim, shell, data) | `git revert <sha> && git push origin main` | The picker alone, as v0.5.0 played | Claude |

## Research grounding

Four questions where evidence would change the answer, one research agent each, run before the lock was written. Sources are named; where none was found the gap is stated.

**Q1. Runs of short bouts with a card between them.** Chen, "Flow in Games (and Everything Else)", CACM 2007 (https://www.jenovachen.com/flowingames/p31-chen.pdf): flow holds when challenge is re-matched to skill in bounded episodes; a refilled bout resets the ratio before a bad bout compounds. Ariga and Lleras, "Brief and rare mental breaks keep you focused", Cognition 2011 (https://doi.org/10.1016/j.cognition.2010.12.007): a brief switch of task goal prevents the vigilance decrement that sustained attention on one goal produces. Supergiant's Hades GDC 2021 talk (via Game Developer): the between-run interstitial is where anticipation for the next attempt is built. Ismail and Nijman, "Performative Game Development", GDC 2014, on Nuclear Throne: ten-minute runs keep stakes high because a loss costs minutes. Spelunky's four-worlds-of-four structure (community documentation, not a study). **Not found:** any controlled comparison of three or four bouts against six, or of refilled lives against a shared pool. _Implications:_ the card between calls is an attention reset carrying framing, not a "ready?" prompt (G20); four calls of one to two minutes sits inside one attention arc; four is a precedent, not a measurement, and stays data.

**Q2. An authored climb across a run.** Hunicke, "The Case for Dynamic Difficulty Adjustment in Games", ACE 2005 (https://dl.acm.org/doi/10.1145/1178477.1178573): players resent difficulty changes they can detect unless the change reads as authored. Jennings-Teats, Smith and Wardrip-Fruin, "Polymorph", PCG Workshop 2010: even an adaptive system anchors to a designer-set target curve. Denisova and Cairns, "Adaptation in Digital Games", CHI PLAY 2015 (https://dl.acm.org/doi/10.1145/2793107.2793141): players could not tell real adaptation from placebo, yet the felt curve drove satisfaction. Booth, "The AI Systems of Left 4 Dead", GDC 2009: relentless intensity wears players down; pacing needs peaks and troughs. Battle Garegga's rank (shmups wiki, community documentation): escalation is multiplicative on shot volume, never additive. Lomas et al., CHI 2013 and 2017 (Battleship Numberline): the most engaging conditions were not the hardest; novelty and suspense contribute on their own. _Implications:_ the climb is authored data on a multiplier, never adapted to the player (G21, and G1's seeded sim); the shape is a list in data so the Director can put a trough in it (Booth); the last call is calibrated for drama on the band, not for maximum density (Lomas).

**Q3. A replay code in words.** Wilkerson, "A Proposal for Proquints", 2009 (arXiv:0901.4016): pronounceable five-letter words carry sixteen bits each. Juola and Zimmermann, the PGP word list, 1995: two lists of two hundred and fifty-six words, one for even positions and one for odd, chosen for phonetic distance, so a transposition is heard. Bonneau, EFF wordlists, 2016: drop obscure, short, near-homophone and offensive words by a familiarity corpus. Shay et al., "Correct Horse Battery Staple", SOUPS 2012 (https://dl.acm.org/doi/10.1145/2335356.2335366): system-assigned three-to-four-word passphrases were no easier than equal-entropy strings; the gain has to come from the list. Bonneau and Shutova, "Linguistic Properties of Multi-word Passphrases", USEC 2012: people handle noun sequences better than clauses. Spelunky 2 dailies, Slay the Spire seeds, Noita's daily: a seed string is the whole determinism contract and seeded runs sit outside any leaderboard. _Implications:_ four words from two alternating lists of sixty-four concrete nouns (even positions one syllable, odd positions two), no verbs, no homophones, nothing under three letters (G22); the code carries the draw, the difficulty and a check of the roster, nothing else; there is no ranking to carry (G8).

**Q4. Shuffles and perceived randomness.** Borgne and Sahiner, Spotify Engineering, 2025 ("Shuffle: Making Random Feel More Human"): uniform draws read as rigged; the fix scores candidate permutations for freshness against recent history. Falk and Konold, "Making Sense of Randomness", Psychological Review 1997: people call over-alternating sequences the most random. Tversky and Kahneman, "Belief in the Law of Small Numbers", 1971: players expect a small draw to "owe" variety. The Tetris Guideline seven-bag (community reference): a bag bounds droughts. Dota 2's pseudo-random distribution (community reference): rising odds after misses feel fairer than independent trials. **Not found:** evidence for ordering a draw by tier. _Implications:_ the draw scores several seeded candidates for the fewest names shared with the browser's last two shifts and keeps the freshest, deterministically (G19); the order within a draw stays uniform, and the ascent comes from the climb, not from a sort.

## The lock, G19 to G22

**G19. A shift is a draw, seeded from the clock, never from a fact.** Four calls (data) drawn without replacement from the roster of tapes on disk, the same draw for the same seed and history. The draw is scored for freshness against the last two shifts this browser took (`localStorage`, per viewer, never sent) and keeps the freshest candidate; ties keep the first. The picker stays for the deliberate play and for the band, which measures per tape. (Q4; G1, G10.)

**G20. The lamps refill at every call (the Director's decision), and the shift never ends early.** A shift is a task list, not a life pool: the scene of each call is the tape's own end scene, then a card names the next call in header words only (the tape, the server, the policy, the tools the agent was asked to run), and the closing scene lists the calls and the code. No count, no digit, no ranking, no verdict (G8, G10). The card is the attention reset and carries the framing (Q1). (Q1; G8, G10.)

**G21. The climb is data, measured on its own bar, and never a relaxation of the tape-alone bars.** `shift.json` holds the length and a climb per position (0 is the tape as played alone, 1 is the full reach). `parallelism.json` gains `copiesShift` and `intensityShift` per tier, the reach the last call ends on; up the climb a call's schedule starts where the tape alone ended and ends at the reach, a multiplier on the seeded burst schedule (Q2; Garegga). The band gains the shift bar: at the full climb, the live mover survives half the roster with half the lies found, the live reader survives half, the seat reader clears a quarter, and the climb is felt (the mover loses more lamps than alone). The tape-alone bars stand as they were (Grok's slice-6 line: the bar is not relaxed to fit a longer round). (Q2; G1, G11.)

**G22. The code is four words, nothing else.** Two alternating lists of sixty-four concrete nouns in `shift.json` (even positions one syllable, odd positions two; three to seven letters; no repeat across the lists; nothing the gate or the screen forbids), six bits a word: the rank of the ordered draw among all ordered draws from the roster, the difficulty the shift was drawn at, and a four-bit check of the roster that made it. A code from another roster says "another menu"; a word off its list, a wrong count or a transposition says "not a code". The roster fits the code up to twenty-four tapes; past that the code needs a fifth word, a future lever. (Q3; G8, G17.)

## What was built (2026-09-11, the same day)

- **`packages/ghost-on-the-menu/src/shift.ts`**: `drawShift` (seeded, fresh), `encodeShift` / `decodeShift`, `climbAt`, `shiftCard`, the ordinal and length words; `patterns/shift.json` with the length, the climb list `[0, 0.35, 0.7, 1]` and the two word lists; the loader validates all of it (`patterns/shift.json: <key>`).
- **The climb lever**: `copiesShift` and `intensityShift` in `parallelism.json` with schema (each at least its `Later`); `copiesAt` and `intensityAt` take a `climb`; `Round.climb` set by `prepassRound({ climb })`; `sim.ts` reads it in `fireScale` and `spawnDecoys` and nowhere else. `playTape({ climb })`; `pnpm sweep --climb 1`.
- **The shell**: a **Shift** button with its own difficulty select beside the picker, a code box with **Replay**, the call card, the game mounted with the climb, the difficulty fixed to the code's, "Next call" / "End the shift", two furniture lines on the scene (the code, the call's place), and the closing scene with the code, "Take this shift again" and "A new shift".
- **Tests**: `test/shift.test.ts` (the draw, the code round-trip and refusals, the climb as data and fact-blind on the rug-flipped twin, the card in words only), the schema cases, and the shift bar in `band.test.ts`. Two hundred and nineteen tests.

## What was measured

`pnpm sweep --climb 1`, every tape as the last call, against the tape alone (`pnpm sweep`):

| Tier, bot    | Alone: dead of twenty, lamps lost, lies | Last call: dead, lamps lost, lies |
| ------------ | --------------------------------------- | --------------------------------- |
| seat, mover  | seventeen, 2.85, nineteen of twenty-one | sixteen, 2.80, all                |
| seat, reader | ten, 2.50, all                          | ten, 2.50, all                    |
| live, mover  | five, 1.55, all                         | nine, 2.25, seventeen             |
| live, reader | one, 1.55, all                          | four, 1.90, all                   |

The first reach tried (`copiesShift` 4, `intensityShift` 1.55 at live) moved the live mover by one death and the reader by one: not felt, refused. The shipped reach (5 and 2.0 at seat and live, 6 and 2.6 at hardcore) puts the last call at nine mover deaths against five alone with the mover still above half the roster, which is the shift bar. The seat tier barely moves because its bursts are already near the mover's ceiling alone.

The code: with twenty tapes, one hundred and sixteen thousand ordered draws by four difficulties by sixteen checks fills under half the twenty-four-bit space; the roster fits up to twenty-four tapes.

The shell was walked in the browser: the menu's Shift button, the first card (the call's place, the tape, the server, the policy, the tools asked, the difficulty and the code), the game with "Next call" and the fixed difficulty, the scene, the next card, and the closing scene.

## What was refused, and why

- **Lamps carried across the shift.** The Director chose refill; a shift is a playlist, so the band's per-tape bars still measure it and no shift bar over lives was needed.
- **Sorting the draw by tier.** No evidence either way (Q4); the climb gives the ascent, and a sort would make the code's rank mean less.
- **Digits in the code, or a fifth word for a longer roster now.** No digit on screen (G8); the fifth word is a future lever named in G22.
- **Adapting the climb to the player.** G1's seeded sim and the band; Hunicke and Denisova say the felt curve carries the effect anyway.
- **A shift in the cabinet server.** The MCP tools play one tape; `climb` is a `prepassRound` option the server does not set yet. A `shift` lever for the server is Grok's and the Director's call.

## Grok's review (2026-09-11, `docs/shift.review.md`)

No halt. G21 holds: the climb is data, the tape-alone bars still run, the last-call bar sits beside them; the rug-flip snap at climb 1 covers both levers; the lever reaches seat, whose mover is already at its ceiling alone. Two changes, applied the same day: `ribbon` left the odd list (a near-homophone of `robin`; `walnut` took its slot), and a note on the code: a swap of the two even-position words leaves the roster check untouched and can read as a different valid shift about half the time, while an even-odd swap still fails; a check mixed across the words is a later lever, not recoded from this review. Held: five copies and 2.0 at live is the stop; the ramp stays until the Director plays a shift, and if the third call feels like a slog the lever is `shift.json` (0.7 toward 0.4, Booth's trough), not a harder last call.

## Not done

- The Director plays a shift and says whether the climb list wants a trough (Booth) and whether four is the length.
- Translations before the next tag.
