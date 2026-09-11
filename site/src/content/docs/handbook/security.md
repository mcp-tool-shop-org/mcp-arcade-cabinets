---
title: Security
description: What the cabinet touches, what it never does, and where to report a problem.
sidebar:
  order: 7
---

The cabinets read tapes and write nothing.

## Data touched

- The tape files under `fixtures/tapes/`, bundled into the browser build. A tape carries wire events, atom ids, tool names and the instrument's pinned facts. `tape-core` refuses any document that carries a score, a verdict, an operator call or NRP, at any depth, so the game cannot show what it was never given.
- The pattern data under `packages/ghost-on-the-menu/patterns/`, and the persona sheets and tool contract under `packages/cabinet-server/`.

## Data not touched

No receipts, no proofs, no instrument code, no filesystem writes from the game. The terminal tools run under Node and read the repo's own fixtures; `film` and `sweep` write PNG frames and bundles under an ignored `film/` directory, and the voice worker writes wav files and receipts under `film/voice/`. The stdio server's tools return words; none reads a file, runs a command, or returns a fact from the tape.

## Permissions, network, telemetry, secrets

A browser. The published shell is static files on one origin; its only requests are for its own assets. No telemetry, no secrets read, stored or transmitted. The local Vite shell may proxy `/ollama` to a daemon on this machine, including Cloud tags already signed in, and `/voice` to the voice worker on this machine; the prompt never carries a fact. The dev server's `/cabinet/say` reads `ANTHROPIC_API_KEY` from its own environment when set and calls the Anthropic API from the node side; the key never reaches the browser and is never written to the repo. GitHub Pages cannot reach any of them.

## Art and licence

The sprite images were generated on a partner image API through Comfy Cloud and are committed as files. Their provenance (model, seed, prompt, job id) and the licence check are recorded in `docs/art/receipts.json`. Under the provider's developer terms the outputs are owned by the customer and may be used commercially; they may not be used to train, distil or fine-tune other models, and their provenance metadata must not be stripped. They are game assets, not training data.

## Reporting

See [SECURITY.md](https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/blob/main/SECURITY.md) in the repo for the reporting address and response timeline. Supported versions: 0.5.x.
