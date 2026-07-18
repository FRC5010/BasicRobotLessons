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
  }

  public static class SteerConstants {
    public static final double kP = 0.01; // output per degree of error — tune this
  }
}
