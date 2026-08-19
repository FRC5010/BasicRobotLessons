package first.robot.subsystems;

import java.util.function.Supplier;

import org.wpilib.driverstation.Alert;
import org.wpilib.driverstation.Alert.Level;
import org.wpilib.math.estimator.SwerveDrivePoseEstimator;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Pose3d;
import org.wpilib.math.geometry.Transform3d;
import org.wpilib.networktables.NetworkTableInstance;
import org.wpilib.networktables.StructArrayPublisher;

import first.robot.Constants;

/** A vision camera, contributing whatever pose corrections its IO reported this tick. */
public class PhotonVisionPoseProvider implements PoseProvider {
  private final VisionIO m_io;
  private final VisionIO.VisionIOInputs m_inputs = new VisionIO.VisionIOInputs();

  private final StructArrayPublisher<Pose3d> m_observationsPublisher;
  private final Alert m_disconnected;

  public PhotonVisionPoseProvider(VisionIO io, String logKey) {
    m_io = io;
    m_observationsPublisher = NetworkTableInstance.getDefault()
        .getStructArrayTopic(logKey + "/PoseObservations", Pose3d.struct)
        .publish();
    // The name goes in the message: "a camera is missing" is not actionable
    // when the robot has two of them.
    m_disconnected = new Alert(logKey + " camera is not connected", Level.HIGH);
  }

  @Override
  public void updatePoseEstimate(SwerveDrivePoseEstimator estimator) {
    m_io.updateInputs(m_inputs);

    Pose3d[] poses = new Pose3d[m_inputs.poseObservations.length];
    for (int i = 0; i < poses.length; i++) {
      poses[i] = m_inputs.poseObservations[i].pose();
    }
    m_observationsPublisher.set(poses);
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
      case REPLAY -> new VisionIO() {}; // nothing feeds this yet
    };
    return new PhotonVisionPoseProvider(io, "Localizer/" + name);
  }
}
