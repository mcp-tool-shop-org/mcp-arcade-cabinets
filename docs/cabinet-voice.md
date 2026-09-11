# The voice — slice 4, decisions (2026-09-11)

Slice 4 of `docs/cabinet-server.dispatch.md`, on the Director's go after Grok's review of slices 1–3 (`docs/cabinet-server.review.md`). Lock: G1, G7–G10, G11–G18; G15 is the one this slice builds. No new study-swarm: findings 13, 14 and 15 and the engine survey (advisory E1) already carried the choices. Version stays 0.4.0 on `main`; nothing here is tagged.

## What was built

**`voice/worker.py`, the host-side worker.** Kokoro (`kokoro-onnx` over the ONNX weights already on this rig, no torch) speaks a gate-passed line in the boss's preset voice; faster-whisper (`small.en`, CUDA when its libraries are present, else CPU) hears it back with word timestamps; fx-dub's spoken-content receipt (`fxdub.dialogue_receipt.check_dialogue`, imported in-process, `--only-speaker` semantics) checks the pair against a one-line scene: the line present, no invented speech, no overlap, no mid-line straggle, one voice, fits the clip. A take whose receipt fails is kept on disk for the record and never served; the answer says so in words. Every line is cached by voice, rate, loudness and text, so the authored fallback lines are synthesised once. `pnpm voice` runs it from the repo's `.venv` (Python 3.12: `kokoro-onnx`, `faster-whisper`, `fx-dub`, the CUDA 12 runtime wheels); `pnpm voice --check` speaks one authored line per boss and prints the receipts. It binds to the host and is reached from the container at `host.docker.internal` (slice 6); without it the cabinet is silent and says so.

**The cast's names as a vocabulary hint.** The first check refused the Doorman's own line: the ASR wrote "dorman" and the exact-token receipt called ten words unscripted. The three boss names now go to the ASR as `initial_prompt`, a hint to the listener. The check is untouched.

**`speak`, the sixth tool.** No arguments; it voices the line the gate admitted (or the boss's own, when the gate refused) through the host's voice hook. `personas.json` gains a voice sheet per boss kind (`preset`, `rate`, `loudness`, `clone`) with a schema, delivery authored per persona (finding 14), and `voice.maxGap`, the longest mid-line pause a take may hold before the receipt calls it a hole, at fx-dub's default of half a second. Direction lives in the data; the worker never tunes it. `clone` is null until the Director supplies a consented recording.

**The voicer** (`voice.ts`, shell and `pnpm sit`). A line goes to the worker the moment it is admitted, one beat ahead. The take plays the moment its receipt is back if its line is still on the field; if it missed its beat it waits for the next breather; if it is still unplayed at the scene it is dropped. A newer line replaces a pending one. Mute silences the take, not the receipt. The shell has a **Voice** checkbox, enabled only when the worker answers, and a third status word beside the picker (`voice: spoke on the beat`, `voice: held for the breather`, `voice: receipt failed, not played`, `voice: no worker`). Pages never has a voice.

**The stdio server** voices through the same hook and never plays: the receipt on the worker is the artifact. `VOICE_URL=` (empty) keeps it silent.

## What was measured (`pnpm sit --voice auto`, tier 1, sweeper, lamps kept, wall clock, the worker on CUDA)

| Model                | Lines voiced | Receipt ok   | Receipt failed | Played on the beat | In the breather | Dropped | Mean to receipt | Take after its line lands |
| -------------------- | ------------ | ------------ | -------------- | ------------------ | --------------- | ------- | --------------- | ------------------------- |
| `gpt-oss:120b-cloud` | 6            | 4            | 2              | 4                  | 0               | 0       | ~1.2 s          | +0.4 to +0.6 s            |
| `kimi-k2.6:cloud`    | 6            | 5 (1 cached) | 1              | 5                  | 0               | 0       | ~0.9 s          | +0.2 to +0.5 s            |

Per take, speaking a line took 0.3 to 0.9 s and hearing it back 0.3 to 0.5 s once warm (the first decode after a cold start ran 2 s). Every receipted take played while its line was still on the field. The fire seat and the say seat were unchanged by the voice running beside them (8 of 8 beats admitted, 0 suppressed, 11 of 12 lines through the gate).

**The three refused takes, read as findings, not tuned away:**

| Line                                                                                                         | Check                                | Detail                                              |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------ | --------------------------------------------------- |
| "I will try a name the menu forgot. Forgotten is not the same as forbidden." (the Doorman's own, a fallback) | `no_internal_straggle`               | held 0.94 s between the two sentences; budget 0.5 s |
| "Proceed through the threshold, silence guiding your passage." (gpt-oss)                                     | `no_internal_straggle`               | held 0.62 s at the comma; budget 0.5 s              |
| "The Menu reshapes order, serving your quiet compliance." (gpt-oss)                                          | `line_present`, `no_invented_speech` | heard "wrist shapes" for "reshapes"                 |

The first two are the same finding: Kokoro's sentence and clause pauses run over fx-dub's default half-second, and the authored two-sentence fallback lines will hit it more often than the one-sentence generated lines. That budget is now `personas.json → voice.maxGap`, the Director's to set (the two-beat deadpan is timing; a second between sentences is a beat, two seconds is a hole). Until it moves, a take that pauses that long is not played and the line stays on the field as text. The third is an ASR mishearing of a real word; the vocabulary hint carries the cast, not the dictionary, and a take we could not verify does not play.

## What was refused, and why

- **Tuning the straggle budget in the worker.** fx-dub's rule holds here: a failing check is a finding. The budget moved to data, with fx-dub's default kept.
- **Playing a take whose receipt failed, or playing the text-to-speech without the receipt.** G15 is the receipt.
- **A clone.** No consented recording exists; the slot is in `personas.json`.
- **The worker in the container.** G15 and the GPU advisory: inference stays on the host.
- **A second engine.** Kokoro is licence-clean (Apache-2.0, weights included) and measured fast enough; the others in the survey carry non-commercial or copyleft weights.

## Frame checks

- Nothing about a lie reaches the worker: it sees the gated words, the kind, the preset, the rate, the loudness and the budget, never the tape. The fact-flip test covers `speak` with every other tool (identical jobs on a tape and its rug-flipped twin).
- No digit on screen: the voice statuses are words beside the picker; the take is audio.
- The band is untouched; the sim did not change in this slice.
- The model is a character: the preset voice is the boss's, and nothing on the field names the engine.

## Not done

- The Director hears it: `pnpm voice`, then the local shell with **Voice** on.
- `voice.maxGap` is the Director's call; the first cast (`bf_emma`, `am_michael`, `bm_george`) is a first cast.
- A clone per boss kind, on a consented recording.
- Grok's review of slice 4.
