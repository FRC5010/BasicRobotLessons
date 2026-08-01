// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot.commands;

import java.util.function.Supplier;

import org.littletonrobotics.junction.networktables.LoggedDashboardChooser;

import edu.wpi.first.math.controller.PIDController;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import frc.robot.Constants.PathConstants;
import frc.robot.lib.BLine.FollowPath;
import frc.robot.lib.BLine.Path;
import frc.robot.subsystems.Drivetrain;
import frc.robot.subsystems.Localizer;

public final class Autos {
  /** How this robot follows a path. One for the whole program — buildChooser sets it. */
  private static FollowPath.Builder s_pathBuilder;

  /** The selected auto, already built and ready to schedule. */
  private static Command s_selected = Commands.none();

  private Autos() {} // utility class — never instantiated

  /** Drive 1 m, turn to 90°, drive 1 m more. */
  public static Command driveTurnDrive(Drivetrain drivetrain) {
    return Commands.sequence(
        drivetrain.driveDistance(1.0),     // step 1: forward 1 meter
        drivetrain.turnToHeading(90),      // step 2: face 90°
        drivetrain.driveDistance(1.0));    // step 3: forward 1 meter
  }

  /** Everything about following a path that doesn't depend on which path it is. */
  private static FollowPath.Builder makePathBuilder(Drivetrain drivetrain, Localizer localizer) {
    return new FollowPath.Builder(
        drivetrain,                     // the subsystem the command will require
        localizer::getPose,             // where we are (fused, Lesson 14)
        drivetrain::getChassisSpeeds,   // how fast we're going, robot-relative
        drivetrain::driveRobotRelative, // how to make the robot move
        new PIDController(PathConstants.kTranslationP, 0, 0),
        new PIDController(PathConstants.kRotationP, 0, 0),
        new PIDController(PathConstants.kCrossTrackP, 0, 0))
        .withDefaultShouldFlip()               // mirror the path for the red alliance
        .withPoseReset(localizer::resetPose);  // snap the estimate to the path's start
  }

  /** A recipe for one path auto. The file is deploy/autos/paths/<pathName>.json. */
  private static Supplier<Command> followPath(String pathName) {
    return () -> s_pathBuilder.build(new Path(pathName));
  }

  /** Names a path file can fire with lib_key. BLine keeps the registry statically. */
  private static void registerEventTriggers() {
    // Nothing on this robot can shoot yet, so it just says so in the console.
    // Lesson 18 starts building mechanisms; this becomes a real command then.
    FollowPath.registerEventTrigger("shoot", Commands.print("Event: shoot!"));
  }

  /**
   * Builds the auto chooser. Every option is a recipe, not a finished command, so
   * nothing is constructed at startup. onChange builds whichever one is selected
   * the moment the selection changes — including the default, on the first loop.
   */
  public static LoggedDashboardChooser<Supplier<Command>> buildChooser(
      Drivetrain drivetrain, Localizer localizer) {
    registerEventTriggers();
    s_pathBuilder = makePathBuilder(drivetrain, localizer);

    LoggedDashboardChooser<Supplier<Command>> chooser =
        new LoggedDashboardChooser<>("Auto Choice");
    chooser.addDefaultOption("Drive-Turn-Drive", () -> driveTurnDrive(drivetrain));
    chooser.addOption("Do Nothing", Commands::none);
    chooser.addOption("Two Corners", followPath("TwoCorners"));
    chooser.addOption("Far Side", followPath("FarSide"));

    chooser.onChange(recipe -> s_selected = recipe.get());
    return chooser;
  }

  /** The selected auto, built ahead of time. Never null — worst case it does nothing. */
  public static Command selected() {
    return s_selected;
  }
}
