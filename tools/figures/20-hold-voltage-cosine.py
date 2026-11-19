"""Lesson 20: the holding voltage is a cosine.

Data: data/20-hold-voltage.csv, from probes/Fig20HoldVoltage.java on the Lesson 20 state: the real
Arm and ArmIOSim through the scheduler, enabled, a fixed 20 ms schedule. The goal is stepped
through 23 angles from -20 to 180 degrees (every 10, plus 45 and 135 for the lesson's table),
held 5 s each, and the mean measured angle and applied volts over the last 0.5 s recorded. The
sweep runs up and then back down. Re-measure with:

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    tools/figures/measure.sh 20 tools/figures/probes/Fig20HoldVoltage.java \\
        tools/figures/data/20-hold-voltage.csv

The curve is kArmKG * cos(angle) with kArmKG = 0.25 (ArmConstants), not a fit. Points are plotted
at the measured angle (the arm settles a fraction of a degree short of its goal).

Output: docs/lessons/v3/images/20-hold-voltage-cosine.png
"""

import csv
import math

import matplotlib.pyplot as plt

import figstyle

KG = 0.25
TABLE = [0, 45, 90, 135, 180]
OFFSETS = {0: (0, 12), 45: (30, 8), 90: (-40, -14), 135: (-40, -12), 180: (-34, 14)}


def main():
    with open(figstyle.data_path("20-hold-voltage.csv"), newline="") as f:
        rows = list(csv.DictReader(f))
    figstyle.setup()
    fig, ax = plt.subplots(figsize=(figstyle.WIDTH_IN, 4.8))
    xs = [x / 2 for x in range(-50, 381)]
    ax.plot(xs, [KG * math.cos(math.radians(x)) for x in xs], color=figstyle.GOAL,
            linestyle="--", label="kArmKG × cos(angle), kArmKG = 0.25")
    for d, marker, size, lab in (("up", "o", 40, "measured, sweeping up"),
                                 ("down", "x", 36, "measured, sweeping down")):
        pts = [(float(r["angle_deg"]), float(r["volts"])) for r in rows if r["direction"] == d]
        ax.scatter(*zip(*pts), marker=marker, s=size, color=figstyle.MEASURED, label=lab, zorder=3)
    ax.axhline(0, color=figstyle.NEUTRAL, linewidth=1)
    for a in TABLE:
        v = next(float(r["volts"]) for r in rows if r["direction"] == "up" and abs(float(r["goal_deg"]) - a) < 1e-6)
        ax.annotate(f"{v:+.2f} V" if abs(v) > 0.005 else "0.00 V", (float(next(r["angle_deg"] for r in rows if r["direction"] == "up" and abs(float(r["goal_deg"]) - a) < 1e-6)), v),
                    textcoords="offset points", xytext=OFFSETS[a],
                    ha="center", fontsize=11, color=figstyle.NEUTRAL)
    ax.axvline(-20, color=figstyle.NEUTRAL, linestyle=":", linewidth=1.2)
    ax.axvline(180, color=figstyle.NEUTRAL, linestyle=":", linewidth=1.2)
    ax.text(-18, -0.30, "stop −20°", fontsize=11, color=figstyle.NEUTRAL, va="bottom")
    ax.text(178, -0.30, "stop 180°", fontsize=11, color=figstyle.NEUTRAL, va="bottom", ha="right")
    ax.set_xlim(-30, 190)
    ax.set_ylim(-0.32, 0.34)
    ax.set_xticks([-20, 0, 45, 90, 135, 180])
    ax.set_xlabel("arm angle (degrees, 0° = horizontal)")
    ax.set_ylabel("applied volts while holding")
    ax.legend(loc="upper right", fontsize=10)
    fig.tight_layout()
    print(figstyle.save(fig, "20-hold-voltage-cosine"))


if __name__ == "__main__":
    main()
