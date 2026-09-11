# mcp-arcade-cabinets

Read `HANDOFF.md` first. That is the pick-up.

Games on top of mcp-arcade (sister repo, `E:/AI/mcp-arcade`). Cabinets **read tapes** (`mcp-arcade.tape/v1`) and write nothing the instrument, the oracle, or the dataset ever sees. They do **not** load receipts. The instrument lock (C1–C9 over there) is closed and is not reopened here.

One cabinet in focus: **Ghost on the Menu** (replay shooter), published **v0.6.0**. House Call (turn-based calibration) was parked by the Director on 2026-09-10 because it was not fun; last state `152f548`. It comes back only when there is a design that plays. `tape-core` keeps the scoring rules for that day.

Cabinet lock: G1, G7, G8, G9, G10 in `docs/study-swarm.dispatch.md`. Version stays `0.x` until the Director says otherwise. Do not promote to 1.0.0 because it is a release. All packages are private: git tag + GitHub release + Pages, never npm.

v0.4.0 (2026-09-10) is the Ollama seats: the Cloud boss sits (think-low retry), a felt seat through `fire.json → boss.pilot`, the voice seat, `pnpm sit`. Decisions and refusals in `docs/ollama-content.md`. v0.5.0 (2026-09-11) is the cabinet server (MCP tools as levers, the say gate, the voice; lock G11–G18 in `docs/cabinet-server.dispatch.md`), with the container (slice 6, `docs/cabinet-container.md`) and the shift (slice 7, a run of four shuffled tapes as one agent session with a climb in data and a four-word replay code; lock G19–G22 in `docs/shift.dispatch.md`) landed after it and shipped as v0.6.0 (2026-09-11) with the music rework: the direction is that the player is the agent and a shift is the play. Details in `HANDOFF.md`.

`pnpm verify` is the gate. `pnpm test:play ghost` is the acceptance play-through. `apps/cabinets` is the browser shell; Pages serves it at `/play/`. Identity scan the git-tracked tree from this repo before every push.
