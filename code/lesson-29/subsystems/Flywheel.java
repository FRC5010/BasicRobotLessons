package frc.robot.subsystems;

import static edu.wpi.first.units.Units.RotationsPerSecond;

import org.littletonrobotics.junction.Logger;

import edu.wpi.first.units.measure.AngularVelocity;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants;
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

    @Override
    public void periodic() {
        m_io.updateInputs(m_inputs);
        Logger.processInputs("Flywheel", m_inputs);
        Logger.recordOutput("Flywheel/GoalRps", m_goal.in(RotationsPerSecond));
        Logger.recordOutput("Flywheel/AtSpeed", atSpeed());
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
