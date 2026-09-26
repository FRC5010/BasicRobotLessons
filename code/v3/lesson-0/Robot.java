// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package first.robot;

import org.wpilib.framework.OpModeRobot;

/**
 * The methods in this class are called automatically as described in the OpModeRobot documentation.
 * OpMode classes anywhere in the package (or sub-packages) where this class is located are
 * automatically registered to display in the Driver Station. If you change the name of this class
 * or the package after creating this project, you must also update the Main.java file in the
 * project.
 */
public class Robot extends OpModeRobot {
  /**
   * ====== NEXT LESSON: ADD CODE HERE ======
   * Give Robot the hardware as fields: the driver's gamepad and the drive module. Robot
   * is built once and lives as long as the program runs, so hardware belongs here;
   * opmodes are rebuilt every time they're selected, so they reach in and use these
   * instead of owning them.
   */

  /**
   * This function is run when the robot is first started up and should be used for any
   * initialization code.
   */
  public Robot() {}

  /** This function is called exactly once when the DS first connects. */
  @Override
  public void driverStationConnected() {}

  /**
   * ====== NEXT LESSON: ADD CODE HERE ======
   * Override robotPeriodic() to tick the command scheduler every loop — without that
   * one call, no trigger is ever checked and no command ever runs. Then log the name of
   * the command driving the module, so you can see what's running.
   */

  /**
   * This function is called periodically anytime when no opmode is selected, including when the
   * Driver Station is disconnected.
   */
  @Override
  public void nonePeriodic() {}
}
