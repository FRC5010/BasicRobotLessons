// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot;

import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import frc.robot.Constants.OperatorConstants;
import frc.robot.commands.Autos;
import frc.robot.subsystems.DriveModule;
import frc.robot.subsystems.ExampleSubsystem;

public class RobotContainer {
  private final ExampleSubsystem m_exampleSubsystem = new ExampleSubsystem();

  private final CommandXboxController m_driverController = new CommandXboxController(
      OperatorConstants.kDriverControllerPort);

  private final DriveModule m_module = new DriveModule();

  public RobotContainer() {
    configureBindings();
  }

  private void configureBindings() {
    m_module.setDefaultCommand(
        m_module.driveWithJoystick(() -> -m_driverController.getLeftY()));

    // Hold A to drive forward at 30% power; release to stop.
    m_driverController.a().whileTrue(m_module.driveAtSpeed(0.3));
    // Hold B to drive backward at 30% power; release to stop.
    m_driverController.b().whileTrue(m_module.driveAtSpeed(-0.3));
    // Right bumper: slow (scaled + squared) fine control.
    m_driverController.rightBumper().whileTrue(m_module.driveWithJoystick(() -> -m_driverController.getLeftY(), 0.25));

    // Tap X to steer the module to 90°, Y to return to 0°.
    m_driverController.x().onTrue(m_module.steerToAngle(90));
    m_driverController.y().onTrue(m_module.steerToAngle(0));

    // D-pad up: drive exactly 1 meter forward, then stop.
    m_driverController.povUp().onTrue(m_module.driveDistance(1.0, 0.4));
  }

  public Command getAutonomousCommand() {
    return Autos.exampleAuto(m_exampleSubsystem);
  }
}
