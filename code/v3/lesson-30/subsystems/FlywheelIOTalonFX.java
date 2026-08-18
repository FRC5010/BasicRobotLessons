package first.robot.subsystems;

import static org.wpilib.units.Units.Amps;
import static org.wpilib.units.Units.RotationsPerSecond;
import static org.wpilib.units.Units.Volts;

import com.ctre.phoenix6.CANBus;
import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.controls.NeutralOut;
import com.ctre.phoenix6.controls.VelocityVoltage;
import com.ctre.phoenix6.hardware.TalonFX;

import first.robot.Constants.FlywheelConstants;
import first.robot.Constants.PowerConstants;

/** Real hardware behind the FlywheelIO contract: one TalonFX holding a speed. */
public class FlywheelIOTalonFX implements FlywheelIO {
  // protected, not private: FlywheelIOSim extends this class and needs the motor.
  protected final TalonFX m_motor;
  private final VelocityVoltage m_request = new VelocityVoltage(0);
  private final NeutralOut m_neutral = new NeutralOut();

  public FlywheelIOTalonFX() {
    m_motor = new TalonFX(FlywheelConstants.kMotorPort, CANBus.systemcore(0));

    TalonFXConfiguration config = new TalonFXConfiguration();
    config.Feedback.SensorToMechanismRatio = FlywheelConstants.kGearRatio;

    // The model: friction, speed, acceleration. No kG — a wheel spinning on
    // its axis is not being held up against anything.
    config.Slot0.kS = FlywheelConstants.kFlywheelKS;
    config.Slot0.kV = FlywheelConstants.kFlywheelKV;
    config.Slot0.kA = FlywheelConstants.kFlywheelKA;
    config.Slot0.kP = FlywheelConstants.kFlywheelKP;

    // The budget: this motor's slice of the battery, plus the shared winding cap.
    config.CurrentLimits.StatorCurrentLimitEnable = true;
    config.CurrentLimits.StatorCurrentLimit = PowerConstants.kStatorLimit.in(Amps);
    config.CurrentLimits.SupplyCurrentLimitEnable = true;
    config.CurrentLimits.SupplyCurrentLimit = PowerConstants.kFlywheelSupplyLimit.in(Amps);

    m_motor.getConfigurator().apply(config);
  }

  @Override
  public void updateInputs(FlywheelIOInputs inputs) {
    inputs.velocityRps = m_motor.getVelocity().getValue().in(RotationsPerSecond);
    inputs.appliedVolts = m_motor.getMotorVoltage().getValue().in(Volts);
    inputs.setpointRps = m_motor.getClosedLoopReference().getValue();
    inputs.statorCurrentAmps = m_motor.getStatorCurrent().getValue().in(Amps);
    inputs.supplyCurrentAmps = m_motor.getSupplyCurrent().getValue().in(Amps);
  }

  @Override
  public void setGoalRps(double rps) {
    m_motor.setControl(m_request.withVelocity(RotationsPerSecond.of(rps)));
  }

  @Override
  public void stop() {
    m_motor.setControl(m_neutral);
  }
}
