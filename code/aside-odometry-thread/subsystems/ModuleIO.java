package frc.robot.subsystems;

import org.littletonrobotics.junction.AutoLog;

/**
 * The contract between a swerve module's logic and its hardware. One read
 * (updateInputs) and three writes. Default bodies do nothing, so the replay
 * implementation is just `new ModuleIO() {}`.
 */
public interface ModuleIO {
    @AutoLog
    public static class ModuleIOInputs {
        public double steerAngleDegrees = 0.0;
        public double drivePositionMeters = 0.0;
        public double driveVelocityMetersPerSec = 0.0;

        // High-rate samples, newest last. Empty when no odometry thread is
        // running, which is exactly what makes this change safe to add.
        public double[] odometryTimestamps = new double[] {};
        public double[] odometryDrivePositionsMeters = new double[] {};
        public double[] odometrySteerAngleDegrees = new double[] {};
    }

    /** Read every sensor into 'inputs'. Called once per tick, before anything else. */
    public default void updateInputs(ModuleIOInputs inputs) {}

    /** Firmware position control for steering. */
    public default void setSteerAngleDegrees(double angleDegrees) {}

    /** Firmware velocity control for drive (wheel meters per second). */
    public default void setDriveVelocityMetersPerSec(double mps) {}

    /** Zero the drive encoder. */
    public default void resetDrivePosition() {}
}
