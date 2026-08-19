package first.robot.subsystems;

import java.util.ArrayList;
import java.util.List;

import org.wpilib.command3.Scheduler;
import org.wpilib.math.estimator.SwerveDrivePoseEstimator;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.networktables.NetworkTableInstance;
import org.wpilib.networktables.StructPublisher;
import org.wpilib.smartdashboard.Field2d;
import org.wpilib.smartdashboard.SmartDashboard;

/**
 * Owns the fused pose estimate. Not a Mechanism — it drives no motors and no
 * command ever needs to require it, so all it needs from the scheduler is a
 * heartbeat, the same addPeriodic(...) every other periodic tick in this
 * course has used since Lesson 11.
 */
public class Localizer {
  private final Drivetrain m_drivetrain;
  private final SwerveDrivePoseEstimator m_estimator;
  private final List<PoseProvider> m_providers = new ArrayList<>();
  private final Field2d m_field = new Field2d();

  private final StructPublisher<Pose2d> m_posePublisher =
      NetworkTableInstance.getDefault()
          .getStructTopic("Localizer/Pose", Pose2d.struct)
          .publish();

  public Localizer(Drivetrain drivetrain) {
    m_drivetrain = drivetrain;

    // The estimator is swerve-shaped at its core: it needs the drivetrain's
    // kinematics and a first sample to start blending from.
    m_estimator = new SwerveDrivePoseEstimator(
        drivetrain.getKinematics(),
        drivetrain.getRotation(),
        drivetrain.getModulePositions(),
        new Pose2d()); // start at (0, 0, 0°) until an auto resets it

    // The drivetrain is the odometry backbone — register it first.
    addProvider(drivetrain);

    SmartDashboard.putData("Field", m_field); // the SimGUI field view from Lesson 11
    Scheduler.getDefault().addPeriodic(this::periodic);
  }

  /** Register a source of pose information. */
  public void addProvider(PoseProvider provider) {
    m_providers.add(provider);
  }

  private void periodic() {
    for (PoseProvider provider : m_providers) {
      provider.updatePoseEstimate(m_estimator);
    }
    m_posePublisher.set(getPose());
    m_field.setRobotPose(getPose());
  }

  public Pose2d getPose() {
    return m_estimator.getEstimatedPosition();
  }

  /** Re-anchor the estimate — re-supplies the live gyro and wheel positions. */
  public void resetPose(Pose2d pose) {
    m_estimator.resetPosition(
        m_drivetrain.getRotation(), m_drivetrain.getModulePositions(), pose);
  }
}
