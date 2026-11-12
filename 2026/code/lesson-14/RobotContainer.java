// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot;

import org.littletonrobotics.junction.networktables.LoggedDashboardChooser;

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import frc.robot.Constants.DriveConstants;
import frc.robot.Constants.OperatorConstants;
import frc.robot.commands.Autos;
import frc.robot.subsystems.Drivetrain;
import frc.robot.subsystems.Localizer;
import frc.robot.subsystems.VisionPoseProvider;

public class RobotContainer {
  private final CommandXboxController m_driverController = new CommandXboxController(
      OperatorConstants.kDriverControllerPort);

  // Declaration order matters: the scheduler ticks subsystems in construction
  // order, and the localizer reads inputs the drivetrain refreshes.
  private final Drivetrain m_drivetrain = new Drivetrain();
  private final VisionPoseProvider m_camera = new VisionPoseProvider();
  private final Localizer m_localizer = new Localizer(m_drivetrain); // registers drivetrain

  // Publishes a drop-down AND logs the selection (AdvantageKit).
  private final LoggedDashboardChooser<Command> m_autoChooser =
      new LoggedDashboardChooser<>("Auto Choice");

  public RobotContainer() {
    m_localizer.addProvider(m_camera); // the second provider — vision

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

    // Pretend a camera just saw us at (2, 5) facing 90°.
    m_driverController.start().onTrue(Commands.runOnce(() ->
        m_camera.reportSighting(new Pose2d(2.0, 5.0, Rotation2d.fromDegrees(90)))));
  }

  public Command getAutonomousCommand() {
    return m_autoChooser.get();
  }
}
