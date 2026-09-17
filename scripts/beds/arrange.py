#!/usr/bin/env python
"""Build a two-minute piece for each Ghost bed out of that bed's own material.

Route M1, step two (`docs/music.kickoff.md`). Step one split each bed into
four stems on Comfy Cloud with htdemucs; this script reads those stems and the
original mp3 and writes one 48 kHz flac a bed under
`docs/art/originals-ghost-beds/arranged/`. Nothing is generated here: every
sample in the result came out of a file the Director already liked.

THE TWO SHAPES. `--shape` picks one; `auto` (the default) reads the per-cabinet
`loop_keys` table below, which names the beds that take the second shape.

`sections` — the wave beds:

    intro (4 bars, the quiet layer)
    the full loop
    breakdown (8 or 16 bars, the quiet layer)
    the full loop
    outro (4 bars, the quiet layer, fading)

`the full loop` is the ORIGINAL mp3, not the sum of the stems, because a
separator's residue is audible and the loop is the part the player hears most.
The stems are used only where a layer has to be taken away.

`loop` — the boss beds (`whisperer`, `menu`, `doorman`):

    the loop, end to end, until the piece is 110-130 s

Nothing else. No intro, no breakdown, no outro, no quiet layer: the boss beds
opened on a near-empty intro and carried a thin section in the middle, and the
decision is that a boss bed has no thin part anywhere. Only the original mp3 is
read, never a stem sum, and the seam rule is the one the other shape uses — one
beat of equal-power crossfade at every join.

The originals do NOT seam cleanly, and this is measured rather than assumed.
Each of the three is a 40.000 s file whose music stops early and whose tail is
digital silence: `whisperer` stops at 32.65 s, `menu` at 35.15 s, `doorman` at
35.85 s (last 50 ms window above -45 dBFS). Repeating the file as delivered
would write that silence into the piece three or four times over, which is the
defect being fixed. So the loop shape trims each copy to the last WHOLE BAR at
or before the music stops, and the one beat of overlap at each seam is read
from the material that follows the trim — the decay tail — so the seam
crossfades real audio into the next copy's downbeat rather than butt-joining
it. How much tail each bed drops is in the receipt.

The piece is a whole number of bars and ends on a bar line. Whole copies are
preferred when a whole number of them lands inside the window; otherwise the
last copy is cut short at a bar line. No fade is written here: the piece ends
where a bar ends, and `master.py`'s 30 ms loop-safe fade covers the join.

Two measured facts shape the code, and both are recorded in the receipt:

1. There is no drum layer in this material to take away. htdemucs leaves the
   drums stem at -64 to -79 dBFS RMS, 50 to 60 dB under the mix, on all eight
   beds; the percussion is synthetic noise written into the same synth parts
   as the melody, so a separator has nothing to pull out. A median-filter
   HPSS over `other` was measured too and removed only about a quarter of the
   spectral flux for a 3 dB hole in the part, which is not a breakdown either.
   So the section the brief calls `a breakdown without drums` is built as
   what it is here: the quiet layer, which is the bass stem plus the vocals
   stem (which holds a second melodic line, not a voice), trimmed by a
   constant so the drop reads on every bed. Flux ratio and level against the
   full loop are measured per bed and go in the receipt; the honest claim is
   a thinner, quieter section, not a drum-free one.
2. Every loop divides into a whole number of bars in 4/4 at a plausible tempo.
   Two independent estimators agree on all eight: the dominant period of the
   onset autocorrelation (folded into 70-150 bpm), and a search over integer
   bar counts scored against the same envelope. The script uses the first and
   refuses when its nearest whole bar count is more than 3 per cent away.

Usage: python scripts/beds/arrange.py [--only key,key] [--shape auto|sections|loop]

A run with `--only` merges its rows into `arrange-plan.json` instead of
replacing the file, so re-cutting three beds does not delete the other five's
receipt.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys

import numpy as np
import soundfile as sf
from scipy.signal import stft

REPO = pathlib.Path(__file__).resolve().parents[2]

#: Both cabinets take the same pass. They differ in where the material lives
#: and in whether the tempo is known: Ghost's beds are loops of whole seconds
#: whose tempo has to be measured, while Vibe Typer's are receipted at 96 bpm
#: (`docs/art/receipts.json -> vibe_typer_beds`). The installed Vibe mp3 is a
#: flat 38.000 s, which is 15.2 bars at that tempo and so cannot be a loop, so
#: the Vibe source is a whole-bar cut taken from the 52 s master the bed was
#: made from — see `loop-cut.json` beside it.
CABINETS = {
    "ghost": {
        "evidence": REPO / "docs" / "art" / "originals-ghost-beds",
        "source": ("originals", ".mp3"),
        "bpm": None,
        "keys": ["inspect", "poison", "rug", "unlisted", "breather", "whisperer", "menu", "doorman"],
        #: The boss beds. `--shape auto` gives these the loop shape and every
        #: other key the section shape.
        "loop_keys": ["whisperer", "menu", "doorman"],
    },
    "vibe": {
        "evidence": REPO / "docs" / "art" / "originals-vibe-beds-2min",
        "source": ("loops", ".flac"),
        "bpm": 96.0,
        "keys": ["bash", "csharp", "java", "javascript", "python", "sql", "integration"],
        "loop_keys": [],
    },
}

# --- the plan's constants ------------------------------------------------- #
OUT_SR = 48_000
BEATS_PER_BAR = 4
INTRO_BARS = 4
OUTRO_BARS = 4
BREAKDOWN_BARS = 8
#: The quiet layer is set this far under the full loop, rather than trimmed by
#: a fixed amount, because the stems do not sit at the same place on every
#: bed: untrimmed, `poison` lands 1.3 dB under its loop (no section change is
#: heard) and `whisperer`, whose second melodic stem is all but empty, lands
#: 16.5 dB under (a hole, not a breakdown). Matching the offset makes the drop
#: read the same on all eight. The gain that does it is clamped and recorded.
QUIET_TARGET_DB = -7.0
QUIET_GAIN_CLAMP_DB = 12.0
#: When the base plan lands short of this, the breakdown doubles; still short
#: and a third pass of the loop goes in before the outro. Refuse past that.
TARGET_MIN_S = 110.0
TARGET_MAX_S = 130.0
#: Tempo search window, and how far the nearest whole bar count may sit from
#: the measured tempo before the bed is refused.
BPM_LOW, BPM_HIGH = 70.0, 150.0
BAR_TOLERANCE = 0.03
#: The loop shape. A 50 ms window at or above this level is the music still
#: playing; the last one of those is where a copy is trimmed back to a bar
#: line. -45 dBFS is well under the quietest real bar on any of the three
#: (menu's quiet half sits around -27) and well over their silent tails
#: (-67 and below), and the trim point does not move between -40 and -50.
LOOP_TAIL_FLOOR_DBFS = -45.0
LOOP_TAIL_WINDOW_S = 0.050
#: Where inside the window the loop shape aims, when it has a choice.
LOOP_TARGET_S = 120.0


class Refused(Exception):
    """A bed the script will not arrange, with the reason in the message."""


# --- measurement ----------------------------------------------------------- #

def onset_envelope(mono: np.ndarray, sr: int) -> tuple[np.ndarray, float]:
    """Half-wave-rectified spectral flux, one value per STFT hop."""
    _, t, z = stft(mono, fs=sr, nperseg=1024, noverlap=768)
    mag = np.abs(z)
    flux = np.diff(mag, axis=1)
    flux[flux < 0] = 0.0
    env = flux.sum(axis=0)
    return env - env.mean(), float(t[1] - t[0])


def autocorr(env: np.ndarray) -> np.ndarray:
    ac = np.correlate(env, env, "full")[len(env) - 1:]
    return ac / max(ac[0], 1e-12)


def raw_bpm(mono: np.ndarray, sr: int) -> float:
    """The strongest pulse between 60 and 200 bpm, folded into the window."""
    env, hop = onset_envelope(mono, sr)
    ac = autocorr(env)
    lags = np.arange(len(ac)) * hop
    best, best_i = -np.inf, None
    for i in range(1, len(ac)):
        period = lags[i]
        if period < 60 / 200 or period > 60 / 60:
            continue
        if ac[i] > best:
            best, best_i = ac[i], i
    if best_i is None:
        raise Refused("no pulse between 60 and 200 bpm in the onset envelope")
    bpm = 60 / lags[best_i]
    while bpm < BPM_LOW:
        bpm *= 2
    while bpm > BPM_HIGH:
        bpm /= 2
    return bpm


def bar_grid(mono: np.ndarray, sr: int, known_bpm: float | None = None) -> tuple[int, float, float]:
    """Whole bar count, bpm and bar seconds for a loop, or Refused.

    `known_bpm` is the receipted tempo where there is one; the measurement
    still runs and still has to agree with it inside BAR_TOLERANCE.
    """
    seconds = len(mono) / sr
    measured = known_bpm if known_bpm is not None else raw_bpm(mono, sr)
    ideal = measured * seconds / (60 * BEATS_PER_BAR)
    bars = int(round(ideal))
    if bars < 1:
        raise Refused(f"loop of {seconds:.2f}s holds less than one bar at {measured:.2f} bpm")
    err = abs(ideal - bars) / bars
    if err > BAR_TOLERANCE:
        raise Refused(
            f"{seconds:.2f}s at {measured:.2f} bpm is {ideal:.3f} bars, "
            f"{err * 100:.1f} per cent off the nearest whole count ({bars}); "
            "the loop does not divide into bars and the cuts would drift"
        )
    bpm = bars * 60 * BEATS_PER_BAR / seconds
    return bars, bpm, seconds / bars


# --- the layers ------------------------------------------------------------ #

def read_audio(path: pathlib.Path) -> tuple[np.ndarray, int]:
    x, sr = sf.read(path, always_2d=True, dtype="float64")
    return x, sr


def resample(x: np.ndarray, sr: int, out_sr: int) -> np.ndarray:
    """Linear resample. The beds are 44.1 kHz; the shell's masters are 48 kHz."""
    if sr == out_sr:
        return x
    n_out = int(round(x.shape[0] * out_sr / sr))
    src = np.arange(x.shape[0])
    dst = np.arange(n_out) * sr / out_sr
    return np.stack([np.interp(dst, src, x[:, c]) for c in range(x.shape[1])], axis=1)


