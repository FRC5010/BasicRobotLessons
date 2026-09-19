package first.robot.subsystems;

import org.wpilib.math.estimator.SwerveDrivePoseEstimator;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.system.Timer;
import org.wpilib.telemetry.Telemetry;

public class VisionPoseProvider implements PoseProvider {
  private Pose2d m_pending = null;

  /** Pretend a camera just saw the robot here. A real camera calls this on each frame. */
  public void reportSighting(Pose2d pose) {
    m_pending = pose;
  }

  @Override
  public void updatePoseEstimate(SwerveDrivePoseEstimator estimator) {
    if (m_pending != null) {
      estimator.addVisionMeasurement(m_pending, Timer.getTimestamp());
      Telemetry.log("Localizer/VisionPose", m_pending, Pose2d.struct);
      m_pending = null;
    }
  }
}
