"""Lesson 9: the first half-second of turnToHeading(90), with and without the cos(error) line (Figure 9.1).

Data: tools/figures/data/09-cosine-with.csv and 09-cosine-without.csv, from
probes/Fig09CosineScrub.java on the Lesson 9 state (module 0, front left; driveDistance(1.0)
runs to its end, then turnToHeading(90) is scheduled). Re-measure with:

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    tools/figures/measure.sh 9 tools/figures/probes/Fig09CosineScrub.java \\
        tools/figures/data/09-cosine-with.csv
    tools/figures/measure.sh 9 tools/figures/probes/Fig09CosineScrub.java \\
        tools/figures/data/09-cosine-without.csv --replace subsystems/SwerveModule.java \\
        "m_driveMotor.setThrottle(speedFraction * alignment);" "m_driveMotor.setThrottle(speedFraction);"

The throttle is the drive motor's applied volts / 12 from its sim state (lags a tick).
Module 0's pinwheel target is atan2(x, -y) = 135 degrees (Drivetrain.commandRotation).

Output: docs/lessons/v3/images/09-cosine-scrub.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle

SHOW_S = 0.8


def load(name):
    with open(figstyle.data_path(name), newline="") as f:
        rows = list(csv.DictReader(f))
    return {k: [float(r[k]) for r in rows] for k in rows[0]}


def main():
    figstyle.setup()
    w, wo = load("09-cosine-with.csv"), load("09-cosine-without.csv")
    # The turn command ends when the (simulated) heading is within 2 degrees of 90.
    end = next(t for t, h in zip(w["t_s"], w["heading_deg"]) if h >= 88.0)

    fig, (a, b) = plt.subplots(2, 1, figsize=(figstyle.WIDTH_IN, 6.2), sharex=True)
    a.axhline(135, color=figstyle.GOAL, linestyle="--", label="module 0's target: 135°")
    a.plot(w["t_s"], w["steer_deg"], color=figstyle.MEASURED, label="steering angle")
    a.set_ylabel("steering angle (°)")
    a.set_ylim(-5, 150)
    a.legend(loc="center left", frameon=True, framealpha=1.0, edgecolor="white")

    b.axhline(0, color=figstyle.NEUTRAL, linewidth=1.0)
    b.plot(wo["t_s"], wo["throttle"], color=figstyle.MEASURED, label="without the cosine line")
    b.plot(w["t_s"], w["throttle"], color=figstyle.ALTERNATE, label="with it")
    b.annotate(f"peak {min(w['throttle']):.2f}: backward,\nand shrinking as the wheel swings",
               xy=(w["t_s"][w["throttle"].index(min(w["throttle"]))], min(w["throttle"])),
               xytext=(0.3, -0.38), color=figstyle.ALTERNATE,
               arrowprops={"arrowstyle": "-", "color": figstyle.ALTERNATE, "lw": 1.0})
    for ax in (a, b):
        ax.axvline(end, color=figstyle.NEUTRAL, linewidth=1.2)
    b.text(end + 0.01, 0.2, "turn command\nfinishes", color=figstyle.NEUTRAL, va="center")
    b.set_ylabel("module 0 drive throttle")
    b.set_ylim(-0.55, 0.6)
    b.set_xlabel("time since turnToHeading(90) starts (s)")
    b.set_xlim(0, SHOW_S)
    b.legend(loc="upper right", frameon=True, framealpha=1.0, edgecolor="white")

    print(figstyle.save(fig, "09-cosine-scrub"))
    print(f"turn ends ~{end:.2f} s; steer angle then {w['steer_deg'][w['t_s'].index(end)]:.1f} deg; "
          f"without: {max(wo['throttle']):.3f} plateau; with: min {min(w['throttle']):.3f}")


if __name__ == "__main__":
    main()
