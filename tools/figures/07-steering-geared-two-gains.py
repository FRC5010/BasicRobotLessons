"""Lesson 7: steering 90 degrees through the real 25:1 gearbox, two gains (Figure 7.3 in the lesson).

Data: tools/figures/data/07-steer-geared-kp-0.0005.csv and 07-steer-geared-kp-0.005.csv, from
probes/Fig07SteerGeared.java on the Lesson 7 state: one SwerveModule told to steer from 0
to 90 degrees, one row per 20 ms tick, 12 s. Re-measure them with:

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    FIGURE_SECONDS=12 tools/figures/measure.sh 7 tools/figures/probes/Fig07SteerGeared.java \\
        tools/figures/data/07-steer-geared-kp-0.0005.csv
    FIGURE_SECONDS=12 tools/figures/measure.sh 7 tools/figures/probes/Fig07SteerGeared.java \\
        tools/figures/data/07-steer-geared-kp-0.005.csv \\
        --replace Constants.java "kP = 0.0005;" "kP = 0.005;"

Output: docs/lessons/v3/images/07-steering-geared-two-gains.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle


def load(name):
    with open(figstyle.data_path(name), newline="") as f:
        rows = list(csv.DictReader(f))
    return {key: [float(r[key]) for r in rows] for key in rows[0]}


def settled_from(t, a, band):
    bad = [i for i, v in enumerate(a) if abs(v - 90) > band]
    return t[max(bad) + 1]


def main():
    figstyle.setup()
    slow = load("07-steer-geared-kp-0.0005.csv")
    fast = load("07-steer-geared-kp-0.005.csv")

    fig, (top, bottom) = plt.subplots(2, 1, figsize=(figstyle.WIDTH_IN, 6.8), gridspec_kw={"hspace": 0.4})

    for ax, xmax in ((top, 10.0), (bottom, 1.5)):
        ax.axhline(90, color=figstyle.GOAL, linestyle="--", label="setpoint: 90°")
        ax.axhspan(89, 91, color="#d9d9d9", zorder=0, label="within 1° of the setpoint")
        ax.plot(slow["t_s"], slow["angle_deg"], color=figstyle.MEASURED, label="kP = 0.0005 (Lesson 5's)")
        ax.plot(fast["t_s"], fast["angle_deg"], color=figstyle.ALTERNATE, label="kP = 0.005")
        ax.set_xlim(0, xmax)
        ax.set_ylim(-5, 105)
        ax.set_ylabel("steering angle (°)")

    t1 = settled_from(slow["t_s"], slow["angle_deg"], 1.0)
    t03 = settled_from(slow["t_s"], slow["angle_deg"], 0.3)
    top.plot([t1], [90 - 1], "o", color=figstyle.MEASURED)
    top.annotate(f"within 1° at {t1:.1f} s", xy=(t1, 89), xytext=(t1 - 0.2, 60), color=figstyle.MEASURED,
                 ha="right", arrowprops={"arrowstyle": "-", "color": figstyle.MEASURED, "lw": 1.0})
    top.plot([t03], [90 - 0.3], "o", color=figstyle.MEASURED)
    top.annotate(f"within 0.3° at {t03:.1f} s", xy=(t03, 89.7), xytext=(t03 + 0.1, 70), color=figstyle.MEASURED,
                 ha="left", arrowprops={"arrowstyle": "-", "color": figstyle.MEASURED, "lw": 1.0})
    top.set_xlabel("time since the request (s)")
    top.legend(loc="lower right", frameon=True, framealpha=1.0, edgecolor="white")

    f1 = settled_from(fast["t_s"], fast["angle_deg"], 1.0)
    bottom.plot([f1], [89], "o", color=figstyle.ALTERNATE)
    bottom.annotate(f"within 1° at {f1:.1f} s", xy=(f1, 89), xytext=(f1 + 0.1, 55), color=figstyle.ALTERNATE,
                    arrowprops={"arrowstyle": "-", "color": figstyle.ALTERNATE, "lw": 1.0})
    bottom.set_xlabel("the same two runs, first 1.5 s zoomed: time since the request (s)")

    print(figstyle.save(fig, "07-steering-geared-two-gains"))
    print(f"kP 0.0005: within 1 deg at {t1:.2f} s, within 0.3 deg at {t03:.2f} s, final {slow['angle_deg'][-1]:.2f}, "
          f"max {max(slow['angle_deg']):.2f}; kP 0.005: within 1 deg at {f1:.2f} s, "
          f"within 0.1 deg at {settled_from(fast['t_s'], fast['angle_deg'], 0.1):.2f} s, max {max(fast['angle_deg']):.3f}")


if __name__ == "__main__":
    main()
