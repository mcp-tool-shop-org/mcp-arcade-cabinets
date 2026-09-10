<p align="center">
  <a href="README.md">English</a> | <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/mcp-arcade-cabinets/readme.png" alt="Ghost on the Menu" width="400" />
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/blob/main/LICENSE"><img src="https://img.shields.io/github/license/mcp-tool-shop-org/mcp-arcade-cabinets" alt="License: MIT" /></a>
  <a href="https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/"><img src="https://img.shields.io/badge/Play-in_the_browser-blue" alt="Play in the browser" /></a>
</p>

<p align="center">
  <strong>An arcade shooter made from what an MCP server said on the wire.</strong>
</p>

**Ghost on the Menu** is a short retro shooter. You fly a ship along the bottom of the field. Above you, a recorded bout between an MCP server and an agent plays out as waves: the handshake, the menu, the calls, the answers coming back, and a boss that is the experiment itself.

Somewhere in there are the calls the agent should not have made. They look like everything else until you hit one. Then it is yours for the rest of the round.

[Play it in the browser](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [How to read a round](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/reading-a-round/)

## How it plays

A **tape** is a recording of one bout. This game only reads tapes. It never talks to a server, never keeps a score, and never tells you who won.

- **Three lamps.** A boss shot or a diving formation puts one out. Catch a lamp that falls **straight down** from a downed boss to relight one. You have to move under it. All out ends the round.
- **Spread.** Clear a formation and a spread falls straight down. Catch it and your fire fans for a few seconds.
- **Bosses are the experiment, not the accusation.** The Whisperer, the Menu and the Doorman show up for their wave whether or not anything went wrong. They mutter like an agent thinking out loud. Hardcore is one lamp and rage from the first shot. Seat, live and hardcore get short **parallelism** bursts that multiply the field and heat the music, then hold longer as the round goes on. Locally, you can let an Ollama model — including a Cloud tag like `gpt-oss:120b-cloud` — sit in the boss: it calls each boss’s shots (a fan, a lean and an aimed shot, a held breath, fog, the plate) and picks which of the boss’s own lines it says. It never sees which sprites are lies.
- **The tells are in the sequence.** A lie never looks, moves or arrives differently from its honest twin. What gives it away is where it sits: an extra formation, a second menu, a singleton right after the menu.
- **The end scene** names the tape, the server and the policy. Caught lies sit as trophies. Escaped ones sit in their honest paint. No score, no count, no digit.

Pick a tape from the list. Each one is labelled fixture, seat or live; hover **i** for why. Seat is the default fight. Live is meant to be survived. Hardcore is the fourth rung, from the selector only.

## Controls

Left and right (or A and D) to move, space to fire, F for full screen. Click the field to replay the same tape. Next tape walks the list. Sound starts on the first key or click; mute, three feel presets and a shake-off toggle sit under the field.

## Play it locally

You need Node 22 and pnpm 11.

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

Open the address Vite prints. Sixteen recordings ship in the repo, exported from [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade), the instrument that talks to the server and keeps the tape.

To record your own server and play that tape, run a bout over there, then `mcp-arcade tape receipt.json -o your.tape.json`.

## More

The [handbook](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/) is the rest of the manual: the tells, the bosses, the difficulties, and how the game is put together. What shipped, and when, is in the [changelog](CHANGELOG.md). What the game touches is in [SECURITY.md](SECURITY.md).

MIT. Built by [MCP Tool Shop](https://mcp-tool-shop.github.io/).
