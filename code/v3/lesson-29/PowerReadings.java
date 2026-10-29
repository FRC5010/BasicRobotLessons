package first.robot;

import org.littletonrobotics.junction.AutoLog;

/**
 * The battery, the one reading on the robot that belongs to no subsystem.
 * Recorded like a sensor's, so a replay uses the voltage the robot really
 * had instead of working one out again.
 */
@AutoLog
public class PowerReadings {
  public double batteryVolts = 0.0;
}
