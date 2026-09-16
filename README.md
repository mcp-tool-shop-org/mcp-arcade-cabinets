<p align="center">
  <a href="README.md">English</a> | <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/mcp-arcade-cabinets/readme.png" alt="mcp-arcade-cabinets" width="560" />
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/blob/main/LICENSE"><img src="https://img.shields.io/github/license/mcp-tool-shop-org/mcp-arcade-cabinets" alt="License: MIT" /></a>
  <a href="https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/"><img src="https://img.shields.io/badge/Play-in_the_browser-blue" alt="Play in the browser" /></a>
</p>

<p align="center">
  <strong>Arcade games made from what MCP servers said on the wire.</strong>
</p>

**mcp-arcade-cabinets** is the arcade. Each cabinet is a small game built on the same chassis: it reads **tapes**, the recordings that [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade) keeps of a bout between an MCP server and an agent, and turns them into something you can play. A cabinet never talks to a server, never loads a receipt, and never keeps a score the instrument could see. You are always the model; the games differ in what the rig asks of you.

[Play in the browser](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [Handbook](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/)

## The cabinets

| Cabinet                                                       | What it is                                                                                                                                                                                                                    | State                                                                                                                                                                                                                                   |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[Ghost on the Menu](packages/ghost-on-the-menu/README.md)** | A short retro shooter. The rig hands you the calls; the calls the agent should not have made are hiding among the honest ones and reveal on the hit. Bosses are the experiment, and a local model can sit in them.            | Shipped, `v0.9.0`. [Play](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · `npx @mcptoolshop/ghost-on-the-menu` · [Docker](https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/pkgs/container/mcp-arcade-cabinets) |
| **[Vibe Typer](packages/vibe-typer/README.md)**               | A typing arcade game. You are a hard-working, sycophantic coding agent; your user is a vibe coder whose requests are absurd. Type the code, watch the thing get built, and the valuation rolls up. Levels, endless, hardcore. | Shipped, `v0.9.0`. [Play](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · `npx @mcptoolshop/vibe-typer` · [Design and lock](docs/vibe-typer.dispatch.md)                                                               |
| **House Call**                                                | A turn-based calibration game: state a call and a confidence, then the tape reveals what happened.                                                                                                                            | Parked until there is a design that plays. `tape-core` keeps its scoring rules.                                                                                                                                                         |

More cabinets will land here. Each one gets its own package, its own page in the handbook, and its own row in this table.

## What every cabinet shares

- **Tapes in, nothing out.** `packages/tape-core` loads `mcp-arcade.tape/v1`, rejects anything that carries a score or a verdict, and hands the game header words, wire rows and one closed fact per atom. Twenty recordings ship in `fixtures/tapes/`.
- **A headless sim and a thin shell.** Every game is a pure, seeded simulation with a scripted play-through and a fairness band that fails the build. `apps/cabinets` is the browser shell that mounts them and is what Pages serves at `/play/`.
- **Data levers, not code.** Waves, voices, difficulty, lines: JSON under each package's `patterns/`, validated at load, so the game is tuned without a rebuild.
- **A seat for a model, behind a gate.** A local or cloud model can sit in a cabinet (a boss in Ghost, the user in Vibe Typer's endless mode). It only ever fills a lever from a closed set, every line it writes passes a word gate, and nothing on the field names it. A cabinet can also run as an MCP server over stdio, so an agent can be the one playing.
- **A voice.** A host-side worker (`voice/`) speaks the lines a gate admitted, receipted by [fx-dub](https://github.com/mcp-tool-shop-org/fx-dub) before they play.

The full account is in the handbook's [architecture](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/architecture/) and [security](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/security/) pages.

## Layout

```
packages/tape-core          the tape loader, schema and calibration math
packages/ghost-on-the-menu  the shooter: sim, patterns, bots, render
packages/vibe-typer         the typing game: sim, levers, corpus, bots
packages/house-call         parked
packages/cabinet-server     the cabinets as a stdio MCP server; the say gate; personas
packages/launcher           @mcptoolshop/ghost-on-the-menu: npx serves Ghost; --mcp is its server
packages/launcher-vibe-typer  @mcptoolshop/vibe-typer: npx serves Vibe Typer; the pack script is shared
apps/cabinets               the browser shell, served by Pages at /play/
fixtures/tapes              twenty recordings, tape JSON only
docs/                       one dispatch (research + lock) and one review per slice
site/                       the landing page and the Starlight handbook
voice/                      the Kokoro voice worker and its compose file
catalog/                    the Docker MCP Catalog entry
```

## Play

In the browser: [`/play/`](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/). The page opens on a switch between the two cabinets and remembers which one you played last. The published page has no daemon, so the model and voice seats are absent there.

Locally, with the seats lit, nothing to clone:

```bash
npx @mcptoolshop/ghost-on-the-menu
```

```bash
npx @mcptoolshop/vibe-typer
```

Each cabinet is its own package. Each command serves its game on `127.0.0.1` and opens it. Ghost's `--mcp` runs it as an MCP server over stdio instead; Vibe Typer's container tools are slice 4, so its `--mcp` says so and exits. Node 22 or newer. Those two packages are the only ones on npm; every other package here is private, and the switch between the two cabinets is the Pages build only.

To work on the arcade, clone it. You need Node 22 and pnpm 11:

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

`pnpm verify` is the gate: lint, types, tests, build and every cabinet's scripted play-through. For the model seat, run an Ollama daemon on the same machine; for the voice, see [`voice/`](voice/) and `pnpm voice`.

To play your own server, record a bout with mcp-arcade, then `mcp-arcade tape receipt.json -o your.tape.json` and drop it beside the fixtures. The container takes a read-only volume of tapes the same way.

## Adding a cabinet

A new game starts as a dispatch in `docs/`: the research grounding, the lock it inherits and extends, its data levers and its slices. Then a package that follows the shape above, a mount in `apps/cabinets`, a row in the table here, and a page in the handbook. The version stays `0.x` until the Director says otherwise, and no third package goes to npm without the same word.

## More

What shipped, and when, is in the [changelog](CHANGELOG.md). What the games touch is in [SECURITY.md](SECURITY.md).

MIT. Built by [MCP Tool Shop](https://mcp-tool-shop.github.io/).
