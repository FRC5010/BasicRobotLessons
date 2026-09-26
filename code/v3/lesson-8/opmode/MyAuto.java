// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package first.robot.opmode;

import org.wpilib.opmode.Autonomous;
import org.wpilib.opmode.PeriodicOpMode;

import first.robot.Robot;

/**
 * ====== NEXT LESSON: CHANGE THE CODE BELOW ======
 * Rename this opmode to RobotAuto, and have the Driver Station list it under the name
 * of the routine it runs.
 */

@Autonomous(name = "My Auto", group = "Group 1")
public class MyAuto extends PeriodicOpMode {
  private final Robot robot;

  /**
   * ====== NEXT LESSON: CHANGE THE CODE BELOW ======
   * Rename the constructor to RobotAuto too — a constructor always has its class's
   * name.
   */

  /** The Robot instance is passed into the opmode via the constructor. */
  public MyAuto(Robot robot) {
    this.robot = robot;

    /**
     * ====== NEXT LESSON: ADD CODE HERE ======
     * Schedule the autonomous routine exactly once, the moment this opmode is enabled:
     * bind the drive-turn-drive sequence to the autonomous-mode trigger with onTrue.
     * Binding it here, in the constructor, scopes it to this opmode, the same as every
     * button binding.
     */
  }

  // Added by Lesson 0's Try It #1: print a message once, on enable, the same
  // way MyTeleop does.
  @Override
  public void start() {
    System.out.println("Hello from Team 5010! Auto started.");
  }

  /*
   * This method runs periodically, using the same period as the Robot instance.
   *
   * Additional periodic methods may be configured with addPeriodic(),
   * which can have periods that differ from the main Robot instance.
   */
  @Override
  public void periodic() {
    // Put custom auto code here
  }
}
