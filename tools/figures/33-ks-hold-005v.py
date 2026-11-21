"""Lesson 33: the kS check, holding 0.05 V and watching whether the wheel still turns.

Data: data/33-ks-hold.csv from probes/Fig33HoldVoltage.java: the real Robot loop, Blue 1,
RobotUtility enabled, the idle spin-up left to settle for 3.5 s, then the right bumper (the
holdVoltage(Volts.of(0.05)) binding) held for 12 s. Columns: seconds since the press, whether it is
held, the voltage the motor applied, the wheel's speed (Flywheel inputs). A second run agreed on
every row during the hold (only the idle rows before the press differ in the last digit). Re-measure:

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    tools/figures/measure.sh 33 tools/figures/probes/Fig33HoldVoltage.java \\
        tools/figures/data/33-ks-hold.csv

Output: docs/lessons/v3/images/33-ks-hold-005v.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle

KV_RPS_PER_VOLT = 8.47  # the lesson's 1 / kV (0.118)


def main():
    figstyle.setup()
    with open(figstyle.data_path("33-ks-hold.csv"), newline="") as f:
        rows = list(csv.DictReader(f))
    t = [float(r["t_s"]) for r in rows]
    v = [float(r["applied_v"]) for r in rows]
    w = [float(r["speed_rps"]) for r in rows]
    held = [int(r["test"]) for r in rows]
    # the 10 s the lesson asks for, from the moment the bumper goes down
    idx = [i for i in range(len(t)) if -0.4 <= t[i] <= 10.0]
    t, v, w, held = ([a[i] for i in idx] for a in (t, v, w, held))
    predicted = 0.05 * KV_RPS_PER_VOLT

    fig, (top, mid, bot) = plt.subplots(
        3, 1, sharex=True, figsize=(figstyle.WIDTH_IN, 8.0),
        gridspec_kw={"height_ratios": [2.4, 2.0, 1.2], "hspace": 0.12})

    for ax in (top, mid, bot):
        ax.axvline(0, color=figstyle.NEUTRAL, linestyle=":", linewidth=1.3)
    top.plot(t, w, color=figstyle.MEASURED)
    top.set_ylabel("wheel speed (rot/s)")
    top.set_ylim(-1.5, 33)
    top.text(0.15, 30.9, "bumper down (idle was 30.4 rot/s)", color=figstyle.NEUTRAL, va="center")
    for tt in (1, 2, 3, 5):
        i = min(range(len(t)), key=lambda k: abs(t[k] - tt))
        top.plot(t[i], w[i], "o", color=figstyle.MEASURED, markersize=5)
        top.annotate(f"{w[i]:.2f}" if tt != 1 else f"{w[i]:.1f}", (t[i], w[i]), xytext=(8, 6), textcoords="offset points",
                     color=figstyle.MEASURED)

    mid.plot(t, w, color=figstyle.MEASURED)
    mid.axhline(predicted, color=figstyle.GOAL, linestyle="--", linewidth=1.3,
                label=f"prediction: 0.05 V × {KV_RPS_PER_VOLT} rot/s per volt = {predicted:.2f}")
    mid.axhline(0, color=figstyle.NEUTRAL, linewidth=1)
    mid.set_ylim(-0.2, 3.0)
    mid.set_ylabel("same, zoomed (rot/s)")
    mid.legend(loc="upper right", frameon=False)
    end = w[-1]
    t9 = next(tt for tt, ww in zip(t, w) if tt > 3 and abs(ww - end) < 0.0005)
    mid.annotate(f"settles at {end:.2f} rot/s\nby about {t9:.0f} s; still turning", (9.0, end),
                 xytext=(5.6, 1.0), color=figstyle.MEASURED, arrowprops={"arrowstyle": "->", "color": figstyle.MEASURED})

    bot.plot(t, v, color=figstyle.SETPOINT)
    bot.set_ylabel("applied voltage (V)")
    bot.set_ylim(-0.3, 4.2)
    bot.set_xlabel("seconds since the right bumper went down")
    bot.set_xlim(-0.4, 10)
    bot.text(1.2, 0.6, "0.05 V from about 0.8 s", color=figstyle.SETPOINT, va="bottom")

    print(figstyle.save(fig, "33-ks-hold-005v"))
    for tt in (1, 2, 3, 5, 9, 10):
        i = min(range(len(t)), key=lambda k: abs(t[k] - tt))
        print(tt, w[i])
    first = next(tt for tt, vv in zip(t, v) if tt > 0 and abs(vv - 0.05) < 1e-6)
    print("applied voltage first reads 0.05 at", first, "settles within 0.0005 of final at", t9)


if __name__ == "__main__":
    main()
