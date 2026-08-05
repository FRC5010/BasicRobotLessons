package frc.robot.subsystems;

import static edu.wpi.first.units.Units.Meters;
import static edu.wpi.first.units.Units.Volts;

import org.littletonrobotics.junction.Logger;
import org.littletonrobotics.junction.mechanism.LoggedMechanism2d;
import org.littletonrobotics.junction.mechanism.LoggedMechanismLigament2d;
import org.littletonrobotics.junction.mechanism.LoggedMechanismRoot2d;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.wpilibj.Alert;
import edu.wpi.first.wpilibj.Alert.AlertType;
import edu.wpi.first.units.measure.Distance;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants;
import frc.robot.Constants.ElevatorConstants;

/**
 * A scoring elevator on the same spine as the swerve modules: it owns an
 * ElevatorIO chosen by the current mode, a logged inputs bundle, and the
 * decision about where it is allowed to go.
 */
public class Elevator extends SubsystemBase {
    private final ElevatorIO m_io = switch (Constants.kCurrentMode) {
        case REAL -> new ElevatorIOTalonFX(ElevatorConstants.kMotorPort);
        case SIM -> new ElevatorIOSim(ElevatorConstants.kMotorPort);
        case REPLAY -> new ElevatorIO() {}; // inputs come from the log
    };
    private final ElevatorIOInputsAutoLogged m_inputs = new ElevatorIOInputsAutoLogged();

    private Distance m_goal = ElevatorConstants.kStowed;
    private boolean m_homed = false;

    // Two things worth saying out loud in the pit, and they are different kinds
    // of bad: a missing motor means the robot cannot work, an unhomed elevator
    // means it will work wrongly.
    private final Alert m_disconnected =
            new Alert("Elevator motor is not on the CAN bus", AlertType.kError);
    private final Alert m_notHomed =
            new Alert("Elevator has never been homed", AlertType.kWarning);

    // The picture: a canvas, one point anchored to it, and a chain of segments.
    private final LoggedMechanism2d m_mechanism = new LoggedMechanism2d(
            ElevatorConstants.kDisplayWidth, ElevatorConstants.kDisplayHeight);
    private final LoggedMechanismRoot2d m_base = m_mechanism.getRoot(
            "Base", ElevatorConstants.kDisplayWidth.in(Meters) / 2, 0);
    /** Straight up from the base. Its length is the carriage height. */
    private final LoggedMechanismLigament2d m_carriage = m_base.append(
            new LoggedMechanismLigament2d(
                    "Carriage", Meters.of(0), ElevatorConstants.kCarriageAngle));

    @Override
    public void periodic() {
        m_io.updateInputs(m_inputs);
        Logger.processInputs("Elevator", m_inputs);
        Logger.recordOutput("Elevator/GoalMeters", m_goal.in(Meters));
        Logger.recordOutput("Elevator/AtGoal", atGoal());
        Logger.recordOutput("Elevator/Homed", m_homed);

        // Alerts are set every tick, not raised once: an alert is a statement
        // about how things are now, so it has to be able to go away again.
        m_disconnected.set(!m_inputs.motorConnected);
        m_notHomed.set(!m_homed);

        // The picture is built once and mutated every tick. Only the carriage
        // changes here; whatever is appended to it rides along for free.
        m_carriage.setLength(m_inputs.heightMeters);
        m_carriage.setColor(
                atGoal() ? ElevatorConstants.kAtGoalColor : ElevatorConstants.kMovingColor);
        Logger.recordOutput("Elevator/Mechanism", m_mechanism);
    }

    /** The mount point on top of the carriage. Anything appended here rides along. */
    public LoggedMechanismLigament2d getCarriage() {
        return m_carriage;
    }

    /** Send the elevator to a height. Finishes on arrival; the firmware holds it there. */
    public Command goToHeight(Distance height) {
        return run(() -> {
            m_goal = clampToTravel(height);
            m_io.setGoalHeightMeters(m_goal.in(Meters));
        }).until(this::atGoal);
    }

    /**
     * Drive gently downward until the switch trips, then believe it. Open loop on
     * purpose: the encoder is exactly the thing we don't trust yet.
     */
    public Command home() {
        return run(() -> m_io.setVoltage(ElevatorConstants.kHomingVolts.in(Volts)))
                .until(this::atBottomLimit)
                .finallyDo(() -> {
                    m_io.setVoltage(0);
                    acceptBottomLimit();
                    m_goal = ElevatorConstants.kBottomLimitHeight;
                    m_homed = true;
                });
    }

    /** The switch knows where the carriage is. The encoder only had an opinion. */
    private void acceptBottomLimit() {
        m_io.setPositionMeters(ElevatorConstants.kBottomLimitHeight.in(Meters));
    }

    /** Has homing ever run? Until it has, every height on this elevator is a guess. */
    public boolean isHomed() {
        return m_homed;
    }

    public boolean atBottomLimit() {
        return m_inputs.atBottomLimit;
    }

    /**
     * Re-zero from the switch without taking the subsystem, so this is safe to
     * fire in the middle of someone else's motion.
     */
    public Command rezeroAtBottom() {
        return Commands.runOnce(this::acceptBottomLimit).ignoringDisable(true);
    }

    /** What this mechanism is asking the battery for, right now. */
    public double getSupplyCurrentAmps() {
        return m_inputs.supplyCurrentAmps;
    }

    public boolean atGoal() {
        return Math.abs(m_inputs.heightMeters - m_goal.in(Meters))
                < ElevatorConstants.kTolerance.in(Meters);
    }

    /** A goal outside the elevator's travel is a bug, not a request. Pin it to the ends. */
    private static Distance clampToTravel(Distance height) {
        return Meters.of(MathUtil.clamp(
                height.in(Meters),
                ElevatorConstants.kMinHeight.in(Meters),
                ElevatorConstants.kMaxHeight.in(Meters)));
    }
}
