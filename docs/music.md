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

## The halt: the no-words check does not discriminate here

The brief asks for an empty faster-whisper transcript on every installed bed.
**That bar is not met, and it is not met by the beds shipping on `main` today
either.** Same configuration throughout: `small.en`, beam 1, no VAD, language
en, CPU.

| set                   | length    | non-empty transcripts                             |
| --------------------- | --------- | ------------------------------------------------- |
| Ghost, shipping today | 32–40 s   | **6 of 8** ("Thanks for watching!", "you", "The") |
| Ghost, this pass      | 110–128 s | 7 of 8                                            |
| Vibe, shipping today  | 38 s      | **0 of 7**                                        |
| Vibe, this pass       | 115–125 s | 2 of 7                                            |

Two readings follow. Whisper writes captions over instrumental music, and more
of them the longer the file — the Vibe rows isolate that cleanly, since the
same source material goes from 0/7 at 38 s to 2/7 at two minutes. And Ghost's
own shipped beds already fail the bar, so an empty transcript was never the
property those files had.

Against that, route M1 is **not generative**: every sample in an installed bed
came out of a bed the Director already approved, so no word can be in one that
was not already there. That is a stronger guarantee than the transcript, and it
is why the beds are installed rather than held.

What is owed: someone with the authority to move the bar decides what the check
should assert. The script now records Whisper's own `no_speech_prob` and
`avg_logprob` per segment beside the text, which is the reading that can tell a
sung word from a caption; it does **not** redefine the verdict. Full per-bed
text and probabilities are in `words-report.json` beside each evidence folder.
Route M2's pieces are generative and are not installed, so nothing unaudited
reaches a player.

## Cost

Thirty Comfy Cloud jobs, **93.53 GPU seconds** on `rtx_pro_6000`, **zero
credits** — `estimate_credits` returned 0 on every graph before submission and
the billing feed reports no `credits_used` on any job. Ghost 52.47 s, Vibe
41.06 s.

## What the next pass should know

- `BED_MIN_S` is still a flat 36 s in `packages/ghost-on-the-menu/src/audio.ts`.
  A two-minute bed will now be cut at 36 seconds — a third of the way in. The
  hold has to follow the track's own duration (health-wave finding C-w1-04)
  before a player hears any of this the way it was built.
- The Ghost pack gate now names all eight beds by file, as Vibe's already did.
- `docs/art/receipts.json -> tracks` still lists `parallelism.mp3`, which is not
  in the tree; the new duration test asserts each track folder holds exactly the
  beds the code names.
