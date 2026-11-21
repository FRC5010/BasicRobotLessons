"""Lesson 25: what happens while the Pick Up auto drives.

Data: data/25-pick-up-timeline.csv, from probes/Fig25PickUp.java on the Lesson 25 state: the
real Robot loop, Blue 1, a fresh launch with the "Pick Up" autonomous opmode, one row per
tick. Time zero in the figure is the first tick B-Line reports path left to drive. Re-measure it
with:

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    tools/figures/measure.sh 25 tools/figures/probes/Fig25PickUp.java \\
        tools/figures/data/25-pick-up-timeline.csv

Output: docs/lessons/v3/images/25-pick-up-timeline.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle

STATE_COLORS = {
    "IDLE": "#dddddd",
    "INTAKING": "#F0E442",
    "HANDOFF": "#E69F00",
    "HOLDING": "#8FD694",
    "SCORING": "#56B4E9",
}
PIECE_Y = 3.8          # the piece's y on the field
REACH = 0.6            # how far ahead of the robot's centre the intake catches it


def load():
    with open(figstyle.data_path("25-pick-up-timeline.csv"), newline="") as f:
        rows = list(csv.DictReader(f))
    start = next(i for i, r in enumerate(rows) if float(r["remaining_m"]) > 0)
    t0 = float(rows[start]["t_s"])
    out = {"t": [], "y": [], "state": [], "arm": [], "roller": [], "beam": [], "elev": [], "left": []}
    for r in rows[start:]:
        t = float(r["t_s"]) - t0
        if t > 3.7:
            break
        out["t"].append(t)
        out["y"].append(float(r["y_m"]))
        out["state"].append(r["state"])
        out["arm"].append(float(r["arm_deg"]))
        out["roller"].append(float(r["roller_rps"]))
        out["beam"].append(int(r["beam_break"]))
        out["elev"].append(float(r["elevator_m"]))
        out["left"].append(float(r["remaining_m"]))
    return out


def first(d, cond):
    for i in range(len(d["t"])):
        if cond(i):
            return d["t"][i]
    return None


def main():
    figstyle.setup()
    d = load()
    t = d["t"]

    marker = first(d, lambda i: d["state"][i] == "INTAKING") - 0.02  # the loop before INTAKING
    arm_down = first(d, lambda i: d["arm"][i] < 0 and t[i] > 1.0)
    roller = first(d, lambda i: abs(d["roller"][i]) > 0.5 and t[i] > 1.0)
    beam = first(d, lambda i: d["beam"][i] == 1)
    holding = first(d, lambda i: d["state"][i] == "HOLDING")
    scoring = first(d, lambda i: d["state"][i] == "SCORING")
    end = first(d, lambda i: d["left"][i] < 0.05 and t[i] > 3.0)
    handoff = first(d, lambda i: d["state"][i] == "HANDOFF")

    fig, axes = plt.subplots(
        4, 1, sharex=True, figsize=(figstyle.WIDTH_IN, 8.4),
        gridspec_kw={"height_ratios": [2.4, 0.7, 1.7, 1.7], "hspace": 0.18})
    ypos, bands, arm, elev = axes

    ypos.plot(t, d["y"], color=figstyle.MEASURED)
    ypos.axhline(PIECE_Y + REACH, color=figstyle.NEUTRAL, linestyle=":")
    ypos.text(0.05, 3.0, "the intake catches the piece when it is 0.6 m ahead of the\ncentre: y = 4.4, for a piece at y = 3.8",
              color=figstyle.NEUTRAL, ha="left", va="top")
    ypos.set_ylabel("robot y (m)")
    ypos.set_ylim(0.5, 8.0)

    # State bands.
    run_start = 0
    for i in range(1, len(t) + 1):
        if i == len(t) or d["state"][i] != d["state"][run_start]:
            name = d["state"][run_start]
            x0, x1 = t[run_start], (t[i] if i < len(t) else t[-1])
            bands.axvspan(x0, x1, color=STATE_COLORS[name])
            if x1 - x0 > 0.3:
                bands.text((x0 + x1) / 2, 0.5, name, ha="center", va="center", fontsize=9.5)
            run_start = i
    bands.set_yticks([])
    bands.set_ylabel("state", rotation=0, ha="right", va="center")
    bands.grid(False)
    bands.spines["left"].set_visible(False)

    arm.plot(t, d["arm"], color=figstyle.MEASURED)
    arm.axhline(0, color=figstyle.NEUTRAL, linewidth=1)
    arm.text(0.05, 4, "horizontal", color=figstyle.NEUTRAL, ha="left", va="bottom")
    arm.set_ylabel("arm angle (deg)")

    elev.plot(t, d["elev"], color=figstyle.MEASURED)
    elev.set_ylabel("elevator height (m)")
    elev.set_xlabel("time since the drive started (s)")
    elev.set_xlim(0, 3.6)

    lines = [(marker, "intake\nevent", 0), (roller, "roller starts,\npiece goes in", 1), (holding, "HOLDING", 0),
             (scoring, "score\nrequest", 1), (end, "path\nends", 0)]
    for x, label, row in lines:
        for ax in axes:
            ax.axvline(x, color=figstyle.NEUTRAL, linestyle="--", linewidth=1, zorder=0)
        ypos.text(x, 8.1 + row * 2.2, f"{label}\n{x:.1f} s", ha="center", va="bottom", fontsize=9.5,
                  color="#444444")
    ypos.set_ylim(0.5, 8.0)
    fig.subplots_adjust(top=0.86)

    print(figstyle.save(fig, "25-pick-up-timeline"))
    print(f"marker {marker:.2f}, arm<0 {arm_down:.2f}, roller {roller:.2f}, beam {beam:.2f}, HANDOFF {handoff:.2f}, "
          f"HOLDING {holding:.2f}, SCORING {scoring:.2f}, end {end:.2f}")
    for name, x in (("roller", roller), ("beam", beam)):
        print(name, "y", d["y"][min(range(len(t)), key=lambda k: abs(t[k] - x))])


if __name__ == "__main__":
    main()
