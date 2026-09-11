# Review — slice 4, the voice

Grok, sim owner. Read against G1, G7–G10, G11–G18; G15 is the one this slice builds. Diffs: `3304718..main` (`aa53e2a` the seeds, `5983e38` the voice, `c3bba46` the record). The lock is not re-derived. Nothing is tagged.

No halt in this lane. Nothing in `packages/ghost-on-the-menu` or `packages/tape-core` changed, and nothing here needs to. This file is the report.

---

## 1. G15's receipt — **change**

The voicer only calls `play` when `speakLine` returned `voiced` and a url (`packages/cabinet-server/src/voice.ts:161`). A failed receipt sets `url` to null (`voice/worker.py:254`) and the take is renamed to `.failed.wav` (`worker.py:176`), so the Audio element is never handed a failed take. The cache key includes the budget (`worker.py:92`), so a take receipted under one `max_gap` is not served under another. A worker restart re-renders a failed id (the `.wav` is gone, the receipt alone is not enough) and serves a passed id from disk.

The worker's GET `/audio/<id>.wav` (`worker.py:208`) does not read the receipt. It serves any file named `{id}.wav`. Between `sf.write` (`worker.py:125`) and the check, that file exists with no receipt yet; if the process dies after writing a failed receipt and before the rename, the failed take is still `{id}.wav` and GET will serve it. Close that: serve only when `{id}.receipt.json` exists and `ok` is true.

The shell's Audio element (`apps/cabinets/src/ghost.ts:348`) is constructed from the worker's url, which is `/audio/<id>.wav`. The Vite proxy is `/voice` (`vite.config.ts:100`). The take never reaches the worker from the page; it 404s on the dev server and `play().catch` swallows it. Prefix the play url with `/voice`. `pnpm sit` never loads the wav, which is why the sit numbers still read as plays.

## 2. The boundary, extended — **hold**

`host.ts:135` `speak()` builds a `VoiceJob` from `state.bossSay` (the gated words or the seed fallback), `boss.kind`, the persona sheet, `voice.maxGap`, and the landing time. Nothing about a lie, a fact, a count, or a tape row is on that job. The worker sees `text`, `kind`, `preset`, `rate`, `loudness`, `max_gap_s` (`voice.ts:71`). `kind` is whisperer / menu / doorman, not a tape fact.

The fact-flip (`packages/cabinet-server/test/cabinet.test.ts:83`, asserted at `:161`) records `kind`, preset, and text on both twins and requires them identical. That covers what the worker is allowed to see. `at` is round time; the sim snaps already cover `bossSay`. It is the right invariant and it is complete for G12.

## 3. The timing rule — **change**

`createVoicer` (`voice.ts:128`) plays a ready take if `lineUp` or `now < job.at + captionSeconds` (`voice.ts:191`), else holds for the breather, else drops at the scene. A newer job replaces `pending` (`voice.ts:153`); it does not clear `held`. The shell passes `lineUp` as `caption.kind === 'aside'` (`ghost.ts:525`) and `breather` as no boss and `waveKindAt === 'breather'` (`ghost.ts:526`).

A held take cannot play over a boss that has spawned: breather requires `!state.boss`. It can play in a later breather after another boss has already spoken, because a new job does not drop `held`. `lineUp` is any aside, not this job's words, so a late receipt plays over a seed aside. The time window plays when the aside is gone, including over a catch (`sim.ts:1183`, kind `'catch'`, so `lineUp` is false but `now < at + 2.4` may still be true). Two Audio elements can overlap: `play` does not stop the previous one (`ghost.ts:348`), and a ready take plus a leftover `held` can both fire in one tick if an aside is up during a breather.

A new job should drop `held`. `lineUp` should mean this job's line is the aside on the field. Do not play the time window over a catch.

## 4. The budget as data — for the Director

The seam is right: `personas.json → voice.maxGap` (`personas.json:69`), sent per take, never tuned in the worker. Keep it there. Do not give the worker-authored scene a second bark budget of its own; the scene already carries `max_gap_within_line_s` from that one number (`worker.py:147`), and a second number in Python would be the tuning you refused. 0.5 s is fx-dub's default for a two-speaker hole. It is tight for a one-line bark with no second speaker: Kokoro's comma already ran 0.62 s, and a two-sentence fallback ran 0.94 s. Those refusals should stay findings until you hear them. When you set the number, a beat of pause is delivery and two seconds is a hole; I would start at one second and listen. Do not move it from this review.

## 5. The vocabulary hint — **hold**

`CAST_HINT` (`worker.py:41`) is a hint to the listener. The check is still `check_dialogue` on the gated words (`worker.py:151`). "reshapes" heard as "wrist shapes" still refused, so the hint is not a thumb. Carry the three names, not the line and not a dictionary. Whisper can echo an `initial_prompt`; extra words from a fatter hint would fail `no_invented_speech` or, worse, pass a take that was not said. Leave it.

## 6. The worker's surface — **change**

For a dev tool bound to `127.0.0.1` (`worker.py:262`): a local process can POST `/speak` and fill `film/voice/` (gitignored) while the GPU speaks and hears every line. Text is capped at 200 characters, the preset is a closed list, rate and loudness are ranged. That is acceptable on loopback. `/audio` without a receipt check is the hole that matters now (question 1).

Before slice 6 puts `host.docker.internal` in front of it: bind so the container can reach it (loopback is not enough from the VM), put a secret on the hook (Catalog `config.secrets`, never baked in), cap the cache, keep `/audio` receipt-gated, and stop defaulting `--model` to a rig path (`worker.py:265`). Graceful silence when the worker is down already holds (`voice.ts:85`, G18).

## 7. Delivery per persona — **hold**

The sheet (`personas.ts:20`: preset, rate, loudness, clone) is the right shape for a Director's pass. Finding 14 said loudness carries the dry read when rate, pitch and loudness are moved independently; pitch is not load-bearing before the cast is heard. A pause field would duplicate `voice.maxGap`. `clone` is null and is not sent to the worker, which is correct until a consented recording exists. Hear `bf_emma` / `am_michael` / `bm_george` as they are; add a lever only if the pass asks for one.

---

## What I changed

Nothing in `packages/ghost-on-the-menu` or `packages/tape-core`. No halt in this lane. This file is the commit.

## What Claude should change

In the voice worker and the shell (not done here):

1. `ghost.ts`: play `/voice` + the receipt url, so the take reaches the worker.
2. `worker.py` GET `/audio`: serve only when the receipt exists and `ok` is true; do not serve a `.wav` that is still rendering or that failed.
3. `voice.ts` `createVoicer`: a new job drops `held`; `lineUp` is this job's aside; do not play the caption window over a catch.

Do not move `voice.maxGap`. Do not fatten `CAST_HINT`. Do not start slice 5 from this review. Slice 6 still owns bind, secret, cache cap, and the model path.
