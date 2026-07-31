package frc.robot.subsystems;

import static edu.wpi.first.units.Units.Degrees;
import static edu.wpi.first.units.Units.Meters;

import org.littletonrobotics.junction.Logger;
import org.littletonrobotics.junction.mechanism.LoggedMechanism2d;
import org.littletonrobotics.junction.mechanism.LoggedMechanismLigament2d;
import org.littletonrobotics.junction.mechanism.LoggedMechanismRoot2d;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.units.measure.Distance;
import edu.wpi.first.wpilibj2.command.Command;
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

    // The picture: a canvas, one point anchored to it, and a chain of segments.
    private final LoggedMechanism2d m_mechanism = new LoggedMechanism2d(
            ElevatorConstants.kDisplayWidth, ElevatorConstants.kDisplayHeight);
    private final LoggedMechanismRoot2d m_base = m_mechanism.getRoot(
            "Base", ElevatorConstants.kDisplayWidth.in(Meters) / 2, 0);
    /** Straight up from the base. Its length is the carriage height. */
    private final LoggedMechanismLigament2d m_carriage = m_base.append(
            new LoggedMechanismLigament2d("Carriage", Meters.of(0), Degrees.of(90)));
    /** Rides on top of the carriage. Lesson 20 puts a real arm here. */
    private final LoggedMechanismLigament2d m_effector = m_carriage.append(
            new LoggedMechanismLigament2d(
                    "Effector", ElevatorConstants.kEffectorLength, Degrees.of(-90)));

    @Override
    public void periodic() {
        m_io.updateInputs(m_inputs);
        Logger.processInputs("Elevator", m_inputs);
        Logger.recordOutput("Elevator/GoalMeters", m_goal.in(Meters));
        Logger.recordOutput("Elevator/AtGoal", atGoal());

        // The picture is built once and mutated every tick; only the carriage
        // changes, and the effector rides along with it for free.
        m_carriage.setLength(m_inputs.heightMeters);
        m_carriage.setColor(
                atGoal() ? ElevatorConstants.kAtGoalColor : ElevatorConstants.kMovingColor);
        Logger.recordOutput("Elevator/Mechanism", m_mechanism);
    }

    /** Send the elevator to a height. Finishes on arrival; the firmware holds it there. */
    public Command goToHeight(Distance height) {
        return run(() -> {
            m_goal = clampToTravel(height);
            m_io.setGoalHeightMeters(m_goal.in(Meters));
        }).until(this::atGoal);
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
