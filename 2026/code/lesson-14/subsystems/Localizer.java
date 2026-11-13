package frc.robot.subsystems;

import java.util.ArrayList;
import java.util.List;

import org.littletonrobotics.junction.Logger;

import edu.wpi.first.math.estimator.SwerveDrivePoseEstimator;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.wpilibj.smartdashboard.Field2d;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj2.command.SubsystemBase;

/**
 * Owns the pose estimator and keeps it fed: every registered PoseProvider
 * folds its evidence in each tick, odometry first, corrections after.
 */
public class Localizer extends SubsystemBase {
    private final Drivetrain m_drivetrain;
    private final SwerveDrivePoseEstimator m_estimator;
    private final List<PoseProvider> m_providers = new ArrayList<>();
    private final Field2d m_field = new Field2d();

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
    }

    /** Register a source of pose information. */
    public void addProvider(PoseProvider provider) {
        m_providers.add(provider);
    }

    @Override
    public void periodic() {
        for (PoseProvider provider : m_providers) {
            provider.updatePoseEstimate(m_estimator);
        }
        Logger.recordOutput("Localizer/Pose", getPose());
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
