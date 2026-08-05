package frc.robot.subsystems;

import static edu.wpi.first.units.Units.Degrees;

import org.littletonrobotics.junction.Logger;
import org.littletonrobotics.junction.mechanism.LoggedMechanismLigament2d;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.wpilibj.Alert;
import edu.wpi.first.wpilibj.Alert.AlertType;
import edu.wpi.first.units.measure.Angle;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants;
import frc.robot.Constants.ArmConstants;
import frc.robot.Constants.ElevatorConstants;

/**
 * An intake arm on the same spine as the elevator: an ArmIO chosen by the
 * current mode, a logged inputs bundle, and the decision about where it is
 * allowed to swing. Two motors, one subsystem — they are one mechanism.
 */
public class Arm extends SubsystemBase {
    private final ArmIO m_io = switch (Constants.kCurrentMode) {
        case REAL -> new ArmIOTalonFX(ArmConstants.kPivotMotorPort, ArmConstants.kRollerMotorPort);
        case SIM -> new ArmIOSim(ArmConstants.kPivotMotorPort, ArmConstants.kRollerMotorPort);
        case REPLAY -> new ArmIO() {}; // inputs come from the log
    };
    private final ArmIOInputsAutoLogged m_inputs = new ArmIOInputsAutoLogged();

    private Angle m_goal = ArmConstants.kStowed;

    private final Alert m_disconnected =
            new Alert("Arm motor is not on the CAN bus", AlertType.kError);

    /** The arm's segment in the elevator's drawing — it hangs off the carriage. */
    private final LoggedMechanismLigament2d m_ligament;

    public Arm(Elevator elevator) {
        m_ligament = elevator.getCarriage().append(new LoggedMechanismLigament2d(
                "Arm", ArmConstants.kArmLength, toDrawingAngle(ArmConstants.kMinAngle)));
    }

    @Override
    public void periodic() {
        m_io.updateInputs(m_inputs);
        Logger.processInputs("Arm", m_inputs);
        Logger.recordOutput("Arm/GoalDegrees", m_goal.in(Degrees));
        Logger.recordOutput("Arm/AtGoal", atGoal());

        // Either motor missing is the same problem from the pit's point of view.
        m_disconnected.set(!m_inputs.pivotConnected || !m_inputs.rollerConnected);

        m_ligament.setAngle(toDrawingAngle(Degrees.of(m_inputs.angleDegrees)));
        m_ligament.setColor(
                atGoal() ? ElevatorConstants.kAtGoalColor : ElevatorConstants.kMovingColor);
    }

    /** Swing the arm to an angle. Finishes on arrival; the firmware holds it there. */
    public Command goToAngle(Angle angle) {
        return run(() -> {
            m_goal = clampToTravel(angle);
            m_io.setGoalAngleDegrees(m_goal.in(Degrees));
        }).until(this::atGoal);
    }

    /** Spin the roller while this command runs, and stop it when the command ends. */
    public Command runRoller(double output) {
        return run(() -> m_io.setRollerOutput(output))
                .finallyDo(() -> m_io.setRollerOutput(0.0));
    }

    /** Is a game piece actually sitting in the intake? The roller can't tell you. */
    public boolean hasGamePiece() {
        return m_inputs.hasGamePiece;
    }

    /** Both motors together — the battery doesn't care which one wanted it. */
    public double getSupplyCurrentAmps() {
        return m_inputs.pivotSupplyCurrentAmps + m_inputs.rollerSupplyCurrentAmps;
    }

    public boolean atGoal() {
        return Math.abs(m_inputs.angleDegrees - m_goal.in(Degrees))
                < ArmConstants.kTolerance.in(Degrees);
    }

    /** An angle outside the arm's swing is a bug, not a request. Pin it to the ends. */
    private static Angle clampToTravel(Angle angle) {
        return Degrees.of(MathUtil.clamp(
                angle.in(Degrees),
                ArmConstants.kMinAngle.in(Degrees),
                ArmConstants.kMaxAngle.in(Degrees)));
    }

    /**
     * A ligament's angle is measured from its parent, and the carriage points
     * straight up — so a world angle becomes a drawing angle by subtracting it.
     */
    private static Angle toDrawingAngle(Angle armAngle) {
        return armAngle.minus(ElevatorConstants.kCarriageAngle);
    }
}
