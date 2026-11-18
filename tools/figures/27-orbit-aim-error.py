"""Lesson 27: aim error while circling tag 20, P only against P plus feedforward, at 3 and 2 m/s.

Data: data/27-orbit-aim-error-{P,FF}-{3,2}.csv, from probes/Fig27Orbit.java on the Lesson 27
state: the real Robot loop, a drive command the probe schedules (counter-clockwise orbit of tag 20 at
3 m, radial P of 2.0 on the estimate), the spin from either error x kAimP (P) or
Aim.omegaTowardTag (FF). Each file is one run. Re-measure them with:

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    for m in P FF; do for s in 3 2; do
      MODE=$m SPEED=$s tools/figures/measure.sh 27 tools/figures/probes/Fig27Orbit.java \\
          tools/figures/data/27-orbit-aim-error-$m-$s.csv
    done; done

(measure.sh reads MODE and SPEED from the environment.) Repeat a feedforward run if it caught a
camera correction (see the lesson); the figure uses a run that did not.

Output: docs/lessons/v3/images/27-orbit-aim-error.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle

K_AIM_P = 4.0  # PathConstants.kAimP


def load(mode, speed):
    with open(figstyle.data_path(f"27-orbit-aim-error-{mode}-{speed}.csv"), newline="") as f:
        rows = list(csv.DictReader(f))
    return [float(r["t_s"]) for r in rows], [float(r["est_error_deg"]) for r in rows]


def settled(t, e):
    """The worst error once the robot has settled (after 3 s), the way the lesson's table reads it."""
    return max(abs(v) for tt, v in zip(t, e) if tt >= 3.0)


def main():
    figstyle.setup()
    fig, axes = plt.subplots(2, 1, sharex=True, figsize=(figstyle.WIDTH_IN, 6.6),
                             gridspec_kw={"hspace": 0.14})
    summary = {}
    for ax, speed in zip(axes, (3, 2)):
        predicted = speed / 3.0 / K_AIM_P * 180 / 3.141592653589793  # (v / r) / kAimP, in degrees
        tp, ep = load("P", speed)
        tf, ef = load("FF", speed)
        ax.axhline(predicted, color=figstyle.NEUTRAL, linestyle="--", linewidth=1.4,
                   label=f"predicted: (speed ÷ radius) ÷ kAimP = {predicted:.2f}°")
        ax.plot(tp, ep, color=figstyle.MEASURED, label="P only")
        ax.plot(tf, ef, color=figstyle.ALTERNATE, label="P + feedforward")
        ax.axhline(0, color=figstyle.GOAL, linewidth=1)
        ax.set_ylabel("Aim/ErrorDegrees (°)")
        ax.set_ylim(-1.5, 17 if speed == 3 else 12)
        ax.text(0.01, 0.97, f"{speed} m/s, 3 m from tag 20", transform=ax.transAxes, va="top", fontweight="bold")
        sp, sf = settled(tp, ep), settled(tf, ef)
        summary[speed] = (sp, sf)
        ax.text(8.9, sp - 1.4, f"{sp:.1f}°", color=figstyle.MEASURED, ha="right", va="top", fontweight="bold")
        ax.text(8.9, sf + 0.5, f"{sf:.1f}°", color=figstyle.ALTERNATE, ha="right", va="bottom", fontweight="bold")
        ax.legend(loc="center right", frameon=False, bbox_to_anchor=(1.0, 0.62))
    axes[1].set_xlabel("time since the orbit started (s)")
    axes[1].set_xlim(0, 9)
    print(figstyle.save(fig, "27-orbit-aim-error"))
    print({k: (round(v[0], 3), round(v[1], 3)) for k, v in summary.items()})


if __name__ == "__main__":
    main()
