"""Lesson 8: turnToHeading(90): heading, command and the finish band (Figure 8.1).

Data: tools/figures/data/08-turn-to-heading.csv, from probes/Fig08TurnToHeading.java on the
Lesson 8 state: the real Drivetrain through the scheduler, 20 ms ticks, from a standstill at
0 degrees, one row per tick for 3 s. Re-measure it with:

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    tools/figures/measure.sh 8 tools/figures/probes/Fig08TurnToHeading.java \\
        tools/figures/data/08-turn-to-heading.csv

Output: docs/lessons/v3/images/08-turn-to-heading.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle

SHOW_S = 1.2
CLAMP = 0.5
KP = 0.02  # HeadingConstants.kP


def load(name):
    with open(figstyle.data_path(name), newline="") as f:
        rows = list(csv.DictReader(f))
    return {key: [float(r[key]) for r in rows] for key in rows[0]}


def main():
    figstyle.setup()
    d = load("08-turn-to-heading.csv")
    t, heading, omega, running = d["t_s"], d["heading_deg"], d["omega"], d["running"]

    # The first tick the command is no longer running: the loop has exited inside the band.
    i_end = next(i for i, r in enumerate(running) if r == 0)
    t_end = t[i_end]
    # The first tick the clamp lets go (omega under the 0.5 limit).
    i_rel = next(i for i, w in enumerate(omega) if i > 0 and w < CLAMP - 1e-9)
    knee = CLAMP / KP  # the error at which kP * error reaches the clamp

    fig, (top, bottom) = plt.subplots(
        2, 1, figsize=(figstyle.WIDTH_IN, 6.4), sharex=True,
        gridspec_kw={"height_ratios": [3, 2], "hspace": 0.12})

    top.axhspan(88, 92, color="#d9d9d9", zorder=0, label="inside the ±2° band")
    top.axhline(90, color=figstyle.GOAL, linestyle="--", label="target: 90°")
    top.plot(t, heading, color=figstyle.MEASURED, label="heading")
    top.axvline(t_end, color=figstyle.NEUTRAL, linewidth=1.2, linestyle=":")
    top.annotate(f"the loop exits at {t_end:.2f} s\nheading {heading[i_end]:.1f}°, command ends",
                 xy=(t_end, heading[i_end]), xytext=(t_end + 0.05, 52), color=figstyle.NEUTRAL,
                 arrowprops={"arrowstyle": "-", "color": figstyle.NEUTRAL, "lw": 1.0})
    top.set_ylabel("heading (°)")
    top.set_ylim(-5, 105)
    top.set_xlim(0, SHOW_S)
    top.legend(loc="lower right", frameon=True, framealpha=1.0, edgecolor="white")

    bottom.axhline(CLAMP, color=figstyle.NEUTRAL, linestyle="--", linewidth=1.2)
    bottom.step(t, omega, where="post", color=figstyle.SETPOINT, label="omega the command sends")
    bottom.axvline(t_end, color=figstyle.NEUTRAL, linewidth=1.2, linestyle=":")
    bottom.axvline(t[i_rel], color=figstyle.NEUTRAL, linewidth=1.0, linestyle=":")
    bottom.text(0.02, CLAMP + 0.02, "the clamp: ±0.5", color=figstyle.NEUTRAL, va="bottom")
    bottom.annotate(f"the clamp lets go at about {t[i_rel]:.2f} s,\nwhen the error falls under {knee:.0f}°",
                    xy=(t[i_rel], omega[i_rel]), xytext=(t[i_rel] + 0.12, 0.33), color=figstyle.NEUTRAL,
                    arrowprops={"arrowstyle": "-", "color": figstyle.NEUTRAL, "lw": 1.0})
    bottom.set_ylim(-0.05, 0.62)
    bottom.set_ylabel("omega (fraction)")
    bottom.set_xlabel("time since the tap (s)")
    bottom.legend(loc="upper right", frameon=False)

    print(figstyle.save(fig, "08-turn-to-heading"))
    print(f"command ends {t_end:.2f} s at {heading[i_end]:.2f} deg; first unclamped tick {t[i_rel]:.2f} s, "
          f"heading {heading[i_rel]:.1f}; max heading {max(heading):.2f}; "
          f"time at clamp {sum(1 for w in omega if abs(w) >= CLAMP - 1e-9) * 0.02:.2f} s")


if __name__ == "__main__":
    main()
