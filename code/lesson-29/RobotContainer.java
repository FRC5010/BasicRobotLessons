// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot;

import static edu.wpi.first.units.Units.RadiansPerSecond;

import java.util.function.Supplier;

import org.littletonrobotics.junction.networktables.LoggedDashboardChooser;

import edu.wpi.first.units.measure.AngularVelocity;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import edu.wpi.first.wpilibj2.command.button.Trigger;
import frc.robot.Constants.DriveConstants;
import frc.robot.Constants.ElevatorConstants;
import frc.robot.Constants.FlywheelConstants;
import frc.robot.Constants.OperatorConstants;
import frc.robot.Constants.PathConstants;
import frc.robot.Constants.VisionConstants;
import frc.robot.commands.Aim;
import frc.robot.commands.Autos;
import frc.robot.subsystems.Arm;
import frc.robot.subsystems.Drivetrain;
import frc.robot.subsystems.Elevator;
import frc.robot.subsystems.Flywheel;
import frc.robot.subsystems.GamePieceDetector;
import frc.robot.subsystems.Leds;
import frc.robot.subsystems.Localizer;
import frc.robot.subsystems.PhotonVisionPoseProvider;
import frc.robot.subsystems.Superstructure;
import frc.robot.subsystems.SuperstructureState;

public class RobotContainer {
  private final CommandXboxController m_driverController = new CommandXboxController(
      OperatorConstants.kDriverControllerPort);

  // Declaration order matters: the scheduler ticks subsystems in construction
  // order, and the localizer reads inputs the drivetrain refreshes.
  private final Drivetrain m_drivetrain = new Drivetrain();
  private final Localizer m_localizer = new Localizer(m_drivetrain); // registers drivetrain
  private final Elevator m_elevator = new Elevator();
  private final Arm m_arm = new Arm(m_elevator); // hangs its drawing off the carriage
  private final Flywheel m_flywheel = new Flywheel();
  private final Superstructure m_superstructure = new Superstructure(m_elevator, m_arm);
  // Not the subsystems — just a way to ask what the robot is doing.
  private final Leds m_leds = new Leds(m_superstructure::getState);
  // Same trick as the cameras: it needs m_localizer, so it is built in the body.
  private final GamePieceDetector m_pieceDetector;
  // Blank finals: building a camera needs m_localizer, which must already exist.
  private final PhotonVisionPoseProvider m_frontCamera;
  private final PhotonVisionPoseProvider m_backCamera;

  // Publishes a drop-down AND logs the selection (AdvantageKit). Holds recipes,
  // not built commands — Autos owns the options and pre-builds the pick.
  private final LoggedDashboardChooser<Supplier<Command>> m_autoChooser;

  public RobotContainer() {
    m_frontCamera = PhotonVisionPoseProvider.makeCamera(
        VisionConstants.kFrontCameraName, VisionConstants.kFrontRobotToCamera, m_localizer::getPose);
    m_backCamera = PhotonVisionPoseProvider.makeCamera(
        VisionConstants.kBackCameraName, VisionConstants.kBackRobotToCamera, m_localizer::getPose);
    m_pieceDetector = new GamePieceDetector(m_localizer::getPose);

    m_localizer.addProvider(m_frontCamera);
    m_localizer.addProvider(m_backCamera);

    // The simulated chassis is placed at kSimStartingPose, but odometry has no
    // idea where it was switched on. Anchor the estimate to the truth once, so
    // every difference after this is real error, not a bookkeeping mismatch.
    if (Constants.kCurrentMode == Constants.Mode.SIM) {
      m_localizer.resetPose(DriveConstants.kSimStartingPose);
    }

    // Before configureBindings, not after: buildChooser is what creates the path
    // builders, and a binding below now asks Autos to build a command with one.
    m_autoChooser = Autos.buildChooser(m_drivetrain, m_localizer, m_arm);

    configureBindings();
  }

