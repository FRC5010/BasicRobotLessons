package frc.robot.subsystems;

import java.util.ArrayList;
import java.util.List;

import org.photonvision.PhotonCamera;
import org.photonvision.targeting.PhotonPipelineResult;
import org.photonvision.targeting.PhotonTrackedTarget;

import frc.robot.Constants.VisionConstants;

/** IO implementation for a real PhotonVision camera running a detection model. */
public class ObjectDetectionIOPhotonVision implements ObjectDetectionIO {
    protected final PhotonCamera m_camera;

    public ObjectDetectionIOPhotonVision(String cameraName) {
        m_camera = new PhotonCamera(cameraName);
    }

    @Override
    public void updateInputs(ObjectDetectionIOInputs inputs) {
        List<Detection> detections = new ArrayList<>();
        for (PhotonPipelineResult result : m_camera.getAllUnreadResults()) {
            for (PhotonTrackedTarget target : result.getTargets()) {
                // Two filters, and they reject different things: the wrong class
                // is a different object, low confidence is the same object badly
                // seen.
                if (target.getDetectedObjectClassID() != VisionConstants.kGamePieceClassId) {
                    continue;
                }
                if (target.getDetectedObjectConfidence() < VisionConstants.kMinConfidence) {
                    continue;
                }
                detections.add(new Detection(
                        target.getYaw(), target.getPitch(), target.getDetectedObjectConfidence()));
            }
        }
        inputs.detections = detections.toArray(new Detection[0]);
    }
}
