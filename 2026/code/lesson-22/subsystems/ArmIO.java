package frc.robot.subsystems;

import org.littletonrobotics.junction.AutoLog;

/**
 * The contract between the arm's logic and its hardware. Two motors behind one
 * interface: a pivot that goes to angles, and a roller that just spins. Default
 * bodies do nothing, so the replay implementation is just `new ArmIO() {}`.
 */
public interface ArmIO {
    @AutoLog
    public static class ArmIOInputs {
        public double angleDegrees = 0.0;
        public double velocityDegPerSec = 0.0;
        public double appliedVolts = 0.0;
        public double setpointDegrees = 0.0;
        public double rollerVelocityRotPerSec = 0.0;
        public boolean hasGamePiece = false;
    }

    /** Read every sensor into 'inputs'. Called once per tick, before anything else. */
    public default void updateInputs(ArmIOInputs inputs) {}

    /** Hand the firmware an angle to profile toward and then hold. */
    public default void setGoalAngleDegrees(double angleDegrees) {}

    /** Spin the roller at a fraction of full output. No goal, no profile. */
    public default void setRollerOutput(double output) {}
}
