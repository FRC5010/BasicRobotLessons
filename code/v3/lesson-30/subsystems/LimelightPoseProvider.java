package first.robot.subsystems;

import java.util.function.Supplier;

import org.wpilib.math.estimator.SwerveDrivePoseEstimator;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Transform3d;
import org.wpilib.telemetry.Telemetry;
import org.wpilib.util.Alert;
import org.wpilib.util.Alert.Level;

import org.littletonrobotics.junction.Logger;

import first.robot.Constants;

/** A vision camera, contributing whatever pose corrections its IO reported this tick. */
public class LimelightPoseProvider implements PoseProvider {
  private final VisionIO m_io;
  private final VisionIOInputsAutoLogged m_inputs = new VisionIOInputsAutoLogged();
  private final String m_logKey;
  private final Alert m_disconnected;

  public LimelightPoseProvider(VisionIO io, String logKey) {
    m_io = io;
    m_logKey = logKey;
    // Two cameras, so the message says which one.
    m_disconnected = new Alert(logKey + "/Disconnected", logKey + " camera is not connected", Level.HIGH);
  }

  @Override
  public void updatePoseEstimate(SwerveDrivePoseEstimator estimator) {
    m_io.setRobotHeading(estimator.getEstimatedPosition().getRotation());
    m_io.updateInputs(m_inputs);
    Logger.processInputs(m_logKey, m_inputs); // in replay, the frames come from the log
    Telemetry.log(m_logKey + "/Connected", m_inputs.cameraConnected);
    m_disconnected.set(!m_inputs.cameraConnected);

    for (VisionIO.PoseObservation observation : m_inputs.poseObservations) {
      estimator.addVisionMeasurement(
          observation.pose(), observation.timestampSeconds(), observation.stdDevs());
    }
  }

  /** Picks each camera's real/sim/replay IO, the same way Drivetrain picks each module's. */
  public static LimelightPoseProvider makeCamera(
      String name, Transform3d robotToCamera, Supplier<Pose2d> poseSupplier) {
    VisionIO io = switch (Constants.kCurrentMode) {
      case REAL -> new VisionIOLimelight(name, robotToCamera);
      case SIM -> new VisionIOLimelightSim(name, robotToCamera, poseSupplier);
      case REPLAY -> new VisionIO() {}; // inputs come from the log
    };
    return new LimelightPoseProvider(io, "Localizer/" + name);
  }
}
