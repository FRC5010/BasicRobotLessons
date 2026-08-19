package first.robot.subsystems;

import java.util.function.Supplier;

import org.photonvision.simulation.PhotonCameraSim;
import org.photonvision.simulation.SimCameraProperties;
import org.photonvision.simulation.VisionSystemSim;

import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.geometry.Transform3d;
import org.wpilib.smartdashboard.SmartDashboard;

import first.robot.Constants.VisionConstants;

/** IO implementation for a simulated PhotonVision camera. */
public class VisionIOPhotonVisionSim extends VisionIOPhotonVision {
  private static VisionSystemSim visionSim; // one fake field, shared by every camera

  private final Supplier<Pose2d> m_poseSupplier;

  public VisionIOPhotonVisionSim(
      String cameraName, Transform3d robotToCamera, Supplier<Pose2d> poseSupplier) {
    super(cameraName, robotToCamera);
    m_poseSupplier = poseSupplier;

    if (visionSim == null) {
      visionSim = new VisionSystemSim("main");
      visionSim.addAprilTags(VisionConstants.kTagLayout);
      SmartDashboard.putData("VisionSim/DebugField", visionSim.getDebugField());
    }

    SimCameraProperties cameraProps = new SimCameraProperties();
    cameraProps.setCalibration(960, 720, Rotation2d.fromDegrees(90));
    cameraProps.setCalibError(0.25, 0.08);
    cameraProps.setFPS(20);
    cameraProps.setAvgLatencyMs(35);
    cameraProps.setLatencyStdDevMs(5);

    PhotonCameraSim cameraSim = new PhotonCameraSim(m_camera, cameraProps);
    visionSim.addCamera(cameraSim, robotToCamera);
  }

  @Override
  public void updateInputs(VisionIOInputs inputs) {
    visionSim.update(m_poseSupplier.get());
    super.updateInputs(inputs);
  }
}
