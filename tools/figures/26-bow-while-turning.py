"""Lesson 26: the path bows out sideways while the robot turns.

Data: data/26-bow-turn.csv (the Lesson 26 state, (1, 1, 0 deg) to (5, 4, 90 deg)) and
data/26-bow-noturn.csv (the same trip with the target heading 0 deg instead of 90), both from
probes/Fig26TwoStage.java: the real Robot loop, Blue 1, the "Drive To Pose" opmode, the simulated
truth pose, one run each (a student's own log would use Localizer/Pose, the estimate). The offset is
the truth pose's signed distance from the straight line S to T. Re-measure with:

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    tools/figures/measure.sh 26 tools/figures/probes/Fig26TwoStage.java \\
        tools/figures/data/26-bow-turn.csv
    tools/figures/measure.sh 26 tools/figures/probes/Fig26TwoStage.java \\
        tools/figures/data/26-bow-noturn.csv \\
        --replace Constants.java "Rotation2d.fromDegrees(90));" "Rotation2d.fromDegrees(0));"

Output: docs/lessons/v3/images/26-bow-while-turning.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle

UX, UY = 0.8, 0.6     # the line from (1, 1) to (5, 4) is 5 m long
NX, NY = -0.6, 0.8    # its left-hand normal


def load(name):
    with open(figstyle.data_path(name), newline="") as f:
        rows = list(csv.DictReader(f))
    xs = [1.0] + [float(r["x_m"]) for r in rows]
    ys = [1.0] + [float(r["y_m"]) for r in rows]
    along = [(x - 1) * UX + (y - 1) * UY for x, y in zip(xs, ys)]
    off = [((x - 1) * NX + (y - 1) * NY) * 1000 for x, y in zip(xs, ys)]
    return xs, ys, along, off


def main():
    figstyle.setup()
    tx, ty, ta, to = load("26-bow-turn.csv")
    nx, ny, na, no = load("26-bow-noturn.csv")

    fig, (top, bottom) = plt.subplots(
        2, 1, figsize=(figstyle.WIDTH_IN, 8.2), gridspec_kw={"height_ratios": [3.2, 1.6], "hspace": 0.28})

    top.plot([1, 5], [1, 4], color=figstyle.GOAL, linestyle="--", linewidth=1.3, label="the line from S to T")
    top.plot(tx, ty, color=figstyle.MEASURED, label="turning 90° on the way")
    top.plot(nx, ny, color=figstyle.ALTERNATE, linewidth=1.2, label="same trip, no turn (on the line)")
    top.plot([1, 5], [1, 4], "o", color=figstyle.GOAL, markersize=6)
    top.annotate("S (1, 1)", (1, 1), xytext=(8, -16), textcoords="offset points")
    top.annotate("T (5, 4)", (5, 4), xytext=(-52, 8), textcoords="offset points")
    i = max(range(len(to)), key=lambda k: abs(to[k]))
    px, py = tx[i], ty[i]
    # the foot of the perpendicular on the line, to draw the bow's width
    s = (px - 1) * UX + (py - 1) * UY
    fx, fy = 1 + s * UX, 1 + s * UY
    top.plot([fx, px], [fy, py], color="black", linewidth=1.6)
    top.annotate(f"widest: {abs(to[i]) / 10:.0f} cm\noff the line", (px, py), xytext=(1.2, 3.6),
                 textcoords="data", ha="left", va="center",
                 arrowprops={"arrowstyle": "->", "color": "black"})
    top.set_aspect("equal")
    top.set_xlim(0.7, 5.5)
    top.set_ylim(0.6, 4.5)
    top.set_xlabel("field x (m)")
    top.set_ylabel("field y (m)")
    top.legend(loc="lower right", frameon=False)

    bottom.axhline(0, color=figstyle.GOAL, linestyle="--", linewidth=1.3)
    bottom.plot(ta, to, color=figstyle.MEASURED)
    bottom.plot(na, no, color=figstyle.ALTERNATE)
    bottom.set_xlim(0, 5)
    bottom.set_ylim(-60, 330)
    bottom.set_xlabel("distance along the line (m)")
    bottom.set_ylabel("off the line, to the left (mm)")
    bottom.annotate(f"{max(to):.0f} mm", (ta[i], to[i]), xytext=(14, 4), textcoords="offset points",
                    color=figstyle.MEASURED, va="bottom")
    j = max(range(len(no)), key=lambda k: abs(no[k]))
    bottom.annotate(f"no turn: at most {abs(no[j]):.0f} mm", (2.0, no[min(range(len(na)), key=lambda k: abs(na[k] - 2.0))]), xytext=(2.4, -45),
                    textcoords="data", ha="left", color=figstyle.ALTERNATE,
                    arrowprops={"arrowstyle": "->", "color": figstyle.ALTERNATE})

    print(figstyle.save(fig, "26-bow-while-turning"))
    print(f"bow {max(to):.1f} mm at along {ta[i]:.2f} m (t={i * 0.02:.2f} s); no-turn max {max(no, key=abs):.1f} mm; "
          f"turn end ({tx[-1]:.3f}, {ty[-1]:.3f}), no-turn end ({nx[-1]:.3f}, {ny[-1]:.3f})")


if __name__ == "__main__":
    main()
