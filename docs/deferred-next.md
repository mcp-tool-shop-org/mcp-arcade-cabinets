# Deferred proposals — next slice pick

**From:** wave 10 feature audit (`docs/dogfood-swarm.md`, deferred list)  
**Picked:** 2026-09-27  
**Rule:** no new game grammar, no new packages unless factoring removes one.

## The five

| Id         | Proposal                                            | Why this slice                                                                                                                           | Effort |
| ---------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| F-4759c927 | Hash routes and back button                         | A reload loses the player's place; browser navigation is expected behavior, not new grammar.                                             | small  |
| F-1ddadc07 | Page icon, theme color, card and manifest           | PWA basics: homescreen icon, dark/light theme color, social card. Highest perceived-polish per line.                                     | small  |
| F-cff99996 | Headless check mode for both launchers              | CI can verify `--mcp` health and tool lists without a browser; removes manual smoke-test burden.                                         | medium |
| F-14547f9e | Status route so the page can say why a seat is dark | Player-facing debuggability: "Ollama not running" beats a dark seat.                                                                     | small  |
| F-4e691438 | Launcher CLIs factored into one core                | Ghost and Vibe launchers duplicate ~80% of seat/proxy/stdio logic. One core package cuts bug surface and makes the next cabinet cheaper. | medium |

## Dependency major bump pass (scheduled)

| Package      | Current | Target | Blocker / Risk                                                              |
| ------------ | ------- | ------ | --------------------------------------------------------------------------- |
| `eslint`     | 9.39.5  | 10.x   | v9 deprecated. New rules (`no-useless-assignment`, `preserve-caught-error`) |
| `@eslint/js` | 9.39.5  | 10.x   | Matches `eslint` major                                                      |
| `typescript` | 5.9.3   | 7.x    | `typescript-eslint` peer deps cap at `<6.1.0`; blocked until v9+            |
| `jsdom`      | 25.0.1  | 30.x   | API changes possible; needs vitest compat check                             |

**Safe bumps already done:** `esbuild` 0.25→0.28, `prettier` 3.9.6→3.9.9, `typescript-eslint` 8.70.0→8.70.1, `vitest` 5.0.0→5.0.2, `globals` 15→17, `@types/node` 22→26.

**When to schedule:** After `typescript-eslint` publishes support for TypeScript 7 and ESLint 10 stabilizes, or as a standalone infra slice.

- **Bring-your-own tapes (F-c7b2e453, F-9c3b5646, F-b5181705):** New game grammar — the Director's feature-pass rule excludes it.
- **E2 `call` tool (F-343aac59):** Belongs to the endless slice, not a polish pass.
- **Listed run into next level / ladder rescale (F-3d4a029f):** The Director's call once measured; measurements are in `dogfood-swarm.md` wave 11.
- **Persona sheet lever (F-7963eec3):** Content lever, not structural; the lead adds lines on every update already.
- **Fairness band's fourth bot (F-91231126):** The band already measures what matters; a fourth bot is hygiene, not leverage.
