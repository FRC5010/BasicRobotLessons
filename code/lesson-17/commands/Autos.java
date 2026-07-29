// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot.commands;

import edu.wpi.first.math.controller.PIDController;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import frc.robot.Constants.PathConstants;
import frc.robot.lib.BLine.FollowPath;
import frc.robot.lib.BLine.Path;
import frc.robot.subsystems.Drivetrain;
import frc.robot.subsystems.Localizer;

public final class Autos {
  private Autos() {} // utility class — never instantiated

  /** Drive 1 m, turn to 90°, drive 1 m more. */
  public static Command driveTurnDrive(Drivetrain drivetrain) {
    return Commands.sequence(
        drivetrain.driveDistance(1.0),     // step 1: forward 1 meter
        drivetrain.turnToHeading(90),      // step 2: face 90°
        drivetrain.driveDistance(1.0));    // step 3: forward 1 meter
  }

  /** Follow a path drawn in BLine Web and saved to deploy/autos/paths/<name>.json. */
  public static Command followPath(Drivetrain drivetrain, Localizer localizer, String pathName) {
    FollowPath.Builder builder = new FollowPath.Builder(
        drivetrain,                     // the subsystem the command will require
        localizer::getPose,             // where we are (fused, Lesson 14)
        drivetrain::getChassisSpeeds,   // how fast we're going, robot-relative
        drivetrain::driveRobotRelative, // how to make the robot move
        new PIDController(PathConstants.kTranslationP, 0, 0),
        new PIDController(PathConstants.kRotationP, 0, 0),
        new PIDController(PathConstants.kCrossTrackP, 0, 0))
        .withDefaultShouldFlip()              // mirror the path for the red alliance
        .withPoseReset(localizer::resetPose); // snap the estimate to the path's start

    return builder.build(new Path(pathName));
  }
}
