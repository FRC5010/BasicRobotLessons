package frc.robot.subsystems;

import org.littletonrobotics.junction.Logger;

import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.math.kinematics.SwerveModulePosition;
import edu.wpi.first.math.kinematics.SwerveModuleState;

/**
 * One swerve corner, now hardware-free: it owns a ModuleIO (real or replay),
 * a logged inputs bundle, and the cosine decision. periodic() senses; a
 * command's setDesiredState() acts.
 */
public class SwerveModule {
    /** Position of this module relative to robot center, in meters. */
    public final Translation2d location;

    private final ModuleIO m_io;
    private final ModuleIOInputsAutoLogged m_inputs = new ModuleIOInputsAutoLogged();
    private final String m_logKey; // e.g. "Drivetrain/Module0"

    public SwerveModule(ModuleIO io, String logKey, Translation2d location) {
        m_io = io;
        m_logKey = logKey;
        this.location = location;
    }

    /** One tick of sensing: read the hardware into the bundle and log it. */
    public void periodic() {
        m_io.updateInputs(m_inputs);
        Logger.processInputs(m_logKey, m_inputs);
    }

    /** One tick of control: hand the IO its targets. Called by a command each tick. */
    public void setDesiredState(SwerveModuleState state) {
        double targetDegrees = state.angle.getDegrees();
        m_io.setSteerAngleDegrees(targetDegrees);

        // Cosine compensation (Lesson 9) — a decision, so it stays in our code.
        double error = targetDegrees - m_inputs.steerAngleDegrees;
        double alignment = Math.cos(Math.toRadians(error));
        m_io.setDriveVelocityMetersPerSec(state.speedMetersPerSecond * alignment);
    }

    public double getSteerAngleDegrees() {
        return m_inputs.steerAngleDegrees;
    }

    public double getDistanceMeters() {
        return m_inputs.drivePositionMeters;
    }

    public double getDriveVelocityMetersPerSec() {
        return m_inputs.driveVelocityMetersPerSec;
    }

    /** How many high-rate samples arrived since the last tick. Zero if no thread. */
    public int getOdometrySampleCount() {
        return Math.min(m_inputs.odometryDrivePositionsMeters.length,
                m_inputs.odometrySteerAngleDegrees.length);
    }

    /** Sample number 'i', as the pose estimator wants it. */
    public SwerveModulePosition getOdometryPosition(int i) {
        return new SwerveModulePosition(
                m_inputs.odometryDrivePositionsMeters[i],
                Rotation2d.fromDegrees(m_inputs.odometrySteerAngleDegrees[i]));
    }

    /** When each of those samples was taken. */
    public double[] getOdometryTimestamps() {
        return m_inputs.odometryTimestamps;
    }

    public SwerveModulePosition getPosition() {
        return new SwerveModulePosition(
                m_inputs.drivePositionMeters,
                Rotation2d.fromDegrees(m_inputs.steerAngleDegrees));
    }

    public void resetDrivePosition() {
        m_io.resetDrivePosition();
    }
}
