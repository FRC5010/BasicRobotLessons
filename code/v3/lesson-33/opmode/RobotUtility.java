// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package first.robot.opmode;

import org.wpilib.event.EventLoop;
import org.wpilib.opmode.PeriodicOpMode;
import org.wpilib.opmode.Utility;

import first.robot.Robot;
import first.robot.commands.SysIdRoutine;

/**
 * A separate opmode for characterization, deliberately reachable only from
 * here — see Lesson 33.
 */
@Utility
public class RobotUtility extends PeriodicOpMode {
  /**
   * This opmode's own button loop. It is only polled in periodic(), so these
   * bindings can only fire while this opmode is the one running.
   */
  private final EventLoop m_loop = new EventLoop();

  /** The Robot instance is passed into the opmode via the constructor. */
  public RobotUtility(Robot robot) {
    // Four two-button combinations, so nobody trips a characterization run
    // reaching for a single button by accident — the same "hard to do by
    // accident" reasoning that put homing on its own button back in
    // Lesson 21, one guard further out than that.
    robot.driverController.back(m_loop).and(robot.driverController.faceUp(m_loop))
        .whileTrue(robot.flywheel.sysIdQuasistatic(SysIdRoutine.Direction.kForward));
    robot.driverController.back(m_loop).and(robot.driverController.faceDown(m_loop))
        .whileTrue(robot.flywheel.sysIdQuasistatic(SysIdRoutine.Direction.kReverse));
    robot.driverController.start(m_loop).and(robot.driverController.faceUp(m_loop))
        .whileTrue(robot.flywheel.sysIdDynamic(SysIdRoutine.Direction.kForward));
    robot.driverController.start(m_loop).and(robot.driverController.faceDown(m_loop))
        .whileTrue(robot.flywheel.sysIdDynamic(SysIdRoutine.Direction.kReverse));
  }

  @Override
  public void periodic() {
    m_loop.poll();
  }
}
