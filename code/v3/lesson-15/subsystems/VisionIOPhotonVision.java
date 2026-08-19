package first.robot.subsystems;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.photonvision.EstimatedRobotPose;
import org.photonvision.PhotonCamera;
import org.photonvision.PhotonPoseEstimator;
import org.photonvision.targeting.PhotonPipelineResult;

import org.wpilib.math.geometry.Transform3d;

import first.robot.Constants.VisionConstants;

/** IO implementation for a real PhotonVision camera. */
public class VisionIOPhotonVision implements VisionIO {
  protected final PhotonCamera m_camera;
  private final PhotonPoseEstimator m_poseEstimator;

  public VisionIOPhotonVision(String cameraName, Transform3d robotToCamera) {
    m_camera = new PhotonCamera(cameraName);
    m_poseEstimator = new PhotonPoseEstimator(VisionConstants.kTagLayout, robotToCamera);
  }

  @Override
  public void updateInputs(VisionIOInputs inputs) {
    List<PoseObservation> observations = new ArrayList<>();
    for (PhotonPipelineResult result : m_camera.getAllUnreadResults()) {
      Optional<EstimatedRobotPose> estimate = m_poseEstimator.estimateCoprocMultiTagPose(result);
      if (estimate.isEmpty()) {
        estimate = m_poseEstimator.estimateLowestAmbiguityPose(result);
      }
      if (estimate.isPresent()) {
        EstimatedRobotPose pose = estimate.get();
        observations.add(new PoseObservation(
            pose.timestampSeconds, pose.estimatedPose, pose.targetsUsed.size()));
      }
    }
    inputs.poseObservations = observations.toArray(new PoseObservation[0]);
  }
}
