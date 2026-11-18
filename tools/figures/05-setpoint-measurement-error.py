"""Lesson 5: setpoint, measurement and error in one move (Figure 5.1).

Data: tools/figures/data/05-steer-kp-0.0005.csv, from probes/Fig05SteerToAngle.java on
the Lesson 5 state with the lesson's own gain: steerToAngle(90) from a module
sitting at 0, one row per 20 ms tick, 10 s. Re-measure it with:

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    FIGURE_SECONDS=10 tools/figures/measure.sh 5 tools/figures/probes/Fig05SteerToAngle.java \\
        tools/figures/data/05-steer-kp-0.0005.csv

Output: docs/lessons/v3/images/05-setpoint-measurement-error.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle

SHOW_S = 3.0


def load(name):
    with open(figstyle.data_path(name), newline="") as f:
        rows = list(csv.DictReader(f))
    return {key: [float(r[key]) for r in rows] for key in rows[0]}


def crossing(t, y, level):
    """Time at which y first rises through level, interpolated between ticks."""
    for i in range(1, len(y)):
        if y[i - 1] < level <= y[i]:
            f = (level - y[i - 1]) / (y[i] - y[i - 1])
            return t[i - 1] + f * (t[i] - t[i - 1])
    raise ValueError("never crossed")


def main():
    figstyle.setup()
    d = load("05-steer-kp-0.0005.csv")
    t, angle, output = d["t_s"], d["angle_deg"], d["output"]
    kp = output[0] / d["error_deg"][0]

    fig, (top, bottom) = plt.subplots(
        2, 1, figsize=(figstyle.WIDTH_IN, 6.4), sharex=True,
        gridspec_kw={"height_ratios": [3, 2], "hspace": 0.12})

    top.axhline(90, color=figstyle.GOAL, linestyle="--", label="setpoint: 90°")
    top.plot(t, angle, color=figstyle.MEASURED, label="measurement: the steering angle")
    top.set_ylabel("steering angle (°)")
    top.set_ylim(-5, 175)
    top.set_xlim(0, SHOW_S)
    top.legend(loc="lower right", frameon=False)

    # The lesson's worked tick: the measurement at 20 degrees.
    t20 = crossing(t, angle, 20.0)
    err20 = 90 - 20.0
    top.annotate("", xy=(t20, 20), xytext=(t20, 90),
                 arrowprops={"arrowstyle": "<->", "color": figstyle.NEUTRAL, "lw": 1.6})
    top.text(t20 + 0.12, 8, f"error = 90 − 20 = {err20:.0f}°", color=figstyle.NEUTRAL, va="center")

    # Where it first reaches the setpoint, and the farthest it gets.
    i_peak = max(range(len(angle)), key=lambda k: angle[k])
    top.annotate(f"overshoots to {angle[i_peak]:.0f}°:\nthe error is now negative",
                 xy=(t[i_peak], angle[i_peak]), xytext=(t[i_peak] + 0.55, angle[i_peak] - 5),
                 color=figstyle.NEUTRAL, va="center",
                 arrowprops={"arrowstyle": "-", "color": figstyle.NEUTRAL, "lw": 1.0})

    bottom.axhline(0, color=figstyle.NEUTRAL, linewidth=1.0)
    bottom.plot(t, output, color=figstyle.SETPOINT, label=f"output = kP × error, kP = {kp:g}")
    bottom.plot([t20], [kp * err20], "o", color=figstyle.SETPOINT)
    bottom.annotate(f"{kp * err20:.3f} at 20°", xy=(t20, kp * err20), xytext=(t20 + 0.12, kp * err20 + 0.004),
                    color=figstyle.SETPOINT, va="bottom")
    bottom.set_ylabel("output (fraction of full power)")
    bottom.set_xlabel("time since the tap (s)")
    bottom.legend(loc="lower right", frameon=False)

    print(figstyle.save(fig, "05-setpoint-measurement-error"))
    print(f"kP {kp:g}: crosses 20 deg at {t20:.3f} s, first reaches 90 at "
          f"{next(tt for tt, a in zip(t, angle) if a >= 90):.2f} s, peaks {angle[i_peak]:.1f} deg at {t[i_peak]:.2f} s")


if __name__ == "__main__":
    main()
