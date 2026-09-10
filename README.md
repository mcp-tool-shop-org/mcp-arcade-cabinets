# mcp-arcade-cabinets

Games that sit on top of [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade), the GameDay testing instrument for MCP servers.

The instrument keeps the tape and scores the wire. The cabinets read that tape and make it fun. They produce nothing the oracle or the dataset ever sees.

Two cabinets, decided 2026-09-10:

- **House Call** — turn-based. You are the operator. Each atom is a turn, the server is the dungeon, the policies are your party. Before each reveal you place your call. The score is calibration and coverage, never passes.
- **Ghost on the Menu** — an arcade shooter that replays a saved receipt. Wire events are the waves; the lies the instrument caught are what you shoot. A spectator view, never where results are read.

Status: design in progress (study-swarm running). Nothing playable yet.

The contract with the instrument is the receipt schema `mcp-arcade.bout/v1` and the `Tape` allowlist. Art comes from Comfy Cloud briefs. Version 0.0.0 until the first cabinet is playable.

MIT.
