// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package first.robot.opmode;

import org.wpilib.command3.button.RobotModeTriggers;
import org.wpilib.opmode.Autonomous;
import org.wpilib.opmode.PeriodicOpMode;

import first.robot.Robot;
import first.robot.commands.Autos;

@Autonomous(name = "Drive Turn Drive", group = "Group 1")
public class RobotAuto extends PeriodicOpMode {
  private final Robot robot;

  /** The Robot instance is passed into the opmode via the constructor. */
  public RobotAuto(Robot robot) {
    this.robot = robot;

    // Fires once, the moment this opmode goes from disabled to enabled.
    RobotModeTriggers.autonomous().onTrue(Autos.driveTurnDrive(robot.drivetrain));
  }

  // From Lesson 0's Try It #1: print a message once, on enable, the same
  // way RobotTeleop does.
  @Override
  public void start() {
    System.out.println("Hello from Team 5010! Auto started.");
  }

  @Override
  public void periodic() {
    /* Called periodically (set time interval) while the robot is enabled. */
  }
}
