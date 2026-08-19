package first.robot.subsystems;

import org.wpilib.math.estimator.SwerveDrivePoseEstimator;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.networktables.NetworkTableInstance;
import org.wpilib.networktables.StructPublisher;
import org.wpilib.system.Timer;

public class VisionPoseProvider implements PoseProvider {
  private Pose2d m_pending = null;

  private final StructPublisher<Pose2d> m_sightingPublisher =
      NetworkTableInstance.getDefault()
          .getStructTopic("Localizer/VisionPose", Pose2d.struct)
          .publish();

  /** Pretend a camera just saw the robot here. A real camera calls this on each frame. */
  public void reportSighting(Pose2d pose) {
    m_pending = pose;
  }

  @Override
  public void updatePoseEstimate(SwerveDrivePoseEstimator estimator) {
    if (m_pending != null) {
      estimator.addVisionMeasurement(m_pending, Timer.getTimestamp());
      m_sightingPublisher.set(m_pending);
      m_pending = null;
    }
  }
}
