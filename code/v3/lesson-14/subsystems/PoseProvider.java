package first.robot.subsystems;

import org.wpilib.math.estimator.SwerveDrivePoseEstimator;

public interface PoseProvider {
  /** Called every tick: fold whatever you know into the shared estimate. */
  void updatePoseEstimate(SwerveDrivePoseEstimator estimator);
}
