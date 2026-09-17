#!/usr/bin/env python
"""Measure three encodings on one finished bed, then install the set.

Decision 5 of `docs/music.kickoff.md`: weight is a decision, not a side effect.
This script encodes ONE mastered bed three ways (MP3 128k, MP3 96k, Opus 96k),
prints the sizes and the projected total for the whole set, and writes the
numbers into the receipt so the Director picks the format from figures rather
than from a guess.

No ffmpeg is on this rig's PATH and none is needed: libsndfile writes both MP3
and Ogg Opus. Neither format's bitrate is a number you pass — libsndfile takes
a `compression_level` from 0 to 1 and lands on a rung — so the script searches
for the rung that gives the bitrate asked for and refuses if it cannot find it
within a per cent. The rungs it finds are recorded beside the sizes.

Installing is separate and deliberate: `--install` writes the mastered beds to
the cabinet's own track paths as MP3 128k, the format the shell, the pack gate
and the release check all name today. Changing the shipped format is code in
three places and is not this script's to do.

`--only` installs a subset. It does NOT re-run the three-way trial: the format
decision is the set's and was measured once, so a partial run reads the rung
back out of `encoding-report.json` and encodes with it, byte-for-byte the same
compressor setting the rest of the set shipped on. Its rows are merged into the
report rather than replacing it.

Usage:
  python scripts/beds/encode.py                 # measure only
  python scripts/beds/encode.py --install       # measure, then install 128k
  python scripts/beds/encode.py --install --only menu,doorman
"""

from __future__ import annotations

import argparse
import json
import pathlib

import numpy as np
import soundfile as sf

REPO = pathlib.Path(__file__).resolve().parents[2]

CABINETS = {
    "ghost": {
        "evidence": REPO / "docs" / "art" / "originals-ghost-beds",
        "install": REPO / "apps" / "cabinets" / "public" / "tracks",
        "keys": ["inspect", "poison", "rug", "unlisted", "breather", "whisperer", "menu", "doorman"],
    },
    "vibe": {
        "evidence": REPO / "docs" / "art" / "originals-vibe-beds-2min",
        "install": REPO / "apps" / "cabinets" / "public" / "vibe" / "tracks",
        "keys": ["bash", "csharp", "java", "javascript", "python", "sql", "integration"],
    },
}

#: The three the brief asks for, as (label, libsndfile format, subtype, kbps).
TRIALS = [
    ("mp3_128k", "MP3", "MPEG_LAYER_III", 128),
    ("mp3_96k", "MP3", "MPEG_LAYER_III", 96),
    ("opus_96k", "OGG", "OPUS", 96),
]
SHIPPED = ("MP3", "MPEG_LAYER_III", 128)


class Refused(Exception):
    pass


def write_at(path: pathlib.Path, x: np.ndarray, sr: int, fmt: str, subtype: str, level: float) -> int:
    kw = {"compression_level": level}
    if fmt == "MP3":
        kw["bitrate_mode"] = "CONSTANT"
    sf.write(path, x, sr, format=fmt, subtype=subtype, **kw)
    return path.stat().st_size


def rung_for(x: np.ndarray, sr: int, fmt: str, subtype: str, kbps: int, scratch: pathlib.Path) -> float:
    """The compression_level that lands on `kbps`, by bisection, or Refused."""
    seconds = x.shape[0] / sr
    lo, hi = 0.0, 0.99
    best, best_err = None, 1e9
    probe = scratch / f"probe.{'mp3' if fmt == 'MP3' else 'opus'}"
    for _ in range(24):
        mid = (lo + hi) / 2
        got = write_at(probe, x, sr, fmt, subtype, mid) * 8 / seconds / 1000
        err = abs(got - kbps) / kbps
        if err < best_err:
            best, best_err = mid, err
        if got > kbps:
            lo = mid
        else:
            hi = mid
    probe.unlink(missing_ok=True)
    if best_err > 0.01:
        raise Refused(
            f"libsndfile has no {fmt}/{subtype} rung within one per cent of "
            f"{kbps} kbps (closest was {best_err * 100:.1f} per cent off)"
        )
    return best


