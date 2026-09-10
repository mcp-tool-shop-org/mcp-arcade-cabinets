# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- README and landing page rewritten for players. The fairness band, layout, bots, and threat model stay in the handbook and this file.
- Drops fall straight down. You have to move under them; they no longer drift to the ship.
- Difficulty ramps with the wave index. A fourth rung, hardcore, is selector-only: one lamp, rage from the start, boss hazards.
- Voice lines are the agent thinking out loud, with asides during a wave. Soundtrack changes key with the experiment and the boss.
- Handshake ack (`ready`) and error responses are their own classes. An optional local Ollama seat can call boss fire; the prompt never carries a fact.

### Added

- **Drops.** A downed boss drops a lamp; a cleared formation drops a spread. Both fall toward the ship's row and drift toward its column. Data in `patterns/drops.json`. Catching a lamp relights one; catching a spread fans the ship's fire for a few seconds. Drops never key on a lie.
- **Voice.** A dry line per wave open and per boss enter, in the wave card's furniture paint, and a closing line on the end scene. Data in `patterns/voice.json`, four drafts per key, picked by the round seed. They name the experiment and the creature, never a fact, never a digit.
- **Tape labels.** The picker is a list. Each tape carries a difficulty word (fixture, seat, or live) and an **i** whose hover text explains the header and the wire shape. A test flips every fact and requires the identical label and why.

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

[Unreleased]: https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/releases/tag/v0.2.0
