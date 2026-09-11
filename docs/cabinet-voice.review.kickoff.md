# Kickoff — Grok reviews slice 4, the voice

Paste the block under **Prompt** to start the session. Repo: `E:/AI/mcp-arcade-cabinets` (`mcp-tool-shop-org`). Written 2026-09-11 at the end of the session that landed slice 4 on `main`, untagged. Headless is fine: `--permission-mode acceptEdits --allow "Write" --allow "Edit" --allow "Bash(pnpm*)" --allow "Bash(git*)"`. Review the diff; the report often does not arrive.

---

## Prompt

```
You are Grok, the sim owner and design partner on Ghost on the Menu. Your review of slices 1–3 landed as docs/cabinet-server.review.md; both changes you asked for are in (the gate refuses any digit glyph, the fallback salt restarts with the round), and the Director took your paragraph: only one-sentence lines seed the say prompt. Claude then built slice 4, the voice, on the Director's go. You review that diff. You do not rebuild it, you do not re-derive the lock, and you do not tag.

Repo: E:/AI/mcp-arcade-cabinets. cd there first. C:\WINDOWS\system32 is not a project. fx-dub, the receipt: E:/AI/fx-dub (PyPI fx-dub 1.1.1; tools/dialogue_receipt.py is the check). The diff: git log 3304718..main (aa53e2a the seeds, 5983e38 the voice, c3bba46 the record and the budget as data).

Read before the diff, in order: HANDOFF.md, docs/cabinet-voice.md (what was built, the measured takes, the three refused takes, what was refused), docs/cabinet-server.dispatch.md G15 and findings 13, 14, 15, docs/cabinet-server.md (slices 1–3, for the boundary you already reviewed).

The lock, not negotiable: G1, G7–G10, G11–G18. G15 is the one slice 4 builds: the voice is a host-side worker, never in the container; every voiced line carries an fx-dub spoken-content receipt (the words spoken are the gated words, no invented speech, no hole); a take that misses its beat waits for the breather; delivery is authored per persona; a clone only on a consented recording. Nothing about a lie reaches the worker. No digit on screen. The model is a character.

What changed, and whose lane:
- voice/worker.py (new, Python, Claude's lane): Kokoro (kokoro-onnx) speaks, faster-whisper hears it back with word timestamps, fxdub.dialogue_receipt.check_dialogue runs on the pair with a one-line scene, only_speaker BOSS. A failed receipt keeps the take on disk as .failed.wav and never serves it. Cache by preset, rate, loudness, budget and text. The cast's names go to the ASR as initial_prompt. HTTP on 127.0.0.1:7788: /health, /speak, /audio/<id>.wav.
- packages/cabinet-server: tools.json gains speak (no arguments); personas.json gains a voice sheet per boss (preset, rate, loudness, clone) and voice.maxGap (the mid-line pause budget, fx-dub's default 0.5 s, sent per take); personas.ts schema; cabinet.ts speak over host.speak(); host.ts hands a VoiceJob (gated words, kind, sheet, budget, the line's landing time) to a voice hook; voice.ts is the worker client and the voicer (the timing rule); server.ts voices through the hook and never plays; scripted.ts calls speak after each say.
- apps/cabinets/src/ghost.ts: a Voice checkbox, enabled only when /voice/health answers; the voicer plays a passed take through an Audio element; mute silences the take. vite.config.ts proxies /voice. scripts/sit.mjs --voice. scripts/voice.mjs runs the worker from .venv.
- Nothing in packages/ghost-on-the-menu or packages/tape-core changed in slice 4. The four cabinet tapes were re-recorded on the six-tool menu (same facts, new bout ids).

Questions you answer, each with a file:line and a verdict (hold / change / halt):

1. G15's receipt. Does every path that plays audio pass through a receipt that passed? Find a way for a take to reach the Audio element, or the worker's /audio route, without check_dialogue saying ok on the gated words, or say there is none. Include the cache (a take receipted under one budget served under another), the .failed.wav rename, and a worker restart.
2. The boundary, extended. host.ts speak() builds the VoiceJob from state.bossSay (the gated words) and the persona sheet. Does anything about a lie, a fact, a count or a tape row reach the worker or the receipt? The fact-flip test in packages/cabinet-server/test/cabinet.test.ts records the jobs on a tape and its rug-flipped twin and requires them identical; say whether that covers it.
3. The timing rule (voice.ts createVoicer). A take plays if its line is up or within captionSeconds of its landing time; else it waits for the breather; else it is dropped at the scene; a newer job replaces a pending one. Is there a path where a take plays late over the wrong line, or twice, or where a held take plays over a boss that has since spawned? The sim's own asides and the wave card are captions the voicer reads only as "an aside is up".
4. The budget as data. voice.maxGap at 0.5 s refused two takes for pauses of 0.94 s and 0.62 s (docs/cabinet-voice.md). Claude moved the budget to personas.json instead of tuning it and left fx-dub's default. Is that the right seam, and is 0.5 s the right floor for a one-line bark with no second speaker, or should the scene the worker authors carry a bark budget of its own? Say what you would put to the Director, in one paragraph. The Director's word on this is pending; do not change the number.
5. The vocabulary hint. initial_prompt carries the three boss names so the ASR spells them as the script does. Is that a hint to the listener or a thumb on the check? "reshapes" heard as "wrist shapes" still refused a take; say whether the hint should carry more, less, or nothing.
6. The worker's surface. It binds 127.0.0.1, takes text up to 200 characters, a preset from Kokoro's list, rate 0.5–2, loudness −24 to +12 dB, a budget 0.1–3 s, and writes wav and receipt files under film/voice. Anything a hostile caller on the host could do with it that matters for a dev tool, and anything that must change before slice 6 puts host.docker.internal in front of it.
7. Delivery per persona (finding 14). bf_emma slow and quiet for the Whisperer, am_michael flat for the Menu, bm_george quick and a touch loud for the Doorman. You have not heard them and neither has the Director; say whether the sheet is the right shape for a Director's pass (preset, rate, loudness) or whether a pitch or a pause field belongs on it before the cast is judged.

What you may change: your lane only (packages/ghost-on-the-menu/src, its tests, packages/tape-core), and only to fix a halt you found. Nothing in the sim changed in slice 4, so expect to change nothing. Every change keeps pnpm verify green and the band untouched. Do not touch packages/cabinet-server, voice/, the shell, the tapes or the docs; write those findings up for Claude instead.

Gate before any push: pnpm verify; pnpm sweep if a pattern changed; python %USERPROFILE%\.grok\bin\identity-scan.py . from the repo cwd. Never git add . Git author is the org noreply. Do not tag or bump the version. Do not start slice 5. The voice worker may be running on this rig at 127.0.0.1:7788; you may read /health and speak a line against it (pnpm voice --check), but do not need to.

Report, as docs/cabinet-voice.review.md, committed and pushed: the seven verdicts with file:line, what you changed (with the commit), what you want Claude to change, and the paragraph for the Director on the budget. Numbers only where they change a verdict.
```
