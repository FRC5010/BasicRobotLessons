"""Lesson 32, section 8: Aim While Driving with the right tag (20) and the typo (220).

Data: data/32-aim-tag20.csv and data/32-aim-tag220.csv, from probes/Fig32AimTypo.java on the
Lesson 32 state (Blue 1, the "Aim While Driving" auto, enabled at tick 105, LOOP method; one
row per 20 ms tick). Time zero in the plot is the first tick the path reports distance left
(the drive starts about 4.2 s after enable, once the robot has homed and settled). Re-measure:

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    tools/figures/measure.sh 32 tools/figures/probes/Fig32AimTypo.java \\
        tools/figures/data/32-aim-tag20.csv
    tools/figures/measure.sh 32 tools/figures/probes/Fig32AimTypo.java \\
        tools/figures/data/32-aim-tag220.csv \\
        --replace Constants.java "kAimTagId = 20;" "kAimTagId = 220;"

Heading is the estimate's (Localizer/Pose). Top panel: heading, with the span where
FollowPath/rotationOverrideActive is true shaded. Bottom panel: Aim/ErrorDegrees, plotted only
on ticks where that topic exists; with 220 it never does, so there is nothing to plot.

Output: docs/lessons/v3/images/32-aim-typo-heading.png
"""

import csv
import math

import matplotlib.pyplot as plt

import figstyle


def load(tag):
    with open(figstyle.data_path(f"32-aim-tag{tag}.csv"), newline="") as f:
        rows = list(csv.DictReader(f))
    start = next(float(r["t_s"]) for r in rows
                 if r["remaining_m"] != "nan" and float(r["remaining_m"]) > 0)
    t = [float(r["t_s"]) - start for r in rows]
    return {
        "t": t,
        "head": [float(r["est_heading_deg"]) for r in rows],
        "truth": [float(r["truth_heading_deg"]) for r in rows],
        "on": [r["override_active"] == "1" for r in rows],
        "aim": [(float(r["t_s"]) - start, float(r["aim_error_deg"])) for r in rows
                if r["aim_error_exists"] == "1" and r["override_active"] == "1"],
    }


def main():
    figstyle.setup()
    good, typo = load(20), load(220)
    fig, (top, bottom) = plt.subplots(
        2, 1, sharex=True, figsize=(figstyle.WIDTH_IN, 6.4),
        gridspec_kw={"height_ratios": [3, 1.5], "hspace": 0.14})

    on = [t for t, f in zip(good["t"], good["on"]) if f]
    t_on, t_off = on[0], on[-1] + 0.02
    for ax in (top, bottom):
        ax.axvspan(t_on, t_off, color="#e6e6e6", zorder=0)
    top.text((t_on + t_off) / 2, 38, f"rotationOverrideActive is true\n{t_on:.1f} s to {t_off:.1f} s",
             ha="center", va="top", color=figstyle.NEUTRAL, fontsize=10)
    top.plot(good["t"], good["head"], color=figstyle.ALTERNATE, label="kAimTagId = 20")
    top.plot(typo["t"], typo["head"], color=figstyle.MEASURED, label="kAimTagId = 220 (the typo)")
    i = max(i for i, f in enumerate(good["on"]) if f)
    end = good["head"][i]
    top.annotate(f"{end:.0f}° at release", xy=(good["t"][i], end), xytext=(t_off + 0.3, end - 40),
                 color=figstyle.ALTERNATE, arrowprops={"arrowstyle": "-", "color": figstyle.ALTERNATE})
    top.set_ylabel("heading, Localizer/Pose (°)")
    top.set_ylim(-190, 45)
    top.legend(loc="lower left", frameon=False)

    ts, vs = zip(*good["aim"])
    bottom.plot(ts, vs, color=figstyle.ALTERNATE)
    bottom.text(1.5, 22, "kAimTagId = 20: Aim/ErrorDegrees is logged", color=figstyle.ALTERNATE,
                va="bottom", fontsize=10)
    bottom.text(t_on + 0.1, -8, "kAimTagId = 220: Aim/ErrorDegrees is absent, no samples at all",
                color=figstyle.MEASURED, va="top", fontsize=10, fontweight="bold")
    bottom.axhline(0, color=figstyle.NEUTRAL, linewidth=1)
    bottom.set_ylabel("Aim/ErrorDegrees (°)")
    bottom.set_ylim(-60, 60)
    bottom.set_xlabel("time since the drive started (s)")
    bottom.set_xlim(-0.2, max(good["t"]))

    print(figstyle.save(fig, "32-aim-typo-heading"))
    print(f"override {t_on:.2f}-{t_off:.2f} s ({t_off - t_on:.2f} s); est heading at release "
          f"{end:.1f}, truth {good['truth'][i]:.1f}; typo heading range "
          f"{min(typo['head']):.2f}..{max(typo['head']):.2f}; aim samples {len(good['aim'])} vs 0")


if __name__ == "__main__":
    main()
