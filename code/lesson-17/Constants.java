// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot;

import static edu.wpi.first.units.Units.*;

import edu.wpi.first.apriltag.AprilTagFieldLayout;
import edu.wpi.first.apriltag.AprilTagFields;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.geometry.Rotation3d;
import edu.wpi.first.math.geometry.Transform3d;
import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.math.geometry.Translation3d;
import edu.wpi.first.units.measure.AngularVelocity;
import edu.wpi.first.units.measure.Distance;
import edu.wpi.first.units.measure.LinearVelocity;
import edu.wpi.first.units.measure.Mass;
import edu.wpi.first.wpilibj.RobotBase;

public final class Constants {
  /** How the robot is running this session — picks which IO implementations get built. */
  public enum Mode {
    REAL, // on the robot, talking to real motors and a real gyro
    SIM, // desktop simulation, physics models standing in for hardware
    REPLAY // re-running a saved log through the same code, no hardware at all
  }

  /** When not on real hardware, this is the mode to run — flip to REPLAY to replay a log. */
  public static final Mode kSimMode = Mode.SIM;

  /** The mode in effect right now: REAL on the robot, kSimMode otherwise. */
  public static final Mode kCurrentMode = RobotBase.isReal() ? Mode.REAL : kSimMode;

  public static class OperatorConstants {
    public static final int kDriverControllerPort = 0;
  }

  public static class DriveConstants {
    // CAN IDs, one drive + one steer + one CANcoder per corner — change to yours.
    public static final int kFrontLeftDrivePort = 1;
    public static final int kFrontLeftSteerPort = 2;
    public static final int kFrontLeftCancoderPort = 9;
    public static final int kFrontRightDrivePort = 3;
    public static final int kFrontRightSteerPort = 4;
    public static final int kFrontRightCancoderPort = 10;
    public static final int kBackLeftDrivePort = 5;
    public static final int kBackLeftSteerPort = 6;
    public static final int kBackLeftCancoderPort = 11;
    public static final int kBackRightDrivePort = 7;
    public static final int kBackRightSteerPort = 8;
    public static final int kBackRightCancoderPort = 12;
    public static final int kGyroPort = 0; // Pigeon 2 CAN ID — change to yours

    // Magnet offsets (rotations): negative of each CANcoder's raw reading with
    // its wheel pointed forward. Measure with Phoenix Tuner X — change to yours.
    public static final double kFrontLeftMagnetOffset = 0.0;
    public static final double kFrontRightMagnetOffset = 0.0;
    public static final double kBackLeftMagnetOffset = 0.0;
    public static final double kBackRightMagnetOffset = 0.0;

    public static final double kDriveGearRatio = 6.75; // rotor : wheel
    public static final double kWheelDiameterMeters = 0.1016; // 4 inch wheel
    public static final double kWheelCircumferenceMeters = Math.PI * kWheelDiameterMeters; // ≈ 0.319 m

    public static final double kHalfLength = 0.3; // meters, wheelbase / 2
    public static final double kHalfWidth = 0.3; // meters, track width / 2

    // +X is forward, +Y is left, yaw is CCW-positive.
    public static final Translation2d kFrontLeft = new Translation2d(kHalfLength, kHalfWidth);
    public static final Translation2d kFrontRight = new Translation2d(kHalfLength, -kHalfWidth);
    public static final Translation2d kBackLeft = new Translation2d(-kHalfLength, kHalfWidth);
    public static final Translation2d kBackRight = new Translation2d(-kHalfLength, -kHalfWidth);

    public static final LinearVelocity kMaxSpeed =
        MetersPerSecond.of(100.0 / kDriveGearRatio * kWheelCircumferenceMeters);
    public static final AngularVelocity kMaxAngularSpeed = RotationsPerSecond.of(1.0);

    // Onboard velocity-loop gains (Lesson 12). kV is the model, kP the trim.
    public static final double kDriveKV = 0.8; // volts per wheel rotation/sec — the model
    public static final double kDriveKP = 0.1; // volts per rps of error — the trim

    // Physical facts a physics engine needs that pure motor math never did (Lesson 16).
    public static final Mass kRobotMass = Kilograms.of(45); // with battery and bumpers
    public static final Distance kBumperLength = Inches.of(30); // front-to-back, over bumpers
    public static final Distance kBumperWidth = Inches.of(30); // side-to-side, over bumpers
    public static final Distance kWheelRadius = Meters.of(kWheelDiameterMeters / 2);

    /** Where the simulated robot is placed on the field at startup. */
    public static final Pose2d kSimStartingPose = new Pose2d(3, 3, new Rotation2d());
  }

  public static class SteerConstants {
    public static final double kSteerGearRatio = 25.0; // rotor : CANcoder
    // Onboard position-loop gain (Lesson 12). Retires the old software kP.
    public static final double kSteerKP = 40.0; // volts per rotation of error — tune
  }

  public static class HeadingConstants {
    public static final double kP = 0.02; // turn power per degree of heading error
  }

  public static class VisionConstants {
    public static final AprilTagFieldLayout kTagLayout =
        AprilTagFields.kDefaultField.loadAprilTagLayoutField();

    // Camera mount positions: robot center → camera lens.
    public static final String kFrontCameraName = "Front"; // must match the name in the PhotonVision UI
    public static final Transform3d kFrontRobotToCamera = new Transform3d(
        new Translation3d(0.3, 0.0, 0.2), // 30 cm forward, centered, 20 cm up
        new Rotation3d(0, 0, 0));         // facing straight forward

    public static final String kBackCameraName = "Back";
    public static final Transform3d kBackRobotToCamera = new Transform3d(
        new Translation3d(-0.3, 0.0, 0.2), // 30 cm back, 20 cm up
        new Rotation3d(0, 0, Math.PI));    // facing straight backward
  }
  public static class PathConstants {
    // BLine runs three P loops at once. Every gain here is "output per unit of
    // error", and since error is meters (or radians) and output is per-second,
    // the units all come out to 1/s.
    public static final double kTranslationP = 5.0; // m/s per meter of path left
    public static final double kRotationP = 3.0;    // rad/s per radian of heading error
    public static final double kCrossTrackP = 2.0;  // m/s per meter off the line
  }
}
