// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot;

import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import frc.robot.Constants.OperatorConstants;
import frc.robot.commands.Autos;
import frc.robot.subsystems.Drivetrain;
import frc.robot.subsystems.ExampleSubsystem;

public class RobotContainer {
  private final ExampleSubsystem m_exampleSubsystem = new ExampleSubsystem();

  private final CommandXboxController m_driverController = new CommandXboxController(
      OperatorConstants.kDriverControllerPort);

  private final Drivetrain m_drivetrain = new Drivetrain();

  public RobotContainer() {
    configureBindings();
  }

  private void configureBindings() {
    // Left stick translates by default; bumpers spin in place.
    m_drivetrain.setDefaultCommand(
        m_drivetrain.translate(
            () -> -m_driverController.getLeftY(), // forward = +X
            () -> -m_driverController.getLeftX())); // left = +Y

    m_driverController.leftBumper().whileTrue(m_drivetrain.rotate(0.3));
    m_driverController.rightBumper().whileTrue(m_drivetrain.rotate(-0.3));
  }

  public Command getAutonomousCommand() {
    return Autos.exampleAuto(m_exampleSubsystem);
  }
}
