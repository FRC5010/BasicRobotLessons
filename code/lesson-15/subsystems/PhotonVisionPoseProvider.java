package frc.robot.subsystems;

import java.util.List;
import java.util.Optional;

import org.littletonrobotics.junction.Logger;
import org.photonvision.EstimatedRobotPose;
import org.photonvision.PhotonCamera;
import org.photonvision.PhotonPoseEstimator;
import org.photonvision.targeting.PhotonPipelineResult;

import edu.wpi.first.math.estimator.SwerveDrivePoseEstimator;
import edu.wpi.first.math.geometry.Transform3d;
import frc.robot.Constants.VisionConstants;

/** A real PhotonVision camera, contributing multi-tag (or single-tag) pose corrections. */
public class PhotonVisionPoseProvider implements PoseProvider {
    private final PhotonCamera m_camera;
    private final PhotonPoseEstimator m_poseEstimator;
    private final Transform3d m_robotToCamera;
    private final String m_logKey;

    public PhotonVisionPoseProvider(String cameraName, Transform3d robotToCamera) {
        m_camera = new PhotonCamera(cameraName);
        m_robotToCamera = robotToCamera;
        m_poseEstimator = new PhotonPoseEstimator(VisionConstants.kTagLayout, robotToCamera);
        m_logKey = "Localizer/" + cameraName;
    }

    @Override
    public void updatePoseEstimate(SwerveDrivePoseEstimator estimator) {
        List<PhotonPipelineResult> results = m_camera.getAllUnreadResults();
        for (PhotonPipelineResult result : results) {
            Optional<EstimatedRobotPose> estimate = m_poseEstimator.estimateCoprocMultiTagPose(result);
            if (estimate.isEmpty()) {
                estimate = m_poseEstimator.estimateLowestAmbiguityPose(result);
            }
            if (estimate.isPresent()) {
                EstimatedRobotPose pose = estimate.get();
                estimator.addVisionMeasurement(pose.estimatedPose.toPose2d(), pose.timestampSeconds);
                Logger.recordOutput(m_logKey + "/Pose", pose.estimatedPose);
                Logger.recordOutput(m_logKey + "/TagCount", pose.targetsUsed.size());
            }
        }
    }

    /** Exposed so VisionSim can wire this exact camera into the shared simulated field. */
    public PhotonCamera getCamera() {
        return m_camera;
    }

    public Transform3d getRobotToCamera() {
        return m_robotToCamera;
    }
}
