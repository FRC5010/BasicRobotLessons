#!/bin/bash
# Re-measures data/29-fresh-battery-runs-defaults.csv for Figure 29.1: the Lesson 29 state with
# each motor's four current-limit lines deleted, so every motor runs on Phoenix's defaults.
# Run from the repo root (export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64 first).
set -e
lines() {  # the four limit lines of one config, as the lesson writes them
  printf '    %s.CurrentLimits.StatorCurrentLimitEnable = true;\n    %s.CurrentLimits.StatorCurrentLimit = PowerConstants.kStatorLimit.in(Amps);\n    %s.CurrentLimits.SupplyCurrentLimitEnable = true;\n    %s.CurrentLimits.SupplyCurrentLimit = PowerConstants.%s.in(Amps);\n' "$1" "$1" "$1" "$1" "$2"
}
tools/figures/measure.sh 29 tools/figures/probes/Fig29TiredBattery.java \
  tools/figures/data/29-fresh-battery-runs-defaults.csv \
  --replace subsystems/ElevatorIOTalonFX.java "$(lines config kElevatorSupplyLimit)
" "" \
  --replace subsystems/FlywheelIOTalonFX.java "$(lines config kFlywheelSupplyLimit)
" "" \
  --replace subsystems/ArmIOTalonFX.java "$(lines config kArmPivotSupplyLimit)
" "" \
  --replace subsystems/ArmIOTalonFX.java "$(lines rollerConfig kArmRollerSupplyLimit)
" ""
