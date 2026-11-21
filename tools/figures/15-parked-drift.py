"""Lesson 15, Try It #3: a parked robot's estimate drifts under a shaky camera (Figure 15.4).

Data: tools/figures/data/15-parked-drift-{1,2,3}.csv, three runs from
probes/Fig15ParkedDrift.java on the Lesson 15 state with the Try It's camera applied
(a java.util.Random on VisionIOLimelightSim, each frame's x and y scattered by
nextGaussian() * 0.015 * avgDistance / sqrt(tagCount)). The real Robot loop, Blue 1,
RobotTeleop; the left stick is pushed a quarter forward for 15 ticks, then released, and
the estimate (Localizer.getPose) is logged every tick for 60 s from the release. Each run is
its own JVM (the Random is unseeded, so every run differs). Re-measure with:

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    tools/figures/measure.sh 15 tools/figures/probes/Fig15ParkedDrift.java \\
        tools/figures/data/15-parked-drift-1.csv \\
        --replace subsystems/VisionIOLimelightSim.java \\
        "  private long m_frameCount = 0;" \\
        "  private long m_frameCount = 0;
      private final java.util.Random m_random = new java.util.Random();" \\
        --replace subsystems/VisionIOLimelightSim.java \\
        "    return LimelightFrame.withTargets(m_frameCount, robot, tagIds, avgDistance, kLatencyMs);" \\
        "    double spread = 0.015 * avgDistance / Math.sqrt(tagIds.size());
        Pose2d shaky = new Pose2d(robot.getX() + m_random.nextGaussian() * spread,
            robot.getY() + m_random.nextGaussian() * spread, robot.getRotation());
        return LimelightFrame.withTargets(m_frameCount, shaky, tagIds, avgDistance, kLatencyMs);"
    # then, for runs 2 and 3, in the sandbox (FIGURE_SANDBOX, kept by measure.sh):
    FIGURE_OUT=.../15-parked-drift-2.csv ./gradlew cleanTest test --tests 'first.robot.figures.Fig15ParkedDrift'

The robot is "parked" from 1 s after the stick is released (the pose at that tick is the
reference; the estimate is already jittering by then). The y axis is the straight-line
distance of the estimate from that point.

Output: docs/lessons/v3/images/15-parked-drift.png
"""

import csv
import math

import matplotlib.pyplot as plt

import figstyle

PARK_S = 1.0
COLORS = [figstyle.MEASURED, figstyle.SETPOINT, figstyle.ALTERNATE]


def main():
    figstyle.setup()
    fig, ax = plt.subplots(figsize=(figstyle.WIDTH_IN, 4.6))
    ends = []
    for n, color in zip((1, 2, 3), COLORS):
        with open(figstyle.data_path(f"15-parked-drift-{n}.csv"), newline="") as f:
            rows = list(csv.DictReader(f))
        t = [float(r["t_s"]) for r in rows]
        x = [float(r["est_x"]) for r in rows]
        y = [float(r["est_y"]) for r in rows]
        i0 = t.index(PARK_S)
        d = [math.hypot(a - x[i0], b - y[i0]) * 100 for a, b in zip(x[i0:], y[i0:])]
        tt = [a - PARK_S for a in t[i0:]]
        ax.plot(tt, d, color=color, label=f"run {n}")
        ends.append((n, tt[-1], d[-1], color, max(d)))
        print(f"run {n}: {d[-1]:.1f} cm at 60 s, worst {max(d):.1f} cm")
    # label the endpoints, nudged apart
    ordered = sorted(ends, key=lambda e: e[2])
    ys = [e[2] for e in ordered]
    for k in range(1, len(ys)):  # keep labels at least 3.5 cm apart
        ys[k] = max(ys[k], ys[k - 1] + 3.5)
    for (n, t_end, d_end, color, _), y_label in zip(ordered, ys):
        ax.annotate(f"{d_end:.0f} cm", xy=(t_end, d_end), xytext=(t_end + 1.0, y_label),
                    va="center", color=color, annotation_clip=False)
    ax.set_xlabel("time since parking (s)")
    ax.set_ylabel("estimate's distance from where it parked (cm)")
    ax.set_xlim(0, 65)
    ax.set_ylim(0, None)
    ax.legend(loc="upper left", frameon=True, framealpha=1.0, edgecolor="white")
    print(figstyle.save(fig, "15-parked-drift"))


if __name__ == "__main__":
    main()
