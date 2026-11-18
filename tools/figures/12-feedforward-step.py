"""Lesson 12: a step in requested wheel speed, with the model, with half a model, and with kP alone.

Data (all from probes/Fig12FeedforwardStep.java on the Lesson 12 state: one SwerveModule,
wheel straight ahead, asked for 2 m/s after two seconds of 0 m/s; the
shipped gains five times, the other settings twice; the "-b" run of each is plotted,
because four of the five shipped-gain runs look like it and "-a" is the odd one, with a
stale reading in the rise):
  12-feedforward-step-kv08-b.csv   the shipped gains, kDriveKV = 0.8, kDriveKP = 0.1
  12-feedforward-step-kv04-b.csv   kDriveKV = 0.4
  12-feedforward-step-kv0-b.csv    kDriveKV = 0.0, so only kP = 0.1 is left

Re-measure (JAVA_HOME must be JDK 25; repeat for the other runs):
  tools/figures/measure.sh 12 tools/figures/probes/Fig12FeedforwardStep.java \\
      tools/figures/data/12-feedforward-step-kv08-b.csv
  tools/figures/measure.sh 12 tools/figures/probes/Fig12FeedforwardStep.java \\
      tools/figures/data/12-feedforward-step-kv04-b.csv \\
      --replace Constants.java "kDriveKV = 0.8;" "kDriveKV = 0.4;"
  tools/figures/measure.sh 12 tools/figures/probes/Fig12FeedforwardStep.java \\
      tools/figures/data/12-feedforward-step-kv0-b.csv \\
      --replace Constants.java "kDriveKV = 0.8;" "kDriveKV = 0.0;"

Output: docs/lessons/v3/images/12-feedforward-step.png
"""

import csv
import math

import matplotlib.pyplot as plt

import figstyle

X_MAX = 1.0
WHEEL_CIRCUMFERENCE = math.pi * 0.1016  # DriveConstants.kWheelCircumferenceMeters
KV = 0.8


def load(name):
    with open(figstyle.data_path(name), newline="") as f:
        rows = list(csv.DictReader(f))
    return {key: [float(r[key]) for r in rows] for key in rows[0]}


def main():
    figstyle.setup()
    model = load("12-feedforward-step-kv08-b.csv")
    half = load("12-feedforward-step-kv04-b.csv")
    kp = load("12-feedforward-step-kv0-b.csv")

    fig, (top, bottom) = plt.subplots(
        2, 1, figsize=(figstyle.WIDTH_IN, 6.8), sharex=True,
        gridspec_kw={"height_ratios": [3, 2], "hspace": 0.12})

    requested = model["requested_mps"][0]
    top.axhline(requested, color=figstyle.GOAL, linestyle="--", label="requested: 2 m/s")
    top.plot(model["t_s"], model["measured_mps"], color=figstyle.MEASURED, label="kDriveKV = 0.8")
    top.plot(half["t_s"], half["measured_mps"], color=figstyle.ALTERNATE, label="kDriveKV = 0.4")
    top.plot(kp["t_s"], kp["measured_mps"], color=figstyle.NEUTRAL, linestyle=":", linewidth=2.6,
             label="kDriveKV = 0 (kP alone)")
    top.set_ylabel("measured wheel speed (m/s)")
    top.set_xlim(0, X_MAX)
    top.set_ylim(0, 3.1)
    top.legend(loc="upper right", ncol=2, frameon=False)
    top.annotate(f"settles at {half['measured_mps'][-1]:.2f} m/s",
                 xy=(0.62, half["measured_mps"][-1]), xytext=(0.62, half["measured_mps"][-1] - 0.3),
                 color=figstyle.ALTERNATE, ha="center", va="top")
    top.annotate(f"settles at {kp['measured_mps'][-1]:.2f} m/s",
                 xy=(0.62, kp["measured_mps"][-1]), xytext=(0.62, kp["measured_mps"][-1] + 0.12),
                 color=figstyle.NEUTRAL, ha="center", va="bottom")

    full = KV * requested / WHEEL_CIRCUMFERENCE
    bottom.axhline(full, color=figstyle.GOAL, linestyle="--", linewidth=1.2)
    bottom.text(X_MAX - 0.01, full + 0.12, f"kV x requested = 0.8 x {requested / WHEEL_CIRCUMFERENCE:.2f} rps = {full:.2f} V",
                color=figstyle.GOAL, ha="right", va="bottom")
    bottom.plot(model["t_s"], model["applied_v"], color=figstyle.MEASURED)
    bottom.plot(half["t_s"], half["applied_v"], color=figstyle.ALTERNATE)
    bottom.plot(kp["t_s"], kp["applied_v"], color=figstyle.NEUTRAL, linestyle=":", linewidth=2.6)
    bottom.set_ylabel("applied drive voltage (V)")
    bottom.set_xlabel("time since the step was requested (s)")
    bottom.set_ylim(0, 6.6)

    print(figstyle.save(fig, "12-feedforward-step"))
    for label, run in (("kV 0.8", model), ("kV 0.4", half), ("kP alone", kp)):
        print(f"{label}: settles {run['measured_mps'][-1]:.3f} m/s on {run['applied_v'][-1]:.2f} V; "
              f"first ticks {run['applied_v'][1:5]}")


if __name__ == "__main__":
    main()
