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
    private final TalonFX m_steerMotor = new TalonFX(Constants.DriveConstants.kSteerMotorPort); // CAN ID 2 — change to
                                                                                                // yours

    // Sim plumbing for the drive motor.
    private final TalonFXSimState m_driveSim = m_driveMotor.getSimState();
    private final DCMotorSim m_driveModel =
            new DCMotorSim(
                    LinearSystemId.createDCMotorSystem(DCMotor.getKrakenX60(1), 0.001, 1.0),
                    DCMotor.getKrakenX60(1));

    // Sim plumbing for the steering motor (same pattern as the drive motor).
    private final TalonFXSimState m_steerSim = m_steerMotor.getSimState();
    private final DCMotorSim m_steerModel =
            new DCMotorSim(
                    LinearSystemId.createDCMotorSystem(DCMotor.getKrakenX60(1), 0.004, 1.0),
                    DCMotor.getKrakenX60(1));

    public DriveModule() {
        // Setup that should happen when the module is created goes here.
    }

    /** Spins the drive motor at the given fraction of full power (-1.0 to 1.0). */
    public Command driveAtSpeed(double fraction) {
        return startEnd(() -> m_driveMotor.set(fraction), () -> m_driveMotor.set(0));
    }

    /** Drives continuously using a live speed source (e.g. a joystick axis). */
    public Command driveWithJoystick(DoubleSupplier speedSupplier) {
        return run(() -> {
            double raw = speedSupplier.getAsDouble();
            double speed = applyDeadband(raw, 0.1);
            m_driveMotor.set(speed);
        });
    }

    /** Drives continuously using a live speed source (e.g. a joystick axis) and a scale. */
    public Command driveWithJoystick(DoubleSupplier speedSupplier, double scale) {
        return run(() -> {
            double raw = speedSupplier.getAsDouble();
            double speed = applyDeadband(raw, 0.1) * scale;
            m_driveMotor.set(speed * Math.abs(speed));
        });
    }

    /** Current steering angle in degrees (1:1 with the wheel for now — real gearing in L7). */
    public double getSteerAngleDegrees() {
        return m_steerMotor.getPosition().getValueAsDouble() * 360.0; // rotations → degrees
    }

    /** Turns the steering motor toward 'targetDegrees' and holds it there. */
    public Command steerToAngle(double targetDegrees) {
        return run(() -> {
            double measurement = getSteerAngleDegrees(); // where we are
            double error = targetDegrees - measurement; // how far off (degrees)

            // Try it: wrap the error to [-180, 180] so we always take the short way.
            while (error > 180) {
                error -= 360;
            }
            while (error < -180) {
                error += 360;
            }

            double output = clamp(Constants.SteerConstants.kP * error, -1.0, 1.0);
            m_steerMotor.set(output);
        })
                // Motors HOLD the last value — command 0 in cleanup so the wheel doesn't drift.
                .finallyDo(() -> m_steerMotor.set(0));
    }

    /** Keeps 'value' between 'min' and 'max'. */
    private double clamp(double value, double min, double max) {
        if (value > max) {
            return max;
        } else if (value < min) {
            return min;
        } else {
            return value;
        }
    }

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
        Logger.recordOutput("DriveModule/SteerAngleDegrees", getSteerAngleDegrees());
    }

    @Override
    public void simulationPeriodic() {
        // Drive motor physics.
        m_driveSim.setSupplyVoltage(RobotController.getBatteryVoltage());
        double appliedVolts = m_driveSim.getMotorVoltage();
        m_driveModel.setInputVoltage(appliedVolts);
        m_driveModel.update(0.020);
        m_driveSim.setRawRotorPosition(m_driveModel.getAngularPositionRotations());
        m_driveSim.setRotorVelocity(m_driveModel.getAngularVelocityRPM() / 60.0);
        Logger.recordOutput("DriveModule/AppliedVolts", appliedVolts);

        // Steering motor physics (same four steps, steer objects).
        m_steerSim.setSupplyVoltage(RobotController.getBatteryVoltage());
        m_steerModel.setInputVoltage(m_steerSim.getMotorVoltage());
        m_steerModel.update(0.020);
        m_steerSim.setRawRotorPosition(m_steerModel.getAngularPositionRotations());
        m_steerSim.setRotorVelocity(m_steerModel.getAngularVelocityRPM() / 60.0);
    }
}
