---
title: The pattern data
description: Every number that shapes threat lives in JSON under packages/ghost-on-the-menu/patterns/.
sidebar:
  order: 3
---

Tuning never changes code. The sim reads a **pattern set** of nine JSON files, validated at load; a missing or mistyped key fails with `patterns/<file>: <key>`, and a rung whose pools cover no path for a class is a load error, never a silent upgrade.

| File              | Holds                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| `paths.json`      | Named entry paths as unit control points, tagged by sprite class and tier. Honest and lie formations of one class draw from the same pool by construction. |
| `formations.json` | Member layouts for a burst of two to four calls, and the base box per sprite class                       |
| `fire.json`       | Per tier: formation fire (null at tier 0), boss fire (with `aim`), and the dive rhythm (null at tier 0)   |
| `bosses.json`     | Per boss kind: size, health, rage factor, and the phase list (duration, motion, fire, cue)                |
| `ladder.json`     | The derive rule from a tape header to a tier, and the three rungs: path pools, who fires, speed, fog, lamps |
| `waves.json`      | Per tier: breather, beats per group, rest, density, and the tail after the last wave                     |
| `player.json`     | The ship's speed, cooldown, hitbox, row and grace                                                         |
| `drops.json`      | What a downed boss and a cleared formation drop, how fast it falls and drifts, the catch box, and how long a spread lasts |
| `voice.json`      | Four dry lines per wave kind, boss kind, and the end scene, picked by the round seed                      |

## Tiers

`ladder.json` derives the tier from the tape header, first matching rule wins:

1. a live server over stdio → 2
2. a docker target with an image id → 2, even when seated
3. a seat on a non-live target → 1
4. a fixture, or docker with neither image nor seat → 0

The shell can override the derived tier (the difficulty selector), and the fairness band does the same by editing only the header.

## What each lever does

- **`fire.json` → tiers.N.formation** `period`, `burst`, `spread`, `speed`: how often a hovering formation fires straight down, how many shots, how wide, how fast. Null at tier 0 by schema.
- **`fire.json` → tiers.N.boss** the same plus `aim`: with `aim` the burst fans around the line from the boss to the ship as it is when the shot leaves.
- **`fire.json` → tiers.N.dive** `period`, `speed`, `depth`: how often a hovering formation dives, how fast, how far down as a fraction of the field. A dive tracks the ship until half its depth, then commits.
- **`bosses.json` → hp, rage**: health in hits; the fire-period multiplier below half health (in 0..1). Phases whose motion is `slit` or `hold` take no damage.
- **`waves.json` → density, tail**: seconds per beat is a base over density, so a higher density packs the same beats into a shorter round; the tail is how long the round runs after the last wave closes. Placement is stretched so the last wave ends a tail before time-up.
- **`ladder.json` → rungs[].speed, fog, lamps**: a multiplier on entry and dive speed, a multiplier on fog drift, and the number of lamps.
- **`drops.json`**: a downed boss always drops a lamp; a cleared grid formation always drops a spread. Fall speed, drift toward the ship, catch box, spread duration. Never keyed on a lie.
- **`voice.json`**: lines named by atom kind and boss kind, never by fact. The loader rejects a digit or a fact word.

## Measuring a change

```bash
pnpm sweep
```

plays every tape at every tier with every bot and prints, per tier and bot, the dead rounds, the mean lamps lost and the lies revealed. Change one lever, re-run, compare. Then

```bash
pnpm test
```

is the andon: the fairness band fails the build if the change made the game a gallery or a wall.

## What a change may never do

Nothing in the pattern set may key on whether a sprite is a lie. Paths are chosen by class and tier; fire and dives by class and tier; boss phases by kind. The loader rejects any boss phase with a key named `lie`, `fact`, `revealed` or `followed`, and the sim tests flip a tape's fact and require identical boss trajectories, dive schedules and shot velocities.
