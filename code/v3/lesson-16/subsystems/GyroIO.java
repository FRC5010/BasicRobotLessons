package first.robot.subsystems;

import org.littletonrobotics.junction.AutoLog;

public interface GyroIO {
  @AutoLog
  public static class GyroIOInputs {
    public double yawDegrees = 0.0;
  }

  public default void updateInputs(GyroIOInputs inputs) {}
}
