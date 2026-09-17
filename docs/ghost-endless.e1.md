# Endless, slice E1 — the sim, the levers and the band

The record of the E1 build, 2026-09-17: the endless run's draw, climb, lamp pool, score, rank word and code, built by an Opus builder in a worktree against the lock in `docs/ghost-endless.dispatch.md` (G31–G35) and read by the lead. The tables are measurements and move only when something is re-measured. The rank words and the chain words are the lead's: a shift on the board, from clocking in to closing the floor; the chain from one call to unbroken. Landed on `main` the same day, after the Director's heat and the field-wide sweep moved the live bars (the notes beside each bar in `test/endless.test.ts` say what and why) and after a merge that kept the caught-lamp clamp on the round's own pool. The shell (E3), the call tool and the seat picker (E2) and the voice and film (E4) are the slices after this one. Nothing here quotes the Director.

## Standards compliance

| Standard                 | Score | Evidence                                                                                                                                                                                                                                             |
| ------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PIN_PER_STEP             | 3     | Every feel number is a lever in `patterns/endless.json`, validated at load with the file's own halting shape, and carries its reason in the file's `notes` block. The draw is a pure function of seed, roster and history; the band replays it.      |
| ANDON_AUTHORITY          | 3     | The loader halts on a bad lever and on two cross-file disagreements (a reach past its stated ceiling, a hazard ceiling the rung cannot meet). The band fails the build on the ceiling, the survival bar, the spread, the chain and a leaked line.    |
| NAMED_COMPENSATORS       | 2     | The slice performs no irreversible action: no publish, no tag, no push past the branch. The branch's compensator is the dispatch's (delete the branch); the release path's table stays `docs/npm-launcher.md`. No skip claimed.                      |
| DECOMPOSE_BY_SECRETS     | 3     | `endless.ts` holds what changes with the run's shape; `endless.json` what changes with feel; `parallelism.json` what changes with the difficulty; the two new stops in `copiesAt`/`intensityAt` are the only change to code the shift already owned. |
| UNCERTAINTY_GATED_HUMANS | 2     | Three decisions the brief did not settle are named below rather than taken quietly, with the measurement behind each. The rank and chain words are plain drafts flagged for the lead. The Director plays E3.                                         |
| EXTERNAL_VERIFIER        | 2     | The band is the mechanical verifier and was written against measured runs, not against the author's expectation; every gate carries a mutation that turns it red. A packet review by another family is the coordinator's step, not taken here.       |

## What was built

- **`packages/ghost-on-the-menu/patterns/endless.json`** and `loadEndless` in
  `patterns.ts`: the climb (`openingCalls`, `stepPerCall`, a ceiling per tier
  of copies, intensity and concurrent hazards), `breatherEvery`, the menu
  (`candidates`, `widenAt`, `bands`), the lamp pool and its refill, the score table,
  a rank word table per tier, the chain words, the seat's patience, and a
  `notes` block carrying the decision behind each feel number — JSON has no
  comment, so the reasons live in the file as data.
- **`copiesEndless` and `intensityEndless`** per tier in `parallelism.json`,
  each at or above its `Shift`, with `copiesAt` and `intensityAt` walking a
  third stop above the shift's two. Climb 0 and climb 1 return exactly the
  numbers they returned before; `prepassRound` now takes a climb up to 2.
- **`packages/ghost-on-the-menu/src/endless.ts`**: the draw with coverage, the
  climb curve, the breather, the lamp pool, the score with its chain and its
  three lines, the rank word, the run's record, the run in words, and the
  five-word code.
- **`play.ts`**: `play({ endless: true })` plays the whole roster as one run
  and returns it in the transcript shape the runner reads.
- **`sim.ts`**: `createRoundState` takes an optional `lives`, and a caught lamp
  is clamped to the round's own pool rather than to the rung's count.
- **The band**, `test/endless.test.ts`: forty-three cases.

## The levers, and why each number

