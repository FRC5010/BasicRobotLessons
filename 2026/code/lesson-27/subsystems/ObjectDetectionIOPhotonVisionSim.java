package frc.robot.subsystems;

import java.util.function.Supplier;

import org.ironmaple.simulation.SimulatedArena;
import org.photonvision.estimation.TargetModel;
import org.photonvision.simulation.PhotonCameraSim;
import org.photonvision.simulation.SimCameraProperties;
import org.photonvision.simulation.VisionSystemSim;
import org.photonvision.simulation.VisionTargetSim;

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Pose3d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import frc.robot.Constants.VisionConstants;

import static edu.wpi.first.units.Units.Meters;

/**
 * IO implementation for a simulated detection camera.
 *
 * <p>Its own VisionSystemSim, separate from Lesson 15's: that one holds AprilTags
 * that never move, this one holds game pieces that move constantly, and a camera
 * belongs to exactly one of them.
 */
public class ObjectDetectionIOPhotonVisionSim extends ObjectDetectionIOPhotonVision {
    private static final String kTargetGroup = "gamepieces";
    private static final TargetModel kPieceModel =
            new TargetModel(VisionConstants.kGamePieceDiameter.in(Meters));

    private final VisionSystemSim m_visionSim;
    private final Supplier<Pose2d> m_poseSupplier;

    public ObjectDetectionIOPhotonVisionSim(String cameraName, Supplier<Pose2d> poseSupplier) {
        super(cameraName);
        m_poseSupplier = poseSupplier;

        m_visionSim = new VisionSystemSim(cameraName);
        SmartDashboard.putData("ObjectSim/DebugField", m_visionSim.getDebugField());

        SimCameraProperties cameraProps = new SimCameraProperties();
        cameraProps.setCalibration(960, 720, Rotation2d.fromDegrees(90));
        cameraProps.setCalibError(0.25, 0.08);
        cameraProps.setFPS(20);

        PhotonCameraSim cameraSim = new PhotonCameraSim(m_camera, cameraProps);
        m_visionSim.addCamera(cameraSim, VisionConstants.kRobotToObjectCamera);
    }

    @Override
    public void updateInputs(ObjectDetectionIOInputs inputs) {
        refreshPieceTargets();
        m_visionSim.update(m_poseSupplier.get());
        super.updateInputs(inputs);
    }

    /**
     * Game pieces move, get eaten and get spat back out, so the fake camera's idea
     * of what is on the field has to be rebuilt from the physics engine every tick.
     */
    private void refreshPieceTargets() {
        m_visionSim.removeVisionTargets(kTargetGroup);
        for (Pose3d piece :
                SimulatedArena.getInstance().getGamePiecesPosesByType(VisionConstants.kGamePieceType)) {
            // The 4-argument constructor sets the object-detection class and
            // confidence. The 3-argument one sets a fiducial ID instead, which is
            // a very quiet way to get no detections at all.
            m_visionSim.addVisionTargets(kTargetGroup, new VisionTargetSim(
                    piece, kPieceModel, VisionConstants.kGamePieceClassId, 1.0f));
        }
    }
}
