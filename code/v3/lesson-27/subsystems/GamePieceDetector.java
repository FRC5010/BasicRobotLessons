package first.robot.subsystems;

import static org.wpilib.units.Units.Meters;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;

import org.photonvision.PhotonUtils;

import org.wpilib.command3.Scheduler;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.geometry.Transform3d;
import org.wpilib.math.geometry.Translation2d;
import org.wpilib.math.util.Units;
import org.wpilib.networktables.NetworkTableInstance;
import org.wpilib.networktables.StructArrayPublisher;
import org.wpilib.smartdashboard.SmartDashboard;

import first.robot.Constants;
import first.robot.Constants.VisionConstants;
import first.robot.subsystems.ObjectDetectionIO.Detection;

/**
 * Turns "the camera saw something at these angles" into "there is a game
 * piece at this spot on the field", which needs one thing the camera doesn't
 * have: knowing where the robot is.
 *
 * <p>Not a Mechanism, same reasoning as Localizer — it drives nothing and no
 * command ever needs to require it, so a plain periodic heartbeat is all it
 * needs.
 */
public class GamePieceDetector {
  private final ObjectDetectionIO m_io;
  private final ObjectDetectionIO.ObjectDetectionIOInputs m_inputs =
      new ObjectDetectionIO.ObjectDetectionIOInputs();

  private final Supplier<Pose2d> m_poseSupplier;

  /** Where the pieces are, in field coordinates, as of this tick. */
  private Translation2d[] m_pieces = new Translation2d[0];

  private final StructArrayPublisher<Translation2d> m_piecesPublisher =
      NetworkTableInstance.getDefault()
          .getStructArrayTopic("ObjectDetection/Pieces", Translation2d.struct)
          .publish();

  public GamePieceDetector(Supplier<Pose2d> poseSupplier) {
    m_poseSupplier = poseSupplier;
    m_io = switch (Constants.kCurrentMode) {
      case REAL -> new ObjectDetectionIOPhotonVision(VisionConstants.kObjectCameraName);
      case SIM -> new ObjectDetectionIOPhotonVisionSim(
          VisionConstants.kObjectCameraName, poseSupplier);
      case REPLAY -> new ObjectDetectionIO() {}; // inputs come from the log
    };
    Scheduler.getDefault().addPeriodic(this::periodic);
  }

  private void periodic() {
    m_io.updateInputs(m_inputs);

    List<Translation2d> pieces = new ArrayList<>();
    for (Detection detection : m_inputs.detections) {
      toFieldPosition(detection).ifPresent(pieces::add);
    }
    m_pieces = pieces.toArray(new Translation2d[0]);

    m_piecesPublisher.set(m_pieces);
    SmartDashboard.putBoolean("ObjectDetection/HasTarget", hasTarget());
  }

  /** Everything the camera can see right now, in field coordinates. */
  public Translation2d[] getPieces() {
    return m_pieces;
  }

  public boolean hasTarget() {
    return m_pieces.length > 0;
  }

  /**
   * The piece worth going for: the nearest one. Change this and you change
   * what the robot does — nearest is quick, but it isn't the only sensible
   * answer.
   */
  public Optional<Translation2d> bestPiece() {
    Translation2d robot = m_poseSupplier.get().getTranslation();
    Translation2d best = null;
    double bestDistance = Double.MAX_VALUE;
    for (Translation2d piece : m_pieces) {
      double distance = piece.getDistance(robot);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = piece;
      }
    }
    return Optional.ofNullable(best);
  }

  /**
   * Two angles plus the robot's pose make a position. The height trick only
   * works because a game piece sits on the floor, so its middle is always the
   * same distance up — the one fact that makes a single camera enough.
   */
  private Optional<Translation2d> toFieldPosition(Detection detection) {
    Transform3d robotToCamera = VisionConstants.kRobotToObjectCamera;

    // PhotonUtils measures camera pitch UP from horizontal; the mounting
    // transform measures it down. Hence the minus sign.
    double distance = PhotonUtils.calculateDistanceToTargetMeters(
        robotToCamera.getZ(),
        VisionConstants.kGamePieceHeight.in(Meters),
        -robotToCamera.getRotation().getY(),
        Units.degreesToRadians(detection.pitchDegrees()));

    // Above the horizon the maths gives a negative distance, which means the
    // camera is looking at something that is not on the floor.
    if (distance <= 0) {
      return Optional.empty();
    }

    Translation2d cameraToPiece = PhotonUtils.estimateCameraToTargetTranslation(
        distance, Rotation2d.fromDegrees(-detection.yawDegrees()));

    // Camera frame -> robot frame -> field frame, one rotation at a time.
    Translation2d robotToPiece = cameraToPiece
        .rotateBy(robotToCamera.getRotation().toRotation2d())
        .plus(robotToCamera.getTranslation().toTranslation2d());

    Pose2d robot = m_poseSupplier.get();
    return Optional.of(robot.getTranslation().plus(robotToPiece.rotateBy(robot.getRotation())));
  }
}
