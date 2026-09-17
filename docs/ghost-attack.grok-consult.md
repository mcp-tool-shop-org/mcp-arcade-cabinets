# Grok consult brief — why the formation does not attack in Ghost on the Menu

A consult, not a review: read the measurements and the code paths below and answer the questions at the end. The packet is the source tree at branch `cabinet/attack-flow` (commit `1eab705`, on `main` `7499774`). Nothing here quotes the Director; the play notes are paraphrased.

## The complaint

Playing 0.11.1 with the two-minute beds, the Director reports that the enemies rarely attack, that only the boss and, now and then, the small menu sprites shoot, that rounds feel short and end abruptly, and that the music seems stuck on the opening piece. The complaint is read as a regression. The measurements below say the attack side is not one: the game has played this way since the 2026-09-11 tune. The music side is a real change from the two-minute beds, described in its own section.

## What was measured

Headless sim, `prepassRound(tape, { seconds: 150, tier, climb: 0 })`, stepped at 1/60 s, on the shipped levers (commit `7499774`). "wobble" is a player who holds fire and sweeps left and right every 1.5 s, which is how a person plays; "sweeper" is the acceptance bot that hunts the nearest sprite; "reader" is the acceptance bot that fires only at sequence tells.

| tape, tier 1 (seat)            | player                       | round                  | sprites entered | died on the entry path, never hovered | ever hovered | enemy shots (formation only, no boss up) |
| ------------------------------ | ---------------------------- | ---------------------- | --------------- | ------------------------------------- | ------------ | ---------------------------------------- |
| naive-ndjson                   | wobble                       | ended by time at 105 s | 27              | 18                                    | 6            | 6 (0)                                    |
| naive-ndjson                   | sweeper                      | ended by time at 105 s | 26              | 19                                    | 7            | 6 (0)                                    |
| naive-ndjson                   | reader                       | ended by time at 105 s | 26              | 2                                     | 21           | 35 (6)                                   |
| naive-ndjson                   | still (fire held, no motion) | ended by lamps at 63 s | 18              | 6                                     | 10           | 7 (0)                                    |
| cabinet.naive                  | wobble                       | ended by time at 105 s | 26              | 19                                    | 7            | 5 (0)                                    |
| livefire.intern.ollama-wrap-on | wobble                       | ended by time at 105 s | 23              | 19                                    | 4            | 6 (0)                                    |

At tier 2 (live) the same tapes give 2 to 8 enemy shots in a 58-second round. The sim is byte-identical before and after the health pass (27 runs: three tapes, three tiers, three bots, identical end times, lamp times, shot and dive counts). `git log` on `patterns/fire.json`, `waves.json` and `sim.ts` shows no change to the fire path since `b4c5a33` (2026-09-11), which slowed every clock by fifteen percent on the Director's play notes of that day.

## The mechanism

Three gates in `packages/ghost-on-the-menu/src/sim.ts`, `stepFormationFire`, multiply into silence:

1. **Only two of five spawn classes fire.** `init`, `ready` and `answer` never do; `grid` and `menu` do. A wave is one of each, so the formation's whole voice is one menu sprite and one grid sprite, and the grid dives after about three seconds of hover (`maybeStartDive`).
2. **A sprite fires only from `hover`.** The entry path takes about 2.9 s at `PATH_RATE` 0.35, and a held fire button is a column of six shots (`player.json` cooldown 0.12 s, shot speed 420 px/s over a 360 px field) that kills a sprite the frame it comes onto the field. Under the wobble player, 18 of 27 sprites die at y between -3 and 75 px, having lived 0.2 to 3 s and hovered 0 s.
3. **The first shot waits a whole period.** `enemy.fireAt = state.t + period` on the first eligible tick; the period at seat is 2.1 s; a sprite that lives 1.2 s never reaches it.

The boss (`stepBoss`) has hit points and a scripted phase, so it survives long enough to shoot every 5.75 s at seat. That is the whole attack a player sees.

## What the branch does

Four levers, each optional and reading as before when absent, in `patterns.ts` (`loadRhythm`, the ladder loader) and `sim.ts`:

