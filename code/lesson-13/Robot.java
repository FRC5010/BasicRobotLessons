// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot;

import org.littletonrobotics.junction.LoggedRobot;
import org.littletonrobotics.junction.Logger;
import org.littletonrobotics.junction.networktables.NT4Publisher;
import org.littletonrobotics.junction.wpilog.WPILOGReader;
import org.littletonrobotics.junction.wpilog.WPILOGWriter;
import org.littletonrobotics.junction.LogFileUtil;

import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.CommandScheduler;

/**
 * Lesson 13: the Logger setup now forks on the mode. REAL and SIM log live and
 * to a file, exactly as before. REPLAY reads a saved log back through the same
 * code, no hardware, and writes the recomputed values to a fresh "_sim" log.
 */
public class Robot extends LoggedRobot {
  private Command m_autonomousCommand;

  private final RobotContainer m_robotContainer;

  public Robot() {
    // Start logging FIRST, so no value is missed.
    if (Constants.kCurrentMode == Constants.Mode.REPLAY) {
      // Replay: run as fast as the CPU allows, off a log instead of hardware.
      setUseTiming(false); // don't pace to the wall clock — chew through the log
      String logPath = LogFileUtil.findReplayLog(); // the log you dropped in / chose
      Logger.setReplaySource(new WPILOGReader(logPath)); // inputs come from here
      Logger.addDataReceiver(
          new WPILOGWriter(LogFileUtil.addPathSuffix(logPath, "_sim"))); // outputs go here
    } else {
      // Real robot or desktop sim: stream live and save every value to a file.
      Logger.addDataReceiver(new NT4Publisher()); // stream values live over the network
      Logger.addDataReceiver(new WPILOGWriter()); // and save every value to a .wpilog file
    }
    Logger.start();

    // Instantiate our RobotContainer. This performs all our button bindings.
    m_robotContainer = new RobotContainer();
  }

  @Override
  public void robotPeriodic() {
    CommandScheduler.getInstance().run();
  }

  @Override
  public void disabledInit() {}

  @Override
  public void disabledPeriodic() {}

  @Override
  public void autonomousInit() {
    System.out.println("Hello from Team 5010! Autonomous started.");
    m_autonomousCommand = m_robotContainer.getAutonomousCommand();

    if (m_autonomousCommand != null) {
      CommandScheduler.getInstance().schedule(m_autonomousCommand);
    }
  }

  @Override
  public void autonomousPeriodic() {}

  @Override
  public void teleopInit() {
    System.out.println("Hello from Team 5010! Teleop started.");
    if (m_autonomousCommand != null) {
      m_autonomousCommand.cancel();
    }
  }

  @Override
  public void teleopPeriodic() {}

  @Override
  public void testInit() {
    CommandScheduler.getInstance().cancelAll();
  }

  @Override
  public void testPeriodic() {}

  @Override
  public void simulationInit() {}

  @Override
  public void simulationPeriodic() {}
}
