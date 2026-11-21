"""Lesson 32: turn one recorded session and its replay into the CSV the two plots read.

Record, then replay through the fixed code (the sandbox, a probe and the replay are all done by
one script of the lead's; the commands below are what it runs, with FIGURE_SANDBOX=$SB):

  # 1. Record: the real Robot loop with the typo tolerance, Back then D-pad right / down / right.
  tools/figures/measure.sh 32 tools/figures/probes/Fig32AtGoalMatch.java /tmp/rec.csv \\
      --replace Constants.java "public static final Distance kTolerance = Centimeters.of(0.1);" \\
                               "public static final Distance kTolerance = Centimeters.of(0.00002);"
  cp $SB/logs/akit_*.wpilog /tmp/rec.wpilog
  # 2. Replay through the fix: kTolerance back to Centimeters.of(0.1), kSimMode = Mode.REPLAY.
  (cd $SB && sed -i 's/Centimeters.of(0.00002)/Centimeters.of(0.1)/; s/kSimMode = Mode.SIM;/kSimMode = Mode.REPLAY;/' \\
      src/main/java/first/robot/Constants.java \\
   && AKIT_LOG_PATH=$SB/logs/akit_....wpilog ./gradlew run -q)    # writes logs/akit_..._sim.wpilog
  cp $SB/logs/*_sim.wpilog /tmp/rec-sim.wpilog

Then:   python3 tools/figures/32-extract-logs.py /tmp/rec.wpilog /tmp/rec-sim.wpilog \\
            tools/figures/data/32-at-goal-match.csv

Output columns, one row per 20 ms tick: step (1 for the first goal step to 0.75 m, 2 for the
second), t_s (seconds since that step), goal_m, height_m (the Elevator/HeightMeters input),
real_at_goal (RealOutputs/Elevator/AtGoal, what the recorded code decided) and replay_at_goal
(ReplayOutputs/Elevator/AtGoal, what the fixed code decides about the same readings).
AdvantageKit records a value only when it changes, so every series is held at its last value;
rows are at the instants any of the series changed.
"""

import bisect
import csv
import sys

import wpilog

GOAL = "/RealOutputs/Elevator/GoalMeters"
HEIGHT = "/Elevator/HeightMeters"
REAL = "/RealOutputs/Elevator/AtGoal"
REPLAY = "/ReplayOutputs/Elevator/AtGoal"
WINDOW = (-1.0, 5.9)


def held(series, t):
    times, values = series
    i = bisect.bisect_right(times, t) - 1
    return values[max(i, 0)]


def main(rec, sim, out):
    a = wpilog.read(rec)
    b = wpilog.read(sim)
    gt, gv = a[GOAL]
    steps = [t for t, prev, v in zip(gt[1:], gv, gv[1:]) if abs(v - 0.75) < 1e-9 and prev < 0.5]
    # The first two jumps to 0.75 m after homing (the homing jitter 0.02 -> 0.01 -> 0.02 is not one).
    # Every timestamp any of the series changed at, so no change falls between rows.
    stamps = sorted(set(a[HEIGHT][0]) | set(b[REPLAY][0]) | set(a[REAL][0]) | set(gt))
    rows = []
    for n, step in enumerate(steps[:2], start=1):
        for t in stamps:
            rel = t - step
            if WINDOW[0] <= rel < WINDOW[1]:
                rows.append([n, round(rel, 3), held(a[GOAL], t), held(a[HEIGHT], t),
                             int(held(a[REAL], t)), int(held(b[REPLAY], t))])
    with open(out, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["step", "t_s", "goal_m", "height_m", "real_at_goal", "replay_at_goal"])
        w.writerows(rows)
    print(f"{len(rows)} rows, {len(steps)} steps found, wrote {out}")


if __name__ == "__main__":
    main(*sys.argv[1:4])