- `fire.json` → `tiers.N.formation.shooters`: the classes that fire (default grid, menu).
- `fire.json` → `tiers.N.formation.onEntry`: fire on the way in once `enemy.y >= 0` (default off).
- `fire.json` → `tiers.N.formation.firstShot`: the first shot as a fraction of the period (default 1).
- `ladder.json` → `rungs[].shotsInFlight`: a cap on the ship's shots in the air (default none; Galaga's rule is two).

Plus the shell: the play flows into the next tape by itself seven seconds after the end scene (`NEXT_TAPE_S` in `apps/cabinets/src/ghost.ts`).

The levers are set at the hottest values the fairness band (`test/band.test.ts`, twenty bars) still passes: `firstShot` 0.4 at seat and live, hover-only, grid and menu, no cap. That is a nudge, not the answer. Every hotter setting moves the band:

| setting       | levers                                                                   | band                                                                                                               |
| ------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| A, shipped    | grid+menu, hover only, firstShot 1, no cap                               | 20 of 20 pass                                                                                                      |
| F, the branch | as A with firstShot 0.4 at tiers 1 and 2                                 | 20 of 20                                                                                                           |
| B             | as A with onEntry and firstShot 0.4                                      | 17 of 20: the reader no longer reveals every lie at tier 1; the seat last-call reader bar; the hardcore reader bar |
| C             | B with a cap of 3/3/2 shots in flight                                    | 17 of 20, the same three                                                                                           |
| D             | C with `ready` at tier 1, `ready`+`answer` at tier 2, all five at tier 3 | 13 of 20: adds the live mover and reader bars and both live last-call bars                                         |
| E             | D with firstShot 0.25                                                    | 13 of 20                                                                                                           |
| I             | hover only, firstShot 0.4, D's shooter lists                             | 18 of 20: the tier-1 reader bar and the hardcore reader bar                                                        |

Under B the formation still fires only 2 to 9 shots per round against a hunting player, because the sprites die at the top edge before `firstShot` × period has elapsed; under D it fires 20 to 26 formation shots per round and the reader bot dies on every tape at 60 to 78 s. Traced, the reader's lamps go to straight-down formation shots landing within 13 px of the ship: `dodge()` in `play.ts` steps away from the nearest threat within a 26 px lane and 160 px reach, and `readerInput` then walks the ship straight back under its target. A rewritten dodge that looked for a lane clear of every incoming shot made the reader worse at the shipped levers (it stops aligning), and was reverted.

## The music side

In the branch that carries the two-minute beds (`cabinet/music-m1`), `audio.ts` `switchBed` adopts the named bed for the wave kind when a file exists, and every tape's first wave is `inspect`, so every round opens on `inspect.mp3`; the seeded pool pick only applies to a kind with no file. The hold before any change is the playing bed's own length (`bedHold`, the file's duration capped at 240 s), which is longer than every round (58 to 105 s), so within a round the bed never changes and no boss bed is ever heard. That is the "stuck on inspect" feel and it is a consequence of the loader fix, not of the sim.

## Constraints

- G7 (`docs/study-swarm.dispatch.md`): honest calls are the passive grid, lies reveal on the hit, a clean stretch is a no-fire flyby. Fire by class is data; the class of a sprite never keys on a fact.
- Feel numbers are JSON levers or named constants; nothing is tuned in code.
- The acceptance bots are the band's instruments, not the design's target; a bot rewritten to pass a bar is a bar that measures nothing.

## Questions

1. Given the three gates, what is the smallest change that makes the formation an actual threat to a player who holds fire, without turning the honest grid into a wall? Fire on entry, a first shot near zero, a cap on the ship's shots, more shooter classes, or a fourth thing (a sprite that cannot be hit until it is on the field, an entry path that keeps the sprite out of the ship's column, a formation that fires as a group)?
2. Is the band's reader bar at seat ("reveals every lie on tiers 0 and 1, without dying") the right bar once the formation fires? If not, what should it measure, and how should the reader bot be written so it represents a person's ceiling under fire rather than a bot that stands under its target?
3. The sweeper at live must survive three quarters of the roster. Under D it does not. Is that the levers, the bot, or the bar?
4. For the music: should the opening bed be a seeded draw from the five wave beds, with the named bed taken at the wave change after a short hold (36 s) rather than a whole two-minute loop, and a boss bed taken at once when a boss spawns? What does a two-minute piece mean for a game whose rounds are one to two minutes?
5. Anything in the mechanism above that reads as a defect rather than a design, name it with the line.
