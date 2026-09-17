#!/usr/bin/env python
"""Hear every installed bed back and refuse any that says a word.

Decision 4 of `docs/music.kickoff.md`, and the same check the Vibe bed batch
passed (`docs/art/receipts.json -> vibe_typer_beds.acceptance.no_words`): the
field may carry no words a model wrote, and a sung word is a word. The tags
name no vocals five ways so that this check has nothing to find; the check is
what proves it rather than the tags.

faster-whisper `small.en`, beam 1, no VAD filter, language en. An empty
transcript on every bed is the pass the brief asks for.

That pass condition does not hold on this material, and the control run is in
the receipt: SIX OF THE EIGHT BEDS SHIPPING TODAY fail it, transcribing
"Thanks for watching!", "you", "The" and the like — Whisper's well-known
habit of writing captions over music that has no voice in it. The Vibe beds
passed the same check at 38 seconds each; at two minutes there is simply more
room for the model to invent a caption. So the transcript alone cannot tell a
sung word from a hallucination, and this script records what can: per segment,
Whisper's own `no_speech_prob` and `avg_logprob`. A bed whose every segment
says "no speech" at high probability has no word in it however the decoder
chose to fill the line. Both readings go in the report; the empty-transcript
verdict is kept as-is and NOT redefined here, because the acceptance bar is
the Director's and the lead's to move, not the builder's.

This runs under the voice worker's interpreter, which is where faster-whisper
lives on this rig (`scripts/voice.mjs`: VOICE_PYTHON, else `.venv`):

  .venv/Scripts/python.exe scripts/beds/words.py --cabinet ghost
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys

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
#: voice there, whatever text the decoder went on to write.
NO_SPEECH_FLOOR = 0.5


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cabinet", default="ghost", choices=sorted(CABINETS))
    ap.add_argument("--device", default="auto")
    ap.add_argument(
        "--dir",
        default="",
        help="read from this folder instead of the cabinet's installed tracks",
    )
    args = ap.parse_args()
    tracks, evidence, keys = CABINETS[args.cabinet]
    suffix = ".mp3"
    if args.dir:
        tracks = pathlib.Path(args.dir)
        suffix = ".flac" if any(tracks.glob("*.flac")) else ".mp3"

    from faster_whisper import WhisperModel

    device = args.device
    if device == "auto":
        try:
            import ctranslate2

            device = "cuda" if ctranslate2.get_cuda_device_count() > 0 else "cpu"
        except Exception:
            device = "cpu"
    model = WhisperModel(MODEL, device=device, compute_type="float16" if device == "cuda" else "int8")

    rows, misses = [], []
    for key in keys:
        path = tracks / f"{key}{suffix}"
        segments, info = model.transcribe(
            str(path), beam_size=BEAM, language="en", vad_filter=False
        )
        segs = list(segments)
        text = "".join(s.text for s in segs).strip()
        no_speech = [float(s.no_speech_prob) for s in segs]
        logprob = [float(s.avg_logprob) for s in segs]
        row = {
            "key": key,
            "characters": len(text),
            "text": text,
            "segments": len(segs),
            "min_no_speech_prob": round(min(no_speech), 4) if no_speech else None,
            "mean_no_speech_prob": round(sum(no_speech) / len(no_speech), 4) if no_speech else None,
            "max_avg_logprob": round(max(logprob), 3) if logprob else None,
            # Whisper's own reading: not one segment believes it heard speech.
            "no_speech_everywhere": bool(no_speech) and min(no_speech) >= NO_SPEECH_FLOOR,
        }
        rows.append(row)
        if text == "":
            mark = "clean"
        elif row["no_speech_everywhere"]:
            mark = f"no speech (p>={NO_SPEECH_FLOOR}) but decoded {text[:60]!r}"
        else:
            mark = f"WORD: {text[:90]!r} (min no_speech {row['min_no_speech_prob']})"
        print(f"  {key:12} {info.duration:7.2f}s  {mark}")
        if text != "":
            misses.append(key)

    report = {
        "cabinet": args.cabinet,
        "model": f"faster-whisper {MODEL}",
        "device": device,
        "beam_size": BEAM,
        "vad_filter": False,
        "language": "en",
        "read_from": str(tracks).replace("\\", "/"),
        "beds": rows,
        "no_speech_floor": NO_SPEECH_FLOOR,
        "misses": misses,
        "misses_with_speech": [
            r["key"] for r in rows if r["text"] != "" and not r["no_speech_everywhere"]
        ],
    }
    name = "words-report.json" if not args.dir else f"words-report-{pathlib.Path(args.dir).name}.json"
    out = evidence / name
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=1), encoding="utf-8")
    print(f"report -> {out}")
    if misses:
        print(f"REFUSED: {', '.join(misses)} transcribed a word", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
