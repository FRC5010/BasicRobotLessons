// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package first.robot.opmode;

import org.wpilib.command3.button.RobotModeTriggers;
import org.wpilib.opmode.Autonomous;
import org.wpilib.opmode.PeriodicOpMode;

import first.robot.Robot;
import first.robot.commands.Autos;

@Autonomous(name = "Drive To Pose", group = "Group 1")
public class RobotAutoDriveToPose extends PeriodicOpMode {
  private final Robot robot;

  public RobotAutoDriveToPose(Robot robot) {
    this.robot = robot;

    RobotModeTriggers.autonomous().onTrue(
        Autos.driveToScoringPose(robot.drivetrain, robot.localizer));
  }

  @Override
  public void periodic() {
    /* Called periodically (set time interval) while the robot is enabled. */
  }
}
