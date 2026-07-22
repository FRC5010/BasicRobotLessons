package frc.robot.subsystems;

import org.littletonrobotics.junction.Logger;

import edu.wpi.first.math.estimator.SwerveDrivePoseEstimator;

/** A vision camera, contributing whatever pose corrections its IO logged this tick. */
public class PhotonVisionPoseProvider implements PoseProvider {
    private final VisionIO m_io;
    private final VisionIOInputsAutoLogged m_inputs = new VisionIOInputsAutoLogged();
    private final String m_logKey;

    public PhotonVisionPoseProvider(VisionIO io, String logKey) {
        m_io = io;
        m_logKey = logKey;
    }

    @Override
    public void updatePoseEstimate(SwerveDrivePoseEstimator estimator) {
        m_io.updateInputs(m_inputs);
        Logger.processInputs(m_logKey, m_inputs);

        for (VisionIO.PoseObservation observation : m_inputs.poseObservations) {
            estimator.addVisionMeasurement(observation.pose().toPose2d(), observation.timestampSeconds());
        }
    }
}