| Lever                   | Value                      | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `climb.openingCalls`    | 3                          | Density held low for an opening stretch before real pressure; three calls is about five minutes at the round lengths `waves.json` already ships.                                                                                                                                                                                                                                                                                                             |
| `climb.approach`        | 0.6                        | The opening band plays **below** the tape as it stands: the copies and the fire of an endless burst are scaled by this fraction on the first call and rise straight to the tape-alone reach by the band's last. It is endless's own band and it relaxes nothing — it exists only in the copy of the pattern set an endless run builds for itself, and the tape-alone bars and the shift bar are measured on the shipped set, where the lever does not exist. |
| `climb.stepPerCall`     | 0.08                       | The shift's full reach near the fifteenth call, the ceiling at the twenty-eighth. A long tail rather than a step a call.                                                                                                                                                                                                                                                                                                                                     |
| `climb.ceiling`         | see below                  | An explicit asymptote per tier. An unbounded curve hits its limit by accident and reads as broken.                                                                                                                                                                                                                                                                                                                                                           |
| `breatherEvery`         | 5                          | A no-return-fire call on a fixed count, independent of the climb, so the rest lands on the same beat at any reach.                                                                                                                                                                                                                                                                                                                                           |
| `menu.candidates`       | 3                          | The brief's number. Enough for a real choice, few enough to cover the feature space.                                                                                                                                                                                                                                                                                                                                                                         |
| `menu.widenAt`          | 2, 6, 11                   | The roster slice (a quarter, a half, three quarters, all) and the flavor list (two, three, four, four) widen here. The first widening lands before the reach rises.                                                                                                                                                                                                                                                                                          |
| `menu.bands`            | 30, 36                     | Wire rows split the twenty shipped tapes seven thin, nine even, four thick, so all three density bands are real.                                                                                                                                                                                                                                                                                                                                             |
| `lamps.pool`            | seat 4, live 5, hardcore 3 | Endless owns its lamps rather than borrowing the rung's three. On three a run ended on its second call, before the opening band was over and long before the reach had risen. On these, a mover at live takes seven to nineteen calls, the first breather is always reached, and the climb passes the shift's full reach. No entry for the gentlest rung, where endless is not offered.                                                                      |
| `lamps.backOnCleanCall` | 1                          | The brief's number. Capped by the run's pool, not by the rung's lamps.                                                                                                                                                                                                                                                                                                                                                                                       |
| `score.catch`           | 100                        | The base. A catch pays it times the chain.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `score.drop`            | 25                         | A quarter of a catch: a drop is the chain's fuel, not its prize, and it does not multiply.                                                                                                                                                                                                                                                                                                                                                                   |
| `score.boss`            | 500                        | Five catches. Points encode risk.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `score.callBonusBase`   | 50                         | The call's end banks the chain times this, lifted by the reach, so a later call pays more for the same chain and time itself is never scored.                                                                                                                                                                                                                                                                                                                |
| `score.chainCap`        | 8                          | Whole links, as far as one call's catches and drops carry it. Measured: the cap is reached thirty-two times in a sweep, so it binds.                                                                                                                                                                                                                                                                                                                         |
| `seat.timeoutMs`        | 4000                       | Four seconds, then the seeded pick stands and the record says the call was seeded. E2 uses it.                                                                                                                                                                                                                                                                                                                                                               |
| `rank`                  | per tier, five words       | Set from the bots' measured spread. No row for the gentlest rung. Plain drafts.                                                                                                                                                                                                                                                                                                                                                                              |
| `chainWords`            | eight words                | Plain drafts.                                                                                                                                                                                                                                                                                                                                                                                                                                                |

Ceiling and reach per tier:

| Tier         | `copiesShift` to `copiesEndless` | `intensityShift` to `intensityEndless` | ceiling hazards |
| ------------ | -------------------------------- | -------------------------------------- | --------------- |
| 0 (fixture)  | 1 to 2                           | 1 to 1.3                               | 0               |
| 1 (seat)     | 5 to 7                           | 2.0 to 2.6                             | 0               |
| 2 (live)     | 5 to 7                           | 2.0 to 2.6                             | 0               |
| 3 (hardcore) | 4 to 6                           | 1.8 to 2.4                             | 4               |

The gentlest rung keeps a ceiling row because the lever file describes every
rung, but no run is taken there. The hazard ceiling is what the rung permits:
only hardcore spawns hazards, so every other ceiling is zero and the loader
refuses a file where the two disagree in either direction.

## What was measured

Calls taken before the last lamp, twenty seeds, a cap of sixty calls, on the
shipped pool. The last column is what the band pins, with margin under the
measurement.

| Tier         | idle | mover: total, mean, min to max | reader: total, mean, min to max | pinned                                                                                      |
| ------------ | ---- | ------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------- |
| 1 (seat)     | 20   | 34, 1.70, 1 to 2               | 39, 1.95, 1 to 7                | reader over mover; reader at least 34; idle exactly 20                                      |
| 2 (live)     | 30   | 172, 8.60, 7 to 19             | 113, 5.65, 1 to 12              | mover at least 150 and never under five calls; reader at least 95; some call past reach one |
| 3 (hardcore) | 20   | 24, 1.20, 1 to 4               | 29, 1.45, 1 to 2                | reader over mover; reader at least 24; reader under 80                                      |

Live is the rung whose formations are cleared rather than dodged, so the mover
outlasts the reader there; at seat, where the fire is aimed, and at hardcore,
where a lamp is a blink, the two swap back. Endless is refused at the gentlest
rung by name.

Score over the same runs, lowest, median, highest:

