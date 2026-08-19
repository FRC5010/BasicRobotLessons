package first.robot.subsystems;

public interface ArmIO {
  public static class ArmIOInputs {
    public double angleDegrees = 0.0;
    public double velocityDegPerSec = 0.0;
    public double appliedVolts = 0.0;
    public double setpointDegrees = 0.0; // the profile's instantaneous target, not the final goal
    public double rollerVelocityRotPerSec = 0.0;
  }

  /** Read every sensor into 'inputs'. Called once per tick, before anything else. */
  public default void updateInputs(ArmIOInputs inputs) {}

  /** Hand the firmware an angle to profile toward and then hold. */
  public default void setGoalAngleDegrees(double angleDegrees) {}

  /** Spin the roller at a fraction of full output. No goal, no profile. */
  public default void setRollerOutput(double output) {}
}
