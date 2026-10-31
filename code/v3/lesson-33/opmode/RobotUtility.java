// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package first.robot.opmode;

import org.wpilib.command3.sysid.SysIdRoutine;
import org.wpilib.opmode.PeriodicOpMode;
import org.wpilib.opmode.Utility;

import first.robot.Robot;

/**
 * A separate opmode for characterization, deliberately reachable only from
 * here — see Lesson 33.
 */
@Utility
public class RobotUtility extends PeriodicOpMode {
  /** The Robot instance is passed into the opmode via the constructor. */
  public RobotUtility(Robot robot) {
    // Four two-button combinations, so nobody trips a characterization run
    // reaching for a single button by accident — the same "hard to do by
    // accident" reasoning that put homing on its own button back in
    // Lesson 21, one guard further out than that.
    robot.driverController.back().and(robot.driverController.faceUp())
        .whileTrue(robot.flywheel.sysIdQuasistatic(SysIdRoutine.Direction.FORWARD));
    robot.driverController.back().and(robot.driverController.faceDown())
        .whileTrue(robot.flywheel.sysIdQuasistatic(SysIdRoutine.Direction.REVERSE));
    robot.driverController.start().and(robot.driverController.faceUp())
        .whileTrue(robot.flywheel.sysIdDynamic(SysIdRoutine.Direction.FORWARD));
    robot.driverController.start().and(robot.driverController.faceDown())
        .whileTrue(robot.flywheel.sysIdDynamic(SysIdRoutine.Direction.REVERSE));
  }

  @Override
  public void periodic() {
    /* Nothing to do each tick: the bindings above do all the work. */
  }
}
