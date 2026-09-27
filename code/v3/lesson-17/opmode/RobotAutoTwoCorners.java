// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package first.robot.opmode;

import org.wpilib.command3.button.RobotModeTriggers;
import org.wpilib.opmode.Autonomous;
import org.wpilib.opmode.PeriodicOpMode;

import first.robot.Robot;
import first.robot.commands.Autos;

@Autonomous(name = "Two Corners", group = "Paths")
public class RobotAutoTwoCorners extends PeriodicOpMode {
  private final Robot robot;

  public RobotAutoTwoCorners(Robot robot) {
    this.robot = robot;

    // Built right now, while the robot is still disabled; it runs on enable.
    RobotModeTriggers.autonomous().onTrue(Autos.followPath(robot.pathBuilder, "TwoCorners"));
  }

  @Override
  public void periodic() {
    /* Called periodically (set time interval) while the robot is enabled. */
  }
}
