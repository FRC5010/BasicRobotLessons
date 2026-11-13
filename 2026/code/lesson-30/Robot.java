// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot;

import org.ironmaple.simulation.SimulatedArena;
import org.littletonrobotics.junction.LoggedRobot;
import org.littletonrobotics.junction.Logger;
import org.littletonrobotics.junction.networktables.NT4Publisher;
import org.littletonrobotics.junction.wpilog.WPILOGReader;
import org.littletonrobotics.junction.wpilog.WPILOGWriter;
import org.littletonrobotics.junction.LogFileUtil;

import edu.wpi.first.wpilibj.RobotController;
import edu.wpi.first.wpilibj.simulation.BatterySim;
import edu.wpi.first.wpilibj.simulation.RoboRioSim;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.CommandScheduler;

/**
 * Lesson 16 adds the one piece of sim plumbing that isn't any subsystem's
 * business: stepping the shared physics world. The arena holds the field, the
 * game pieces, and every robot on it, so it belongs to the program, not to the
 * drivetrain. (This is the deliberate exception to Lesson 13's "sim code lives
 * inside IO implementations" rule.)
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
  public void simulationInit() {
    // Lay out this season's game pieces the way they'd be staged for a match.
    SimulatedArena.getInstance().resetFieldForAuto();
  }

  @Override
  public void simulationPeriodic() {
    // One call steps the whole world — five physics sub-steps per robot tick.
    // This is where ModuleIOSim's motor-controller callbacks get invoked.
    SimulatedArena.getInstance().simulationPeriodic();

    // Pose3d per piece — they get knocked into the air, so 3D. Drop this key on
    // AdvantageScope's Odometry tab next to the robot and drive through a cluster.
    Logger.recordOutput("FieldSimulation/Fuel",
        SimulatedArena.getInstance().getGamePiecesArrayByType("Fuel"));

    // The battery is the other piece of shared world state, for exactly the same
    // reason the arena is: no single subsystem owns it, and every one of them
    // changes it. Add up what they're drawing, work out what that does to the
    // voltage, and hand it back — which is what closes the loop, because the sim
    // IO layers feed RobotController.getBatteryVoltage() to their motors.
    double totalAmps = m_robotContainer.getTotalCurrentAmps();
    RoboRioSim.setVInVoltage(BatterySim.calculateDefaultBatteryLoadedVoltage(totalAmps));

    Logger.recordOutput("Power/TotalCurrentAmps", totalAmps);
    Logger.recordOutput("Power/BatteryVolts", RobotController.getBatteryVoltage());
    Logger.recordOutput("Power/BrownedOut", RobotController.isBrownedOut());
  }
}
