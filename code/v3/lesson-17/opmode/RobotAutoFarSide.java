// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package first.robot.opmode;

import org.wpilib.command3.button.RobotModeTriggers;
import org.wpilib.opmode.Autonomous;
import org.wpilib.opmode.PeriodicOpMode;

import first.robot.Robot;
import first.robot.commands.Autos;
import frc.robot.lib.BLine.path.Path;

@Autonomous(name = "Far Side", group = "Paths")
public class RobotAutoFarSide extends PeriodicOpMode {
  private final Robot robot;

  public RobotAutoFarSide(Robot robot) {
    this.robot = robot;

    // Read the path file now, while the robot is still disabled.
    Path path = new Path("FarSide");

    // In the simulator, set the robot down at the path's start — the job a
    // person does on a real field. On a real robot this does nothing.
    robot.drivetrain.placeSimulatedRobot(Autos.startPose(path));

    // Runs on enable.
    RobotModeTriggers.autonomous().onTrue(Autos.followPath(robot.pathBuilder, path));
  }

  @Override
  public void periodic() {
    /* Called periodically (set time interval) while the robot is enabled. */
  }
}
