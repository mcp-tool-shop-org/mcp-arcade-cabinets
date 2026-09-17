# The music pass — two-minute beds

> Builder's draft. The numbers, the decisions and the halts are here; the lead
> rewrites the prose. Nothing below names a note the Director has not heard.

The Director played v0.11.1 and said the songs do not play long enough to get
into. Every recorded bed in both cabinets is now a piece of 110 to 130 seconds
built from that bed's own material, mastered to the level the set already sat
at, and installed as MP3 128k. Fifteen beds: Ghost on the Menu's eight and Vibe
Typer's seven. The fresh ACE-Step pieces (route M2) are downloaded and
auditionable but **not installed** — that pick is the Director's.

Full rows: `docs/art/receipts.json -> ghost_beds_2min` and `vibe_beds_2min`.

## What was made

Route M1, per bed: split into four stems on Comfy Cloud (htdemucs), then
rebuilt locally on bar lines as **intro (4 bars) · the full loop · breakdown (8
or 16 bars) · the full loop · outro (4 bars)**, one beat of equal-power
crossfade at every seam. The full-loop sections are the original file, not a
sum of stems, so the part the player hears most carries no separator residue.

Route M2, per bed: one new 120 s ACE-Step 1.5 piece with the original bed as
the timbre reference (`ReferenceTimbreAudio` fed by `VAEEncodeAudio`,
`generate_audio_codes` off), at the measured tempo and key, `[instrumental]`,
seeds 8301–8308 and 8311–8317.

## Ghost on the Menu

| bed       | bpm    | bars | sections             | length   | LUFS before → after | true peak before → after | installed |
| --------- | ------ | ---- | -------------------- | -------- | ------------------- | ------------------------ | --------- |
| inspect   | 113.33 | 17   | 4 · 17 · 16 · 17 · 4 | 122.82 s | −12.21 → −12.80     | +1.50 → −1.00            | 1.88 MB   |
| poison    | 126.67 | 19   | 4 · 19 · 16 · 19 · 4 | 117.47 s | −11.03 → −12.65     | +1.15 → −1.00            | 1.79 MB   |
| rug       | 100.00 | 15   | 4 · 15 · 8 · 15 · 4  | 110.40 s | −15.72 → −12.78     | +0.15 → −1.00            | 1.69 MB   |
| unlisted  | 133.33 | 20   | 4 · 20 · 16 · 20 · 4 | 115.20 s | −11.96 → −12.85     | +1.52 → −1.00            | 1.76 MB   |
| breather  | 90.00  | 12   | 4 · 12 · 16 · 12 · 4 | 128.00 s | −12.63 → −12.72     | +0.39 → −1.00            | 1.95 MB   |
| whisperer | 120.00 | 20   | 4 · 20 · 8 · 20 · 4  | 112.00 s | −13.76 → −12.81     | −1.39 → −1.00            | 1.71 MB   |
| menu      | 96.00  | 16   | 4 · 16 · 8 · 16 · 4  | 120.00 s | −11.61 → −12.80     | +1.13 → −1.00            | 1.83 MB   |
| doorman   | 132.00 | 22   | 4 · 22 · 16 · 22 · 4 | 123.64 s | −12.29 → −12.64     | +0.47 → −1.00            | 1.89 MB   |

Target −12.62 LUFS; the eight land inside **0.21 LU** of each other, all at
−1.00 dBTP. The set goes from 5.16 MB to **15.20 MB**.

## Vibe Typer

