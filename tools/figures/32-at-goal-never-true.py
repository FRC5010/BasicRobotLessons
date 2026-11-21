"""Lesson 32: the height arrives; AtGoal never says so.

Data: tools/figures/data/32-at-goal-match.csv, made by 32-extract-logs.py from one recorded
session (probes/Fig32AtGoalMatch.java on the Lesson 32 state with kTolerance =
Centimeters.of(0.00002), the real Robot loop). Re-measure with the commands in
32-extract-logs.py's docstring. Plots the first goal step to 0.75 m (step 1).

Output: docs/lessons/v3/images/32-at-goal-never-true.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle

TOLERANCE_MM = 0.00002 * 10  # Centimeters.of(0.00002) in mm


def load(name):
    with open(figstyle.data_path(name), newline="") as f:
        rows = list(csv.DictReader(f))
    return {k: [float(r[k]) for r in rows] for k in rows[0]}


def main():
    figstyle.setup()
    d = load("32-at-goal-match.csv")
    keep = [i for i, s in enumerate(d["step"]) if s == 1.0]
    t = [d["t_s"][i] for i in keep]
    goal = [d["goal_m"][i] for i in keep]
    height = [d["height_m"][i] for i in keep]
    at_goal = [d["real_at_goal"][i] for i in keep]
    err_mm = [(h - g) * 1000 for h, g in zip(height, goal)]
    after = [e for tt, e in zip(t, err_mm) if tt >= 3.0]
    floor = sum(after) / len(after)

    fig, (p1, p2, p3) = plt.subplots(
        3, 1, sharex=True, figsize=(figstyle.WIDTH_IN, 8.0),
        gridspec_kw={"height_ratios": [3, 1.2, 3], "hspace": 0.16})

    p1.step(t, goal, where="post", color=figstyle.GOAL, linestyle="--", label="GoalMeters (what was asked)")
    p1.plot(t, height, color=figstyle.MEASURED, label="HeightMeters (what the carriage did)")
    p1.set_ylabel("height (m)")
    p1.legend(loc="lower right", frameon=False)
    p1.text(0.62, 0.55, "the height arrives, cleanly,\nin about 1.3 s", transform=p1.transAxes,
            color=figstyle.NEUTRAL, ha="left")

    p2.step(t, at_goal, where="post", color=figstyle.MEASURED, label="RealOutputs/Elevator/AtGoal")
    p2.set_ylim(-0.15, 1.15)
    p2.set_yticks([0, 1], ["false", "true"])
    p2.legend(loc="center right", frameon=False)
    p2.set_ylabel("AtGoal")
    p2.text(0.5, 0.62, "false the whole time", transform=p2.transAxes, color=figstyle.NEUTRAL, ha="center")

    p3.plot(t, err_mm, color=figstyle.MEASURED, label="HeightMeters − GoalMeters, in millimetres")
    p3.axhline(0, color=figstyle.NEUTRAL, linewidth=1)
    p3.axhline(floor, color=figstyle.NEUTRAL, linewidth=1, linestyle=":")
    p3.set_ylim(-1.2, 2.3)
    p3.set_ylabel("height − goal (mm), zoomed")
    p3.set_xlabel("time since the goal stepped to 0.75 m (s)")
    p3.legend(loc="upper right", frameon=False, bbox_to_anchor=(1.0, 1.02))
    p3.text(0.03, 0.93, "the first second is off the scale\n(the carriage is still climbing)", transform=p3.transAxes,
            color=figstyle.NEUTRAL, va="top", ha="left")
    p3.annotate("settles 0.15 to 0.19 mm short\nand stays there",
                xy=(4.2, floor), xytext=(2.4, -0.75), color=figstyle.NEUTRAL, ha="left",
                arrowprops={"arrowstyle": "->", "color": figstyle.NEUTRAL})
    p3.annotate(f"AtGoal wants ±{TOLERANCE_MM:.4f} mm,\na band thinner than this line",
                xy=(5.3, 0.0), xytext=(2.9, 0.75), color=figstyle.NEUTRAL, ha="left",
                arrowprops={"arrowstyle": "->", "color": figstyle.NEUTRAL})
    p3.set_xlim(-0.5, 5.8)

    print(figstyle.save(fig, "32-at-goal-never-true"))
    print(f"settled error {floor:.3f} mm; peak {max(err_mm):.2f} mm")


if __name__ == "__main__":
    main()
