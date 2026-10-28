package first.robot.subsystems;

public interface GyroIO {
  public static class GyroIOInputs {
    public double yawDegrees = 0.0;
    public boolean connected = false;
  }

  public default void updateInputs(GyroIOInputs inputs) {}
}