| bed         | bars | sections            | length   | LUFS before → after | true peak before → after | installed |
| ----------- | ---- | ------------------- | -------- | ------------------- | ------------------------ | --------- |
| bash        | 16   | 4 · 16 · 8 · 16 · 4 | 120.00 s | −13.59 → −13.79     | −0.72 → −1.00            | 1.83 MB   |
| csharp      | 17   | 4 · 17 · 8 · 17 · 4 | 125.00 s | −13.57 → −13.59     | −1.46 → −1.22            | 1.91 MB   |
| java        | 16   | 4 · 16 · 8 · 16 · 4 | 120.00 s | −13.66 → −13.80     | −0.48 → −1.00            | 1.83 MB   |
| javascript  | 17   | 4 · 17 · 8 · 17 · 4 | 125.00 s | −13.59 → −13.60     | −0.65 → −1.00            | 1.91 MB   |
| python      | 15   | 4 · 15 · 8 · 15 · 4 | 115.00 s | −13.59 → −13.68     | −1.96 → −1.00            | 1.76 MB   |
| sql         | 16   | 4 · 16 · 8 · 16 · 4 | 120.00 s | −13.66 → −13.76     | −1.70 → −1.00            | 1.83 MB   |
| integration | 17   | 4 · 17 · 8 · 17 · 4 | 125.00 s | −13.62 → −13.79     | −0.35 → −1.00            | 1.91 MB   |

All at 96 bpm. Target −13.59 LUFS, **exactly** today's median; the seven land
inside 0.21 LU. The set goes from 4.26 MB to **13.61 MB**.

## Encoding — the Director's pick

Measured on the bed nearest each set's median length. libsndfile writes both
formats; no ffmpeg is needed or present.

| encoding             | kbps  | one bed | Ghost ×8 | Vibe ×7  | both         |
| -------------------- | ----- | ------- | -------- | -------- | ------------ |
| MP3 128k (installed) | 128.1 | 1.84 MB | 15.20 MB | 13.61 MB | **28.81 MB** |
| MP3 96k              | 96.0  | 1.38 MB | 11.40 MB | 10.20 MB | 21.60 MB     |
| Opus 96k             | 96.0  | 1.38 MB | 11.39 MB | 10.20 MB | 21.59 MB     |

Opus 96k and MP3 96k are the same size to within a kilobyte, so **Opus buys
quality at 96k, not weight** — at equal bitrate Opus is the better codec, and
that is the whole of its case here. Against it: the shell, the pack gate and
the release check all name `.mp3`, so the switch is code in three places. MP3
128k is installed pending the decision.

## Decisions the brief did not make

1. **There is no drum layer to remove.** htdemucs leaves the drums stem at −48
   to −79 dBFS RMS on all fifteen beds — the percussion is synthetic, written
   into the same synth parts as the melody, so a separator has nothing to pull.
   A median-filter HPSS was measured too and removed about a quarter of the
   spectral flux for a 3 dB hole. The "breakdown without drums" is therefore
   built as the **quiet layer** (bass + the second melodic stem), level-matched
   to sit 7 LU under the loop. It lands −3.0 to −9.9 dB under with 63–97% of
   the flux: a thinner, quieter section, not a drum-free one.
2. **The breakdown opens on the loudest bar of the quiet layer**, not bar one.
   `whisperer` keeps almost nothing in its second stem over its opening bars;
   starting there gave a 17 dB hole.
3. **The loudness target is the quieter of today's median and what the set can
   reach gently.** The beds shipping today are clipped (up to +1.52 dBTP); at
   a −1 dBTP ceiling three of Ghost's eight would need 6–9 dB of limiting to
   match them. Ghost settles 0.37 LU under today's median; Vibe needed no
   concession at all.
4. **Vibe's arrangement source is not the installed mp3.** Each installed Vibe
   bed is a flat 38.000 s, which is **15.2 bars** at its own receipted 96 bpm —
   so it is not a whole-bar loop and cannot be one. Whole-bar loops (15–17
   bars) were cut from the 52 s masters instead. The installed mp3 still sets
   the loudness reference.
5. **Two keys were low-confidence.** `unlisted` scored r = 0.478 on the chroma
   estimate and falls back to the Vibe family's A minor per the brief;
   `whisperer` (0.552) keeps its C# minor. Every r is in the receipt.

## The no-words gate, redefined

An empty transcript could not be the rule. Two measurements killed it. Six of
the eight Ghost beds shipping on `main` today transcribe something while
containing no voice at all, and the same material at two minutes transcribes
more of it, not less — Whisper writes captions over instrumental music, and
that is a property of the decoder. And the htdemucs vocals stem measures −23
to −37 dBFS RMS on all fifteen beds, because the chiptune leads land in the
vocals stem, so a loud vocals stem does not mean a voice either. Neither the
separator nor a bare transcript can decide this.

