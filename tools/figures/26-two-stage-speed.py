"""Lesson 26: speed along the line during the two-stage drive, against the old sketch-then-P design.

Data: data/26-two-stage-speed.csv (the Lesson 26 state) and 26-two-stage-speed-old.csv (the old
design), both from probes/Fig26TwoStage.java: the real Robot loop, Blue 1, the "Drive To Pose"
opmode, (1, 1, 0 deg) to (5, 4, 90 deg), one run each. Speeds are the truth pose's change per tick
(dt = 0.02) along the start-to-target line; the plan speed is
m_alongController.getSetpoint().velocity, read by reflection (a student's own log can't show
it). The old design is the Lesson 11 sketch to 5 cm, then three PIDControllers (kP 3.0, theta 4.0,
2 cm / 1 deg), from commit a2b3576's Drivetrain and Autos. Re-measure them with:

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    tools/figures/measure.sh 26 tools/figures/probes/Fig26TwoStage.java \\
        tools/figures/data/26-two-stage-speed.csv
    # then, for the old design, put it into that sandbox and run the probe again:
    #  - Drivetrain.java: add the fields m_xController, m_yController and m_thetaController
    #    (PIDControllers, kP PathConstants.kAlignP, kPositionTolerance for x and y; theta with
    #    kAlignThetaP, continuous input, kAngleTolerance) and driveToPose, alignToPose and
    #    atPose from `git show a2b3576:code/v3/lesson-26/subsystems/Drivetrain.java`, and rename
    #    m_alongController so the probe doesn't find it;
    #  - Autos.driveToScoringPose: await driveToPose, then alignToPose (same commit's Autos.java);
    #  - then, in the sandbox: FIGURE_OUT=.../26-two-stage-speed-old.csv ./gradlew cleanTest test \\
    #        --tests first.robot.figures.Fig26TwoStage -q

Output: docs/lessons/v3/images/26-two-stage-speed.png
"""

import csv
import math

import matplotlib.pyplot as plt

import figstyle

UX, UY = 0.8, 0.6  # the line from (1, 1) to (5, 4) is 5 m long: (4, 3) / 5


def load(name):
    with open(figstyle.data_path(name), newline="") as f:
        rows = list(csv.DictReader(f))
    t = [float(r["t_s"]) for r in rows]
    x = [float(r["x_m"]) for r in rows]
    y = [float(r["y_m"]) for r in rows]
    speed = [0.0] + [((x[i] - x[i - 1]) * UX + (y[i] - y[i - 1]) * UY) / 0.02 for i in range(1, len(rows))]
    return {
        "t": t, "x": x, "y": y, "speed": speed,
        "plan": [float(r["plan_speed_mps"]) for r in rows],
        "command": [r["command"] for r in rows],
        "at_goal": [int(r["at_goal"]) for r in rows],
    }


def arrival(d):
    return next(t for t, g in zip(d["t"], d["at_goal"]) if t > 1.0 and g == 1)


def handoff(d):
    return next(t for t, c in zip(d["t"], d["command"]) if c != d["command"][0])


def main():
    figstyle.setup()
    new = load("26-two-stage-speed.csv")
    old = load("26-two-stage-speed-old.csv")

    fig, (top, bottom) = plt.subplots(
        2, 1, sharex=True, figsize=(figstyle.WIDTH_IN, 6.6),
        gridspec_kw={"height_ratios": [3, 1.5], "hspace": 0.12})

    top.plot(old["t"], old["speed"], color="#bbbbbb", linewidth=2.4, label="old design: sketch, then P (measured)")
    top.plot(new["t"], new["plan"], color=figstyle.SETPOINT, linewidth=4.5, label="two stages: the plan")
    top.plot(new["t"], new["speed"], color=figstyle.MEASURED, linewidth=1.6, label="two stages: measured speed")
    h_new, h_old = handoff(new), handoff(old)
    a_new, a_old = arrival(new), arrival(old)
    top.axvline(h_new, color=figstyle.NEUTRAL, linestyle=":")
    hi = min(range(len(new["t"])), key=lambda k: abs(new["t"][k] - h_new))
    top.text(h_new + 0.05, 2.7, f"handoff, {h_new:.1f} s:\nstill moving at about {sum(new['speed'][hi - 1:hi + 2]) / 3:.2f} m/s",
             color=figstyle.NEUTRAL, ha="left", va="top")
    top.axvline(h_old, color="#bbbbbb", linestyle=":")
    top.text(h_old - 0.05, 1.7, f"old handover, {h_old:.1f} s:\nnearly stopped", color="#888888", ha="right", va="center")
    top.set_ylabel("speed along the line (m/s)")
    top.set_ylim(-0.3, 4.4)
    top.legend(loc="upper right", frameon=False)
    top.annotate(f"arrived\n{a_new:.2f} s", xy=(a_new, 0), xytext=(a_new + 0.4, 1.0), color=figstyle.MEASURED,
                 ha="center", arrowprops={"arrowstyle": "->", "color": figstyle.MEASURED})

    lag = [s - p for s, p in zip(new["speed"], new["plan"])]
    bottom.plot(new["t"], lag, color=figstyle.MEASURED)
    bottom.axhline(0, color=figstyle.NEUTRAL, linewidth=1)
    peak_i = max(range(len(lag)), key=lambda k: lag[k])
    bottom.annotate(f"+{lag[peak_i]:.2f} m/s while the plan slows", xy=(new["t"][peak_i], lag[peak_i]),
                    xytext=(new["t"][peak_i] + 0.2, lag[peak_i] + 0.0), color=figstyle.NEUTRAL, va="center")
    bottom.set_ylabel("measured \u2212 plan (m/s)")
    bottom.set_xlabel("time since the run started (s)")
    bottom.set_xlim(0, 4.0)
    bottom.set_ylim(-0.5, 0.5)

    print(figstyle.save(fig, "26-two-stage-speed"))
    print(f"new: handoff {h_new:.2f} s at {new['speed'][hi-1]:.3f}/{new['speed'][hi]:.3f} m/s, top {max(new['speed']):.2f}, "
          f"arrived {a_new:.2f} s, lag peak {lag[peak_i]:.3f} at {new['t'][peak_i]:.2f} s; "
          f"old: handover {h_old:.2f} s at {old['speed'][min(range(len(old['t'])), key=lambda k: abs(old['t'][k]-h_old))]:.3f}, "
          f"top {max(old['speed']):.2f}, arrived {a_old:.2f} s")


if __name__ == "__main__":
    main()
