package frc.robot.subsystems;

import static edu.wpi.first.units.Units.Meters;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;

import org.littletonrobotics.junction.Logger;
import org.photonvision.PhotonUtils;

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.geometry.Transform3d;
import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.math.util.Units;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants;
import frc.robot.Constants.VisionConstants;
import frc.robot.subsystems.ObjectDetectionIO.Detection;

/**
 * Turns "the camera saw something at these angles" into "there is a game piece
 * at this spot on the field", which needs one thing the camera doesn't have:
 * knowing where the robot is.
 */
public class GamePieceDetector extends SubsystemBase {
    private final ObjectDetectionIO m_io;
    private final ObjectDetectionIOInputsAutoLogged m_inputs =
            new ObjectDetectionIOInputsAutoLogged();

    private final Supplier<Pose2d> m_poseSupplier;

    /** Where the pieces are, in field coordinates, as of this tick. */
    private Translation2d[] m_pieces = new Translation2d[0];

    public GamePieceDetector(Supplier<Pose2d> poseSupplier) {
        m_poseSupplier = poseSupplier;
        m_io = switch (Constants.kCurrentMode) {
            case REAL -> new ObjectDetectionIOPhotonVision(VisionConstants.kObjectCameraName);
            case SIM -> new ObjectDetectionIOPhotonVisionSim(
                    VisionConstants.kObjectCameraName, poseSupplier);
            case REPLAY -> new ObjectDetectionIO() {}; // inputs come from the log
        };
    }

    @Override
    public void periodic() {
        m_io.updateInputs(m_inputs);
        Logger.processInputs("ObjectDetection", m_inputs);

        List<Translation2d> pieces = new ArrayList<>();
        for (Detection detection : m_inputs.detections) {
            toFieldPosition(detection).ifPresent(pieces::add);
        }
        m_pieces = pieces.toArray(new Translation2d[0]);

        Logger.recordOutput("ObjectDetection/Pieces", m_pieces);
        Logger.recordOutput("ObjectDetection/HasTarget", hasTarget());
    }

    /** Everything the camera can see right now, in field coordinates. */
    public Translation2d[] getPieces() {
        return m_pieces;
    }

    public boolean hasTarget() {
        return m_pieces.length > 0;
    }

    /**
     * The piece worth going for: the nearest one. Change this and you change what
     * the robot does — nearest is quick, but it isn't the only sensible answer.
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
        return Optional.of(robot.getTranslation()
                .plus(robotToPiece.rotateBy(robot.getRotation())));
    }
}
