package first.robot.subsystems;

public interface ElevatorIO {
  public static class ElevatorIOInputs {
    public double heightMeters = 0.0;
    public double velocityMetersPerSec = 0.0;
    public double appliedVolts = 0.0;
    public double setpointMeters = 0.0; // the profile's instantaneous target, not the final goal
    /**
     * ====== NEXT LESSON: ADD CODE HERE ======
     * Add two more readings: the motor's stator current, and whether the bottom
     * limit switch is pressed.
     */
  }

  /** Read every sensor into 'inputs'. Called once per tick, before anything else. */
  public default void updateInputs(ElevatorIOInputs inputs) {}

  /** Firmware Motion Magic position control, in meters of carriage height. */
  public default void setGoalHeightMeters(double meters) {}

  /**
   * ====== NEXT LESSON: ADD CODE HERE ======
   * Add two more ways to drive the elevator: a plain voltage, for homing, and a
   * way to declare what height it's at right now.
   */
}
