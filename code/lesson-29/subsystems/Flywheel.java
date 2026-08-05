package frc.robot.subsystems;

import static edu.wpi.first.units.Units.Meters;
import static edu.wpi.first.units.Units.RotationsPerSecond;

import org.littletonrobotics.junction.Logger;
import org.littletonrobotics.junction.mechanism.LoggedMechanism2d;
import org.littletonrobotics.junction.mechanism.LoggedMechanismLigament2d;
import org.littletonrobotics.junction.mechanism.LoggedMechanismRoot2d;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.units.measure.Angle;
import edu.wpi.first.units.measure.AngularVelocity;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants;
import frc.robot.Constants.ElevatorConstants;
import frc.robot.Constants.FlywheelConstants;

/**
 * A shooter wheel: the fourth mechanism on the same spine, and the first whose
 * goal is a speed rather than a place.
 */
public class Flywheel extends SubsystemBase {
    private final FlywheelIO m_io = switch (Constants.kCurrentMode) {
        case REAL -> new FlywheelIOTalonFX(FlywheelConstants.kMotorPort);
        case SIM -> new FlywheelIOSim(FlywheelConstants.kMotorPort);
        case REPLAY -> new FlywheelIO() {}; // inputs come from the log
    };
    private final FlywheelIOInputsAutoLogged m_inputs = new FlywheelIOInputsAutoLogged();

    private AngularVelocity m_goal = RotationsPerSecond.of(0);

    // A speedometer: one hub, two needles. There is nothing physical to draw
    // here — a spinning wheel looks the same at every speed — so the picture is
    // of the number instead.
    private final LoggedMechanism2d m_dial = new LoggedMechanism2d(
            FlywheelConstants.kDialSize.in(Meters), FlywheelConstants.kDialSize.in(Meters));
    private final LoggedMechanismRoot2d m_hub = m_dial.getRoot(
            "Hub",
            FlywheelConstants.kDialSize.in(Meters) / 2,
            FlywheelConstants.kDialSize.in(Meters) / 2);
    /** Where the wheel is asked to be. The gap to the other needle is the error. */
    private final LoggedMechanismLigament2d m_goalNeedle = m_hub.append(
            new LoggedMechanismLigament2d(
                    "Goal", FlywheelConstants.kNeedleLength, FlywheelConstants.kZeroAngle));
    /** Where the wheel actually is. */
    private final LoggedMechanismLigament2d m_needle = m_hub.append(
            new LoggedMechanismLigament2d(
                    "Speed", FlywheelConstants.kNeedleLength, FlywheelConstants.kZeroAngle));

    @Override
    public void periodic() {
        m_io.updateInputs(m_inputs);
        Logger.processInputs("Flywheel", m_inputs);
        Logger.recordOutput("Flywheel/GoalRps", m_goal.in(RotationsPerSecond));
        Logger.recordOutput("Flywheel/AtSpeed", atSpeed());
        updateDial();
    }

    /** Point both needles and publish the dial. Runs every tick, like any drawing. */
    private void updateDial() {
        m_goalNeedle.setAngle(toDialAngle(m_goal.in(RotationsPerSecond)));
        m_needle.setAngle(toDialAngle(m_inputs.velocityRps));
        m_needle.setColor(
                atSpeed() ? ElevatorConstants.kAtGoalColor : ElevatorConstants.kMovingColor);
        Logger.recordOutput("Flywheel/Dial", m_dial);
    }

    /**
     * Where a needle points for a given speed: straight down at rest, straight up
     * at full scale, sweeping round the left half for positive speeds and the
     * right half for negative ones.
     *
     * <p>Clamped, so a wheel driven past its own free speed pins the needle at the
     * top instead of wrapping back round and lying about it.
     */
    private static Angle toDialAngle(double rps) {
        double fraction = MathUtil.clamp(
                rps / FlywheelConstants.kFreeSpeed.in(RotationsPerSecond), -1.0, 1.0);
        return FlywheelConstants.kZeroAngle.minus(FlywheelConstants.kFullSweep.times(fraction));
    }

    /**
     * Hold a speed. Unlike the elevator's goToHeight this does not finish on
     * arrival — a flywheel that reached its speed and stopped trying would
     * immediately slow down again.
     */
    public Command spinUp(AngularVelocity speed) {
        return run(() -> {
            m_goal = speed;
            m_io.setGoalRps(speed.in(RotationsPerSecond));
        });
    }

    /** Sit at the idle speed, so the next shot doesn't start from nothing. */
    public Command idle() {
        return spinUp(FlywheelConstants.kIdleSpeed);
    }

    /** Let it coast down. */
    public Command stop() {
        return runOnce(() -> {
            m_goal = RotationsPerSecond.of(0);
            m_io.stop();
        });
    }

    /**
     * Fast enough to shoot. Note what this does NOT ask: whether the wheel has
     * settled, or which way the error is going — just whether it is close.
     */
    public boolean atSpeed() {
        return Math.abs(m_inputs.velocityRps - m_goal.in(RotationsPerSecond))
                < FlywheelConstants.kTolerance.in(RotationsPerSecond);
    }

    public AngularVelocity getSpeed() {
        return RotationsPerSecond.of(m_inputs.velocityRps);
    }
}