def _report(
    cabinet: str,
    conf: dict,
    mastered: pathlib.Path,
    keys: list[str],
    lengths: dict,
    pick: str,
    total_seconds: float,
    trials: list,
    install: bool,
    only: list[str] | None,
    previous: dict,
) -> dict:
    """The report, and the install when asked for it.

    `shipped_today_bytes` is read before anything is written, so it is still
    the weight of what is on disk from the last release even on a partial run.
    """
    report = {
        "cabinet": cabinet,
        "measured_on": pick,
        "measured_seconds": round(lengths[pick], 3),
        "set_seconds": round(total_seconds, 3),
        "set_count": len(keys),
        "shipped_today_bytes": previous.get(
            "shipped_today_bytes",
            sum(
                (conf["install"] / f"{k}.mp3").stat().st_size
                for k in keys
                if (conf["install"] / f"{k}.mp3").exists()
            ),
        ),
        "trials": trials,
        "installed": None,
    }
    if not install:
        return report

    fmt, subtype, kbps = SHIPPED
    level = next(t["compression_level"] for t in trials if t["asked_kbps"] == kbps and t["format"] == fmt)
    written = {}
    for key in only or keys:
        y, s = sf.read(mastered / f"{key}.flac", always_2d=True, dtype="float64")
        dest = conf["install"] / f"{key}.mp3"
        size = write_at(dest, y, s, fmt, subtype, level)
        written[key] = {"key": key, "bytes": size, "seconds": round(y.shape[0] / s, 3)}
        print(f"  installed {dest.relative_to(REPO)}  {size / 1024:8.1f} KB")
    # A partial run keeps the rows it did not touch, and the total is read off
    # the files on disk so it is the real weight of the folder either way.
    old = {r["key"]: r for r in (previous.get("installed") or {}).get("beds", [])}
    rows = [written.get(k, old[k]) for k in keys if k in written or k in old]
    total = sum(
        (conf["install"] / f"{k}.mp3").stat().st_size
        for k in keys
        if (conf["install"] / f"{k}.mp3").exists()
    )
    report["installed"] = {
        "format": "MP3 128k constant",
        "compression_level": round(level, 4),
        "installed_now": sorted(written),
        "beds": rows,
        "total_bytes": total,
        "total_mb": round(total / 1e6, 2),
        "delta_bytes": total - report["shipped_today_bytes"],
    }
    return report


def measure(cabinet: str, install: bool, only: list[str] | None = None) -> dict:
    conf = CABINETS[cabinet]
    mastered = conf["evidence"] / "mastered"
    scratch = conf["evidence"] / "encodings"
    scratch.mkdir(parents=True, exist_ok=True)
    keys = conf["keys"]
    report_path = conf["evidence"] / "encoding-report.json"
    previous = json.loads(report_path.read_text(encoding="utf-8")) if report_path.exists() else {}

    files = [mastered / f"{k}.flac" for k in keys]
    missing = [str(f) for f in files if not f.exists()]
    if missing:
        raise Refused(f"no mastered bed at {missing[0]}")

    # The bed measured is the one whose length is nearest the set's median, so
    # the projection is not anchored on the longest or the shortest.
    lengths = {k: sf.info(mastered / f"{k}.flac").duration for k in keys}
    median = float(np.median(list(lengths.values())))
    pick = min(keys, key=lambda k: abs(lengths[k] - median))
    total_seconds = float(sum(lengths.values()))

    if only:
        # A partial run does not re-open the format decision. The rungs come
        # back out of the report the full run wrote, so the beds re-encoded
        # today carry the same compressor setting as the ones that are not.
        trials = previous.get("trials")
        if not trials:
            raise Refused(f"--only needs the rungs from a full run; none in {report_path}")
        pick = previous.get("measured_on", pick)
        print(f"  rungs read back from {report_path.name}, measured on {pick}")
        return _report(
            cabinet, conf, mastered, keys, lengths, pick, total_seconds, trials,
            install, only, previous,
        )

    x, sr = sf.read(mastered / f"{pick}.flac", always_2d=True, dtype="float64")
    trials = []
    for label, fmt, subtype, kbps in TRIALS:
        level = rung_for(x, sr, fmt, subtype, kbps, scratch)
        ext = "mp3" if fmt == "MP3" else "opus"
        out = scratch / f"{pick}.{label}.{ext}"
        size = write_at(out, x, sr, fmt, subtype, level)
        measured_kbps = size * 8 / lengths[pick] / 1000
        trials.append(
            {
                "label": label,
                "format": fmt,
                "subtype": subtype,
                "asked_kbps": kbps,
                "compression_level": round(level, 4),
                "measured_kbps": round(measured_kbps, 1),
                "bytes": size,
                "kb": round(size / 1024, 1),
                "projected_set_bytes": int(round(measured_kbps * 1000 / 8 * total_seconds)),
                "projected_set_mb": round(measured_kbps * 1000 / 8 * total_seconds / 1e6, 2),
                "file": str(out.relative_to(REPO)).replace("\\", "/"),
            }
        )
        print(
            f"  {label:9} cl={level:.4f}  {measured_kbps:6.1f} kbps  "
            f"{size / 1024:8.1f} KB for {pick}  "
            f"{trials[-1]['projected_set_mb']:6.2f} MB for the {len(keys)}"
        )

    return _report(
        cabinet, conf, mastered, keys, lengths, pick, total_seconds, trials,
        install, None, previous,
    )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cabinet", default="ghost", choices=sorted(CABINETS))
    ap.add_argument("--install", action="store_true")
    ap.add_argument("--only", default="", help="comma-separated bed keys to install")
    args = ap.parse_args()
    only = [k for k in args.only.split(",") if k] or None

    print(f"{args.cabinet}: three encodings on the bed nearest the median length")
    report = measure(args.cabinet, args.install, only)
    out = CABINETS[args.cabinet]["evidence"] / "encoding-report.json"
    out.write_text(json.dumps(report, indent=1), encoding="utf-8")
    print(f"report -> {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
