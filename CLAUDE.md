# mcp-arcade-cabinets

Read `HANDOFF.md` first. That is the pick-up.

Games on top of mcp-arcade (sister repo, `E:/AI/mcp-arcade`). Cabinets **read tapes** (`mcp-arcade.tape/v1`) and write nothing the instrument, the oracle, or the dataset ever sees. They do **not** load receipts. The instrument lock (C1–C9 over there) is closed and is not reopened here.

One cabinet in focus: **Ghost on the Menu** (replay shooter), published **v0.8.1**; next is **v0.8.2** (launcher seats). House Call (turn-based calibration) was parked by the Director on 2026-09-10 because it was not fun; last state `152f548`. It comes back only when there is a design that plays. `tape-core` keeps the scoring rules for that day. Deferrals for the next pass live at the top of `HANDOFF.md` (translations, Comfy polish, `archivist.mp3`, health leftovers).

Cabinet lock: G1, G7, G8, G9, G10 in `docs/study-swarm.dispatch.md`. Version stays `0.x` until the Director says otherwise. Do not promote to 1.0.0 because it is a release.

**One package publishes to npm, and one only.** The Director lifted the never-npm rule on 2026-09-14 for `packages/launcher` — published as `@mcptoolshop/ghost-on-the-menu`, the dual-mode launcher (`npx` plays the shell with the local seats lit; `--mcp` is the stdio cabinet server). `tape-core`, `ghost-on-the-menu`, `cabinet-server` and `cabinets` stay `"private": true` and go nowhere near a registry; the `@mcp-arcade-cabinets/*` scope is not an npm scope. The launcher carries no runtime dependencies on purpose — esbuild bundles the workspace in, which is what keeps this to one package. Do not add a `dependencies` block to it, and do not publish a second package without the Director's word. Everything else is unchanged: git tag + GitHub release + Pages + GHCR. Read `docs/npm-launcher.md` before touching the publish path; its compensators table is binding, and note that **cutting a GitHub release now also publishes to npm**, which is not undoable after 72 hours.

v0.4.0 (2026-09-10) is the Ollama seats: the Cloud boss sits (think-low retry), a felt seat through `fire.json → boss.pilot`, the voice seat, `pnpm sit`. Decisions and refusals in `docs/ollama-content.md`. v0.5.0 (2026-09-11) is the cabinet server (MCP tools as levers, the say gate, the voice; lock G11–G18 in `docs/cabinet-server.dispatch.md`), with the container (slice 6, `docs/cabinet-container.md`) and the shift (slice 7, a run of four shuffled tapes as one agent session with a climb in data and a four-word replay code; lock G19–G22 in `docs/shift.dispatch.md`) landed after it and shipped as v0.6.0 (2026-09-11) with the music rework: the direction is that the player is the agent and a shift is the play. Details in `HANDOFF.md`.

`pnpm verify` is the gate. `pnpm test:play ghost` is the acceptance play-through. `apps/cabinets` is the browser shell; Pages serves it at `/play/`. Identity scan the git-tracked tree from this repo before every push.
