"""Lesson 14, Figure 14.2: each fake sighting nudges the estimate toward (2, 5).

Data: tools/figures/data/14-sighting-nudges-default.csv (the lesson's code) and
14-sighting-nudges-knob.csv (the lesson's "trust knob" line added to Localizer). Re-measure
(the real Robot loop, a parked robot, Start pressed at 1, 2, 3, 4 and 5 s after enable):

  tools/figures/measure.sh 14 tools/figures/probes/Fig14SightingNudges.java \\
      tools/figures/data/14-sighting-nudges-default.csv
  tools/figures/measure.sh 14 tools/figures/probes/Fig14SightingNudges.java \\
      tools/figures/data/14-sighting-nudges-knob.csv \\
      --replace subsystems/Localizer.java \\
      "    // The drivetrain is the odometry backbone — register it first." \\
      "    m_estimator.setVisionMeasurementStdDevs(org.wpilib.math.linalg.VecBuilder.fill(0.5, 0.5, 999999));
    // The drivetrain is the odometry backbone — register it first."

Output: docs/lessons/v3/images/14-sighting-nudges.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle


def load(name):
    with open(figstyle.data_path(name), newline="") as f:
        rows = list(csv.DictReader(f))
    return {k: [float(r[k]) for r in rows] for k in rows[0]}


def main():
    figstyle.setup()
    d = load("14-sighting-nudges-default.csv")
    k = load("14-sighting-nudges-knob.csv")
    fig, ax = plt.subplots(figsize=(figstyle.WIDTH_IN, 4.4))
    presses = [t for t, p in zip(d["t_s"], d["press"]) if p]
    for t in presses:
        ax.axvline(t, color=figstyle.NEUTRAL, linestyle=":", linewidth=1.2)
    ax.text(presses[0] + 0.05, 5.62, "each dotted line: Start pressed", color=figstyle.NEUTRAL,
            va="bottom", ha="left")
    ax.step(k["t_s"], k["dist_m"], where="post", color=figstyle.ALTERNATE,
            label="with setVisionMeasurementStdDevs(0.5, 0.5, 999999)")
    ax.step(d["t_s"], d["dist_m"], where="post", color=figstyle.MEASURED,
            label="the lesson's code (default trust)")
    ax.axhline(0, color=figstyle.GOAL, linestyle="--", linewidth=1.2)
    ax.text(7.95, 0.12, "(2, 5): where the fake camera says the robot is", color=figstyle.GOAL,
            ha="right", va="bottom")
    start = d["dist_m"][0]
    end_d, end_k = d["dist_m"][-1], k["dist_m"][-1]
    ax.annotate(f"{end_d:.2f} m left after five presses", xy=(7.9, end_d), xytext=(6.3, end_d + 0.9),
                color=figstyle.MEASURED, ha="center", arrowprops={"arrowstyle": "->", "color": figstyle.MEASURED})
    ax.annotate(f"{end_k:.2f} m left", xy=(7.9, end_k), xytext=(6.6, end_k - 1.0), color=figstyle.ALTERNATE,
                ha="center", arrowprops={"arrowstyle": "->", "color": figstyle.ALTERNATE})
    ax.set_xlim(0, 8)
    ax.set_ylim(-0.3, 6.3)
    ax.set_xlabel("time since enable (s)")
    ax.set_ylabel("distance from the estimate to (2, 5) (m)")
    ax.legend(loc="lower left", frameon=False, bbox_to_anchor=(0.0, 0.08))
    print(f"start {start:.3f}; default ends {end_d:.3f}; knob ends {end_k:.3f}")
    print(figstyle.save(fig, "14-sighting-nudges"))


if __name__ == "__main__":
    main()
