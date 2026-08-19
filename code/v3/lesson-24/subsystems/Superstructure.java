package first.robot.subsystems;

import org.wpilib.command3.Command;
import org.wpilib.command3.Scheduler;
import org.wpilib.command3.Trigger;
import org.wpilib.smartdashboard.SmartDashboard;

import first.robot.Constants.ArmConstants;
import first.robot.Constants.ElevatorConstants;

/**
 * The one place that knows what the robot is doing right now, and the one
 * place that decides what it is allowed to do next.
 *
 * <p>Owns no motors and requires nothing — every command below either
 * requires nothing itself (the request commands, which only ever touch
 * m_state) or delegates to Elevator/Arm commands that carry their own
 * requirements. A state request can never preempt a mechanism mid-motion by
 * accident, because asking "what state should we be in" and "move the
 * mechanisms" are different commands.
 *
 * <p>Needs the scheduler, for periodic()'s automatic transition below — but
 * needing the scheduler and being a Mechanism turn out to be two different
 * questions in this framework. Nothing ever requires a Superstructure, so it
 * is a plain class with a periodic heartbeat, exactly like Localizer.
 */
public class Superstructure {
  private final Elevator m_elevator;
  private final Arm m_arm;
  private SuperstructureState m_state = SuperstructureState.UNHOMED;

  public Superstructure(Elevator elevator, Arm arm) {
    m_elevator = elevator;
    m_arm = arm;
    Scheduler.getDefault().addPeriodic(this::periodic);
  }

  /**
   * The only automatic transition in the whole machine, because it is the
   * only one backed by a sensor that still exists: the bottom limit switch
   * from Lesson 21. Every other move in this lesson has to be asked for.
   */
  private void periodic() {
    if (m_state == SuperstructureState.UNHOMED && m_elevator.isHomed()) {
      m_state = SuperstructureState.IDLE;
    }
    SmartDashboard.putString("Superstructure/State", m_state.name());
  }

  public SuperstructureState getState() {
    return m_state;
  }

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
      SmartDashboard.putString("Superstructure/Rejected", m_state + " -> " + next);
    }
    return ok;
  }

  // --- Motion: inState-bound, unguarded, because arriving already means yes. ---

  /** Arm and elevator require different Mechanisms, so this may run in parallel. */
  public Command idleMotion() {
    return Command.parallel(
            m_elevator.goToHeight(ElevatorConstants.kStowed),
            m_arm.goToAngle(ArmConstants.kStowed))
        .named("Idle Motion");
  }

  /** Both steps require Arm — the same Mechanism — so this has to be a sequence, not a parallel. */
  public Command intakeMotion() {
    return Command.sequence(
            m_arm.goToAngle(ArmConstants.kIntake),
            m_arm.runRoller(ArmConstants.kIntakeSpeed))
        .named("Intake Motion");
  }

  /** Elevator and Arm require different Mechanisms, so this may run in parallel too. */
  public Command scoreMotion() {
    return Command.parallel(
            m_elevator.goToHeight(ElevatorConstants.kScoreHigh),
            m_arm.runRoller(ArmConstants.kEjectSpeed))
        .named("Score Motion");
  }
}
