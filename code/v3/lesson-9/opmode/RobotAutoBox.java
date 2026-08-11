// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package first.robot.opmode;

import org.wpilib.opmode.Autonomous;
import org.wpilib.opmode.PeriodicOpMode;

import first.robot.Robot;

@Autonomous(name = "Do Nothing", group = "Group 1")
public class RobotAutoBox extends PeriodicOpMode {
  private final Robot robot;

  public RobotAutoBox(Robot robot) {
    this.robot = robot;
    // An empty auto — nothing scheduled at all.
  }

  @Override
  public void periodic() {}
}
