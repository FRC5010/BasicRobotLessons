"""Lesson 28: spin-up to 60 rot/s from four idle speeds, and the volts for the 30 rot/s start.

Data: data/28-spin-up-from-idle.csv, from probes/Fig28SpinUp.java on the Lesson 28 state:
the real Flywheel settled at each starting speed for 5 s, then asked for 60 rot/s.
Re-measure it with:

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    tools/figures/measure.sh 28 tools/figures/probes/Fig28SpinUp.java \\
        tools/figures/data/28-spin-up-from-idle.csv

Output: docs/lessons/v3/images/28-spin-up-from-idle.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle

TOLERANCE = 1.5  # FlywheelConstants.kTolerance
# One hue (the measured orange), darker the faster the idle, labelled directly.
SHADES = {"0": "#E8A87C", "15": "#E07B39", "30": "#D55E00", "45": "#8A3A00"}


def load():
    with open(figstyle.data_path("28-spin-up-from-idle.csv"), newline="") as f:
        rows = list(csv.DictReader(f))
    runs = {}
    for r in rows:
        runs.setdefault(r["start_rps"], []).append(r)
    return {k: {c: [float(x[c]) for x in v] for c in ("t_s", "velocity_rps", "applied_v")}
            for k, v in runs.items()}


def at_speed_time(run):
    for t, v in zip(run["t_s"], run["velocity_rps"]):
        if abs(v - 60) < TOLERANCE:
            return t
    return None


def main():
    figstyle.setup()
    runs = load()

    fig, (top, bottom) = plt.subplots(
        2, 1, sharex=True, figsize=(figstyle.WIDTH_IN, 6.6),
        gridspec_kw={"height_ratios": [3, 1.7], "hspace": 0.12})

    top.axhspan(60 - TOLERANCE, 60 + TOLERANCE, color="#cfe3f0", label="AtSpeed: within 1.5 rot/s of 60")
    top.axhline(60, color=figstyle.GOAL, linestyle="--", linewidth=1.2)
    times = {}
    for start in ("0", "15", "30", "45"):
        run = runs[start]
        top.plot([0] + run["t_s"], [float(start)] + run["velocity_rps"], color=SHADES[start])
        times[start] = at_speed_time(run)
        top.plot([times[start]], [60 - TOLERANCE], marker="o", color=SHADES[start],
                 markeredgecolor="white", markersize=8, zorder=5)
        top.text(times[start] + 0.05, 60 - TOLERANCE - 3.5, f"{times[start]:.2f} s", color=SHADES[start],
                 ha="left", va="top", fontweight="bold")
        top.text(-0.04, float(start), f"idle {start}", color=SHADES[start], ha="right", va="center",
                 fontweight="bold")
    top.set_ylabel("flywheel speed (rot/s)")
    top.set_ylim(-3, 68)
    top.set_xlim(-0.4, 3.0)
    top.legend(loc="lower right", frameon=False)

    run = runs["30"]
    bottom.plot([0] + run["t_s"], [run["applied_v"][0]] + run["applied_v"], color=SHADES["30"],
                label="applied volts, starting from 30 rot/s")
    final = run["applied_v"][-1]
    bottom.axhline(final, color=figstyle.NEUTRAL, linestyle=":", label=f"settles at {final:.2f} V")
    peak = max(run["applied_v"])
    tp = run["t_s"][run["applied_v"].index(peak)]
    bottom.annotate(f"peak {peak:.2f} V", xy=(tp, peak), xytext=(tp + 0.35, peak + 0.2),
                    color=figstyle.NEUTRAL, arrowprops={"arrowstyle": "-", "color": figstyle.NEUTRAL})
    bottom.set_ylabel("applied volts (V)")
    bottom.set_xlabel("time since the request for 60 rot/s (s)")
    bottom.set_ylim(0, 11)
    bottom.set_xlim(-0.4, 3.0)
    bottom.legend(loc="lower right", frameon=False)

    print(figstyle.save(fig, "28-spin-up-from-idle"))
    print("AtSpeed times:", {k: v for k, v in times.items()},
          f"volts from 30: first {run['applied_v'][0]:.2f}, peak {peak:.2f} at {tp:.2f} s, final {final:.2f}")


if __name__ == "__main__":
    main()
