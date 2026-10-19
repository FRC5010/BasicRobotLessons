package first.robot.subsystems;

import static org.wpilib.units.Units.Seconds;

import org.wpilib.command3.Command;
import org.wpilib.command3.Scheduler;
import org.wpilib.command3.Trigger;
import org.wpilib.math.filter.Debouncer;
import org.wpilib.telemetry.Telemetry;

import first.robot.Constants.ArmConstants;
import first.robot.Constants.ElevatorConstants;

/**
 * What the robot is doing, in one place. It owns no motors — it owns the
 * single fact every other decision hangs off, and the rules about how that
 * fact is allowed to change.
 *
 * <p>Requires nothing, so a state request can never cancel a mechanism that
 * is already moving. It needs the scheduler for periodic(), but nothing ever
 * requires a Superstructure, so it is a plain class with a periodic
 * heartbeat, exactly like Localizer.
 */
public class Superstructure {
  private final Elevator m_elevator;
  private final Arm m_arm;

  private SuperstructureState m_state = SuperstructureState.UNHOMED;

  /** The filter Lesson 22 hung on a Trigger, here in its plain form. */
  private final Debouncer m_pieceFilter = new Debouncer(ArmConstants.kBeamDebounce.in(Seconds));

  public Superstructure(Elevator elevator, Arm arm) {
    m_elevator = elevator;
    m_arm = arm;
    Scheduler.getDefault().addPeriodic(this::periodic);
  }

  private void periodic() {
    boolean hasPiece = m_pieceFilter.calculate(m_arm.hasGamePiece());

    // The transitions the robot makes for itself, once the hardware has
    // actually caught up. These don't consult canGoTo: that rule is about
    // requests, and this is the state machine deciding, not asking.
    switch (m_state) {
      case UNHOMED -> {
        if (m_elevator.isHomed()) {
          m_state = SuperstructureState.IDLE;
        }
      }
      case INTAKING -> {
        if (hasPiece) {
          m_state = SuperstructureState.HANDOFF;
        }
      }
      case HANDOFF -> {
        if (!hasPiece) {
          m_state = SuperstructureState.IDLE;
        } else if (m_elevator.atGoal() && m_arm.atGoal()) {
          m_state = SuperstructureState.HOLDING;
        }
      }
      case HOLDING, SCORING -> {
        if (!hasPiece) {
          m_state = SuperstructureState.IDLE;
        }
      }
      case IDLE -> {
        // Nothing happens here on its own. Somebody has to ask.
      }
    }

    Telemetry.log("Superstructure/State", m_state.name());
  }

  /** What the robot is doing. Everything downstream reads this instead of sensors. */
  public SuperstructureState getState() {
    return m_state;
  }

  /**
   * ====== NEXT LESSON: ADD CODE HERE ======
   * Whether the robot is idle with the elevator and arm where they were sent,
   * which is what an auto waits for before it starts driving.
   */

  /** True exactly while the robot is in this state, as a Trigger you can bind to. */
  public Trigger inState(SuperstructureState state) {
    return new Trigger(() -> m_state == state);
  }

  // --- Requests: button-bound, guarded, and nothing but a mode switch. ---

  public Command requestIntake() {
    return request(SuperstructureState.INTAKING);
  }

  public Command requestIdle() {
    return request(SuperstructureState.IDLE);
  }

  public Command requestScore() {
    return request(SuperstructureState.SCORING);
  }

  private Command request(SuperstructureState next) {
    return Command.noRequirements(coroutine -> {
          if (!allow(next)) {
            return;
          }
          m_state = next;
        })
        .named("Request " + next.name());
  }

  /** Legality check, logged on refusal — a refused request looks identical to a broken button otherwise. */
  private boolean allow(SuperstructureState next) {
    boolean ok = m_state.canGoTo(next);
    if (!ok) {
      Telemetry.log("Superstructure/Rejected", m_state + " -> " + next);
    }
    return ok;
  }

  // --- Motion: inState-bound, unguarded, because arriving already means yes. ---

  /** Both steps require Arm — the same Mechanism — so this has to be a sequence, not a parallel. */
  public Command intakeMotion() {
    return Command.sequence(
            m_arm.goToAngle(ArmConstants.kIntake),
            m_arm.runRoller(ArmConstants.kIntakeSpeed))
        .named("Intake Motion");
  }

  /**
   * The handoff — the thing Lesson 22 did without being able to name it. Arm
   * and elevator require different Mechanisms, so this may run in parallel.
   */
  public Command handoffMotion() {
    return Command.parallel(
            m_arm.goToAngle(ArmConstants.kStowed),
            m_elevator.goToHeight(ElevatorConstants.kScoreMid))
        .named("Handoff Motion");
  }

  /** Roller out. The piece leaving is what ends the state, not a timer. */
  public Command scoreMotion() {
    return m_arm.runRoller(ArmConstants.kEjectSpeed);
  }

  /** Back to neutral: arm stowed, elevator down. */
  public Command idleMotion() {
    return Command.parallel(
            m_arm.goToAngle(ArmConstants.kStowed),
            m_elevator.goToHeight(ElevatorConstants.kStowed))
        .named("Idle Motion");
  }
}
