package first.robot.subsystems;

public interface ElevatorIO {
  public static class ElevatorIOInputs {
    public double heightMeters = 0.0;
    public double velocityMetersPerSec = 0.0;
    public double appliedVolts = 0.0;
    public double setpointMeters = 0.0; // the profile's instantaneous target, not the final goal
    public double statorCurrentAmps = 0.0;
    public double supplyCurrentAmps = 0.0;
    public boolean atBottomLimit = false;
    public boolean motorConnected = false;
  }

  /** Read every sensor into 'inputs'. Called once per tick, before anything else. */
  public default void updateInputs(ElevatorIOInputs inputs) {}

  /** Firmware Motion Magic position control, in meters of carriage height. */
  public default void setGoalHeightMeters(double meters) {}

  /** Open-loop drive, for homing: no goal, no profile, just a voltage. */
  public default void setVoltage(double volts) {}

  /** Declare the carriage to be at this height right now, whatever it read before. */
  public default void setPositionMeters(double heightMeters) {}
}
