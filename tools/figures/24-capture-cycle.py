"""Lesson 24: one capture cycle on a timeline.

Data: data/24-capture-cycle.csv, from probes/Fig24CaptureCycle.java on the Lesson 24 state: the
real Robot loop, Blue 1, RobotTeleop driven through GamepadSim. The script homes (Back), waits
for IDLE and for the stow to finish, sets the robot down at (3.5, 3.2) with a piece 1 m ahead,
presses the left face button (intake), pushes the stick a quarter forward once the arm is down
and the roller is running (time zero), lets go at HOLDING, waits 1 s and pulls the right trigger.
One row per tick. The saved run is the second of four fresh-JVM runs; runs 2 to 4 agreed to the
tick (HANDOFF 34 ticks after the drive starts, HOLDING 56 ticks after HANDOFF, SCORING one tick),
and run 1 had HANDOFF at 33. Re-measure with:

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    tools/figures/measure.sh 24 tools/figures/probes/Fig24CaptureCycle.java \\
        tools/figures/data/24-capture-cycle.csv

Output: docs/lessons/v3/images/24-capture-cycle.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle

DT = 0.02
STATE_COLORS = {
    "IDLE": "#dddddd",
    "INTAKING": "#F0E442",
    "HANDOFF": "#E69F00",
    "HOLDING": "#8FD694",
    "SCORING": "#56B4E9",
}


def load():
    with open(figstyle.data_path("24-capture-cycle.csv"), newline="") as f:
        rows = list(csv.DictReader(f))
    t0 = next(int(r["tick"]) for r in rows if r["ev"] == "drive_start")
    d = {k: [] for k in ("t", "state", "arm", "elev", "beam", "goal", "ev")}
    for r in rows:
        d["t"].append((int(r["tick"]) - t0) * DT)
        d["state"].append(r["state"])
        d["arm"].append(float(r["arm_deg"]))
        d["elev"].append(float(r["elevator_m"]))
        d["beam"].append(int(r["beam_break"]))
        d["goal"].append(int(r["elevator_at_goal"]) and int(r["arm_at_goal"]))
        d["ev"].append(r["ev"])
    return d


def first(d, cond):
    return next(d["t"][i] for i in range(len(d["t"])) if cond(i))


def bands(ax, t, values, colors, label_min=0.25):
    run = 0
    for i in range(1, len(t) + 1):
        if i == len(t) or values[i] != values[run]:
            x0, x1 = t[run], (t[i] if i < len(t) else t[-1] + DT)
            ax.axvspan(x0, x1, color=colors[values[run]])
            if x1 - x0 > label_min:
                ax.text((x0 + x1) / 2, 0.5, values[run], ha="center", va="center", fontsize=9.5)
            run = i
    ax.set_yticks([])
    ax.grid(False)
    ax.spines["left"].set_visible(False)


def main():
    figstyle.setup()
    d = load()
    t = d["t"]
    beam = first(d, lambda i: d["beam"][i] == 1)
    handoff = first(d, lambda i: d["state"][i] == "HANDOFF")
    holding = first(d, lambda i: d["state"][i] == "HOLDING")
    score = first(d, lambda i: d["ev"][i] == "score_press")
    scoring = first(d, lambda i: d["state"][i] == "SCORING")
    idle = first(d, lambda i: d["state"][i] == "IDLE" and t[i] > scoring)
    arm_down = first(d, lambda i: d["arm"][i] < 0 and t[i] > -1.0)
    press = t[0]

    fig, axes = plt.subplots(
        4, 1, sharex=True, figsize=(figstyle.WIDTH_IN, 8.0),
        gridspec_kw={"height_ratios": [0.9, 0.5, 1.7, 1.7], "hspace": 0.18})
    st, goal, arm, elev = axes

    bands(st, t, d["state"], STATE_COLORS)
    st.set_ylabel("state", rotation=0, ha="right", va="center")

    gc = {1: "#8FD694", 0: "#ffffff"}
    bands(goal, t, d["goal"], gc, label_min=99)
    goal.set_ylabel("elevator and\narm at goal", rotation=0, ha="right", va="center")
    goal.set_ylim(0, 1)

    arm.plot(t, d["arm"], color=figstyle.MEASURED)
    arm.axhline(0, color=figstyle.NEUTRAL, linewidth=1)
    arm.text(t[0] + 0.05, 4, "horizontal", color=figstyle.NEUTRAL, ha="left", va="bottom")
    arm.set_ylabel("arm angle (deg)")

    elev.plot(t, d["elev"], color=figstyle.MEASURED)
    elev.set_ylabel("elevator height (m)")
    elev.set_xlabel("time since the drive started (s)")
    elev.set_xlim(t[0], t[-1])

    marks = [
        (press, "intake\nrequest", 0),
        (0.0, "quarter-stick\ndrive starts", 1),
        (beam, "beam break\nsees it", 0),
        (handoff, "HANDOFF\n(debounced)", 1),
        (holding, "HOLDING", 0),
        (score, "score\nrequest", 1),
    ]
    for x, label, row in marks:
        for ax in axes:
            ax.axvline(x, color=figstyle.NEUTRAL, linestyle="--", linewidth=1, zorder=0)
        st.text(x, 1.04 + row * 0.62, f"{label}\n{x:.2f} s", ha="center", va="bottom", fontsize=9, color="#444444")
    goal.annotate("SCORING lasts\none tick", xy=(scoring + 0.01, 1.0), xytext=(3.1, 0.4), ha="left", va="center",
                  fontsize=9, color="#444444", arrowprops=dict(arrowstyle="->", color="#444444"))
    st.set_ylim(0, 1)
    fig.subplots_adjust(top=0.88)

    print(figstyle.save(fig, "24-capture-cycle"))
    n = lambda a, b: round((b - a) / DT)
    print(f"press {press:.2f} arm<0 {arm_down:.2f} beam {beam:.2f} HANDOFF {handoff:.2f} ({n(0, handoff)} ticks) "
          f"HOLDING {holding:.2f} ({n(handoff, holding)} after HANDOFF) SCORING {scoring:.2f} IDLE {idle:.2f}")
    hi = [d["elev"][i] for i in range(len(t)) if d["state"][i] == "HOLDING"]
    print("elevator at HOLDING start", hi[0], "arm", d["arm"][t.index(holding)])


if __name__ == "__main__":
    main()
