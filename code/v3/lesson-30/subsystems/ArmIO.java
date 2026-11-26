package first.robot.subsystems;

import org.littletonrobotics.junction.AutoLog;

public interface ArmIO {
  @AutoLog
  public static class ArmIOInputs {
    public double angleDegrees = 0.0;
    public double velocityDegPerSec = 0.0;
    public double appliedVolts = 0.0;
    public double setpointDegrees = 0.0; // the profile's instantaneous target, not the final goal
    public double rollerVelocityRotPerSec = 0.0;
    public double pivotSupplyCurrentAmps = 0.0;
    public double rollerSupplyCurrentAmps = 0.0;
    public boolean pivotConnected = false;
    public boolean rollerConnected = false;
    public boolean hasGamePiece = false;
  }

  /** Read every sensor into 'inputs'. Called once per tick, before anything else. */
  public default void updateInputs(ArmIOInputs inputs) {}

  /** Hand the firmware an angle to profile toward and then hold. */
  public default void setGoalAngleDegrees(double angleDegrees) {}

  /** Send new feedforward and trim gains to the pivot motor's Slot0. */
  public default void setGains(double kG, double kV, double kA, double kP) {}

  /** Send new Motion Magic limits for the pivot, in arm rotations per second (and per second squared). */
  public default void setMotionLimits(double cruiseRotPerSec, double accelRotPerSecSq) {}

  /** Send new current limits, in amps: the shared winding cap and each motor's battery share. */
  public default void setCurrentLimits(double statorAmps, double pivotSupplyAmps, double rollerSupplyAmps) {}

  /** Spin the roller at a fraction of full output. No goal, no profile. */
  public default void setRollerOutput(double output) {}
}
