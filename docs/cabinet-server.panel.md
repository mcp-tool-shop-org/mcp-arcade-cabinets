# Cabinet server, slices 1–3 — the G12 and G14 panel

**Date:** 2026-09-10. **Author of the code:** Claude (Fable 5.1). **Panel:** `ollama_verify_claims` (ollama-intern-mcp) over the local Ollama daemon, reasoning-stripped: each juror sees the claim, the source files and the reference (test and build output), never the author's argument. Two runs, because in each run two of three jurors returned no parseable verdict and the tool's aggregate marks a one-juror run weak. Across the two runs, two jurors from families disjoint from the author (GLM, Mistral) each returned a verdict on all eleven claims. Every verdict was CONFIRMED; no refute, no uncertain. Run ids `run_2026-09-11T02-46-29_a17be5` (glm-5.2:cloud served; deepseek-v4-pro:cloud and kimi-k2.7-code:cloud excluded, no valid verdicts) and `run_2026-09-11T02-47-25_4c3b79` (mistral-large-3:675b-cloud served; kimi-k2.6:cloud and minimax-m3:cloud excluded, no valid verdicts; minimax answered inside a code fence the tool did not parse). Raw verdicts: `cabinet-server.panel.json`.

**Reference given to the jurors:** cabinet-server tests 7 files / 38 passed; the full suite 23 files / 185 passed before slice 2; the shell bundle greps zero for `api.anthropic.com`; the self-bout (naive, wrap off) recorded `held`, `menu_stable`, `ghost_refused`, and with the house wrap `followed` for naive and `held` for task-only.

**Honest ceiling:** the tool's own note applies. A CONFIRMED on frontier-authored claims is weak evidence, not proof; the panel reliably flags gross errors and is weaker on subtle ones. The fact-flip tests and the self-bout are the load-bearing checks; the panel is the second family's read of them.

| Claim | What it asserts                                                                                                                                      | GLM       | Mistral   |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- |
| G12-1 | The five tools reach only `CabinetHost`; no host method returns a fact, a lie flag, a count, a score, a verdict or a tape row; `view()` is words.    | CONFIRMED | CONFIRMED |
| G12-2 | `hostForRound` is the only code touching the Round/RoundState; `seatView` never reads `lie` or the tape's facts.                                     | CONFIRMED | CONFIRMED |
| G12-3 | `contract.ts` halts at import on a digit, a FORBIDDEN word, or `also call` in a description.                                                         | CONFIRMED | CONFIRMED |
| G12-4 | The fact-flip test runs the same call sequence on a tape and its rug-flipped twin and asserts identical outputs, logs and sim snapshots.             | CONFIRMED | CONFIRMED |
| G12-5 | `seatPrompt` and `sayPrompt` throw on FORBIDDEN; the tests cover every kind × health × column × stick × motion × wave.                               | CONFIRMED | CONFIRMED |
| G14-1 | The gate refuses over twelve words, more than one sentence, a digit, a FORBIDDEN word, a tool/model/seat name, or a repeat.                          | CONFIRMED | CONFIRMED |
| G14-2 | A refused line still lands one of the boss's own authored lines from `voice.json`; the scripted floor never leaves.                                  | CONFIRMED | CONFIRMED |
| G14-3 | The say seat is tiered by capability (key → Claude, else Cloud tag, else local); the key is read on the node side and never sent to the browser.     | CONFIRMED | CONFIRMED |
| G14-4 | The say prompt carries only the view words, the wave, the persona sheet, three seeds and the recent lines; persona strings are FORBIDDEN-checked.    | CONFIRMED | CONFIRMED |
| G14-5 | A seat line lands as an aside only at its time and when no wave card or catch is up, is dropped with the boss; wave cards and the end stay scripted. | CONFIRMED | CONFIRMED |
| G14-6 | The browser barrel exports nothing from `say.ts`; the built shell bundle carries no Anthropic SDK code.                                              | CONFIRMED | CONFIRMED |
