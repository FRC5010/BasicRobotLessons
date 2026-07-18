package frc.robot.subsystems;

import java.util.function.DoubleSupplier;

import com.ctre.phoenix6.hardware.TalonFX;
import com.ctre.phoenix6.sim.TalonFXSimState;

import org.littletonrobotics.junction.Logger;

import edu.wpi.first.math.system.plant.DCMotor;
import edu.wpi.first.math.system.plant.LinearSystemId;
import edu.wpi.first.wpilibj.RobotController;
import edu.wpi.first.wpilibj.simulation.DCMotorSim;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants;

public class DriveModule extends SubsystemBase {
    private final TalonFX m_driveMotor = new TalonFX(Constants.DriveConstants.kDriveMotorPort); // CAN ID 1 — change to
                                                                                                // yours

    // The bridge: lets us push fake sensor values into the TalonFX during sim.
    private final TalonFXSimState m_driveSim = m_driveMotor.getSimState();

    // The physics: one Kraken X60 motor spinning a small inertia.
    private final DCMotorSim m_driveModel =
            new DCMotorSim(
                    LinearSystemId.createDCMotorSystem(DCMotor.getKrakenX60(1), 0.001, 1.0),
                    DCMotor.getKrakenX60(1));

    public DriveModule() {
        // Setup that should happen when the module is created goes here.
    }

    /** Spins the drive motor at the given fraction of full power (-1.0 to 1.0). */
    public Command driveAtSpeed(double fraction) {
        // Motors hold whatever value you last set — command 0 yourself when done.
        return startEnd(() -> m_driveMotor.set(fraction), () -> m_driveMotor.set(0));
    }

    /** Drives continuously using a live speed source (e.g. a joystick axis). */
    public Command driveWithJoystick(DoubleSupplier speedSupplier) {
        return run(() -> {
            double raw = speedSupplier.getAsDouble(); // fetch fresh value this tick
            double speed = applyDeadband(raw, 0.1); // clean it up
            m_driveMotor.set(speed);
        });
    }

    /** Drives continuously using a live speed source (e.g. a joystick axis) and a scale. */
    public Command driveWithJoystick(DoubleSupplier speedSupplier, double scale) {
        return run(() -> {
            double raw = speedSupplier.getAsDouble(); // fetch fresh value this tick
            double speed = applyDeadband(raw, 0.1) * scale; // clean it up, then scale
            m_driveMotor.set(speed * Math.abs(speed)); // square for finer low-speed control
        });
    }

    /**
     * Returns 0 when |value| is within 'band', otherwise passes the value through.
     */
    private double applyDeadband(double value, double band) {
        if (Math.abs(value) < band) {
            return 0.0;
        }
        return value;
    }

    @Override
    public void periodic() {
        double rotations = m_driveMotor.getPosition().getValueAsDouble();
        double rps = m_driveMotor.getVelocity().getValueAsDouble();

        Logger.recordOutput("DriveModule/PositionRotations", rotations);
        Logger.recordOutput("DriveModule/VelocityRotPerSec", rps);
    }

    @Override
    public void simulationPeriodic() {
        // 1. Tell the sim the battery voltage available to the motor.
        m_driveSim.setSupplyVoltage(RobotController.getBatteryVoltage());

        // 2. Read the voltage the TalonFX is applying (result of your set() command).
        double appliedVolts = m_driveSim.getMotorVoltage();

        // 3. Feed that into the physics model and advance time by one tick (20 ms).
        m_driveModel.setInputVoltage(appliedVolts);
        m_driveModel.update(0.020);

        // 4. Push the model's resulting motion BACK into the TalonFX's fake encoder.
        m_driveSim.setRawRotorPosition(m_driveModel.getAngularPositionRotations());
        m_driveSim.setRotorVelocity(m_driveModel.getAngularVelocityRPM() / 60.0);

        // Try it: log the applied voltage to overlay against velocity.
        Logger.recordOutput("DriveModule/AppliedVolts", appliedVolts);
    }
}
