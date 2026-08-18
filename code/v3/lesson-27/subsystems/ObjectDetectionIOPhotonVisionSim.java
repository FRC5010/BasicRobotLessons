package first.robot.subsystems;

import static org.wpilib.units.Units.Meters;

import java.util.function.Supplier;

import org.photonvision.estimation.TargetModel;
import org.photonvision.simulation.PhotonCameraSim;
import org.photonvision.simulation.SimCameraProperties;
import org.photonvision.simulation.VisionSystemSim;
import org.photonvision.simulation.VisionTargetSim;

import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Pose3d;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.geometry.Rotation3d;
import org.wpilib.math.geometry.Translation2d;
import org.wpilib.math.geometry.Translation3d;

import first.robot.Constants.VisionConstants;

/**
 * IO implementation for a simulated detection camera.
 *
 * <p>Its own VisionSystemSim, separate from Lesson 15's: that one holds
 * AprilTags that never move, this one holds game pieces, and a camera
 * belongs to exactly one.
 *
 * <p>The pieces here sit at fixed field positions, not moving physics
 * objects — there's no arena to ask "where are they now?" on this alpha, so
 * this places them once and leaves them there. Everything downstream of the
 * camera — the angle math, the field-position conversion, the driving — is
 * exercised exactly the same either way.
 */
public class ObjectDetectionIOPhotonVisionSim extends ObjectDetectionIOPhotonVision {
  private final VisionSystemSim m_visionSim;
  private final Supplier<Pose2d> m_poseSupplier;

  public ObjectDetectionIOPhotonVisionSim(String cameraName, Supplier<Pose2d> poseSupplier) {
    super(cameraName);
    m_poseSupplier = poseSupplier;

    m_visionSim = new VisionSystemSim(cameraName);

    TargetModel pieceModel = new TargetModel(VisionConstants.kGamePieceDiameter.in(Meters));
    for (Translation2d position : VisionConstants.kSimGamePiecePositions) {
      Pose3d piecePose = new Pose3d(
          new Translation3d(
              position.getX(), position.getY(), VisionConstants.kGamePieceHeight.in(Meters)),
          new Rotation3d());
      // The 4-argument constructor sets the object-detection class and
      // confidence. The 3-argument one sets a fiducial ID instead, which is
      // a very quiet way to get no detections at all.
      m_visionSim.addVisionTargets(
          new VisionTargetSim(piecePose, pieceModel, VisionConstants.kGamePieceClassId, 1.0f));
    }

    SimCameraProperties cameraProps = new SimCameraProperties();
    cameraProps.setCalibration(960, 720, Rotation2d.fromDegrees(90));
    cameraProps.setCalibError(0.25, 0.08);
    cameraProps.setFPS(20);

    PhotonCameraSim cameraSim = new PhotonCameraSim(m_camera, cameraProps);
    m_visionSim.addCamera(cameraSim, VisionConstants.kRobotToObjectCamera);
  }

  @Override
  public void updateInputs(ObjectDetectionIOInputs inputs) {
    m_visionSim.update(m_poseSupplier.get());
    super.updateInputs(inputs);
  }
}
