package first.robot.subsystems;

public interface ObjectDetectionIO {
  public static class ObjectDetectionIOInputs {
    public Detection[] detections = new Detection[0];
  }

  /**
   * One thing the camera saw, exactly as the camera saw it: two angles and how
   * sure the model was. Deliberately not a place on the field — the camera has
   * no idea where it is, and turning these into a position is somebody else's
   * job.
   */
  public static record Detection(double yawDegrees, double pitchDegrees, double confidence) {}

  public default void updateInputs(ObjectDetectionIOInputs inputs) {}
}
