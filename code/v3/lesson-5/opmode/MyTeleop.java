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

    // Hold the bottom face button to drive forward at 30% power; release to stop.
    robot.driverController.southFace().whileTrue(robot.module.driveAtSpeed(0.3));
    // Hold the right face button to drive backward at 30% power; release to stop.
    robot.driverController.eastFace().whileTrue(robot.module.driveAtSpeed(-0.3));

    robot.module.setDefaultCommand(
        robot.module.driveWithJoystick(() -> -robot.driverController.getLeftY()));

    // Try It #1 (Lesson 2): hold the right bumper for fine control at 25% speed.
    robot.driverController.rightBumper().whileTrue(
        robot.module.driveWithJoystick(() -> -robot.driverController.getLeftY(), 0.25));

    // Tap the left face button to steer to 90° and hold it there.
    robot.driverController.westFace().onTrue(robot.module.steerToAngle(90));
    // Tap the top face button to steer back to 0° and hold it there.
    robot.driverController.northFace().onTrue(robot.module.steerToAngle(0));
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
