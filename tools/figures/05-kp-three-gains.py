"""Lesson 5: kP too small, a smooth one, and the lesson's own gain (Figure 5.2).

Data: tools/figures/data/05-steer-kp-0.00001.csv, 05-steer-kp-0.00003.csv and
05-steer-kp-0.0005.csv, from probes/Fig05SteerToAngle.java on the Lesson 5 state:
steerToAngle(90) from a module sitting at 0, one row per 20 ms tick, 10 s each.
Re-measure them with:

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    for kp in 0.0005 0.00003 0.00001; do
      FIGURE_SECONDS=10 tools/figures/measure.sh 5 tools/figures/probes/Fig05SteerToAngle.java \\
          tools/figures/data/05-steer-kp-$kp.csv --replace Constants.java "kP = 0.0005;" "kP = $kp;"
    done

(for 0.0005 the --replace swaps the value for itself; leave it out if you like).

Output: docs/lessons/v3/images/05-kp-three-gains.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle

PURPLE = "#CC79A7"  # Okabe-Ito reddish purple: a third gain, so no role colour is reused
SHOW_S = 8.0


def load(name):
    with open(figstyle.data_path(name), newline="") as f:
        rows = list(csv.DictReader(f))
    return {key: [float(r[key]) for r in rows] for key in rows[0]}


def settled_from(t, a, band=1.0):
    """First time after which the angle stays within band of 90, or None."""
    bad = [i for i, v in enumerate(a) if abs(v - 90) > band]
    if not bad:
        return t[0]
    last = max(bad)
    return t[last + 1] if last + 1 < len(t) else None


def main():
    figstyle.setup()
    small = load("05-steer-kp-0.00001.csv")
    good = load("05-steer-kp-0.00003.csv")
    big = load("05-steer-kp-0.0005.csv")

    fig, ax = plt.subplots(figsize=(figstyle.WIDTH_IN, 5.4))
    ax.axhline(90, color=figstyle.GOAL, linestyle="--", label="setpoint: 90°")
    ax.axhspan(89, 91, color="#d9d9d9", zorder=0, label="within 1° of the setpoint")

    peak = max(big["angle_deg"])
    ax.plot(big["t_s"], big["angle_deg"], color=figstyle.MEASURED,
            label="kP = 0.0005 (the lesson's): overshoots, rings")
    t_good = settled_from(good["t_s"], good["angle_deg"])
    ax.plot(good["t_s"], good["angle_deg"], color=figstyle.ALTERNATE, linewidth=2.4,
            label="kP = 0.00003: no overshoot, within 1° at %.1f s" % t_good)
    ax.plot(small["t_s"], small["angle_deg"], color=PURPLE,
            label="kP = 0.00001: crawls, then stops short")
    stall = small["angle_deg"][-1]

    ax.annotate(f"stalls at {stall:.0f}°", xy=(SHOW_S - 0.1, stall), xytext=(SHOW_S - 0.1, stall - 14),
                color=PURPLE, ha="right", va="top")
    ax.annotate(f"first peak {peak:.0f}°", xy=(big["t_s"][big["angle_deg"].index(peak)], peak),
                xytext=(big["t_s"][big["angle_deg"].index(peak)] + 0.4, peak + 2),
                color=figstyle.MEASURED, va="center",
                arrowprops={"arrowstyle": "-", "color": figstyle.MEASURED, "lw": 1.0})

    ax.set_xlim(0, SHOW_S)
    ax.set_ylim(-5, 175)
    ax.set_xlabel("time since the tap (s)")
    ax.set_ylabel("steering angle (°)")
    ax.legend(loc="lower right", frameon=True, framealpha=1.0, edgecolor="white")

    print(figstyle.save(fig, "05-kp-three-gains"))
    for name, d in (("0.00001", small), ("0.00003", good), ("0.0005", big)):
        print(f"kP {name}: peak {max(d['angle_deg']):.1f} deg, final {d['angle_deg'][-1]:.2f} deg, "
              f"within 1 deg from {settled_from(d['t_s'], d['angle_deg'])}")


if __name__ == "__main__":
    main()