**The rule now:** take the transcript, remove Whisper's known caption
hallucinations as whole phrases and whole tokens — a fixed list in
`scripts/beds/words.py`: "this is the end of the video", "thanks for watching",
"thank you", "subtitles by", "music", "you", "the", "bye" — then remove a token
that is only ever repeated, because a remainder of one token said over and over
is the decoder looping rather than a lyric. Whatever is left must carry no
word. The raw transcript, the stripped remainder, what was removed, and
Whisper's per-segment `no_speech_prob` and `avg_logprob` all sit beside the
verdict in `words-report.json`, so a later reader can disagree with the list
without re-running anything.

**Route M1 passes by construction.** Every sample in an arranged bed came out of
a bed the Director had already approved, so no word can be in one that was not
already there. This gate exists for the generative pieces — route M2's ACE-Step
auditions — which is why they are measured here too and why the list is kept
narrow.

Measured over all thirty files (`small.en`, beam 1, no VAD, en, CPU):

| set              | clean | caption only | **word** |
| ---------------- | ----- | ------------ | -------- |
| Ghost, installed | 1     | 6            | **1**    |
| Ghost, fresh     | 0     | 7            | **1**    |
| Vibe, installed  | 5     | 0            | **2**    |
| Vibe, fresh      | 0     | 5            | **2**    |

Twenty-four of thirty pass. The six that do not are all YouTube outro captions
the fixed list does not name:

- `menu` (installed) — "I hope you enjoyed this video, and don't forget to like,
  comment and subscribe"
- `csharp` (installed) — "My Outro For My 21st Birthday"
- `sql` (installed) — "Yeah Oh Oh"
- `poison-8302` (fresh) — "Sigh… Thank you. Thank you." leaves "sigh"
- `csharp-8312`, `integration-8317` (fresh) — "I'll see you next time."

Two things are worth naming before anyone widens the list. These remainders are
the same kind of thing as the phrases already on it, not lyrics — but extending
the list is a judgement about what a caption is, and the builder did not make
it. And the token strip is blunt: removing "you" from "I hope you enjoyed this
video" leaves "i hope enjoyed this video", so a remainder can read as broken
English rather than as the caption it came from. The raw transcript is recorded
precisely so the remainder is never the only evidence.

Whisper is also not reproducible run to run on this material: `breather`
transcribed a caption in one run and a single "🎵" in another, and `csharp`
moved from "My Outro For My 20th Birthday" to "21st". Any verdict on a
borderline bed should be read as one sample, not a constant.

## Cost

Thirty Comfy Cloud jobs, **93.53 GPU seconds** on `rtx_pro_6000`, **zero
credits** — `estimate_credits` returned 0 on every graph before submission and
the billing feed reports no `credits_used` on any job. Ghost 52.47 s, Vibe
41.06 s.

## The reviews

Two reviewers of other families read the branch's packet (cut from the merge base with main, the loader fix included): Mistral Large 3 in about a minute, Kimi K2.6 in twenty-one. Both said halt. Every point, with what was done:

