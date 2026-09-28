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

## Not picked (and why)

- **Bring-your-own tapes (F-c7b2e453, F-9c3b5646, F-b5181705):** New game grammar — the Director's feature-pass rule excludes it.
- **E2 `call` tool (F-343aac59):** Belongs to the endless slice, not a polish pass.
- **Listed run into next level / ladder rescale (F-3d4a029f):** The Director's call once measured; measurements are in `dogfood-swarm.md` wave 11.
- **Persona sheet lever (F-7963eec3):** Content lever, not structural; the lead adds lines on every update already.
- **Fairness band's fourth bot (F-91231126):** The band already measures what matters; a fourth bot is hygiene, not leverage.
