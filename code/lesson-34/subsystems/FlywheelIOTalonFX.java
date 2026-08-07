package frc.robot.subsystems;

import static edu.wpi.first.units.Units.Amps;

import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.controls.NeutralOut;
import com.ctre.phoenix6.controls.VelocityVoltage;
import com.ctre.phoenix6.controls.VoltageOut;
import com.ctre.phoenix6.hardware.TalonFX;

import frc.robot.Constants.FlywheelConstants;
import frc.robot.Constants.PowerConstants;

/** Real hardware behind the FlywheelIO contract: one TalonFX holding a speed. */
public class FlywheelIOTalonFX implements FlywheelIO {
    // protected, not private: FlywheelIOSim extends this class and needs the motor.
    protected final TalonFX m_motor;
    private final VelocityVoltage m_request = new VelocityVoltage(0);
    private final NeutralOut m_neutral = new NeutralOut();
    private final VoltageOut m_openLoop = new VoltageOut(0);

    public FlywheelIOTalonFX(int motorId) {
        m_motor = new TalonFX(motorId);

        TalonFXConfiguration config = new TalonFXConfiguration();
        config.Feedback.SensorToMechanismRatio = FlywheelConstants.kGearRatio;

        // The model: friction, speed, acceleration. No kG — a wheel spinning on
        // its axis is not being held up against anything.
        config.Slot0.kS = FlywheelConstants.kFlywheelKS;
        config.Slot0.kV = FlywheelConstants.kFlywheelKV;
        config.Slot0.kA = FlywheelConstants.kFlywheelKA;
        config.Slot0.kP = FlywheelConstants.kFlywheelKP;

        // Two different questions, so two different limits: what the battery is
        // asked for, and what the windings are allowed to take.
        config.CurrentLimits.SupplyCurrentLimit = PowerConstants.kFlywheelSupplyLimit.in(Amps);
        config.CurrentLimits.SupplyCurrentLimitEnable = true;
        config.CurrentLimits.StatorCurrentLimit = PowerConstants.kStatorLimit.in(Amps);
        config.CurrentLimits.StatorCurrentLimitEnable = true;

        m_motor.getConfigurator().apply(config);
    }

    @Override
    public void updateInputs(FlywheelIOInputs inputs) {
        inputs.velocityRps = m_motor.getVelocity().getValueAsDouble();
        inputs.appliedVolts = m_motor.getMotorVoltage().getValueAsDouble();
        inputs.setpointRps = m_motor.getClosedLoopReference().getValueAsDouble();
        inputs.statorCurrentAmps = m_motor.getStatorCurrent().getValueAsDouble();
        inputs.supplyCurrentAmps = m_motor.getSupplyCurrent().getValueAsDouble();
        inputs.motorConnected = m_motor.isConnected();
    }

    @Override
    public void setGoalRps(double rps) {
        m_motor.setControl(m_request.withVelocity(rps));
    }

    @Override
    public void stop() {
        m_motor.setControl(m_neutral);
    }

    @Override
    public void setVoltage(double volts) {
        m_motor.setControl(m_openLoop.withOutput(volts));
    }
}
