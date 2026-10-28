package first.robot.subsystems;

public interface GyroIO {
  public static class GyroIOInputs {
    public double yawDegrees = 0.0;
    /**
     * ====== NEXT LESSON: ADD CODE HERE ======
     * Add whether the gyro has answered on the CAN bus lately.
     */
  }

  public default void updateInputs(GyroIOInputs inputs) {}
}
