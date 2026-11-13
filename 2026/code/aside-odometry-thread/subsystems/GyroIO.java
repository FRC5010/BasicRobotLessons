package frc.robot.subsystems;

import org.littletonrobotics.junction.AutoLog;

/**
 * The contract between heading logic and the gyro hardware.
 *
 * <p>Lesson 16 removed setSimRotationRate: nothing integrates a commanded
 * rotation rate anymore. The physics engine rotates the robot, and the gyro
 * just reports what happened — including heading lost in a collision.
 */
public interface GyroIO {
    @AutoLog
    public static class GyroIOInputs {
        public double yawDegrees = 0.0;

        /** High-rate yaw samples, newest last. Empty if the gyro isn't sampled. */
        public double[] odometryYawDegrees = new double[] {};
    }

    public default void updateInputs(GyroIOInputs inputs) {}
}
