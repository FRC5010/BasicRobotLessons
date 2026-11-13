package frc.robot.subsystems;

import org.littletonrobotics.junction.AutoLog;

/**
 * The contract between the flywheel's logic and its hardware. Same shape as the
 * elevator's and the arm's — the only difference is that every value here is a
 * speed rather than a place.
 */
public interface FlywheelIO {
    @AutoLog
    public static class FlywheelIOInputs {
        public double velocityRps = 0.0;
        public double appliedVolts = 0.0;
        public double setpointRps = 0.0;
        public double statorCurrentAmps = 0.0;
    }

    /** Read every sensor into 'inputs'. Called once per tick, before anything else. */
    public default void updateInputs(FlywheelIOInputs inputs) {}

    /** Hand the firmware a speed to reach and then hold. */
    public default void setGoalRps(double rps) {}

    /** Let it coast. Not a goal of zero — a goal of nothing. */
    public default void stop() {}
}
