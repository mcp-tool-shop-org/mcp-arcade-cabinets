# mcp-arcade-cabinets

Read `HANDOFF.md` first. That is the pick-up.

Games on top of mcp-arcade (sister repo, E:/AI/mcp-arcade). The instrument's lock (docs/study-swarm.dispatch.md C1–C9 over there) is not reopened here: cabinets READ receipts (`mcp-arcade.bout/v1`, the `Tape` allowlist) and WRITE nothing the oracle or dataset sees.

One cabinet in focus: Ghost on the Menu (replay shooter). House Call (turn-based calibration) was parked by the Director on 2026-09-10 because it was not fun; its last state is commit 152f548 and it comes back only when there is a design that plays. tape-core keeps the scoring rules for that day.

Design log: `docs/study-swarm.dispatch.md` (research grounding + lock) once the swarm lands. Version stays 0.0.0. `pnpm test:play ghost` is the acceptance test; `apps/cabinets` is the browser shell.
