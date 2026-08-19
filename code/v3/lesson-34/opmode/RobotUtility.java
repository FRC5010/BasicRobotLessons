// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package first.robot.opmode;

import org.wpilib.opmode.PeriodicOpMode;
import org.wpilib.opmode.Utility;

import first.robot.Robot;
import first.robot.commands.SysIdRoutine;

/**
 * A separate opmode for characterization, deliberately reachable only from
 * here — see Lesson 34.
 */
@Utility
public class RobotUtility extends PeriodicOpMode {
  private final Robot robot;

  /** The Robot instance is passed into the opmode via the constructor. */
  public RobotUtility(Robot robot) {
    this.robot = robot;

    // Four two-button combinations, so nobody trips a characterization run
    // reaching for a single button by accident — the same "hard to do by
    // accident" reasoning that put homing on its own button back in
    // Lesson 21, one guard further out than that.
    robot.driverController.back().and(robot.driverController.northFace())
        .whileTrue(robot.flywheel.sysIdQuasistatic(SysIdRoutine.Direction.kForward));
    robot.driverController.back().and(robot.driverController.southFace())
        .whileTrue(robot.flywheel.sysIdQuasistatic(SysIdRoutine.Direction.kReverse));
    robot.driverController.start().and(robot.driverController.northFace())
        .whileTrue(robot.flywheel.sysIdDynamic(SysIdRoutine.Direction.kForward));
    robot.driverController.start().and(robot.driverController.southFace())
        .whileTrue(robot.flywheel.sysIdDynamic(SysIdRoutine.Direction.kReverse));
  }

  @Override
  public void periodic() {}
}
