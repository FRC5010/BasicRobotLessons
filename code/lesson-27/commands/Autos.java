// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot.commands;

import static edu.wpi.first.units.Units.Meters;

import java.util.Set;
import java.util.function.Supplier;

import org.littletonrobotics.junction.networktables.LoggedDashboardChooser;

import edu.wpi.first.math.controller.PIDController;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import frc.robot.Constants.ArmConstants;
import frc.robot.Constants.PathConstants;
import frc.robot.lib.BLine.FollowPath;
import frc.robot.lib.BLine.Path;
import frc.robot.subsystems.Arm;
import frc.robot.subsystems.Drivetrain;
import frc.robot.subsystems.GamePieceDetector;
import frc.robot.subsystems.Localizer;

public final class Autos {
  /** How this robot follows a path. One for the whole program — buildChooser sets it. */
  private static FollowPath.Builder s_pathBuilder;

  /**
   * The same, for paths this program generates at runtime. No pose reset: a
   * generated path names only where it is going, so snapping the estimate to
   * its "start" would teleport the robot's belief to the destination.
   */
  private static FollowPath.Builder s_generatedBuilder;

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
        .withDefaultShouldFlip();  // mirror the path for the red alliance
  }

  /**
   * A recipe for one path auto. The file is deploy/autos/paths/&lt;pathName&gt;.json.
   *
   * <p>The handback is not optional: a path cannot finish while something else is
   * steering it, so rotation goes back however this ends — arrived, interrupted,
   * or the match stopped.
   */
  private static Supplier<Command> followPath(String pathName) {
    return () -> s_pathBuilder.build(new Path(pathName))
        .finallyDo(FollowPath::clearRotationOverride);
  }

  /**
   * The same path, with the arm stowing itself over the last stretch of it. The
   * two commands need different subsystems, so they can run at the same time.
   */
  private static Supplier<Command> followPathAndStow(String pathName, Arm arm) {
    return () -> {
      // Keep the FollowPath itself, not just a Command: only it can say how much
      // path is left, and wrapping it would hide that.
      FollowPath path = s_pathBuilder.build(new Path(pathName));
      return Commands.parallel(
              path,
              Commands.waitUntil(() -> path.getRemainingPathDistanceMeters()
                      < PathConstants.kStowDistance.in(Meters))
                  .andThen(arm.goToAngle(ArmConstants.kStowed)))
          .finallyDo(FollowPath::clearRotationOverride);
    };
  }

  /**
   * How fast to spin, in radians per second, to point at the target. The override
   * asks for a rate rather than a heading, which means the aiming loop is yours —
   * this is the same P control you wrote by hand back in Lesson 8.
   */
  private static double aimOmega(Localizer localizer) {
    Pose2d pose = localizer.getPose();
    Rotation2d desired = PathConstants.kAimTarget.minus(pose.getTranslation()).getAngle();
    return desired.minus(pose.getRotation()).getRadians() * PathConstants.kAimP;
  }

  /**
   * A pose short of the target, backed off along the direction the robot will be
   * facing when it gets there. Stage one drives here; stage two closes the gap.
   */
  private static Pose2d stagingPose(Pose2d target) {
    Translation2d backOff = new Translation2d(-PathConstants.kStagingDistance.in(Meters), 0)
        .rotateBy(target.getRotation());
    return new Pose2d(target.getTranslation().plus(backOff), target.getRotation());
  }

  /**
   * Get somewhere exactly, in two stages: cross the field to a staging pose with
   * the path follower, then close the last stretch with the align controllers.
   *
   * <p>The path is built here, in code, from a single waypoint — it says where to
   * go and nothing about where it starts, because it starts wherever the robot is.
   */
  public static Command driveToPose(Drivetrain drivetrain, Localizer localizer, Pose2d target) {
    Pose2d staging = stagingPose(target);
    Path approach = new Path(new Path.Waypoint(
        staging.getTranslation(),
        PathConstants.kGeneratedHandoffRadius.in(Meters),
        staging.getRotation()));

    return Commands.sequence(
        s_generatedBuilder.build(approach),
        drivetrain.alignToPose(target, localizer::getPose));
  }

  /**
   * Where to stand to collect a piece: at the piece, facing the way we came, so
   * the intake gets there first.
   */
  private static Pose2d collectPose(Pose2d robot, Translation2d piece) {
    return new Pose2d(piece, piece.minus(robot.getTranslation()).getAngle());
  }

  /**
   * Go and get whatever the camera can see, running the intake on the way.
   *
   * <p>The approach path cannot be built now, because right now nobody has seen
   * anything. Commands.defer builds it at the moment the command is scheduled,
   * which is the first time a detection exists to build it from.
   */
  public static Command fetchPiece(
      Drivetrain drivetrain, Localizer localizer, GamePieceDetector detector, Arm arm) {
    Command approach = Commands.defer(
        () -> detector.bestPiece()
            .map(piece -> driveToPose(drivetrain, localizer,
                collectPose(localizer.getPose(), piece)))
            .orElseGet(Commands::none),
        Set.of(drivetrain));

    return Commands.parallel(
        approach,
        Commands.sequence(
            arm.goToAngle(ArmConstants.kIntake),
            arm.runRoller(ArmConstants.kIntakeSpeed).until(arm::hasGamePiece)));
  }

  /** Names a path file can fire with lib_key. BLine keeps the registry statically. */
  private static void registerEventTriggers(Arm arm, Localizer localizer) {
    // Drop the intake and start spinning before the robot gets there, so it
    // arrives already collecting instead of stopping to think about it.
    FollowPath.registerEventTrigger("intake",
        Commands.sequence(
            arm.goToAngle(ArmConstants.kIntake),
            arm.runRoller(ArmConstants.kIntakeSpeed).until(arm::hasGamePiece)));

    // Hand rotation to the aiming loop, and later give it back. Translation
    // keeps following the path the whole time — only the spin changes hands.
    FollowPath.registerEventTrigger("aim",
        Commands.runOnce(() -> FollowPath.overrideRotation(() -> aimOmega(localizer))));
    FollowPath.registerEventTrigger("release",
        Commands.runOnce(FollowPath::clearRotationOverride));
  }

  /**
   * Builds the auto chooser. Every option is a recipe, not a finished command, so
   * nothing is constructed at startup. onChange builds whichever one is selected
   * the moment the selection changes — including the default, on the first loop.
   */
  public static LoggedDashboardChooser<Supplier<Command>> buildChooser(
      Drivetrain drivetrain, Localizer localizer, Arm arm) {
    registerEventTriggers(arm, localizer);
    // A drawn path knows where it starts, because you put the robot there —
    // so snap the estimate to it. A generated path does not, so don't.
    s_pathBuilder = makePathBuilder(drivetrain, localizer)
        .withPoseReset(localizer::resetPose);
    s_generatedBuilder = makePathBuilder(drivetrain, localizer);

    LoggedDashboardChooser<Supplier<Command>> chooser =
        new LoggedDashboardChooser<>("Auto Choice");
    chooser.addDefaultOption("Drive-Turn-Drive", () -> driveTurnDrive(drivetrain));
    chooser.addOption("Do Nothing", Commands::none);
    chooser.addOption("Two Corners", followPath("TwoCorners"));
    chooser.addOption("Far Side", followPathAndStow("FarSide", arm));
    chooser.addOption("Aim While Driving", followPath("AimWhileDriving"));
    chooser.addOption("Drive To Pose",
        () -> driveToPose(drivetrain, localizer, PathConstants.kScoringPose));

    chooser.onChange(recipe -> s_selected = recipe.get());
    return chooser;
  }

  /** The selected auto, built ahead of time. Never null — worst case it does nothing. */
  public static Command selected() {
    return s_selected;
  }
}
