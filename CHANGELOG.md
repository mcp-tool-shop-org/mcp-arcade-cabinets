# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.4.0] - 2026-09-10

The Ollama seats. Locally, a model sits in the boss and is felt; it picks the boss's own line; it never sees a lie. Play the published cut at [/play/](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/); the seats need the local shell and a daemon.

### Added

- **A felt boss seat.** New lever `patterns/fire.json → tiers.N.boss.pilot { fan, spread, lean }` with a load-time schema. A seat's `spread` is a wide straight fan; `column` slides the boss up to `lean` toward the ship before an aimed shot, then eases home; `hold` is a silent beat that keeps the boss still. Thin on the recorded rung. Fact-flip tests on the seated beat sequence.
- **The voice seat.** With the seat on, each boss picks which of its own `patterns/voice.json` lines it says at spawn (a letter reply; matched on wave and kind, else the seed's pick). The drafts are unchanged; the seat can only choose, never write.
- **Seat status** beside the model picker: waiting, thinking, the verb it said, or why it fell back to the script. Words only, never on the field. Retired Cloud tags say so.
- **`pnpm sit`** (`scripts/sit.mjs`): sits a model in both seats on a scripted round in wall-clock time and prints each beat's verb, what the sim made of it, each boss's line, latency and fallbacks.
- `docs/ollama-content.md`: the session's decisions and the seats refused (parallelism toggle, path pick, phase pick, asides) with reasons.

### Fixed

- **The Cloud boss was not sitting.** `gpt-oss` on Ollama Cloud ignores `think: false` and spent every token thinking, so the v0.3.0 default seat fell back to the script on every beat. The seat now retries with a low thinking budget and remembers which models need it. Measured: no fallbacks, about half a second a beat.
- The seat's view carried a constant motion word and named health against the wrong maximum. It now carries the phase's motion word from `bosses.json`, the stick, and health against the boss's real max. The frozen system sentence is unchanged; a digit or a fact word in a prompt still throws.
- `spread` and `column` were the same aimed shot on tiers 1 to 3. They are distinct now.

### Changed

- The shell asks for a verb once the last one is spent, not on a clock, so a fast tag sits every beat and a slow one is never asked twice for one beat.
- `Boss` carries `maxHp` and `motion`.

## [0.3.0] - 2026-09-10

The cabinet grows a fight: more classes, recorded beds, parallelism, a Cloud boss seat. Play it at [the landing page](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/) or straight at [/play/](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/).

### Added

- **Drops.** A downed boss drops a lamp; a cleared formation drops a spread. Both fall **straight down**. Catching a lamp relights one; catching a spread fans the ship's fire for a few seconds. Data in `patterns/drops.json`. Drops never key on a lie.
- **Voice.** A dry line per wave open and per boss enter, and a closing line on the end scene. Data in `patterns/voice.json`, four drafts per key, picked by the round seed. They name the experiment and the creature, never a fact, never a digit.
- **Tape labels.** The picker is a list. Each tape carries a difficulty word (fixture, seat, or live) and an **i** whose hover text explains the header and the wire shape. A test flips every fact and requires the identical label and why.
- **Hardcore.** Selector-only fourth rung: one lamp, rage from the first shot, boss hazards (echo, band, plate).
- **Parallelism.** Data in `patterns/parallelism.json`. Seed-placed bursts of extra honest copies and a hotter track. Off on the recorded rung. Extra copies are never lies.
- **Class sprites** for `answer`, `ready`, `error`, drops, and hardcore hazards, plus recorded ACE-Step beds per wave, boss, breather and burst. Chiptune remains the fallback.
- **Ollama Cloud bosses.** The local daemon can sit a Cloud tag (`gpt-oss:120b-cloud` when pulled). The prompt never carries a fact. Pages cannot reach the daemon.

### Changed

- README and landing page rewritten for players. The fairness band, layout, bots, and threat model stay in the handbook and this file.
- Difficulty ramps with the wave index. Seat rounds run longer.
- Handshake ack (`ready`) and error responses are their own classes.
- The landing page header links **Play** into `/play/`.

## [0.2.0] - 2026-09-10

The first release. Ghost on the Menu is playable in a browser and from a terminal.

### Added

- **Ghost on the Menu**, a replay shooter over `mcp-arcade.tape/v1` tapes. Every atom the instrument ran is a wave, opened by a card naming its kind and staged as the wire ran: handshake, menu, calls, answers, and the atom's boss. Lies reveal on the hit, never before, and stay parked as trophies. The end scene names the tape, the server and the policy, and nothing more.
- **Bosses**, one per atom kind (the Whisperer, the Menu, the Doorman), with phase scripts as data, guard phases, rage below half health, aimed fire at seat and live, and a burst when they go down.
- **Threat as data**: entry paths, formations, fire rhythms, dives that aim then commit, fog banks, three lamps with a grace period, and a difficulty ladder (as recorded, seat, live) under `packages/ghost-on-the-menu/patterns/`.
- **Sound**: synthesized effects and a procedural chiptune soundtrack with a motif per wave kind; mute, three feel presets and a shake-off toggle.
- **Retro sprites** generated on Flux 2 Max, glyph-checked and signed off against the lock; provenance and licence in `docs/art/receipts.json`.
- **The fairness band**: three scripted bots (idle, sweeper, reader) play every fixture tape at every tier in CI, with bars for a floor, a ceiling and a difficulty curve.
- **Tools**: `pnpm test:play` (the acceptance play-through), `pnpm film` (frames of a round to PNG), `pnpm sweep` (the balance table).
- `tape-core`: the tape loader that refuses forbidden keys at any depth, slicing by atom, and the calibration rules kept for a future cabinet.

### Changed

- House Call, the turn-based calibration cabinet, is parked (last state 152f548) until a design that plays exists.

[Unreleased]: https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/releases/tag/v0.3.0
[0.2.0]: https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/releases/tag/v0.2.0
