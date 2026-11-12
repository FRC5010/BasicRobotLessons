// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot;

import edu.wpi.first.math.geometry.Translation2d;

public final class Constants {
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
  }

  public static class SteerConstants {
    public static final double kP = 0.01; // output per degree of error — tune this
    public static final double kSteerGearRatio = 25.0; // rotor : steering
  }

  public static class HeadingConstants {
    public static final double kP = 0.02; // turn power per degree of heading error
  }
}
