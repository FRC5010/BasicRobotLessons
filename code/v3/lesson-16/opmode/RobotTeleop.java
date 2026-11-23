// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package first.robot.opmode;

import org.wpilib.opmode.PeriodicOpMode;
import org.wpilib.opmode.Teleop;

import first.robot.Constants.DriveConstants;
import first.robot.Robot;

@Teleop
public class RobotTeleop extends PeriodicOpMode {
  private final Robot robot;

  /** The Robot instance is passed into the opmode via the constructor. */
  public RobotTeleop(Robot robot) {
    this.robot = robot;

    /**
     * ====== NEXT LESSON: CHANGE THE CODE BELOW ======
     * Measure "forward" from the driver's end of the field: hand the drive command
     * the fused estimate's heading, turned round on the red alliance.
     */
    // Classic swerve default: left stick translates (field-relative), right
    // stick rotates.
    robot.drivetrain.setDefaultCommand(
        robot.drivetrain.driveFieldRelative(
            () -> DriveConstants.kMaxSpeed.times(-robot.driverController.getLeftY()),  // forward = +X
            () -> DriveConstants.kMaxSpeed.times(-robot.driverController.getLeftX()),  // left    = +Y
            () -> DriveConstants.kMaxAngularSpeed.times(-robot.driverController.getRightX())));

    // Tap the bottom face button to turn and face 90°; the right face button for 0°.
    robot.driverController.faceDown().onTrue(robot.drivetrain.turnToHeading(90));
    robot.driverController.faceRight().onTrue(robot.drivetrain.turnToHeading(0));

    /**
     * ====== NEXT LESSON: ADD CODE HERE ======
     * A button that tells the estimate the robot is facing straight away from the driver.
     */
  }

  /**
   * ====== NEXT LESSON: ADD CODE HERE ======
   * The robot's heading as the driver sees it, and the command the button runs.
   */

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
