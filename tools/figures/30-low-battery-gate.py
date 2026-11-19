"""Lesson 30: why the low-battery alert is only judged while disabled.

Data: data/30-low-battery-gate.csv, one run (five identical to the tick in the dips) from
probes/Fig30LowBatteryGate.java on the Lesson 30 state with its fresh battery (no edits). The
probe runs the real Robot loop, Blue 1: Teleop selected, the robot enabled at time zero, the left
trigger (flywheel to shooting speed) held from 4 s to 7 s. Re-measure with:

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    tools/figures/measure.sh 30 tools/figures/probes/Fig30LowBatteryGate.java tools/figures/data/30-low-battery-gate.csv

For more runs, run the sandbox's test again: cd into the sandbox measure.sh printed and run
FIGURE_OUT=... ./gradlew cleanTest test --tests first.robot.figures.Fig30LowBatteryGate -q.

Output: docs/lessons/v3/images/30-low-battery-gate.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle

LIMIT_V = 11.5          # PowerConstants.kLowBatteryVoltage
SHOT_S, RELEASE_S = 4.0, 7.0


def main():
    figstyle.setup()
    with open(figstyle.data_path("30-low-battery-gate.csv"), newline="") as f:
        rows = list(csv.DictReader(f))
    t = [float(r["t_s"]) for r in rows]
    v = [float(r["battery_volts"]) for r in rows]

    fig, ax = plt.subplots(figsize=(figstyle.WIDTH_IN, 4.6))
    ax.axvspan(t[0], 0, color="#e6e6e6", zorder=0)
    ax.text(-0.5, 12.82, "disabled", ha="center", va="top", color="#555555")
    ax.text(4.0, 12.82, "enabled", ha="center", va="top", color="#555555")
    ax.fill_between(t, v, LIMIT_V, where=[x < LIMIT_V for x in v], interpolate=True,
                    color=figstyle.MEASURED, alpha=0.35, linewidth=0)
    ax.plot(t, v, color=figstyle.MEASURED, label="Power/BatteryVolts")
    ax.axhline(LIMIT_V, color=figstyle.NEUTRAL, linestyle="--")
    ax.text(2.0, LIMIT_V - 0.04, "11.5 V: kLowBatteryVoltage", color=figstyle.NEUTRAL, ha="left", va="top")
    ax.axvline(SHOT_S, color="#bbbbbb", linewidth=1, zorder=0)
    ax.axvline(RELEASE_S, color="#bbbbbb", linewidth=1, zorder=0)
    ax.text(SHOT_S - 0.06, 12.4, "left trigger\npressed", va="center", ha="right", fontsize=9.5, color="#555555")
    ax.text(RELEASE_S - 0.06, 12.4, "released", va="center", ha="right", fontsize=9.5, color="#555555")

    def span(lo, hi):
        pts = [(a, b) for a, b in zip(t, v) if lo <= a <= hi and b < LIMIT_V]
        return pts[0][0], pts[-1][0] + 0.02, min(b for _, b in pts), len(pts)

    for lo, hi, dx in ((0, 3, 0.15), (3.5, 7, 0.1)):
        a, b, m, n = span(lo, hi)
        ax.annotate(f"{b - a:.2f} s below the line,\nlowest {m:.2f} V", xy=((a + b) / 2, m),
                    xytext=((a + b) / 2 + dx, m - 0.42), ha="center", va="top",
                    arrowprops=dict(arrowstyle="-", color=figstyle.NEUTRAL, lw=1))
        print(f"dip {a:.2f}-{b:.2f} s: {n} ticks, {b - a:.2f} s, low {m:.2f} V")
    ax.set_ylim(10.4, 12.9)
    ax.set_xlim(t[0], 8.0)
    ax.set_xlabel("time since the robot was enabled (s)")
    ax.set_ylabel("battery voltage (V)")
    print(figstyle.save(fig, "30-low-battery-gate"))


if __name__ == "__main__":
    main()
