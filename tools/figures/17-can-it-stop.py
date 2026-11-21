"""Lesson 17: can the robot stop in time? Speed against distance left on Two Corners' last leg.

Curves, from Lesson 17's own arithmetic: the loop's request min(v_max, kTranslationP * d)
with kTranslationP = 5, and the fastest speed from which 6 m/s^2 (default_max_acceleration)
can still stop in d metres, v = sqrt(2 * 6 * d).

Measured speeds: data/17-two-corners-run1.csv (2 m/s, the shipped config; run2 is the same
again) and data/17-two-corners-3mps-run*.csv (default_max_velocity_meters_per_sec raised to
3.0), from probes/Fig17TwoCorners.java: the real Robot loop on the Lesson 17 state, Blue 1,
"Two Corners" enabled, one row per 20 ms tick. Distance left is 6.0 - y of the simulated
truth (Two Corners ends at (6, 6), the last leg runs straight up x = 6); speed is the truth's
y movement per tick; both are signed, so an overshoot shows as negative distance, and the way
back as negative speed. Which 3 m/s run is drawn is set by SHOWN_3MPS below; the script
prints every run's overshoot so the choice can be checked. Run 1 is an outlier (27 cm past the
corner, none past the end; runs 2-5 agree at 36-37 cm and 70-72 cm) and is not drawn.

Re-measure (JAVA_HOME must be JDK 25; the config line sits in src/main/deploy, three
directories above --replace's base):
    for i in 1 2 3 4 5 6; do
      flock <lock> tools/figures/measure.sh 17 tools/figures/probes/Fig17TwoCorners.java \\
          tools/figures/data/17-two-corners-3mps-run$i.csv \\
          --replace ../../../deploy/autos/config.json \\
          '"default_max_velocity_meters_per_sec": 2.0' '"default_max_velocity_meters_per_sec": 3.0'
    done
  (and the 2 m/s runs: measure.sh 17 .../Fig17TwoCorners.java .../17-two-corners-run$i.csv)

Output: docs/lessons/v3/images/17-can-it-stop.png
"""

import csv
import glob
import os

import matplotlib.pyplot as plt
import numpy as np

import figstyle

KP = 5.0
ACCEL = 6.0
SHOWN_3MPS = "17-two-corners-3mps-run2.csv"
SHOWN_2MPS = "17-two-corners-run1.csv"


def load(name):
    with open(figstyle.data_path(name), newline="") as f:
        rows = list(csv.DictReader(f))
    t = np.array([float(r["t_s"]) for r in rows])
    x = np.array([float(r["x_m"]) for r in rows])
    y = np.array([float(r["y_m"]) for r in rows])
    return t, x, y


def leg(name):
    """(distance left, speed along the last leg) once the robot is on it."""
    t, x, y = load(name)
    v = np.diff(y) / 0.02
    d = 6.0 - y[:-1]
    # the last leg: x close to 6 and y past 3.5, until it stops for good
    on = (np.abs(x[:-1] - 6.0) < 0.9) & (y[:-1] > 3.5)
    last = np.where(on & (np.abs(v) > 0.02))[0].max()
    keep = on.copy()
    keep[last + 1:] = False
    first = np.argmax(on)
    keep[:first] = False
    return d[keep], v[keep]


def main():
    figstyle.setup()
    for p in sorted(glob.glob(figstyle.data_path("17-two-corners-*run*.csv"))):
        name = os.path.basename(p)
        t, x, y = load(name)
        print(f"{name}: past the end {max(0, y.max() - 6) * 100:.0f} cm, past the corner {max(0, x.max() - 6) * 100:.0f} cm")

    d = np.linspace(0, 1.8, 400)
    fig, ax = plt.subplots(figsize=(figstyle.WIDTH_IN, 5.0))
    ax.plot(d, np.sqrt(2 * ACCEL * d), color=figstyle.NEUTRAL, linestyle=":", linewidth=2.2,
            label="fastest speed that can still stop at 6 m/s²: √(2 × 6 × d)")
    ax.plot(d, np.minimum(2.0, KP * d), color=figstyle.SETPOINT, label="the loop's request, top speed 2 m/s")
    ax.plot(d, np.minimum(3.0, KP * d), color=figstyle.SETPOINT, linestyle="--", label="the loop's request, top speed 3 m/s")
    d2, v2 = leg(SHOWN_2MPS)
    d3, v3 = leg(SHOWN_3MPS)
    ax.plot(d2, v2, color=figstyle.MEASURED, linewidth=2.6, label="measured, top speed 2 m/s (arrives)")
    ax.plot(d3, v3, color=figstyle.ALTERNATE, linewidth=2.6, label="measured, top speed 3 m/s (overshoots)")
    ax.axvline(0, color=figstyle.GOAL, linestyle="--", linewidth=1.2)
    ax.axhline(0, color=figstyle.NEUTRAL, linewidth=0.8)
    ax.set_xlim(1.6, -0.5)
    ax.set_ylim(-1.7, 3.3)
    ax.set_xlabel("distance left to the end of the path (m)")
    ax.set_ylabel("speed toward the end (m/s)")
    ax.annotate("2 m/s request starts\nfalling at 0.4 m", xy=(0.4, 2.0), xytext=(1.25, 1.35), color=figstyle.SETPOINT,
                arrowprops=dict(arrowstyle="-", color=figstyle.SETPOINT))
    ax.annotate("3 m/s: at 0.6 m", xy=(0.6, 3.0), xytext=(1.25, 3.2), color=figstyle.SETPOINT, va="center",
                arrowprops=dict(arrowstyle="-", color=figstyle.SETPOINT))
    ax.text(0.02, 3.2, "the end", ha="right", va="top", color=figstyle.GOAL)
    ax.legend(loc="lower left", frameon=True, framealpha=0.95, edgecolor="none", fontsize=9, bbox_to_anchor=(0.0, 0.0))
    print(f"shown 2 m/s: lowest distance {d2.min():.3f} m; shown 3 m/s: lowest distance {d3.min():.3f} m, "
          f"top speed {v3.max():.2f} m/s")
    print(figstyle.save(fig, "17-can-it-stop"))


if __name__ == "__main__":
    main()
