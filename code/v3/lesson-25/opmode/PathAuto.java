// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package first.robot.opmode;

import java.util.function.Function;

import org.wpilib.command3.Command;
import org.wpilib.command3.button.RobotModeTriggers;
import org.wpilib.opmode.PeriodicOpMode;

import first.robot.Robot;
import first.robot.commands.Autos;
import frc.robot.lib.BLine.path.Path;

/**
 * One autonomous opmode for every drawn path. It has no annotation, so the
 * opmode scan skips it; Robot registers it once per auto instead, each time
 * with a different path and a different recipe for what to do along it.
 */
public class PathAuto extends PeriodicOpMode {
  public PathAuto(Robot robot, String pathName, Function<Path, Command> recipe) {
    // Read the path file now, while the robot is still disabled.
    Path path = new Path(pathName);

    // In the simulator, set the robot down at the path's start — the job a
    // person does on a real field. On a real robot this does nothing.
    robot.drivetrain.placeSimulatedRobot(Autos.startPose(path));

    // Runs on enable. Get ready first: the encoder can't know where the
    // carriage is until it's homed, and the superstructure won't take a
    // request until it knows. Then IDLE stows the arm before the drive starts.
    RobotModeTriggers.autonomous().onTrue(
        Autos.getReadyThen(robot.elevator, robot.superstructure, recipe.apply(path)));
  }

  @Override
  public void periodic() {
    /* Called periodically (set time interval) while the robot is enabled. */
  }
}
