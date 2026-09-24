package first.robot.subsystems;

import com.limelightvision.Limelight;
import com.limelightvision.PoseEstimate;
import com.limelightvision.PoseEstimateType;

import org.wpilib.math.geometry.Pose3d;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.geometry.Transform3d;

/** IO implementation for a real Limelight camera. */
public class VisionIOLimelight implements VisionIO {
  private final Limelight m_camera;

  public VisionIOLimelight(String cameraName, Transform3d robotToCamera) {
    // Handing the library the mount position overrides whatever the camera's
    // web UI says, so the measurement lives in exactly one place: VisionConstants.
    m_camera = new Limelight(
        cameraName, new Pose3d(robotToCamera.getTranslation(), robotToCamera.getRotation()));
  }

  @Override
  public void setRobotHeading(Rotation2d heading) {
    Limelight.setSharedRobotOrientation(heading.getDegrees());
  }

  @Override
  public void updateInputs(VisionIOInputs inputs) {
    PoseEstimate[] estimates = m_camera.readAcceptedPoseEstimates(PoseEstimateType.MT2_WPIBLUE);
    inputs.poseObservations = new PoseObservation[estimates.length];
    for (int i = 0; i < estimates.length; i++) {
      PoseEstimate estimate = estimates[i];
      inputs.poseObservations[i] = new PoseObservation(
          estimate.timestampSeconds, estimate.pose, estimate.fieldedTagCount, estimate.stdDevs);
    }
  }
}
