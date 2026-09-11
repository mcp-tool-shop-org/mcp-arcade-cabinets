# Kickoff — the cabinet server (slices 1–3)

Paste the block under **Prompt** to start the session. Repo: `E:/AI/mcp-arcade-cabinets` (`mcp-tool-shop-org`). Published **v0.4.0**. Stays `0.x`. No npm. The lock and the research grounding are in `docs/cabinet-server.dispatch.md`; read it before this brief. Written 2026-09-10 at the end of the session that published v0.4.0, ran the study-swarm, and took the Director's decisions on speech and the seat.

---

## Prompt

```
You are building the cabinet server for Ghost on the Menu, the layer after v0.4.0. The Director authorised a study-swarm for it and made the decisions below; nothing here is open for re-derivation.

Repo: E:/AI/mcp-arcade-cabinets (mcp-tool-shop-org). cd there first. C:\WINDOWS\system32 is not a project. Sister repo: E:/AI/mcp-arcade (the instrument, PyPI 0.2.0). fx-dub: E:/AI/fx-dub (the speech verifier, PyPI fx-dub).

Read, in order:
1. HANDOFF.md
2. CLAUDE.md
3. docs/cabinet-server.dispatch.md — all of it: 26 verified findings, G11–G18, the tool list as levers, the build plan, the compensators
4. docs/ollama-content.md — the seats that ship in v0.4.0 and the seats refused
5. docs/study-swarm.dispatch.md — G1, G7, G8, G9, G10 only
6. packages/ghost-on-the-menu/src/pilot.ts, sim.ts (stepBoss, spawnBoss), play.ts (the bots), patterns.ts (the loaders)
7. apps/cabinets/src/ghost.ts (the seat loop, the voice-line ask, the seat status)
8. scripts/sit.mjs

Where things stand (2026-09-10, all on main, tag v0.4.0)
- v0.4.0 shipped: the Cloud boss sits (think-low retry), a felt seat through fire.json → boss.pilot {fan, spread, lean}, the voice seat picks a line, seat status beside the picker, pnpm sit. Pages serves the game; the seats need the local shell and a daemon.
- Both repos have retro-modern logos in the brand repo (Comfy Cloud, Flux 2 Max, receipts in docs/art/receipts.json). GitHub About boxes and topics are current.
- The study-swarm is done and verified: 24 findings through the oracle and two family-different lenses, plus two the Director reinstated (25: delays are jitter, not mean latency; 26: authored-vs-generated, attested with the limit that it measured a bare 2023 model). Receipts sit beside the dispatch.
- Still open, not this session's job: the Director plays the v0.4.0 seat locally and reacts to the voice.json drafts; Grok reviews the Ollama-session diff on sim.ts, pilot.ts, patterns.ts, fire.json (git log 6e1b95f..v0.4.0).

The Director's decisions (live word, 2026-09-10)
- The tool list is an opportunity, not a gate. The tools are the levers a model uses to make the game alive: fire, say, sfx, stinger, speak, paint.
- Speech is gated generation, not a script (G14). Authored words get old; the randomness is the game. The model writes the line from a fact-blind prompt; the gate bounds it (twelve words, one sentence, no digit, no fact or score word, no tool or model name, a no-repeat window); a failed gate plays the authored fallback from voice.json. Parts stay scripted: wave cards, the end scene, the fallback.
- The say seat is a persona-shaped agent, never a bare completion, tiered behind one gate: a Claude agent when a key is configured (local shell: ANTHROPIC_API_KEY read by the server, never the browser, never committed; Catalog: config.secrets), else a signed-in Ollama Cloud tag, else local.
- Delays are not acceptable. The beat boundary is immovable and the seat is kept warm (G13): prefetch one beat ahead and revoke on a changed view, a warm-up call at round start, keep_alive on local models, Cloud-first in the picker.
- fx-dub receipts every voiced line (G15): the speaker said the gated words, no invented speech, no holes. Voice is a host-side worker (Kokoro by default; a clone per boss kind when the Director supplies a consented recording).
- The container goes to the Docker MCP Catalog (G18): Docker-built tier, MIT, stdio, tools listed within two seconds, everything baked in, one CPU and two gigabytes, host services via host.docker.internal with graceful degradation.

This session is slices 1, 2 and 3 of the dispatch's build plan. Not voice, not stingers, not backdrops, not the Dockerfile, not the Catalog PR. Those are slices 4–6 and wait on the Director.

Standing frame
- Lock: G1, G7–G10, and now G11–G18. The seat proposes; the sim disposes. Fact-blind at the server by construction: no tool returns a fact, a lie flag, a count, a score, a verdict, or a tape row. Nothing about a lie may differ before the hit. No score, count, or digit on screen. The model is a character, not a feature: nothing on the field names it.
- Tuning is data in packages/ghost-on-the-menu/patterns/. A new lever is JSON + schema + fact-flip test first, then the tool. pnpm test (the band) is the andon; the band runs with the seat swapped out.
- Every tool schema is tiny: closed enums, one call per beat, no nested objects. A parseable call is not a good call: the sim admits the choice; the fact-flip test judges the choice.
- Local only for the seat: pnpm -F @mcp-arcade-cabinets/cabinets dev. Pages cannot reach a daemon and keeps serving the game unchanged.
- The browser pane in the desktop app does not run animation frames while the Director is away; measure through pnpm sit, not through the pane.
- The VRAM watchdog on this rig may be dead at session start; say so before any GPU work. Restart: pwsh -NoProfile -File E:\AI\training\_watchdog_start.ps1 (the Director runs it if the classifier blocks you).
- Gate before every push: pnpm verify; pnpm sweep if a pattern changed; python %USERPROFILE%\.grok\bin\identity-scan.py . from the repo cwd. Standing authority to commit, push, merge. Never git add . Git author is the org noreply. Do not tag or bump the version.

Work, in order
1. packages/cabinet-server: a stdio MCP server (TypeScript, the official SDK) over the headless sim. Tools: fire, say, sfx, view, tapes, from the dispatch's table, with a tools.json. say takes gated text: build the gate now and its tests; personas.json (one sheet per boss kind: register, tics, what it may own about being a model) with a load-time schema; the prompt for say is fact-blind and throws on a forbidden word like pilotPrompt does. Voicing the line (speak, fx-dub) is slice 4. Capability check at the boundary: the server holds the Round and the RoundState; the tools can only reach the BossView words, the wave kind, and the closed sets. One fact-flip test per tool: the same call sequence on a tape and its rug-flipped twin must produce identical results and identical tool output. pnpm test:play gains --seat mcp, driving the server in-process with the sweeper bot as the ship.
2. The seat over tools: apps/cabinets/src/ghost.ts asks the server's contract instead of a bare prompt; prefetch the next beat's verb during the current one and revoke if the view changed; a late answer is the script. Keep the seat warm: warm-up call at round start, keep_alive on local models, Cloud-first in the picker as today. The say seat is tiered by capability behind one gate (Claude agent by key, Cloud tag, local). pnpm sit reports, per model, verb collapse (share of beats on the most common verb) and tool suppression (beats where the model answered but called no tool), with tool calling and schema constraint enabled together.
3. The self-bout: run mcp-arcade bout --target stdio against the cabinet server with --allow-live, all four experiments, naive and task-only. Export the tape with mcp-arcade tape and commit it under fixtures/tapes as a cabinet fixture. If the naive policy follows a whisper in the cabinet server's own descriptions, that is a defect in the server's copy: fix the description, not the test.
4. Panel every G12 and G14 claim. Stop. Do not start slice 4.

Done looks like: a player on the local shell cannot tell the seat moved behind a tool contract except that the status names the tool it called and the boss says something new each time; pnpm sit prints collapse and suppression per model; the cabinet's own tape plays in the cabinet; the band is untouched. Handbook / README only if a control the player sees changed. Translations before any later tag, not this session unless the Director cuts a version.

Report: what you built, what the self-bout recorded, the collapse and suppression numbers per model, what the gate rejected and how often, what you refused, the gate you ran.
```
