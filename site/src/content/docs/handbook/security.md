---
title: Security
description: What the cabinet touches, what it never does, and where to report a problem.
sidebar:
  order: 6
---

The cabinets read tapes and write nothing.

## Data touched

- The tape files under `fixtures/tapes/`, bundled into the browser build. A tape carries wire events, atom ids, tool names and the instrument's pinned facts. `tape-core` refuses any document that carries a score, a verdict, an operator call or NRP, at any depth, so the game cannot show what it was never given.
- The pattern data under `packages/ghost-on-the-menu/patterns/`.

## Data not touched

No receipts, no proofs, no instrument code, no MCP connections, no filesystem writes from the game. The terminal tools run under Node and read the repo's own fixtures; `film` and `sweep` write PNG frames and bundles under an ignored `film/` directory.

## Permissions, network, telemetry, secrets

A browser. The published shell is static files on one origin; its only requests are for its own assets. No network egress, no telemetry, no secrets read, stored or transmitted.

## Art and licence

The sprite images were generated on a partner image API through Comfy Cloud and are committed as files. Their provenance (model, seed, prompt, job id) and the licence check are recorded in `docs/art/receipts.json`. Under the provider's developer terms the outputs are owned by the customer and may be used commercially; they may not be used to train, distil or fine-tune other models, and their provenance metadata must not be stripped. They are game assets, not training data.

## Reporting

See [SECURITY.md](https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/blob/main/SECURITY.md) in the repo for the reporting address and response timeline. Supported versions: 0.2.x.
