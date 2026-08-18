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
import first.robot.Constants.PathConstants;
import first.robot.Robot;
import first.robot.commands.Aim;
import first.robot.commands.Autos;
import first.robot.subsystems.SuperstructureState;

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

    // The D-pad still talks straight to the elevator, bypassing Superstructure
    // entirely — a leftover from before the state machine existed. Right now,
    // on a fresh boot, nothing stops dpadUp from swinging the carriage to full
    // height before the robot has ever been homed. That is exactly the hole
    // canGoTo below closes for the face-button requests. See Try It.
    robot.driverController.dpadDown().onTrue(robot.elevator.goToHeight(ElevatorConstants.kStowed));
    robot.driverController.dpadRight().onTrue(robot.elevator.goToHeight(ElevatorConstants.kScoreMid));
    robot.driverController.dpadUp().onTrue(robot.elevator.goToHeight(ElevatorConstants.kScoreHigh));

    // West face requests INTAKING, north face requests IDLE, right trigger
    // requests SCORING. Each request only flips Superstructure's state if
    // canGoTo allows it — the actual arm/elevator motion is bound below,
    // to the state itself, not to these buttons.
    robot.driverController.westFace().onTrue(robot.superstructure.requestIntake());
    robot.driverController.northFace().onTrue(robot.superstructure.requestIdle());
    robot.driverController.rightTrigger().onTrue(robot.superstructure.requestScore());

    // Arriving in a state already answered the "is this allowed" question,
    // so these run unguarded — the moment m_state matches, the matching
    // motion command is scheduled, and it is canceled the moment it doesn't.
    robot.superstructure.inState(SuperstructureState.IDLE).whileTrue(robot.superstructure.idleMotion());
    robot.superstructure.inState(SuperstructureState.INTAKING).whileTrue(robot.superstructure.intakeMotion());
    robot.superstructure.inState(SuperstructureState.SCORING).whileTrue(robot.superstructure.scoreMotion());

    // Hold the left bumper to line up on the scoring pose: coarse across
    // the field, then slow and exact for the last stretch.
    robot.driverController.leftBumper().whileTrue(
        Autos.driveToScoringPose(robot.drivetrain, robot.localizer));

    // Hold the right bumper to go and get a game piece — wherever it is, if
    // the camera can see one at the moment you press it.
    robot.driverController.rightBumper().whileTrue(Autos.fetchPiece(
        robot.drivetrain, robot.localizer, robot.pieceDetector, robot.superstructure));

    // Hold the left trigger and the robot takes the rotation stick off you:
    // you keep both translation axes, it keeps the nose on the tag.
    robot.driverController.leftTrigger().whileTrue(
        robot.drivetrain.driveFieldRelative(
            () -> DriveConstants.kMaxSpeed.times(-robot.driverController.getLeftY()),
            () -> DriveConstants.kMaxSpeed.times(-robot.driverController.getLeftX()),
            this::aimOmega));

    // Back homes the elevator: the encoder can't know where the carriage is
    // at power-on, so drive down to the switch and let it say.
    robot.driverController.back().onTrue(robot.elevator.home());

    // A Trigger is any boolean the scheduler polls — it does not have to be
    // a button. Whenever the switch trips, take its word for the height.
    new Trigger(robot.elevator::atBottomLimit).onTrue(robot.elevator.rezeroAtBottom());
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
