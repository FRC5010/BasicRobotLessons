// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot;

public final class Constants {
  public static class OperatorConstants {
    public static final int kDriverControllerPort = 0;
  }

  public static class DriveConstants {
    public static final int kDriveMotorPort = 1; // CAN ID — change to yours
    public static final int kSteerMotorPort = 2; // CAN ID — change to yours

    public static final double kDriveGearRatio = 6.75; // rotor : wheel
    public static final double kWheelDiameterMeters = 0.1016; // 4 inch wheel
    public static final double kWheelCircumferenceMeters = Math.PI * kWheelDiameterMeters; // ≈ 0.319 m
  }

  public static class SteerConstants {
    public static final double kP = 0.01; // output per degree of error — tune this
  }
}
