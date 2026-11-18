"""Lesson 33: what the four SysId tests look like, voltage and speed, at Config.defaults().

Data: tools/figures/data/33-sysid-four-tests.csv, from probes/Fig33FourTests.java on the Lesson 33
state (the real Robot loop, RobotUtility, shipped Config.defaults(): 1 V/s ramp, 7 V step, 10 s
timeout). Re-measure with (one run, fresh JVM; about two minutes):

    FIGURE_SANDBOX=$SCRATCH/figE-sbx tools/figures/measure.sh 33 \\
        tools/figures/probes/Fig33FourTests.java tools/figures/data/33-sysid-four-tests.csv

Plots the forward tests thick and the reverse ones thin. Each test is cut to the 10 s the routine
runs (the probe holds the buttons 0.4 s longer, and the wheel is no longer in the test then).

Output: docs/lessons/v3/images/33-sysid-four-tests.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle

TEST_SECONDS = 10.0


def load():
    with open(figstyle.data_path("33-sysid-four-tests.csv"), newline="") as f:
        rows = list(csv.DictReader(f))
    tests = {}
    for r in rows:
        k = int(r["test"])
        if k:
            tests.setdefault(k, []).append((float(r["t_s"]), float(r["applied_v"]), float(r["speed_rps"])))
    out = {}
    for k, pts in tests.items():
        t0 = pts[0][0]
        out[k] = [(t - t0, v, w) for t, v, w in pts if t - t0 < TEST_SECONDS]
    return out


def cols(pts):
    return [p[0] for p in pts], [p[1] for p in pts], [p[2] for p in pts]


def main():
    figstyle.setup()
    tests = load()
    fig, ax = plt.subplots(2, 2, sharex=True, figsize=(figstyle.WIDTH_IN, 7.2),
                           gridspec_kw={"hspace": 0.12, "wspace": 0.28})
    # Columns: quasistatic (tests 1 forward, 3 reverse), dynamic (2 forward, 4 reverse).
    for col, (fwd, rev, name) in enumerate(((1, 3, "quasistatic (a 1 V/s ramp)"), (2, 4, "dynamic (a 7 V step)"))):
        t, v, w = cols(tests[fwd])
        tr, vr, wr = cols(tests[rev])
        ax[0][col].plot(t, v, color=figstyle.MEASURED, label="forward")
        ax[0][col].plot(tr, vr, color=figstyle.MEASURED, linewidth=1.2, alpha=0.6, label="reverse")
        ax[1][col].plot(t, w, color=figstyle.MEASURED, label="forward")
        ax[1][col].plot(tr, wr, color=figstyle.MEASURED, linewidth=1.2, alpha=0.6, label="reverse")
        ax[0][col].set_title(name, loc="left")
        ax[0][col].axhline(0, color=figstyle.NEUTRAL, linewidth=1)
        ax[1][col].axhline(0, color=figstyle.NEUTRAL, linewidth=1)
        ax[1][col].set_xlabel("time since the test started (s)")
    ax[0][0].set_ylabel("applied voltage (V)")
    ax[1][0].set_ylabel("flywheel speed (rot/s)")
    ax[0][0].legend(loc="upper left", frameon=False)

    # Quasistatic forward: the wheel is still spinning down from idle.
    t, v, w = cols(tests[1])
    i_min = min(range(len(w[:150])), key=lambda i: w[i])
    ax[1][0].axvspan(0, t[i_min], color=figstyle.NEUTRAL, alpha=0.18, linewidth=0)
    ax[0][0].axvspan(0, t[i_min], color=figstyle.NEUTRAL, alpha=0.18, linewidth=0)
    ax[1][0].annotate(f"spinning down from idle:\nignore the shaded part\n(low point {w[i_min]:.0f} rot/s\nat {t[i_min]:.2f} s, {v[i_min]:.2f} V)",
                      xy=(t[i_min], w[i_min]), xytext=(2.6, 8), color=figstyle.NEUTRAL, ha="left", va="center",
                      arrowprops={"arrowstyle": "->", "color": figstyle.NEUTRAL})
    ax[1][0].annotate("idle speed, 30 rot/s", xy=(0, w[0]), xytext=(0.3, 52), color=figstyle.NEUTRAL,
                      arrowprops={"arrowstyle": "->", "color": figstyle.NEUTRAL})

    # Dynamic forward: the plateau and the settling marks.
    t2, v2, w2 = cols(tests[2])
    plateau = sum(w for tt, w in zip(t2, w2) if 9.0 <= tt < 10.0) / sum(1 for tt in t2 if 9.0 <= tt < 10.0)
    ax[1][1].axhline(plateau, color=figstyle.NEUTRAL, linestyle=":", linewidth=1.2)
    marks = {}
    for frac in (0.05, 0.01):
        marks[frac] = next(tt for tt, ww in zip(t2, w2) if tt > 0.3 and abs(ww - plateau) <= frac * plateau)
        ax[1][1].axvline(marks[frac], color=figstyle.NEUTRAL, linewidth=1, linestyle="--")
    ax[1][1].set_ylim(-72, 92)
    ax[1][1].text(marks[0.05] - 0.12, 80, f"within 5%\nat {marks[0.05]:.1f} s", color=figstyle.NEUTRAL, ha="right", va="center")
    ax[1][1].text(marks[0.01] + 0.12, 80, f"within 1%\nat {marks[0.01]:.1f} s", color=figstyle.NEUTRAL, ha="left", va="center")
    ax[1][1].text(9.9, 40, f"plateau {plateau:.1f} rot/s\n= 7 V \u00d7 {plateau / 7:.2f} rot/s per volt", color=figstyle.NEUTRAL, ha="right", va="center")
    ax[1][1].text(9.9, -25, "reverse: the wheel turns\naround first, so it\nlevels off later", color=figstyle.NEUTRAL, ha="right", va="center")

    ax[1][0].set_xlim(0, TEST_SECONDS)
    print(figstyle.save(fig, "33-sysid-four-tests"))
    print(f"qf low {w[i_min]:.2f} rot/s at {t[i_min]:.2f} s ({v[i_min]:.2f} V); df plateau {plateau:.3f}; "
          f"within 5% {marks[0.05]:.2f} s, 1% {marks[0.01]:.2f} s")


if __name__ == "__main__":
    main()
