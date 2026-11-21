"""Lesson 18: goal, setpoint and height during one move, with and without kV, and the lag.

Data: tools/figures/data/18-height-setpoint-goal.csv (the shipped gains) and
18-height-setpoint-goal-kv0.csv (kElevatorKV zeroed), both from
probes/Fig18HeightSetpointGoal.java on the Lesson 18 state. How to re-measure them
is in tools/figures/README.md.

Output: docs/lessons/v3/images/18-height-setpoint-goal.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle


def load(name):
    with open(figstyle.data_path(name), newline="") as f:
        rows = list(csv.DictReader(f))
    return {key: [float(r[key]) for r in rows] for key in rows[0]}


def main():
    figstyle.setup()
    model = load("18-height-setpoint-goal.csv")
    no_kv = load("18-height-setpoint-goal-kv0.csv")

    fig, (top, bottom) = plt.subplots(
        2, 1, sharex=True, figsize=(figstyle.WIDTH_IN, 6.4),
        gridspec_kw={"height_ratios": [3, 2], "hspace": 0.12})

    t = model["t_s"]
    top.plot(t, model["goal_m"], color=figstyle.GOAL, linestyle="--", label="goal (GoalMeters)")
    # The setpoint is drawn wide underneath, so it still shows where the height covers it.
    top.plot(t, model["setpoint_m"], color=figstyle.SETPOINT, linewidth=5,
             label="setpoint (SetpointMeters)")
    top.plot(t, model["height_m"], color=figstyle.MEASURED, linewidth=1.6,
             label="height (HeightMeters), with the model")
    top.plot(no_kv["t_s"], no_kv["height_m"], color=figstyle.ALTERNATE,
             label="height, kElevatorKV = 0")
    top.set_ylabel("carriage height (m)")
    top.legend(loc="lower right", frameon=False)

    # The goal-to-setpoint gap: point at it a little after the start, where it's wide.
    i = min(range(len(t)), key=lambda k: abs(t[k] - 0.5))
    top.annotate("", xy=(t[i], model["setpoint_m"][i]), xytext=(t[i], model["goal_m"][i]),
                 arrowprops={"arrowstyle": "<->", "color": figstyle.NEUTRAL, "lw": 1.2})
    # Right of the arrow and high up, clear of the axis labels and of the rising curve.
    top.text(t[i] + 0.08, 1.2, "goal \u2212 setpoint:\nthe profile still\nramping (fine)",
             color=figstyle.NEUTRAL, ha="left", va="center")
    top.text(0.98, 0.55, "with the model, setpoint \u2212 height\nis too small to see here:\nthe lower panel zooms in",
             transform=top.transAxes, ha="right", va="center", color=figstyle.NEUTRAL)

    # The kV-less carriage's gap, in the middle of the cruise.
    j = min(range(len(no_kv["t_s"])), key=lambda k: abs(no_kv["t_s"][k] - 1.1))
    sp_j, h_j = no_kv["setpoint_m"][j], no_kv["height_m"][j]
    top.annotate("", xy=(no_kv["t_s"][j], h_j), xytext=(no_kv["t_s"][j], sp_j),
                 arrowprops={"arrowstyle": "<->", "color": figstyle.NEUTRAL, "lw": 1.2})
    top.text(no_kv["t_s"][j] + 0.08, h_j - 0.05, f"kElevatorKV = 0:\n{(sp_j - h_j) * 100:.0f} cm behind",
             color=figstyle.NEUTRAL, ha="left", va="top")

    lag_model = [(s - h) * 1000 for s, h in zip(model["setpoint_m"], model["height_m"])]
    lag_no_kv = [(s - h) * 1000 for s, h in zip(no_kv["setpoint_m"], no_kv["height_m"])]
    bottom.plot(no_kv["t_s"], lag_no_kv, color=figstyle.ALTERNATE,
                label=f"kElevatorKV = 0: peak {max(lag_no_kv):.0f} mm")
    bottom.plot(t, lag_model, color=figstyle.MEASURED,
                label=f"with the model: peak {max(lag_model):.0f} mm")
    bottom.axhline(0, color=figstyle.NEUTRAL, linewidth=1)
    bottom.set_ylabel("setpoint − height (mm)")
    bottom.set_xlabel("time since the move was requested (s)")
    bottom.legend(loc="upper right", frameon=False)
    bottom.text(0.98, 0.42, "opens while the profile speeds up,\nholds through the cruise,\ncloses as it slows",
                transform=bottom.transAxes, color=figstyle.NEUTRAL, ha="right", va="center")

    print(figstyle.save(fig, "18-height-setpoint-goal"))
    print(f"peak lag: model {max(lag_model):.1f} mm, kV zeroed {max(lag_no_kv):.1f} mm")


if __name__ == "__main__":
    main()