  private void configureBindings() {
    // Full swerve, field-relative: left stick translates, right stick rotates.
    // Each stick fraction (-1..1) scales a max-speed measure into a velocity —
    // no unit unpacking, because drive() takes the measures directly.
    m_drivetrain.setDefaultCommand(
        m_drivetrain.driveFieldRelative(
            () -> DriveConstants.kMaxSpeed.times(-m_driverController.getLeftY()), // forward = +X
            () -> DriveConstants.kMaxSpeed.times(-m_driverController.getLeftX()), // left = +Y
            () -> DriveConstants.kMaxAngularSpeed.times(-m_driverController.getRightX())));

    // Tap A to turn to 90°, B to return to 0°. These commands finish on their own.
    m_driverController.a().onTrue(m_drivetrain.turnToHeading(90));
    m_driverController.b().onTrue(m_drivetrain.turnToHeading(0));

    // The D-pad drives the elevator: down stows it, right is the mid goal,
    // up is the high one. Each finishes on arrival and the firmware holds.
    m_driverController.povDown().onTrue(m_elevator.goToHeight(ElevatorConstants.kStowed));
    m_driverController.povRight().onTrue(m_elevator.goToHeight(ElevatorConstants.kScoreMid));
    m_driverController.povUp().onTrue(m_elevator.goToHeight(ElevatorConstants.kScoreHigh));

    // Back homes the elevator: the encoder can't know where the carriage is at
    // power-on, so drive down to the switch and let it say.
    m_driverController.back().onTrue(m_elevator.home());

    // The wheel idles whenever nothing else asks for it, so a shot never starts
    // from a dead stop.
    m_flywheel.setDefaultCommand(m_flywheel.idle());

    // Hold the left trigger and the robot takes the rotation stick off you: you
    // keep both translation axes, it keeps the nose on the tag.
    m_driverController.leftTrigger().whileTrue(
        m_drivetrain.driveFieldRelative(
            () -> DriveConstants.kMaxSpeed.times(-m_driverController.getLeftY()),
            () -> DriveConstants.kMaxSpeed.times(-m_driverController.getLeftX()),
            this::aimOmega));

    // Same trigger, different subsystem: lining up and spinning up are the same
    // decision, so they happen together.
    m_driverController.leftTrigger().whileTrue(
        m_flywheel.spinUp(FlywheelConstants.kShootSpeed));

    // Hold the left bumper to line up on the scoring pose: across the field with
    // the path follower, then slow and exact for the last 40 cm.
    m_driverController.leftBumper().whileTrue(
        Autos.driveToPose(m_drivetrain, m_localizer, PathConstants.kScoringPose));

    // Hold the right bumper to go and get a game piece — wherever it is, if the
    // camera can see one at the moment you press it.
    m_driverController.rightBumper().whileTrue(
        Autos.fetchPiece(m_drivetrain, m_localizer, m_pieceDetector, m_arm));

    // A Trigger is any boolean the scheduler polls — it does not have to be a
    // button. Whenever the switch trips, take its word for the height.
    new Trigger(m_elevator::atBottomLimit).onTrue(m_elevator.rezeroAtBottom());

    // Buttons ask the superstructure for a state. They don't check whether it
    // makes sense — that's the state machine's job, and it refuses out loud.
    m_driverController.x().onTrue(m_superstructure.requestIntake());
    m_driverController.y().onTrue(m_superstructure.requestIdle());
    m_driverController.rightTrigger().onTrue(m_superstructure.requestScore());

    // Motion that belongs to a state, bound to arriving in it. No guard here:
    // being in the state at all means the state machine already said yes.
    m_superstructure.inState(SuperstructureState.HANDOFF)
        .onTrue(m_superstructure.handoff());
    m_superstructure.inState(SuperstructureState.IDLE)
        .onTrue(m_superstructure.stow());
  }

  /**
   * How fast to spin to keep pointing at the aiming tag, as the drive command
   * wants it. No camera in sight: this works from the fused pose and the tag
   * layout, so it keeps working when nothing can see the tag.
   */
  private AngularVelocity aimOmega() {
    return RadiansPerSecond.of(
        Aim.omegaTowardTag(m_drivetrain, m_localizer, PathConstants.kAimTagId));
  }

  public Command getAutonomousCommand() {
    return Autos.selected();
  }
}
