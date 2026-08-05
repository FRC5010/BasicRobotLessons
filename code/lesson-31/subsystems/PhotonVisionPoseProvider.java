package frc.robot.subsystems;

import java.util.function.Supplier;

import org.littletonrobotics.junction.Logger;

import edu.wpi.first.math.estimator.SwerveDrivePoseEstimator;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Transform3d;
import edu.wpi.first.wpilibj.Alert;
import edu.wpi.first.wpilibj.Alert.AlertType;
import frc.robot.Constants;

/** A vision camera, contributing whatever pose corrections its IO logged this tick. */
public class PhotonVisionPoseProvider implements PoseProvider {
    private final VisionIO m_io;
    private final VisionIOInputsAutoLogged m_inputs = new VisionIOInputsAutoLogged();
    private final String m_logKey;
    private final Alert m_disconnected;

    public PhotonVisionPoseProvider(VisionIO io, String logKey) {
        m_io = io;
        m_logKey = logKey;
        // The name goes in the message: "a camera is missing" is not actionable
        // when the robot has two of them.
        m_disconnected = new Alert(logKey + " camera is not connected", AlertType.kError);
    }

    @Override
    public void updatePoseEstimate(SwerveDrivePoseEstimator estimator) {
        m_io.updateInputs(m_inputs);
        Logger.processInputs(m_logKey, m_inputs);
        m_disconnected.set(!m_inputs.cameraConnected);

        for (VisionIO.PoseObservation observation : m_inputs.poseObservations) {
            estimator.addVisionMeasurement(observation.pose().toPose2d(), observation.timestampSeconds());
        }
    }

    /** Picks each camera's real/sim/replay IO, the same way Drivetrain picks each module's. */
    public static PhotonVisionPoseProvider makeCamera(
            String name, Transform3d robotToCamera, Supplier<Pose2d> poseSupplier) {
        VisionIO io = switch (Constants.kCurrentMode) {
            case REAL -> new VisionIOPhotonVision(name, robotToCamera);
            case SIM -> new VisionIOPhotonVisionSim(name, robotToCamera, poseSupplier);
            case REPLAY -> new VisionIO() {}; // inputs come from the log
        };
        return new PhotonVisionPoseProvider(io, "Localizer/" + name);
    }
}
