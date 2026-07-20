// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot;

import static edu.wpi.first.units.Units.MetersPerSecond;

import org.littletonrobotics.junction.networktables.LoggedDashboardChooser;

import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import frc.robot.Constants.DriveConstants;
import frc.robot.Constants.OperatorConstants;
import frc.robot.commands.Autos;
import frc.robot.subsystems.Drivetrain;

public class RobotContainer {
  private final CommandXboxController m_driverController = new CommandXboxController(
      OperatorConstants.kDriverControllerPort);

  private final Drivetrain m_drivetrain = new Drivetrain();

  // Publishes a drop-down AND logs the selection (AdvantageKit).
  private final LoggedDashboardChooser<Command> m_autoChooser =
      new LoggedDashboardChooser<>("Auto Choice");

  public RobotContainer() {
    configureBindings();

    m_autoChooser.addDefaultOption("Drive-Turn-Drive", Autos.driveTurnDrive(m_drivetrain));
    m_autoChooser.addOption("Do Nothing", Commands.none());
  }

  private void configureBindings() {
    // Full swerve, field-relative: left stick translates, right stick rotates.
    double maxMps = DriveConstants.kMaxSpeed.in(MetersPerSecond); // convert once, reuse
    m_drivetrain.setDefaultCommand(
        m_drivetrain.driveFieldRelative(
            () -> -m_driverController.getLeftY() * maxMps, // forward = +X
            () -> -m_driverController.getLeftX() * maxMps, // left = +Y
            () -> -m_driverController.getRightX() * Math.PI * 2)); // ±2π rad/s = ±1 rev/s

    // Tap A to turn to 90°, B to return to 0°. These commands finish on their own.
    m_driverController.a().onTrue(m_drivetrain.turnToHeading(90));
    m_driverController.b().onTrue(m_drivetrain.turnToHeading(0));
  }

  public Command getAutonomousCommand() {
    return m_autoChooser.get();
  }
}
