// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package first.robot;

import java.util.List;

import org.wpilib.command3.Command;
import org.wpilib.command3.Scheduler;
import org.wpilib.command3.button.CommandGamepad;
import org.wpilib.framework.OpModeRobot;
import org.wpilib.smartdashboard.SmartDashboard;

import first.robot.subsystems.DriveModule;

/**
 * The methods in this class are called automatically as described in the OpModeRobot documentation.
 * OpMode classes anywhere in the package (or sub-packages) where this class is located are
 * automatically registered to display in the Driver Station. If you change the name of this class
 * or the package after creating this project, you must also update the Main.java file in the
 * project.
 */
public class Robot extends OpModeRobot {
  // The robot's hardware lives here — built once, when the robot boots, and
  // alive for as long as the robot runs. Opmodes are rebuilt fresh every time
  // they're selected, so they reach in and use these instead of owning them.
  public final CommandGamepad driverController = new CommandGamepad(0);
  public final DriveModule module = new DriveModule();

  /**
   * This function is run when the robot is first started up and should be used for any
   * initialization code.
   */
  public Robot() {}

  /** This function is called exactly once when the DS first connects. */
  @Override
  public void driverStationConnected() {}

  /** Runs every tick, no matter which opmode is selected or whether the robot is enabled. */
  @Override
  public void robotPeriodic() {
    Scheduler.getDefault().run();
    logRunningCommand();
  }

  private void logRunningCommand() {
    List<Command> running = Scheduler.getDefault().getRunningCommandsFor(module);
    Command current = running.get(0);
    SmartDashboard.putString("DriveModule/CurrentCommand", current.name());
  }

  /**
   * This function is called periodically anytime when no opmode is selected, including when the
   * Driver Station is disconnected.
   */
  @Override
  public void nonePeriodic() {}
}
