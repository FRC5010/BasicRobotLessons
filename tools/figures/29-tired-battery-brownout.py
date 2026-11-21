"""Lesson 29: a tired battery, the budget against no limits, through the same moves.

Data: data/29-tired-battery-brownout-budget.csv and ...-nolimits.csv, one run each, from
probes/Fig29TiredBattery.java on the Lesson 29 state with the tired battery of section 7
(BatterySim.calculateLoadedBatteryVoltage(11.0, 0.04, ...)). The no-limits run also has both
supply and stator limits switched off in the three IO classes. The probe runs the real Robot loop:
Teleop enabled at time zero, Back at 0.5 s to home, then D-pad up, the left trigger and the left
face button together at 6 s, held for 3 s. Re-measure them with (one fresh JVM per run; the
no-limits run browns out in every run, the budget run is a typical one of several):

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    BAT='RoboRioSim.setVInVoltage(BatterySim.calculateDefaultBatteryLoadedVoltage(getTotalCurrentAmps()));'
    TIRED='RoboRioSim.setVInVoltage(BatterySim.calculateLoadedBatteryVoltage(11.0, 0.04, getTotalCurrentAmps()));'
    tools/figures/measure.sh 29 tools/figures/probes/Fig29TiredBattery.java \\
        tools/figures/data/29-tired-battery-brownout-budget.csv --replace Robot.java "$BAT" "$TIRED"
    tools/figures/measure.sh 29 tools/figures/probes/Fig29TiredBattery.java \\
        tools/figures/data/29-tired-battery-brownout-nolimits.csv --replace Robot.java "$BAT" "$TIRED" \\
        --replace subsystems/ElevatorIOTalonFX.java "config.CurrentLimits.StatorCurrentLimitEnable = true;" "config.CurrentLimits.StatorCurrentLimitEnable = false;" \\
        --replace subsystems/ElevatorIOTalonFX.java "config.CurrentLimits.SupplyCurrentLimitEnable = true;" "config.CurrentLimits.SupplyCurrentLimitEnable = false;" \\
        --replace subsystems/FlywheelIOTalonFX.java "config.CurrentLimits.StatorCurrentLimitEnable = true;" "config.CurrentLimits.StatorCurrentLimitEnable = false;" \\
        --replace subsystems/FlywheelIOTalonFX.java "config.CurrentLimits.SupplyCurrentLimitEnable = true;" "config.CurrentLimits.SupplyCurrentLimitEnable = false;" \\
        --replace subsystems/ArmIOTalonFX.java "config.CurrentLimits.StatorCurrentLimitEnable = true;" "config.CurrentLimits.StatorCurrentLimitEnable = false;" \\
        --replace subsystems/ArmIOTalonFX.java "config.CurrentLimits.SupplyCurrentLimitEnable = true;" "config.CurrentLimits.SupplyCurrentLimitEnable = false;" \\
        --replace subsystems/ArmIOTalonFX.java "rollerConfig.CurrentLimits.StatorCurrentLimitEnable = true;" "rollerConfig.CurrentLimits.StatorCurrentLimitEnable = false;" \\
        --replace subsystems/ArmIOTalonFX.java "rollerConfig.CurrentLimits.SupplyCurrentLimitEnable = true;" "rollerConfig.CurrentLimits.SupplyCurrentLimitEnable = false;"

For more runs, run the sandbox's test again: cd into the sandbox measure.sh printed and run
FIGURE_OUT=... ./gradlew cleanTest test --tests first.robot.figures.Fig29TiredBattery -q.

Output: docs/lessons/v3/images/29-tired-battery-brownout.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle

BROWNOUT_V = 6.3                 # PowerConstants.kBrownoutVoltage
LINE_AMPS = (11.0 - BROWNOUT_V) / 0.04  # where the 11 V, 40 mohm rail reaches 6.3 V: 117.5 A
MOVES_S, RELEASE_S = 6.0, 9.0


def load(name):
    with open(figstyle.data_path(name), newline="") as f:
        rows = list(csv.DictReader(f))
    return {k: [float(r[k]) for r in rows] for k in rows[0]}


def main():
    figstyle.setup()
    budget = load("29-tired-battery-brownout-budget.csv")
    nolim = load("29-tired-battery-brownout-nolimits.csv")

    fig, (amps, volts) = plt.subplots(
        2, 1, sharex=True, figsize=(figstyle.WIDTH_IN, 6.6),
        gridspec_kw={"height_ratios": [1.15, 1], "hspace": 0.12})

    amps.plot(nolim["t_s"], nolim["total_amps"], color=figstyle.ALTERNATE, linewidth=1.3, label="no limits")
    amps.plot(budget["t_s"], budget["total_amps"], color=figstyle.MEASURED, label="the budget")
    amps.axhline(LINE_AMPS, color=figstyle.NEUTRAL, linestyle="--")
    amps.text(1.5, LINE_AMPS + 12, f"{LINE_AMPS:.1f} A: where this rail reaches 6.3 V", color=figstyle.NEUTRAL,
              ha="left", va="bottom")
    amps.set_ylabel("Power/TotalCurrentAmps (A)")
    amps.set_ylim(-60, 620)
    amps.legend(loc="upper left", frameon=False, bbox_to_anchor=(0.12, 0.75))

    volts.plot(nolim["t_s"], nolim["battery_volts"], color=figstyle.ALTERNATE, linewidth=1.3, label="no limits")
    volts.plot(budget["t_s"], budget["battery_volts"], color=figstyle.MEASURED, label="the budget")
    volts.axhline(BROWNOUT_V, color=figstyle.NEUTRAL, linestyle="--")
    volts.text(1.5, BROWNOUT_V + 0.2, "6.3 V: kBrownoutVoltage", color=figstyle.NEUTRAL, ha="left", va="bottom")
    volts.set_ylabel("Power/BatteryVolts (V)")
    volts.set_ylim(-0.3, 14)
    volts.set_xlabel("time since the robot was enabled (s)")
    volts.set_xlim(0, 10.4)

    for ax in (amps, volts):
        ax.axvline(MOVES_S, color="#bbbbbb", linewidth=1, zorder=0)
        ax.axvline(RELEASE_S, color="#bbbbbb", linewidth=1, zorder=0)
    amps.text(MOVES_S + 0.05, 600, "D-pad up, left trigger,\nintake button pressed", va="top", fontsize=9.5,
              color="#555555")
    amps.text(RELEASE_S + 0.05, 600, "released", va="top", fontsize=9.5, color="#555555")

    first_brownout = next(t for t, v in zip(nolim["t_s"], nolim["battery_volts"]) if v < BROWNOUT_V)
    print(figstyle.save(fig, "29-tired-battery-brownout"))
    print(f"no limits: first tick under 6.3 V at {first_brownout:.2f} s, peak {max(nolim['total_amps']):.0f} A, "
          f"low {min(nolim['battery_volts']):.2f} V; budget: peak {max(budget['total_amps']):.1f} A, "
          f"low {min(budget['battery_volts']):.2f} V; line {LINE_AMPS:.1f} A")


if __name__ == "__main__":
    main()
