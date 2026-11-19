"""Lesson 6: driveDistance(1.0, 0.4), distance and throttle, and where the wheel stops (Figure 6.2).

Data: tools/figures/data/06-drive-distance.csv, from probes/Fig06DriveDistance.java on the
Lesson 6 state (one request from a standstill, one row per 20 ms tick, 4 s). Re-measure with:

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    tools/figures/measure.sh 6 tools/figures/probes/Fig06DriveDistance.java \\
        tools/figures/data/06-drive-distance.csv

The throttle is the drive motor's applied volts / 12, read from its sim state, so it shows
the first ticks at 0.25 (3 V; most likely the default 120 A stator limit, which
Figure 12.2 measured; not checked here) and lags the command by a tick.

Output: docs/lessons/v3/images/06-drive-distance-trace.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle

SHOW_S = 1.4


def main():
    figstyle.setup()
    with open(figstyle.data_path("06-drive-distance.csv"), newline="") as f:
        rows = list(csv.DictReader(f))
    t = [float(r["t_s"]) for r in rows]
    d = [float(r["distance_m"]) for r in rows]
    th = [float(r["throttle"]) for r in rows]
    run = [int(r["running"]) for r in rows]
    i_exit = run.index(0)
    t_exit, d_exit, d_final = t[i_exit], d[i_exit], d[-1]

    fig, (a, b) = plt.subplots(2, 1, figsize=(figstyle.WIDTH_IN, 6.2), sharex=True,
                               gridspec_kw={"height_ratios": [3, 2]})
    a.axhline(1.0, color=figstyle.GOAL, linestyle="--", label="target: 1.0 m")
    a.plot(t, d, color=figstyle.MEASURED, label="DriveModule/DistanceMeters")
    for ax in (a, b):
        ax.axvline(t_exit, color=figstyle.NEUTRAL, linewidth=1.2)
    a.annotate(f"waitUntil returns: {d_exit:.3f} m", xy=(t_exit, d_exit), xytext=(0.05, 0.80),
               ha="left", color=figstyle.NEUTRAL,
               arrowprops={"arrowstyle": "-", "color": figstyle.NEUTRAL, "lw": 1.0})
    a.annotate(f"rolls on to {d_final:.3f} m", xy=(1.1, d_final), xytext=(0.95, 1.30),
               ha="center", color=figstyle.MEASURED,
               arrowprops={"arrowstyle": "-", "color": figstyle.MEASURED, "lw": 1.0})
    a.set_ylabel("distance (m)")
    a.set_ylim(-0.05, 1.45)
    a.legend(loc="center right", frameon=True, framealpha=1.0, edgecolor="white")

    b.plot(t, th, color=figstyle.SETPOINT, label="drive throttle (applied volts ÷ 12)")
    b.text(t_exit + 0.03, 0.2, ".whenExited(...)\nthrottle → 0", color=figstyle.NEUTRAL, va="center")
    b.set_ylabel("throttle")
    b.set_ylim(-0.05, 0.5)
    b.set_xlabel("time since the tap (s)")
    b.set_xlim(0, SHOW_S)
    b.legend(loc="upper right", frameon=True, framealpha=1.0, edgecolor="white")

    print(figstyle.save(fig, "06-drive-distance-trace"))
    print(f"exit at {t_exit:.2f} s, {d_exit:.4f} m; final {d_final:.4f} m; "
          f"coast past exit {1000*(d_final-d_exit):.0f} mm, past target {1000*(d_final-1):.0f} mm")


if __name__ == "__main__":
    main()
