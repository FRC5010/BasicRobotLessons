// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package first.robot.opmode;

import org.wpilib.command3.Command;
import org.wpilib.command3.Trigger;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.opmode.PeriodicOpMode;
import org.wpilib.opmode.Teleop;

import first.robot.Constants.ArmConstants;
import first.robot.Constants.DriveConstants;
import first.robot.Constants.ElevatorConstants;
import first.robot.Robot;
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
            () -> DriveConstants.kMaxSpeed.times(-robot.driverController.getLeftY()),  // forward = away from you
            () -> DriveConstants.kMaxSpeed.times(-robot.driverController.getLeftX()),  // left    = your left
            () -> DriveConstants.kMaxAngularSpeed.times(-robot.driverController.getRightX()),
            this::headingFromDriver));

    // Tap the bottom face button to turn and face 90°; the right face button for 0°.
    robot.driverController.faceDown().onTrue(robot.drivetrain.turnToHeading(90));
    robot.driverController.faceRight().onTrue(robot.drivetrain.turnToHeading(0));

    // Press Start with the robot's front facing away from you, to tell the
    // estimate which way that is.
    robot.driverController.start().onTrue(resetHeading());

    // D-pad: send the elevator to one of its three preset heights.
    robot.driverController.dpadDown().onTrue(robot.elevator.goToHeight(ElevatorConstants.kStowed));
    robot.driverController.dpadRight().onTrue(robot.elevator.goToHeight(ElevatorConstants.kScoreMid));
    robot.driverController.dpadUp().onTrue(robot.elevator.goToHeight(ElevatorConstants.kScoreHigh));

    // The left face button drops the arm to the floor; the top one tucks it
    // back up. Hold a bumper to run the roller — it stops when you let go.
    robot.driverController.faceLeft().onTrue(robot.arm.goToAngle(ArmConstants.kIntake));
    robot.driverController.faceUp().onTrue(robot.arm.goToAngle(ArmConstants.kStowed));
    robot.driverController.rightBumper().whileTrue(robot.arm.runRoller(ArmConstants.kIntakeSpeed));
    robot.driverController.leftBumper().whileTrue(robot.arm.runRoller(ArmConstants.kEjectSpeed));

    // Back homes the elevator: the encoder can't know where the carriage is
    // at power-on, so drive down to the switch and let it say.
    robot.driverController.back().onTrue(robot.elevator.home());

    // A Trigger is any boolean the scheduler polls — it does not have to be
    // a button. Whenever the switch trips, take its word for the height.
    new Trigger(robot.elevator::atBottomLimit).onTrue(robot.elevator.rezeroAtBottom());

    // Capture. The beam break says a piece is really in there, not that the
    // roller is spinning. Debounced, so a piece tumbling past can't trigger it.
    new Trigger(robot.arm::hasGamePiece)
        .debounce(ArmConstants.kBeamDebounce)
        .onTrue(Command.parallel(
                robot.arm.goToAngle(ArmConstants.kStowed),
                robot.elevator.goToHeight(ElevatorConstants.kScoreMid))
            .named("Capture"));

    // Score, but only when it makes sense: a piece on board, and the elevator
    // actually arrived where it was sent.
    robot.driverController.rightTrigger()
        .and(robot.arm::hasGamePiece)
        .and(robot.elevator::atGoal)
        .whileTrue(robot.arm.runRoller(ArmConstants.kEjectSpeed));
  }

  /**
   * Which way the robot faces, measured from straight away from you. On the red
   * alliance you stand at the other end of the field, so your "away" is the
   * field's 180°.
   */
  private Rotation2d headingFromDriver() {
    Rotation2d heading = robot.localizer.getPose().getRotation();
    return Autos.onRedAlliance() ? heading.minus(Rotation2d.fromDegrees(180)) : heading;
  }

  /** Tell the estimate the robot is facing straight away from you, wherever it is. */
  private Command resetHeading() {
    return Command.noRequirements(coroutine -> {
          Rotation2d away = Rotation2d.fromDegrees(Autos.onRedAlliance() ? 180 : 0);
          robot.localizer.resetPose(new Pose2d(robot.localizer.getPose().getTranslation(), away));
        })
        .named("Reset Heading");
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
