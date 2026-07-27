// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot;

import org.littletonrobotics.junction.networktables.LoggedDashboardChooser;

import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import frc.robot.Constants.DriveConstants;
import frc.robot.Constants.OperatorConstants;
import frc.robot.Constants.VisionConstants;
import frc.robot.commands.Autos;
import frc.robot.subsystems.Drivetrain;
import frc.robot.subsystems.Localizer;
import frc.robot.subsystems.PhotonVisionPoseProvider;

public class RobotContainer {
  private final CommandXboxController m_driverController = new CommandXboxController(
      OperatorConstants.kDriverControllerPort);

  // Declaration order matters: the scheduler ticks subsystems in construction
  // order, and the localizer reads inputs the drivetrain refreshes.
  private final Drivetrain m_drivetrain = new Drivetrain();
  private final Localizer m_localizer = new Localizer(m_drivetrain); // registers drivetrain
  // Blank finals: building a camera needs m_localizer, which must already exist.
  private final PhotonVisionPoseProvider m_frontCamera;
  private final PhotonVisionPoseProvider m_backCamera;

  // Publishes a drop-down AND logs the selection (AdvantageKit).
  private final LoggedDashboardChooser<Command> m_autoChooser =
      new LoggedDashboardChooser<>("Auto Choice");

  public RobotContainer() {
    m_frontCamera = PhotonVisionPoseProvider.makeCamera(
        VisionConstants.kFrontCameraName, VisionConstants.kFrontRobotToCamera, m_localizer::getPose);
    m_backCamera = PhotonVisionPoseProvider.makeCamera(
        VisionConstants.kBackCameraName, VisionConstants.kBackRobotToCamera, m_localizer::getPose);
    m_localizer.addProvider(m_frontCamera);
    m_localizer.addProvider(m_backCamera);

    configureBindings();

    m_autoChooser.addDefaultOption("Drive-Turn-Drive", Autos.driveTurnDrive(m_drivetrain));
    m_autoChooser.addOption("Do Nothing", Commands.none());
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
  }

  public Command getAutonomousCommand() {
    return m_autoChooser.get();
  }
}
