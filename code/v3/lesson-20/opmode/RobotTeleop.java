// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package first.robot.opmode;

import org.wpilib.opmode.PeriodicOpMode;
import org.wpilib.opmode.Teleop;

import first.robot.Constants.ArmConstants;
import first.robot.Constants.DriveConstants;
import first.robot.Constants.ElevatorConstants;
import first.robot.Robot;

@Teleop
public class RobotTeleop extends PeriodicOpMode {
  private final Robot robot;

  /** The Robot instance is passed into the opmode via the constructor. */
  public RobotTeleop(Robot robot) {
    this.robot = robot;

    // Classic swerve default: left stick translates (field-relative), right
    // stick rotates.
    robot.drivetrain.setDefaultCommand(
        robot.drivetrain.driveFieldRelative(
            () -> DriveConstants.kMaxSpeed.times(-robot.driverController.getLeftY()),  // forward = +X
            () -> DriveConstants.kMaxSpeed.times(-robot.driverController.getLeftX()),  // left    = +Y
            () -> DriveConstants.kMaxAngularSpeed.times(-robot.driverController.getRightX())));

    // Tap the bottom face button to turn and face 90°; the right face button for 0°.
    robot.driverController.southFace().onTrue(robot.drivetrain.turnToHeading(90));
    robot.driverController.eastFace().onTrue(robot.drivetrain.turnToHeading(0));

    // D-pad: send the elevator to one of its three preset heights.
    robot.driverController.dpadDown().onTrue(robot.elevator.goToHeight(ElevatorConstants.kStowed));
    robot.driverController.dpadRight().onTrue(robot.elevator.goToHeight(ElevatorConstants.kScoreMid));
    robot.driverController.dpadUp().onTrue(robot.elevator.goToHeight(ElevatorConstants.kScoreHigh));

    // West face button drops the arm to the floor, north face tucks it back
    // up. Hold a bumper to run the roller — it stops on its own when you let go.
    robot.driverController.westFace().onTrue(robot.arm.goToAngle(ArmConstants.kIntake));
    robot.driverController.northFace().onTrue(robot.arm.goToAngle(ArmConstants.kStowed));
    robot.driverController.rightBumper().whileTrue(robot.arm.runRoller(ArmConstants.kIntakeSpeed));
    robot.driverController.leftBumper().whileTrue(robot.arm.runRoller(ArmConstants.kEjectSpeed));
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
