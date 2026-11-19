"""Lesson 33, section 8: how far the elevator travels under a SysId ramp or step.

Data: data/33-elevator-{ramp-1.0,ramp-0.5,ramp-0.25,step-7,step-4,step-2}.csv, from
probes/Fig33ElevatorRoom.java: the real Elevator and ElevatorIOSim driven open loop through a
real SysIdRoutine (forward), on the Lesson 33 state with the physics widened to +-20 m and
started at 0 (RIG method; one scenario per JVM). Re-measure (the first command builds the
sandbox, the rest reuse it; the three --replace lines widen the rig):

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    tools/figures/measure.sh 33 tools/figures/probes/Fig33ElevatorRoom.java \\
        tools/figures/data/33-elevator-ramp-1.0.csv \\
        --replace Constants.java "kMinHeight = Meters.of(0.0);" "kMinHeight = Meters.of(-20.0);" \\
        --replace Constants.java "kMaxHeight = Meters.of(1.5);" "kMaxHeight = Meters.of(20.0);" \\
        --replace Constants.java "kSimStartHeight = Centimeters.of(35);" "kSimStartHeight = Centimeters.of(0);"
        (env MODE=ramp RATE=1.0)
    then in $FIGURE_SANDBOX, for each of MODE=ramp RATE=0.5 / 0.25 and MODE=step VOLTS=7 / 4 / 2:
        env MODE=... FIGURE_OUT=tools/figures/data/33-elevator-....csv \\
            ./gradlew cleanTest test --tests 'first.robot.figures.Fig33ElevatorRoom' -q

Time base: the probe's clock starts about one 20 ms tick before the routine's own timer does
(the logged applied volts read 2.95 V at 2.996 s on the 1 V/s ramp), so the commanded voltage
is drawn as rate x (t - 0.02 s). Unshifted, the 6 V distances read about 0.5% lower than the
lesson's 1.885 / 3.794 / 7.605 m (one tick of travel is 1 cm at 6 V); shifted they agree to
about 3 mm. The step rows are the distance at 1.5 s, the routine's own timeout.

Output: docs/lessons/v3/images/33-ramp-room-elevator.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle

ROOM = 1.5  # ElevatorConstants.kMaxHeight, metres
TICK = 0.02
COLORS = {"1.0": "#D55E00", "0.5": "#E69F00", "0.25": "#8A3A00"}


def load(name):
    with open(figstyle.data_path(name), newline="") as f:
        return [[float(x) for x in row] for row in list(csv.reader(f))[1:]]


def main():
    figstyle.setup()
    fig, (top, bottom) = plt.subplots(
        2, 1, figsize=(figstyle.WIDTH_IN, 7.4), gridspec_kw={"height_ratios": [3, 1.6], "hspace": 0.38})

    ends = {}
    marks = {}
    for rate in ("1.0", "0.5", "0.25"):
        rows = load(f"33-elevator-ramp-{rate}.csv")
        r = float(rate)
        volts = [r * (t - TICK) for t, _, _ in rows]
        height = [h for _, _, h in rows]
        keep = [i for i, v in enumerate(volts) if v <= 6.0]
        top.plot([volts[i] for i in keep], [height[i] for i in keep], color=COLORS[rate])
        ends[rate] = height[keep[-1]]
        if rate == "1.0":
            for v in (3.0, 4.5):
                i = min(range(len(volts)), key=lambda k: abs(volts[k] - v))
                marks[v] = height[i]
        top.text(6.05, ends[rate], f"{ends[rate]:.1f} m  ({rate} V/s)", color=COLORS[rate],
                 va="center", fontweight="bold")
    top.axhline(ROOM, color=figstyle.GOAL, linestyle="--", linewidth=1.2)
    top.text(6.05, ROOM - 0.12, "the elevator's whole\ntravel, 1.5 m", va="top", fontsize=10)
    for v, h in marks.items():
        top.plot([v], [h], marker="o", color=COLORS["1.0"], markeredgecolor="white", markersize=9, zorder=5)
        top.annotate(f"{h:.1f} m at {v:g} V" if h > 0.8 else f"{h:.2f} m at {v:g} V", xy=(v, h),
                     xytext=(3.3 if v == 3.0 else 5.1, 0.18), va="center",
                     color=COLORS["1.0"], fontsize=10,
                     arrowprops={"arrowstyle": "-", "color": COLORS["1.0"]})
    top.set_xlim(0, 9.1)
    top.set_ylim(0, 8.3)
    top.set_xticks(range(0, 7))
    top.set_xlabel("voltage the ramp has reached (V)")
    top.set_ylabel("distance travelled (m)")

    steps = {}
    for v in ("7", "4", "2"):
        rows = load(f"33-elevator-step-{v}.csv")
        steps[v] = max(h for t, _, h in rows if t <= 1.5)
    bars = bottom.barh([f"{v} V step" for v in steps], list(steps.values()), color=figstyle.MEASURED, height=0.55)
    for bar, h in zip(bars, steps.values()):
        bottom.text(h + 0.02, bar.get_y() + bar.get_height() / 2, f"{h:.2f} m", va="center")
    bottom.axvline(ROOM, color=figstyle.GOAL, linestyle="--", linewidth=1.2)
    bottom.set_xlim(0, 1.9)
    bottom.set_xlabel("distance travelled in the dynamic test's first 1.5 s (m)")
    bottom.invert_yaxis()
    bottom.grid(axis="y", visible=False)

    print(figstyle.save(fig, "33-ramp-room-elevator"))
    print({k: round(v, 3) for k, v in ends.items()}, {k: round(v, 3) for k, v in marks.items()},
          {k: round(v, 3) for k, v in steps.items()})


if __name__ == "__main__":
    main()
