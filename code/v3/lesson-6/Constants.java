// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package first.robot;

// Added by Lesson 1's Try It #3: move the CAN ID out of the subsystem and
// into a named constant. Every later lesson grows this class.
public final class Constants {
  public static final class DriveConstants {
    /**
     * ====== NEXT LESSON: CHANGE THE CODE BELOW ======
     * Four modules need four sets of wiring. Replace these single-module CAN IDs with a
     * set per corner — drive, steer and CANcoder IDs for each of the four modules —
     * plus one magnet offset per CANcoder, each measured with that wheel pointed
     * straight forward.
     */

    public static final int kDriveMotorPort = 1; // CAN ID — change to yours
    public static final int kSteerMotorPort = 2; // CAN ID — change to yours
    public static final int kCancoderPort = 3;   // CAN ID — change to yours

    public static final double kDriveGearRatio = 6.75;                 // rotor : wheel
    public static final double kWheelDiameterMeters = 0.1016;          // 4 inch wheel
    public static final double kWheelCircumferenceMeters =
        Math.PI * kWheelDiameterMeters;                                // ≈ 0.319 m

    /**
     * ====== NEXT LESSON: ADD CODE HERE ======
     * Add the chassis geometry: half the wheelbase and half the track width, then each
     * module's position relative to the robot's center as a Translation2d. +X is
     * forward, +Y is left.
     */
  }

  public static final class SteerConstants {
    /**
     * ====== NEXT LESSON: CHANGE THE CODE BELOW ======
     * The magnet offset moves into DriveConstants, one per corner. Add the steering
     * gear ratio next to the gain — the rotor turns 25 times for every turn of the
     * wheel's steering — and a constant for which way the steering motor counts, so a
     * robot whose steering counts backward is a one-word fix here.
     */

    public static final double kMagnetOffset = 0.0; // rotations — measure with Tuner X, change to yours
    public static final double kP = 0.0005;          // output per degree of error — tune this
  }
}