| Tier         | mover                    | reader              |
| ------------ | ------------------------ | ------------------- |
| 1 (seat)     | 1,225 · 4,200 · 7,675    | 100 · 400 · 7,694   |
| 2 (live)     | 12,232 · 18,697 · 55,681 | 175 · 4,105 · 9,376 |
| 3 (hardcore) | 75 · 1,325 · 19,329      | 50 · 175 · 700      |

The approach, with three opening calls: the first call plays at six tenths of
the tape-alone reach, the second at eight tenths, the third at the tape as it
stands, and the step begins on the fourth.

The spread of the draw, a hundred seeded runs of twenty calls (two thousand
calls): every flavor appears — pressure 460, area-deny 465, trough 607, peak
468 — and every one of the twenty tapes appears, the rarest fifty-five times
and the commonest a hundred and ninety. All twenty coverage cells (flavor by
density band by the tape's own tier) are visited. No hole.

The ceiling: no run the bots take on the shipped pool gets near the thirtieth
call, so the asymptote is measured on a live run given ninety lamps and forty
calls — copies peak 7, intensity peak 2.6, hazards 0, exactly the stated
ceiling, reached and not crossed. The longest run on the shipped pool,
nineteen calls at live, reaches 1.28, past the full reach of a shift.

The breather, measured at hardcore with every call a breather: the ship that
never moves survives six calls and loses nothing. With the shipped cadence the
same ship is out before the sixth.

Lamps and the chain, over a sweep of three tiers, two bots and twenty seeds:
eighty-six calls gave a lamp back, all of them clean and all of them below a
full pool; two hundred and seventy-six calls lost a lamp and every one of them
put the chain back to one link; no call ever ended above the run's pool.

## What the brief left undecided, and what the coordinator then decided

**The gentlest rung cannot end a run, so endless is not offered there.**
Measured before the pool changed: at tier zero the ship that never moves and
the mover lose no lamp at all over sixty calls at twenty seeds, on any tape,
at any flavor, at any reach the ceiling permits — a sweep up to eight copies
and four times intensity did not change it, because that rung's formations do
not fire, its decoys do not fire and it spawns no hazard. `runEndless` refuses
tier zero by name and the picker (E3) starts at seat.

**The climb and the lamp pool were on different clocks; the pool is now
endless's own.** The rung's three lamps, against a tape that already costs a
mover about a lamp and a half at live and nearly three at seat, ended a run on
its second call. With five at live, four at seat and three at hardcore, a live
run runs seven to nineteen calls, the opening band and the first breather are
always reached, and the climb passes the shift's full reach.
`createRoundState` takes a `lives` option so the pool is set once, where the
round is built, rather than written over each tick; and the caught-lamp clamp
in `sim.ts` now follows the round's own pool (`state.maxLives`) instead of the
rung's count, which is the same number for every caller but endless.

**The opening band sits below the tape-alone reach.** `climb.approach` scales
the copies and the intensity of an endless burst to six tenths on the first
call, rising to the tape-alone reach by the band's last. It is not a
relaxation of any bar: it lives in the pattern set the endless run builds for
itself, and the tape-alone bars and the shift bar still run on the shipped
set, where the lever does not exist. Both still pass.

**The endless window at the rungs that ship with it dark.** The climb
multiplies a parallelism burst, and that burst ships dark at the gentlest
rung. An endless run lights it in its own copy of the set so the climb is felt
wherever the mode is offered, and no tape-alone bar or shift bar sees a
different number.

**The default difficulty is live.** The seat rung is harsher than live rather
than gentler, and the gentlest rung is not offered.

**The score's three lines.** The closing scene shows catches, bosses and
calls; a drop pays into the catches line, because a drop is a catch of a kind
and a fourth line would not be three. Within one frame a lost lamp is applied
before any pay, so a catch on the frame that took a lamp never pays at a chain
the player no longer holds.

**Where the digits live.** A run's words carry no digit and no barred word,
and every line is stripped against the shared screen list before it is
printed. The score's digits sit in the transcript's footer, after the
`revealed:` marker the runner stops reading at — the closing scene may carry
the run's number, a screen line may not carry a digit at all.

## The code

Five words, not the shift's four: the four-word body carries the seed, the
difficulty and a four-bit check of the roster, and the fifth word carries the
rest of a twenty-four-bit seed. The count is what tells the two apart, so
every shift code decodes exactly as it did and neither reader ever takes the
other's code for its own. `shift.ts` gained three exported helpers
(`wordsFromValue`, `valueFromWords`, `codeWords`) and `encodeShift` and
`decodeShift` were rewritten to call them; the arithmetic is unchanged and the
shift band still passes.

## Not done here

- The seat as boss, the `call` tool and the say gate on the tell (E2).
- The shell, the bezel's chain word and the closing scene (E3).
- The voice and the film (E4).
- A packet review by another family, and the player's pass.
