"""Lesson 28: holding 60 rot/s with the full model and with kV and kA zeroed.

Data: data/28-hold-with-without-model.csv (the shipped gains) and
28-hold-with-without-model-zero.csv (kFlywheelKV and kFlywheelKA zeroed, only kP left),
both from probes/Fig28SpinUp.java on the Lesson 28 state: the real Flywheel, started from
a stopped wheel, asked for 60 rot/s and watched for 6 s. Re-measure them with:

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    START_LIST=0 RECORD_S=6 tools/figures/measure.sh 28 tools/figures/probes/Fig28SpinUp.java \\
        tools/figures/data/28-hold-with-without-model.csv
    START_LIST=0 RECORD_S=6 tools/figures/measure.sh 28 tools/figures/probes/Fig28SpinUp.java \\
        tools/figures/data/28-hold-with-without-model-zero.csv \\
        --replace Constants.java "kFlywheelKV = 0.119;" "kFlywheelKV = 0.0;" \\
        --replace Constants.java "kFlywheelKA = 0.105;" "kFlywheelKA = 0.0;"

(measure.sh reads START_LIST and RECORD_S from the environment.)

Output: docs/lessons/v3/images/28-hold-with-without-model.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle

PREDICTED = 18 / 0.419  # 0.3 * (60 - w) = 0.119 * w, from the lesson's arithmetic


def load(name):
    with open(figstyle.data_path(name), newline="") as f:
        rows = list(csv.DictReader(f))
    return {key: [float(r[key]) for r in rows] for key in rows[0] if key != "start_rps"}


def main():
    figstyle.setup()
    model = load("28-hold-with-without-model.csv")
    zero = load("28-hold-with-without-model-zero.csv")

    fig, (top, bottom) = plt.subplots(
        2, 1, sharex=True, figsize=(figstyle.WIDTH_IN, 6.2),
        gridspec_kw={"height_ratios": [3, 1.6], "hspace": 0.12})

    t = model["t_s"]
    final_model = sum(model["velocity_rps"][-50:]) / 50
    final_zero = sum(zero["velocity_rps"][-50:]) / 50
    top.axhline(60, color=figstyle.GOAL, linestyle="--", label="goal: 60 rot/s")
    top.axhline(PREDICTED, color=figstyle.NEUTRAL, linestyle=":", linewidth=1.6,
                label=f"predicted fixed point: {PREDICTED:.2f}")
    top.plot(t, model["velocity_rps"], color=figstyle.MEASURED,
             label=f"full model: settles at {final_model:.2f}")
    top.plot(zero["t_s"], zero["velocity_rps"], color=figstyle.ALTERNATE,
             label=f"kV and kA zeroed: settles at {final_zero:.2f}")
    top.set_ylabel("flywheel speed (rot/s)")
    top.set_ylim(0, 68)
    top.legend(loc="lower right", frameon=False)
    top.annotate("", xy=(5.4, final_zero), xytext=(5.4, 60),
                 arrowprops={"arrowstyle": "<->", "color": figstyle.NEUTRAL, "lw": 1.2})
    top.text(5.3, (final_zero + 60) / 2, f"stays {60 - final_zero:.1f} rot/s\nlow, however\nlong you wait",
             color=figstyle.NEUTRAL, ha="right", va="center")

    bottom.plot(t, model["applied_v"], color=figstyle.MEASURED, label="full model")
    bottom.plot(zero["t_s"], zero["applied_v"], color=figstyle.ALTERNATE, label="kV and kA zeroed")
    bottom.set_ylabel("applied volts (V)")
    bottom.set_xlabel("time since the request for 60 rot/s, from a stopped wheel (s)")
    bottom.set_ylim(0, 10)
    bottom.legend(loc="lower right", frameon=False, ncol=2)

    print(figstyle.save(fig, "28-hold-with-without-model"))
    print(f"full model {final_model:.3f} rot/s on {model['applied_v'][-1]:.2f} V; "
          f"zeroed {final_zero:.3f} rot/s on {zero['applied_v'][-1]:.2f} V; predicted {PREDICTED:.2f}")


if __name__ == "__main__":
    main()
