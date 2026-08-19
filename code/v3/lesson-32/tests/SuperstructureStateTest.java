package first.robot;

import static first.robot.subsystems.SuperstructureState.IDLE;
import static first.robot.subsystems.SuperstructureState.INTAKING;
import static first.robot.subsystems.SuperstructureState.SCORING;
import static first.robot.subsystems.SuperstructureState.UNHOMED;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import first.robot.subsystems.SuperstructureState;

public class SuperstructureStateTest {

  @Test
  void scoringRequiresHavingIntakenFirst() {
    assertFalse(IDLE.canGoTo(SCORING), "cannot score with nothing on board");
    assertTrue(INTAKING.canGoTo(SCORING), "intaking is exactly when you're ready to score");
  }

  @Test
  void nothingEscapesUnhomedByAsking() {
    for (SuperstructureState next : SuperstructureState.values()) {
      assertFalse(UNHOMED.canGoTo(next),
          "a request must not get the robot out of UNHOMED via " + next);
    }
  }

  @Test
  void everyStateCanGiveUpAndGoBackToIdle() {
    for (SuperstructureState from : SuperstructureState.values()) {
      if (from == UNHOMED || from == IDLE) {
        continue;
      }
      assertTrue(from.canGoTo(IDLE), from + " has no way back to IDLE");
    }
  }
}
