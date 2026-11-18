"""Lesson 17: B-Line's cross-track error and remaining distance through Two Corners.

Data: tools/figures/data/17-two-corners-run1.csv (runs 2 and 3 are the same
measurement again, and the printed numbers are checked against them), from
probes/Fig17TwoCorners.java: the real Robot loop on the Lesson 17 state, Blue 1,
"Two Corners" enabled, one row per 20 ms tick. The two signals are read from
NetworkTables as /Telemetry/FollowPath/crossTrackError and
.../remainingPathDistanceMeters, the same values B-Line writes to the WPILIB_ log.

Re-measure (shared with 17-two-corners-track.py):

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    for i in 1 2 3; do
      tools/figures/measure.sh 17 tools/figures/probes/Fig17TwoCorners.java \
          tools/figures/data/17-two-corners-run$i.csv
    done

Output: docs/lessons/v3/images/17-cross-track-error.png
"""

import csv
import math

import matplotlib.pyplot as plt

import figstyle

X_MAX_S = 4.5


def load(name):
    with open(figstyle.data_path(name), newline="") as f:
        rows = list(csv.DictReader(f))
    return {key: [float(r[key]) for r in rows] for key in rows[0]}


def facts(d):
    """The numbers the figure and the lesson quote, from one run."""
    t, ct, rem = d["t_s"], d["cross_track_m"], d["remaining_m"]
    valid = [i for i in range(len(t)) if not math.isnan(ct[i])]
    jump = next(i for i in valid if abs(ct[i]) > 0.3)
    low = min(valid, key=lambda i: ct[i])
    return {
        "jump_t": t[jump], "jump_m": ct[jump], "before_m": ct[jump - 1],
        "rem_before": rem[jump - 1], "rem_after": rem[jump],
        "zero_t": next(t[i] for i in valid if i > jump and ct[i] <= 0),
        "low_t": t[low], "low_m": ct[low],
        "fired_t": next(t[i] for i in range(len(t)) if d["fired_count"][i] > 0),
    }


def main():
    figstyle.setup()
    d = load("17-two-corners-run1.csv")
    f = facts(d)
    keep = [i for i in range(len(d["t_s"])) if d["t_s"][i] <= X_MAX_S and not math.isnan(d["cross_track_m"][i])]
    t = [d["t_s"][i] for i in keep]
    ct = [d["cross_track_m"][i] for i in keep]
    rem = [d["remaining_m"][i] for i in keep]

    fig, (top, bottom) = plt.subplots(
        2, 1, sharex=True, figsize=(figstyle.WIDTH_IN, 6.8),
        gridspec_kw={"height_ratios": [3, 2], "hspace": 0.12})

    top.axhline(0, color=figstyle.NEUTRAL, linewidth=1)
    top.plot(t, ct, color=figstyle.MEASURED, label="FollowPath/crossTrackError")
    top.set_ylabel("cross-track error (m)")
    top.set_ylim(-0.25, 0.62)
    top.legend(loc="upper left", frameon=False)
    top.annotate(f"jumps to {f['jump_m']:.2f} m the tick the robot\nenters the 0.5 m radius",
                 xy=(f["jump_t"], f["jump_m"]), xytext=(f["jump_t"] + 0.35, 0.40),
                 ha="left", va="center", color=figstyle.NEUTRAL,
                 arrowprops={"arrowstyle": "-", "color": figstyle.NEUTRAL, "lw": 1.0})
    top.text(f["jump_t"] + 0.45, 0.14, "then shrinks as the robot\ndrives onto the second line",
             ha="left", va="center", color=figstyle.NEUTRAL)
    top.annotate(f"crosses zero, then the robot is {abs(f['low_m']) * 100:.0f} cm\n"
                 "past the line on the other side",
                 xy=(f["low_t"], f["low_m"]), xytext=(f["low_t"] + 0.35, -0.19),
                 ha="left", va="center", color=figstyle.NEUTRAL,
                 arrowprops={"arrowstyle": "-", "color": figstyle.NEUTRAL, "lw": 1.0})

    bottom.plot(t, rem, color=figstyle.SETPOINT, label="FollowPath/remainingPathDistanceMeters")
    bottom.set_ylabel("remaining distance (m)")
    bottom.set_xlabel("time since the robot was enabled (s)")
    bottom.set_xlim(0, X_MAX_S)
    bottom.set_ylim(-0.2, 6.5)
    bottom.legend(loc="lower left", frameon=False)
    bottom.annotate(f"{f['rem_before']:.1f} → {f['rem_after']:.1f} m: it now measures\nthe second leg",
                    xy=(f["jump_t"], (f["rem_before"] + f["rem_after"]) / 2),
                    xytext=(f["jump_t"] + 0.4, 4.6), ha="left", va="center", color=figstyle.NEUTRAL,
                    arrowprops={"arrowstyle": "-", "color": figstyle.NEUTRAL, "lw": 1.0})

    for ax in (top, bottom):
        ax.axvline(f["jump_t"], color=figstyle.NEUTRAL, linestyle=":", linewidth=1.4)
        ax.axvline(f["fired_t"], color=figstyle.NEUTRAL, linestyle="--", linewidth=1.0)
    bottom.text(f["fired_t"] + 0.05, 5.6, "shoot fires", color=figstyle.NEUTRAL, ha="left", va="center")

    print(figstyle.save(fig, "17-cross-track-error"))
    for n in (1, 2, 3):
        r = facts(load(f"17-two-corners-run{n}.csv"))
        print(f"run {n}: " + ", ".join(f"{k} {v:.3f}" for k, v in r.items()))


if __name__ == "__main__":
    main()
