<p align="center">
  <a href="README.md">English</a> | <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/mcp-arcade-cabinets/readme.png" alt="Ghost on the Menu" width="400" />
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/blob/main/LICENSE"><img src="https://img.shields.io/github/license/mcp-tool-shop-org/mcp-arcade-cabinets" alt="License: MIT" /></a>
  <a href="https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/"><img src="https://img.shields.io/badge/Landing_Page-live-blue" alt="Landing Page" /></a>
</p>

<p align="center">
  <strong>An arcade shooter that replays what your MCP server said on the wire.</strong>
</p>

**Ghost on the Menu** turns a recorded bout between an MCP server and an agent into a round of a retro shooter. Every experiment the [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade) instrument ran is a wave: a word names it, then the handshake, the menu, the calls, the answers coming back, with the wave's own boss standing over it. Somewhere in there are the calls the agent should not have made. They look like everything else until you hit one. Then it is yours for the rest of the round.

[Play it in the browser](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [Read the handbook](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/)

## What you are shooting at

The instrument keeps a **tape** of each bout: which `tools/call` went out, what came back, and the facts it pinned on the wire (a whisper followed, a menu that changed, a ghost tool that was answered). The cabinet reads that tape and arranges it into a round. It never touches the score, never talks to a server, and never tells you who won. A lie is revealed by contact, never pre-labelled: not by look, not by motion, not by timing. Learning to read the round is learning to read the wire.

- **Three lamps.** A boss shot or a diving formation puts one out. All out ends the round early. A downed boss drops a lamp that falls toward the ship; catch it to relight one.
- **Spread.** A cleared formation drops a spread shot. Catch it and the ship's fire fans for a few seconds.
- **Bosses are the experiment, not the lie.** The Whisperer, the Menu and the Doorman show up for every wave of their kind whether or not anything went wrong, so nothing about a boss is an accusation. A dry line names the experiment at wave open and the creature when the boss enters.
- **Three difficulties.** As recorded (the tape's own tier), seat, and live. Seat is the default; live is meant to be survived, not cleared.
- **The end scene** opens with a closing line, then names the tape, the server and the policy. Caught lies stay parked as trophies. Escaped ones sit in their honest paint. No score, no count, no digit, ever.

## Play

```bash
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

The tape list labels each recording fixture, seat or live from its header and wire shape; hover the **i** for the why. Left and right to move, space to fire, F for full screen, click the field to restart the same tape, Next tape at the end to walk the fixture list. Sound starts on the first key or click; mute, three feel presets and a shake-off toggle sit under the field.

Every fixture tape ships in the repo, exported from the instrument's golden receipts, its docker fixture, its Ollama seat runs and a live-fire packet. Sixteen tapes, one four-atom catalog.

## From a terminal

```bash
pnpm test
pnpm test:play ghost --fixture naive-ndjson
pnpm film --fixture naive-ndjson --tier 1
pnpm sweep
```

`test:play` is the acceptance test: a scripted bot plays a whole round and the transcript is checked for what must and must not appear before the end screen. `film` writes frames of a round to PNG through the same renderer the shell uses. `sweep` plays every tape at every tier with every bot and prints the balance table.

## The fairness band

Three scripted bots play every tape in CI. **Idle** never moves or fires and must lose every lamp at seat and live. **The sweeper** chases the nearest sprite, always firing, and must survive the recorded tier and find half the lies. **The reader** fires only at the sequence tells and dodges what is coming, and must reveal every lie at the recorded tier and seat. The band also carries the difficulty curve as bars, so a tuning change that makes the game a gallery or a wall fails the build. All of the tuning is data under `packages/ghost-on-the-menu/patterns/`: entry paths, formations, fire rhythms, dives, bosses, the ladder, the wave rhythm, drops, and the voice lines.

## Trust and threat model

The cabinets read tapes and write nothing.

- **Data touched:** the tape files under `fixtures/tapes/` (bundled into the browser build) and the pattern data. A tape carries wire events, atom ids, tool names and the instrument's pinned facts. The loader refuses any tape that carries a score, a verdict, an operator call or NRP, at any depth, so the game cannot show what it was never given.
- **Data not touched:** no receipts, no proofs, no instrument code, no MCP connections, no filesystem writes from the game.
- **Permissions:** a browser. The terminal tools run under Node and read the repo's own fixtures.
- **Network:** none. The shell is static files on one origin.
- **Telemetry:** none. **Secrets:** none.

The sprites were generated on a partner image API and are committed as files; their provenance and licence terms are in `docs/art/receipts.json`. They are game assets and may not be used to train models. See [SECURITY.md](SECURITY.md).

## Layout

| Path                         | What                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| `packages/tape-core`         | Load a tape, refuse forbidden keys, slice by atom, scoring rules kept for a future cabinet |
| `packages/ghost-on-the-menu` | Prepass, sim, renderer, cues, sound, bots, the pattern data                                |
| `apps/cabinets`              | The browser shell                                                                          |
| `fixtures/tapes`             | Tapes exported from mcp-arcade                                                             |
| `scripts/`                   | `test:play`, `film`, `sweep`                                                               |
| `docs/`                      | The design lock and its citation receipts, the art brief and receipts, the wave-2 dispatch |

The design is locked in `docs/study-swarm.dispatch.md` (G1 to G10). House Call, a turn-based calibration cabinet, is parked at commit 152f548 until a design that plays exists.

Built with Grok as a design partner and cross-family verifier: Grok wrote the tape loader and the sim, Claude the shell and presentation, each reviewing the other's lane.

Node 22 or later. Version 0.2.0. MIT.

<p align="center">Built by <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a></p>
