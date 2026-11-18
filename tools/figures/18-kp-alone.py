"""Lesson 18: what kP alone does, moving and holding, against the full model.

Data: tools/figures/data/18-kp-alone-model.csv (the shipped gains) and
18-kp-alone.csv (kElevatorKG, kElevatorKV and kElevatorKA zeroed, so only kP = 20
is left), both from probes/Fig18KpAlone.java on the Lesson 18 state: one move from
stowed to kScoreMid and six seconds from the request. How to re-measure them is in
tools/figures/README.md.

Output: docs/lessons/v3/images/18-kp-alone.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle

HOLD_FROM_S = 1.6  # the move is over by then, in both runs


def load(name):
    with open(figstyle.data_path(name), newline="") as f:
        rows = list(csv.DictReader(f))
    return {key: [float(r[key]) for r in rows] for key in rows[0]}


def main():
    figstyle.setup()
    model = load("18-kp-alone-model.csv")
    kp = load("18-kp-alone.csv")

    fig, (top, bottom) = plt.subplots(
        2, 1, figsize=(figstyle.WIDTH_IN, 6.6),
        gridspec_kw={"height_ratios": [3, 2], "hspace": 0.38})

    # Top: the move itself, in meters.
    t = model["t_s"]
    top.plot(t, model["goal_m"], color=figstyle.GOAL, linestyle="--", label="goal")
    top.plot(t, model["setpoint_m"], color=figstyle.SETPOINT, linewidth=5, label="setpoint")
    top.plot(t, model["height_m"], color=figstyle.MEASURED, linewidth=1.6,
             label="height, with the model")
    top.plot(kp["t_s"], kp["height_m"], color=figstyle.ALTERNATE, label="height, kP alone")
    top.set_xlim(0, 2.5)
    top.set_ylim(0, 0.85)
    top.set_ylabel("carriage height (m)")
    top.set_xlabel("time since the move was requested (s)")
    top.legend(loc="lower right", frameon=False)

    # Point at the widest part of the kP-alone lag.
    gaps = [s - h for s, h in zip(kp["setpoint_m"], kp["height_m"])]
    i = max(range(len(gaps)), key=lambda k: gaps[k])
    top.annotate("", xy=(kp["t_s"][i], kp["height_m"][i]), xytext=(kp["t_s"][i], kp["setpoint_m"][i]),
                 arrowprops={"arrowstyle": "<->", "color": figstyle.NEUTRAL, "lw": 1.2})
    top.text(kp["t_s"][i] + 0.06, (kp["height_m"][i] + kp["setpoint_m"][i]) / 2 - 0.02,
             f"kP alone: {gaps[i] * 100:.0f} cm behind\nwhile it moves",
             color=figstyle.NEUTRAL, ha="left", va="top")

    # Bottom: the hold, zoomed in to millimeters. Measured from the goal, the height
    # you asked for, the way the lesson quotes it.
    def hold(run):
        pts = [(tt, (g - h) * 1000) for tt, g, h in zip(run["t_s"], run["goal_m"], run["height_m"])
               if tt >= HOLD_FROM_S]
        return [p[0] for p in pts], [p[1] for p in pts]

    tk, sk = hold(kp)
    tm, sm = hold(model)
    final_kp = sum(sk[-50:]) / 50
    final_model = sum(sm[-50:]) / 50
    bottom.plot(tk, sk, color=figstyle.ALTERNATE, label=f"kP alone: about {final_kp:.1f} mm low, for good")
    bottom.plot(tm, sm, color=figstyle.MEASURED, label=f"with the model: {final_model:.2f} mm low")
    bottom.axhline(0, color=figstyle.GOAL, linestyle="--", linewidth=1.2)
    bottom.text(tk[0] + 0.05, -0.08, "the height you asked for", color=figstyle.GOAL, va="top")
    bottom.set_ylim(-0.4, 2.4)
    bottom.set_xlim(HOLD_FROM_S, tk[-1])
    bottom.set_ylabel("below the goal (mm)")
    bottom.set_xlabel("the hold, zoomed in: time since the move was requested (s)")
    bottom.legend(loc="center right", frameon=False)

    print(figstyle.save(fig, "18-kp-alone"))
    print(f"kP alone: peak lag {gaps[i] * 1000:.1f} mm at {kp['t_s'][i]:.2f} s, "
          f"holds {final_kp:.2f} mm low; model holds {final_model:.3f} mm low")


if __name__ == "__main__":
    main()
