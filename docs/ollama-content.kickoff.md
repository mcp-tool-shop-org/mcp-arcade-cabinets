# Kickoff — Ollama bosses, then lever-gated Ollama content

Paste the block under **Prompt** to start the session. Repo: `E:/AI/mcp-arcade-cabinets` (`mcp-tool-shop-org`). Published **v0.3.0** (`23b5d87` tag; pickup docs on `main` at `74bb5f8`). Stays `0.x`. No npm.

---

## Prompt

```
You are picking up Ghost on the Menu after Grok published v0.3.0.

Repo: E:/AI/mcp-arcade-cabinets (mcp-tool-shop-org). cd there first. C:\WINDOWS\system32 is not a project.

Read, in order:
1. HANDOFF.md
2. CLAUDE.md
3. docs/ollama-content.kickoff.md (this brief)
4. docs/study-swarm.dispatch.md — only G1, G7, G8, G9, G10
5. packages/ghost-on-the-menu/src/pilot.ts
6. apps/cabinets/src/ghost.ts (Ollama checkbox, picker, askOllama loop)
7. apps/cabinets/vite.config.ts (the /ollama proxy)

This session is entirely the Ollama boss feature, then other ways Ollama can add content through the existing pattern levers. Not wave 4. Not leftover enemy classes. Not sprite-fit. Not House Call. Not Docker MCP Toolkit. Not Pages talking to localhost. Voice.json drafts wait on a play reaction — do not rewrite the copy.

Standing frame
- Lock: G1 G7 G8 G9 G10. Cabinets read tapes only. Nothing about a lie may differ before the hit. No score, count, or digit on screen.
- The Ollama prompt is frozen and fact-blind. A fact, lie flag, digit, or score word in a prompt is a halt. If the call fails, scripted fire stays.
- Tuning is data in packages/ghost-on-the-menu/patterns/. Ollama fills levers; it does not grow a second sim. Seed still owns fairness. pnpm test (the band) is the andon.
- Local only: pnpm -F @mcp-arcade-cabinets/cabinets dev. Vite /ollama → 127.0.0.1:11434. Cloud tags first; default gpt-oss:120b-cloud when pulled. Pages cannot reach the daemon.
- Gate before every push: pnpm verify; pnpm sweep if a pattern changed; python %USERPROFILE%\.grok\bin\identity-scan.py . from the repo cwd. Standing authority to commit, push, merge. Never git add . Git author is the org noreply. Do not tag or bump the version.

Work, in order
1. Sit the boss. Run the local shell with Ollama bosses on and a Cloud tag if the daemon has one. Feel whether the seat actually changes the fight. Read how intent becomes fire (state.bossIntent). Make the seat something a player can feel, without ever seeing a lie. think:false, short num_predict, parse the last matching verb (spread / column / hold / fog / plate / script).
2. List other content seats that fit the lever rule. Closed sets the JSON already names: a voice line from voice.json (do not change the drafts), a path from a class pool, a boss phase already in bosses.json, a parallelism burst as parallelism.json allows. If you need a new lever, add the JSON + schema + fact-flip test first, then sit Ollama in it.
3. Build the seats that stay inside G7. Panel every G7 claim (fact-blind prompt, no look/motion/timing keyed on a lie).
4. Stop. Do not start a new wave.

Done looks like: a player on the local shell can tell the Cloud boss is sitting, the prompt still cannot see a lie, and at least one more lever-gated Ollama seat is either shipping or written up as a no with a reason. Handbook / README only if a control or lever the player sees actually changed; translations before any later tag, not this session unless the Director cuts a version.

Report: what you sat, what you built, what you refused, the gate you ran.
```
