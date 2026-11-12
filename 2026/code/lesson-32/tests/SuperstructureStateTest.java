package frc.robot;

import static frc.robot.subsystems.SuperstructureState.HOLDING;
import static frc.robot.subsystems.SuperstructureState.IDLE;
import static frc.robot.subsystems.SuperstructureState.INTAKING;
import static frc.robot.subsystems.SuperstructureState.SCORING;
import static frc.robot.subsystems.SuperstructureState.UNHOMED;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import frc.robot.subsystems.SuperstructureState;

/**
 * The cheapest useful test on the robot: pure logic, no hardware, no HAL, no
 * waiting. It runs in a millisecond and it checks a rule you can get wrong.
 */
public class SuperstructureStateTest {

    @Test
    void scoringRequiresSomethingToScore() {
        assertFalse(IDLE.canGoTo(SCORING), "cannot score with nothing on board");
        assertFalse(INTAKING.canGoTo(SCORING), "cannot score mid-intake");
        assertTrue(HOLDING.canGoTo(SCORING), "holding a piece is exactly when you can");
    }

    @Test
    void nothingEscapesUnhomedByAsking() {
        for (SuperstructureState next : SuperstructureState.values()) {
            assertFalse(UNHOMED.canGoTo(next),
                    "a request must not get the robot out of UNHOMED via " + next);
        }
    }

    @Test
    void everyStateCanGiveUpAndGoBackToNeutral() {
        for (SuperstructureState from : SuperstructureState.values()) {
            if (from == UNHOMED || from == IDLE) {
                continue;
            }
            assertTrue(from.canGoTo(IDLE), from + " has no way back to IDLE");
        }
    }
}
