package first.robot.subsystems;

import org.littletonrobotics.junction.AutoLog;

public interface GyroIO {
  @AutoLog
  public static class GyroIOInputs {
    public double yawDegrees = 0.0;
    /**
     * ====== NEXT LESSON: ADD CODE HERE ======
     * Add whether the gyro has answered on the CAN bus lately.
     */
  }

  public default void updateInputs(GyroIOInputs inputs) {}
}
