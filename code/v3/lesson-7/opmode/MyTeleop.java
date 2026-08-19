// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package first.robot.opmode;

import org.wpilib.opmode.PeriodicOpMode;
import org.wpilib.opmode.Teleop;

import first.robot.Robot;

@Teleop
public class MyTeleop extends PeriodicOpMode {
  private final Robot robot;

  /** The Robot instance is passed into the opmode via the constructor. */
  public MyTeleop(Robot robot) {
    this.robot = robot;

    // Left stick translates by default; bumpers spin in place.
    robot.drivetrain.setDefaultCommand(
        robot.drivetrain.translate(
            () -> -robot.driverController.getLeftY(),   // forward = +X
            () -> -robot.driverController.getLeftX())); // left    = +Y

    robot.driverController.leftBumper().whileTrue(robot.drivetrain.rotate(0.3));
    robot.driverController.rightBumper().whileTrue(robot.drivetrain.rotate(-0.3));
  }

  @Override
  public void disabledPeriodic() {
    /* Called periodically (on every DS packet) while the robot is disabled. */
  }

  @Override
  public void start() {
    System.out.println("Hello from Team 5010! Teleop started.");
  }

  @Override
  public void periodic() {
    /* Called periodically (set time interval) while the robot is enabled. */
  }

  @Override
  public void end() {
    /* Called when the robot is disabled (after previously being enabled). */
  }

  @Override
  public void close() {
    /* Called when the opmode is de-selected / no additional methods will be called. */
  }
}
