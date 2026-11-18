"""Lesson 32: the same match through the fixed code (replay).

Data: tools/figures/data/32-at-goal-match.csv (see 32-extract-logs.py for how the recording and
the replay are made and for the re-measure commands). Plots the first goal step to 0.75 m.

Output: docs/lessons/v3/images/32-replay-fixed-code.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle

TOLERANCE_MM = 1.0  # Centimeters.of(0.1)


def load(name):
    with open(figstyle.data_path(name), newline="") as f:
        rows = list(csv.DictReader(f))
    return {k: [float(r[k]) for r in rows] for k in rows[0]}


def first_true(t, flags, after):
    for tt, f in zip(t, flags):
        if tt >= after and f:
            return tt
    return None


def main():
    figstyle.setup()
    d = load("32-at-goal-match.csv")
    keep = [i for i, s in enumerate(d["step"]) if s == 1.0]
    t = [d["t_s"][i] for i in keep]
    goal = [d["goal_m"][i] for i in keep]
    height = [d["height_m"][i] for i in keep]
    real = [d["real_at_goal"][i] for i in keep]
    replay = [d["replay_at_goal"][i] for i in keep]
    err_mm = [(h - g) * 1000 for h, g in zip(height, goal)]

    fig, (p1, p2, p3) = plt.subplots(
        3, 1, sharex=True, figsize=(figstyle.WIDTH_IN, 7.6),
        gridspec_kw={"height_ratios": [2, 3, 2.4], "hspace": 0.16})

    p1.step(t, goal, where="post", color=figstyle.GOAL, linestyle="--", label="GoalMeters")
    p1.plot(t, height, color=figstyle.MEASURED, label="HeightMeters (recorded)")
    p1.set_ylabel("height (m)")
    p1.legend(loc="lower right", frameon=False)

    p2.axhspan(-TOLERANCE_MM, TOLERANCE_MM, color=figstyle.ALTERNATE, alpha=0.18, linewidth=0,
               label="±1 mm: the fixed tolerance")
    p2.plot(t, err_mm, color=figstyle.MEASURED, label="height − goal (recorded)")
    peak = max(err_mm)
    tp = t[err_mm.index(peak)]
    p2.annotate(f"overshoots by {peak:.1f} mm,\nback out of the band for a tick",
                xy=(tp, peak), xytext=(1.9, 1.9), color=figstyle.NEUTRAL, ha="left",
                arrowprops={"arrowstyle": "->", "color": figstyle.NEUTRAL})
    p2.set_ylim(-2.4, 3.0)
    p2.set_xlim(0.5, 3.0)
    p2.set_ylabel("height − goal (mm)")
    p2.legend(loc="lower right", frameon=False)

    # Two on/off traces stacked: the recording's decision below, the replay's above.
    p3.step(t, real, where="post", color=figstyle.MEASURED)
    p3.step(t, [1.7 + r for r in replay], where="post", color=figstyle.ALTERNATE)
    p3.set_ylim(-0.35, 3.3)
    p3.set_yticks([0, 1, 1.7, 2.7])
    p3.set_yticklabels(["false", "true", "false", "true"])
    p3.set_xlabel("time since the goal stepped to 0.75 m (s)")
    p3.text(2.95, 0.55, "RealOutputs/Elevator/AtGoal\n(the typo tolerance, as recorded)",
            color=figstyle.MEASURED, ha="right", va="center")
    p3.text(2.95, 2.15, "ReplayOutputs/Elevator/AtGoal\n(same session, tolerance 1 mm)",
            color=figstyle.ALTERNATE, ha="right", va="center")

    on = first_true(t, replay, 0.5)
    p3.annotate(f"true at {on:.2f} s, one tick false,\ntrue for good from 1.26 s", xy=(on, 2.7), xytext=(on + 0.3, 2.95),
                color=figstyle.NEUTRAL, ha="left", arrowprops={"arrowstyle": "->", "color": figstyle.NEUTRAL})

    print(figstyle.save(fig, "32-replay-fixed-code"))
    print(f"replay first true at {on:.2f} s; peak over goal {peak:.2f} mm")


if __name__ == "__main__":
    main()
