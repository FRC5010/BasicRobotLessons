// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package first.robot;

import static org.wpilib.units.Units.Centimeters;
import static org.wpilib.units.Units.Inches;
import static org.wpilib.units.Units.Kilograms;
import static org.wpilib.units.Units.Meters;
import static org.wpilib.units.Units.MetersPerSecond;
import static org.wpilib.units.Units.MetersPerSecondPerSecond;
import static org.wpilib.units.Units.RotationsPerSecond;

import org.wpilib.framework.RobotBase;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.geometry.Rotation3d;
import org.wpilib.math.geometry.Transform3d;
import org.wpilib.math.geometry.Translation2d;
import org.wpilib.math.geometry.Translation3d;
import org.wpilib.units.measure.AngularVelocity;
import org.wpilib.units.measure.Distance;
import org.wpilib.units.measure.LinearAcceleration;
import org.wpilib.units.measure.LinearVelocity;
import org.wpilib.units.measure.Mass;
import org.wpilib.vision.apriltag.AprilTagFieldLayout;
import org.wpilib.vision.apriltag.AprilTagFields;

public final class Constants {
  public enum Mode { REAL, SIM, REPLAY }

  /** Change kSimMode to Mode.REPLAY to re-run a log file instead of simulating fresh. */
  public static final Mode kSimMode = Mode.SIM;
  public static final Mode kCurrentMode = RobotBase.isReal() ? Mode.REAL : kSimMode;

  // One CAN ID + one magnet offset per corner, all named, instead of
  // literals baked into the array in Drivetrain.
  public static final class DriveConstants {
    public static final int kFrontLeftDrivePort = 1;     // CAN IDs — change to yours
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

    // Magnet offsets (rotations) — measure with Phoenix Tuner X, change to yours.
    public static final double kFrontLeftMagnetOffset = 0.0;
    public static final double kFrontRightMagnetOffset = 0.0;
    public static final double kBackLeftMagnetOffset = 0.0;
    public static final double kBackRightMagnetOffset = 0.0;

    public static final double kDriveGearRatio = 6.75;                 // rotor : wheel
    public static final double kWheelDiameterMeters = 0.1016;          // 4 inch wheel
    public static final double kWheelCircumferenceMeters =
        Math.PI * kWheelDiameterMeters;                                // ≈ 0.319 m

    public static final double kHalfLength = 0.3;  // meters, wheelbase / 2
    public static final double kHalfWidth  = 0.3;  // meters, track width / 2

    // +X is forward, +Y is left, yaw is CCW-positive.
    public static final Translation2d kFrontLeft  = new Translation2d( kHalfLength,  kHalfWidth);
    public static final Translation2d kFrontRight = new Translation2d( kHalfLength, -kHalfWidth);
    public static final Translation2d kBackLeft   = new Translation2d(-kHalfLength,  kHalfWidth);
    public static final Translation2d kBackRight  = new Translation2d(-kHalfLength, -kHalfWidth);

    // Kraken X60 free speed ≈ 6000 RPM = 100 rotations/sec. Divide by the gear
    // ratio, multiply by circumference → meters/sec. About 4.7 m/s for our numbers.
    public static final LinearVelocity kMaxSpeed =
        MetersPerSecond.of(100.0 / kDriveGearRatio * kWheelCircumferenceMeters);

    // How fast the chassis may spin at full stick — one full rotation per second.
    public static final AngularVelocity kMaxAngularSpeed = RotationsPerSecond.of(1.0);

    public static final double kDriveKV = 0.8;          // volts per wheel rotation/sec — the model
    public static final double kDriveKP = 0.1;          // volts per rps of error — the trim

    // How hard the tires can grip, in sim — a Colson-wheel-on-carpet guess.
    public static final double kWheelCoF = 1.2;

    // a = μg — how hard the chassis can actually accelerate, independent of
    // mass, because a heavier robot needs proportionally more force to move
    // and proportionally more grip to supply it.
    public static final double kMaxAccelMps2 = kWheelCoF * 9.81;

    // The same grip limit, applied at each wheel's distance from center —
    // a wheel spinning the chassis in place still can't push harder than
    // the tire allows.
    public static final double kMaxAngularAccelRadPerSec2 =
        kMaxAccelMps2 / Math.hypot(kHalfLength, kHalfWidth);

    /** Where the simulated robot is placed on the field at startup. */
    public static final Pose2d kSimStartingPose = new Pose2d(3, 3, new Rotation2d());
  }

  public static final class SteerConstants {
    public static final double kSteerGearRatio = 25.0;  // rotor : CANcoder
    public static final double kSteerKP = 40.0;         // volts per rotation of error — tune
  }

  public static final class HeadingConstants {
    public static final double kP = 0.02; // turn power per degree of heading error
  }

  public static final class VisionConstants {
    public static final AprilTagFieldLayout kTagLayout =
        AprilTagFieldLayout.loadField(AprilTagFields.kDefaultField);

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

  public static final class ElevatorConstants {
    public static final int kMotorPort = 20; // CAN ID — change to yours
    public static final double kGearRatio = 12.0; // motor rotations per drum rotation
    public static final Distance kDrumRadius = Inches.of(1.0);
    public static final Mass kCarriageMass = Kilograms.of(5.0); // carriage + anything riding on it

    public static final Distance kMinHeight = Meters.of(0.0);
    public static final Distance kMaxHeight = Meters.of(1.5);

    public static final LinearVelocity kMaxVelocity = MetersPerSecond.of(1.0);
    public static final LinearAcceleration kMaxAcceleration = MetersPerSecondPerSecond.of(2.0);

    // Feedforward + trim gains, computed from the Kraken X60 spec sheet — see the lesson's §3.
    // SensorToMechanismRatio makes the closed loop run in drum rotations, so
    // every gain below is drum-side (mechanism-side), not rotor-side.
    public static final double kElevatorKG = 0.18; // volts to hold position against gravity
    public static final double kElevatorKV = 1.44; // volts per drum rotation/sec
    public static final double kElevatorKA = 0.003; // volts per drum rotation/sec^2
    public static final double kElevatorKP = 20.0; // volts per drum rotation of error — the trim

    public static final Distance kStowed = Meters.of(0.02);
    public static final Distance kScoreMid = Meters.of(0.75);
    public static final Distance kScoreHigh = Meters.of(1.45);

    public static final Distance kTolerance = Centimeters.of(2);
  }
}