def quiet_layer(key: str, sr: int, n: int, loop: np.ndarray, stems: pathlib.Path) -> tuple[np.ndarray, float]:
    """The bass stem plus the second melodic stem, trimmed by a constant.

    `other` is left out on purpose: it is the loudest stem on every bed and it
    carries the busy top, so keeping it leaves the section indistinguishable
    from the loop. See the note at the top about the empty drums stem.
    """
    parts = []
    for name in ("bass", "vocals"):
        x, s = read_audio(stems / key / f"{name}.flac")
        if s != sr:
            x = resample(x, s, sr)
        if x.shape[0] < n:
            x = np.pad(x, ((0, n - x.shape[0]), (0, 0)))
        parts.append(x[:n])
    layer = sum(parts)

    def level(a: np.ndarray) -> float:
        return 20 * float(np.log10(max(np.sqrt((a ** 2).mean()), 1e-9)))

    want = QUIET_TARGET_DB - (level(layer) - level(loop))
    gain_db = float(np.clip(want, -QUIET_GAIN_CLAMP_DB, QUIET_GAIN_CLAMP_DB))
    return layer * (10.0 ** (gain_db / 20.0)), round(gain_db, 2)


# --- assembly -------------------------------------------------------------- #

def tile(src: np.ndarray, start: int, length: int) -> np.ndarray:
    """`length` samples from `src` starting at `start`, wrapping round the loop."""
    idx = (np.arange(length) + start) % src.shape[0]
    return src[idx]


