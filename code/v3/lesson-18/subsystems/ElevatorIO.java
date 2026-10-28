package first.robot.subsystems;

import org.littletonrobotics.junction.AutoLog;

public interface ElevatorIO {
  @AutoLog
  public static class ElevatorIOInputs {
    public double heightMeters = 0.0;
    public double velocityMetersPerSec = 0.0;
    public double appliedVolts = 0.0;
    public double setpointMeters = 0.0; // the profile's instantaneous target, not the final goal
  }

  /** Read every sensor into 'inputs'. Called once per tick, before anything else. */
  public default void updateInputs(ElevatorIOInputs inputs) {}

  /** Firmware Motion Magic position control, in meters of carriage height. */
  public default void setGoalHeightMeters(double meters) {}
}
