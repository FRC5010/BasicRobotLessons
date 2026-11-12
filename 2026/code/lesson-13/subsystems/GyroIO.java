package frc.robot.subsystems;

import org.littletonrobotics.junction.AutoLog;

/** The contract between heading logic and the gyro hardware. */
public interface GyroIO {
    @AutoLog
    public static class GyroIOInputs {
        public double yawDegrees = 0.0;
    }

    public default void updateInputs(GyroIOInputs inputs) {}

    /** Sim bookkeeping: the commanded rotation rate, in revolutions per second. */
    public default void setSimRotationRate(double omegaRevPerSec) {}
}
