#!/usr/bin/env python
"""Master the arranged Ghost beds to the level the current beds already sit at.

Route M1, step three (`docs/music.kickoff.md`, decision 3). The eight beds the
Director already likes are measured FIRST — integrated loudness to BS.1770 via
pyloudnorm, and true peak by four-times oversampling — and their MEDIAN
loudness is where the target starts. Nothing here is a taste judgement: the
target is read off the files that are shipping today.

It does not always end there, and the reason is measured. The eight beds
shipping today are CLIPPED — true peak runs from -1.39 to +1.52 dBTP, so they
buy their loudness by running into the ceiling. Asked for that same loudness
under a -1 dBTP ceiling, three of the eight would need 6 to 9 dB of limiting,
which is not gentle and is not what the brief asked for. So the script first
asks each bed how loud it can get under MAX_REDUCTION_DB of limiting, and the
target is the quieter of the originals' median and the quietest of those
answers. The whole set moves together, the spread stays inside the tolerance,
and the shortfall against the originals is recorded rather than hidden. The
shell plays beds at BED_LEVEL (0.32) anyway, so what matters is that the eight
match each other; `BED_LEVEL` is not this slice's to change.

Then, per arranged piece:

  * gain to the target integrated loudness,
  * a gentle look-ahead limiter holding true peak under the ceiling,
  * a loop-safe fade at head and tail, so a piece that outlasts its wave
    wraps round without a click.

The limiter is a smoothed gain envelope with the attack ahead of the peak it
holds, not a clipper: it looks LOOK_AHEAD_MS forward, takes the reduction it
needs, and releases over RELEASE_MS. A tanh clip would have been half the code
and would have cost about half a decibel of the measured target, which is what
the Vibe bed batch recorded; this keeps the measurement honest instead.

PER-KEY OVERRIDES. The paragraph above is how the SET's target is found, and it
is still how every wave bed is mastered. `TARGET_OVERRIDES` names beds that are
deliberately not part of that answer: Ghost's three boss beds sit two LU over
the set, because the boss music did not read as a boss over the game. An
overridden bed also takes a tighter limiter budget
(`OVERRIDE_MAX_REDUCTION_DB`), since buying two LU with heavy limiting would
swap a quiet piece for a flat one; a bed that cannot reach its target inside
that budget is mastered to the loudest it reaches cleanly and the shortfall is
recorded rather than squashed or refused.

A run with `--only` merges its rows into `master-report.json` instead of
replacing the file.

Usage: python scripts/beds/master.py [--only key,key]
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy.signal import lfilter

REPO = pathlib.Path(__file__).resolve().parents[2]

#: Per cabinet: where the evidence lives, and the beds whose loudness sets the
#: target. The reference is always the mp3 that ships today, whatever the
#: arrangement was built from.
CABINETS = {
    "ghost": {
        "evidence": REPO / "docs" / "art" / "originals-ghost-beds",
        "keys": ["inspect", "poison", "rug", "unlisted", "breather", "whisperer", "menu", "doorman"],
    },
    "vibe": {
        "evidence": REPO / "docs" / "art" / "originals-vibe-beds-2min",
        "keys": ["bash", "csharp", "java", "javascript", "python", "sql", "integration"],
    },
}

#: True-peak ceiling, dBTP. The shell plays beds at BED_LEVEL (0.32) under
#: shots, so this is headroom for the decoder, not for the mix.
CEILING_DBTP = -1.0
#: The limiter. Look-ahead is the window the gain envelope is smoothed over
#: before a peak; release is how long it takes to let go afterwards.
LOOK_AHEAD_MS = 5.0
RELEASE_MS = 120.0
#: Loop-safe fade at head and tail (decision 3: a piece that outlasts its wave
#: still loops without a click).
LOOP_FADE_MS = 30.0
#: How far a mastered bed may sit from the target before the script refuses.
LOUDNESS_TOLERANCE_LU = 0.5
#: Gain and limiting interact — holding the ceiling costs loudness, and the
#: loss is not the same on a piece with an intro and a breakdown as it is on a
#: loop — so the gain is solved for rather than computed once. These are the
#: number of passes and the most reduction a pass may take before the bed is
#: refused as `cannot reach the target under a gentle limiter`.
MAX_PASSES = 8
MAX_REDUCTION_DB = 6.0
OVERSAMPLE = 4
#: Beds mastered to their own number instead of the set's, by cabinet and key.
#: Ghost's three boss beds: -10.6 LUFS, two LU over the set's -12.62.
TARGET_OVERRIDES = {
    "ghost": {"whisperer": -10.6, "menu": -10.6, "doorman": -10.6},
    "vibe": {},
}
#: The limiter budget an overridden bed may spend. Tighter than the set's, on
#: purpose: the point of the override is presence, not density.
OVERRIDE_MAX_REDUCTION_DB = 3.0


class Refused(Exception):
    """A bed the script will not write, with the reason in the message."""


def read(path: pathlib.Path) -> tuple[np.ndarray, int]:
    x, sr = sf.read(path, always_2d=True, dtype="float64")
    return x, sr


def true_peak_db(x: np.ndarray, sr: int) -> float:
    """Peak of the signal reconstructed between samples, by linear upsample."""
    n = x.shape[0]
    src = np.arange(n)
    dst = np.arange(n * OVERSAMPLE) / OVERSAMPLE
    peak = 0.0
    for c in range(x.shape[1]):
        peak = max(peak, float(np.abs(np.interp(dst, src, x[:, c])).max()))
    return 20 * float(np.log10(max(peak, 1e-12)))


def loudness(x: np.ndarray, sr: int) -> float:
    return float(pyln.Meter(sr).integrated_loudness(x))


def measure(path: pathlib.Path) -> dict:
    x, sr = read(path)
    return {
        "file": str(path.relative_to(REPO)).replace("\\", "/"),
        "seconds": round(x.shape[0] / sr, 3),
        "sample_rate": sr,
        "channels": x.shape[1],
        "lufs": round(loudness(x, sr), 2),
        "sample_peak_dbfs": round(20 * float(np.log10(max(np.abs(x).max(), 1e-12))), 2),
        "true_peak_dbtp": round(true_peak_db(x, sr), 2),
    }


def limit(x: np.ndarray, sr: int, ceiling_db: float) -> tuple[np.ndarray, float]:
    """Hold true peak under the ceiling with a smoothed look-ahead gain."""
    ceiling = 10.0 ** (ceiling_db / 20.0)
    look = max(1, int(sr * LOOK_AHEAD_MS / 1000.0))
    rel = max(1, int(sr * RELEASE_MS / 1000.0))

    env = np.abs(x).max(axis=1)
    # The gain each sample needs, then the running minimum over the look-ahead
    # window ahead of it, so the reduction arrives before the peak does.
    need = np.minimum(1.0, ceiling / np.maximum(env, 1e-12))
    pad = np.concatenate([need, np.ones(look)])
    ahead = np.ones_like(need)
    win = np.lib.stride_tricks.sliding_window_view(pad, look + 1)
    ahead[:] = win.min(axis=1)[: len(need)]

    # Attack over the look-ahead (a raised-cosine smooth), release one-pole.
    # The envelope is padded with ones before the smooth: convolving `same`
    # against a zero pad would invent a deep dip at the first and last samples
    # and report it as the limiter's reduction. The release is an IIR rather
    # than a sample loop because these pieces are six million samples long.
    k = np.hanning(2 * look + 1)[: look + 1]
    k = k / k.sum()
    edge = len(k) // 2 + 1
    padded = np.concatenate([np.ones(edge), ahead, np.ones(edge)])
    smooth = np.convolve(padded, k, mode="same")[edge: edge + len(ahead)]
    coeff = np.exp(-1.0 / rel)
    # zi is the filter's steady state for an input of 1, so the envelope opens
    # at unity gain instead of climbing out of a hole at the first sample.
    released = lfilter([1 - coeff], [1.0, -coeff], ahead, zi=[coeff])[0]
    # Never above what the ceiling needs: `ahead` is already the running
    # minimum over the look-ahead window, so this both smooths and holds.
    out_gain = np.minimum(ahead, np.minimum(smooth, released))
    y = x * out_gain[:, None]
    return y, round(20 * float(np.log10(max(out_gain.min(), 1e-12))), 2)


def loop_fade(x: np.ndarray, sr: int) -> np.ndarray:
    n = max(1, int(sr * LOOP_FADE_MS / 1000.0))
    # Never zero: on a clip under four samples `x[-0:]` is the whole array
    # against an empty ramp, a broadcast error (Kimi's music review, point six).
    n = max(1, min(n, x.shape[0] // 4))
    ramp = np.linspace(0.0, 1.0, n)[:, None]
    x[:n] *= ramp
    x[-n:] *= ramp[::-1]
    return x


def reachable_lufs(
    raw: np.ndarray, sr: int, base_lufs: float, budget: float = MAX_REDUCTION_DB
) -> float:
    """The loudest this piece gets while the limiter stays under its budget."""
    lo, hi = 0.0, 24.0
    best = base_lufs
    for _ in range(12):
        mid = (lo + hi) / 2
        y, reduction = limit(raw * (10.0 ** (mid / 20.0)), sr, CEILING_DBTP)
        if reduction < -budget:
            hi = mid
        else:
            lo = mid
            best = loudness(y, sr)
    return best


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cabinet", default="ghost", choices=sorted(CABINETS))
    ap.add_argument("--only", default="", help="comma-separated bed keys")
    args = ap.parse_args()
    conf = CABINETS[args.cabinet]
    KEYS = conf["keys"]
    EVIDENCE = conf["evidence"]
    ORIGINALS = EVIDENCE / "originals"
    ARRANGED = EVIDENCE / "arranged"
    MASTERED = EVIDENCE / "mastered"
    keys = [k for k in (args.only.split(",") if args.only else KEYS) if k]
    overrides = TARGET_OVERRIDES.get(args.cabinet, {})

    before = {k: measure(ORIGINALS / f"{k}.mp3") for k in KEYS}
    median_today = float(np.median([before[k]["lufs"] for k in KEYS]))
    print(f"the {len(KEYS)} beds shipping today: median {median_today:.2f} LUFS")

    sources = {}
    reach = {}
    for key in KEYS:
        src = ARRANGED / f"{key}.flac"
        if not src.exists():
            continue
        raw, sr = read(src)
        sources[key] = (raw, sr, loudness(raw, sr))
        reach[key] = reachable_lufs(raw, sr, sources[key][2])
        print(f"  {key:10} arranged {sources[key][2]:7.2f} LUFS, reaches {reach[key]:7.2f} gently")
    target = min(median_today, min(reach.values())) if reach else median_today
    print(f"target {target:.2f} LUFS ({target - median_today:+.2f} LU against today's median)")

    MASTERED.mkdir(parents=True, exist_ok=True)
    rows, refused = [], []
    for key in keys:
        if key not in sources:
            refused.append({"key": key, "refused": f"no arranged piece at {ARRANGED / (key + '.flac')}"})
            continue
        raw, sr, pre_lufs = sources[key]
        # An overridden bed is mastered to its own number under its own
        # limiter budget, and is capped at what that budget actually reaches:
        # asking for two LU the piece cannot give would either fail the
        # tolerance check or buy the number with limiting the override exists
        # to avoid. The shortfall, when there is one, goes in the row.
        budget = OVERRIDE_MAX_REDUCTION_DB if key in overrides else MAX_REDUCTION_DB
        asked = overrides.get(key, target)
        gently = (
            reachable_lufs(raw, sr, pre_lufs, budget) if key in overrides else reach[key]
        )
        key_target = min(asked, gently)
        gain_db = key_target - pre_lufs
        passes = 0
        for passes in range(1, MAX_PASSES + 1):
            x, reduction_db = limit(raw * (10.0 ** (gain_db / 20.0)), sr, CEILING_DBTP)
            got = loudness(x, sr)
            if abs(got - key_target) <= LOUDNESS_TOLERANCE_LU / 2:
                break
            gain_db += key_target - got
        if reduction_db < -budget:
            refused.append(
                {
                    "key": key,
                    "refused": f"reaching {key_target:.2f} LUFS needs {-reduction_db:.2f} dB of "
                    f"limiting, past the {budget} dB a gentle limiter may take",
                }
            )
            print(f"REFUSED {key}: {refused[-1]['refused']}", file=sys.stderr)
            continue
        x = loop_fade(x, sr)

        out = MASTERED / f"{key}.flac"
        sf.write(out, x, sr, subtype="PCM_24")
        after = measure(out)
        if abs(after["lufs"] - key_target) > LOUDNESS_TOLERANCE_LU:
            refused.append(
                {
                    "key": key,
                    "refused": f"mastered to {after['lufs']:.2f} LUFS, "
                    f"more than {LOUDNESS_TOLERANCE_LU} LU from the target {key_target:.2f}",
                }
            )
            print(f"REFUSED {key}: {refused[-1]['refused']}", file=sys.stderr)
            continue
        if after["true_peak_dbtp"] > CEILING_DBTP + 0.1:
            refused.append(
                {"key": key, "refused": f"true peak {after['true_peak_dbtp']:.2f} dBTP over the ceiling"}
            )
            print(f"REFUSED {key}: {refused[-1]['refused']}", file=sys.stderr)
            continue

        rows.append(
            {
                "key": key,
                "before": before[key],
                "arranged_lufs": round(pre_lufs, 2),
                "after": after,
                "target_lufs": round(key_target, 2),
                "target_asked_lufs": round(asked, 2),
                "target_shortfall_lu": round(key_target - asked, 2),
                "target_source": "override" if key in overrides else "set",
                "max_reduction_budget_db": budget,
                "gain_db": round(gain_db, 2),
                "passes": passes,
                "limiter_max_reduction_db": reduction_db,
                "loop_fade_ms": LOOP_FADE_MS,
            }
        )
        print(
            f"{key:12} {before[key]['lufs']:7.2f} -> {after['lufs']:7.2f} LUFS  "
            f"tp {before[key]['true_peak_dbtp']:6.2f} -> {after['true_peak_dbtp']:6.2f} dBTP  "
            f"{before[key]['seconds']:6.2f} -> {after['seconds']:6.2f} s"
        )

    report = {
        "cabinet": args.cabinet,
        "target_lufs": round(target, 2),
        "median_lufs_today": round(median_today, 2),
        "target_overrides_lufs": overrides,
        "override_max_reduction_db": OVERRIDE_MAX_REDUCTION_DB,
        "reachable_lufs": {k: round(v, 2) for k, v in reach.items()},
        "max_limiter_reduction_db": MAX_REDUCTION_DB,
        "ceiling_dbtp": CEILING_DBTP,
        "originals": before,
        "beds": rows,
        "refused": refused,
    }
    path = EVIDENCE / "master-report.json"
    # A partial run merges, so re-mastering three beds does not delete the
    # other five's rows from the set's receipt.
    if path.exists() and args.only:
        old = json.loads(path.read_text(encoding="utf-8"))
        fresh = {r["key"]: r for r in rows}
        touched = set(fresh) | {r["key"] for r in refused}
        merged = []
        for row in old.get("beds", []):
            if row["key"] in fresh:
                merged.append(fresh.pop(row["key"]))
            elif row["key"] not in touched:
                merged.append(row)
        report["beds"] = merged + [r for r in rows if r["key"] in fresh]
        report["refused"] = [
            r for r in old.get("refused", []) if r["key"] not in touched
        ] + refused
        # The set's own numbers stay as the full run measured them; a partial
        # run has not re-derived them for the beds it did not touch.
        for field in ("target_lufs", "median_lufs_today"):
            if field in old:
                report[field] = old[field]
        report["reachable_lufs"] = {**old.get("reachable_lufs", {}), **report["reachable_lufs"]}
    path.write_text(json.dumps(report, indent=1), encoding="utf-8")
    print(f"report -> {path}")
    return 1 if refused else 0


if __name__ == "__main__":
    raise SystemExit(main())