def splice(pieces: list[np.ndarray], fade: int) -> np.ndarray:
    """Join with an equal-power crossfade of `fade` samples at every seam."""
    t = (np.arange(fade) + 0.5) / fade
    up, down = np.sin(t * np.pi / 2)[:, None], np.cos(t * np.pi / 2)[:, None]
    out = pieces[0]
    for nxt in pieces[1:]:
        head, tail = out[:-fade], out[-fade:]
        out = np.concatenate([head, tail * down + nxt[:fade] * up, nxt[fade:]])
    return out


def plan_for(bars: int, bar_s: float, loop_s: float) -> tuple[list[tuple[str, int]], int]:
    """The section list, grown deterministically until it clears 110 seconds."""
    breakdown = BREAKDOWN_BARS
    loops = 2
    for _ in range(4):
        sections = [("intro", INTRO_BARS)]
        for i in range(loops):
            sections.append(("loop", bars))
            if i == 0:
                sections.append(("breakdown", breakdown))
        sections.append(("outro", OUTRO_BARS))
        total = sum(n for _, n in sections) * bar_s
        if total >= TARGET_MIN_S:
            return sections, breakdown
        if breakdown == BREAKDOWN_BARS:
            breakdown *= 2
        else:
            loops += 1
    raise Refused(
        f"a {loop_s:.2f}s loop cannot reach {TARGET_MIN_S:.0f}s inside the plan's shape"
    )


