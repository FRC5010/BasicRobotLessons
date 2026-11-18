"""Lesson 18: goal, setpoint and height during one move, and the lag with and without kV.

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
    top.plot(t, model["setpoint_m"], color=figstyle.SETPOINT, label="setpoint (SetpointMeters)")
    top.plot(t, model["height_m"], color=figstyle.MEASURED, label="height (HeightMeters)")
    top.set_ylabel("carriage height (m)")
    top.legend(loc="lower right", frameon=False)

    # The goal-to-setpoint gap: point at it a little after the start, where it's wide.
    i = min(range(len(t)), key=lambda k: abs(t[k] - 0.5))
    top.annotate("", xy=(t[i], model["setpoint_m"][i]), xytext=(t[i], model["goal_m"][i]),
                 arrowprops={"arrowstyle": "<->", "color": figstyle.NEUTRAL, "lw": 1.2})
    top.text(t[i] + 0.06, (model["setpoint_m"][i] + model["goal_m"][i]) / 2,
             "goal − setpoint:\nthe profile still ramping (fine)",
             color=figstyle.NEUTRAL, va="center")

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
    bottom.text(0.01, 0.92, "the controller's lag (tune this)", transform=bottom.transAxes,
                color=figstyle.NEUTRAL, va="top")

    print(figstyle.save(fig, "18-height-setpoint-goal"))
    print(f"peak lag: model {max(lag_model):.1f} mm, kV zeroed {max(lag_no_kv):.1f} mm")


if __name__ == "__main__":
    main()
