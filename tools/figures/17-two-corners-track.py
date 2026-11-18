"""Lesson 17: the Two Corners path as drawn, and the track the robot drove along it.

Data: tools/figures/data/17-two-corners-run1.csv (runs 2 and 3 are the same
measurement again; the generator checks that the numbers it prints agree with
them), from probes/Fig17TwoCorners.java: the real Robot loop on the Lesson 17 state,
Blue 1, the "Two Corners" opmode selected and enabled, 6 s of ticks from enable.
The drawn path is TwoCorners.json (waypoints (3, 3) and (6, 6), a translation
through (6, 3)) and config.json's 0.5 m handoff radius.

Re-measure (the probe makes one run per JVM; do it three times):

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    for i in 1 2 3; do
      tools/figures/measure.sh 17 tools/figures/probes/Fig17TwoCorners.java \
          tools/figures/data/17-two-corners-run$i.csv
    done

Output: docs/lessons/v3/images/17-two-corners-track.png
"""

import csv
import math

import matplotlib.pyplot as plt
from matplotlib.patches import Circle

import figstyle

CORNER = (6.0, 3.0)
HANDOFF_RADIUS = 0.5
END = (6.0, 6.0)


def load(name):
    with open(figstyle.data_path(name), newline="") as f:
        rows = list(csv.DictReader(f))
    return {key: [float(r[key]) for r in rows] for key in rows[0]}


def nearest(t, seconds):
    return min(range(len(t)), key=lambda i: abs(t[i] - seconds))


def main():
    figstyle.setup()
    d = load("17-two-corners-run1.csv")
    t, x, y, th = d["t_s"], d["x_m"], d["y_m"], d["theta_deg"]

    fig, ax = plt.subplots(figsize=(figstyle.WIDTH_IN, 6.6))
    ax.set_aspect("equal")
    ax.set_xlim(2.4, 7.6)
    ax.set_ylim(2.3, 6.9)

    # The drawn path (the goal), and the handoff circle round the first corner.
    ax.plot([3, 6, 6], [3, 3, 6], color=figstyle.GOAL, linestyle="--", linewidth=1.8,
            label="the path you drew", zorder=2)
    ax.add_patch(Circle(CORNER, HANDOFF_RADIUS, fill=False, edgecolor=figstyle.NEUTRAL,
                        linestyle=":", linewidth=1.6, zorder=1))
    ax.text(CORNER[0] + 0.45, CORNER[1] - 0.45, "0.5 m handoff\nradius", color=figstyle.NEUTRAL,
            ha="left", va="center")

    # The driven track (the simulated truth).
    ax.plot(x, y, color=figstyle.MEASURED, linewidth=2.4, label="where the robot went", zorder=3)

    # Waypoints.
    ax.plot([3, 6], [3, 6], "s", color=figstyle.GOAL, markersize=7, zorder=4)
    ax.text(3.0, 2.62, "start (3, 3), facing 0°", ha="center", va="top")
    ax.text(6.0, 6.28, "end (6, 6), facing 180°", ha="center", va="bottom")
    ax.plot(*CORNER, "o", color=figstyle.GOAL, markersize=5, zorder=4)
    ax.text(CORNER[0] - 0.12, CORNER[1] - 0.14, "corner (6, 3)", ha="right", va="top")

    # Heading ticks along the track: arrows at a few instants.
    for seconds in (0.0, 1.2, 2.2, 2.8, 3.2, 3.8):
        i = nearest(t, seconds if seconds > 0 else 0.02)
        a = math.radians(th[i])
        ax.annotate("", xy=(x[i] + 0.32 * math.cos(a), y[i] + 0.32 * math.sin(a)),
                    xytext=(x[i], y[i]),
                    arrowprops={"arrowstyle": "-|>", "color": figstyle.SETPOINT, "lw": 2.0,
                                "shrinkA": 0, "shrinkB": 0}, zorder=5)
    ax.plot([], [], color=figstyle.SETPOINT, label="which way the robot faces")
    # Label three of them with their angle.
    for seconds, dx, dy, ha in ((2.2, -0.30, 0.0, "right"), (2.8, -0.50, 0.0, "right"),
                                (3.2, -0.48, -0.12, "right")):
        i = nearest(t, seconds)
        ax.text(x[i] + dx, y[i] + dy, f"{th[i]:.0f}°", color=figstyle.SETPOINT,
                ha=ha, va="center", fontweight="bold")

    # The rotation target: "halfway up the next leg" on the drawn path.
    ax.plot([6.0], [4.5], "D", color=figstyle.SETPOINT, markersize=7, zorder=4)
    ax.text(6.22, 4.25, "rotation target:\n90° by halfway\nup this leg", ha="left", va="center",
            color=figstyle.SETPOINT)

    # The shoot event: where the robot was on the tick B-Line fired the marker.
    k = next(i for i in range(len(t)) if d["fired_count"][i] > 0)
    ax.plot([x[k]], [y[k]], "*", color=figstyle.GOAL, markersize=13, zorder=6)
    ax.text(x[k] + 0.2, y[k] + 0.18, f"shoot event\n({(y[k] - 3) / 3 * 100:.0f}% up the leg)",
            ha="left", va="center")

    # The overshoot past x = 6.
    j = max(range(len(x)), key=lambda i: x[i])
    over_cm = (x[j] - 6.0) * 100
    ax.annotate("", xy=(x[j], y[j]), xytext=(6.0, y[j]),
                arrowprops={"arrowstyle": "<->", "color": figstyle.NEUTRAL, "lw": 1.2,
                            "shrinkA": 0, "shrinkB": 0})
    ax.plot([6.0, 6.0], [y[j] - 0.1, y[j] + 0.1], color=figstyle.NEUTRAL, linewidth=1)
    ax.text(x[j] + 0.1, y[j] + 0.10, f"{over_cm:.0f} cm past\nthe corner's x", ha="left",
            va="center", color=figstyle.NEUTRAL)

    ax.set_xlabel("field x (m)")
    ax.set_ylabel("field y (m)")
    ax.legend(loc="upper left", frameon=False)

    print(figstyle.save(fig, "17-two-corners-track"))
    for n in (1, 2, 3):
        r = load(f"17-two-corners-run{n}.csv")
        kk = next(i for i in range(len(r["t_s"])) if r["fired_count"][i] > 0)
        print(f"run {n}: overshoot {(max(r['x_m']) - 6) * 100:.1f} cm, "
              f"peak y {max(r['y_m']):.3f}, end ({r['x_m'][-1]:.2f}, {r['y_m'][-1]:.2f}, "
              f"{r['theta_deg'][-1]:.1f} deg), shoot fired at y {r['y_m'][kk]:.2f} "
              f"({(r['y_m'][kk] - 3) / 3 * 100:.1f}%)")


if __name__ == "__main__":
    main()
