"""Lesson 31: the homing test's height reading, tick by tick, with and without the sleep.

Data: data/31-homing-20ms-1.csv, data/31-homing-0ms-2.csv (a failing run) and
data/31-homing-0ms-1.csv (a passing one), from probes/Fig31HomingHeight.java: the lesson's own
ElevatorHomingTest, step for step, with Thread.sleep taken from SLEEP_MS, one row per tick() call.
Also in data/: 31-homing-0ms-3..6.csv (all four more fail at -0.3415 m) and 4ms-1, 20ms-2. Each run
is a fresh JVM. Re-measure with:

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    SLEEP_MS=20 tools/figures/measure.sh 31 tools/figures/probes/Fig31HomingHeight.java \\
        tools/figures/data/31-homing-20ms-1.csv
    # then, in that sandbox ($FIGURE_SANDBOX), once per run and per setting:
    #   SLEEP_MS=0 FIGURE_OUT=.../31-homing-0ms-N.csv ./gradlew cleanTest test \\
    #       --tests first.robot.figures.Fig31HomingHeight -q

Output: docs/lessons/v3/images/31-homing-test-height.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle


def load(name):
    with open(figstyle.data_path(name), newline="") as f:
        rows = list(csv.DictReader(f))
    return {k: [float(r[k]) for r in rows] for k in ("tick", "wall_ms", "height_m", "at_bottom", "homed")}


def main():
    figstyle.setup()
    good = load("31-homing-20ms-1.csv")
    bad = load("31-homing-0ms-2.csv")
    lucky = load("31-homing-0ms-1.csv")

    fig, (left, right) = plt.subplots(1, 2, figsize=(figstyle.WIDTH_IN, 4.6), gridspec_kw={"width_ratios": [1.5, 1], "wspace": 0.28})
    for ax in (left, right):
        ax.axhspan(-0.01, 0.03, color="#e8e8e8", zorder=0)
        ax.plot(good["tick"], good["height_m"], color=figstyle.GOAL, linewidth=3.4, label="20 ms sleep")
        ax.plot(lucky["tick"], lucky["height_m"], color=figstyle.ALTERNATE, linewidth=1.8, label="no sleep, passes")
        ax.plot(bad["tick"], bad["height_m"], color=figstyle.MEASURED, linewidth=1.8, label="no sleep, fails")
        ax.set_xlabel("tick of the test")
    left.set_ylabel("height reading (m)")
    left.set_xlim(0, 184)
    left.set_ylim(-0.42, 0.08)
    left.legend(loc="upper right", bbox_to_anchor=(0.93, 0.86), frameon=False)
    left.text(4, 0.0125, "tolerance band", color=figstyle.NEUTRAL, va="bottom")
    left.text(4, -0.37, f"wall clock, whole test:\n{good['wall_ms'][-1] / 1000:.1f} s with the sleep, "
              f"{bad['wall_ms'][-1] / 1000:.2f} s without", color=figstyle.NEUTRAL, va="center", fontsize=9.5)

    right.set_xlim(170, 184)
    right.set_ylim(-0.42, 0.08)
    right.set_xticks([172, 176, 180, 184])
    right.set_title("the last ticks", fontsize=11, color=figstyle.NEUTRAL)
    right.text(183.8, -0.375, "the fail run never\nreads the new zero", color=figstyle.MEASURED, ha="right", va="center", fontsize=9.5)

    print(figstyle.save(fig, "31-homing-test-height"))
    print("final heights: 20 ms %.4f, fail %.4f, pass %.4f; ticks %d/%d/%d; wall %.0f/%.0f/%.0f ms" % (
        good["height_m"][-1], bad["height_m"][-1], lucky["height_m"][-1], len(good["tick"]), len(bad["tick"]),
        len(lucky["tick"]), good["wall_ms"][-1], bad["wall_ms"][-1], lucky["wall_ms"][-1]))
    for n, d in (("20ms", good), ("fail", bad), ("pass", lucky)):
        sw = [int(t) for t, a in zip(d["tick"], d["at_bottom"]) if a][:1]
        hm = [int(t) for t, a in zip(d["tick"], d["homed"]) if a][:1]
        print(n, "switch first read at tick", sw, "isHomed at", hm)


if __name__ == "__main__":
    main()
