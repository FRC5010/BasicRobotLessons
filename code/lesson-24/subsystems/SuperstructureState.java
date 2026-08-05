package frc.robot.subsystems;

import edu.wpi.first.wpilibj.LEDPattern;
import frc.robot.Constants.LedConstants;

/**
 * Everything the robot can be doing, as one value. Not a sensor reading and not
 * a button press — a name for the situation the whole robot is in.
 *
 * <p>Called SuperstructureState and not RobotState because WPILib already ships
 * a class called RobotState, and having two of those in one file is an afternoon
 * you don't get back.
 */
public enum SuperstructureState {
    UNHOMED(LedConstants.kUnhomed),
    IDLE(LedConstants.kIdle),
    INTAKING(LedConstants.kIntaking),
    HANDOFF(LedConstants.kHandoff),
    HOLDING(LedConstants.kHolding),
    SCORING(LedConstants.kScoring);

    private final LEDPattern m_pattern;

    SuperstructureState(LEDPattern pattern) {
        m_pattern = pattern;
    }

    /** What the strip shows while the robot is in this state. */
    public LEDPattern pattern() {
        return m_pattern;
    }

    /**
     * Can a request move the robot from here to there? This is a rule about how
     * the robot is built, not about this instant — no sensor is read to answer
     * it, and the answer never changes.
     *
     * <p>UNHOMED answers no to everything on purpose. The only way out is to
     * actually home the elevator; no button gets to simply declare it done.
     */
    public boolean canGoTo(SuperstructureState next) {
        return switch (this) {
            case UNHOMED -> false;
            case IDLE -> next == INTAKING;
            case INTAKING -> next == HANDOFF || next == IDLE;
            case HANDOFF -> next == HOLDING || next == IDLE;
            case HOLDING -> next == SCORING || next == IDLE;
            case SCORING -> next == IDLE;
        };
    }
}
