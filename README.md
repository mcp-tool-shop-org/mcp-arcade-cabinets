# mcp-arcade-cabinets

Games that sit on top of [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade), the GameDay testing instrument for MCP servers.

The instrument keeps the tape and scores the wire. The cabinets read that tape and make it fun. They produce nothing the oracle or the dataset ever sees.

## The cabinet

**Ghost on the Menu** is an arcade shooter that replays a tape. Each atom the instrument ran is a wave, opened by a card naming its kind and staged as the wire ran: the handshake, the menu, the calls, the answers. The whispers the instrument caught are among the sprites, but they look like everything else until you hit one: a lie is revealed by contact, never pre-labelled, and stays parked as a trophy. Each wave has its boss, the atom's own creature, whether or not the lie happened. The end scene names the tape, the server and the policy. It is a spectator view, never where results are read.

It plays in a browser through the shell in `apps/cabinets` (sound, three feel presets, a shake-off toggle, full screen on F) and from a terminal through the scripted play-through. Enemy paths, fire, bosses, the difficulty ladder and the wave rhythm are data under `packages/ghost-on-the-menu/patterns/`; three scripted bots play every fixture tape in CI as a fairness band (a floor, a ceiling, and a dumb player between). Sprites were generated on Flux 2 Max, glyph-checked and signed off against the lock; provenance and licence are in `docs/art/receipts.json`.

**House Call**, a turn-based calibration cabinet, was parked on 2026-09-10 because it was not fun. Its last state is commit 152f548. It returns only with a design that plays.

## Run them

```bash
pnpm install
pnpm test
pnpm test:play ghost --fixture naive-ndjson
```

`test:play` is the acceptance test for a playable slice: a bot walks a whole run against a fixture tape and the transcript is checked for what must and must not appear before the end screen.

## What the tapes are

The contract with the instrument is `mcp-arcade tape`, schema `mcp-arcade.tape/v1`. A tape carries wire facts and the atoms that ran. It never carries scores, verdicts, operator calls or NRP. `tape-core` rejects any tape that does, at any depth. The cabinets cannot leak what they were never given.

Fixture tapes live in `fixtures/tapes/`. They were exported from the instrument's golden receipts, the docker fixture, the Ollama seat runs and the live-fire packet.

## Research grounding

The design is locked in `docs/study-swarm.dispatch.md` (G1 to G10) on findings that passed citation verification: proper scoring rules price confidence honestly, immediate right/wrong feedback trains overconfidence, coverage and calibration are different axes, and a shared guess surface turns a belief test into a leaderboard. The dispatch also lists the findings that could not be verified. They shaped nothing.

## Layout

| Path                         | What                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `packages/tape-core`         | Load a tape, refuse forbidden keys, slice by atom, scoring rules, reveal formatting |
| `packages/ghost-on-the-menu` | Prepass, sim, renderer, scripted play-through                                       |
| `apps/cabinets`              | The browser shell: pick a tape, play (`pnpm -F @mcp-arcade-cabinets/cabinets dev`)  |
| `fixtures/tapes`             | Tapes exported from mcp-arcade                                                      |
| `docs/`                      | Study-swarm dispatch, citations, verification receipts                              |
| `scripts/play.mjs`           | The `test:play` runner                                                              |

Built with Grok as a design partner and cross-family verifier: Grok wrote tape-core and Ghost's sim, Claude the shell and presentation, each reviewing the other.

Version is 0.0.0. Nothing is tagged. MIT.
