// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package first.robot.opmode;

import static org.wpilib.units.Units.RadiansPerSecond;

import org.wpilib.command3.Trigger;
import org.wpilib.opmode.PeriodicOpMode;
import org.wpilib.opmode.Teleop;
import org.wpilib.units.measure.AngularVelocity;

import first.robot.Constants.DriveConstants;
import first.robot.Constants.ElevatorConstants;
import first.robot.Constants.FlywheelConstants;
import first.robot.Constants.PathConstants;
import first.robot.Robot;
import first.robot.commands.Aim;
import first.robot.commands.Autos;

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
    robot.driverController.faceDown().onTrue(robot.drivetrain.turnToHeading(90));
    robot.driverController.faceRight().onTrue(robot.drivetrain.turnToHeading(0));

    // D-pad: send the elevator to one of its three preset heights.
    robot.driverController.dpadDown().onTrue(robot.elevator.goToHeight(ElevatorConstants.kStowed));
    robot.driverController.dpadRight().onTrue(robot.elevator.goToHeight(ElevatorConstants.kScoreMid));
    robot.driverController.dpadUp().onTrue(robot.elevator.goToHeight(ElevatorConstants.kScoreHigh));

    // Hold the left bumper to line up on the scoring pose: firm across the
    // field, then a gentle approach that ends stopped on the spot.
    robot.driverController.leftBumper().whileTrue(
        Autos.driveToScoringPose(robot.drivetrain, robot.localizer));

    // Back homes the elevator: the encoder can't know where the carriage is
    // at power-on, so drive down to the switch and let it say.
    robot.driverController.back().onTrue(robot.elevator.home());

    // A Trigger is any boolean the scheduler polls — it does not have to be
    // a button. Whenever the switch trips, take its word for the height.
    new Trigger(robot.elevator::atBottomLimit).onTrue(robot.elevator.rezeroAtBottom());

    // Face buttons ask the superstructure for a state: left to intake, top to
    // give up and go back to neutral, right trigger to score. They don't check
    // whether it makes sense — that's the state machine's job, and it refuses
    // out loud.
    robot.driverController.faceLeft().onTrue(robot.superstructure.requestIntake());
    robot.driverController.faceUp().onTrue(robot.superstructure.requestIdle());
    robot.driverController.rightTrigger().onTrue(robot.superstructure.requestScore());

    // Hold the left trigger and the robot takes the rotation stick off you:
    // you keep both translation axes, it keeps the nose on the tag.
    robot.driverController.leftTrigger().whileTrue(
        robot.drivetrain.driveFieldRelative(
            () -> DriveConstants.kMaxSpeed.times(-robot.driverController.getLeftY()),
            () -> DriveConstants.kMaxSpeed.times(-robot.driverController.getLeftX()),
            this::aimOmega));

    // Same trigger, different subsystem: lining up and spinning up are the
    // same decision, so they happen together.
    robot.driverController.leftTrigger().whileTrue(
        robot.flywheel.spinUp(FlywheelConstants.kShootSpeed));
  }

  /**
   * How fast to spin to keep pointing at the aiming tag, as the drive command
   * wants it. No camera in sight: this works from the fused pose and the tag
   * layout, so it keeps working when nothing can see the tag.
   */
  private AngularVelocity aimOmega() {
    return RadiansPerSecond.of(
        Aim.omegaTowardTag(robot.drivetrain, robot.localizer, PathConstants.kAimTagId));
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
