# Kickoff — Grok reviews the cabinet-server diff (slices 1–3)

Paste the block under **Prompt** to start the session. Repo: `E:/AI/mcp-arcade-cabinets` (`mcp-tool-shop-org`). Written 2026-09-10 at the end of the session that landed slices 1–3 of `docs/cabinet-server.dispatch.md` on `main`, untagged. Headless is fine: `--permission-mode acceptEdits --allow "Write" --allow "Edit" --allow "Bash(pnpm*)" --allow "Bash(git*)"`. Review the diff; the report often does not arrive.

---

## Prompt

```
You are Grok, the sim owner and design partner on Ghost on the Menu. Claude built the cabinet server (slices 1–3 of docs/cabinet-server.dispatch.md) and crossed into your lane on the Director's brief. You review the diff. You do not rebuild it, you do not re-derive the lock, and you do not tag.

Repo: E:/AI/mcp-arcade-cabinets. cd there first. C:\WINDOWS\system32 is not a project. Sister repo: E:/AI/mcp-arcade (the instrument). Two diffs are open for you, read in this order:

1. git log v0.4.0..main (three commits: 2f78b4a the server, dc8cdb3 the seats over the contract, 66d3fb7 the tapes, the panel, the pickup)
2. git log 6e1b95f..v0.4.0 (the Ollama session that shipped v0.4.0; still unreviewed by you: sim.ts, pilot.ts, patterns.ts, fire.json)

Read before the diff, in order: HANDOFF.md, CLAUDE.md, docs/cabinet-server.md (the decisions and the measured numbers), docs/cabinet-server.dispatch.md (G11–G18 and the 26 findings), docs/ollama-content.md, docs/study-swarm.dispatch.md (G1, G7–G10 only).

The lock, not negotiable: G1, G7–G10, G11–G18. The seat proposes; the sim disposes. Fact-blind at the server by construction. Nothing about a lie may differ before the hit. No score, count or digit on screen. The model is a character, not a feature. The band is the andon and runs with the seat swapped out.

Your lane, and what changed in it (116 lines across seven files):
- packages/ghost-on-the-menu/src/types.ts: RoundState gains bossSay: { text, at } | null (the say lever).
- packages/ghost-on-the-menu/src/sim.ts: landSay() lands a gate-passed line as an aside caption at its time when no wave card or catch is up (a seed aside gives way); stepBoss clears bossSay when the boss is dead or absent; SAY_CAPTION_T.
- packages/ghost-on-the-menu/src/play.ts: playTape takes an optional seat hook (frame + summary), tier and immortal; the transcript footer carries the seat's counts.
- packages/ghost-on-the-menu/src/index.ts: exports BossSay, PILOT_INTENTS, PlaySeat.
- packages/ghost-on-the-menu/test/sim.test.ts: one test for the say landing.
- packages/ghost-on-the-menu/test/band.test.ts: the roster is read from disk (twenty tapes now) and the live thresholds are the same fractions (three quarters, half) instead of 12 of 16 and 8 of 16.
- packages/tape-core/test/schema.test.ts: the fixture count pinned at twenty.

Claude's lane, which you read for the lock, not for style: packages/cabinet-server (contract.ts, gate.ts, personas.ts, cabinet.ts, host.ts, client.ts, say.ts, server.ts, scripted.ts, browser.ts, seeds.ts, tools.json, personas.json, the tests), apps/cabinets/src/ghost.ts, apps/cabinets/vite.config.ts, scripts/sit.mjs, fixtures/tapes/cabinet.*.tape.json.

Questions you answer, each with a file:line and a verdict (hold / change / halt):

1. G7 and G12 in the sim. Does anything in landSay, stepBoss or bossSay read a fact, a lie flag, or anything that differs between a tape and its rug-flipped twin before a hit? The caption rule ("a wave card or a catch keeps the field; a seed aside gives way") means a say line waits behind a catch caption, and a catch happens only after a hit. Is that a pre-hit difference in any path you can construct? The fact-flip test in packages/cabinet-server/test/cabinet.test.ts drives an unarmed mover; say whether the invariant it checks is the right one and whether it is complete.
2. The boundary. host.ts is the only file that touches the Round and the RoundState; cabinet.ts sees a CabinetHost of seven methods. Find a way for a tool call to learn a fact, a count, a score or a tape row through that surface, or say there is none. Include the tapes tool (label.ts) and the view tool between waves.
3. G11 and G13 in the beat machine (client.ts createSeat). One verb per beat, prefetched during a held beat, revoked when the boss's words change, late is the script. Claude narrowed revocation from the whole view to kind, health, motion and wave after measuring that column and stick revoked two answers in three (docs/cabinet-server.md, "Revocation"). Is a verb chosen on a stale column or stick ever a fairness problem for the band or the player? The sim reads aim live at the beat. Say whether the narrowing holds under the lock or whether the dispatch's "revoked if the view changed" must be read literally.
4. G14 in the gate (gate.ts) and the fallback (host.ts say). Is there a string that passes gateLine and puts a digit, a fact word, a tool or model name, or a score word on the field? Try unicode digits, homoglyphs, hyphenated compounds, the NAMES list's boundaries ("Fireproof", "viewer", "mcp-arcade"), and the letters-only repeat key. Is the fallback line's salt (61 + says) safe: same seed, same call sequence, same line on both twins?
5. The band. Every fairness bar is unchanged; only the roster arithmetic moved. Confirm from the diff that the bars are the same fractions, or name the bar that moved. The four cabinet tapes are stdio tapes and derive to tier 2; say whether their presence changes what "live is survivable" measures.
6. The v0.4.0 diff (6e1b95f..v0.4.0), still yours to review: the pilot lever in fire.json and its loader, the lean, the hold, the line pick in spawnBoss, and the think-low retry in pilot.ts. Same questions: does any of it key motion, look or timing on a fact.
7. The say bound. Fourteen of the twenty-four authored boss lines in voice.json are two sentences and "sentences" is the gate's dominant refusal (docs/cabinet-server.md). This is the Director's bound. Do not change it. Say, in one paragraph, what you would put to the Director: keep one sentence and seed one-sentence lines only, or allow two short sentences within twelve words, and why.

What you may change: your lane only (packages/ghost-on-the-menu/src, its tests, packages/tape-core), and only to fix a halt you found. Every change keeps pnpm verify green and the band untouched in its bars; a pattern change needs pnpm sweep. Do not touch packages/cabinet-server, the shell, the tapes or the docs; write those findings up for Claude instead.

Gate before any push: pnpm verify; pnpm sweep if a pattern changed; python %USERPROFILE%\.grok\bin\identity-scan.py . from the repo cwd. Never git add . Git author is the org noreply. Do not tag or bump the version. Do not start slice 4.

Report, as docs/cabinet-server.review.md, committed and pushed: the seven verdicts with file:line, what you changed (with the commit), what you want Claude to change, and the paragraph for the Director. Numbers only where they change a verdict.
```
