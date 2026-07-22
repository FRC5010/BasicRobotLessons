package frc.robot.subsystems;

import org.photonvision.simulation.PhotonCameraSim;
import org.photonvision.simulation.SimCameraProperties;
import org.photonvision.simulation.VisionSystemSim;

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import frc.robot.Constants.VisionConstants;

/**
 * One shared simulated field, holding as many simulated cameras as you hand it. Each
 * PhotonCameraSim feeds fake detections into the real PhotonCamera its provider already reads,
 * so PhotonVisionPoseProvider never needs to know it's not talking to a real coprocessor.
 */
public class VisionSim {
    private final VisionSystemSim m_sim = new VisionSystemSim("main");

    public VisionSim(PhotonVisionPoseProvider... cameras) {
        m_sim.addAprilTags(VisionConstants.kTagLayout);

        SimCameraProperties cameraProps = new SimCameraProperties();
        cameraProps.setCalibration(960, 720, Rotation2d.fromDegrees(90));
        cameraProps.setCalibError(0.25, 0.08);
        cameraProps.setFPS(20);
        cameraProps.setAvgLatencyMs(35);
        cameraProps.setLatencyStdDevMs(5);

        for (PhotonVisionPoseProvider camera : cameras) {
            PhotonCameraSim cameraSim = new PhotonCameraSim(camera.getCamera(), cameraProps);
            m_sim.addCamera(cameraSim, camera.getRobotToCamera());
        }

        // Every simulated tag and each camera's field of view, in one widget.
        SmartDashboard.putData("VisionSim/DebugField", m_sim.getDebugField());
    }

    /** One tick of pretend reality: recompute what every camera can currently see. */
    public void update(Pose2d robotPose) {
        m_sim.update(robotPose);
    }
}