| Reviewer           | Point                                                                                                                         | Disposition                                                                                                                                                                                                                                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kimi 1, Mistral 2  | `one(key, ok)` keeps a bed present when `error` follows `loadedmetadata`; `bedFailed` is never called from the error listener | Not a defect as read, by design as built: the error listener marks the file missing (`one(key, false)`), and a bed that loaded its header but then refuses to play is caught at `play()` by `bedRefused`, which hands it to `bedFailed` and the status word turns. The two paths cover the two ways a bed fails. |
| Kimi 2             | `adopt` returns `Boolean(currentBed)` but never assigns it                                                                    | Misread: `currentBed = next` is the fourth line of `adopt`, before `bringIn`. A refusal inside `bringIn` clears it and the return reads false, which is the point.                                                                                                                                               |
| Kimi 3             | the `.catch` on `play()` can itself throw through `onBedFail`                                                                 | Fixed: the handler is guarded, so a shell callback that throws never becomes an unhandled rejection.                                                                                                                                                                                                             |
| Kimi 4, Mistral 10 | the repeated-token rule strips a real lyric like "hey hey"                                                                    | Misread: the rule is held to `CAPTION_TOKENS` on the same line; "hey" is not one, so "hey hey" is heard and the bed refused.                                                                                                                                                                                     |
| Kimi 5             | `plan_for` never reads `loop_s`                                                                                               | Misread: it names the loop length in the refusal it raises.                                                                                                                                                                                                                                                      |
| Kimi 6             | `loop_fade` on a clip under four samples broadcasts an empty ramp                                                             | Fixed: the fade is never shorter than one sample. No shipped bed is near that, but a gate should not throw on a stub.                                                                                                                                                                                            |
| Mistral 1          | the stray-file claim in `bed-length.test.ts` is not asserted                                                                  | Already asserted: the last case reads the whole folder and compares it to the keys the code names, every entry and not only the mp3s.                                                                                                                                                                            |
| Mistral 3          | `notify` runs twice at the settle deadline                                                                                    | The deadline returns before notifying when nothing is pending; a second notice when something still is costs one redraw of a status word. Left.                                                                                                                                                                  |
| Mistral 4          | `bedsSettled` at the deadline is premature                                                                                    | By design: the deadline settles the chrome, not the beds; a late bed still arrives and clears its mark. The comment above it says so.                                                                                                                                                                            |
| Mistral 5          | a bed marked missing stays missing after a late load                                                                          | `one(key, true)` deletes the mark on arrival. Already so.                                                                                                                                                                                                                                                        |
| Mistral 6, 14      | a refused bed can be adopted again through the lookup                                                                         | `refusedBeds` and `bedFor` are that filter; `switchBed` and `poolBed` both go through `bedFor`. Already so.                                                                                                                                                                                                      |
| Mistral 7          | `play()` throwing synchronously leaves the bed adopted                                                                        | The call is inside a try; the catch hands the bed to `bedRefused`. Already so.                                                                                                                                                                                                                                   |
| Mistral 8, 9       | the bar refusal could carry its error percentage; the quiet layer could be level-checked                                      | Nice to have on a builder's script; not taken this pass.                                                                                                                                                                                                                                                         |
| Mistral 11         | `hear` with no segments                                                                                                       | Reads CLEAN with a note that says so. Already so.                                                                                                                                                                                                                                                                |
| Mistral 12         | the pack gate does not check bed size or duration                                                                             | It checks a floor on size (`BED_MIN_BYTES`) so a placeholder cannot ship; the duration is the shell test's, which runs on every verify. Left as split.                                                                                                                                                           |
| Mistral 13         | `bedFailed` walks a Map that could hold one element twice                                                                     | It cannot: the loader builds one element per key. Left.                                                                                                                                                                                                                                                          |

## The Director's second listen, and the cut on meaning

Playing the served bundle the Director heard the same piece open every round and nothing change inside one. Two causes, both in `audio.ts`: every tape's first wave is inspect and the named bed for the wave was taken at the opening, so every round opened on `inspect.mp3`; and the hold before any change was the playing file's own length, longer than every round, so no wave bed and no boss bed was ever heard. Grok's consult (`docs/ghost-attack.grok-consult.md`, question four) named the rule that replaces it: the file's length is how long it loops, not how long the game waits. The opening is a seeded draw from the five wave beds, whatever the wave kind. For one evening a wave change took its named bed after `BED_MIN_S` (thirty-six seconds, a verse) when the playing piece was long. The Director's third listen (2026-09-17): the beds sound right and end after thirty or forty seconds. His decision: a bed plays through whole before a wave change may move it, whatever its length, and the boss bed still comes at once. `BED_SHORT_S` is gone; `changeHold` is the piece's own length; `BED_MAX_S` stays as the cap on a mis-tagged file's loop.

The same listen: the boss music is mostly silent and not daunting. Measured on the installed files (RMS per half second), the boss beds open under thirty decibels below full scale for the first eight (whisperer), ten (menu) and seven and a half (doorman) seconds, and carry thin stretches inside (whisperer 40–48 s and 96–112 s; menu 45–50 s and 105–110 s; doorman 43–47 s, 51–62 s and 67–72 s). The intro, breakdown and outro of route M1 are the quiet layer, and on these three beds that layer is close to nothing; a boss bed comes at once and lasts a boss, so what played under the fight was the silence. Two answers, both the Director's pick: today a boss bed starts past its intro (`entry` on the bed, `BED_ENTRY_S` in `audio.ts`, four bars at each bed's receipted tempo), and the three boss beds are rebuilt loop-first with no quiet-layer section at all and mastered two LU above the set, for his ear on the served bundle before they ship. A rebuilt bed's entry goes back to zero.

