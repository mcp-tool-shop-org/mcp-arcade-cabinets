# mcp-arcade-cabinets

Read `HANDOFF.md` first. That is the pick-up.

Games on top of mcp-arcade (sister repo, `E:/AI/mcp-arcade`). Cabinets **read tapes** (`mcp-arcade.tape/v1`) and write nothing the instrument, the oracle, or the dataset ever sees. They do **not** load receipts. The instrument lock (C1–C9 over there) is closed and is not reopened here.

One cabinet in focus: **Ghost on the Menu** (replay shooter), published **v0.3.0**. House Call (turn-based calibration) was parked by the Director on 2026-09-10 because it was not fun; last state `152f548`. It comes back only when there is a design that plays. `tape-core` keeps the scoring rules for that day.

Cabinet lock: G1, G7, G8, G9, G10 in `docs/study-swarm.dispatch.md`. Version stays `0.x` until the Director says otherwise. Do not promote to 1.0.0 because it is a release. All packages are private: git tag + GitHub release + Pages, never npm.

`pnpm verify` is the gate. `pnpm test:play ghost` is the acceptance play-through. `apps/cabinets` is the browser shell; Pages serves it at `/play/`. Identity scan the git-tracked tree from this repo before every push.
