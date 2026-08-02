package frc.robot.subsystems;

import static edu.wpi.first.units.Units.Seconds;

import org.littletonrobotics.junction.Logger;

import edu.wpi.first.math.filter.Debouncer;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import edu.wpi.first.wpilibj2.command.button.Trigger;
import frc.robot.Constants.ArmConstants;
import frc.robot.Constants.ElevatorConstants;

/**
 * What the robot is doing, in one place. It owns no motors — it owns the single
 * fact every other decision hangs off, and the rules about how that fact is
 * allowed to change.
 *
 * <p>It requires nothing, so a state request can never cancel a mechanism that
 * is already moving.
 */
public class Superstructure extends SubsystemBase {
    private final Elevator m_elevator;
    private final Arm m_arm;

    private SuperstructureState m_state = SuperstructureState.UNHOMED;

    /** The filter Lesson 22 hung on a Trigger, here in its plain form. */
    private final Debouncer m_pieceFilter =
            new Debouncer(ArmConstants.kBeamDebounce.in(Seconds));

    public Superstructure(Elevator elevator, Arm arm) {
        m_elevator = elevator;
        m_arm = arm;
    }

    @Override
    public void periodic() {
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

        Logger.recordOutput("Superstructure/State", m_state);
    }

    /** What the robot is doing. Everything downstream reads this instead of sensors. */
    public SuperstructureState getState() {
        return m_state;
    }

    /** True exactly while the robot is in this state, as a Trigger you can bind to. */
    public Trigger inState(SuperstructureState state) {
        return new Trigger(() -> m_state == state);
    }

    /** Ask to start intaking: drop the arm, then spin the roller. */
    public Command requestIntake() {
        return Commands.sequence(
                        Commands.runOnce(() -> m_state = SuperstructureState.INTAKING),
                        m_arm.goToAngle(ArmConstants.kIntake),
                        m_arm.runRoller(ArmConstants.kIntakeSpeed))
                .onlyIf(() -> allow(SuperstructureState.INTAKING));
    }

    /** Ask to score: spin the roller out. The piece leaving is what ends the state. */
    public Command requestScore() {
        return Commands.sequence(
                        Commands.runOnce(() -> m_state = SuperstructureState.SCORING),
                        m_arm.runRoller(ArmConstants.kEjectSpeed))
                .onlyIf(() -> allow(SuperstructureState.SCORING));
    }

    /** Ask to give up and go back to neutral. */
    public Command requestIdle() {
        return Commands.runOnce(() -> m_state = SuperstructureState.IDLE)
                .onlyIf(() -> allow(SuperstructureState.IDLE));
    }

    /**
     * The handoff — the thing Lesson 22 did without being able to name it. Bound
     * to arriving in HANDOFF, so there is no guard here: getting to this state at
     * all means the state machine already said yes.
     */
    public Command handoff() {
        return Commands.parallel(
                m_arm.goToAngle(ArmConstants.kStowed),
                m_elevator.goToHeight(ElevatorConstants.kScoreMid));
    }

    /** Back to neutral: arm stowed, elevator down. Bound to arriving in IDLE. */
    public Command stow() {
        return Commands.parallel(
                m_arm.goToAngle(ArmConstants.kStowed),
                m_elevator.goToHeight(ElevatorConstants.kStowed));
    }

    /**
     * True when a request is legal. A refusal gets written to the log, because a
     * refusal nobody can see is a bug report nobody ever files.
     */
    private boolean allow(SuperstructureState next) {
        boolean ok = m_state.canGoTo(next);
        if (!ok) {
            Logger.recordOutput("Superstructure/Rejected", m_state + " -> " + next);
        }
        return ok;
    }
}
