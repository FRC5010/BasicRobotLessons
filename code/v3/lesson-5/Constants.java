// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package first.robot;

// Added by Lesson 1's Try It #3: move the CAN ID out of the subsystem and
// into a named constant. Every later lesson grows this class.
public final class Constants {
  public static final class DriveConstants {
    public static final int kDriveMotorPort = 1; // CAN ID — change to yours
    public static final int kSteerMotorPort = 2; // CAN ID — change to yours
    public static final int kCancoderPort = 3;   // CAN ID — change to yours
  }

  public static final class SteerConstants {
    public static final double kMagnetOffset = 0.0; // rotations — measure with Tuner X, change to yours
    public static final double kP = 0.0005;          // output per degree of error — tune this
  }
}
