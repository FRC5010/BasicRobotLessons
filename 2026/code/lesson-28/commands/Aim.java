// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot.commands;

import static edu.wpi.first.units.Units.Radians;

import java.util.Optional;

import org.littletonrobotics.junction.Logger;

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import frc.robot.Constants.PathConstants;
import frc.robot.Constants.VisionConstants;
import frc.robot.subsystems.Drivetrain;
import frc.robot.subsystems.Localizer;

/**
 * Pointing the robot at a place on the field.
 *
 * <p>Not a command and not a subsystem — just the arithmetic, so that a driver
 * command, an auto marker and a readiness check can all ask the same question and
 * get the same answer.
 *
 * <p>Notice what is missing from every signature below: a camera. Aiming is done
 * against the fused pose and the tag layout, both of which exist whether or not
 * anything can currently see a tag.
 */
public final class Aim {
  private Aim() {} // utility class — never instantiated

  /**
   * Where a tag sits on the field, from the layout that was loaded in Lesson 15.
   * Empty when that ID is not on this field, which is what a typo looks like.
   */
  public static Optional<Translation2d> tagPosition(int tagId) {
    return VisionConstants.kTagLayout.getTagPose(tagId)
        .map(pose -> pose.getTranslation().toTranslation2d());
  }

  /** Which way the robot would have to face to look straight at the target. */
  public static Rotation2d headingToward(Pose2d robot, Translation2d target) {
    return target.minus(robot.getTranslation()).getAngle();
  }

  /** How far off that heading the robot currently is, wrapped to ±180°. */
  public static Rotation2d error(Pose2d robot, Translation2d target) {
    return headingToward(robot, target).minus(robot.getRotation());
  }

  /**
   * How fast the bearing to the target is changing because the robot is moving.
   *
   * <p>Slide sideways past something and it swings across your view even though
   * you never turned. A P loop cannot know that is coming — it only ever reacts
   * to error that has already happened — so hand it the answer directly.
   */
  public static double bearingRate(
      Pose2d robot, ChassisSpeeds fieldSpeeds, Translation2d target) {
    Translation2d offset = target.minus(robot.getTranslation());
    double distanceSquared = offset.getX() * offset.getX() + offset.getY() * offset.getY();
    if (distanceSquared < 1e-6) {
      return 0.0; // standing on the target: the bearing is meaningless, not fast
    }
    return (fieldSpeeds.vxMetersPerSecond * offset.getY()
        - fieldSpeeds.vyMetersPerSecond * offset.getX()) / distanceSquared;
  }

  /**
   * How fast to spin, in radians per second, to point at the target: the rate the
   * bearing is already moving, plus a P term to clean up whatever is left.
   */
  public static double omegaToward(
      Pose2d robot, ChassisSpeeds fieldSpeeds, Translation2d target) {
    Rotation2d error = error(robot, target);
    double feedforward = bearingRate(robot, fieldSpeeds, target);

    Logger.recordOutput("Aim/ErrorDegrees", error.getDegrees());
    Logger.recordOutput("Aim/FeedforwardRadPerSec", feedforward);
    Logger.recordOutput("Aim/IsAimed", isAimedAt(robot, target));

    return feedforward + error.getRadians() * PathConstants.kAimP;
  }

  /**
   * The whole job in one call, for the two places that want it: read where we are
   * and how fast we're going, find the tag, and produce a spin rate. Zero when the
   * tag isn't on this field — a robot that can't find its target should sit still
   * rather than pick a direction.
   */
  public static double omegaTowardTag(Drivetrain drivetrain, Localizer localizer, int tagId) {
    Pose2d robot = localizer.getPose();
    ChassisSpeeds fieldSpeeds = ChassisSpeeds.fromRobotRelativeSpeeds(
        drivetrain.getChassisSpeeds(), robot.getRotation());
    return tagPosition(tagId)
        .map(target -> omegaToward(robot, fieldSpeeds, target))
        .orElse(0.0);
  }

  /** Pointing at it closely enough to act on. */
  public static boolean isAimedAt(Pose2d robot, Translation2d target) {
    return Math.abs(error(robot, target).getRadians())
        < PathConstants.kAimTolerance.in(Radians);
  }
}
