# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.6.x   | Yes       |
| 0.5.x   | No        |
| < 0.3   | No        |

## Reporting a Vulnerability

Email: **64996768+mcp-tool-shop@users.noreply.github.com**

Include:

- Description of the vulnerability
- Steps to reproduce
- Version affected
- Potential impact

### Response timeline

| Action             | Target   |
| ------------------ | -------- |
| Acknowledge report | 48 hours |
| Assess severity    | 7 days   |
| Release fix        | 30 days  |

## Scope and threat model

The cabinets are a browser game and a scripted play-through over **tapes**: JSON documents exported by the [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade) instrument (`mcp-arcade.tape/v1`). Nothing here talks to an MCP server.

- **Data touched:** the tape files under `fixtures/tapes/` (bundled into the browser build) and the pattern data under `packages/ghost-on-the-menu/patterns/`. A tape carries wire events, atom ids, tool names and the instrument's pinned facts; `tape-core` refuses any tape that carries a score, a verdict, an operator call or NRP, at any depth, so the game cannot show what it was never given.
- **Data NOT touched:** no receipts, no proofs, no instrument code, no MCP connections, no filesystem writes from the game. The browser shell reads its bundled tapes and sprite files and writes nothing.
- **Permissions required:** none beyond a browser. The scripted play-through and the `film` and `sweep` tools run under Node and read the repo's own fixtures.
- **Network egress:** none on the published Pages site. The local Vite shell may proxy `/ollama` to a daemon on this machine (`127.0.0.1:11434`), including Cloud tags the daemon has already signed in, and `/voice` to the voice worker on this machine (`127.0.0.1:7788`); the prompt never carries a fact. The dev server's `/cabinet/say` reads `ANTHROPIC_API_KEY` from its own environment when set and calls the Anthropic API from the node side; the key never reaches the browser and is never written to the repo. Pages cannot reach any of them.
- **The stdio server** (`packages/cabinet-server`, private, not published) lists six tools with closed enums; no tool reads a file, runs a command, or returns a fact from the tape. It calls the voice worker on the host when one is configured and is silent otherwise.
- **The voice worker** (`voice/worker.py`) binds `127.0.0.1`, takes one short line at a time, writes wav files and receipts under an ignored `film/voice/` folder, and serves a take only when its receipt exists and passed.
- **Secrets:** none read, stored or transmitted.
- **Telemetry:** none is collected or sent.
- **Art:** the sprite images were generated on a partner image API and are committed as files; their provenance and licence terms are recorded in `docs/art/receipts.json`. They are game assets, not training data, and must not be used to train models (licence term).