def content_end(mono: np.ndarray, sr: int) -> int:
    """The sample after the last 50 ms window still carrying music."""
    w = max(1, int(LOOP_TAIL_WINDOW_S * sr))
    k = len(mono) // w
    if k < 1:
        raise Refused("the loop is shorter than one measurement window")
    rms = np.sqrt((mono[: k * w].reshape(k, w) ** 2).mean(axis=1))
    loud = np.nonzero(20 * np.log10(rms + 1e-12) > LOOP_TAIL_FLOOR_DBFS)[0]
    if not len(loud):
        raise Refused(f"no 50 ms window above {LOOP_TAIL_FLOOR_DBFS:.0f} dBFS in the loop")
    return int((loud[-1] + 1) * w)


def loop_repeats(trim_bars: int, bar_n: int, sr: int) -> int:
    """Total bars in the piece: whole copies if any fit, else a cut last copy."""
    copy_s = trim_bars * bar_n / sr
    bar_s = bar_n / sr
    whole = [n for n in range(1, 64) if TARGET_MIN_S <= n * copy_s <= TARGET_MAX_S]
    if whole:
        return trim_bars * min(whole, key=lambda n: abs(n * copy_s - LOOP_TARGET_S))
    bars = [b for b in range(1, 4096) if TARGET_MIN_S <= b * bar_s <= TARGET_MAX_S]
    if not bars:
        raise Refused(
            f"a {copy_s:.2f}s copy of {trim_bars} bars cannot reach "
            f"{TARGET_MIN_S:.0f}-{TARGET_MAX_S:.0f}s on a bar line"
        )
    return min(bars, key=lambda b: abs(b * bar_s - LOOP_TARGET_S))


