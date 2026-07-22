package frc.robot.subsystems;

import org.littletonrobotics.junction.Logger;

import edu.wpi.first.math.estimator.SwerveDrivePoseEstimator;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.wpilibj.Timer;

/**
 * A stand-in camera: holds a pending sighting until the next tick folds it
 * in. A real vision system calls reportSighting on every frame instead.
 */
public class VisionPoseProvider implements PoseProvider {
    private Pose2d m_pending = null;

    /** Pretend a camera just saw the robot here. A real camera calls this on each frame. */
    public void reportSighting(Pose2d pose) {
        m_pending = pose;
    }

    @Override
    public void updatePoseEstimate(SwerveDrivePoseEstimator estimator) {
        if (m_pending != null) {
            estimator.addVisionMeasurement(m_pending, Timer.getFPGATimestamp());
            Logger.recordOutput("Localizer/VisionPose", m_pending);
            m_pending = null;
        }
    }
}
