#!/usr/bin/env python
"""Hear every bed back and refuse any that says a word Whisper did not invent.

Decision 4 of `docs/music.kickoff.md`. The field may carry no words a model
wrote, and a sung word is a word.

WHY THE RULE IS NOT "AN EMPTY TRANSCRIPT". Two measurements killed that bar:

  * Six of the eight Ghost beds shipping on `main` today transcribe something
    ("Thanks for watching!", "you", "The") while containing no voice at all,
    and the same material at two minutes transcribes more of it, not less.
    Whisper writes captions over instrumental music; that is a property of the
    decoder, not of the audio.
  * The coordinator measured every bed's htdemucs vocals stem at -23 to -37
    dBFS RMS across all fifteen beds. The chiptune leads land in the vocals
    stem, so a loud vocals stem does not mean a voice either. Neither the
    separator nor a bare transcript can be the rule.

SO THE RULE IS: take the transcript, strip Whisper's known caption
hallucinations as whole phrases and whole tokens (CAPTION_PHRASES and
CAPTION_TOKENS below, a fixed list), strip a CAPTION token that is only ever
repeated, and the REMAINDER must carry no word. The raw transcript, the stripped
remainder and Whisper's own per-segment `no_speech_prob` and `avg_logprob` are
all recorded beside the verdict, so a future reader can disagree with the list
without re-running the transcription.

WHAT THIS GATE IS FOR. Route M1 — the arranged two-minute beds — passes by
construction: every sample in one came out of a bed the Director had already
approved, so no word can be in it that was not already there, and this script
cannot tell anyone anything new about it. The gate exists for the GENERATIVE
pieces: route M2's ACE-Step audition files, and anything else a model writes
from scratch. Those are where a sung word could actually appear, and they are
the reason the list is kept narrow and the remainder is kept honest.

Both sets are read in one run: the installed mp3s and the `fresh/` flacs.

faster-whisper `small.en`, beam 1, no VAD filter, language en. This runs under
the voice worker's interpreter, which is where faster-whisper lives on this rig
(`scripts/voice.mjs`: VOICE_PYTHON, else `.venv`):

  .venv/Scripts/python.exe scripts/beds/words.py --cabinet ghost
"""

from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
import unicodedata

# Whisper answers instrumental music with emoji often enough that a Windows
# console's cp1252 would crash the run before the report is written.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

REPO = pathlib.Path(__file__).resolve().parents[2]

CABINETS = {
    "ghost": (
        REPO / "apps" / "cabinets" / "public" / "tracks",
        REPO / "docs" / "art" / "originals-ghost-beds",
        ["inspect", "poison", "rug", "unlisted", "breather", "whisperer", "menu", "doorman"],
    ),
    "vibe": (
        REPO / "apps" / "cabinets" / "public" / "vibe" / "tracks",
        REPO / "docs" / "art" / "originals-vibe-beds-2min",
        ["bash", "csharp", "java", "javascript", "python", "sql", "integration"],
    ),
}

MODEL = "small.en"
BEAM = 1
#: A segment at or above this `no_speech_prob` is Whisper saying it heard no
#: voice there, whatever text the decoder went on to write. Recorded, not used
#: as the verdict: it is a reading, and readings belong beside the rule.
NO_SPEECH_FLOOR = 0.5

#: Caption hallucinations, as whole phrases. Longest first so that
#: "thanks for watching" is taken before "the". These are the lines Whisper
#: writes over music because its training data is full of them; none of them
#: is a word anything in this repository sings.
CAPTION_PHRASES = [
    "this is the end of the video",
    "thanks for watching",
    "thank you",
    "subtitles by",
    "music",
    "you",
    "the",
    "bye",
]
#: The same list as single tokens, for a remainder that survives phrase
#: stripping as scattered words.
CAPTION_TOKENS = {"music", "you", "the", "bye", "thanks", "thank"}


class Verdict:
    CLEAN = "clean"
    CAPTION = "caption only"
    WORD = "word"


def _fold(text: str) -> str:
    """Lowercase, drop emoji and punctuation, squeeze whitespace."""
    out = []
    for ch in unicodedata.normalize("NFKC", text):
        cat = unicodedata.category(ch)
        if cat.startswith("L") or cat.startswith("N"):
            out.append(ch.lower())
        elif ch == "'":
            out.append(ch)
        else:
            out.append(" ")
    return re.sub(r"\s+", " ", "".join(out)).strip()


def strip_captions(text: str) -> tuple[str, list[str]]:
    """The transcript with known captions removed, and what they were.

    Phrases go first, longest listed first, repeatedly until none is left.
    Then a remainder that is one CAPTION token said over and over, which is
    the decoder looping rather than a lyric. Then single caption tokens. A
    token standing alone once is left in, and fails the bed.

    The repeat rule is held to CAPTION_TOKENS on purpose. It used to strip any
    token that was only ever repeated, which reads "oh oh oh" — `sql`'s own
    transcript is "Yeah Oh Oh" — as a decoder loop and clears a bed that is
    singing. A repeated word that is not on the list stays in and fails the
    bed; a human can disagree from the raw transcript, which is recorded.
    """
    folded = _fold(text)
    removed: list[str] = []
    changed = True
    while changed and folded:
        changed = False
        for phrase in CAPTION_PHRASES:
            pattern = r"(?:(?<=\s)|^)" + re.escape(phrase) + r"(?:(?=\s)|$)"
            new = re.sub(pattern, " ", folded)
            new = re.sub(r"\s+", " ", new).strip()
            if new != folded:
                removed.append(phrase)
                folded = new
                changed = True
    tokens = [t for t in folded.split(" ") if t]
    # A remainder that is one CAPTION token repeated is the decoder stuck in
    # a loop. It runs before the single-token strip so the count is recorded
    # as the loop it was, and it is held to the list so a repeated lyric is
    # not cleaned away as one.
    if len(set(tokens)) == 1 and len(tokens) > 1 and tokens[0] in CAPTION_TOKENS:
        removed.append(f"{tokens[0]} x{len(tokens)}")
        tokens = []
    kept = []
    for tok in tokens:
        if tok in CAPTION_TOKENS:
            removed.append(tok)
        else:
            kept.append(tok)
    return " ".join(kept), removed


