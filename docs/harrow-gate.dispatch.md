# Harrow Gate: dispatch (research and lock)

The third cabinet. Decided by the Director on 2026-10-02.

## Why it exists

ai-playtest gained persona profiles: sets of play styles, each with a target
signal and a rule that a style counts only if it separates from control. Its
calibration game, Harrow Gate, was five rooms that a good player wins in eight
turns. A paid run of the `player` profile on it could not separate anything:

- nothing was optional
- there was no one to talk to and no fights
- every style ended on the same turn

The Director stopped the run and set two rules:

- build the test bed out first
- no spend until it is verified by tests

The Director chose to grow Harrow Gate as a cabinet: the arcade's chassis gives it levers in
JSON, a seeded sim and a band test that fails the build.

## What the band measured (seed 1, baseline, 60-turn budget)

ai-playtest's own coverage, verifiers and `judgeProfile` ran on turn records built
the way its runner builds them. All seventeen personas played distinctly:

| profile    | persona            | target             | value | control |
| ---------- | ------------------ | ------------------ | ----- | ------- |
| scientific | novice             | refused inputs ↓   | 0%    | 11%     |
| scientific | briefed            | turns to finish ↓  | 11    | 18      |
| scientific | systematic         | repeats ↑          | 32%   | 6%      |
| bughunter  | cartographer       | screens seen ↑     | 52    | 17      |
| bughunter  | closer             | turns played ↓     | 2     | 18      |
| bughunter  | boundary-pusher    | refused inputs ↑   | 83%   | 11%     |
| bughunter  | continuity-auditor | talk and examine ↑ | 78%   | 22%     |
| player     | runner             | turns to finish ↓  | 11    | 18      |
| player     | reader             | talk and examine ↑ | 68%   | 22%     |
| player     | completionist      | screens seen ↑     | 49    | 17      |
| player     | grinder            | fight and wait ↑   | 78%   | 0%      |
| player     | quitter            | quit ↑             | 14%   | 0%      |
| player     | tinkerer           | use ↑              | 57%   | 6%      |
| gaming     | genre-veteran      | save and menu ↑    | 58%   | 0%      |
| gaming     | speedrunner        | turns to finish ↓  | 5     | 18      |
| gaming     | theorycrafter      | examine ↑          | 52%   | 11%     |
| gaming     | returning-player   | help ↑             | 40%   | 0%      |

Getting there changed the town:

- a lock on the archive, so the main line goes through a person
- a 55-turn day instead of 44, so a mapmaker can reach every place before dusk

It also changed four of ai-playtest's rules:

- a `turnsToFinish` signal, so a quitter no longer beats a runner on speed
- ties pass the lead check
- the tinkerer targets use actions, not off-path ones
- a bare `look` is no longer an ignored input

The novice is the tightest margin: 11 points against a 10-point floor.

## Lock

- **H1.** Harrow Gate takes the cabinet chassis, never Ghost's grammar:
  - a pure seeded sim
  - every lever in `patterns/*.json`, validated at load with the
    `patterns/<file>: <key>` halt
  - a band test as the andon

  It reads no tapes and writes nothing the instrument, oracle or dataset sees, so
  G1 holds.

- **H2.** The package is private, with no launcher and no npm package. A third
  published package needs the Director's word.
- **H3.** Every calibration switch keeps its meaning and its event name from
  ai-playtest's `calibration/game.mjs`, so that answer key grades a run here
  unchanged.
- **H4.** The truth log goes to stderr only. Events never reach the screen.
- **H5.** The persona band copies its profiles, targets and floors from
  ai-playtest's `src/personas.ts`, and changes with them in the same pass. When a
  bar fails, the town or the bot moves, never the bar.
- **H6.** Content grows through levers before code.
- **H7.** No paid run uses this town until two checks pass:
  - the band
  - the gate that runs ai-playtest's own judge on the bots

  This is the Director's rule of 2026-10-02.

## Not in this slice

- A browser shell mount.
- An MCP seat in `cabinet-server`.
- A voice.
- An exact reachability check, which is being built for the small town in
  ai-playtest by a separate slice.
- More towns.
