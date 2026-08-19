package first.robot.subsystems;

import org.wpilib.hardware.led.LEDPattern;

import first.robot.Constants.LedConstants;

/**
 * Every mode the superstructure can be in, and the one question an enum
 * constant can answer on its own: is a given move legal from here? Nothing
 * below reads a sensor — that is deliberate. canGoTo is a rulebook, not a
 * measurement.
 */
public enum SuperstructureState {
  UNHOMED(LedConstants.kUnhomed),
  IDLE(LedConstants.kIdle),
  INTAKING(LedConstants.kIntaking),
  SCORING(LedConstants.kScoring);

  private final LEDPattern m_pattern;

  SuperstructureState(LEDPattern pattern) {
    m_pattern = pattern;
  }

  public LEDPattern pattern() {
    return m_pattern;
  }

  /**
   * Is 'next' a legal move from this state? An exhaustive switch expression:
   * add a state and this stops compiling until you say what it can do.
   */
  public boolean canGoTo(SuperstructureState next) {
    return switch (this) {
      // No request of any kind gets the robot out of UNHOMED. The only exit
      // is Superstructure.periodic() noticing the elevator homed itself.
      case UNHOMED -> false;
      // You have to go get a piece before you can claim to be ready to
      // score one — IDLE can only ask to go collect.
      case IDLE -> next == INTAKING;
      case INTAKING -> next == IDLE || next == SCORING;
      case SCORING -> next == IDLE;
    };
  }
}
