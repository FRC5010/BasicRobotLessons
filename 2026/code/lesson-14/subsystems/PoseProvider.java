package frc.robot.subsystems;

import edu.wpi.first.math.estimator.SwerveDrivePoseEstimator;

/** Anything that can fold its own evidence into the shared pose estimate. */
public interface PoseProvider {
    /** Called every tick: fold whatever you know into the shared estimate. */
    void updatePoseEstimate(SwerveDrivePoseEstimator estimator);
}