def verdict_for(raw: str, remainder: str) -> str:
    if raw.strip() == "":
        return Verdict.CLEAN
    return Verdict.CAPTION if remainder == "" else Verdict.WORD


def hear(model, path: pathlib.Path, key: str) -> dict:
    segments, info = model.transcribe(str(path), beam_size=BEAM, language="en", vad_filter=False)
    segs = list(segments)
    raw = "".join(s.text for s in segs).strip()
    remainder, removed = strip_captions(raw)
    # The decoder returning no segments at all already reads CLEAN — an empty
    # transcript carries no word — but it is not the same evidence as a bed
    # transcribed and found empty: there is nothing to disagree with. The row
    # says which of the two it was, and the probability fields below are None.
    note = "no segments: the decoder returned nothing for this file" if not segs else ""
    no_speech = [float(s.no_speech_prob) for s in segs]
    logprob = [float(s.avg_logprob) for s in segs]
    row = {
        "key": key,
        "file": str(path).replace("\\", "/"),
        "seconds": round(float(info.duration), 3),
        "transcript": raw,
        "characters": len(raw),
        "remainder": remainder,
        "removed": removed,
        "verdict": verdict_for(raw, remainder),
        "note": note,
        "segments": len(segs),
        "min_no_speech_prob": round(min(no_speech), 4) if no_speech else None,
        "mean_no_speech_prob": round(sum(no_speech) / len(no_speech), 4) if no_speech else None,
        "max_avg_logprob": round(max(logprob), 3) if logprob else None,
        "no_speech_everywhere": bool(no_speech) and min(no_speech) >= NO_SPEECH_FLOOR,
    }
    return row


def run_set(model, label: str, files: list[tuple[str, pathlib.Path]]) -> dict:
    rows = []
    for key, path in files:
        row = hear(model, path, key)
        rows.append(row)
        note = row["note"] or row["verdict"]
        if row["verdict"] == Verdict.CAPTION:
            note = f"caption only, removed {row['removed']}"
        elif row["verdict"] == Verdict.WORD:
            note = f"WORD {row['remainder']!r} (from {row['transcript'][:60]!r})"
        print(f"  {label:9} {key:14} {row['seconds']:7.2f}s  {note}")
    return {
        "beds": rows,
        "misses": [r["key"] for r in rows if r["verdict"] == Verdict.WORD],
        "caption_only": [r["key"] for r in rows if r["verdict"] == Verdict.CAPTION],
        "clean": [r["key"] for r in rows if r["verdict"] == Verdict.CLEAN],
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cabinet", default="ghost", choices=sorted(CABINETS))
    ap.add_argument("--device", default="auto")
    ap.add_argument(
        "--dir",
        default="",
        help="read one ad-hoc folder instead of the installed and fresh sets",
    )
    args = ap.parse_args()
    tracks, evidence, keys = CABINETS[args.cabinet]

    from faster_whisper import WhisperModel

    device = args.device
    if device == "auto":
        try:
            import ctranslate2

            device = "cuda" if ctranslate2.get_cuda_device_count() > 0 else "cpu"
        except Exception:
            device = "cpu"
    model = WhisperModel(MODEL, device=device, compute_type="float16" if device == "cuda" else "int8")

    head = {
        "cabinet": args.cabinet,
        "model": f"faster-whisper {MODEL}",
        "device": device,
        "beam_size": BEAM,
        "vad_filter": False,
        "language": "en",
        "rule": (
            "the transcript with known caption hallucinations removed as whole phrases "
            "and tokens, plus a CAPTION token that is only ever repeated, must carry no "
            "remaining word; route M1 passes by construction and this gate is for "
            "generative pieces"
        ),
        "caption_phrases": CAPTION_PHRASES,
        "caption_tokens": sorted(CAPTION_TOKENS),
        "no_speech_floor": NO_SPEECH_FLOOR,
    }

    if args.dir:
        folder = pathlib.Path(args.dir)
        suffix = ".flac" if any(folder.glob("*.flac")) else ".mp3"
        files = [(k, folder / f"{k}{suffix}") for k in keys if (folder / f"{k}{suffix}").exists()]
        report = dict(head, read_from=str(folder).replace("\\", "/"), **run_set(model, folder.name, files))
        out = evidence / f"words-report-{folder.name}.json"
        out.write_text(json.dumps(report, indent=1), encoding="utf-8")
        print(f"report -> {out}")
        return 1 if report["misses"] else 0

    installed = [(k, tracks / f"{k}.mp3") for k in keys]
    fresh_dir = evidence / "fresh"
    fresh: list[tuple[str, pathlib.Path]] = []
    for key in keys:
        found = sorted(fresh_dir.glob(f"{key}-*.flac"))
        fresh.extend((f"{key}-{p.stem.split('-')[-1]}", p) for p in found)

    report = dict(head)
    report["installed"] = run_set(model, "installed", installed)
    report["fresh"] = run_set(model, "fresh", fresh)
    out = evidence / "words-report.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=1), encoding="utf-8")
    print(f"report -> {out}")

    bad = report["installed"]["misses"] + report["fresh"]["misses"]
    if bad:
        print(f"REFUSED: {', '.join(bad)} carry a word after the captions come out", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
