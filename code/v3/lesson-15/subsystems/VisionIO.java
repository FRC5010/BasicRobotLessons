package first.robot.subsystems;

import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.linalg.VecBuilder;
import org.wpilib.math.linalg.Vector;
import org.wpilib.math.numbers.N3;

import org.littletonrobotics.junction.AutoLog;

public interface VisionIO {
  @AutoLog
  public static class VisionIOInputs {
    public PoseObservation[] poseObservations = new PoseObservation[0];
  }

  /** One camera frame's worth of evidence: where it put the robot, when, and how far to trust it. */
  public static record PoseObservation(
      double timestampSeconds, Pose2d pose, int tagCount,
      double xStdDevMeters, double yStdDevMeters, double headingStdDevRadians) {
    /** The three trust numbers as one column, the shape addVisionMeasurement takes. */
    public Vector<N3> stdDevs() {
      return VecBuilder.fill(xStdDevMeters, yStdDevMeters, headingStdDevRadians);
    }
  }

  public default void updateInputs(VisionIOInputs inputs) {}

  /** MegaTag2 borrows the robot's heading instead of solving for it — tell it every loop. */
  public default void setRobotHeading(Rotation2d heading) {}
}
