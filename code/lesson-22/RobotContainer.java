// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot;

import static edu.wpi.first.units.Units.Seconds;

import java.util.function.Supplier;

import org.littletonrobotics.junction.networktables.LoggedDashboardChooser;

import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import edu.wpi.first.wpilibj2.command.button.Trigger;
import frc.robot.Constants.ArmConstants;
import frc.robot.Constants.DriveConstants;
import frc.robot.Constants.ElevatorConstants;
import frc.robot.Constants.OperatorConstants;
import frc.robot.Constants.VisionConstants;
import frc.robot.commands.Autos;
import frc.robot.subsystems.Arm;
import frc.robot.subsystems.Drivetrain;
import frc.robot.subsystems.Elevator;
import frc.robot.subsystems.Localizer;
import frc.robot.subsystems.PhotonVisionPoseProvider;

public class RobotContainer {
  private final CommandXboxController m_driverController = new CommandXboxController(
      OperatorConstants.kDriverControllerPort);

  // Declaration order matters: the scheduler ticks subsystems in construction
  // order, and the localizer reads inputs the drivetrain refreshes.
  private final Drivetrain m_drivetrain = new Drivetrain();
  private final Localizer m_localizer = new Localizer(m_drivetrain); // registers drivetrain
  private final Elevator m_elevator = new Elevator();
  private final Arm m_arm = new Arm(m_elevator); // hangs its drawing off the carriage
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
    m_localizer.addProvider(m_frontCamera);
    m_localizer.addProvider(m_backCamera);

    // The simulated chassis is placed at kSimStartingPose, but odometry has no
    // idea where it was switched on. Anchor the estimate to the truth once, so
    // every difference after this is real error, not a bookkeeping mismatch.
    if (Constants.kCurrentMode == Constants.Mode.SIM) {
      m_localizer.resetPose(DriveConstants.kSimStartingPose);
    }

    configureBindings();

    m_autoChooser = Autos.buildChooser(m_drivetrain, m_localizer);
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

    // X drops the arm to the floor, Y tucks it back up. Hold a bumper to run
    // the roller — it stops on its own when you let go.
    m_driverController.x().onTrue(m_arm.goToAngle(ArmConstants.kIntake));
    m_driverController.y().onTrue(m_arm.goToAngle(ArmConstants.kStowed));
    // Back homes the elevator: the encoder can't know where the carriage is at
    // power-on, so drive down to the switch and let it say.
    m_driverController.back().onTrue(m_elevator.home());

    // A Trigger is any boolean the scheduler polls — it does not have to be a
    // button. Whenever the switch trips, take its word for the height.
    new Trigger(m_elevator::atBottomLimit).onTrue(m_elevator.rezeroAtBottom());

    m_driverController.rightBumper().whileTrue(m_arm.runRoller(ArmConstants.kIntakeSpeed));
    m_driverController.leftBumper().whileTrue(m_arm.runRoller(ArmConstants.kEjectSpeed));

    // Capture. The beam break says a piece is really in there — not that the
    // roller is spinning. Debounced, so a piece tumbling past can't trigger it.
    new Trigger(m_arm::hasGamePiece)
        .debounce(ArmConstants.kBeamDebounce.in(Seconds))
        .onTrue(Commands.parallel(
            m_arm.goToAngle(ArmConstants.kStowed),
            m_elevator.goToHeight(ElevatorConstants.kScoreMid)));

    // Score, but only when it makes sense: a piece on board, and the elevator
    // actually arrived where it was sent.
    m_driverController.rightTrigger()
        .and(m_arm::hasGamePiece)
        .and(m_elevator::atGoal)
        .whileTrue(m_arm.runRoller(ArmConstants.kEjectSpeed));
  }

  public Command getAutonomousCommand() {
    return Autos.selected();
  }
}
