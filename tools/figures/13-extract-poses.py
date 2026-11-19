"""Lesson 13: turn one recorded drive and its two replays into the CSV Figure 13.3 reads.

Record, then replay twice (the replays are done by the commands below, with FIGURE_SANDBOX=$SB):

  # 1. Record: the real Robot loop in SIM, a ten-second drive (probes/Fig13ReplayScaled.java).
  FIGURE_SANDBOX=$SB tools/figures/measure.sh 13 tools/figures/probes/Fig13ReplayScaled.java /tmp/rec13.csv
  cp $SB/logs/akit_*.wpilog /tmp/rec13.wpilog
  # 2. Replay unchanged: kSimMode = Mode.REPLAY.
  (cd $SB && sed -i 's/kSimMode = Mode.SIM;/kSimMode = Mode.REPLAY;/' src/main/java/first/robot/Constants.java \\
   && AKIT_LOG_PATH=/tmp/rec13.wpilog ./gradlew run -q)       # writes logs/akit_..._sim.wpilog
  cp $SB/logs/*_sim.wpilog /tmp/rec13-clean-sim.wpilog; rm $SB/logs/*_sim.wpilog
  # 3. Replay with the lesson's experiment: "* 1.1" on drivePositionMeters in SwerveModule.getPosition().
  (cd $SB && sed -i 's/        m_inputs.drivePositionMeters, Rotation2d/        m_inputs.drivePositionMeters * 1.1, Rotation2d/' \\
        src/main/java/first/robot/subsystems/SwerveModule.java \\
   && AKIT_LOG_PATH=/tmp/rec13.wpilog ./gradlew run -q)
  cp $SB/logs/*_sim.wpilog /tmp/rec13-scaled-sim.wpilog

Then:   python3 tools/figures/13-extract-poses.py /tmp/rec13.wpilog /tmp/rec13-clean-sim.wpilog \\
            /tmp/rec13-scaled-sim.wpilog tools/figures/data/13-replay-scaled-pose.csv

Output columns: series (real = RealOutputs/Drivetrain/Pose of the recording, clean = the same
key of ReplayOutputs in the unchanged replay, scaled = ReplayOutputs/Drivetrain/Pose in the
"* 1.1" replay), t_s, x_m, y_m, heading_deg. Poses are written whenever the value changes.
"""

import csv
import math
import struct
import sys

import wpilog


def poses(path, key):
    t, v = wpilog.read(path)[key]
    return [(ti, *struct.unpack("<ddd", b)) for ti, b in zip(t, v)]


def main(rec, clean, scaled, out):
    series = [("real", poses(rec, "/RealOutputs/Drivetrain/Pose")),
              ("clean", poses(clean, "/ReplayOutputs/Drivetrain/Pose")),
              ("scaled", poses(scaled, "/ReplayOutputs/Drivetrain/Pose"))]
    with open(out, "w", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["series", "t_s", "x_m", "y_m", "heading_deg"])
        for name, rows in series:
            for t, x, y, r in rows:
                w.writerow([name, round(t, 3), x, y, round(math.degrees(r), 3)])
    for name, rows in series:
        print(name, len(rows), "poses, ends at", rows[-1][1:3])


if __name__ == "__main__":
    main(*sys.argv[1:5])