## The playlist

After his fourth listen of the day, on the bundle with the full-length hold and the boss's own music at once, the Director chose a playlist, because a piece was still being replaced at every boss before it could settle. The rule from here: the recorded beds are a playlist: a piece runs from its first bar to its last, the next is drawn without repeats until the set is spent, and no event on the field replaces a piece; a boss no longer brings its own music, and the scene between two tapes does not stop the piece. The next piece comes from a bag the browser keeps (`ghost.songs` in local storage, beside the lines' bags), so the walk carries across tapes and visits; a runner or a test with no bag rotates the pool from the seed's opening. All eight beds are in the pool, the three rebuilt boss beds included. The music leaves only on the way back to the cabinets. In `audio.ts` this is `keepSong` in place of the wave switch: the hold constants, the wave-named switch, the boss-at-once rule and the entry seek are gone, `end(true)` at the scene keeps the piece and stops the chiptune, and `BED_POOL` is every track key. The Vibe Typer beds are untouched: one bed per stack, its own rule.

**The boss beds rebuilt** (the same hour, in a worktree; the receipts are in `docs/art/originals-ghost-beds/` and `docs/art/receipts.json`). The originals are forty-second files whose music stops early (the whisperer's last seven seconds, the menu's last five, the doorman's last four are digital silence), which is where the near-empty intros and thin stretches came from. Each is now its original loop trimmed to its last whole bar (sixteen, fourteen, nineteen bars) and repeated to two minutes, a one-beat equal-power crossfade at every seam read from the decay past the trim, no quiet-layer section anywhere, ending on a bar line. Mastered toward -10.6 LUFS, two LU above the set: the menu (-11.0) and the doorman (-10.9) land; the whisperer reaches -11.6 at the limiter's three-decibel cap and stays there. -1.0 dBTP before encoding; the MP3 rung costs about 0.4 LU and lifts the true peak past the ceiling, which is what it does to every bed in the set. No four-second window under -30 dBFS anywhere; the floors are -17.4, -27.5 and -18.6 where they were -71.8, -38.1 and -50.0. The menu's own quiet half sits fifteen decibels under its loud half; it is the Director's material and was not recomposed. The words gate: the whisperer transcribes a caption only, the menu nothing, the doorman a Whisper caption loop with no speech in any segment by the decoder's own probability, which is the class the gate's redefinition names, and route M1 passes by construction since every sample came out of an approved bed. `scripts/beds/arrange.py` gained `--shape loop` and a per-cabinet `loop_keys` table, `master.py` per-key targets with a reduction budget, `encode.py` a partial run; all three merge into the existing reports rather than replacing them.

**The menu went back the same hour.** Heard as a piece in the playlist, the loop version of the menu (a thirty-five-second loop repeated three and a half times, mastered two LU hot) read as repetitive and harsh. It is back to its route M1 arrangement at the set's level, with its receipts' rows; the whisperer and the doorman keep their loop versions. The pick for the menu's slot from here is the Director's, by ear, among the arrangement, the fresh piece (`fresh/menu-8307.flac`, route M2, words gate clean) and no menu piece at all; the three candidates are served beside the bundle under `play/audition/` for that listen.

## What the next pass should know

- The playlist (`keepSong` in `audio.ts`): a piece runs to its end and the shell's bag draws the next; the opening with no bag is the seed's pool draw. No event on the field replaces a piece.
- The Ghost pack gate names all eight beds by file and floors their size, as Vibe's does.
- `docs/art/receipts.json -> tracks` still lists `parallelism.mp3`, which is not in the tree; the duration test asserts each track folder holds exactly the beds the code names and nothing else.
- Motif is the next music slice, after this release: its ingest path takes the stems these arrangements were cut from.
