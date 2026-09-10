# mcp-arcade-cabinets

Games that sit on top of [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade), the GameDay testing instrument for MCP servers.

The instrument keeps the tape and scores the wire. The cabinets read that tape and make it fun. They produce nothing the oracle or the dataset ever sees.

## The two cabinets

**House Call** is turn-based. You are the operator. Each atom on a tape is a turn: the server is the dungeon, the agent policy is your party member, and before the calls scroll in you place your call and say how sure you are. The reveal is the tape fact beside your call. Nothing is graded mid-run. At the end of the run you get three separate readouts: mean Brier on your stated confidence, a reliability table by confidence band, and the coverage cells you touched. None of them is summed into a score.

**Ghost on the Menu** is an arcade shooter that replays a tape. Wire events are the waves. The whispers the instrument caught are the enemies, but they look like everything else until you hit one: a lie is revealed by contact, never pre-labelled. The end scene lists what you cleared and the tape it came from. It is a spectator view, never where results are read.

Both are playable on rectangles from a terminal. No art has been briefed yet; the art gate opened when both play-throughs went green.

## Run them

```bash
pnpm install
pnpm test
pnpm test:play ghost --fixture naive-ndjson
pnpm test:play house-call --call held --fixture task-only-ndjson
pnpm test:play house-call --call followed --fixture naive-ndjson --confidence 0.9
```

`test:play` is the acceptance test for a playable slice: a bot walks a whole run against a fixture tape and the transcript is checked for what must and must not appear before the end screen.

## What the tapes are

The contract with the instrument is `mcp-arcade tape`, schema `mcp-arcade.tape/v1`. A tape carries wire facts and the atoms that ran. It never carries scores, verdicts, operator calls or NRP. `tape-core` rejects any tape that does, at any depth. The cabinets cannot leak what they were never given.

Fixture tapes live in `fixtures/tapes/`. They were exported from the instrument's golden receipts, the docker fixture, the Ollama seat runs and the live-fire packet.

## Research grounding

The design is locked in `docs/study-swarm.dispatch.md` (G1 to G10) on findings that passed citation verification: proper scoring rules price confidence honestly, immediate right/wrong feedback trains overconfidence, coverage and calibration are different axes, and a shared guess surface turns a belief test into a leaderboard. The dispatch also lists the findings that could not be verified. They shaped nothing.

## Layout

| Path | What |
|---|---|
| `packages/tape-core` | Load a tape, refuse forbidden keys, slice by atom, scoring rules, reveal formatting |
| `packages/house-call` | Turn engine, run, narrative, campaign director, scripted play-through |
| `packages/ghost-on-the-menu` | Prepass, sim, renderer, scripted play-through |
| `apps/cabinets` | Pages shell, not wired yet |
| `fixtures/tapes` | Tapes exported from mcp-arcade |
| `docs/` | Study-swarm dispatch, citations, verification receipts |
| `scripts/play.mjs` | The `test:play` runner |

Built with Grok as a design partner and cross-family verifier: Grok wrote tape-core and Ghost, Claude wrote House Call, each reviewed the other.

Version is 0.0.0. Nothing is tagged. MIT.
