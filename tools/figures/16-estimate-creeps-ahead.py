"""Lesson 16: how far ahead of the truth the estimate gets, vision off, three drives.

Data: data/16-creep-{gentle,hardstart,fwdrev}-{a,b}.csv from probes/Fig16EstimateCreeps.java
on the Lesson 16 state (real Drivetrain and Localizer, scripted field-relative drive,
cameras not registered). The "-a" run is plotted; "-b" matches it to the centimeter.
Each CSV has the simulated truth and the estimate every 20 ms.

The plotted quantity is how much farther the estimate has travelled than the truth:
the running total of the estimate's x movement minus the truth's, each counted without
sign. On a straight push that is just estimate x minus truth x; for the forward-then-
reverse drive it keeps adding up, where a plain x difference would cancel on the way back.

Re-measure (JAVA_HOME must be JDK 25; repeat each with -b for the second run):
  for sc in gentle hardstart fwdrev; do
    flock <lock> env SCENARIO=$sc VISION=off tools/figures/measure.sh 16 \\
        tools/figures/probes/Fig16EstimateCreeps.java tools/figures/data/16-creep-$sc-a.csv
  done
(VISION=on SCENARIO=fwdrev gives 16-creep-fwdrev-vision-a.csv, kept as a measurement
but not plotted: the cameras pull the estimate back, so "over-counted distance" stops meaning anything.)

Output: docs/lessons/v3/images/16-estimate-creeps-ahead.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle


def load(name):
    with open(figstyle.data_path(name), newline="") as f:
        return list(csv.DictReader(f))


def overcount_cm(rows):
    est = truth = 0.0
    out = [0.0]
    for a, b in zip(rows, rows[1:]):
        est += abs(float(b["est_x"]) - float(a["est_x"]))
        truth += abs(float(b["truth_x"]) - float(a["truth_x"]))
        out.append((est - truth) * 100)
    return out


def main():
    figstyle.setup()
    gentle = load("16-creep-gentle-a.csv")
    hard = load("16-creep-hardstart-a.csv")
    both = load("16-creep-fwdrev-a.csv")

    fig, ax = plt.subplots(figsize=(figstyle.WIDTH_IN, 4.6))
    series = [
        (gentle, figstyle.NEUTRAL, "quarter stick for 3 s"),
        (hard, figstyle.MEASURED, "full stick from a stop, 1.5 s"),
        (both, figstyle.ALTERNATE, "full forward 1.5 s, then full reverse 1.5 s"),
    ]
    ends = []
    for rows, colour, label in series:
        y = overcount_cm(rows)
        t = [float(r["t_s"]) for r in rows]
        ax.plot(t, y, color=colour, label=label)
        ends.append((label, y[-1], max(y)))
    ax.axhline(0, color=figstyle.GOAL, linestyle="--", linewidth=1.2)
    ax.set_xlim(0, 6)
    ax.set_ylim(-14, 112)
    ax.set_xlabel("time since the drive began (s)")
    ax.set_ylabel("distance the estimate is ahead (cm)")
    ax.legend(loc="center right", frameon=False)
    ax.text(5.9, -4, "the truth: no gap", color=figstyle.GOAL, ha="right", va="top")
    for (label, end, peak), (_, colour, _l) in zip(ends, series):
        print(f"{label}: ends {end:.1f} cm, peak {peak:.1f} cm")
    print(figstyle.save(fig, "16-estimate-creeps-ahead"))


if __name__ == "__main__":
    main()
