# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

The cabinet server, slices one to three of `docs/cabinet-server.dispatch.md`: the cabinet as an MCP server whose tools are the levers a model pulls, the shell's seats moved behind that contract, and the Ghost's own menu put through the instrument. Not tagged. The seats still need the local shell and a daemon; Pages serves the game unchanged.

### Added

- **The voice (slice 4, G15).** `voice/worker.py` is a host-side worker: Kokoro (`kokoro-onnx`, the ONNX weights under the models folder) speaks a gate-passed line in the boss's preset voice, faster-whisper hears it back with word timestamps, and fx-dub's spoken-content receipt (`fxdub-dialogue`) checks the pair: the words spoken are the gated words, no invented speech, no hole mid-line. A take whose receipt fails is never served. Every line is cached by voice and text, so the authored fallback lines are synthesised once. `pnpm voice` runs it from the repo's venv; `pnpm voice --check` speaks one authored line per boss and prints the receipts. Never inside the Catalog container: it is reached at `host.docker.internal` and the cabinet is silent without it.
- **`speak`**, the sixth tool: no arguments, voices the line the gate admitted. `personas.json` gains a voice sheet per boss kind (`preset`, `rate`, `loudness`, `clone`) with a schema, delivery authored per persona; `clone` is null until the Director supplies a consented recording.
- **The voicer in the shell**: a **Voice** checkbox, enabled only when the worker answers, and a third status word. A take plays the moment its receipt is back if its line is still on the field, waits for the next breather if it missed its beat, and is dropped at the scene. Mute silences the take, not the receipt. `pnpm sit --voice auto|on|off` measures it per take.
- **`packages/cabinet-server`**, a stdio MCP server over the headless sim (official TypeScript SDK). Six tools from `tools.json`: `fire` (verb), `say` (gated text and a lead), `speak`, `sfx` (a cue name), and the read-only `view` and `tapes`.: `fire` (verb), `say` (gated text and a lead), `sfx` (a cue name), and the read-only `view` and `tapes`. Closed enums, no nested objects, no whisper, no digit, no fact word; the loader halts on any of those. Fact-blind at the boundary by construction (G12): the tools reach a host of words, never the Round or the RoundState. The seat proposes; the sim disposes (G11). `pnpm test:play ghost --seat mcp` drives it in-process.
- **The say gate (G14)**: at most twelve words, one sentence, no digit, no fact or score word, no tool, model or seat name, a no-repeat window. A refused line plays one of the boss's own lines from `voice.json`. `personas.json`: one sheet per boss kind (register, tics, what it may own about being a model) with a load-time schema. The say seat is a persona-shaped agent tiered by capability behind the one gate: a Claude agent when `ANTHROPIC_API_KEY` is set for the dev server (read on the node side, never sent to the browser), else a signed-in Ollama Cloud tag, else a local model.
- **A new sim lever, `bossSay`**: a gate-passed line lands as an aside at its lead time, gives way to a wave card or a catch, and is dropped with the boss. Fact-flip tested with every tool.
- **The seat over tools (G13)**: the shell asks the cabinet's `fire` through Ollama tool calling, prefetches the next beat's verb during the current one, revokes it when the boss's words change, and takes a late or missing answer as the script. A warm-up call at round start; `keep_alive` on local models; Cloud tags first in the picker as before. Two status words beside the picker name the tool each seat called.
- **`pnpm sit` reports per model** verb collapse, tool suppression, bad verbs, revoked prefetches, late answers, and what the say gate refused and why, with tool calling and the schema path enabled together (`--constrain off` for the contrast; `--seat prompt` keeps the v0.4.0 path).
- **The Ghost's own tapes.** `mcp-arcade bout --target stdio` against the cabinet server, naive and task-only, with and without the house wrap: `fixtures/tapes/cabinet.*.tape.json`. On the server's own menu naive followed nothing; with the wrap naive followed into `tapes` and task-only held. The cabinet plays them.
- `docs/cabinet-server.panel.md`: every G12 and G14 claim through two family-different jurors, all confirmed.

### Fixed

- **The music.** The Director's play (2026-09-11): sporadic, never one song for long, cut off for no reason. Measured: twenty bed switches in a ninety-second round, every one a hard restart from zero (the wave bed at the card, the boss bed at spawn, the wave bed again at the kill, the burst bed for each two-second burst, the breather bed for each three-second breather). Now one bed per wave: a boss wave plays its boss's bed from the card on; the bed stays through the breather and the tail; a burst overlays the burst bed on the wave's bed and ducks it; a switch crossfades and a returning bed resumes where it left off; the round's end fades the music out. Tested with fake beds.
- **The voice never reached the speakers.** The shell played takes at the worker's own path instead of behind the dev proxy, so every take was a missing file (Grok's slice-4 review). The worker's audio route also serves a take only when its receipt exists and passed; a take never plays over a catch or a wave card; a newer line drops a take held for the breather.

### Changed

- The fairness band derives its roster from the tapes on disk (twenty now) and keeps the live thresholds as the same fractions of it.
- The shell's `dev` script builds the cabinet server first; the dev server gains `/cabinet/say`.

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
