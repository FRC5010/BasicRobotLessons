"""Lesson 16: the grip limit. Full stick from a stop, then let go, and the true chassis speed.

Data: tools/figures/data/16-creep-hardstart-a.csv, the same measurement as Figure 16.1
(probes/Fig16EstimateCreeps.java, SCENARIO=hardstart, cameras off, Lesson 16 state: real
Drivetrain and Localizer, a scripted full-stick forward drive for 1.5 s, then zero). Each row
holds the stick (a fraction of kMaxSpeed) and the simulated truth position every 20 ms. The
true speed is the truth's x movement per tick; the request is the stick times kMaxSpeed.

The dotted guide is the lesson's own arithmetic, a = kWheelCoF * 9.81 = 11.772 m/s^2, drawn
through the measured ramp; the script prints the slope fitted to the data beside it.

Re-measure (JAVA_HOME must be JDK 25):
    flock <lock> env SCENARIO=hardstart VISION=off tools/figures/measure.sh 16 \\
        tools/figures/probes/Fig16EstimateCreeps.java tools/figures/data/16-creep-hardstart-a.csv

Output: docs/lessons/v3/images/16-grip-limit.png
"""

import csv

import matplotlib.pyplot as plt
import numpy as np

import figstyle

K_MAX_SPEED = 101.08 / 6.75 * np.pi * 0.1016  # DriveConstants.kMaxSpeed, m/s
GRIP = 1.2 * 9.81                              # kWheelCoF * 9.81, m/s^2


def main():
    figstyle.setup()
    with open(figstyle.data_path("16-creep-hardstart-a.csv"), newline="") as f:
        rows = list(csv.DictReader(f))
    t = np.array([float(r["t_s"]) for r in rows])
    cmd = np.array([float(r["command"]) for r in rows]) * K_MAX_SPEED
    x = np.array([float(r["truth_x"]) for r in rows])
    v = np.diff(x) / 0.02
    tv = t[1:]  # the speed over the tick that ends at t

    up = (tv > 0.05) & (tv < 1.5) & (v > 0.1) & (v < 0.9 * v.max())
    slope_up = np.polyfit(tv[up], v[up], 1)
    down = (tv > 1.52) & (v < 0.9 * v.max()) & (v > 0.1)
    slope_dn = np.polyfit(tv[down], v[down], 1)
    print(f"speed-up slope {slope_up[0]:.2f} m/s^2, slow-down slope {slope_dn[0]:.2f} m/s^2, "
          f"top speed {v.max():.3f} m/s, kMaxSpeed {K_MAX_SPEED:.3f}, 90% reached at "
          f"{tv[np.argmax(v > 0.9 * v.max())]:.2f} s")

    fig, ax = plt.subplots(figsize=(figstyle.WIDTH_IN, 4.4))
    ax.step(t, cmd, where="post", color=figstyle.GOAL, linestyle="--", label="requested speed (the stick)")
    ax.plot(tv, v, color=figstyle.MEASURED, label="true chassis speed")
    # the lesson's number, drawn through the start of the ramp and the end of it
    t0 = 0.30 - np.interp(0.30, tv, v) / GRIP
    g = np.array([t0, t0 + K_MAX_SPEED / GRIP])
    ax.plot(g, [0, K_MAX_SPEED], color=figstyle.NEUTRAL, linestyle=":", linewidth=1.6)
    t1 = tv[(tv > 1.0) & (v > 0.999 * v.max())].max()  # last tick at top speed
    t_stop = t1 + K_MAX_SPEED / GRIP
    ax.plot([t1, t_stop], [K_MAX_SPEED, 0], color=figstyle.NEUTRAL, linestyle=":", linewidth=1.6)
    ax.annotate("slope 11.77 m/s²\n(1.2 × 9.81)", xy=(0.19, 2.2), xytext=(0.55, 3.3),
                color="#555555", va="center", arrowprops=dict(arrowstyle="-", color="#777777"))
    ax.annotate("same slope on the way down", xy=(1.72, 2.4), xytext=(1.95, 3.2),
                color="#555555", arrowprops=dict(arrowstyle="-", color="#777777"))
    ax.set_xlim(0, 2.3)
    ax.set_ylim(-0.2, 5.6)
    ax.set_xlabel("time since the drive began (s)")
    ax.set_ylabel("chassis speed (m/s)")
    ax.legend(loc="center", frameon=False, bbox_to_anchor=(0.4, 0.3))
    print(figstyle.save(fig, "16-grip-limit"))


if __name__ == "__main__":
    main()
