package first.robot.subsystems;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;

import org.wpilib.fields.FieldTag;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Pose3d;
import org.wpilib.math.geometry.Transform3d;
import org.wpilib.math.geometry.Translation3d;
import org.wpilib.networktables.NetworkTableInstance;
import org.wpilib.networktables.RawPublisher;

import first.robot.Constants.VisionConstants;

/**
 * IO implementation for a simulated Limelight. Works out which tags a camera
 * mounted here could see, then publishes the answer exactly where a real
 * Limelight would — so the real library reads it without knowing the difference.
 */
public class VisionIOLimelightSim extends VisionIOLimelight {
  private static final double kLatencyMs = 20.0; // one loop: captured last tick, published this one

  private final Transform3d m_robotToCamera;
  private final Supplier<Pose2d> m_poseSupplier;
  private final RawPublisher m_publisher;
  private byte[] m_captured = null; // this tick's frame, published next tick
  private long m_frameCount = 0;

  public VisionIOLimelightSim(
      String cameraName, Transform3d robotToCamera, Supplier<Pose2d> poseSupplier) {
    super(cameraName, robotToCamera);
    m_robotToCamera = robotToCamera;
    m_poseSupplier = poseSupplier;
    // The same topic a real Limelight with this name publishes to.
    m_publisher = NetworkTableInstance.getDefault()
        .getTable(cameraName)
        .getRawTopic("results_msgpack")
        .publish("msgpack");
  }

  @Override
  public void updateInputs(VisionIOInputs inputs) {
    if (m_captured != null) {
      m_publisher.set(m_captured);       // last tick's frame arrives now, one loop late
    }
    m_frameCount++;
    m_captured = capture(m_poseSupplier.get());
    super.updateInputs(inputs);          // read it back through the real library
  }

  /** What this camera would report with the robot standing at 'robot'. */
  private byte[] capture(Pose2d robot) {
    Pose3d camera = new Pose3d(robot).transformBy(m_robotToCamera);

    List<Integer> tagIds = new ArrayList<>();
    double totalDistance = 0.0;
    for (FieldTag tag : VisionConstants.kTagLayout.getTags()) {
      Optional<Translation3d> seen = whereInView(camera, tag.getPose());
      if (seen.isPresent()) {
        tagIds.add(tag.getID());
        totalDistance += seen.get().getNorm();
      }
    }
    if (tagIds.isEmpty()) {
      return LimelightFrame.noTargets(m_frameCount, kLatencyMs);
    }

    // A perfect camera: it reports exactly where it's standing.
    double avgDistance = totalDistance / tagIds.size();
    return LimelightFrame.withTargets(m_frameCount, robot, tagIds, avgDistance, kLatencyMs);
  }

  /** Where 'tag' sits relative to the camera — or empty, if the camera can't see it. */
  private static Optional<Translation3d> whereInView(Pose3d camera, Pose3d tag) {
    Translation3d offset = tag.relativeTo(camera).getTranslation(); // +X straight out of the lens
    double yawDegrees = Math.toDegrees(Math.atan2(offset.getY(), offset.getX()));
    double pitchDegrees = Math.toDegrees(Math.atan2(offset.getZ(), offset.getX()));

    boolean inFront = offset.getX() > 0;
    boolean inFrame = Math.abs(yawDegrees) <= VisionConstants.kSimHorizontalFovDegrees / 2
        && Math.abs(pitchDegrees) <= VisionConstants.kSimVerticalFovDegrees / 2;
    boolean closeEnough = offset.getNorm() <= VisionConstants.kSimMaxRangeMeters;
    boolean facingUs = camera.relativeTo(tag).getX() > 0; // a tag's +X points out of its printed face

    if (inFront && inFrame && closeEnough && facingUs) {
      return Optional.of(offset);
    }
    return Optional.empty();
  }
}
