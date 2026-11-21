"""Lesson 29: a fresh battery, the same moves under three current-limit configurations.

Data: data/29-fresh-battery-runs-{nolimits,defaults,budget}.csv, one run each, from
probes/Fig29TiredBattery.java (the real Robot loop, Blue 1, Teleop enabled at time zero, Back at
0.5 s to home, D-pad up + left trigger + left face button together at 6 s, held 3 s) on the Lesson 29
state with its own fresh battery (BatterySim.calculateDefaultBatteryLoadedVoltage, no edit to Robot.java).
The probe's columns are the supply currents the robot adds up (Power/TotalCurrentAmps) and the
battery voltage it read that tick (Power/BatteryVolts). Each config was run four times (fresh JVM each);
the run shown is the one nearest the middle of the lesson's range:
  no limits  run 2: peak 199.8 A, low 8.00 V   (runs 1-4: 219/200/199/200 A, 7.62-8.01 V)
  defaults   run 2: peak 110.9 A, low 9.78 V   (runs 1-4: 130/111/141/124 A, 9.17-9.78 V)
  budget     run 3: peak  78.4 A, low 10.43 V  (runs 1-4: 54/96/78/87 A, 10.08-10.93 V)
Re-measure (build once per config, then rerun the sandbox test for more runs):

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    P=tools/figures/probes/Fig29TiredBattery.java
    # the budget is the Lesson 29 state as shipped
    tools/figures/measure.sh 29 $P tools/figures/data/29-fresh-battery-runs-budget.csv
    # no limits: switch both limits off in all three IO classes
    tools/figures/measure.sh 29 $P tools/figures/data/29-fresh-battery-runs-nolimits.csv \\
        --replace subsystems/ElevatorIOTalonFX.java "config.CurrentLimits.StatorCurrentLimitEnable = true;" "config.CurrentLimits.StatorCurrentLimitEnable = false;" \\
        --replace subsystems/ElevatorIOTalonFX.java "config.CurrentLimits.SupplyCurrentLimitEnable = true;" "config.CurrentLimits.SupplyCurrentLimitEnable = false;" \\
        --replace subsystems/FlywheelIOTalonFX.java "config.CurrentLimits.StatorCurrentLimitEnable = true;" "config.CurrentLimits.StatorCurrentLimitEnable = false;" \\
        --replace subsystems/FlywheelIOTalonFX.java "config.CurrentLimits.SupplyCurrentLimitEnable = true;" "config.CurrentLimits.SupplyCurrentLimitEnable = false;" \\
        --replace subsystems/ArmIOTalonFX.java "    config.CurrentLimits.StatorCurrentLimitEnable = true;" "    config.CurrentLimits.StatorCurrentLimitEnable = false;" \\
        --replace subsystems/ArmIOTalonFX.java "    config.CurrentLimits.SupplyCurrentLimitEnable = true;" "    config.CurrentLimits.SupplyCurrentLimitEnable = false;" \\
        --replace subsystems/ArmIOTalonFX.java "rollerConfig.CurrentLimits.StatorCurrentLimitEnable = true;" "rollerConfig.CurrentLimits.StatorCurrentLimitEnable = false;" \\
        --replace subsystems/ArmIOTalonFX.java "rollerConfig.CurrentLimits.SupplyCurrentLimitEnable = true;" "rollerConfig.CurrentLimits.SupplyCurrentLimitEnable = false;"
    # defaults: every motor on Phoenix's defaults (the four limit lines deleted in each config)
    tools/figures/29-fresh-battery-defaults.sh
    # More runs: cd into the sandbox measure.sh printed and run
    #   FIGURE_OUT=... ./gradlew cleanTest test --tests first.robot.figures.Fig29TiredBattery -q

Output: docs/lessons/v3/images/29-fresh-battery-runs.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle

BROWNOUT_V = 6.3   # PowerConstants.kBrownoutVoltage
MOVES_S, RELEASE_S = 6.0, 9.0


def load(name):
    with open(figstyle.data_path(name), newline="") as f:
        rows = list(csv.DictReader(f))
    return {k: [float(r[k]) for r in rows] for k in rows[0]}


def main():
    figstyle.setup()
    runs = [
        ("no limits", "29-fresh-battery-runs-nolimits.csv", figstyle.ALTERNATE),
        ("Phoenix defaults", "29-fresh-battery-runs-defaults.csv", figstyle.SETPOINT),
        ("the budget", "29-fresh-battery-runs-budget.csv", figstyle.MEASURED),
    ]
    fig, (amps, volts) = plt.subplots(
        2, 1, sharex=True, figsize=(figstyle.WIDTH_IN, 6.6),
        gridspec_kw={"height_ratios": [1.1, 1], "hspace": 0.12})
    for label, name, colour in runs:
        d = load(name)
        amps.plot(d["t_s"], d["total_amps"], color=colour, linewidth=1.4, label=label)
        volts.plot(d["t_s"], d["battery_volts"], color=colour, linewidth=1.4, label=label)
        print(f"{label}: peak {max(d['total_amps']):.1f} A, low {min(d['battery_volts']):.2f} V")
    amps.set_ylabel("Power/TotalCurrentAmps (A)")
    amps.set_ylim(-75, 235)
    amps.legend(loc="upper left", frameon=False, bbox_to_anchor=(0.0, 0.93))
    volts.axhline(BROWNOUT_V, color=figstyle.NEUTRAL, linestyle="--")
    volts.text(0.1, BROWNOUT_V + 0.15, "6.3 V: kBrownoutVoltage", color=figstyle.NEUTRAL, ha="left", va="bottom")
    volts.set_ylabel("Power/BatteryVolts (V)")
    volts.set_ylim(5.5, 14.5)
    volts.set_xlabel("time since the robot was enabled (s)")
    volts.set_xlim(0, 10.4)
    for ax in (amps, volts):
        ax.axvline(MOVES_S, color="#bbbbbb", linewidth=1, zorder=0)
        ax.axvline(RELEASE_S, color="#bbbbbb", linewidth=1, zorder=0)
    amps.text(MOVES_S + 0.05, 228, "D-pad up, left trigger,\nintake button pressed", va="top", fontsize=9.5, color="#555555")
    amps.text(RELEASE_S + 0.05, 228, "released", va="top", fontsize=9.5, color="#555555")
    print(figstyle.save(fig, "29-fresh-battery-runs"))


if __name__ == "__main__":
    main()
