"""Lesson 13, Figure 13.4: the same recorded drive, replayed with `* 1.1` in getPosition().

Data: tools/figures/data/13-replay-scaled-pose.csv. 13-extract-poses.py has the exact
commands that record the drive (probes/Fig13ReplayScaled.java) and replay it twice, and
re-makes the CSV. Plots the pose track (x, y) of the recording, of the unchanged replay and
of the replay with the 1.1.

Output: docs/lessons/v3/images/13-replay-scaled-pose.png
"""

import csv
import math

import matplotlib.pyplot as plt

import figstyle


def load():
    out = {}
    with open(figstyle.data_path("13-replay-scaled-pose.csv"), newline="") as f:
        for r in csv.DictReader(f):
            out.setdefault(r["series"], []).append((float(r["x_m"]), float(r["y_m"])))
    return out


def main():
    figstyle.setup()
    d = load()
    fig, ax = plt.subplots(figsize=(figstyle.WIDTH_IN, 5.2))
    for name, color, style, width, label in [
        ("scaled", figstyle.ALTERNATE, "-", 2.4, "replay with * 1.1 in getPosition()"),
        ("real", figstyle.MEASURED, "-", 4.0, "RealOutputs/Drivetrain/Pose (the recording)"),
        ("clean", figstyle.GOAL, "--", 1.4, "ReplayOutputs/Drivetrain/Pose, code unchanged"),
    ]:
        xs, ys = zip(*d[name])
        ax.plot(xs, ys, color=color, linestyle=style, linewidth=width, label=label)

    end_real = d["real"][-1]
    end_scaled = d["scaled"][-1]
    ratio = math.hypot(*end_scaled) / math.hypot(*end_real)
    gap = math.hypot(end_scaled[0] - end_real[0], end_scaled[1] - end_real[1])
    print(f"ends: real {end_real}, scaled {end_scaled}; ratio {ratio:.4f}, gap {gap:.3f} m")

    ax.plot([0], [0], "o", color=figstyle.NEUTRAL, markersize=8, zorder=5)
    ax.annotate("start (0, 0):\nthe odometry's origin,\nthe one point that\ndoesn't move", xy=(0, 0),
                xytext=(0.15, -1.45), color=figstyle.NEUTRAL, va="bottom",
                arrowprops={"arrowstyle": "->", "color": figstyle.NEUTRAL})
    ax.plot(*end_real, "o", color=figstyle.MEASURED, markersize=8, zorder=5)
    ax.plot(*end_scaled, "o", color=figstyle.ALTERNATE, markersize=8, zorder=5)
    ax.annotate(f"end of the recording\nand of the unchanged replay\n{math.hypot(*end_real):.2f} m from the start",
                xy=end_real, xytext=(4.5, -1.65), color=figstyle.MEASURED,
                va="center", ha="center", arrowprops={"arrowstyle": "->", "color": figstyle.MEASURED})
    ax.annotate(f"end with the 1.1:\n{math.hypot(*end_scaled):.2f} m from the start\n"
                f"({ratio:.2f} times as far, {gap:.2f} m beyond)",
                xy=end_scaled, xytext=(5.9, 1.55), color=figstyle.ALTERNATE,
                ha="center", arrowprops={"arrowstyle": "->", "color": figstyle.ALTERNATE})
    ax.set_aspect("equal")
    ax.set_xlabel("x (m)")
    ax.set_ylabel("y (m)")
    ax.set_xlim(-0.6, 7.2)
    ax.set_ylim(-2.4, 3.2)
    ax.legend(loc="upper left", frameon=False)
    print(figstyle.save(fig, "13-replay-scaled-pose"))


if __name__ == "__main__":
    main()
