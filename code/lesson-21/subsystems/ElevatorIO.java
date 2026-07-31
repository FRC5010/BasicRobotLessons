package frc.robot.subsystems;

import org.littletonrobotics.junction.AutoLog;

/**
 * The contract between the elevator's logic and its hardware. One read and one
 * write — an elevator is a simpler device than a swerve module. Default bodies
 * do nothing, so the replay implementation is just `new ElevatorIO() {}`.
 */
public interface ElevatorIO {
    @AutoLog
    public static class ElevatorIOInputs {
        public double heightMeters = 0.0;
        public double velocityMetersPerSec = 0.0;
        public double appliedVolts = 0.0;
        public double setpointMeters = 0.0;
        public double statorCurrentAmps = 0.0;
        public boolean atBottomLimit = false;
    }

    /** Read every sensor into 'inputs'. Called once per tick, before anything else. */
    public default void updateInputs(ElevatorIOInputs inputs) {}

    /** Hand the firmware a height to profile toward and then hold. */
    public default void setGoalHeightMeters(double heightMeters) {}

    /** Open-loop drive, for homing: no goal, no profile, just a voltage. */
    public default void setVoltage(double volts) {}

    /** Declare the carriage to be at this height right now, whatever it read before. */
    public default void setPositionMeters(double heightMeters) {}
}
