"""Lesson 25: where Pick Up's roller starts for three marker positions.

Data: data/25-pick-up-timeline.csv (marker at t_ratio 0.1, the shipped PickUp.json),
data/25-marker-0.15.csv and data/25-marker-0.2.csv, all from probes/Fig25PickUp.java on the
Lesson 25 state: the real Robot loop, Blue 1, a fresh launch with the "Pick Up" autonomous
opmode, one row per tick; the two extra runs change only the path file's "t_ratio". The map is
drawn from the Lesson 25 constants: the path is x = 6.0 from y = 7.4 to y = 1.0, the piece is
at (6.0, 3.8), the intake reaches 0.6 m ahead of the robot's centre, and the hub fills x 4.0 to
5.2, y 3.4 to 4.6. Re-measure with:

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    tools/figures/measure.sh 25 tools/figures/probes/Fig25PickUp.java \\
        tools/figures/data/25-pick-up-timeline.csv
    for r in 0.15 0.2; do
      tools/figures/measure.sh 25 tools/figures/probes/Fig25PickUp.java \\
          tools/figures/data/25-marker-$r.csv \\
          --replace ../../../deploy/autos/paths/PickUp.json '"t_ratio": 0.1,' "\\"t_ratio\\": $r,"
    done

Output: docs/lessons/v3/images/25-marker-position.png
"""

import csv

import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

import figstyle

PIECE = (6.0, 3.8)
REACH = 0.6
PATH_X = 6.0
RUNS = [("0.1", "25-pick-up-timeline.csv"), ("0.15", "25-marker-0.15.csv"), ("0.2", "25-marker-0.2.csv")]


def analyse(name):
    with open(figstyle.data_path(name), newline="") as f:
        rows = list(csv.DictReader(f))
    s = next(i for i, r in enumerate(rows) if float(r["remaining_m"]) > 0)
    t0 = float(rows[s]["t_s"])
    R = rows[s:]

    def t(r):
        return float(r["t_s"]) - t0

    intaking = next(i for i, r in enumerate(R) if r["state"] == "INTAKING")
    roller = next(r for r in R if abs(float(r["roller_rps"])) > 0.5 and t(r) > 1.0)
    beam = next((r for r in R if r["beam_break"] == "1"), None)
    return {
        "marker_y": float(R[intaking - 1]["y_m"]),   # the loop before INTAKING
        "marker_t": t(R[intaking - 1]),
        "roller_y": float(roller["y_m"]), "roller_t": t(roller),
        "beam_y": None if beam is None else float(beam["y_m"]),
        "beam_t": None if beam is None else t(beam),
    }


def main():
    figstyle.setup()
    fig, axes = plt.subplots(1, 3, sharey=True, figsize=(figstyle.WIDTH_IN, 6.6),
                             gridspec_kw={"wspace": 0.06})
    out = {}
    for ax, (ratio, name) in zip(axes, RUNS):
        a = analyse(name)
        out[ratio] = a
        ax.add_patch(Rectangle((4.0, 3.4), 1.2, 1.2, color="#cccccc", zorder=1))
        ax.text(4.6, 4.0, "hub", ha="center", va="center", color="#555555", fontsize=9)
        ax.plot([PATH_X, PATH_X], [7.4, 1.0], color=figstyle.NEUTRAL, linewidth=1.5, zorder=2)
        ax.annotate("", xy=(PATH_X, 1.0), xytext=(PATH_X, 1.8), arrowprops=dict(arrowstyle="-|>", color=figstyle.NEUTRAL))
        ax.axhline(PIECE[1] + REACH, color=figstyle.GOAL, linestyle="--", linewidth=1, zorder=2)
        ax.plot(*PIECE, marker="*", color="#009E73", markersize=14, markeredgecolor="black", zorder=5, linestyle="")
        ax.plot(PATH_X, a["marker_y"], marker="o", markerfacecolor="white", markeredgecolor="black",
                markersize=9, zorder=6, linestyle="")
        ax.plot(PATH_X, a["roller_y"], marker="s", color=figstyle.MEASURED, markersize=9, zorder=6, linestyle="")
        box = dict(facecolor="white", edgecolor="none", pad=1.5)
        ax.text(6.25, a["marker_y"] + 0.12, f"marker fires\ny = {a['marker_y']:.1f}", va="bottom", fontsize=8.5, bbox=box)
        ax.text(6.25, a["roller_y"] + 0.28, f"roller starts\ny = {a['roller_y']:.1f}", va="center", fontsize=8.5,
                color=figstyle.MEASURED, bbox=box, zorder=7)
        if a["beam_y"] is not None:
            ax.plot(PATH_X, a["beam_y"], marker="v", color="#0072B2", markersize=8, zorder=6, linestyle="")
            ax.text(6.25, a["beam_y"] - 0.33, f"piece goes in\nat y = {a['beam_y']:.1f}", va="center", fontsize=8.5,
                    color="#0072B2", bbox=box, zorder=7)
        else:
            ax.text(6.25, 3.2, "piece already\nunder the bumper:\nnever caught", va="center", fontsize=8.5, bbox=box)
        ax.set_title(f"t_ratio {ratio}", fontsize=11)
        ax.set_xlim(3.8, 8.0)
        ax.set_ylim(0.8, 7.7)
        ax.set_xticks([4, 5, 6])
        ax.set_xlabel("x (m)")
        ax.grid(False)
    axes[0].set_ylabel("y (m): the robot drives down the page")
    axes[0].text(3.9, 4.7, "piece is 0.6 m\nahead at y = 4.4", fontsize=8.5, va="bottom", ha="left")
    axes[0].text(5.85, 3.8, "piece", fontsize=8.5, ha="right", va="center", color="#007755")
    fig.subplots_adjust(left=0.09, right=0.99, top=0.94, bottom=0.09)
    print(figstyle.save(fig, "25-marker-position"))
    for k, v in out.items():
        print(k, {a: (None if b is None else round(b, 2)) for a, b in v.items()})


if __name__ == "__main__":
    main()
