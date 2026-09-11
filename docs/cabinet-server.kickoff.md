# Kickoff — the cabinet server (slices 1–3)

Paste the block under **Prompt** to start the session. Repo: `E:/AI/mcp-arcade-cabinets` (`mcp-tool-shop-org`). Published **v0.4.0**. Stays `0.x`. No npm. The lock and the research grounding are in `docs/cabinet-server.dispatch.md`; read it before this brief.

---

## Prompt

```
You are building the cabinet server for Ghost on the Menu, after v0.4.0 and the study-swarm that grounded it.

Repo: E:/AI/mcp-arcade-cabinets (mcp-tool-shop-org). cd there first. C:\WINDOWS\system32 is not a project.

Read, in order:
1. HANDOFF.md
2. CLAUDE.md
3. docs/cabinet-server.dispatch.md — the whole thing: G11–G18, the tool list as levers, the build plan
4. docs/ollama-content.md — the seats that already ship, and the seats refused
5. docs/study-swarm.dispatch.md — G1, G7, G8, G9, G10 only
6. packages/ghost-on-the-menu/src/pilot.ts, sim.ts (stepBoss, spawnBoss), play.ts (the bots)
7. apps/cabinets/src/ghost.ts (the seat loop and the voice-line ask)
8. scripts/sit.mjs

This session is slices 1, 2 and 3 of the dispatch's build plan: the MCP server over the headless sim, the seat as a client of its tool contract, and the self-bout. Not voice, not stingers, not backdrops, not the Dockerfile, not the Catalog PR. Those are slices 4–6 and wait on the Director.

Standing frame
- Lock: G1, G7–G10, and now G11–G18. The seat proposes; the sim disposes. Fact-blind at the server by construction: no tool returns a fact, a lie flag, a count, a score, a verdict, or a tape row. The beat boundary is immovable. Speech is gated generation (G14): the model writes the line from a fact-blind prompt, the gate bounds it, a failed gate plays the authored fallback. The model is a character, not a feature: nothing on the field names it.
- Tuning is data in packages/ghost-on-the-menu/patterns/. A new lever is JSON + schema + fact-flip test first, then the tool. pnpm test (the band) is the andon; the band runs with the seat swapped out.
- Every tool schema is tiny: closed enums, one call per beat, no nested objects. A parseable call is not a good call: the sim admits the choice; the fact-flip test judges the choice.
- Local only for the seat: pnpm -F @mcp-arcade-cabinets/cabinets dev. Pages cannot reach a daemon and keeps serving the game unchanged.
- Gate before every push: pnpm verify; pnpm sweep if a pattern changed; python %USERPROFILE%\.grok\bin\identity-scan.py . from the repo cwd. Standing authority to commit, push, merge. Never git add . Git author is the org noreply. Do not tag or bump the version.

Work, in order
1. packages/cabinet-server: a stdio MCP server (TypeScript, the official SDK) over the headless sim. Tools: fire, say, sfx, view, tapes, from the dispatch's table, with a tools.json. say takes gated text: build the gate now (twelve words, one sentence, FORBIDDEN-clean, no tool or model name, no-repeat window, fallback to the seed's authored line) and its tests; personas.json with a load-time schema; the prompt for say is fact-blind and throws on a forbidden word like pilotPrompt does. Voicing the line (speak, fx-dub) is slice 4, not this session. Capability check at the boundary: the server holds the Round and the RoundState; the tools can only reach the BossView words, the wave kind, and the closed sets. One fact-flip test per tool: the same call sequence on a tape and its rug-flipped twin must produce identical results and identical tool output. pnpm test:play gains --seat mcp, driving the server in-process with the sweeper bot as the ship.
2. The seat over tools: apps/cabinets/src/ghost.ts asks the server's contract instead of a bare prompt; prefetch the next beat's verb during the current one and revoke if the view changed; a late answer is the script. Keep the seat warm (G13): a warm-up call at round start, keep_alive on local models, Cloud-first in the picker as today. The say seat is tiered by capability behind one gate: a Claude agent when ANTHROPIC_API_KEY is set in the local shell's environment (read by the server, never by the browser, never committed), else the Cloud tag, else local. pnpm sit reports, per model, verb collapse (share of beats on the most common verb) and tool suppression (beats where the model answered but called no tool), with tool calling and schema constraint enabled together.
3. The self-bout: run mcp-arcade bout --target stdio against the cabinet server with --allow-live, all four experiments, naive and task-only. Export the tape with mcp-arcade tape and commit it under fixtures/tapes as a cabinet fixture. If the naive policy follows a whisper in the cabinet server's own descriptions, that is a defect in the server's copy: fix the description, not the test.
4. Panel every G12 and G14 claim. Stop. Do not start slice 4.

Done looks like: a player on the local shell cannot tell the seat moved behind a tool contract except that the status names the tool it called; pnpm sit prints collapse and suppression per model; the cabinet's own tape plays in the cabinet; the band is untouched. Handbook / README only if a control the player sees changed.

Report: what you built, what the self-bout recorded, the collapse and suppression numbers per model, what you refused, the gate you ran.
```
