"""Lesson 4: velocity response to driveAtSpeed(0.3), two inertias.

Data (probes/Fig04VelocityTwoInertias.java on the Lesson 4 state: the real DriveModule through the
scheduler, driveAtSpeed(0.3) held then cancelled, velocity read the way the lesson's logTelemetry reads it):
  data/04-velocity-j001.csv       the lesson's inertia, 0.001, held 1 s
  data/04-velocity-j05.csv        0.05 (Try It #1), held 1 s
  data/04-velocity-j05-long.csv   0.05, held 20 s, to see its steady value and its 63% point
Re-measure with:

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    P=tools/figures/probes/Fig04VelocityTwoInertias.java; D=tools/figures/data
    tools/figures/measure.sh 4 $P $D/04-velocity-j001.csv
    HOLD_TICKS=50 tools/figures/measure.sh 4 $P $D/04-velocity-j05.csv \\
        --replace subsystems/DriveModule.java "0.001, 1.0)" "0.05, 1.0)"
    HOLD_TICKS=1000 TOTAL_TICKS=1000 tools/figures/measure.sh 4 $P $D/04-velocity-j05-long.csv \\
        --replace subsystems/DriveModule.java "0.001, 1.0)" "0.05, 1.0)"

Output: docs/lessons/v3/images/04-velocity-two-inertias.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle

LIGHT, HEAVY = figstyle.MEASURED, figstyle.ALTERNATE


def load(name):
    with open(figstyle.data_path(name), newline="") as f:
        rows = list(csv.DictReader(f))
    return [0.0] + [float(r["t_s"]) for r in rows], [0.0] + [float(r["velocity_rps"]) for r in rows]


def first_reach(t, v, level):
    for a, b, x0, x1 in zip(t, t[1:], v, v[1:]):
        if x1 >= level:
            return a + (b - a) * (level - x0) / (x1 - x0)
    return None


def main():
    figstyle.setup()
    t1, v1 = load("04-velocity-j001.csv")
    t2, v2 = load("04-velocity-j05.csv")
    t3, v3 = load("04-velocity-j05-long.csv")
    steady = max(v1)  # the light wheel has long since settled
    level = 0.632 * steady
    tau1, tau2 = first_reach(t1, v1, level), first_reach(t3, v3, level)

    fig, (top, bottom) = plt.subplots(2, 1, figsize=(figstyle.WIDTH_IN, 7.0),
                                      gridspec_kw={"height_ratios": [1, 1], "hspace": 0.38})
    top.axvspan(0, 1, color="#eef3f8", label="button held (0.3 requested)")
    top.axhline(steady, color=figstyle.NEUTRAL, linestyle=":", linewidth=1.2)
    top.text(2.45, steady + 0.8, f"steady value {steady:.1f} rot/s", color=figstyle.NEUTRAL, ha="right")
    top.plot(t1, v1, color=LIGHT, label="inertia 0.001 (the lesson's)")
    top.plot(t2, v2, color=HEAVY, label="inertia 0.05")
    top.plot([tau1], [level], "o", color=LIGHT, markeredgecolor="white", markersize=8, zorder=5)
    top.annotate(f"63% at {tau1:.2f} s", xy=(tau1, level), xytext=(0.28, 17), color=LIGHT, fontweight="bold",
                 arrowprops={"arrowstyle": "-", "color": LIGHT})
    top.text(0.02, 33.5, "the reading stays at 0 for the first 0.1 s or so", color=figstyle.NEUTRAL, fontsize=9.5)
    top.set_xlim(0, 2.5)
    top.set_ylim(-1, 36)
    top.set_ylabel("rotor velocity (rot/s)")
    top.set_xlabel("time since the button went down (s)")
    top.legend(loc="center right", frameon=False)

    bottom.axhline(steady, color=figstyle.NEUTRAL, linestyle=":", linewidth=1.2)
    bottom.axhline(level, color=figstyle.NEUTRAL, linestyle="--", linewidth=1.0)
    bottom.plot(t3, v3, color=HEAVY, label="inertia 0.05, button held the whole time")
    bottom.plot([tau2], [level], "o", color=HEAVY, markeredgecolor="white", markersize=8, zorder=5)
    bottom.annotate(f"63% of {steady:.1f} at {tau2:.1f} s", xy=(tau2, level), xytext=(tau2 + 1.5, level - 8),
                    color=HEAVY, fontweight="bold", arrowprops={"arrowstyle": "-", "color": HEAVY})
    bottom.set_xlim(0, 20)
    bottom.set_ylim(-1, 36)
    bottom.set_ylabel("rotor velocity (rot/s)")
    bottom.set_xlabel("time since the button went down (s)")
    bottom.legend(loc="lower right", frameon=False)

    print(figstyle.save(fig, "04-velocity-two-inertias"))
    print(f"steady {steady:.2f}, 63% level {level:.2f}: J=0.001 at {tau1:.3f} s, J=0.05 at {tau2:.2f} s; "
          f"J=0.05 peak after a 1 s hold {max(v2):.2f}; end of long run {v3[-1]:.2f}")


if __name__ == "__main__":
    main()
