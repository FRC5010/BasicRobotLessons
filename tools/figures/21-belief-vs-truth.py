"""Lesson 21: the encoder's belief against the carriage's truth, and the snap.

Data: tools/figures/data/21-belief-vs-truth-run1.csv (run 2 is the same measurement
again; the generator prints both runs' numbers), from probes/Fig21Homing.java on the
Lesson 21 state: the real Robot loop, never enabled, Teleoperated picked 3 s in, 25 s
of 20 ms ticks. "Truth" is the height inside ElevatorSim, which only the simulator
knows: the probe reads it by reflection, and no log holds it.

Re-measure:

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    for i in 1 2; do
      tools/figures/measure.sh 21 tools/figures/probes/Fig21Homing.java \
          tools/figures/data/21-belief-vs-truth-run$i.csv
    done

(Picking Teleoperated later, e.g. SELECT_AT_S=25 RECORD_S=28 in the environment, shows the
belief sitting at -0.350 m with the switch pressed until the pick; that run isn't plotted.)

Output: docs/lessons/v3/images/21-belief-vs-truth.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle

X_MAX_S = 20.0
SELECT_AT_S = 3.0


def load(name):
    with open(figstyle.data_path(name), newline="") as f:
        rows = list(csv.DictReader(f))
    return {key: [float(r[key]) for r in rows] for key in rows[0]}


def facts(d):
    t, b, tr, lim = d["t_s"], d["belief_m"], d["truth_m"], d["at_bottom_limit"]
    i = next(k for k in range(len(t)) if lim[k] > 0)
    snap = next(k for k in range(1, len(t)) if b[k] - b[k - 1] > 0.1)
    gap = [round(tr[k] - b[k], 4) for k in range(snap)]
    return {"limit_t": t[i], "snap_t": t[snap], "before": b[snap - 1], "after": b[snap],
            "gap_min": min(gap), "gap_max": max(gap), "belief_at_snap_floor": min(b)}


def main():
    figstyle.setup()
    d = load("21-belief-vs-truth-run1.csv")
    f = facts(d)
    keep = [i for i, t in enumerate(d["t_s"]) if t <= X_MAX_S]
    t = [d["t_s"][i] for i in keep]
    belief = [d["belief_m"][i] for i in keep]
    truth = [d["truth_m"][i] for i in keep]
    limit = [d["at_bottom_limit"][i] for i in keep]

    fig, (top, strip) = plt.subplots(
        2, 1, sharex=True, figsize=(figstyle.WIDTH_IN, 6.2),
        gridspec_kw={"height_ratios": [5, 1], "hspace": 0.10})

    top.axhline(0, color=figstyle.NEUTRAL, linewidth=1)
    top.plot(t, truth, color=figstyle.GOAL, linestyle="--",
             label="where the carriage really is (only the simulator knows)")
    top.plot(t, belief, color=figstyle.MEASURED, label="Elevator/HeightMeters, what the encoder says")
    top.set_ylabel("height (m)")
    top.set_ylim(-0.42, 0.42)
    top.legend(loc="upper right", frameon=False)

    # The gap: the same 35 cm the whole way down.
    k = min(range(len(t)), key=lambda i: abs(t[i] - 9.0))
    top.annotate("", xy=(t[k], belief[k]), xytext=(t[k], truth[k]),
                 arrowprops={"arrowstyle": "<->", "color": figstyle.NEUTRAL, "lw": 1.2,
                             "shrinkA": 0, "shrinkB": 0})
    top.text(t[k] + 0.3, (belief[k] + truth[k]) / 2, f"{(truth[k] - belief[k]) * 100:.0f} cm apart\nthe whole way",
             color=figstyle.NEUTRAL, ha="left", va="center")
    top.text(2.0, -0.30, "the encoder counts every centimeter\nfrom a zero that was never the bottom",
             color=figstyle.NEUTRAL, ha="left", va="center")

    # The snap.
    top.annotate("", xy=(f["snap_t"], f["after"]), xytext=(f["snap_t"], f["before"]),
                 arrowprops={"arrowstyle": "-|>", "color": figstyle.NEUTRAL, "lw": 1.6,
                             "shrinkA": 0, "shrinkB": 0})
    top.text(f["snap_t"] - 0.3, -0.18, f"setPositionMeters replaces\nthe belief: {f['before']:.2f} → {f['after']:.2f} m",
             color=figstyle.NEUTRAL, ha="right", va="center")

    strip.step(t, limit, where="post", color=figstyle.ALTERNATE, linewidth=2.2)
    strip.fill_between(t, limit, step="post", color=figstyle.ALTERNATE, alpha=0.25)
    strip.set_yticks([0, 1])
    strip.set_yticklabels(["false", "true"])
    strip.set_ylim(-0.15, 1.25)
    strip.set_ylabel("AtBottomLimit")
    strip.set_xlabel("time since the robot program's first loop (s)")
    strip.set_xlim(0, X_MAX_S)
    for ax in (top, strip):
        ax.axvline(SELECT_AT_S, color=figstyle.NEUTRAL, linestyle=":", linewidth=1.2)
    top.text(SELECT_AT_S + 0.15, -0.385, "Teleoperated picked", color=figstyle.NEUTRAL, ha="left", va="center")

    print(figstyle.save(fig, "21-belief-vs-truth"))
    for n in (1, 2):
        r = facts(load(f"21-belief-vs-truth-run{n}.csv"))
        print(f"run {n}: " + ", ".join(f"{k} {v:.4f}" for k, v in r.items()))


if __name__ == "__main__":
    main()