def arrange_loop(key: str, conf: dict) -> dict:
    """The boss shape: the original loop end to end, nothing else."""
    folder, ext = conf["source"]
    mix, sr = read_audio(conf["evidence"] / folder / f"{key}{ext}")
    bars, bpm, bar_s = bar_grid(mix.mean(axis=1), sr, conf["bpm"])
    loop_s = mix.shape[0] / sr

    mix = resample(mix, sr, OUT_SR)
    sr = OUT_SR
    bar_n = int(round(bar_s * sr))
    beat_n = int(round(bar_s * sr / BEATS_PER_BAR))

    # Trim each copy back to the last whole bar the music reaches. What is
    # dropped is the silent tail plus whatever decay sits past that bar line;
    # the one beat of overlap at each seam reads straight on from the trim, so
    # the decay is heard into the next downbeat rather than cut at it.
    end_n = content_end(mix.mean(axis=1), sr)
    trim_bars = max(1, min(bars, end_n // bar_n))
    trim_n = trim_bars * bar_n
    if trim_n + beat_n > mix.shape[0]:
        raise Refused("no material after the trim for the seam's beat of overlap")

    total_bars = loop_repeats(trim_bars, bar_n, sr)
    full, rest = divmod(total_bars, trim_bars)
    counts = [trim_bars] * full + ([rest] if rest else [])

    pieces, order = [], []
    for i, count in enumerate(counts):
        length = count * bar_n + (beat_n if i + 1 < len(counts) else 0)
        pieces.append(tile(mix, 0, length))
        order.append(f"loop:{count}")
    out = splice(pieces, beat_n) if len(pieces) > 1 else pieces[0]

    peak = float(np.abs(out).max())
    if peak > 0.99:
        out = out * (0.99 / peak)

    arranged = conf["evidence"] / "arranged"
    arranged.mkdir(parents=True, exist_ok=True)
    path = arranged / f"{key}.flac"
    sf.write(path, out, sr, subtype="PCM_24")
    seconds = out.shape[0] / sr
    if not TARGET_MIN_S <= seconds <= TARGET_MAX_S:
        raise Refused(f"arranged to {seconds:.2f}s, outside {TARGET_MIN_S:.0f}-{TARGET_MAX_S:.0f}s")

    def window_floor(a: np.ndarray, span: float) -> float:
        w = int(span * sr)
        m = a.mean(axis=1)
        k = len(m) // w
        rms = np.sqrt((m[: k * w].reshape(k, w) ** 2).mean(axis=1))
        return round(float((20 * np.log10(rms + 1e-12)).min()), 2)

    return {
        "key": key,
        "shape": "loop",
        "loop_seconds": round(loop_s, 3),
        "bpm": round(bpm, 2),
        "bars_in_loop": bars,
        "bar_seconds": round(bar_s, 4),
        "sections": order,
        "copies": len(counts),
        "bars_total": total_bars,
        # What the trim found, so a reader can see why the source is not a
        # clean loop and how much of it is never played.
        "content_ends_s": round(end_n / sr, 3),
        "tail_silence_s": round(loop_s - end_n / sr, 3),
        "trimmed_to_bars": trim_bars,
        "trimmed_copy_seconds": round(trim_n / sr, 3),
        "dropped_per_copy_s": round(loop_s - trim_n / sr, 3),
        "seams_clean_without_crossfade": False,
        "seam_source": "the material after the trim, read straight on into the next copy's downbeat",
        "crossfade_beats": 1,
        "crossfade_ms": round(beat_n / sr * 1000, 1),
        "end_fade_ms": 0.0,
        "ends_on_bar_line": True,
        "seconds": round(seconds, 3),
        "sample_rate": sr,
        "peak_before_master": round(peak, 4),
        "window_floor_4s_dbfs": window_floor(out, 4.0),
        "window_floor_1s_dbfs": window_floor(out, 1.0),
        "file": str(path.relative_to(REPO)).replace("\\", "/"),
    }


def arrange(key: str, conf: dict) -> dict:
    folder, ext = conf["source"]
    mix, sr = read_audio(conf["evidence"] / folder / f"{key}{ext}")
    mono = mix.mean(axis=1)
    bars, bpm, bar_s = bar_grid(mono, sr, conf["bpm"])
    loop_s = mix.shape[0] / sr

    mix = resample(mix, sr, OUT_SR)
    quiet, quiet_gain_db = quiet_layer(key, OUT_SR, mix.shape[0], mix, conf["evidence"] / "stems")
    sr = OUT_SR
    bar_n = int(round(bar_s * sr))
    beat_n = int(round(bar_s * sr / BEATS_PER_BAR))

    sections, breakdown = plan_for(bars, bar_s, loop_s)
    # The breakdown opens on the bar where the quiet layer is strongest, not
    # on bar one. `whisperer` keeps almost nothing in its second melodic stem
    # over its opening bars, and starting there gave a 17 dB hole where the
    # brief asks for a section.
    bar_rms = [
        float(np.sqrt((quiet[b * bar_n:(b + 1) * bar_n] ** 2).mean()))
        for b in range(bars)
    ]
    loudest_bar = int(np.argmax(bar_rms))
    # Every seam eats one beat of overlap, so each piece carries a beat extra.
    pieces, order = [], []
    for i, (name, count) in enumerate(sections):
        length = count * bar_n + (beat_n if i + 1 < len(sections) else 0)
        if name == "loop":
            pieces.append(tile(mix, 0, length))
        elif name == "intro":
            # the last bars of the quiet layer, so the loop arrives on a downbeat
            pieces.append(tile(quiet, mix.shape[0] - count * bar_n, length))
        elif name == "breakdown":
            pieces.append(tile(quiet, loudest_bar * bar_n, length))
        else:
            pieces.append(tile(quiet, 0, length))
        order.append(f"{name}:{count}")

    out = splice(pieces, beat_n)
    # The intro comes up and the outro goes down over their own bars.
    ramp = min(INTRO_BARS * bar_n, out.shape[0] // 4)
    out[:ramp] *= np.linspace(0.0, 1.0, ramp)[:, None] ** 0.5
    out[-ramp:] *= np.linspace(1.0, 0.0, ramp)[:, None] ** 0.5

    # What the breakdown actually does, measured against the first full loop:
    # the level it drops and the share of spectral flux it keeps.
    def flux(a: np.ndarray) -> float:
        _, _, z = stft(a.mean(axis=1), fs=sr, nperseg=1024, noverlap=768)
        mag = np.abs(z)
        d = np.diff(mag, axis=1)
        d[d < 0] = 0.0
        return float(d.sum() / max(mag.sum(), 1e-9))

    def level(a: np.ndarray) -> float:
        return 20 * float(np.log10(max(np.sqrt((a ** 2).mean()), 1e-9)))

    loop_a = out[INTRO_BARS * bar_n: (INTRO_BARS + bars) * bar_n]
    brk_a = out[(INTRO_BARS + bars) * bar_n: (INTRO_BARS + bars + breakdown) * bar_n]

    peak = float(np.abs(out).max())
    if peak > 0.99:
        out = out * (0.99 / peak)

    arranged = conf["evidence"] / "arranged"
    arranged.mkdir(parents=True, exist_ok=True)
    path = arranged / f"{key}.flac"
    sf.write(path, out, sr, subtype="PCM_24")
    seconds = out.shape[0] / sr
    if not TARGET_MIN_S <= seconds <= TARGET_MAX_S:
        raise Refused(f"arranged to {seconds:.2f}s, outside {TARGET_MIN_S:.0f}-{TARGET_MAX_S:.0f}s")
    return {
        "key": key,
        "shape": "sections",
        "loop_seconds": round(loop_s, 3),
        "bpm": round(bpm, 2),
        "bars_in_loop": bars,
        "bar_seconds": round(bar_s, 4),
        "sections": order,
        "breakdown_bars": breakdown,
        "crossfade_beats": 1,
        "crossfade_ms": round(beat_n / sr * 1000, 1),
        "seconds": round(seconds, 3),
        "sample_rate": sr,
        "peak_before_master": round(peak, 4),
        "quiet_layer_gain_db": quiet_gain_db,
        "breakdown_starts_at_bar": loudest_bar,
        "breakdown_level_vs_loop_db": round(level(brk_a) - level(loop_a), 2),
        "breakdown_flux_ratio": round(flux(brk_a) / max(flux(loop_a), 1e-9), 3),
        "file": str(path.relative_to(REPO)).replace("\\", "/"),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cabinet", default="ghost", choices=sorted(CABINETS))
    ap.add_argument("--only", default="", help="comma-separated bed keys")
    ap.add_argument(
        "--shape",
        default="auto",
        choices=("auto", "sections", "loop"),
        help="auto reads the cabinet's loop_keys table",
    )
    args = ap.parse_args()
    conf = CABINETS[args.cabinet]
    keys = [k for k in (args.only.split(",") if args.only else conf["keys"]) if k]

    rows, refused = [], []
    for key in keys:
        shape = args.shape
        if shape == "auto":
            shape = "loop" if key in conf["loop_keys"] else "sections"
        try:
            row = arrange_loop(key, conf) if shape == "loop" else arrange(key, conf)
        except Refused as err:
            refused.append({"key": key, "refused": str(err)})
            print(f"REFUSED {key}: {err}", file=sys.stderr)
            continue
        rows.append(row)
        print(
            f"{key:12} {row['shape']:8} {row['bpm']:7.2f} bpm  {row['bars_in_loop']:>2} bars/loop  "
            f"{row['sections']}  -> {row['seconds']:.2f}s"
        )

    out = conf["evidence"] / "arrange-plan.json"
    # A partial run merges. The plan is the receipt for the whole set, and
    # re-cutting three beds must not delete the other five's rows.
    plan = {"cabinet": args.cabinet, "beds": [], "refused": []}
    if out.exists():
        plan.update(json.loads(out.read_text(encoding="utf-8")))
    fresh = {r["key"]: r for r in rows}
    touched = set(fresh) | {r["key"] for r in refused}
    merged = []
    for old in plan["beds"]:
        if old["key"] in fresh:
            merged.append(fresh.pop(old["key"]))
        elif old["key"] not in touched:
            merged.append(old)
    merged += [r for r in rows if r["key"] in fresh]
    plan["beds"] = merged
    plan["refused"] = [r for r in plan["refused"] if r["key"] not in touched] + refused
    plan["cabinet"] = args.cabinet
    out.write_text(json.dumps(plan, indent=1), encoding="utf-8")
    print(f"plan -> {out}")
    return 1 if refused else 0


if __name__ == "__main__":
    raise SystemExit(main())
