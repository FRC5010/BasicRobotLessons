package first.robot.subsystems;

import org.wpilib.math.geometry.Pose3d;

public interface VisionIO {
  public static class VisionIOInputs {
    public PoseObservation[] poseObservations = new PoseObservation[0];
    public boolean cameraConnected = false;
  }

  /** One camera frame's worth of evidence: a candidate pose and how many tags built it. */
  public static record PoseObservation(double timestampSeconds, Pose3d pose, int tagCount) {}

  public default void updateInputs(VisionIOInputs inputs) {}
}
